import { AgentDefinition, UserAgentDefinition, CapabilityKind, Task, RuntimeContext } from '../types';
import { ModelRegistry } from '../registries/ModelRegistry';
import { imageAgent } from '../../../components/agents/imageAgent';
import { videoAgent } from '../../../components/agents/videoAgent';

export function normalizeUserAgent(input: any): UserAgentDefinition {
  const now = Date.now();
  return {
    id: String(input.id || '').trim().toLowerCase(),
    name: String(input.name || '').trim(),
    role: String(input.role || '').trim(),
    description: input.description ? String(input.description).trim() : undefined,
    icon: input.icon ? String(input.icon).trim() : undefined,
    systemInstruction: String(input.systemInstruction || '').trim(),
    capabilityKinds: Array.isArray(input.capabilityKinds) ? input.capabilityKinds : ['text'],
    skillIds: Array.isArray(input.skillIds) ? input.skillIds : [],
    modelPreferences: input.modelPreferences || {},
    outputSchema: input.outputSchema,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
    isCustom: true,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : now,
    metadata: input.metadata || {}
  };
}

export function validateUserAgent(input: any): { ok: boolean; errors: string[]; agent?: UserAgentDefinition } {
  const errors: string[] = [];
  if (!input) {
    return { ok: false, errors: ['输入不能为空'] };
  }

  const id = String(input.id || '').trim();
  if (!id) {
    errors.push('助手ID不能为空');
  } else if (!/^[a-z0-9-]+$/.test(id)) {
    errors.push('助手ID只允许小写字母、数字和短横线（例如: ecommerce-copywriter）');
  }

  if (!String(input.name || '').trim()) {
    errors.push('助手名称不能为空');
  }

  if (!String(input.role || '').trim()) {
    errors.push('助手角色不能为空');
  }

  if (!String(input.systemInstruction || '').trim()) {
    errors.push('系统提示词不能为空');
  }

  const capabilityKinds = Array.isArray(input.capabilityKinds) ? input.capabilityKinds : [];
  if (capabilityKinds.length === 0) {
    errors.push('必须选择至少一种能力类型');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors,
    agent: normalizeUserAgent(input)
  };
}

export function toAgentDefinition(userAgent: UserAgentDefinition): AgentDefinition {
  return {
    id: userAgent.id,
    name: userAgent.name,
    role: userAgent.role,
    description: userAgent.description,
    icon: userAgent.icon,
    systemInstruction: userAgent.systemInstruction,
    capabilityKinds: userAgent.capabilityKinds,
    skillIds: userAgent.skillIds,
    modelPreferences: userAgent.modelPreferences,
    isCustom: true,
    enabled: userAgent.enabled,
    metadata: {
      isCustom: true,
      source: "user-agent",
      ...userAgent.metadata
    },
    // Compatibility fields:
    capabilities: userAgent.capabilityKinds.map(k => `cap_${k}`),
    skills: userAgent.skillIds,
    modelPreference: userAgent.modelPreferences?.['text'] || 'gemini-3.5-flash',

    execute: async (task: Task, context: RuntimeContext) => {
      // 1. Map task type to CapabilityKind
      let kind: CapabilityKind = 'text';
      const taskType = task.type ? task.type.toLowerCase() : 'text';
      if (taskType === 'image') {
        kind = 'image';
      } else if (taskType === 'video') {
        kind = 'video';
      } else if (taskType === 'vision') {
        kind = 'vision';
      } else if (taskType === 'audio') {
        kind = 'audio';
      } else if (taskType === 'code') {
        kind = 'code';
      } else if (taskType === 'ui') {
        kind = 'ui';
      } else if (taskType === 'data') {
        kind = 'data';
      } else if (taskType === 'browser') {
        kind = 'browser';
      } else if (taskType === 'workflow') {
        kind = 'workflow';
      } else {
        kind = 'text';
      }

      // 2. Select best model based on priorities
      const modelId = task.modelId
        || (userAgent.modelPreferences && userAgent.modelPreferences[kind])
        || (context?.selectedModelIds && context.selectedModelIds[kind]);

      ModelRegistry.loadUserConnections(context?.config || context);
      const modelProvider = modelId ? ModelRegistry.get(modelId) : undefined;
      const finalProvider = modelProvider || ModelRegistry.selectBest(kind, context);

      if (!finalProvider) {
        throw new Error(`未找到适合此能力的模型: ${kind}`);
      }

      // 3. Compose system instruction + prompt + previous outputs
      const systemInstruction = userAgent.systemInstruction;
      let promptText = task.prompt || '';
      if (context?.previousOutputs && Object.keys(context.previousOutputs).length > 0) {
        promptText += "\n\n【前置步骤输出参考】:\n" + JSON.stringify(context.previousOutputs, null, 2);
      }

      // 4. Handle specific capability execution
      if (kind === 'image') {
        // Use imageAgent to generate image and wait for it properly
        const imageConfig = {
          prompt: promptText,
          aspectRatio: (context.aspectRatio || '16:9') as any,
          model: finalProvider.id,
          imageSize: '1K' as any,
          referenceImages: []
        };
        const result = await imageAgent.generateSmartImage(imageConfig, context.config);
        const url = result.ossUrl || result.imageUrl;
        if (!url) throw new Error('生图大模型执行失败，未返回图片地址');
        return { url, revisedPrompt: result.revisedPrompt };
      } 
      else if (kind === 'video') {
        // Use videoAgent to generate video
        const options = (context as any).videoOptions || {
          aspectRatio: context.aspectRatio || '16:9',
          duration: context.duration || '5',
          model: finalProvider.id,
          imageUrl: context.imageUrl
        };

        const result = await videoAgent.callApi('video', 'generateVideo', {
          prompt: promptText,
          ...options
        }, context.config);

        if (result && result.operationId) {
          let opStatus = { done: false, videoUrl: '', error: null as any, status: 'pending' };
          const startTime = Date.now();
          const timeout = 10 * 60 * 1000;
          
          while (!opStatus.done && (Date.now() - startTime < timeout)) {
            if (context.onProgress) {
              const elapsed = Math.round((Date.now() - startTime) / 1000);
              context.onProgress(`🎬 [${userAgent.name}] 视频后台渲染中... 已经过 ${elapsed} 秒`);
            }
            await new Promise(r => setTimeout(r, 6000));
            opStatus = await videoAgent.getOperationStatus(result.operationId, context.config, finalProvider.id);
            if (opStatus.error) {
              throw new Error(`视频渲染引擎报错: ${opStatus.error}`);
            }
          }
          if (opStatus.videoUrl) {
            return { url: opStatus.videoUrl };
          } else {
            throw new Error("视频渲染超时，未获取到视频地址");
          }
        } else if (result && (result.videoUrl || result.url)) {
          return { url: result.videoUrl || result.url || result.ossUrl };
        }
        return { url: result.url || result.videoUrl || result.ossUrl || result };
      } 
      else {
        // Standard text, vision, code generation
        const response = await finalProvider.call('generateContent', {
          model: finalProvider.id,
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          config: { systemInstruction, temperature: 0.7 }
        }, context.config || context);

        const text = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text) || "生成结果为空";
        return { text };
      }
    }
  };
}

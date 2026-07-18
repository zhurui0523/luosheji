import { AgentDefinition, UserAgentDefinition, CapabilityKind, Task, RuntimeContext } from '../types';
import { ModelRegistry } from '../registries/ModelRegistry';
import { imageAgent } from '../../../components/agents/imageAgent';
import { videoAgent } from '../../../components/agents/videoAgent';

const VALID_CAPABILITY_KINDS = new Set([
  'text',
  'image',
  'video',
  'vision',
  'audio',
  'code',
  'tools',
  'workflow',
  'ui',
  'data',
  'browser',
]);

export function normalizeAgentId(value: any) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeUserAgent(input: any): UserAgentDefinition {
  const now = Date.now();
  const capabilityKinds = (Array.isArray(input?.capabilityKinds) ? input.capabilityKinds : ['text'])
    .map((kind: any) => String(kind || '').trim().toLowerCase())
    .filter((kind: string) => VALID_CAPABILITY_KINDS.has(kind)) as CapabilityKind[];

  return {
    id: normalizeAgentId(input?.id),
    name: String(input?.name || '').trim(),
    role: String(input?.role || '').trim(),
    description: input?.description ? String(input.description).trim() : undefined,
    icon: input?.icon ? String(input.icon).trim() : undefined,
    systemInstruction: String(input?.systemInstruction || '').trim(),
    capabilityKinds: capabilityKinds.length > 0 ? capabilityKinds : ['text'],
    skillIds: Array.isArray(input?.skillIds) ? input.skillIds.map((id: any) => String(id)) : [],
    modelPreferences: input?.modelPreferences || {},
    outputSchema: input?.outputSchema,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : true,
    isCustom: true,
    createdAt: typeof input?.createdAt === 'number' ? input.createdAt : now,
    updatedAt: typeof input?.updatedAt === 'number' ? input.updatedAt : now,
    metadata: input?.metadata || {},
  };
}

export function validateUserAgent(input: any): { ok: boolean; errors: string[]; agent?: UserAgentDefinition } {
  const errors: string[] = [];
  if (!input) return { ok: false, errors: ['输入不能为空。'] };

  const agent = normalizeUserAgent(input);
  if (!agent.id) {
    errors.push('Agent ID 不能为空。');
  } else if (!/^[a-z0-9-]+$/.test(agent.id)) {
    errors.push('Agent ID 只能包含小写字母、数字和短横线。');
  }

  if (!agent.name) errors.push('Agent 名称不能为空。');
  if (!agent.role) errors.push('Agent 角色不能为空。');
  if (!agent.systemInstruction) errors.push('系统提示词不能为空。');
  if (!agent.capabilityKinds.length) errors.push('必须选择至少一种能力类型。');

  return errors.length > 0 ? { ok: false, errors } : { ok: true, errors, agent };
}

function taskTypeToCapabilityKind(taskType?: string): CapabilityKind {
  const normalized = String(taskType || 'text').toLowerCase();
  if (normalized === 'script' || normalized === 'general') return 'text';
  if (VALID_CAPABILITY_KINDS.has(normalized)) return normalized as CapabilityKind;
  return 'text';
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
      source: 'user-agent',
      ...userAgent.metadata,
    },
    capabilities: userAgent.capabilityKinds.map(k => `cap_${k}`),
    skills: userAgent.skillIds,
    modelPreference: userAgent.modelPreferences?.text || 'gemini-3.5-flash',

    execute: async (task: Task, context: RuntimeContext) => {
      const kind = taskTypeToCapabilityKind(task.type);
      const modelId = task.modelId
        || userAgent.modelPreferences?.[kind]
        || context?.selectedModelIds?.[kind];

      ModelRegistry.loadUserConnections(context?.config || context);
      const modelProvider = modelId ? ModelRegistry.get(modelId) : undefined;
      const finalProvider = modelProvider || ModelRegistry.selectBest(kind, context);

      if (!finalProvider) {
        throw new Error(`没有找到适合能力类型 [${kind}] 的模型。`);
      }

      let promptText = task.prompt || '';
      if (context?.previousOutputs && Object.keys(context.previousOutputs).length > 0) {
        promptText += `\n\n【前置步骤输出参考】\n${JSON.stringify(context.previousOutputs, null, 2)}`;
      }

      if (kind === 'image') {
        const imageConfig = {
          prompt: promptText,
          aspectRatio: (context.aspectRatio || '16:9') as any,
          model: finalProvider.id,
          imageSize: '1K' as any,
          referenceImages: [],
        };
        const result = await imageAgent.generateSmartImage(imageConfig, context.config);
        const url = result.ossUrl || result.imageUrl;
        if (!url) throw new Error('生图模型执行失败，未返回图片地址。');
        return { url, revisedPrompt: result.revisedPrompt };
      }

      if (kind === 'video') {
        const options = (context as any).videoOptions || {
          aspectRatio: context.aspectRatio || '16:9',
          duration: context.duration || '5',
          model: finalProvider.id,
          imageUrl: context.imageUrl,
        };

        const result = await videoAgent.callApi('video', 'generateVideo', {
          prompt: promptText,
          ...options,
        }, context.config);

        if (result?.operationId) {
          let opStatus = { done: false, videoUrl: '', error: null as any, status: 'pending' };
          const startTime = Date.now();
          const timeout = 10 * 60 * 1000;

          while (!opStatus.done && Date.now() - startTime < timeout) {
            if (context.onProgress) {
              const elapsed = Math.round((Date.now() - startTime) / 1000);
              context.onProgress(`[${userAgent.name}] 视频后台渲染中，已等待 ${elapsed} 秒。`);
            }
            await new Promise(r => setTimeout(r, 6000));
            opStatus = await videoAgent.getOperationStatus(result.operationId, context.config, finalProvider.id);
            if (opStatus.error) throw new Error(`视频渲染引擎报错: ${opStatus.error}`);
          }

          if (opStatus.videoUrl) return { url: opStatus.videoUrl };
          throw new Error('视频渲染超时，未获取到视频地址。');
        }

        if (result && (result.videoUrl || result.url || result.ossUrl)) {
          return { url: result.videoUrl || result.url || result.ossUrl };
        }
        return { url: result };
      }

      const response = await finalProvider.call('generateContent', {
        model: finalProvider.id,
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: { systemInstruction: userAgent.systemInstruction, temperature: 0.7 },
      }, context.config || context);

      const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '生成结果为空。';
      return { text };
    },
  };
}

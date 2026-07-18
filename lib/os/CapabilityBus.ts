import { EventBus } from './EventBus';
import { IntentRuntime } from './IntentRuntime';
import { AgentRegistry } from './registries/AgentRegistry';
import { ModelRegistry } from './registries/ModelRegistry';
import { SkillRegistry } from './registries/SkillRegistry';
import { ExtensionRegistry } from './registries/ExtensionRegistry';
import { OpenSourceAdapterRegistry } from './registries/OpenSourceAdapterRegistry';
import { ExtensionAdapterRunner } from './extension/ExtensionAdapterRunner';
import { ArtifactFactory } from './artifacts/ArtifactFactory';
import { PermissionGuard } from './security/PermissionGuard';
import { PackagePermissionGuard, PackageRuntimeManager } from './package';
import { Task, RuntimeTask, RuntimeContext, CapabilityResult } from './types';

export interface CapabilityPayload {
  prompt?: string;
  action?: string;
  task?: Task;
  imageUrl?: string;
  aspectRatio?: string;
  duration?: string;
  systemInstruction?: string;
  [key: string]: any;
}

const assertPackageBoundary = (packageId: string | undefined, context: RuntimeContext) => {
  if (!packageId) return;
  PackageRuntimeManager.assertPackageReady(packageId, context);
  PackagePermissionGuard.assertPackageCanExecute(packageId, context);
};

class CapabilityBusService {
  constructor() {}

  /**
   * Unified Capability Execution Gateway supporting both:
   * 1. CapabilityBus.execute(task, context)
   * 2. CapabilityBus.execute(capabilityId, payload, context)
   */
  public async execute(
    capabilityIdOrTask: string | Task,
    payloadOrContext?: CapabilityPayload | any,
    context?: any
  ): Promise<CapabilityResult> {
    let task: Task;
    let systemContext: any = {};

    if (typeof capabilityIdOrTask === 'object') {
      task = capabilityIdOrTask;
      systemContext = {
        ...IntentRuntime.getContext(),
        ...payloadOrContext
      };
    } else {
      const capId = capabilityIdOrTask;
      const payload = payloadOrContext || {};
      task = payload.task || {
        id: 'temp_task_' + Math.random().toString(36).substring(2, 7),
        goalId: 'temp_goal',
        name: payload.prompt || 'Temporary Task',
        title: payload.prompt || 'Temporary Task',
        type: capId === 'cap_action' ? (payload.action === 'generateVideo' ? 'video' : 'image') : (capId === 'cap_vision' ? 'vision' : 'text'),
        prompt: payload.prompt || '',
        status: 'running',
        dependsOn: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        skillId: payload.skillId
      };
      systemContext = {
        ...IntentRuntime.getContext(),
        ...context,
        imageUrl: payload.imageUrl,
        aspectRatio: payload.aspectRatio,
        duration: payload.duration
      };
    }

    // Ensure task reference inside systemContext for selectBest model routing
    systemContext.task = task;

    // Load custom interfaces / user-defined models into the registry for this execution cycle
    ModelRegistry.loadUserConnections(systemContext.config || systemContext);
    AgentRegistry.loadUserAgents(systemContext.config || systemContext);

    // Publish TASK_STARTED
    task.lifecycle = 'RUNNING';
    task.status = 'running';
    EventBus.publish('TASK_STATUS_CHANGED' as any, 'CapabilityBus', { ...task }, `[运行时] 开始运行任务: ${task.name || task.title}`);

    let resultOutput: any = null;
    let providerUsed = '';
    let success = false;
    let errorMsg = '';

    try {
      // 1. If task.skillId exists, check SkillRegistry
      if (task.skillId) {
        const skill = SkillRegistry.get(task.skillId);
        if (skill) {
          const extId = skill.metadata?.extensionId;
          const packageId = skill.metadata?.packageId;
          let extensionPermissions: any[] = [];
          if (extId) {
            const extRecord = ExtensionRegistry.get(extId);
            if (extRecord && extRecord.state !== 'enabled') {
              throw new Error(`Extension "${extId}" is currently ${extRecord.state || 'disabled'}`);
            }
            extensionPermissions = extRecord?.manifest?.permissions || [];
          }
          assertPackageBoundary(packageId, systemContext);
          PermissionGuard.assertCanExecute({
            id: skill.id,
            type: 'skill',
            permissions: (skill as any).permissions || extensionPermissions
          }, systemContext);

          try {
            if (skill.execute) {
              resultOutput = await skill.execute(task, systemContext);
              success = true;
              providerUsed = 'SkillExecutor';
            } else {
              // skill has only instruction -> prompt skill. Run with the best text model
              const modelProvider = ModelRegistry.selectBest('text', systemContext);
              if (!modelProvider) throw new Error('No text model available in registry');
              assertPackageBoundary(modelProvider.metadata?.packageId, systemContext);
              
              const systemInstruction = skill.instruction || '';
              const prompt = task.prompt || '';
              
              resultOutput = await modelProvider.call('generateContent', {
                model: modelProvider.id,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { systemInstruction, temperature: 0.7 }
              }, systemContext.config);
              
              success = true;
              providerUsed = modelProvider.name;
            }
          } catch (skillErr: any) {
            if (extId) {
              ExtensionRegistry.markError(extId, skillErr.message || String(skillErr));
            }
            throw skillErr;
          }
        } else {
          throw new Error(`Skill ${task.skillId} not found in SkillRegistry`);
        }
      }
      // 2. If task.agentId exists, use AgentRegistry
      else if (task.agentId) {
        const agent = AgentRegistry.get(task.agentId);
        if (!agent || agent.enabled === false) {
          throw new Error(`Agent "${task.agentId}" is not installed or is disabled.`);
        }
        const extId = agent.metadata?.extensionId;
        const packageId = agent.metadata?.packageId;
        let extensionPermissions: any[] = [];
        if (extId) {
          const extRecord = ExtensionRegistry.get(extId);
          if (extRecord && extRecord.state !== 'enabled') {
            throw new Error(`Extension "${extId}" is currently ${extRecord.state || 'disabled'}`);
          }
          extensionPermissions = extRecord?.manifest?.permissions || [];
        }
        assertPackageBoundary(packageId, systemContext);
        PermissionGuard.assertCanExecute({
          id: agent.id,
          type: 'agent',
          permissions: (agent as any).permissions || extensionPermissions
        }, systemContext);

        try {
          resultOutput = await agent.execute(task, systemContext);
          success = true;
          providerUsed = agent.name;
        } catch (agentErr: any) {
          if (extId) {
            ExtensionRegistry.markError(extId, agentErr.message || String(agentErr));
          }
          throw agentErr;
        }
      }
      // 3. If task.adapterId or task.toolId exists, use OpenSourceAdapterRegistry
      else if ((task as any).adapterId || (task as any).toolId) {
        const adapterId = (task as any).adapterId || (task as any).toolId;
        const adapter = OpenSourceAdapterRegistry.get(adapterId);
        if (!adapter) {
          throw new Error(`Adapter/Tool "${adapterId}" is not installed or is disabled.`);
        }

        const extId = adapter.metadata?.extensionId;
        const packageId = adapter.metadata?.packageId;
        if (extId) {
          const extRecord = ExtensionRegistry.get(extId);
          if (extRecord && extRecord.state !== 'enabled') {
            throw new Error(`Extension "${extId}" is currently ${extRecord.state || 'disabled'}`);
          }
        }

        assertPackageBoundary(packageId, systemContext);
        PermissionGuard.assertCanExecute({
          id: adapter.id,
          type: 'adapter',
          permissions: adapter.permissions
        }, systemContext);

        resultOutput = await ExtensionAdapterRunner.run(adapter, task.input || task, systemContext);
        success = true;
        providerUsed = adapter.name;
      }
      // 4. Find best agent by task.type (CapabilityKind)
      else {
        const bestAgent = AgentRegistry.findBestAgent(task, systemContext);
        if (bestAgent) {
          const extId = bestAgent.metadata?.extensionId;
          const packageId = bestAgent.metadata?.packageId;
          let extensionPermissions: any[] = [];
          if (extId) {
            const extRecord = ExtensionRegistry.get(extId);
            if (extRecord && extRecord.state !== 'enabled') {
              throw new Error(`Extension "${extId}" is currently ${extRecord.state || 'disabled'}`);
            }
            extensionPermissions = extRecord?.manifest?.permissions || [];
          }
          assertPackageBoundary(packageId, systemContext);
          PermissionGuard.assertCanExecute({
            id: bestAgent.id,
            type: 'agent',
            permissions: (bestAgent as any).permissions || extensionPermissions
          }, systemContext);

          try {
            resultOutput = await bestAgent.execute(task, systemContext);
            success = true;
            providerUsed = bestAgent.name;
          } catch (agentErr: any) {
            if (extId) {
              ExtensionRegistry.markError(extId, agentErr.message || String(agentErr));
            }
            throw agentErr;
          }
        } else {
          // Fallback to text model registry
          let taskType: any = task.type;
          if (taskType === 'script' || taskType === 'general') {
            taskType = 'text';
          }
          const modelProvider = ModelRegistry.selectBest(taskType, systemContext);
          if (modelProvider) {
            assertPackageBoundary(modelProvider.metadata?.packageId, systemContext);
            resultOutput = await modelProvider.call('generateContent', {
              model: modelProvider.id,
              contents: [{ role: 'user', parts: [{ text: task.prompt || '' }] }]
            }, systemContext.config);
            success = true;
            providerUsed = modelProvider.name;
          } else {
            throw new Error(`No available agent or model provider to execute task of type ${task.type}`);
          }
        }
      }
    } catch (err: any) {
      success = false;
      errorMsg = err.message || String(err);
    }

    if (success) {
      task.status = 'completed';
      task.lifecycle = 'COMPLETED';
      task.output = resultOutput;
      
      // Publish TASK_COMPLETED
      EventBus.publish('TASK_STATUS_CHANGED' as any, 'CapabilityBus', { ...task }, `[运行时] 任务 [${task.name || task.title}] 执行成功！`);

      // Create artifact and publish ARTIFACT_CREATED
      const artifact = ArtifactFactory.createFromTask(task, resultOutput);
      
      EventBus.publish('ARTIFACT_CREATED' as any, 'ArtifactEngine', artifact, `[资产引擎] 生成新画布产物: ${task.name || task.title}`);
      
      return {
        success: true,
        output: resultOutput,
        providerUsed,
        attempts: 1
      };
    } else {
      task.status = 'failed';
      task.lifecycle = 'FAILED';
      task.error = errorMsg;
      
      // Publish TASK_FAILED
      EventBus.publish('TASK_STATUS_CHANGED' as any, 'CapabilityBus', { ...task }, `[运行时] 任务 [${task.name || task.title}] 执行失败: ${errorMsg}`);
      
      return {
        success: false,
        output: null,
        providerUsed,
        attempts: 1,
        error: errorMsg
      };
    }
  }
}

export const CapabilityBus = new CapabilityBusService();
export default CapabilityBus;

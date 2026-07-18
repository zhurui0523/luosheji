import { EventBus } from './EventBus';
import { CapabilityBus } from './CapabilityBus';
import { MemoryCore } from './MemoryCore';
import { DAGEngine, DAGTask } from './DAGEngine';
import { brainAgent } from '../../components/agents/brainAgent';
import { ArtifactFactory } from './artifacts/ArtifactFactory';
import { 
  Intent, 
  Goal, 
  Task, 
  LifecycleState, 
  BusinessState, 
  RuntimeContext, 
  CanvasArtifact, 
  SkillDefinition, 
  AgentDefinition,
  RuntimeArtifact,
  ExecutionControlState
} from './types';
import { WorkflowExecutionController } from './WorkflowExecutionController';

export interface SystemContext {
  brandName: string;
  videoRatio: '16:9' | '9:16' | '1:1';
  resolution: '1080p' | '4K';
  sandboxEnabled: boolean;
  maxRetries: number;
  safetyFilterLevel: 'Low' | 'Medium' | 'High';
  modelProvider: string;
  config?: any;
}

interface WorkflowHistoryItem {
  id: string;
  timestamp: number;
  intent: Intent;
  goal: Goal;
  tasks: Task[];
  artifacts: CanvasArtifact[];
}

class IntentRuntimeCoordinator {
  private currentLifecycle: LifecycleState = 'CREATED';
  private currentBusiness: BusinessState = 'NONE';
  private historyList: WorkflowHistoryItem[] = [];
  private controllers: Map<string, WorkflowExecutionController> = new Map();
  
  private systemContext: SystemContext = {
    brandName: '奇迹影业 (Miracle Pictures)',
    videoRatio: '16:9',
    resolution: '1080p',
    sandboxEnabled: true,
    maxRetries: 3,
    safetyFilterLevel: 'Medium',
    modelProvider: 'gemini-3.5-flash'
  };

  constructor() {
    // Listen directly via EventBus to guarantee immediate state machine transitions
    EventBus.subscribe('*', (event) => {
      const { type, payload } = event;
      
      if (type === 'INTENT_RECEIVED') {
        this.currentLifecycle = 'PLANNING';
        this.currentBusiness = 'WAITING_MODEL';
      } else if (type === 'GOAL_PLANNED') {
        const goal = payload as Goal;
        this.currentLifecycle = (goal.lifecycle || 'RUNNING') as LifecycleState;
        this.currentBusiness = (goal.businessState || 'NONE') as BusinessState;
      } else if (type === 'TASK_STATUS_CHANGED') {
        const task = payload as Task;
        if (task.lifecycle === 'RUNNING') {
          this.currentLifecycle = 'RUNNING';
          if (task.type === 'script') {
            this.currentBusiness = 'WAITING_MODEL';
          } else if (task.type === 'image' || task.type === 'video') {
            this.currentBusiness = 'WAITING_TOOL';
          } else {
            this.currentBusiness = 'NONE';
          }
        } else if (task.lifecycle === 'COMPLETED') {
          this.currentBusiness = 'NONE';
        } else if (task.lifecycle === 'PAUSED') {
          this.currentLifecycle = 'PAUSED';
          this.currentBusiness = (task.businessState || 'WAITING_REVIEW') as BusinessState;
        } else if (task.lifecycle === 'FAILED') {
          this.currentLifecycle = 'FAILED';
          this.currentBusiness = 'NONE';
        }
      }
    });
  }

  public getContext(): SystemContext {
    return this.systemContext;
  }

  public updateContext(updated: Partial<SystemContext>) {
    this.systemContext = { ...this.systemContext, ...updated };
    EventBus.publish('CONTEXT_UPDATED', 'ContextEngine', this.systemContext, `[上下文引擎] 更新系统控制约束: [${Object.keys(updated).join(', ')}]`);
  }

  public getStates() {
    return {
      lifecycle: this.currentLifecycle,
      business: this.currentBusiness
    };
  }

  public transitionState(lifecycle: LifecycleState, business: BusinessState, message: string) {
    this.currentLifecycle = lifecycle;
    this.currentBusiness = business;
    
    EventBus.publish('EVENT_TRIGGERED', 'StateMachine', {
      lifecycle,
      business,
      timestamp: Date.now()
    }, `[双层状态机] 切换状态 ➔ 生命周期的 [${lifecycle}] | 业务状态的 [${business}] - ${message}`);
  }

  /**
   * Parse raw text to standard Intent format
   */
  public parseIntent(rawText: string, source = 'UserChat'): Intent {
    let standardizedIntent = 'General Task Process';
    if (rawText.includes('脚本') || rawText.includes('文案') || rawText.includes('故事')) {
      standardizedIntent = 'Create Video Script (剧本创作)';
    } else if (rawText.includes('生图') || rawText.includes('插画') || rawText.includes('分镜')) {
      standardizedIntent = 'Storyboard Image Generation (分镜生图)';
    } else if (rawText.includes('视频') || rawText.includes('拉片') || rawText.includes('剪辑')) {
      standardizedIntent = 'Video Composition & Synthesis (视频拉片合成)';
    } else if (rawText.includes('规则') || rawText.includes('优化') || rawText.includes('调优')) {
      standardizedIntent = 'Model Pipeline Tuning (模型流水线调优)';
    }

    const intent: Intent = {
      id: 'int_' + Math.random().toString(36).substring(2, 7),
      rawText,
      standardizedIntent,
      source,
      timestamp: Date.now(),
      createdAt: Date.now()
    };

    EventBus.publish('INTENT_RECEIVED', 'IntentGateway', intent, `[意图网关] 收到输入文本，成功路由解析至 ➔ [${standardizedIntent}]`);
    return intent;
  }

  /**
   * New Unified Entry: Receive user intent, plan steps, and register Goal
   */
  public async receiveIntent(rawText: string, sourceOrContext: string | RuntimeContext = 'UserChat', config?: any): Promise<Goal> {
    let source = 'UserChat';
    let runtimeCtx: RuntimeContext = {};

    if (typeof sourceOrContext === 'object') {
      runtimeCtx = sourceOrContext;
      source = runtimeCtx.conversationId ? 'chat' : 'system';
    } else if (sourceOrContext) {
      source = sourceOrContext;
    }

    const intent = this.parseIntent(rawText, source);
    intent.context = runtimeCtx;
    
    // Save to memory core
    MemoryCore.save('Working', 'active_intent', intent, '保存活跃意图对象');
    
    // Trigger planning via BrainAgent
    this.transitionState('PLANNING', 'WAITING_MODEL', '调度大脑进行步骤规划与 DAG 依赖分析');
    
    const plan = await brainAgent.analyzeUserIntent(rawText, config);
    
    const goalId = 'goal_' + intent.id;
    const goal: Goal = {
      id: goalId,
      intentId: intent.id,
      title: plan.rationale || 'AI Intent Execution Plan',
      name: plan.rationale || 'AI Intent Execution Plan',
      rationale: plan.rationale || '按 DAG 顺序执行流程步骤',
      status: 'created',
      lifecycle: 'CREATED',
      businessState: 'NONE',
      taskIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      timestamp: Date.now(),
      dependencies: []
    };

    const steps = plan.steps || [];
    const runTasks: Task[] = [];
    const taskIds: string[] = [];

    steps.forEach((step: any, index: number) => {
      if (step.enabled === false) return;

      const taskId = step.id || 'task_' + Math.random().toString(36).substring(2, 7);
      taskIds.push(taskId);

      const fallbackDependsOn: string[] = [];
      // Sequential chain fallback only when planner did not provide explicit dependencies
      if (index > 0) {
        const prevStep = steps[index - 1];
        if (prevStep && prevStep.enabled !== false) {
          fallbackDependsOn.push(prevStep.id);
        }
      }
      const dependsOn: string[] = Array.isArray(step.dependsOn) ? step.dependsOn : fallbackDependsOn;

      const osTask: Task = {
        id: taskId,
        goalId,
        type: step.type,
        title: step.label,
        name: step.label,
        prompt: step.prompt,
        input: step.input,
        status: 'pending',
        lifecycle: 'CREATED',
        businessState: 'NONE',
        dependsOn,
        assignedActorId: step.assignedActorId || step.agentId,
        agentId: step.agentId,
        modelId: step.modelId,
        pluginId: step.pluginId,
        adapterId: step.adapterId,
        toolId: step.toolId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        timestamp: Date.now(),
        skillId: step.skillId,
        config: step.config
      };

      runTasks.push(osTask);
    });

    goal.taskIds = taskIds;

    MemoryCore.save('Working', 'active_goal', goal, `规划目标: ${goal.title}`);
    MemoryCore.save('Working', 'active_tasks', runTasks, `注册目标任务集`);

    EventBus.publish('GOAL_PLANNED', 'GoalPlanner', goal, `[目标引擎] 目标已注册，DAG 任务就绪`);

    return goal;
  }

  /**
   * Plan raw Intent (returns tasks)
   */
  public async planIntent(intent: Intent): Promise<Task[]> {
    const goal = await this.receiveIntent(intent.rawText, intent.source, intent.context?.config);
    return MemoryCore.get('Working', 'active_tasks') as Task[] || [];
  }

  /**
   * Run standard Goal with DAG orchestrator using WorkflowExecutionController
   */
  public async runGoal(goalId: string, config?: any): Promise<void> {
    const goal = MemoryCore.get('Working', 'active_goal') as Goal;
    if (!goal || goal.id !== goalId) {
      throw new Error(`Active goal with id ${goalId} not found in memory`);
    }

    const runTasks = MemoryCore.get('Working', 'active_tasks') as Task[] || [];

    const runtimeContext: RuntimeContext = {
      brandName: this.systemContext.brandName,
      videoRatio: this.systemContext.videoRatio,
      resolution: this.systemContext.resolution,
      sandboxEnabled: this.systemContext.sandboxEnabled,
      maxRetries: this.systemContext.maxRetries,
      safetyFilterLevel: this.systemContext.safetyFilterLevel,
      modelProvider: this.systemContext.modelProvider,
      config
    };

    const controller = new WorkflowExecutionController(goalId, runTasks, runtimeContext);
    this.controllers.set(goalId, controller);

    try {
      goal.lifecycle = 'RUNNING';
      goal.status = 'running';
      this.transitionState('RUNNING', 'NONE', '开始通过 IntentRuntime 执行 DAG 任务');
      
      controller.start();
      await controller.waitForCompletion();
      
      goal.lifecycle = 'COMPLETED';
      goal.status = 'completed';
      EventBus.publish('GOAL_PLANNED', 'GoalPlanner', goal, `[目标引擎] 目标流程 "${goal.title}" 已成功圆满结束。`);
      this.transitionState('COMPLETED', 'NONE', '意图运行时圆满完成所有 DAG 任务。');

      // Record History Session
      this.historyList.push({
        id: 'session_' + Date.now(),
        timestamp: Date.now(),
        intent: MemoryCore.get('Working', 'active_intent') as Intent,
        goal,
        tasks: runTasks,
        artifacts: []
      });

    } catch (err: any) {
      goal.lifecycle = 'FAILED';
      goal.status = 'failed';
      EventBus.publish('GOAL_PLANNED', 'GoalPlanner', goal, `[目标引擎] 目标流程 "${goal.title}" 执行失败中断。`);
      this.transitionState('FAILED', 'NONE', `工作流运行异常中断: ${err.message || err}`);
      throw err;
    }
  }

  public pauseGoal(goalId: string) {
    const controller = this.controllers.get(goalId);
    if (controller) {
      controller.pause();
    }
  }

  public resumeGoal(goalId: string) {
    const controller = this.controllers.get(goalId);
    if (controller) {
      controller.resume();
    }
  }

  public cancelGoal(goalId: string) {
    const controller = this.controllers.get(goalId);
    if (controller) {
      controller.cancel();
    }
  }

  public rerunTask(taskId: string, config?: any) {
    const runTasks = MemoryCore.get('Working', 'active_tasks') as Task[] || [];
    const task = runTasks.find(t => t.id === taskId);
    if (task) {
      const controller = this.controllers.get(task.goalId);
      if (controller) {
        controller.rerunTask(taskId);
      }
    }
  }

  public rerunFromTask(taskId: string, config?: any) {
    const runTasks = MemoryCore.get('Working', 'active_tasks') as Task[] || [];
    const task = runTasks.find(t => t.id === taskId);
    if (task) {
      const controller = this.controllers.get(task.goalId);
      if (controller) {
        controller.rerunFromTask(taskId);
      }
    }
  }

  public updateTaskInput(taskId: string, patch: any) {
    const runTasks = MemoryCore.get('Working', 'active_tasks') as Task[] || [];
    const task = runTasks.find(t => t.id === taskId);
    if (task) {
      const controller = this.controllers.get(task.goalId);
      if (controller) {
        controller.markTaskDirty(taskId, patch);
      }
    }
  }

  public getExecutionState(goalId: string): ExecutionControlState | undefined {
    const controller = this.controllers.get(goalId);
    return controller ? controller.getExecutionState() : undefined;
  }


  /**
   * Run individual task
   */
  public async runTask(taskId: string, config?: any): Promise<any> {
    const runTasks = MemoryCore.get('Working', 'active_tasks') as Task[] || [];
    const osTask = runTasks.find(t => t.id === taskId);
    if (!osTask) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const runtimeContext: RuntimeContext = {
      brandName: this.systemContext.brandName,
      videoRatio: this.systemContext.videoRatio,
      resolution: this.systemContext.resolution,
      sandboxEnabled: this.systemContext.sandboxEnabled,
      maxRetries: this.systemContext.maxRetries,
      safetyFilterLevel: this.systemContext.safetyFilterLevel,
      modelProvider: this.systemContext.modelProvider,
      config
    };

    const result = await CapabilityBus.execute(osTask, runtimeContext);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.output;
  }

  /**
   * Manual artifact helper
   */
  public createArtifact(task: Task, output: any): RuntimeArtifact {
    const artifact = ArtifactFactory.createFromTask(task, output);
    
    EventBus.publish('ARTIFACT_CREATED' as any, 'ArtifactEngine', artifact, `[资产引擎] 手动产生看板作品: ${artifact.title}`);
    return artifact;
  }

  /**
   * Older compatibility pipeline orchestrator
   */
  public async executeWorkflow(
    pipelineMsgId: string | number,
    initialPlan: any,
    startStepIndex: number = 0,
    config?: any,
    onStepProgress?: (stepId: string, msg: string) => void,
    onStepCompleted?: (stepId: string, output: any) => void
  ): Promise<Record<string, any>> {
    const goalId = 'goal_' + pipelineMsgId;
    const intentId = 'int_' + pipelineMsgId;

    const goal: Goal = {
      id: goalId,
      intentId,
      title: initialPlan.rationale || 'AI Intent Execution Plan',
      name: initialPlan.rationale || 'AI Intent Execution Plan',
      rationale: '按 DAG 顺序执行流程步骤',
      status: 'running',
      lifecycle: 'RUNNING',
      businessState: 'NONE',
      taskIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dependencies: [],
      timestamp: Date.now()
    };

    MemoryCore.save('Working', 'active_goal', goal, `启动目标流程: ${goal.title}`);
    EventBus.publish('GOAL_PLANNED', 'GoalPlanner', goal, `[目标引擎] 目标已注册，DAG 正在准备调度中...`);

    const steps = initialPlan.steps || [];
    const outputs: Record<string, any> = {};

    for (let i = 0; i < startStepIndex; i++) {
      const step = steps[i];
      if (step && step.status === 'completed' && step.output) {
        outputs[step.id] = step.output;
        outputs[step.type] = step.output;
      }
    }

    const runTasks: Task[] = [];

    steps.forEach((step: any, index: number) => {
      if (index < startStepIndex || step.enabled === false) return;

      const taskId = step.id;
      const fallbackDependsOn: string[] = [];
      if (index > startStepIndex) {
        const prevStep = steps[index - 1];
        if (prevStep && prevStep.enabled !== false) {
          fallbackDependsOn.push(prevStep.id);
        }
      }
      const dependsOn: string[] = Array.isArray(step.dependsOn) ? step.dependsOn : fallbackDependsOn;

      const osTask: Task = {
        id: taskId,
        goalId,
        type: step.type,
        title: step.label,
        name: step.label,
        prompt: step.prompt,
        input: step.input,
        status: 'pending',
        lifecycle: 'CREATED',
        businessState: 'NONE',
        dependsOn,
        assignedActorId: step.assignedActorId || step.agentId,
        agentId: step.agentId,
        modelId: step.modelId,
        pluginId: step.pluginId,
        adapterId: step.adapterId,
        toolId: step.toolId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        timestamp: Date.now(),
        skillId: step.skillId,
        config: step.config
      };

      runTasks.push(osTask);
    });

    const dagTasks = runTasks.map((osTask) => {
      return {
        id: osTask.id,
        name: osTask.title || osTask.name || 'Task',
        dependsOn: osTask.dependsOn || [],
        status: 'pending' as any,
        execute: async () => {
          osTask.lifecycle = 'RUNNING';
          osTask.status = 'running';
          EventBus.publish('TASK_STATUS_CHANGED' as any, 'ActorRuntime', osTask, `[运行时] 开始运行任务 [${osTask.title}]`);
          
          if (onStepProgress) {
            onStepProgress(osTask.id, `🤖 正在处理: ${osTask.title}...`);
          }

          const stepPreviousOutputs: Record<string, any> = {};
          for (const [key, val] of Object.entries(outputs)) {
            stepPreviousOutputs[key] = val;
          }

          const runtimeContext: RuntimeContext = {
            brandName: this.systemContext.brandName,
            videoRatio: this.systemContext.videoRatio,
            resolution: this.systemContext.resolution,
            sandboxEnabled: this.systemContext.sandboxEnabled,
            maxRetries: this.systemContext.maxRetries,
            safetyFilterLevel: this.systemContext.safetyFilterLevel,
            modelProvider: this.systemContext.modelProvider,
            config,
            previousOutputs: stepPreviousOutputs,
            onProgress: (pMsg) => {
              if (onStepProgress) onStepProgress(osTask.id, pMsg);
            }
          };

          const result = await CapabilityBus.execute(osTask, runtimeContext);

          if (!result.success) {
            osTask.lifecycle = 'FAILED';
            osTask.status = 'failed';
            osTask.error = result.error;
            EventBus.publish('TASK_STATUS_CHANGED' as any, 'ActorRuntime', osTask, `[运行时] 任务 [${osTask.title}] 执行失败: ${result.error}`);
            throw new Error(result.error);
          }

          osTask.lifecycle = 'COMPLETED';
          osTask.status = 'completed';
          osTask.output = result.output;
          outputs[osTask.id] = result.output;
          outputs[osTask.type] = result.output;

          if (onStepCompleted) {
            onStepCompleted(osTask.id, result.output);
          }

          return result.output;
        }
      };
    });

    const dagEngine = new DAGEngine(dagTasks, (tId, status) => {
      const osTask = runTasks.find(t => t.id === tId);
      if (osTask) {
        osTask.lifecycle = status === 'running' ? 'RUNNING' : status === 'completed' ? 'COMPLETED' : status === 'failed' ? 'FAILED' : 'CREATED';
        osTask.status = status;
      }
    });

    const runtimeContext: RuntimeContext = {
      brandName: this.systemContext.brandName,
      videoRatio: this.systemContext.videoRatio,
      resolution: this.systemContext.resolution,
      sandboxEnabled: this.systemContext.sandboxEnabled,
      maxRetries: this.systemContext.maxRetries,
      safetyFilterLevel: this.systemContext.safetyFilterLevel,
      modelProvider: this.systemContext.modelProvider,
      config,
      previousOutputs: outputs,
      onTaskProgress: (taskId: string, progressMsg: string) => {
        if (onStepProgress) onStepProgress(taskId, progressMsg);
      },
      onTaskCompleted: (taskId: string, output: any) => {
        if (onStepCompleted) onStepCompleted(taskId, output);
      }
    } as RuntimeContext;

    const controller = new WorkflowExecutionController(goalId, runTasks, runtimeContext);
    this.controllers.set(goalId, controller);

    try {
      this.transitionState('RUNNING', 'NONE', '开始执行规划的工作流 DAG');
      controller.start();
      await controller.waitForCompletion();
      
      goal.lifecycle = 'COMPLETED';
      goal.status = 'completed';
      EventBus.publish('GOAL_PLANNED', 'GoalPlanner', goal, `[目标引擎] 目标流程 "${goal.title}" 已成功圆满结束。`);
      this.transitionState('COMPLETED', 'NONE', '意图运行时圆满完成所有 DAG 任务。');

      this.historyList.push({
        id: 'session_' + Date.now(),
        timestamp: Date.now(),
        intent: {
          id: intentId,
          rawText: initialPlan.rationale || '',
          standardizedIntent: 'AI Pipeline',
          source: 'System',
          timestamp: Date.now(),
          createdAt: Date.now()
        },
        goal,
        tasks: runTasks,
        artifacts: []
      });

    } catch (err: any) {
      goal.lifecycle = 'FAILED';
      goal.status = 'failed';
      EventBus.publish('GOAL_PLANNED', 'GoalPlanner', goal, `[目标引擎] 目标流程 "${goal.title}" 执行失败中断。`);
      this.transitionState('FAILED', 'NONE', `工作流运行异常中断: ${err.message || err}`);
      throw err;
    }

    return outputs;
  }

  public getHistory(): WorkflowHistoryItem[] {
    return this.historyList;
  }

  public async simulateWorkflowExecution(prompt: string): Promise<any> {
    const goal = await this.receiveIntent(prompt, 'Simulation');
    await this.runGoal(goal.id);
    return goal;
  }
}

export const IntentRuntime = new IntentRuntimeCoordinator();
export default IntentRuntime;
export type { LifecycleState, BusinessState, Goal, Task, Intent, CanvasArtifact };
export type { WorkflowHistoryItem };

import {
  RuntimeTask,
  RuntimeContext,
  ExecutionControlState,
  TaskExecutionSnapshot,
  ExecutionNodeStatus
} from "./types";
import { DAGEngine, DAGTask, TaskStatus } from "./DAGEngine";
import { CapabilityBus } from "./CapabilityBus";
import { EventBus } from "./EventBus";

export class WorkflowExecutionController {
  private goalId: string;
  private tasks: RuntimeTask[] = [];
  private context: RuntimeContext;
  private maxConcurrency: number;
  private dagEngine: DAGEngine;
  private snapshots: Map<string, TaskExecutionSnapshot> = new Map();
  private state: ExecutionControlState;
  private completionWaiters: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(goalId: string, tasks: RuntimeTask[], context: RuntimeContext, maxConcurrency: number = 2) {
    this.goalId = goalId;
    this.tasks = tasks;
    this.context = context;
    this.maxConcurrency = maxConcurrency;

    // Initialize state
    this.state = {
      goalId,
      status: "idle",
      runningTaskIds: [],
      completedTaskIds: [],
      failedTaskIds: [],
      skippedTaskIds: [],
      dirtyTaskIds: [],
      staleTaskIds: [],
      updatedAt: Date.now()
    };

    // Prepare snapshots & ensure valid status values
    this.tasks.forEach(task => {
      if (!task.status) {
        task.status = "pending";
      }

      this.snapshots.set(task.id, {
        taskId: task.id,
        status: task.status as ExecutionNodeStatus,
        input: task.input,
        output: task.output,
        error: task.error,
        updatedAt: Date.now()
      });
    });

    // Initialize DAGEngine using mapped tasks
    const dagTasks: DAGTask[] = this.tasks.map(task => {
      return {
        id: task.id,
        name: task.name || task.title || "Task",
        dependsOn: task.dependsOn || [],
        status: (task.status || "pending") as TaskStatus,
        execute: async () => {
          const res = await CapabilityBus.execute(task, this.context);
          if (!res.success) {
            throw new Error(res.error || "Execution failed");
          }
          return res.output;
        }
      };
    });

    // Instantiate DAGEngine
    this.dagEngine = new DAGEngine(dagTasks, (taskId, status) => {
      this.updateTaskStatus(taskId, status as ExecutionNodeStatus);
    });

    this.syncState();
  }

  private async tick() {
    if (
      this.state.status === "paused" ||
      this.state.status === "cancelled" ||
      this.state.status === "failed" ||
      this.state.status === "completed"
    ) {
      return;
    }

    // Check concurrency limit
    const runningCount = this.getRunningCount();
    if (runningCount >= this.maxConcurrency) {
      return;
    }

    // Get executable tasks from DAGEngine
    const executable = this.dagEngine.getExecutableTasks();
    if (executable.length === 0) {
      // No more executable tasks. Check if we're completely done
      const activeOrIncomplete = this.tasks.filter(t => 
        t.status === "pending" || t.status === "running" || t.status === "dirty" || t.status === "stale"
      );
      if (activeOrIncomplete.length === 0) {
        // All tasks completed or skipped or failed
        const anyFailed = this.tasks.some(t => t.status === "failed");
        this.updateWorkflowStatus(anyFailed ? "failed" : "completed");
      } else if (runningCount === 0) {
        // Stuck and no running tasks -> deadlock!
        const deadlockedIds = this.dagEngine.detectDeadlock();
        if (deadlockedIds.length > 0) {
          this.updateWorkflowStatus("failed");
          console.error("Deadlock detected in WorkflowExecutionController:", deadlockedIds);
        }
      }
      return;
    }

    // Start executable tasks up to concurrency limit
    const availableSlots = this.maxConcurrency - runningCount;
    const tasksToStart = executable.slice(0, availableSlots);

    for (const dagTask of tasksToStart) {
      const task = this.tasks.find(t => t.id === dagTask.id)!;
      this.executeTask(task);
    }
  }

  private async executeTask(task: RuntimeTask) {
    this.updateTaskStatus(task.id, "running");
    
    const snapshot = this.snapshots.get(task.id)!;
    snapshot.startedAt = Date.now();
    snapshot.updatedAt = Date.now();

    try {
      const taskContext: RuntimeContext = {
        ...this.context,
        onProgress: (progressMsg: string) => {
          this.context.onProgress?.(progressMsg);
          (this.context as any).onTaskProgress?.(task.id, progressMsg);
        }
      };

      // Execute using CapabilityBus
      const res = await CapabilityBus.execute(task, taskContext);
      
      if (this.state.status === "cancelled") {
        this.updateTaskStatus(task.id, "cancelled");
        return;
      }

      if (res.success) {
        task.output = res.output;
        snapshot.output = res.output;
        snapshot.completedAt = Date.now();
        if (this.context.previousOutputs) {
          this.context.previousOutputs[task.id] = res.output;
          if (task.type) {
            this.context.previousOutputs[task.type] = res.output;
          }
        }
        (this.context as any).onTaskCompleted?.(task.id, res.output);
        this.updateTaskStatus(task.id, "completed");
      } else {
        task.error = res.error || "Unknown error";
        snapshot.error = res.error;
        snapshot.completedAt = Date.now();
        this.updateTaskStatus(task.id, "failed");
      }
    } catch (err: any) {
      if (this.state.status === "cancelled") {
        this.updateTaskStatus(task.id, "cancelled");
        return;
      }
      const errMsg = err.message || String(err);
      task.error = errMsg;
      snapshot.error = errMsg;
      snapshot.completedAt = Date.now();
      this.updateTaskStatus(task.id, "failed");
    } finally {
      snapshot.updatedAt = Date.now();
      this.tick();
    }
  }

  private updateTaskStatus(taskId: string, status: ExecutionNodeStatus) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
    }

    const snapshot = this.snapshots.get(taskId);
    if (snapshot) {
      snapshot.status = status;
      snapshot.updatedAt = Date.now();
    }

    // Also update DAG task
    const dagTask = this.dagEngine.getTasks().find(t => t.id === taskId);
    if (dagTask) {
      dagTask.status = status as TaskStatus;
    }

    this.syncState();

    EventBus.publish(
      "TASK_STATUS_CHANGED" as any,
      "WorkflowExecutionController",
      { goalId: this.goalId, taskId, status, output: task?.output, error: task?.error },
      `[Workflow] Task ${taskId} status changed to ${status}`
    );
  }

  private updateWorkflowStatus(status: ExecutionControlState["status"]) {
    if (this.state.status === status) return;

    this.state.status = status;
    this.state.updatedAt = Date.now();

    // Publish WORKFLOW_STATUS_CHANGED
    EventBus.publish(
      "WORKFLOW_STATUS_CHANGED" as any,
      "WorkflowExecutionController",
      { goalId: this.goalId, status, state: this.state },
      `[Workflow] Goal ${this.goalId} execution status changed to ${status}`
    );

    if (status === "paused") {
      EventBus.publish("WORKFLOW_PAUSED" as any, "WorkflowExecutionController", { goalId: this.goalId }, `[Workflow] Goal ${this.goalId} paused`);
    } else if (status === "cancelled") {
      EventBus.publish("WORKFLOW_CANCELLED" as any, "WorkflowExecutionController", { goalId: this.goalId }, `[Workflow] Goal ${this.goalId} cancelled`);
    }

    this.notifyCompletionWaiters(status);
  }

  private notifyCompletionWaiters(status: ExecutionControlState["status"]) {
    if (status !== "completed" && status !== "failed" && status !== "cancelled") {
      return;
    }

    const waiters = [...this.completionWaiters];
    this.completionWaiters = [];

    waiters.forEach(waiter => {
      if (status === "completed") {
        waiter.resolve();
      } else {
        waiter.reject(new Error(status === "cancelled" ? "Workflow execution cancelled" : "Workflow execution failed"));
      }
    });
  }

  public start() {
    const cycles = this.dagEngine.detectCycles();
    if (cycles.length > 0) {
      const err = new Error(`Cycle detected in DAG: ${cycles.map(c => c.join(' -> ')).join(', ')}`);
      this.updateWorkflowStatus("failed");
      throw err;
    }

    this.updateWorkflowStatus("running");
    this.tick();
  }

  public pause() {
    if (this.state.status !== "running") return;
    this.updateWorkflowStatus("paused");
  }

  public resume() {
    if (this.state.status !== "paused") return;
    this.updateWorkflowStatus("running");
    EventBus.publish("WORKFLOW_RESUMED" as any, "WorkflowExecutionController", { goalId: this.goalId }, `[Workflow] Goal ${this.goalId} resumed`);
    this.tick();
  }

  public cancel() {
    this.updateWorkflowStatus("cancelled");
    this.tasks.forEach(t => {
      if (t.status === "pending" || t.status === "dirty" || t.status === "stale" || t.status === "running") {
        this.updateTaskStatus(t.id, "cancelled");
      }
    });
  }

  public rerunTask(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.output = undefined;
    task.error = undefined;

    const snapshot = this.snapshots.get(taskId);
    if (snapshot) {
      snapshot.output = undefined;
      snapshot.error = undefined;
      snapshot.startedAt = undefined;
      snapshot.completedAt = undefined;
    }

    this.updateTaskStatus(taskId, "pending");

    EventBus.publish("TASK_RERUN_REQUESTED" as any, "WorkflowExecutionController", { goalId: this.goalId, taskId }, `[Workflow] Task ${taskId} rerun requested`);

    if (this.state.status !== "running") {
      this.updateWorkflowStatus("running");
    }

    this.tick();
  }

  public rerunFromTask(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const downstreamIds = this.dagEngine.getDownstreamTaskIds(taskId);
    const affectedIds = [taskId, ...downstreamIds];

    affectedIds.forEach(id => {
      const t = this.tasks.find(tk => tk.id === id);
      if (t) {
        t.output = undefined;
        t.error = undefined;
      }
      const s = this.snapshots.get(id);
      if (s) {
        s.output = undefined;
        s.error = undefined;
        s.startedAt = undefined;
        s.completedAt = undefined;
      }
      this.updateTaskStatus(id, "pending");
    });

    EventBus.publish("TASK_RERUN_REQUESTED" as any, "WorkflowExecutionController", { goalId: this.goalId, taskId }, `[Workflow] Rerun from task ${taskId} initiated (including downstream)`);

    if (this.state.status !== "running") {
      this.updateWorkflowStatus("running");
    }

    this.tick();
  }

  public markTaskDirty(taskId: string, patch: any) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.input = { ...task.input, ...patch };
    const snapshot = this.snapshots.get(taskId);
    if (snapshot) {
      snapshot.input = task.input;
    }

    this.updateTaskStatus(taskId, "dirty");

    EventBus.publish("TASK_DIRTY" as any, "WorkflowExecutionController", { goalId: this.goalId, taskId, patch }, `[Workflow] Task ${taskId} marked as dirty`);

    // Downstream set to stale
    const downstreamIds = this.dagEngine.getDownstreamTaskIds(taskId);
    downstreamIds.forEach(id => {
      this.updateTaskStatus(id, "stale");
      EventBus.publish("TASK_STALE" as any, "WorkflowExecutionController", { goalId: this.goalId, taskId: id }, `[Workflow] Downstream task ${id} marked as stale`);
    });
  }

  public skipTask(taskId: string) {
    this.updateTaskStatus(taskId, "skipped");
    this.tick();
  }

  public getExecutionState(): ExecutionControlState {
    this.syncState();
    return { ...this.state };
  }

  public waitForCompletion(): Promise<void> {
    const status = this.state.status;
    if (status === "completed") {
      return Promise.resolve();
    }
    if (status === "failed" || status === "cancelled") {
      return Promise.reject(new Error(status === "cancelled" ? "Workflow execution cancelled" : "Workflow execution failed"));
    }

    return new Promise<void>((resolve, reject) => {
      this.completionWaiters.push({ resolve, reject });
    });
  }

  public getSnapshots(): TaskExecutionSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  private getRunningCount(): number {
    return this.tasks.filter(t => t.status === "running").length;
  }

  private syncState() {
    const running: string[] = [];
    const completed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];
    const dirty: string[] = [];
    const stale: string[] = [];

    this.tasks.forEach(t => {
      if (t.status === "running") running.push(t.id);
      else if (t.status === "completed") completed.push(t.id);
      else if (t.status === "failed") failed.push(t.id);
      else if (t.status === "skipped") skipped.push(t.id);
      else if (t.status === "dirty") dirty.push(t.id);
      else if (t.status === "stale") stale.push(t.id);
    });

    this.state.runningTaskIds = running;
    this.state.completedTaskIds = completed;
    this.state.failedTaskIds = failed;
    this.state.skippedTaskIds = skipped;
    this.state.dirtyTaskIds = dirty;
    this.state.staleTaskIds = stale;
    this.state.updatedAt = Date.now();
  }
}

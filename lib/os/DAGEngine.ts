export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'paused'
  | 'cancelled'
  | 'dirty'
  | 'stale';

export interface DAGTask {
  id: string;
  name: string;
  dependsOn?: string[]; // Array of task IDs that must complete before this runs
  status: TaskStatus;
  execute: () => Promise<any>;
  result?: any;
  error?: string;
}

export class DAGEngine {
  private tasks: Map<string, DAGTask> = new Map();
  private onStatusChange?: (taskId: string, status: TaskStatus, task: DAGTask) => void;

  constructor(tasks: DAGTask[], onStatusChange?: (taskId: string, status: TaskStatus, task: DAGTask) => void) {
    tasks.forEach(task => this.tasks.set(task.id, task));
    this.onStatusChange = onStatusChange;
  }

  // Get tasks that have no pending dependencies
  public getExecutableTasks(): DAGTask[] {
    const executable: DAGTask[] = [];
    
    for (const [_, task] of this.tasks) {
      if (task.status !== 'pending' && task.status !== 'dirty' && task.status !== 'stale') continue;

      let canRun = true;
      if (task.dependsOn && task.dependsOn.length > 0) {
        for (const depId of task.dependsOn) {
          const depTask = this.tasks.get(depId);
          // A dependency is considered resolved/completed if its status is completed or skipped.
          if (!depTask || (depTask.status !== 'completed' && depTask.status !== 'skipped')) {
            canRun = false;
            break;
          }
        }
      }

      if (canRun) executable.push(task);
    }
    return executable;
  }

  private updateStatus(taskId: string, status: TaskStatus, data?: Partial<DAGTask>) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    Object.assign(task, { status, ...data });
    if (this.onStatusChange) {
      this.onStatusChange(taskId, status, task);
    }
  }

  public detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Map<string, 'visiting' | 'visited'>();
    const path: string[] = [];

    const dfs = (id: string) => {
      visited.set(id, 'visiting');
      path.push(id);

      const task = this.tasks.get(id);
      if (task && task.dependsOn) {
        for (const depId of task.dependsOn) {
          const state = visited.get(depId);
          if (state === 'visiting') {
            const cycleStartIdx = path.indexOf(depId);
            if (cycleStartIdx !== -1) {
              cycles.push(path.slice(cycleStartIdx));
            }
          } else if (!state) {
            dfs(depId);
          }
        }
      }

      path.pop();
      visited.set(id, 'visited');
    };

    for (const id of this.tasks.keys()) {
      if (!visited.has(id)) {
        dfs(id);
      }
    }

    return cycles;
  }

  public detectDeadlock(): string[] {
    const incomplete = Array.from(this.tasks.values()).filter(t => 
      t.status === 'pending' || t.status === 'dirty' || t.status === 'stale'
    );
    if (incomplete.length === 0) return [];

    const executable = this.getExecutableTasks();
    if (executable.length === 0) {
      return incomplete.map(t => t.id);
    }
    return [];
  }

  public getUpstreamTaskIds(taskId: string): string[] {
    const upstreams = new Set<string>();
    const collect = (id: string) => {
      const task = this.tasks.get(id);
      if (task && task.dependsOn) {
        for (const depId of task.dependsOn) {
          if (!upstreams.has(depId)) {
            upstreams.add(depId);
            collect(depId);
          }
        }
      }
    };
    collect(taskId);
    return Array.from(upstreams);
  }

  public getDownstreamTaskIds(taskId: string): string[] {
    const downstreams = new Set<string>();
    const collect = (id: string) => {
      for (const [tId, t] of this.tasks) {
        if (t.dependsOn && t.dependsOn.includes(id)) {
          if (!downstreams.has(tId)) {
            downstreams.add(tId);
            collect(tId);
          }
        }
      }
    };
    collect(taskId);
    return Array.from(downstreams);
  }

  public async run() {
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      throw new Error(`Cycle detected in DAG: ${cycles.map(c => c.join(' -> ')).join(', ')}`);
    }

    return new Promise<void>((resolve, reject) => {
      const checkAndRun = async () => {
        let allCompletedOrFailedOrSkipped = true;
        let anyFailed = false;
        let hasPendingOrDirtyOrStale = false;
        let hasRunning = false;

        for (const [_, task] of this.tasks) {
          if (
            task.status === 'pending' ||
            task.status === 'running' ||
            task.status === 'dirty' ||
            task.status === 'stale'
          ) {
            allCompletedOrFailedOrSkipped = false;
          }
          if (task.status === 'failed') {
            anyFailed = true;
          }
          if (
            task.status === 'pending' ||
            task.status === 'dirty' ||
            task.status === 'stale'
          ) {
            hasPendingOrDirtyOrStale = true;
          }
          if (task.status === 'running') {
            hasRunning = true;
          }
        }

        if (allCompletedOrFailedOrSkipped) {
          if (anyFailed) reject(new Error("DAG Engine completed with failures"));
          else resolve();
          return;
        }

        const executable = this.getExecutableTasks();
        
        if (executable.length === 0 && hasPendingOrDirtyOrStale && !hasRunning) {
          reject(new Error("Deadlock detected in DAG: no executable tasks available but incomplete tasks remain."));
          return;
        }

        for (const task of executable) {
          this.updateStatus(task.id, 'running');
          
          task.execute()
            .then(result => {
              this.updateStatus(task.id, 'completed', { result });
              checkAndRun(); // Trigger next tick
            })
            .catch(error => {
              this.updateStatus(task.id, 'failed', { error: error.message || String(error) });
              checkAndRun(); // Continue with independent branches or fail
            });
        }
      };

      checkAndRun();
    });
  }

  public getTasks(): DAGTask[] {
    return Array.from(this.tasks.values());
  }
}


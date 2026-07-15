import { ExecutionNodeStatus } from './task-node';

export type LifecycleState = 'CREATED' | 'PLANNING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export type BusinessState = 'WAITING_USER' | 'WAITING_MODEL' | 'WAITING_TOOL' | 'WAITING_AGENT' | 'WAITING_REVIEW' | 'WAITING_PAYMENT' | 'NONE';

export interface ExecutionControlState {
  goalId: string;
  status: "idle" | "running" | "paused" | "completed" | "failed" | "cancelled";
  runningTaskIds: string[];
  completedTaskIds: string[];
  failedTaskIds: string[];
  skippedTaskIds: string[];
  dirtyTaskIds: string[];
  staleTaskIds: string[];
  updatedAt: number;
}

export interface TaskExecutionSnapshot {
  taskId: string;
  status: ExecutionNodeStatus;
  input?: any;
  output?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
}

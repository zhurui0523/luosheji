import { LifecycleState, BusinessState } from './events';
import { CapabilityKind } from './skill';

export interface RuntimeTask {
  id: string;
  goalId: string;
  type: CapabilityKind | "script" | "general" | string;
  title?: string;
  prompt?: string;
  input?: any;
  output?: any;
  status?: "pending" | "running" | "completed" | "failed" | "skipped" | string;
  dependsOn?: string[];
  skillId?: string;
  agentId?: string;
  modelId?: string;
  pluginId?: string;
  adapterId?: string;
  toolId?: string;
  error?: string;
  createdAt?: number;
  updatedAt?: number;
  name?: string;
  lifecycle?: LifecycleState;
  businessState?: BusinessState;
  assignedActorId?: string;
  timestamp?: number;
}

export type Task = RuntimeTask;

export type ExecutionNodeStatus =
  | "idle"
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped"
  | "dirty"
  | "stale";

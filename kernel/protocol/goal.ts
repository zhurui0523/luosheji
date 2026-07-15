import { LifecycleState, BusinessState } from './events';

export interface Goal {
  id: string;
  intentId: string;
  title?: string;
  rationale?: string;
  status?: "created" | "planning" | "running" | "completed" | "failed" | "cancelled" | string;
  taskIds?: string[];
  createdAt?: number;
  updatedAt?: number;
  name?: string;
  lifecycle?: LifecycleState;
  businessState?: BusinessState;
  dependencies?: string[];
  timestamp?: number;
}

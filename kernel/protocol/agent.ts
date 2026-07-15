import { CapabilityKind } from './skill';
import { RuntimeTask } from './task-node';
import { RuntimeContext } from './runtime-context';

export interface UserAgentDefinition {
  id: string;
  name: string;
  role: string;
  description?: string;
  icon?: string;
  systemInstruction: string;
  capabilityKinds: CapabilityKind[];
  skillIds?: string[];
  modelPreferences?: Partial<Record<CapabilityKind, string>>;
  outputSchema?: any;
  enabled: boolean;
  isCustom: true;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  description?: string;
  icon?: string;
  systemInstruction?: string;
  capabilityKinds?: CapabilityKind[];
  skillIds?: string[];
  modelPreferences?: Partial<Record<CapabilityKind, string>>;
  execute: (task: RuntimeTask, context: RuntimeContext) => Promise<any>;
  metadata?: Record<string, any>;
  enabled?: boolean;
  isCustom?: boolean;
  capabilities?: string[];
  skills?: string[];
  modelPreference?: string;
}

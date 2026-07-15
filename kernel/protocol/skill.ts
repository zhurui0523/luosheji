import { RuntimeContext } from './runtime-context';

export type CapabilityKind =
  | "text"
  | "image"
  | "video"
  | "vision"
  | "audio"
  | "code"
  | "ui"
  | "data"
  | "browser"
  | "workflow";

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: CapabilityKind | "all" | string;
  instruction?: string;
  inputSchema?: any;
  outputSchema?: any;
  acceptedUploadTypes?: Array<"text" | "image" | "video" | "audio" | "file" | string>;
  capabilityIds?: string[];
  defaultModelKind?: CapabilityKind;
  execute?: (input: any, context: RuntimeContext) => Promise<any>;
  metadata?: Record<string, any>;
  isSystem?: boolean;
  isInstalled?: boolean;
  isPublic?: boolean;
  customOptions?: any;
  enableUpload?: boolean;
  uploadType?: string;
  promptLabel?: string;
  promptPlaceholder?: string;
}

export interface CapabilityDefinition {
  id: string;
  name: string;
  kind: CapabilityKind;
  description?: string;
  provider?: string;
  execute: (input: any, context: RuntimeContext) => Promise<any>;
}

export type Capability = CapabilityDefinition;

export interface CapabilityResult {
  success: boolean;
  output: any;
  providerUsed: string;
  attempts: number;
  error?: string;
}

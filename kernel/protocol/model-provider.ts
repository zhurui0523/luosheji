import { CapabilityKind } from './skill';

export interface ModelProviderDefinition {
  id: string;
  name: string;
  provider: string;
  protocol: "google" | "openai" | "claude" | "custom" | string;
  capabilityKinds?: CapabilityKind[];
  endpoint?: string;
  model?: string;
  apiKeyRef?: string;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  call: (inputOrMethod: any, contextOrArgs?: any, config?: any) => Promise<any>;
  stream?: (inputOrMethod: any, contextOrArgs?: any, config?: any) => any;
  healthCheck?: () => Promise<boolean>;
  capabilities?: {
    text?: boolean;
    image?: boolean;
    video?: boolean;
    vision?: boolean;
    embedding?: boolean;
    tools?: boolean;
  };
}

export type ModelCapabilityKind =
  | "text"
  | "image"
  | "video"
  | "vision"
  | "audio"
  | "code"
  | "embedding"
  | "tools";

export type ModelProtocolType =
  | "openai"
  | "openai-compatible"
  | "google"
  | "anthropic"
  | "claude"
  | "seedance"
  | "custom";

export type ModelConnectionState =
  | "enabled"
  | "disabled"
  | "error"
  | "testing";

export interface UserModelConnection {
  id: string;
  name: string;
  provider: string;
  protocol: ModelProtocolType;
  endpoint: string;
  path?: string;
  model: string;
  modelType?: "text" | "image" | "video" | string;
  apiKeyRef?: string;
  apiKey?: string;
  capabilityKinds: ModelCapabilityKind[];
  enabled: boolean;
  state?: ModelConnectionState;
  isCustom?: boolean;
  displayName?: string;
  defaultGenerationSettings?: {
    image?: {
      aspectRatio?: string;
      imageSize?: string;
    };
    video?: {
      videoMode?: string;
      duration?: string;
      aspectRatio?: string;
      resolution?: string;
    };
    [key: string]: any;
  };
  headers?: Record<string, string>;
  requestMapping?: Record<string, any>;
  responseMapping?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt?: number;
  updatedAt?: number;
  lastTestedAt?: number;
  lastError?: string;
}

export type ModelProvider = ModelProviderDefinition;

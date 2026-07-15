export interface RuntimeContext {
  userId?: string;
  teamId?: string;
  canvasId?: string;
  conversationId?: string;
  selectedModelIds?: Record<string, string>;
  variables?: Record<string, any>;
  permissions?: string[];
  brandName?: string;
  videoRatio?: '16:9' | '9:16' | '1:1';
  resolution?: '1080p' | '4K';
  sandboxEnabled?: boolean;
  maxRetries?: number;
  safetyFilterLevel?: 'Low' | 'Medium' | 'High';
  modelProvider?: string;
  config?: any;
  previousOutputs?: Record<string, any>;
  onProgress?: (progressMsg: string) => void;
  aspectRatio?: string;
  duration?: string;
  imageUrl?: string;
  videoOptions?: any;
}

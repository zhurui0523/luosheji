export interface RuntimeArtifact {
  id: string;
  taskId?: string;
  goalId?: string;
  canvasId?: string;
  type: "text" | "image" | "video" | "audio" | "code" | "ui" | "file" | "json" | "plugin-ui";
  title?: string;
  content?: any;
  url?: string;
  metadata?: Record<string, any>;
  createdAt?: number;
  status?: string;
  imageUrl?: string;
  videoUrl?: string;
  ossUrl?: string;
  prompt?: string;
  revisedPrompt?: string;
  error?: string;
  config?: any;
  timestamp?: number;
}

export type CanvasArtifact = RuntimeArtifact;

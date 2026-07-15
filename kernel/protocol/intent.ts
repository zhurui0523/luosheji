import { RuntimeContext } from './runtime-context';

export interface Intent {
  id: string;
  rawText: string;
  source: string; // e.g. "chat" | "canvas" | "api" | "workflow" | "system"
  createdAt?: number;
  context?: RuntimeContext;
  standardizedIntent?: string;
  timestamp?: number;
}

export interface CustomSkillOption {
  id: string;
  name: string; // e.g., "一级选项"
  choices: string[]; // e.g., ["50mm", "85mm"]
}

export interface AiSkill {
  id: string;
  name: string;
  desc: string;
  icon: string;
  instruction: string;
  creatorId?: number;
  creatorName?: string;
  isPublic?: boolean;
  isSystem?: boolean;
  isInstalled?: boolean;
  tier?: 'light' | 'heavy';
  customOptions?: CustomSkillOption[] | null;
  category?: 'text' | 'image' | 'video' | 'all';
  enableUpload?: boolean;
  uploadType?: 'all' | 'text' | 'image' | 'video';
  status?: 'pending' | 'approved' | 'rejected';
  promptLabel?: string;
  promptPlaceholder?: string;
  code?: string;
}

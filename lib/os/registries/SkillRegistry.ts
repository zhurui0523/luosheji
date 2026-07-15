import { SkillDefinition } from '../types';

// Import existing skills
import {
  createScriptSkill,
  analyzeScriptSkill,
  rewriteScriptSkill,
  videoDissectSkill,
  assetPromptSkill,
  shotPromptSkill,
  sixViewSkill,
  scenePlanSkill,
  gridStoryboardSkill,
  officePitchDeckSkill,
  officeAdScriptSkill,
  officeBriefProposalSkill,
  dnaSkill,
  assetLibrarySkill
} from '../../../skills/definitions/index';

class SkillRegistryService {
  private skills: Map<string, SkillDefinition> = new Map();

  constructor() {
    this.registerDefaultSkills();
  }

  private registerDefaultSkills() {
    const list: any[] = [
      createScriptSkill,
      analyzeScriptSkill,
      rewriteScriptSkill,
      videoDissectSkill,
      assetPromptSkill,
      shotPromptSkill,
      sixViewSkill,
      scenePlanSkill,
      gridStoryboardSkill,
      officePitchDeckSkill,
      officeAdScriptSkill,
      officeBriefProposalSkill,
      dnaSkill,
      assetLibrarySkill
    ];

    list.forEach(item => {
      if (item) {
        this.register({
          id: item.id,
          name: item.name,
          description: item.desc || item.description || '',
          instruction: item.instruction || '',
          category: item.category || 'all',
          icon: item.icon,
          isSystem: item.isSystem !== false,
          isInstalled: item.isInstalled !== false,
          isPublic: item.isPublic !== false,
          customOptions: item.customOptions,
          enableUpload: item.enableUpload,
          uploadType: item.uploadType,
          promptLabel: item.promptLabel,
          promptPlaceholder: item.promptPlaceholder,
          metadata: item
        });
      }
    });
  }

  public register(skill: SkillDefinition) {
    this.skills.set(skill.id, skill);
  }

  public unregister(id: string) {
    this.skills.delete(id);
  }

  public get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  public list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  public has(id: string): boolean {
    return this.skills.has(id);
  }
}

export const SkillRegistry = new SkillRegistryService();
export default SkillRegistry;

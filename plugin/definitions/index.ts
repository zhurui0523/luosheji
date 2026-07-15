import { AiSkill } from "../../skills/types.ts";
import {
  BUILTIN_PLUGIN_MANIFESTS,
  BUILTIN_PLUGIN_PACKAGES,
  BUILTIN_PLUGIN_SKILLS,
  perspectiveSimSkill,
  pointAndShootSkill,
  cameraControlSkill,
  panoramaSkill,
  aiCreativeDirectorSkill,
} from "../../extensions/plugins/index.ts";

// Assign categories for UI grouping and processing
panoramaSkill.category = "image";
aiCreativeDirectorSkill.category = "text";

export {
  perspectiveSimSkill,
  pointAndShootSkill,
  cameraControlSkill,
  panoramaSkill,
  aiCreativeDirectorSkill,
};

export { BUILTIN_PLUGIN_MANIFESTS, BUILTIN_PLUGIN_PACKAGES };

export const SYSTEM_PLUGINS: AiSkill[] = BUILTIN_PLUGIN_SKILLS;

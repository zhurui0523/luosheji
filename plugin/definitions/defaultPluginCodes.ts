import { cameraControlSkill } from "./cameraControl";
import { panoramaSkill } from "./panorama";
import { perspectiveSimSkill } from "./perspectiveSim";
import { pointAndShootSkill } from "./pointAndShoot";
import { aiCreativeDirectorSkill } from "./aiCreativeDirector";

// Default React source codes for the system plugins loaded directly from their respective definition files
export const DEFAULT_PLUGIN_CODES: Record<string, string> = {
  'camera-control': cameraControlSkill.code || '',
  'panorama': panoramaSkill.code || '',
  'perspective-sim': perspectiveSimSkill.code || '',
  'point-and-shoot': pointAndShootSkill.code || '',
  'ai-creative-director': aiCreativeDirectorSkill.code || '',
};

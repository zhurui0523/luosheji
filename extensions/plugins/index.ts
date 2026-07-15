import { ExtensionManifest } from '../../lib/os/types';
import { aiCreativeDirectorSkill, aiCreativeDirectorPluginManifest } from './ai-creative-director/index.ts';
import { cameraControlSkill, cameraControlPluginManifest } from './camera-control/index.ts';
import { panoramaSkill, panoramaPluginManifest } from './panorama/index.ts';
import { perspectiveSimSkill, perspectiveSimPluginManifest } from './perspective-sim/index.ts';
import { pointAndShootSkill, pointAndShootPluginManifest } from './point-and-shoot/index.ts';

export {
  aiCreativeDirectorSkill,
  aiCreativeDirectorPluginManifest,
  cameraControlSkill,
  cameraControlPluginManifest,
  panoramaSkill,
  panoramaPluginManifest,
  perspectiveSimSkill,
  perspectiveSimPluginManifest,
  pointAndShootSkill,
  pointAndShootPluginManifest,
};

export const BUILTIN_PLUGIN_MANIFESTS: ExtensionManifest[] = [
  perspectiveSimPluginManifest,
  pointAndShootPluginManifest,
  cameraControlPluginManifest,
  panoramaPluginManifest,
  aiCreativeDirectorPluginManifest,
];

export const BUILTIN_PLUGIN_SKILLS = [
  perspectiveSimSkill,
  pointAndShootSkill,
  cameraControlSkill,
  panoramaSkill,
  aiCreativeDirectorSkill,
];

export const BUILTIN_PLUGIN_PACKAGES = BUILTIN_PLUGIN_MANIFESTS.map((manifest) => ({
  id: manifest.id,
  manifest,
  packagePath: manifest.metadata?.packagePath,
  entry: manifest.metadata?.entry,
  manifestFile: manifest.metadata?.manifestFile,
}));

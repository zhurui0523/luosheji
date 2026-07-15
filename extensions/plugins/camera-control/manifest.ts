import { ExtensionManifest } from '../../../lib/os/types';
import { cameraControlSkill } from './skill.ts';

export const cameraControlPluginManifest: ExtensionManifest = {
  id: cameraControlSkill.id,
  name: cameraControlSkill.name,
  version: '1.0.0',
  description: cameraControlSkill.desc || '',
  type: 'plugin',
  author: 'XiaoLuo Team',
  category: cameraControlSkill.category || 'image',
  icon: cameraControlSkill.icon,
  permissions: ['call_model'],
  sandbox: 'none',
  runtime: {
    kind: 'prompt',
    entry: './skill.ts'
  },
  contributes: {
    skills: [cameraControlSkill]
  },
  metadata: {
    builtin: true,
    independentPackage: true,
    packagePath: 'extensions/plugins/camera-control',
    manifestFile: 'manifest.json',
    entry: 'index.ts'
  }
};

export default cameraControlPluginManifest;

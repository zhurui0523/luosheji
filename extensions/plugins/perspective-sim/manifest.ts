import { ExtensionManifest } from '../../../lib/os/types';
import { perspectiveSimSkill } from './skill.ts';

export const perspectiveSimPluginManifest: ExtensionManifest = {
  id: perspectiveSimSkill.id,
  name: perspectiveSimSkill.name,
  version: '1.0.0',
  description: perspectiveSimSkill.desc || '',
  type: 'plugin',
  author: 'XiaoLuo Team',
  category: perspectiveSimSkill.category || 'image',
  icon: perspectiveSimSkill.icon,
  permissions: ['call_model'],
  sandbox: 'none',
  runtime: {
    kind: 'prompt',
    entry: './skill.ts'
  },
  contributes: {
    skills: [perspectiveSimSkill]
  },
  metadata: {
    builtin: true,
    independentPackage: true,
    packagePath: 'extensions/plugins/perspective-sim',
    manifestFile: 'manifest.json',
    entry: 'index.ts'
  }
};

export default perspectiveSimPluginManifest;

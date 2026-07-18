import { ExtensionManifest } from '../../../lib/os/types';
import { pointAndShootSkill } from './skill.ts';

export const pointAndShootPluginManifest: ExtensionManifest = {
  id: pointAndShootSkill.id,
  name: pointAndShootSkill.name,
  version: '1.0.0',
  description: pointAndShootSkill.desc || '',
  type: 'plugin',
  author: 'XiaoLuo Team',
  category: pointAndShootSkill.category || 'image',
  icon: pointAndShootSkill.icon,
  permissions: ['call_model'],
  sandbox: 'none',
  runtime: {
    kind: 'prompt',
    entry: './skill.ts'
  },
  contributes: {
    skills: [{ ...pointAndShootSkill, description: pointAndShootSkill.desc, category: pointAndShootSkill.category || 'image' }]
  },
  metadata: {
    builtin: true,
    independentPackage: true,
    packagePath: 'extensions/plugins/point-and-shoot',
    manifestFile: 'manifest.json',
    entry: 'index.ts'
  }
};

export default pointAndShootPluginManifest;

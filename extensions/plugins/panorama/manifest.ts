import { ExtensionManifest } from '../../../lib/os/types';
import { panoramaSkill } from './skill.ts';

export const panoramaPluginManifest: ExtensionManifest = {
  id: panoramaSkill.id,
  name: panoramaSkill.name,
  version: '1.0.0',
  description: panoramaSkill.desc || '',
  type: 'plugin',
  author: 'XiaoLuo Team',
  category: panoramaSkill.category || 'image',
  icon: panoramaSkill.icon,
  permissions: ['call_model'],
  sandbox: 'none',
  runtime: {
    kind: 'prompt',
    entry: './skill.ts'
  },
  contributes: {
    skills: [{ ...panoramaSkill, description: panoramaSkill.desc, category: panoramaSkill.category || 'image' }]
  },
  metadata: {
    builtin: true,
    independentPackage: true,
    packagePath: 'extensions/plugins/panorama',
    manifestFile: 'manifest.json',
    entry: 'index.ts'
  }
};

export default panoramaPluginManifest;

import { ExtensionManifest } from '../../../lib/os/types';
import { aiCreativeDirectorSkill } from './skill.ts';

export const aiCreativeDirectorPluginManifest: ExtensionManifest = {
  id: aiCreativeDirectorSkill.id,
  name: aiCreativeDirectorSkill.name,
  version: '1.0.0',
  description: aiCreativeDirectorSkill.desc || '',
  type: 'plugin',
  author: 'XiaoLuo Team',
  category: aiCreativeDirectorSkill.category || 'text',
  icon: aiCreativeDirectorSkill.icon,
  permissions: ['call_model'],
  sandbox: 'none',
  runtime: {
    kind: 'prompt',
    entry: './skill.ts'
  },
  contributes: {
    skills: [aiCreativeDirectorSkill]
  },
  metadata: {
    builtin: true,
    independentPackage: true,
    packagePath: 'extensions/plugins/ai-creative-director',
    manifestFile: 'manifest.json',
    entry: 'index.ts'
  }
};

export default aiCreativeDirectorPluginManifest;

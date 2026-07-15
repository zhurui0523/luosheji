import { AiSkill } from '../skills/types';
import { PluginRegistry } from '../lib/os/registries/PluginRegistry';
import { SYSTEM_PLUGINS } from './definitions';

export * from './definitions';

// Export an adapter list that dynamically reads from the unified PluginRegistry
export const PLUGINS: AiSkill[] = new Proxy([], {
  get(target, prop, receiver) {
    const systemIds = SYSTEM_PLUGINS.map(sp => sp.id);
    const list = PluginRegistry.list().map(plugin => {
      const firstSkill = plugin.contributes?.skills?.[0];
      return {
        id: plugin.id,
        name: plugin.name,
        desc: plugin.description,
        icon: plugin.icon,
        instruction: firstSkill?.instruction || '',
        isSystem: systemIds.includes(plugin.id),
        isInstalled: true,
        isPublic: true,
        customOptions: firstSkill?.customOptions || null,
        category: plugin.category as any,
        enableUpload: firstSkill?.enableUpload,
        uploadType: firstSkill?.uploadType as any,
        promptLabel: firstSkill?.promptLabel,
        promptPlaceholder: firstSkill?.promptPlaceholder
      } as AiSkill;
    });

    const val = Reflect.get(list, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(list);
    }
    return val;
  }
});
export default PLUGINS;

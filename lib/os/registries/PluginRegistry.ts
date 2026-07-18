import { PluginDefinition, SkillDefinition, ExtensionManifest, ExtensionLifecycleState } from '../types';
import { ExtensionRegistry } from './ExtensionRegistry';
import { validateExtensionManifest } from '../extension/validateManifest';
import { BUILTIN_PLUGIN_MANIFESTS, SYSTEM_PLUGINS } from '../../../plugin/definitions';

class PluginRegistryService {
  private plugins: Map<string, PluginDefinition> = new Map();

  constructor() {
    this.registerDefaultPlugins();
    this.loadCustomAndUserPlugins();
    if (typeof window !== 'undefined') {
      window.addEventListener('skills-changed', () => {
        this.loadCustomAndUserPlugins();
      });
    }
  }

  private registerDefaultPlugins() {
    BUILTIN_PLUGIN_MANIFESTS.forEach((manifest) => {
      try {
        this.registerManifest(manifest);
        ExtensionRegistry.install(manifest);
      } catch (err) {
        console.warn(`[PluginRegistry] Failed to register builtin plugin package "${manifest.id}":`, err);
      }
    });
  }

  private loadCustomAndUserPlugins() {
    if (typeof window === 'undefined') return;

    try {
      this.plugins.clear();
      this.registerDefaultPlugins();

      // 1. Read deleted system plugins
      const deletedIds = JSON.parse(localStorage.getItem('deleted_system_plugins') || '[]');
      deletedIds.forEach((id: string) => {
        this.plugins.delete(id);
      });

      // 2. Read edited system plugins
      const editedPlugins = JSON.parse(localStorage.getItem('edited_system_plugins') || '{}');
      for (const [id, editedData] of Object.entries(editedPlugins)) {
        const existing = this.plugins.get(id);
        if (existing) {
          const updatedPlugin = { ...existing, ...(editedData as any) };
          this.plugins.set(id, updatedPlugin);
          
        }
      }

      // 3. Migrate and load old user_plugins (AiSkill format) to user_plugins_v2 (PluginDefinition format)
      const oldUserPluginsRaw = localStorage.getItem('user_plugins');
      let v2Plugins: PluginDefinition[] = [];

      const v2Raw = localStorage.getItem('user_plugins_v2');
      if (v2Raw) {
        v2Plugins = JSON.parse(v2Raw);
      } else if (oldUserPluginsRaw) {
        // Convert old user_plugins format to v2
        const oldUserPlugins = JSON.parse(oldUserPluginsRaw);
        v2Plugins = oldUserPlugins.map((oldP: any) => {
          // Convert to SkillDefinition
          const skill: SkillDefinition = {
            id: oldP.id,
            name: oldP.name,
            description: oldP.desc || oldP.description || '',
            instruction: oldP.instruction || '',
            category: oldP.category || 'all',
            icon: oldP.icon,
            isSystem: false,
            isInstalled: true,
            isPublic: true,
            customOptions: oldP.customOptions,
            enableUpload: oldP.enableUpload,
            uploadType: oldP.uploadType,
            promptLabel: oldP.promptLabel,
            promptPlaceholder: oldP.promptPlaceholder
          };
          return {
            id: oldP.id,
            name: oldP.name,
            version: '1.0.0',
            description: oldP.desc || oldP.description || '',
            icon: oldP.icon || '🔌',
            category: oldP.category || 'image',
            permissions: [],
            contributes: {
              skills: [skill]
            },
            enabled: true
          };
        });

        // Save migrated plugins to localStorage_v2
        localStorage.setItem('user_plugins_v2', JSON.stringify(v2Plugins));
      }

      // Register all v2 plugins
      v2Plugins.forEach((p: PluginDefinition) => {
        this.register(p);
      });

      // 4. Read user_extension_manifests (manifest format)
      const manifestsRaw = localStorage.getItem('user_extension_manifests');
      if (manifestsRaw) {
        try {
          const manifests = JSON.parse(manifestsRaw);
          if (Array.isArray(manifests)) {
            manifests.forEach((m: any) => {
              try {
                const validation = validateExtensionManifest(m);
                if (validation.ok && validation.manifest) {
                  this.registerManifest(validation.manifest);
                  // Also register into ExtensionRegistry
                  try {
                    ExtensionRegistry.install(validation.manifest);
                  } catch (extErr) {
                    console.warn(`[PluginRegistry] Failed to register manifest in ExtensionRegistry:`, extErr);
                  }
                } else {
                  console.warn(`[PluginRegistry] Manifest validation failed for custom plugin "${m?.id || 'unknown'}":`, validation.errors);
                }
              } catch (singleManifestErr) {
                console.warn(`[PluginRegistry] Error loading extension manifest:`, singleManifestErr);
              }
            });
          }
        } catch (manifestJsonErr) {
          console.warn(`[PluginRegistry] Failed to parse user_extension_manifests:`, manifestJsonErr);
        }
      }

    } catch (e) {
      console.error('Failed to load user and custom plugins in PluginRegistry:', e);
    }
  }

  public register(plugin: PluginDefinition) {
    try {
      this.plugins.set(plugin.id, plugin);
    } catch (pluginErr) {
      console.error(`[PluginRegistry] Error registering plugin "${plugin?.id}":`, pluginErr);
    }
  }

  public registerManifest(manifest: ExtensionManifest): PluginDefinition {
    const plugin: PluginDefinition = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      icon: manifest.icon || '🔌',
      category: manifest.category || 'tool',
      enabled: true,
      permissions: manifest.permissions || [],
      contributes: manifest.contributes,
      runtime: (manifest.runtime || manifest.sandbox) ? {
        entry: manifest.runtime?.entry,
        sandbox: manifest.sandbox || 'none'
      } : undefined,
      metadata: manifest.metadata,
      manifest,
      state: 'enabled'
    };

    // Avoid calling register(plugin) which would auto-register skills. Instead, directly save it.
    this.plugins.set(plugin.id, plugin);
    return plugin;
  }

  public loadFromManifestList(manifests: ExtensionManifest[]): PluginDefinition[] {
    const loaded: PluginDefinition[] = [];
    manifests.forEach(m => {
      try {
        const plugin = this.registerManifest(m);
        loaded.push(plugin);
      } catch (err) {
        console.warn(`[PluginRegistry] Failed to register manifest "${m?.id}":`, err);
      }
    });
    return loaded;
  }

  public async refreshFromServer(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    const token = window.localStorage.getItem('token');
    if (!token || token === 'guest') return false;

    try {
      const res = await fetch('/api/extensions/packages?kind=plugin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return false;

      const data = await res.json();
      const manifests = Array.isArray(data?.packages)
        ? data.packages
            .map((pkg: any) => pkg?.manifest)
            .filter((manifest: any) => manifest?.id && manifest?.name && manifest?.version)
        : [];

      localStorage.setItem('user_extension_manifests', JSON.stringify(manifests));
      localStorage.setItem('user_plugins_v2', '[]');
      this.loadCustomAndUserPlugins();
      this.saveUserPluginsV2();
      return true;
    } catch (err) {
      console.warn('[PluginRegistry] Failed to refresh cloud plugin packages:', err);
      return false;
    }
  }

  public unregister(id: string) {
    const plugin = this.plugins.get(id);
    if (plugin?.manifest) {
      this.plugins.delete(id);
      this.saveUserPluginsV2();
      return;
    }
    this.plugins.delete(id);
    this.saveUserPluginsV2();
  }

  public get(id: string): PluginDefinition | undefined {
    return this.plugins.get(id);
  }

  public list(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  public has(id: string): boolean {
    return this.plugins.has(id);
  }

  public saveUserPluginsV2() {
    if (typeof window === 'undefined') return;
    try {
      // Find all custom (non-system) plugins
      const systemIds = SYSTEM_PLUGINS.map(sp => sp.id);
      const customPlugins = this.list().filter(p => !systemIds.includes(p.id));
      localStorage.setItem('user_plugins_v2', JSON.stringify(customPlugins));
    } catch (e) {
      console.error('Failed to save user_plugins_v2 to localStorage:', e);
    }
  }
}

export const PluginRegistry = new PluginRegistryService();
export default PluginRegistry;

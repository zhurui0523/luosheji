import { ExtensionManifest } from '../types';
import { validateExtensionManifest } from './validateManifest';
import { inferExtensionKind } from './ExtensionDirectory';
import { UserExtensionIndexRecord, UserExtensionStore } from './UserExtensionStore';
import { ExtensionRegistry } from '../registries/ExtensionRegistry';
import { PluginRegistry } from '../registries/PluginRegistry';

export interface InstallExtensionOptions {
  userId?: string;
  source?: UserExtensionIndexRecord['source'];
  enable?: boolean;
}

class ExtensionHubService {
  installManifest(input: any, options: InstallExtensionOptions = {}) {
    const validation = validateExtensionManifest(input);
    if (!validation.ok || !validation.manifest) {
      throw new Error(`Manifest validation failed: ${validation.errors.join('; ')}`);
    }

    const manifest = validation.manifest;
    const manifests = UserExtensionStore.saveManifest(manifest, options.userId);
    const record = ExtensionRegistry.install(manifest);
    PluginRegistry.registerManifest(manifest);

    if (options.enable === false) {
      ExtensionRegistry.disable(manifest.id);
      UserExtensionStore.updateState(manifest.id, 'disabled', options.userId);
    } else {
      UserExtensionStore.updateState(manifest.id, record.state === 'enabled' ? 'enabled' : 'error', options.userId, record.error);
    }

    return {
      manifest,
      kind: inferExtensionKind(manifest),
      record: ExtensionRegistry.get(manifest.id),
      manifests,
      index: UserExtensionStore.listIndex(options.userId)
    };
  }

  enable(id: string, userId?: string) {
    ExtensionRegistry.enable(id);
    UserExtensionStore.updateState(id, 'enabled', userId);
    return ExtensionRegistry.get(id);
  }

  disable(id: string, userId?: string) {
    ExtensionRegistry.disable(id);
    UserExtensionStore.updateState(id, 'disabled', userId);
    return ExtensionRegistry.get(id);
  }

  uninstall(id: string, userId?: string) {
    ExtensionRegistry.uninstall(id);
    PluginRegistry.unregister(id);
    const manifests = UserExtensionStore.removeManifest(id, userId);
    return {
      manifests,
      index: UserExtensionStore.listIndex(userId)
    };
  }

  list(userId?: string): UserExtensionIndexRecord[] {
    const index = UserExtensionStore.listIndex(userId);
    index.forEach(record => {
      if (!ExtensionRegistry.get(record.id) && record.state !== 'uninstalled') {
        try {
          ExtensionRegistry.install(record.manifest);
          PluginRegistry.registerManifest(record.manifest);
          if (record.state === 'disabled') {
            ExtensionRegistry.disable(record.id);
          }
        } catch (err: any) {
          UserExtensionStore.updateState(record.id, 'error', userId, err.message || String(err));
        }
      }
    });
    return UserExtensionStore.listIndex(userId);
  }

  createDraftManifest(kind: string, base: Partial<ExtensionManifest> = {}): ExtensionManifest {
    const id = base.id || `${kind}-${Date.now()}`;
    return {
      id,
      name: base.name || id,
      version: base.version || '1.0.0',
      description: base.description || '',
      type: (kind === 'workflow' || kind === 'template' || kind === 'adapter') ? 'plugin' : (kind as any),
      category: base.category || kind,
      icon: base.icon || '🔌',
      permissions: base.permissions || [],
      sandbox: base.sandbox || 'none',
      contributes: base.contributes || {},
      metadata: base.metadata || {}
    };
  }
}

export const ExtensionHub = new ExtensionHubService();
export default ExtensionHub;


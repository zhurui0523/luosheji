export type ExtensionPackageKind =
  | 'skill'
  | 'plugin'
  | 'agent'
  | 'model'
  | 'adapter'
  | 'workflow'
  | 'template'
  | 'bundle';

export const EXTENSION_DIRECTORIES: Record<ExtensionPackageKind, string> = {
  skill: 'extensions/skills',
  plugin: 'extensions/plugins',
  agent: 'extensions/agents',
  model: 'extensions/models',
  adapter: 'extensions/adapters',
  workflow: 'extensions/workflows',
  template: 'extensions/templates',
  bundle: 'extensions/bundles'
};

export function getExtensionDirectory(kind: ExtensionPackageKind) {
  return EXTENSION_DIRECTORIES[kind];
}

export function inferExtensionKind(manifest: any): ExtensionPackageKind {
  if (manifest?.type === 'capability') return 'plugin';
  if (manifest?.type === 'bundle') return 'bundle';
  if (manifest?.type === 'workflow') return 'workflow';
  if (manifest?.type === 'adapter') return 'adapter';
  if (manifest?.type === 'model') return 'model';
  if (manifest?.type === 'agent') return 'agent';
  if (manifest?.type === 'skill') return 'skill';

  const contributes = manifest?.contributes || {};
  if (contributes.workflowPresets?.length) return 'workflow';
  if (contributes.templates?.length) return 'template';
  if (manifest?.adapters?.length || contributes.adapters?.length || contributes.tools?.length) return 'adapter';
  return 'plugin';
}

export function getExtensionPackagePath(manifest: any) {
  const kind = inferExtensionKind(manifest);
  return `${getExtensionDirectory(kind)}/${manifest.id}`;
}

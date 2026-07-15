import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'kernel/protocol/plugin.ts',
  'kernel/protocol/task-node.ts',
  'lib/os/IntentRuntime.ts',
  'lib/os/WorkflowExecutionController.ts',
  'lib/os/CapabilityBus.ts',
  'lib/os/artifacts/ArtifactFactory.ts',
  'lib/os/security/PermissionGuard.ts',
  'lib/os/extension/validateManifest.ts',
  'lib/os/extension/ExtensionDirectory.ts',
  'lib/os/extension/ExtensionCreator.ts',
  'lib/os/extension/ExtensionHub.ts',
  'lib/os/extension/UserExtensionStore.ts',
  'lib/os/agents/UserAgentStore.ts',
  'lib/os/models/UserModelStore.ts',
  'lib/os/registries/ExtensionRegistry.ts',
  'lib/os/registries/ModelRegistry.ts',
  'lib/os/registries/OpenSourceAdapterRegistry.ts',
  'lib/os/registries/WorkflowPresetRegistry.ts',
  'lib/os/registries/TemplateRegistry.ts',
  'docs/EXTENSION_ECOSYSTEM.md',
  'extensions/README.md',
  'extensions/plugins/index.ts'
];

const requiredText = [
  ['kernel/protocol/plugin.ts', 'workflowPresets'],
  ['kernel/protocol/plugin.ts', 'templates'],
  ['kernel/protocol/task-node.ts', 'adapterId'],
  ['kernel/protocol/task-node.ts', 'toolId'],
  ['lib/os/WorkflowExecutionController.ts', 'waitForCompletion'],
  ['lib/os/CapabilityBus.ts', 'PermissionGuard'],
  ['lib/os/CapabilityBus.ts', 'ArtifactFactory'],
  ['lib/os/extension/ExtensionAdapterRunner.ts', 'validateHttpAdapterUrl'],
  ['components/agents/brainAgent.ts', 'applyMentionedAgents'],
  ['lib/os/extension/ExtensionHub.ts', 'installManifest'],
  ['lib/os/extension/ExtensionCreator.ts', 'createManifest'],
  ['lib/os/extension/UserExtensionStore.ts', 'listIndex'],
  ['lib/os/registries/ExtensionRegistry.ts', 'WorkflowPresetRegistry'],
  ['lib/os/registries/ExtensionRegistry.ts', 'TemplateRegistry'],
  ['docs/EXTENSION_ECOSYSTEM.md', 'ExtensionHub'],
  ['plugin/definitions/index.ts', 'BUILTIN_PLUGIN_MANIFESTS'],
  ['lib/os/registries/PluginRegistry.ts', 'BUILTIN_PLUGIN_MANIFESTS'],
  ['lib/os/registries/PluginRegistry.ts', 'ExtensionRegistry.install']
];

const requiredPluginPackages = [
  'extensions/plugins/perspective-sim',
  'extensions/plugins/point-and-shoot',
  'extensions/plugins/camera-control',
  'extensions/plugins/panorama',
  'extensions/plugins/ai-creative-director'
];

const requiredPluginPackageFiles = [
  'manifest.json',
  'manifest.ts',
  'skill.ts',
  'index.ts',
  'README.md'
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Missing required file: ${file}`);
  }
}

for (const [file, text] of requiredText) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    failures.push(`Cannot inspect missing file: ${file}`);
    continue;
  }
  const content = fs.readFileSync(abs, 'utf8');
  if (!content.includes(text)) {
    failures.push(`Expected "${text}" in ${file}`);
  }
}

for (const packageDir of requiredPluginPackages) {
  for (const packageFile of requiredPluginPackageFiles) {
    const file = path.join(packageDir, packageFile);
    if (!fs.existsSync(path.join(root, file))) {
      failures.push(`Incomplete plugin package: missing ${file}`);
    }
  }

  const manifestPath = path.join(root, packageDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.type !== 'plugin') {
        failures.push(`Plugin package manifest must use type "plugin": ${packageDir}`);
      }
      if (manifest.metadata?.independentPackage !== true) {
        failures.push(`Plugin package manifest must declare metadata.independentPackage: ${packageDir}`);
      }
      if (manifest.metadata?.packagePath !== packageDir.replaceAll('\\', '/')) {
        failures.push(`Plugin package manifest packagePath mismatch: ${packageDir}`);
      }
    } catch (err) {
      failures.push(`Invalid plugin package manifest JSON: ${packageDir}/manifest.json`);
    }
  }
}

if (failures.length > 0) {
  console.error('XiaoLuo OS self-check failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('XiaoLuo OS self-check passed.');

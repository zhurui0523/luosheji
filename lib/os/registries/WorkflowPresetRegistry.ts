import { WorkflowPresetDefinition } from '../types';

class WorkflowPresetRegistryService {
  private presets: Map<string, WorkflowPresetDefinition> = new Map();

  register(preset: WorkflowPresetDefinition) {
    this.presets.set(preset.id, preset);
  }

  unregister(id: string) {
    this.presets.delete(id);
  }

  get(id: string): WorkflowPresetDefinition | undefined {
    return this.presets.get(id);
  }

  list(): WorkflowPresetDefinition[] {
    return Array.from(this.presets.values());
  }

  listByExtension(extensionId: string): WorkflowPresetDefinition[] {
    return this.list().filter(preset => preset.metadata?.extensionId === extensionId);
  }
}

export const WorkflowPresetRegistry = new WorkflowPresetRegistryService();
export default WorkflowPresetRegistry;


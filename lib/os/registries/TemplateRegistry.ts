import { ExtensionTemplateDefinition } from '../types';

class TemplateRegistryService {
  private templates: Map<string, ExtensionTemplateDefinition> = new Map();

  register(template: ExtensionTemplateDefinition) {
    this.templates.set(template.id, template);
  }

  unregister(id: string) {
    this.templates.delete(id);
  }

  get(id: string): ExtensionTemplateDefinition | undefined {
    return this.templates.get(id);
  }

  list(): ExtensionTemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  listByType(type: string): ExtensionTemplateDefinition[] {
    return this.list().filter(template => template.type === type);
  }

  listByExtension(extensionId: string): ExtensionTemplateDefinition[] {
    return this.list().filter(template => template.metadata?.extensionId === extensionId);
  }
}

export const TemplateRegistry = new TemplateRegistryService();
export default TemplateRegistry;


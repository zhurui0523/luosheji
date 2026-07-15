import { ExtensionManifest } from '../types';
import { ExtensionPackageKind } from './ExtensionDirectory';
import { ExtensionHub } from './ExtensionHub';

export interface ExtensionCreatorInput {
  kind: ExtensionPackageKind;
  id?: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  instruction?: string;
  role?: string;
  endpoint?: string;
  model?: string;
  runtime?: any;
  workflow?: {
    nodes?: any[];
    edges?: any[];
  };
  template?: {
    type?: string;
    schema?: any;
    path?: string;
  };
}

class ExtensionCreatorService {
  createManifest(input: ExtensionCreatorInput): ExtensionManifest {
    const id = input.id || `${input.kind}-${Date.now()}`;
    const base = ExtensionHub.createDraftManifest(input.kind, {
      id,
      name: input.name,
      description: input.description || '',
      category: input.category || input.kind,
      icon: input.icon
    });

    if (input.kind === 'skill') {
      base.type = 'skill';
      base.permissions = ['call_model'];
      base.contributes = {
        skills: [{
          id,
          name: input.name,
          description: input.description || '',
          category: input.category || 'text',
          instruction: input.instruction || '',
          icon: input.icon
        } as any]
      };
    } else if (input.kind === 'agent') {
      base.type = 'agent';
      base.permissions = ['call_model'];
      base.contributes = {
        agents: [{
          id,
          name: input.name,
          role: input.role || input.name,
          description: input.description || '',
          systemInstruction: input.instruction || '',
          capabilityKinds: [input.category || 'text'],
          capabilities: [`cap_${input.category || 'text'}`],
          skills: []
        } as any]
      };
    } else if (input.kind === 'model') {
      base.type = 'model';
      base.contributes = {
        models: [{
          id,
          name: input.name,
          provider: input.name,
          protocol: 'custom',
          endpoint: input.endpoint,
          model: input.model,
          capabilityKinds: [input.category || 'text'],
          capabilities: {
            [input.category || 'text']: true
          },
          call: async () => {
            throw new Error('Model package call handler must be bound by ModelRegistry runtime.');
          }
        } as any]
      };
    } else if (input.kind === 'adapter') {
      base.type = 'plugin';
      base.permissions = ['use_network'];
      base.contributes = {
        adapters: [{
          id,
          name: input.name,
          runtime: input.runtime || {
            kind: 'http',
            baseUrl: input.endpoint || '',
            entry: ''
          },
          permissions: ['use_network']
        }]
      };
    } else if (input.kind === 'workflow') {
      base.type = 'plugin';
      base.contributes = {
        workflowPresets: [{
          id,
          name: input.name,
          description: input.description || '',
          category: input.category || 'workflow',
          nodes: input.workflow?.nodes || [],
          edges: input.workflow?.edges || []
        }]
      };
    } else if (input.kind === 'template') {
      base.type = 'plugin';
      base.contributes = {
        templates: [{
          id,
          name: input.name,
          description: input.description || '',
          type: input.template?.type || input.category || 'prompt',
          path: input.template?.path,
          schema: input.template?.schema
        }]
      };
    }

    return base;
  }
}

export const ExtensionCreator = new ExtensionCreatorService();
export default ExtensionCreator;


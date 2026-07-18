import { AgentDefinition, UserAgentDefinition, Task, CapabilityKind, RuntimeTask, RuntimeContext } from '../types';
import { normalizeUserAgent, toAgentDefinition } from '../agents/userAgentUtils';

class AgentRegistryService {
  private agents: Map<string, AgentDefinition> = new Map();
  private systemAgents: Map<string, AgentDefinition> = new Map();
  private systemAgentOverrides: Map<string, UserAgentDefinition> = new Map();
  private userAgents: Map<string, UserAgentDefinition> = new Map();
  private userAgentsLoaded = false;

  constructor() {
    this.registerDefaultAgents();
  }

  private registerDefaultAgents() {
    const defaults: AgentDefinition[] = [
      {
        id: 'brainAgent',
        name: '系统大脑 (BrainAgent)',
        role: '意图解析 / 总线调度',
        description: '系统中央大脑，负责判断快系统与慢系统，并把任务分派给可用 Agent、Skill、模型和画布节点。',
        systemInstruction: '',
        capabilityKinds: ['workflow'],
        capabilities: ['cap_think', 'cap_comm', 'cap_workflow'],
        skills: ['create-script', 'analyze-script', 'rewrite-script', 'office-pitch-deck', 'office-ad-script', 'office-brief-proposal'],
        modelPreference: 'gemini-3.5-flash',
        enabled: true,
        metadata: {
          source: 'system-agent',
          protected: true,
          packagePath: 'components/agents/brainAgent.ts',
        },
        execute: async (_task: Task, _context: any) => {
          return { status: 'success', text: 'BrainAgent execute acknowledged.' };
        },
      },
    ];

    defaults.forEach(agent => {
      this.systemAgents.set(agent.id, agent);
      this.register(agent);
    });
  }

  private isSystemAgentOverride(userAgent: UserAgentDefinition) {
    return userAgent.metadata?.source === 'system-agent-override' && Boolean(userAgent.metadata?.systemAgentId);
  }

  private restoreSystemAgents() {
    this.systemAgents.forEach((agent, id) => {
      this.agents.set(id, agent);
    });
    this.systemAgentOverrides.clear();
  }

  private applySystemAgentOverride(userAgent: UserAgentDefinition) {
    const systemAgentId = String(userAgent.metadata?.systemAgentId || '');
    const baseAgent = this.systemAgents.get(systemAgentId);
    if (!baseAgent) return false;

    this.systemAgentOverrides.set(systemAgentId, userAgent);
    this.agents.set(systemAgentId, {
      ...baseAgent,
      name: userAgent.name || baseAgent.name,
      role: userAgent.role || baseAgent.role,
      description: userAgent.description || baseAgent.description,
      icon: userAgent.icon || baseAgent.icon,
      systemInstruction: userAgent.systemInstruction || baseAgent.systemInstruction,
      capabilityKinds: userAgent.capabilityKinds?.length ? userAgent.capabilityKinds : baseAgent.capabilityKinds,
      skillIds: userAgent.skillIds?.length ? userAgent.skillIds : baseAgent.skillIds,
      skills: userAgent.skillIds?.length ? userAgent.skillIds : baseAgent.skills,
      modelPreferences: userAgent.modelPreferences || baseAgent.modelPreferences,
      modelPreference: userAgent.modelPreferences?.text || baseAgent.modelPreference,
      enabled: userAgent.enabled !== false,
      isCustom: false,
      metadata: {
        ...baseAgent.metadata,
        ...userAgent.metadata,
        source: 'system-agent',
        protected: true,
        systemAgentOverride: true,
        overridePackageId: userAgent.id,
        overrideUpdatedAt: userAgent.updatedAt,
      },
    });
    return true;
  }

  private ensureUserAgentsLoaded() {
    if (!this.userAgentsLoaded) {
      this.userAgentsLoaded = true;
      this.loadUserAgents();
    }
  }

  public register(agent: AgentDefinition) {
    this.agents.set(agent.id, agent);
  }

  public unregister(id: string) {
    this.agents.delete(id);
  }

  public get(id: string): AgentDefinition | undefined {
    this.ensureUserAgentsLoaded();
    return this.agents.get(id);
  }

  public list(): AgentDefinition[] {
    this.ensureUserAgentsLoaded();
    return Array.from(this.agents.values());
  }

  public listSystemAgents(): AgentDefinition[] {
    this.ensureUserAgentsLoaded();
    return Array.from(this.systemAgents.keys())
      .map(id => this.agents.get(id))
      .filter(Boolean) as AgentDefinition[];
  }

  public has(id: string): boolean {
    this.ensureUserAgentsLoaded();
    return this.agents.has(id);
  }

  public findByCapability(capabilityId: string): AgentDefinition[] {
    return this.list().filter(agent => this.isAgentEnabled(agent) && agent.capabilities?.includes(capabilityId));
  }

  public findByCapabilityKind(kind: CapabilityKind): AgentDefinition[] {
    return this.list().filter(agent => this.isAgentEnabled(agent) && agent.capabilityKinds?.includes(kind));
  }

  public findBestAgent(task: RuntimeTask, context?: RuntimeContext): AgentDefinition | undefined {
    if (task.agentId && this.has(task.agentId)) {
      const agent = this.get(task.agentId);
      return agent && this.isAgentEnabled(agent) ? agent : undefined;
    }

    if (task.assignedActorId && this.has(task.assignedActorId)) {
      const agent = this.get(task.assignedActorId);
      return agent && this.isAgentEnabled(agent) ? agent : undefined;
    }

    let taskType: any = task.type;
    if (taskType === 'script' || taskType === 'general') taskType = 'text';

    const candidates = this.findByCapabilityKind(taskType as CapabilityKind);
    if (candidates.length > 0) return candidates[0];
    if (taskType === 'workflow') return this.get('brainAgent');
    return undefined;
  }

  public registerUserAgent(userAgent: UserAgentDefinition): AgentDefinition {
    const normalized = normalizeUserAgent(userAgent);
    if (this.isSystemAgentOverride(normalized) && this.applySystemAgentOverride(normalized)) {
      return this.agents.get(String(normalized.metadata?.systemAgentId))!;
    }

    this.userAgents.set(normalized.id, normalized);
    const agentDef = toAgentDefinition(normalized);
    this.register(agentDef);
    return agentDef;
  }

  public unregisterUserAgent(id: string) {
    this.userAgents.delete(id);
    this.unregister(id);
  }

  public updateUserAgent(id: string, patch: Partial<UserAgentDefinition>): AgentDefinition {
    const existing = this.userAgents.get(id);
    if (!existing) throw new Error(`User Agent with id ${id} not found`);
    return this.registerUserAgent({ ...existing, ...patch, updatedAt: Date.now() } as UserAgentDefinition);
  }

  public enableUserAgent(id: string) {
    if (this.userAgents.has(id)) this.updateUserAgent(id, { enabled: true });
  }

  public disableUserAgent(id: string) {
    if (this.userAgents.has(id)) this.updateUserAgent(id, { enabled: false });
  }

  public listUserAgents(): UserAgentDefinition[] {
    this.ensureUserAgentsLoaded();
    return Array.from(this.userAgents.values());
  }

  public getSystemAgentOverride(systemAgentId: string): UserAgentDefinition | undefined {
    this.ensureUserAgentsLoaded();
    return this.systemAgentOverrides.get(systemAgentId);
  }

  public getUserAgent(id: string): UserAgentDefinition | undefined {
    this.ensureUserAgentsLoaded();
    return this.userAgents.get(id);
  }

  public loadUserAgents(config?: any) {
    for (const id of this.userAgents.keys()) this.unregister(id);
    this.userAgents.clear();
    this.restoreSystemAgents();

    const customAgents = this.resolveCustomAgents(config);
    for (const rawAgent of customAgents) {
      try {
        const normalized = normalizeUserAgent(rawAgent);
        if (normalized.id && normalized.name) this.registerUserAgent(normalized);
      } catch (err) {
        console.warn('Failed to load custom user agent:', err);
      }
    }
  }

  private resolveCustomAgents(config?: any): any[] {
    if (config && Array.isArray(config.userAgents)) return config.userAgents;
    if (config && config.global_api_config && Array.isArray(config.global_api_config.userAgents)) {
      return config.global_api_config.userAgents;
    }

    if (typeof window === 'undefined' || !window.localStorage) return [];

    try {
      const savedAgentsStr = localStorage.getItem('user_agents');
      const savedAgents = savedAgentsStr ? JSON.parse(savedAgentsStr) : [];
      if (Array.isArray(savedAgents) && savedAgents.length > 0) return savedAgents;
    } catch (error) {
      console.warn('Failed to parse localStorage user_agents:', error);
    }

    try {
      const extensionIndexStr = localStorage.getItem('user_extension_index');
      const extensionIndex = extensionIndexStr ? JSON.parse(extensionIndexStr) : [];
      if (Array.isArray(extensionIndex)) {
        return extensionIndex
          .filter((record: any) => record?.kind === 'agent' && record?.state !== 'uninstalled')
          .map((record: any) => record?.manifest?.contributes?.agents?.[0])
          .filter(Boolean);
      }
    } catch (error) {
      console.warn('Failed to parse localStorage agent extension index:', error);
    }

    return [];
  }

  private isAgentEnabled(agent: AgentDefinition) {
    if (agent.enabled === false) return false;
    const extId = agent.metadata?.extensionId;
    if (!extId) return true;
    const registry = (globalThis as any).ExtensionRegistry;
    return !(registry && typeof registry.isEnabled === 'function' && !registry.isEnabled(extId));
  }
}

export const AgentRegistry = new AgentRegistryService();
export default AgentRegistry;

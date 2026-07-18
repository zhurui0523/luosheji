import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Cpu,
  Edit2,
  FileJson,
  LockKeyhole,
  Plus,
  Power,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { AgentRegistry } from '../lib/os/registries/AgentRegistry';
import { UserAgentStore } from '../lib/os/agents/UserAgentStore';
import { SYSTEM_SKILLS } from '../skills/definitions';
import { PLUGINS } from '../plugin';
import { UserAgentDefinition, CapabilityKind, AgentDefinition } from '../lib/os/types';
import { Config } from '../types';
import { getModelOptions, ModelKind, ModelOption } from '../lib/modelOptions';
import { safeJson } from '../lib/fetch';
import { BRAIN_AGENT_SYSTEM_INSTRUCTION } from './agents/brainAgent';

const AGENT_PRESETS = [
  {
    name: '短视频爆款策划专家',
    role: '营销脚本策划',
    description: '擅长短视频开头钩子、节奏设计、口播脚本和高转化内容结构。',
    systemInstruction: '你是短视频爆款策划专家。请围绕用户目标，输出具有强钩子、强节奏、强转化的脚本方案，并明确分镜、口播、字幕和行动号召。',
    capabilityKinds: ['text'] as CapabilityKind[],
    skillIds: ['office-ad-script', 'office-brief-proposal'],
  },
  {
    name: '儿童绘本分镜导演',
    role: '绘本视觉导演',
    description: '擅长儿童故事结构、温暖画面、绘本分镜和插画提示词。',
    systemInstruction: '你是儿童绘本分镜导演。请用儿童可理解的叙事方式，把故事拆成清晰分镜，并给出温暖、稳定、适合绘本生成的视觉提示词。',
    capabilityKinds: ['text', 'image'] as CapabilityKind[],
    skillIds: ['grid-storyboard', 'scene-plan'],
  },
  {
    name: '品牌视觉创意总监',
    role: 'Art Director',
    description: '擅长品牌视觉 DNA、主视觉、色彩体系、原画分镜和动态视觉方向。',
    systemInstruction: '你是品牌视觉创意总监。请帮助用户提炼品牌视觉 DNA，形成主视觉方向、色彩系统、关键画面和适合生成图片/视频的执行提示词。',
    capabilityKinds: ['text', 'image', 'video'] as CapabilityKind[],
    skillIds: ['dna-design', 'asset-library'],
  },
];

const CAPABILITY_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
  video: '视频',
  workflow: '工作流',
  vision: '视觉',
  audio: '音频',
  code: '代码',
  tools: '工具',
};

function makeAgentId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `user-agent-${Date.now().toString().slice(-6)}-${slug || 'agent'}`;
}

function makeSystemAgentOverrideId(systemAgentId: string) {
  const slug = systemAgentId
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `system-agent-override-${slug || 'agent'}`;
}

function cleanSkillName(skill: any) {
  const rawName = String(skill?.name || skill?.id || '').trim();
  const icon = String(skill?.icon || '').trim();
  if (icon && rawName.startsWith(icon)) return rawName.slice(icon.length).trim() || rawName;
  return rawName.replace(/^[^\p{L}\p{N}]+/u, '').trim() || rawName;
}

function ensureOption(options: ModelOption[], currentValue: string) {
  if (!currentValue || options.some(option => option.value === currentValue)) return options;
  return [{ label: currentValue, value: currentValue }, ...options];
}

const FIELD_INPUT_CLASS = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-400';

export const UserAgentManager: React.FC<{ user?: any }> = ({ user }) => {
  const [agents, setAgents] = useState<UserAgentDefinition[]>([]);
  const [systemAgents, setSystemAgents] = useState<AgentDefinition[]>(() => AgentRegistry.listSystemAgents());
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingKind, setEditingKind] = useState<'user' | 'system' | null>(null);
  const [editingSystemAgentId, setEditingSystemAgentId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiConfig, setApiConfig] = useState<Config | null>(null);
  const [availableSkills, setAvailableSkills] = useState<any[]>(() =>
    SYSTEM_SKILLS.filter(skill => !PLUGINS.some(plugin => plugin.id === skill.id))
  );
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formInstruction, setFormInstruction] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCapabilities, setFormCapabilities] = useState<CapabilityKind[]>(['text']);
  const [formSkillIds, setFormSkillIds] = useState<string[]>([]);
  const [formTextModel, setFormTextModel] = useState('gemini-3.5-flash');
  const [formImageModel, setFormImageModel] = useState('gemini-3.1-flash-image-preview');
  const [formVideoModel, setFormVideoModel] = useState('seedance2.0');

  const isAdmin = user?.role === 'admin';
  const textModelOptions = getModelOptions(apiConfig, [], 'text');
  const imageModelOptions = getModelOptions(apiConfig, [], 'image');
  const videoModelOptions = getModelOptions(apiConfig, [], 'video');

  const getDefaultModel = (kind: ModelKind) => {
    const options = kind === 'text' ? textModelOptions : kind === 'image' ? imageModelOptions : videoModelOptions;
    if (options[0]?.value) return options[0].value;
    if (kind === 'image') return 'gemini-3.1-flash-image-preview';
    if (kind === 'video') return 'seedance2.0';
    return 'gemini-3.5-flash';
  };

  const getModelLabel = (kind: ModelKind, value?: string) => {
    if (!value) return '';
    const options = kind === 'text' ? textModelOptions : kind === 'image' ? imageModelOptions : videoModelOptions;
    return options.find(option => option.value === value)?.label || value;
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), type === 'success' ? 2600 : 4200);
  };

  const resetForm = () => {
    setIsEditing(null);
    setEditingKind(null);
    setEditingSystemAgentId(null);
    setFormName('');
    setFormRole('');
    setFormInstruction('');
    setFormDescription('');
    setFormCapabilities(['text']);
    setFormSkillIds([]);
    setFormTextModel(getDefaultModel('text'));
    setFormImageModel(getDefaultModel('image'));
    setFormVideoModel(getDefaultModel('video'));
  };

  const refreshAgents = async (notify = false) => {
    const userAgents = await UserAgentStore.listUserAgents(user?.id);
    AgentRegistry.loadUserAgents({ userAgents });
    const nextAgents = AgentRegistry.listUserAgents();
    setAgents(nextAgents);
    setSystemAgents(AgentRegistry.listSystemAgents());
    if (notify && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agents-changed', { detail: { agents: nextAgents } }));
    }
  };

  useEffect(() => {
    refreshAgents();
  }, [user?.id]);

  useEffect(() => {
    const loadPluggableSources = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch('/api/user/settings/api-config', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await safeJson(res);
        if (res.ok && data && Object.keys(data).length > 0) setApiConfig(data);
      } catch (error) {
        console.error('Failed to load agent model options:', error);
      }

      try {
        const res = await fetch('/api/skills', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await safeJson(res);
        if (res.ok && data?.success && Array.isArray(data.skills)) {
          const pluginIds = new Set(PLUGINS.map(plugin => plugin.id));
          const nextSkills = data.skills
            .filter((skill: any) => !pluginIds.has(skill.id))
            .filter((skill: any) => skill.isInstalled || skill.isSystem || String(skill.creatorId) === String(user?.id));
          setAvailableSkills(nextSkills);
        }
      } catch (error) {
        console.error('Failed to load agent skill options:', error);
      }
    };

    loadPluggableSources();
    window.addEventListener('skills-changed', loadPluggableSources);
    window.addEventListener('api-config-changed', loadPluggableSources as any);
    return () => {
      window.removeEventListener('skills-changed', loadPluggableSources);
      window.removeEventListener('api-config-changed', loadPluggableSources as any);
    };
  }, [user?.id]);

  useEffect(() => {
    setFormTextModel(prev => textModelOptions.some(option => option.value === prev) ? prev : getDefaultModel('text'));
    setFormImageModel(prev => imageModelOptions.some(option => option.value === prev) ? prev : getDefaultModel('image'));
    setFormVideoModel(prev => videoModelOptions.some(option => option.value === prev) ? prev : getDefaultModel('video'));
  }, [apiConfig]);

  const applyPreset = (preset: typeof AGENT_PRESETS[0]) => {
    setFormName(preset.name);
    setFormRole(preset.role);
    setFormDescription(preset.description);
    setFormInstruction(preset.systemInstruction);
    setFormCapabilities(preset.capabilityKinds);
    setFormSkillIds(preset.skillIds);
  };

  const startEdit = (agent: UserAgentDefinition) => {
    setIsEditing(agent.id);
    setEditingKind('user');
    setEditingSystemAgentId(null);
    setFormName(agent.name);
    setFormRole(agent.role);
    setFormInstruction(agent.systemInstruction);
    setFormDescription(agent.description || '');
    setFormCapabilities(agent.capabilityKinds || ['text']);
    setFormSkillIds(agent.skillIds || []);
    setFormTextModel(agent.modelPreferences?.text || getDefaultModel('text'));
    setFormImageModel(agent.modelPreferences?.image || getDefaultModel('image'));
    setFormVideoModel(agent.modelPreferences?.video || getDefaultModel('video'));
    setShowForm(true);
  };

  const startEditSystem = (agent: AgentDefinition) => {
    if (!isAdmin) return;

    const override = AgentRegistry.getSystemAgentOverride(agent.id);
    setIsEditing(override?.id || makeSystemAgentOverrideId(agent.id));
    setEditingKind('system');
    setEditingSystemAgentId(agent.id);
    setFormName(agent.name);
    setFormRole(agent.role);
    setFormInstruction(agent.systemInstruction || (agent.id === 'brainAgent' ? BRAIN_AGENT_SYSTEM_INSTRUCTION : ''));
    setFormDescription(agent.description || '');
    setFormCapabilities(agent.capabilityKinds?.length ? agent.capabilityKinds : ['workflow']);
    setFormSkillIds(agent.skillIds || agent.skills || []);
    setFormTextModel(agent.modelPreferences?.text || agent.modelPreference || getDefaultModel('text'));
    setFormImageModel(agent.modelPreferences?.image || getDefaultModel('image'));
    setFormVideoModel(agent.modelPreferences?.video || getDefaultModel('video'));
    setShowForm(true);
  };

  const handleToggleEnable = async (agent: UserAgentDefinition) => {
    try {
      const nextEnabled = agent.enabled === false;
      const storedAgents = await UserAgentStore.listUserAgents(user?.id);
      const updatedList = storedAgents.map(item => item.id === agent.id ? { ...item, enabled: nextEnabled, updatedAt: Date.now() } : item);
      await UserAgentStore.saveAllUserAgents(updatedList, user?.id);
      await refreshAgents(true);
      showToast(`「${agent.name}」已${nextEnabled ? '启用' : '禁用'}。`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Agent 状态保存失败。', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定删除「${name}」吗？删除后会移除它的独立 Agent 包。`)) return;
    try {
      await UserAgentStore.deleteUserAgent(id, user?.id);
      await refreshAgents(true);
      showToast(`「${name}」已删除。`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Agent 删除失败。', 'error');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = formName.trim();
    const role = formRole.trim();
    const instruction = formInstruction.trim();
    const isSystemEditing = editingKind === 'system';

    if (!name) return showToast('请输入 Agent 名称。', 'error');
    if (!role) return showToast('请输入 Agent 专业角色。', 'error');
    if (!instruction) return showToast('请输入 Agent 系统提示词。', 'error');
    if (formCapabilities.length === 0) return showToast('至少选择一种能力类型。', 'error');

    if (isSystemEditing) {
      if (!isAdmin) return showToast('只有管理员可以维护系统 Agent。', 'error');
      if (!editingSystemAgentId) return showToast('系统 Agent 目标丢失，请重新打开编辑。', 'error');

      try {
        const storedAgents = await UserAgentStore.listUserAgents(user?.id);
        const systemBase = systemAgents.find(agent => agent.id === editingSystemAgentId);
        const isSameSystemOverride = (agent: UserAgentDefinition) =>
          agent.metadata?.source === 'system-agent-override' &&
          agent.metadata?.systemAgentId === editingSystemAgentId;
        const current = storedAgents.find(isSameSystemOverride);
        const nextAgent: UserAgentDefinition = {
          id: isEditing || makeSystemAgentOverrideId(editingSystemAgentId),
          name,
          role,
          description: formDescription.trim(),
          icon: 'Bot',
          systemInstruction: instruction,
          capabilityKinds: formCapabilities,
          skillIds: formSkillIds,
          modelPreferences: {
            text: formTextModel,
            image: formImageModel,
            video: formVideoModel,
          },
          enabled: true,
          isCustom: true,
          createdAt: current?.createdAt || Date.now(),
          updatedAt: Date.now(),
          metadata: {
            ...(current?.metadata || {}),
            source: 'system-agent-override',
            systemAgentId: editingSystemAgentId,
            protected: true,
            packagePath: systemBase?.metadata?.packagePath,
          },
        };

        const nextList = storedAgents.some(isSameSystemOverride)
          ? storedAgents.map(agent => isSameSystemOverride(agent) ? nextAgent : agent)
          : [...storedAgents, nextAgent];

        await UserAgentStore.saveAllUserAgents(nextList, user?.id);
        await refreshAgents(true);
        showToast(`系统 Agent「${name}」已保存覆盖配置。`, 'success');
        resetForm();
        setShowForm(false);
      } catch (error: any) {
        showToast(error?.message || 'Agent 保存失败。', 'error');
      }
      return;
    }

    const duplicatedName = agents.some(agent =>
      agent.id !== isEditing && agent.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicatedName) return showToast('Agent 名称不能重复，否则用户会误认为它们是同一个。', 'error');

    const agentId = isEditing || makeAgentId(name);
    const current = agents.find(agent => agent.id === isEditing);
    const nextAgent: UserAgentDefinition = {
      id: agentId,
      name,
      role,
      description: formDescription.trim(),
      icon: 'Bot',
      systemInstruction: instruction,
      capabilityKinds: formCapabilities,
      skillIds: formSkillIds,
      modelPreferences: {
        text: formTextModel,
        image: formImageModel,
        video: formVideoModel,
      },
      enabled: current?.enabled ?? true,
      isCustom: true,
      createdAt: current?.createdAt || Date.now(),
      updatedAt: Date.now(),
      metadata: {
        source: 'user-agent',
      },
    };

    const nextList = isEditing
      ? agents.map(agent => agent.id === isEditing ? nextAgent : agent)
      : [...agents, nextAgent];

    try {
      const storedAgents = await UserAgentStore.listUserAgents(user?.id);
      const preservedSystemOverrides = storedAgents.filter(agent => agent.metadata?.source === 'system-agent-override');
      await UserAgentStore.saveAllUserAgents([...preservedSystemOverrides, ...nextList], user?.id);
      await refreshAgents(true);
      showToast(isEditing ? `「${name}」已保存。` : `「${name}」已创建并写入独立 Agent 包。`, 'success');
      resetForm();
      setShowForm(false);
    } catch (error: any) {
      showToast(error?.message || 'Agent 保存失败。', 'error');
    }
  };

  const getSkillInfo = (id: string) => {
    return availableSkills.find(skill => skill.id === id) || SYSTEM_SKILLS.find(skill => skill.id === id);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/40 p-8 custom-scrollbar">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-6 right-6 z-[9999] flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white shadow-xl ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="whitespace-pre-line">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <Bot className="h-6 w-6 text-indigo-500" />
              <span>用户自定义专业 Agent 系统</span>
            </h1>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Agent 是小逻大脑可调度的专业角色。系统大脑负责统筹，用户 Agent 以独立文件包保存，可创建、启用、禁用、编辑和移除。
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex cursor-pointer items-center gap-1.5 self-start rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>新建专业 Agent</span>
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">系统 Agent 包 ({systemAgents.length})</span>
            <span className="text-[10px] italic text-slate-400">系统包受保护，普通用户不能删除</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {systemAgents.map(agent => (
              <div key={agent.id} className="rounded-3xl border border-amber-200 bg-white p-6 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-black text-slate-900">{agent.name}</h2>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">SYSTEM</span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">{agent.role}</p>
                    </div>
                  </div>
                  <LockKeyhole className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-600">{agent.description}</p>
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-500">
                  {agent.metadata?.packagePath || 'components/agents/brainAgent.ts'}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2">
                  <span className="text-[11px] font-black text-amber-700">
                    {isAdmin ? '管理员可维护系统 Agent 包' : '系统内置 Agent，仅管理员可维护'}
                  </span>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => startEditSystem(agent)}
                      title="管理员可修改系统 Agent 的覆盖配置。"
                      className="flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-black text-amber-600 transition hover:border-amber-300 hover:bg-amber-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>修改</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      title="系统 Agent 受保护，仅管理员可维护。"
                      className="flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-black text-amber-600 opacity-70"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>受保护</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {showForm && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-md"
          >
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>{editingKind === 'system' ? '编辑系统 Agent 包' : isEditing ? '编辑用户 Agent 包' : '创建用户 Agent 包'}</span>
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!isEditing && (
              <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>快捷模板</span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {AGENT_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      <div className="text-xs font-black text-slate-800">{preset.name}</div>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Agent 名称">
                  <input value={formName} onChange={event => setFormName(event.target.value)} className={FIELD_INPUT_CLASS} placeholder="例如：商业短片导演" />
                </Field>
                <Field label="专业角色">
                  <input value={formRole} onChange={event => setFormRole(event.target.value)} className={FIELD_INPUT_CLASS} placeholder="例如：广告创意导演" />
                </Field>
              </div>

              <Field label="一句话描述">
                <input value={formDescription} onChange={event => setFormDescription(event.target.value)} className={FIELD_INPUT_CLASS} placeholder="说明这个 Agent 适合处理什么任务" />
              </Field>

              <Field label="系统提示词">
                <textarea
                  value={formInstruction}
                  onChange={event => setFormInstruction(event.target.value)}
                  rows={5}
                  className={`${FIELD_INPUT_CLASS} min-h-[140px] resize-y leading-relaxed`}
                  placeholder="写清楚这个 Agent 的身份、能力边界、输出格式和执行规范。"
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Field label="能力类型">
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {(['text', 'image', 'video', 'workflow'] as CapabilityKind[]).map(kind => {
                      const checked = formCapabilities.includes(kind);
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setFormCapabilities(checked ? formCapabilities.filter(item => item !== kind) : [...formCapabilities, kind])}
                          className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                            checked ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {CAPABILITY_LABELS[kind]}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="默认模型">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <ModelSelect label="文本" value={formTextModel} onChange={setFormTextModel} options={ensureOption(textModelOptions, formTextModel)} />
                    <ModelSelect label="图片" value={formImageModel} onChange={setFormImageModel} options={ensureOption(imageModelOptions, formImageModel)} />
                    <ModelSelect label="视频" value={formVideoModel} onChange={setFormVideoModel} options={ensureOption(videoModelOptions, formVideoModel)} />
                  </div>
                </Field>
              </div>

              <Field label="可调用的 Skill">
                <div className="grid max-h-[180px] grid-cols-1 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 custom-scrollbar md:grid-cols-3 lg:grid-cols-4">
                  {availableSkills.map(skill => {
                    const checked = formSkillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => setFormSkillIds(checked ? formSkillIds.filter(id => id !== skill.id) : [...formSkillIds, skill.id])}
                        className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition ${
                          checked ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="shrink-0">{skill.icon || <Cpu className="h-3.5 w-3.5" />}</span>
                        <span className="truncate">{cleanSkillName(skill)}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="rounded-xl px-5 py-2.5 text-xs font-black text-slate-500 transition hover:bg-slate-100"
                >
                  取消
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700">
                  {isEditing ? '保存修改' : '确认创建'}
                </button>
              </div>
            </form>
          </motion.section>
        )}

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">用户 Agent 包 ({agents.length})</span>
            <span className="text-[10px] italic text-slate-400">来自 extensions/agents/user-agents 独立包</span>
          </div>

          {agents.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-300">
                <Bot className="h-8 w-8" />
              </div>
              <p className="text-sm font-black text-slate-800">暂无自定义专业角色智能体</p>
              <p className="max-w-md text-xs leading-relaxed text-slate-400">
                点击上方“新建专业 Agent”，系统会为它生成独立 Agent 包，之后可被小逻大脑调度。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {agents.map(agent => (
                <div key={agent.id} className={`flex flex-col gap-4 rounded-3xl border bg-white p-6 shadow-xs ${agent.enabled === false ? 'border-slate-200 opacity-70' : 'border-indigo-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-black text-slate-900">{agent.name}</h3>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-indigo-600">USER</span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-500">{agent.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleEnable(agent)}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${agent.enabled === false ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}
                      title={agent.enabled === false ? '启用 Agent' : '禁用 Agent'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="min-h-[40px] text-xs leading-relaxed text-slate-600">{agent.description || '用户创建的专业 Agent。'}</p>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {agent.capabilityKinds.map(kind => (
                        <span key={kind} className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-slate-600 shadow-2xs">
                          {CAPABILITY_LABELS[kind] || kind}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                      {agent.modelPreferences?.text && <span>文本: {getModelLabel('text', agent.modelPreferences.text)}</span>}
                      {agent.modelPreferences?.image && <span>图片: {getModelLabel('image', agent.modelPreferences.image)}</span>}
                      {agent.modelPreferences?.video && <span>视频: {getModelLabel('video', agent.modelPreferences.video)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-500">
                    <FileJson className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{agent.metadata?.packagePath || `extensions/agents/user-agents/${user?.id || 'user'}/${agent.id}`}</span>
                  </div>

                  {agent.skillIds && agent.skillIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.skillIds.map(id => {
                        const skill = getSkillInfo(id);
                        return (
                          <span key={id} className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                            {cleanSkillName(skill || { id })}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-auto flex justify-end gap-2 border-t border-slate-100 pt-3">
                    <button onClick={() => startEdit(agent)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600">
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>编辑</span>
                    </button>
                    <button onClick={() => handleDelete(agent.id, agent.name)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ModelSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ModelOption[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-center text-[10px] font-black text-slate-400">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-700 outline-none">
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

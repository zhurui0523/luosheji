import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Zap, 
  AlertCircle, 
  Play, 
  Sparkles, 
  Bot, 
  Settings, 
  Layers, 
  Cpu, 
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import { AgentRegistry } from '../lib/os/registries/AgentRegistry';
import { UserAgentStore } from '../lib/os/agents/UserAgentStore';
import { SYSTEM_SKILLS } from '../skills/definitions';
import { UserAgentDefinition, CapabilityKind } from '../lib/os/types';

// Preset Agents for Quick Creation
const PRESET_AGENTS = [
  {
    name: '短视频爆款策划 Expert',
    role: '营销策划总监',
    systemInstruction: '你是一位精通流量密码、善于制造戏剧冲突与黄金3秒钩子（Hook）的短视频爆款策划大师。请对用户输入的段落进行爆款化改编：加入前置戏剧性钩子、规划节奏感强的快剪运镜，并输出高互动的口播脚本。',
    capabilityKinds: ['text'] as CapabilityKind[],
    skillIds: ['office-ad-script', 'office-brief-proposal'],
    textModel: 'gemini-3.5-flash',
    description: '专注于抖音、小红书等社交平台的爆款短视频文案策划。'
  },
  {
    name: '儿童绘本分镜 Creator',
    role: '绘本插画导演',
    systemInstruction: '你是一位资深儿童绘本分镜导演。善于站在儿童视角，以童真、温暖、色彩斑斓的视觉语言进行叙事。请为用户提供绘本的分镜脚本方案：包含角色丰富微表情、环境光影氛围，并附带用于生图的华丽英文提示词（采用马卡龙、童话插画风格，背景纯净）。',
    capabilityKinds: ['text', 'image'] as CapabilityKind[],
    skillIds: ['grid-storyboard', 'scene-plan'],
    textModel: 'gemini-3.5-flash',
    imageModel: 'gemini-3.1-flash-image-preview',
    description: '设计富有童真与故事情感张力的绘本连环画分镜与插画。'
  },
  {
    name: '品牌视觉创意总监',
    role: '创意美术总监 (Art Director)',
    systemInstruction: '你是一位顶级的品牌视觉DNA及创意美术总监。你拥有极高的美学品位，精通色彩心理学与光影构图。请协助用户：对故事大纲或品牌理念进行视觉DNA提取，生成核心主视觉（Key Visual）、配色方案、以及多场景、多模态的原画分镜绘图大纲。',
    capabilityKinds: ['text', 'image', 'video'] as CapabilityKind[],
    skillIds: ['dna-design', 'camera-control', 'asset-library'],
    textModel: 'gemini-3.5-flash',
    imageModel: 'gemini-3.1-flash-image-preview',
    videoModel: 'seedance2.0',
    description: '打造世界级美学的品牌主视觉、配色体系和动态宣传大片。'
  },
  {
    name: '游戏角色概念设定师',
    role: '高级原画概念设计师',
    systemInstruction: '你是一位资深游戏概念设计师。擅长创造个性鲜明、装备细节扎实、富有幻想感的游戏角色。请根据用户的需求，深度设计角色背景，提取种族与职业DNA，并生成极其专业的立绘及三视图绘制指令（Turnaround Character Sheet，含多重视角、面部特征还原，灰色纯净背景）。',
    capabilityKinds: ['text', 'image'] as CapabilityKind[],
    skillIds: ['six-view', 'asset-prompt'],
    textModel: 'gemini-3.5-flash',
    imageModel: 'gpt-image-2',
    description: '创作高还原度、转面细节丰富、幻想感拉满的游戏角色设定图。'
  }
];

export const UserAgentManager: React.FC<{ user?: any }> = ({ user }) => {
  const [agents, setAgents] = useState<UserAgentDefinition[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null); // Agent ID if editing
  const [showForm, setShowForm] = useState(false);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formInstruction, setFormInstruction] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCapabilities, setFormCapabilities] = useState<CapabilityKind[]>(['text']);
  const [formSkillIds, setFormSkillIds] = useState<string[]>([]);
  const [formTextModel, setFormTextModel] = useState('gemini-3.5-flash');
  const [formImageModel, setFormImageModel] = useState('gemini-3.1-flash-image-preview');
  const [formVideoModel, setFormVideoModel] = useState('seedance2.0');

  const [errorMess, setErrorMess] = useState<string | null>(null);
  const [successMess, setSuccessMess] = useState<string | null>(null);

  // Load user custom agents
  const refreshAgents = async () => {
    const userAgents = await UserAgentStore.listUserAgents(user?.id);
    AgentRegistry.loadUserAgents({ userAgents });
    const list = AgentRegistry.listUserAgents();
    setAgents(list);
  };

  useEffect(() => {
    refreshAgents();
  }, [user?.id]);

  // Show Toast / Banner message
  const triggerToast = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMess(msg);
      setTimeout(() => setSuccessMess(null), 3000);
    } else {
      setErrorMess(msg);
      setTimeout(() => setErrorMess(null), 3500);
    }
  };

  const handleToggleEnable = async (agent: UserAgentDefinition) => {
    const nextEnabled = agent.enabled === false ? true : false;
    const list = AgentRegistry.listUserAgents();
    const updatedList = list.map(a => {
      if (a.id === agent.id) {
        return { ...a, enabled: nextEnabled };
      }
      return a;
    });

    await UserAgentStore.saveAllUserAgents(updatedList, user?.id);
    await refreshAgents();
    triggerToast(`【${agent.name}】已${nextEnabled ? '上岗/启用' : '下岗/禁用'}`, 'success');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要永久删除/注销专业智能体【${name}】吗？`)) {
      return;
    }
    await UserAgentStore.deleteUserAgent(id, user?.id);
    await refreshAgents();
    triggerToast(`【${name}】已成功删除并注销`, 'success');
  };

  const applyPreset = (preset: typeof PRESET_AGENTS[0]) => {
    setFormName(preset.name);
    setFormRole(preset.role);
    setFormInstruction(preset.systemInstruction);
    setFormDescription(preset.description);
    setFormCapabilities(preset.capabilityKinds);
    setFormSkillIds(preset.skillIds);
    if (preset.textModel) setFormTextModel(preset.textModel);
    if (preset.imageModel) setFormImageModel(preset.imageModel);
    if (preset.videoModel) setFormVideoModel(preset.videoModel);
    triggerToast(`已成功载入【${preset.name}】预设模板！可按需微调。`, 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      triggerToast('请输入专业智能体名称', 'error');
      return;
    }
    if (!formRole.trim()) {
      triggerToast('请输入该智能体的专业角色/岗位', 'error');
      return;
    }
    if (!formInstruction.trim()) {
      triggerToast('请输入给智能体的系统提示词/核心设定', 'error');
      return;
    }
    if (formCapabilities.length === 0) {
      triggerToast('请至少选择一种能力范围（文案、生图、视频）', 'error');
      return;
    }

    // Generate Kebab-case stable ID
    const agentId = isEditing || `user-agent-${Date.now().toString().slice(-6)}-${formName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const newAgent: UserAgentDefinition = {
      id: agentId,
      name: formName.trim(),
      role: formRole.trim(),
      systemInstruction: formInstruction.trim(),
      description: formDescription.trim(),
      capabilityKinds: formCapabilities,
      skillIds: formSkillIds,
      modelPreferences: {
        text: formTextModel,
        image: formImageModel,
        video: formVideoModel
      },
      enabled: true,
      isCustom: true,
      createdAt: isEditing ? (agents.find(a => a.id === isEditing)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    const currentList = AgentRegistry.listUserAgents();
    let updatedList: UserAgentDefinition[] = [];
    if (isEditing) {
      updatedList = currentList.map(a => a.id === isEditing ? newAgent : a);
    } else {
      updatedList = [...currentList, newAgent];
    }

    // Save & Reload
    await UserAgentStore.saveAllUserAgents(updatedList, user?.id);
    await refreshAgents();

    triggerToast(isEditing ? `【${formName}】信息修改成功` : `专业智能体【${formName}】已正式上岗！`, 'success');

    // Reset Form
    setIsEditing(null);
    setShowForm(false);
    setFormName('');
    setFormRole('');
    setFormInstruction('');
    setFormDescription('');
    setFormCapabilities(['text']);
    setFormSkillIds([]);
    setFormTextModel('gemini-3.5-flash');
    setFormImageModel('gemini-3.1-flash-image-preview');
    setFormVideoModel('seedance2.0');
  };

  const startEdit = (agent: UserAgentDefinition) => {
    setIsEditing(agent.id);
    setFormName(agent.name);
    setFormRole(agent.role);
    setFormInstruction(agent.systemInstruction);
    setFormDescription(agent.description || '');
    setFormCapabilities(agent.capabilityKinds || ['text']);
    setFormSkillIds(agent.skillIds || []);
    setFormTextModel(agent.modelPreferences?.text || 'gemini-3.5-flash');
    setFormImageModel(agent.modelPreferences?.image || 'gemini-3.1-flash-image-preview');
    setFormVideoModel(agent.modelPreferences?.video || 'seedance2.0');
    setShowForm(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/40 h-full">
      {/* Toast notifications */}
      <AnimatePresence>
        {successMess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-emerald-500 text-white text-xs font-black px-5 py-3.5 rounded-2xl shadow-xl border border-emerald-400/25 flex items-center gap-2 z-[9999]"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMess}</span>
          </motion.div>
        )}
        {errorMess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-rose-500 text-white text-xs font-black px-5 py-3.5 rounded-2xl shadow-xl border border-rose-400/25 flex items-center gap-2 z-[9999]"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Bot className="w-6 h-6 text-indigo-500 animate-pulse" />
              <span>用户自定义专业 Agent 系统</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              自己创建具有特定身份、核心能力、专属 Skill、默认模型和提示词设定的专业角色，供小逻大脑（BrainAgent）进行跨节点任务指派。
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setIsEditing(null);
                setShowForm(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新建专业 Agent</span>
            </button>
          )}
        </div>

        {/* Form Overlay/Section */}
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-md flex flex-col gap-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>{isEditing ? '编辑专业智能体' : '设定新的专业角色智能体'}</span>
              </h2>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Block (Only show on Create mode) */}
            {!isEditing && (
              <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 px-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-extrabold uppercase text-indigo-500 tracking-wider">快捷模板导入</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
                  {PRESET_AGENTS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-left p-3 rounded-xl border border-slate-200/60 bg-white hover:border-indigo-400 hover:bg-indigo-50/10 transition-all flex flex-col gap-1 cursor-pointer group"
                    >
                      <span className="text-[11px] font-black text-slate-700 group-hover:text-indigo-600 truncate">{preset.name}</span>
                      <span className="text-[9.5px] text-slate-400 line-clamp-1">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">智能体角色名称</label>
                  <input
                    type="text"
                    required
                    placeholder="如：爆款视频爆款策划、儿童插画专家"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs h-10 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl px-3 outline-none transition-all text-slate-700 font-bold"
                  />
                </div>

                {/* Role */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">专业岗位标签 (Role)</label>
                  <input
                    type="text"
                    required
                    placeholder="如：营销文案总监、儿童视觉美术指导"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full text-xs h-10 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl px-3 outline-none transition-all text-slate-700 font-bold"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">一句话定位描述</label>
                <input
                  type="text"
                  placeholder="简单说明该专业智能体的定位（如：专注于高转化带货和微电影脚本）"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs h-10 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl px-3 outline-none transition-all text-slate-600"
                />
              </div>

              {/* System Instruction */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">系统设定提示词 (System Instruction)</label>
                <textarea
                  required
                  rows={4}
                  placeholder="详细设定该智能体的具体执行人设、掌握的技能、分析框架和输出规范。该提示词将在步骤执行时，作为最高系统级指令约束 LLM 的创作风范..."
                  value={formInstruction}
                  onChange={(e) => setFormInstruction(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl p-3 outline-none transition-all text-slate-700 font-medium leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Capability Range & Skills Integration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Capabilities checkboxes */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">能力适用范围 (Capability Kinds)</label>
                  <p className="text-[10px] text-slate-400 leading-none">勾选此智能体在哪些媒介类型的规划或执行中会被调度</p>
                  <div className="flex items-center gap-4 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    {['text', 'image', 'video'].map(kind => {
                      const isChecked = formCapabilities.includes(kind as any);
                      return (
                        <label key={kind} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setFormCapabilities(formCapabilities.filter(k => k !== kind));
                              } else {
                                setFormCapabilities([...formCapabilities, kind as any]);
                              }
                            }}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="capitalize">{kind === 'text' ? '📝 文本创作' : kind === 'image' ? '🎨 原画生图' : '🎥 视效视频'}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Model Preferences */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">核心模型偏好设定</label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                    {/* Text Model */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 text-center">文字模型</span>
                      <select
                        value={formTextModel}
                        onChange={(e) => setFormTextModel(e.target.value)}
                        className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg p-1.5 outline-none"
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      </select>
                    </div>

                    {/* Image Model */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 text-center">生图大模型</span>
                      <select
                        value={formImageModel}
                        onChange={(e) => setFormImageModel(e.target.value)}
                        className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg p-1.5 outline-none"
                      >
                        <option value="gemini-3.1-flash-image-preview">nano banana 2</option>
                        <option value="gpt-image-2">GPT-Image-2</option>
                      </select>
                    </div>

                    {/* Video Model */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 text-center">视效大模型</span>
                      <select
                        value={formVideoModel}
                        onChange={(e) => setFormVideoModel(e.target.value)}
                        className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg p-1.5 outline-none"
                      >
                        <option value="seedance2.0">RH-SD2.0</option>
                        <option value="seedance-mini">RH-SD2.0mini</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills integration */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">智能体可调用的底层特长技能 (Skills)</label>
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 max-h-[160px] overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {SYSTEM_SKILLS.filter(s => s.id !== 'perspective-sim' && s.id !== 'point-and-shoot').map(skill => {
                    const isChecked = formSkillIds.includes(skill.id);
                    return (
                      <label 
                        key={skill.id} 
                        className={`p-2.5 rounded-lg border text-[10.5px] font-bold flex items-center gap-2 cursor-pointer transition-all select-none ${
                          isChecked 
                            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-2xs' 
                            : 'bg-white border-slate-150 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setFormSkillIds(formSkillIds.filter(id => id !== skill.id));
                            } else {
                              setFormSkillIds([...formSkillIds, skill.id]);
                            }
                          }}
                          className="hidden"
                        />
                        <span className="text-sm">{skill.icon || '🧩'}</span>
                        <span className="truncate">{skill.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? '保存修改' : '确认上岗此 Agent'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Custom Agents List Area */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-150 pb-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">当前在岗角色 ({agents.length})</span>
            <span className="text-[10px] text-slate-400 italic">在岗 Agent 默认优先指派对应步骤节点</span>
          </div>

          {agents.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-150 shadow-2xs flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100">
                <Bot className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-700">暂无自定义专业角色智能体</p>
              <p className="text-xs text-slate-400 max-w-md">
                点击上方【新建专业 Agent】或者导入快捷模板，让您最得心应手的专业角色在小逻操作系统的流程规划与自动化中发挥威力！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <motion.div
                  key={agent.id}
                  layout
                  className={`bg-white rounded-3xl p-6 border transition-all flex flex-col gap-4 shadow-2xs ${
                    agent.enabled !== false 
                      ? 'border-indigo-100/80 shadow-xs shadow-indigo-50/10 hover:border-indigo-200' 
                      : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Title and actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                        agent.enabled !== false 
                          ? 'bg-indigo-50/60 border-indigo-100 text-indigo-600' 
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-800 truncate">{agent.name}</span>
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full font-black bg-indigo-100/50 text-indigo-700 uppercase shrink-0">CUSTOM</span>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 mt-0.5">{agent.role}</span>
                      </div>
                    </div>

                    {/* Enable/Disable Toggle Switch */}
                    <button
                      onClick={() => handleToggleEnable(agent)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        agent.enabled !== false ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          agent.enabled !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Positioning Decription */}
                  <p className="text-[10.5px] font-medium text-slate-500 leading-relaxed min-h-[32px] line-clamp-2">
                    {agent.description || '自定义开发的专业执行者角色。'}
                  </p>

                  {/* Meta Capabilities and Models */}
                  <div className="bg-slate-50/60 border border-slate-100/80 p-3 rounded-2xl flex flex-col gap-2">
                    {/* Media Capabilities list */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">能力范畴:</span>
                      {agent.capabilityKinds?.map(k => (
                        <span key={k} className="text-[8.5px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-extrabold capitalize shrink-0">
                          {k === 'text' ? '📝 文本' : k === 'image' ? '🎨 原生' : '🎥 视效'}
                        </span>
                      ))}
                    </div>

                    {/* Model references */}
                    {agent.modelPreferences && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-[9px] font-mono text-slate-400">
                        {agent.capabilityKinds?.includes('text') && agent.modelPreferences.text && (
                          <div className="flex items-center gap-0.5">
                            <span className="font-bold">📝</span>
                            <span className="font-extrabold text-slate-500">{agent.modelPreferences.text}</span>
                          </div>
                        )}
                        {agent.capabilityKinds?.includes('image') && agent.modelPreferences.image && (
                          <div className="flex items-center gap-0.5">
                            <span className="font-bold">🎨</span>
                            <span className="font-extrabold text-slate-500">
                              {agent.modelPreferences.image === 'gemini-3.1-flash-image-preview' ? 'nano banana 2' : agent.modelPreferences.image}
                            </span>
                          </div>
                        )}
                        {agent.capabilityKinds?.includes('video') && agent.modelPreferences.video && (
                          <div className="flex items-center gap-0.5">
                            <span className="font-bold">🎥</span>
                            <span className="font-extrabold text-slate-500">
                              {agent.modelPreferences.video === 'seedance2.0' ? 'RH-SD2.0' : agent.modelPreferences.video}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Skills tags */}
                  {agent.skillIds && agent.skillIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">擅长特长:</span>
                      {agent.skillIds.map(id => {
                        const skillName = SYSTEM_SKILLS.find(s => s.id === id)?.name || id;
                        const icon = SYSTEM_SKILLS.find(s => s.id === id)?.icon || '🧩';
                        return (
                          <span key={id} className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/30 flex items-center gap-1">
                            <span className="text-xs">{icon}</span>
                            <span>{skillName}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Card Footer Action */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-auto">
                    <button
                      onClick={() => startEdit(agent)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>配置设定</span>
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id, agent.name)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>注销下岗</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { 
  Search, 
  Plus, 
  Upload,
  Sparkles, 
  Bot, 
  Cpu, 
  Globe, 
  Lock, 
  User as UserIcon, 
  Trash2, 
  Edit2, 
  Check, 
  ArrowRight, 
  AlertTriangle,
  Settings
} from 'lucide-react';
import { AiSkill, CustomSkillOption } from '../skills/types';
import { SYSTEM_SKILLS } from '../skills/definitions';
import { WorkflowPage } from './WorkflowPage';
import { PluginPage } from './PluginPage';
import { GlobalApiConfigTab } from './GlobalApiConfigTab';
import { UserAgentManager } from './UserAgentManager';
import { safeJson } from '../lib/fetch';

interface SkillsPageProps {
  user: any;
  onUserUpdate?: () => void;
}

export const SkillsPage: React.FC<SkillsPageProps> = ({ user, onUserUpdate }) => {
  const [category, setCategory] = useState<'skill' | 'agent' | 'workflow' | 'ai-studio' | 'api'>('skill');
  const [customSkills, setCustomSkills] = useState<AiSkill[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'ai-studio' | 'explore' | 'create'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Current active loaded selected skill (stored in localstorage)
  const [activeSkillId, setActiveSkillId] = useState<string>(() => {
    return localStorage.getItem('selected_ai_skill') || 'general';
  });

  // Form states for Create/Edit
  const [isEditing, setIsEditing] = useState<string | null>(null); // contains skill id if editing
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('⚙️');
  const [formInstruction, setFormInstruction] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formCustomOptions, setFormCustomOptions] = useState<CustomSkillOption[]>([]);
  const [formCategory, setFormCategory] = useState<'text' | 'image' | 'video' | 'all'>('text');
  const [formEnableUpload, setFormEnableUpload] = useState(false);
  const [formUploadType, setFormUploadType] = useState<'all' | 'text' | 'image' | 'video'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'text' | 'image' | 'video'>('all');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMess, setErrorMessRaw] = useState('');
  const setErrorMess = (msg: string) => {
    if (msg === '技能未找到' || msg.includes('技能未找到')) {
      return;
    }
    setErrorMessRaw(msg);
  };
  const [successMess, setSuccessMess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [removedSystemSkillIds, setRemovedSystemSkillIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('removed_system_skills') || '[]');
    } catch {
      return [];
    }
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setActiveTab('create');
        setIsEditing(null);
        setFormName(file.name.replace(/\.md$/i, ''));
        setFormInstruction(content);
        setFormDesc('');
        setFormIcon('📝');
        setFormIsPublic(true);
        setFormCustomOptions([]);
        setFormCategory('text');
        setFormEnableUpload(false);
        setFormUploadType('all');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const EMOJI_OPTIONS = [
    '🧠', '✍️', '🎬', '📊', '🎨', '🚀', '🔬', '💡', '🔥', '⚙️', 
    '📝', '📅', '🛒', '🎙️', '🤖', '🎮', '🔋', '🌍', '❤️', '💼'
  ];

  const fetchSkills = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/skills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && data.success && Array.isArray(data.skills)) {
          setCustomSkills(data.skills);
        }
      }
    } catch (e) {
      console.error('Failed to fetch custom skills:', e);
    }
  };

  useEffect(() => {
    fetchSkills();

    const handleSkillChange = (e: any) => {
      if (e.detail && e.detail.skillId) {
        setActiveSkillId(e.detail.skillId);
      }
    };
    const handleGlobalSkillsChanged = () => {
      fetchSkills();
      try {
        setRemovedSystemSkillIds(JSON.parse(localStorage.getItem('removed_system_skills') || '[]'));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('selected-skill-changed', handleSkillChange);
    window.addEventListener('skills-changed', handleGlobalSkillsChanged);
    return () => {
      window.removeEventListener('selected-skill-changed', handleSkillChange);
      window.removeEventListener('skills-changed', handleGlobalSkillsChanged);
    };
  }, []);

  useEffect(() => {
    const pendingName = localStorage.getItem('pending_skill_preset_name');
    const pendingInstruction = localStorage.getItem('pending_skill_preset_instruction');
    const pendingDesc = localStorage.getItem('pending_skill_preset_desc');
    const pendingIcon = localStorage.getItem('pending_skill_preset_icon');

    if (pendingInstruction) {
      setActiveTab('create');
      setIsEditing(null);
      setFormInstruction(pendingInstruction);
      if (pendingName) setFormName(pendingName);
      if (pendingDesc) setFormDesc(pendingDesc);
      if (pendingIcon) setFormIcon(pendingIcon);

      localStorage.removeItem('pending_skill_preset_name');
      localStorage.removeItem('pending_skill_preset_instruction');
      localStorage.removeItem('pending_skill_preset_desc');
      localStorage.removeItem('pending_skill_preset_icon');
    }
  }, []);

  // Allow all users to access the API interface (which has read-only state for non-admins)

  useEffect(() => {
    setErrorMess('');
    setSuccessMess('');
  }, [activeTab]);

  useEffect(() => {
    if (successMess) {
      const timer = setTimeout(() => {
        setSuccessMess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMess]);

  useEffect(() => {
    if (errorMess) {
      const timer = setTimeout(() => {
        setErrorMess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMess]);

  const handleSelectSkill = (id: string) => {
    setActiveSkillId(id);
    localStorage.setItem('selected_ai_skill', id);
    window.dispatchEvent(new CustomEvent('selected-skill-changed', { detail: { skillId: id } }));
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMess('请填写技能名称');
      return;
    }
    if (!formInstruction.trim()) {
      setErrorMess('请填写核心系统提示词');
      return;
    }

    setLoading(true);
    setErrorMess('');
    setSuccessMess('');

    const token = localStorage.getItem('token');
    const url = isEditing ? `/api/skills/${isEditing}` : '/api/skills';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formName,
          desc: formDesc,
          icon: formIcon,
          instruction: formInstruction,
          isPublic: formIsPublic,
          customOptions: formCustomOptions,
          category: formCategory,
          enableUpload: formEnableUpload,
          uploadType: formUploadType
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMess(isEditing ? '技能修改成功！' : '技能创建并发布成功！');
        setFormName('');
        setFormDesc('');
        setFormIcon('⚙️');
        setFormInstruction('');
        setFormIsPublic(true);
        setFormCustomOptions([]);
        setFormCategory('text');
        setFormEnableUpload(false);
        setFormUploadType('all');
        setIsEditing(null);
        setActiveTab('my');
        fetchSkills();
        window.dispatchEvent(new CustomEvent('skills-changed'));
      } else {
        setErrorMess(data.error || '操作失败');
      }
    } catch (err: any) {
      setErrorMess('网络连接失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSkillFill = (skill: AiSkill) => {
    setIsEditing(skill.id);
    setFormName(skill.name);
    setFormDesc(skill.desc);
    setFormIcon(skill.icon);
    setFormInstruction(skill.instruction);
    setFormIsPublic(skill.isPublic !== false);
    setFormCustomOptions(skill.customOptions || []);
    setFormCategory(skill.category || 'text');
    setFormEnableUpload(!!skill.enableUpload);
    setFormUploadType(skill.uploadType || 'all');
    setActiveTab('create');
  };

  const handleDeleteSkill = async (id: string) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMess('技能删除成功');
        fetchSkills();
        window.dispatchEvent(new CustomEvent('skills-changed'));
        if (activeSkillId === id) {
          handleSelectSkill('general');
        }
      } else {
        setErrorMess(data.error || '删除失败');
      }
    } catch (err: any) {
      setErrorMess('网络错误: ' + err.message);
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleInstallation = async (skillId: string, isInstalled: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const url = `/api/skills/${skillId}/${isInstalled ? 'uninstall' : 'install'}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSkills();
        window.dispatchEvent(new CustomEvent('skills-changed'));
      }
    } catch (err) {
      console.error('Err toggling installation:', err);
    }
  };

  const baseList = customSkills.length > 0 ? customSkills : SYSTEM_SKILLS;

  const mySkillsList = baseList.filter(skill => {
    if (removedSystemSkillIds.includes(skill.id)) {
      return false;
    }
    if (filterCategory !== 'all' && skill.category !== 'all' && (skill.category || 'text') !== filterCategory) {
      return false;
    }
    // Contains "我创建的" (creatorId matches user id) AND "我正在使用的" (isInstalled)
    const isMine = String(skill.creatorId) === String(user?.id);
    const isUsing = skill.isInstalled;
    
    if (!isMine && !isUsing) {
      return false;
    }
    
    if (skill.id === 'perspective-sim' || skill.id === 'point-and-shoot') {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return skill.name.toLowerCase().includes(q) || skill.desc.toLowerCase().includes(q);
  });

  const exploreList = customSkills.filter(s => {
    if (s.isSystem && !removedSystemSkillIds.includes(s.id)) {
      return false;
    }
    if (filterCategory !== 'all' && s.category !== 'all' && (s.category || 'text') !== filterCategory) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    const isMatched = s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
    return isMatched;
  });

  return (
    <div className="h-full w-full bg-[#fcfcfd] flex flex-col overflow-hidden font-sans">
      {/* Upper header section */}
      <div className="bg-white border-b border-gray-150 px-8 py-5 shrink-0 shadow-2xs flex flex-col gap-5">
        {/* Row 1: Category selection and title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-1.5 bg-slate-100/75 p-1 rounded-2xl border border-slate-200/20 w-fit shrink-0 relative">
            <button
              onClick={() => setCategory('skill')}
              className={`relative px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center space-x-2 cursor-pointer z-10 ${
                category === 'skill'
                  ? 'text-indigo-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {category === 'skill' && (
                <motion.div
                  layoutId="activeCategoryBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Cpu className={`w-4 h-4 relative z-10 transition-transform duration-300 ${category === 'skill' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
              <span className="relative z-10 tracking-wider">SKILL</span>
            </button>

            <button
              onClick={() => setCategory('agent')}
              className={`relative px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center space-x-2 cursor-pointer z-10 ${
                category === 'agent'
                  ? 'text-indigo-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {category === 'agent' && (
                <motion.div
                  layoutId="activeCategoryBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <UserIcon className={`w-4 h-4 relative z-10 transition-transform duration-300 ${category === 'agent' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
              <span className="relative z-10 tracking-wider">AGENT</span>
            </button>

            <button
              onClick={() => {
                setCategory('workflow');
              }}
              className={`relative px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center space-x-2 cursor-pointer z-10 ${
                category === 'workflow'
                  ? 'text-indigo-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {category === 'workflow' && (
                <motion.div
                  layoutId="activeCategoryBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Bot className={`w-4 h-4 relative z-10 transition-transform duration-300 ${category === 'workflow' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
              <span className="relative z-10 tracking-wider">WORKFLOW</span>
            </button>

            <button
              onClick={() => {
                setCategory('ai-studio');
              }}
              className={`relative px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center space-x-2 cursor-pointer z-10 ${
                category === 'ai-studio'
                  ? 'text-indigo-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {category === 'ai-studio' && (
                <motion.div
                  layoutId="activeCategoryBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Sparkles className={`w-4 h-4 relative z-10 transition-transform duration-300 ${category === 'ai-studio' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
              <span className="relative z-10 tracking-wider">plugin</span>
            </button>

            <button
              onClick={() => {
                setCategory('api');
              }}
              className={`relative px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center space-x-2 cursor-pointer z-10 ${
                category === 'api'
                  ? 'text-indigo-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {category === 'api' && (
                <motion.div
                  layoutId="activeCategoryBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Settings className={`w-4 h-4 relative z-10 transition-transform duration-300 ${category === 'api' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
              <span className="relative z-10 tracking-wider">模型接口</span>
            </button>


          </div>
        </div>
        
        {/* Row 2: Secondary sub-tabs and search bar (for Skill tab only) */}
        {category === 'skill' && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-t border-slate-100 pt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center space-x-1 bg-slate-50/50 p-1 rounded-2xl border border-slate-200/10 w-full sm:w-auto overflow-x-auto shrink-0 relative">
                <button
                  onClick={() => { setActiveTab('my'); setIsEditing(null); }}
                  className={`group relative px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer flex items-center space-x-2 shrink-0 z-10 ${
                    activeTab === 'my' 
                      ? 'text-indigo-600 font-extrabold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {activeTab === 'my' && (
                    <motion.div
                      layoutId="activeSubTabBg"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100/80"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Check className={`w-4 h-4 relative z-10 transition-transform duration-300 ${activeTab === 'my' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
                  <span className="relative z-10">我的Skill</span>
                  <span className={`relative z-10 ml-1.5 px-2 py-0.5 text-[10px] font-black rounded-full transition-colors ${
                    activeTab === 'my' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-200/70 text-slate-600 group-hover:bg-slate-300/80'
                  }`}>
                    {mySkillsList.length}
                  </span>
                </button>

                <button
                  onClick={() => { setActiveTab('explore'); setIsEditing(null); }}
                  className={`group relative px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer flex items-center space-x-2 shrink-0 z-10 ${
                    activeTab === 'explore' 
                      ? 'text-indigo-600 font-extrabold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {activeTab === 'explore' && (
                    <motion.div
                      layoutId="activeSubTabBg"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100/80"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Globe className={`w-4 h-4 relative z-10 transition-transform duration-300 ${activeTab === 'explore' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
                  <span className="relative z-10">Skill商城</span>
                  <span className={`relative z-10 ml-1.5 px-2 py-0.5 text-[10px] font-black rounded-full transition-colors ${
                    activeTab === 'explore' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-200/70 text-slate-600 group-hover:bg-slate-300/80'
                  }`}>
                    {exploreList.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('create');
                    if (!isEditing) {
                      setFormName('');
                      setFormDesc('');
                      setFormIcon('⚙️');
                      setFormInstruction('');
                      setFormIsPublic(true);
                      setFormCustomOptions([]);
                      setFormCategory('text');
                      setFormEnableUpload(false);
                      setFormUploadType('all');
                    }
                  }}
                  className={`group relative px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer flex items-center space-x-2 shrink-0 z-10 ${
                    activeTab === 'create' 
                      ? 'text-indigo-600 font-extrabold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {activeTab === 'create' && (
                    <motion.div
                      layoutId="activeSubTabBg"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-100/80"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Plus className={`w-4 h-4 relative z-10 transition-transform duration-300 ${activeTab === 'create' ? 'scale-110 text-indigo-600' : 'text-slate-400'}`} />
                  <span className="relative z-10">{isEditing ? '修改自定义技能' : '创建Skill'}</span>
                </button>

                <input
                  type="file"
                  accept=".md"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer flex items-center space-x-2 shrink-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                >
                  <Upload className="w-4 h-4 relative z-10 transition-transform duration-300 text-slate-400 group-hover:text-slate-600" />
                  <span className="relative z-10">上传.md</span>
                </button>
              </div>
            </div>

            {activeTab !== 'create' && (
              <div className="relative flex items-center w-full sm:w-64 md:w-72 shrink-0 group">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 transition-colors group-focus-within:text-indigo-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="在当前标签页下搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/40 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none rounded-xl transition-all shadow-2xs"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Subbar for Filtering & Feedback */}
      {category === 'skill' && (errorMess || successMess) && (
        <div className="px-8 py-3.5 bg-gray-50/50 border-b border-gray-100/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
          <div>
            {errorMess && (
              <div className="text-red-600 text-xs font-semibold flex items-center bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-100/50">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-ping" />
                {errorMess}
              </div>
            )}
            {successMess && (
              <div className="text-emerald-600 text-xs font-semibold flex items-center bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-100/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-ping" />
                {successMess}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 overflow-hidden">
        {category === 'skill' && (
          <div className="h-full overflow-y-auto p-8">
            {(activeTab === 'my' || activeTab === 'explore') && (
              <div className="flex items-center space-x-2 mb-6 bg-slate-100/50 p-1 rounded-xl border border-slate-200/20 w-fit">
                {[
                  { value: 'all', label: '🌐 全部场景' },
                  { value: 'text', label: '✍️ 文本场景' },
                  { value: 'image', label: '🎨 图片场景' },
                  { value: 'video', label: '🎬 视频场景' }
                ].map((item) => {
                  const isSelected = filterCategory === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setFilterCategory(item.value as any)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        isSelected 
                          ? "bg-white text-indigo-650 shadow-2xs border border-gray-100" 
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'my' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {mySkillsList.map((skill) => (
                  <div 
                    key={skill.id}
                    className="p-5 bg-white border border-gray-100 rounded-2xl shadow-xs transition-all flex flex-col justify-between hover:shadow-md hover:translate-y-[-2px]"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="truncate">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center flex-wrap gap-1.5">
                            <span>{skill.name}</span>
                            {skill.isSystem && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100/55 rounded-md shrink-0">
                                官方默认
                              </span>
                            )}
                            {String(skill.creatorId) === String(user?.id) && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/55 rounded-md shrink-0">
                                我创建的
                              </span>
                            )}
                            {skill.category === 'image' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100/55 rounded-md shrink-0">
                                图片场景
                              </span>
                            ) : skill.category === 'video' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100/55 rounded-md shrink-0">
                                视频场景
                              </span>
                            ) : skill.category === 'all' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-100/55 rounded-md shrink-0">
                                文本、图片、视频
                              </span>
                            ) : (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100/55 rounded-md shrink-0">
                                文本场景
                              </span>
                            )}
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                            <UserIcon className="w-3 h-3 mr-1 text-gray-300" />
                            {skill.isSystem ? '朱睿 开发团队' : `${skill.creatorName || '团队自制'}`}
                          </p>
                        </div>
                        
                        {(!skill.isSystem || user?.role === 'admin') && (
                          <div className="flex items-center space-x-1.5">
                            {(String(skill.creatorId) === String(user?.id) || user?.role === 'admin') && (
                              <>
                                <button
                                  onClick={() => handleEditSkillFill(skill)}
                                  className="p-2 hover:bg-gray-100 text-gray-400 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                  title="修改技能"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(skill.id)}
                                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                                  title="卸载技能"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[12px] text-gray-600 mt-4 leading-relaxed bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100/40 min-h-[64px] block">
                        {skill.desc || '暂无描述。'}
                      </p>

                      {skill.customOptions && skill.customOptions.length > 0 ? (
                        <div className="mt-3 p-3 bg-indigo-50/30 rounded-2xl border border-indigo-100/30 space-y-1.5">
                          <div className="text-[10px] font-bold text-indigo-600 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            <span>🧩 专属配置选项 (动态注入参数)</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {skill.customOptions.map((opt) => (
                              <span key={opt.id} className="text-[9px] font-medium px-2 py-0.5 bg-white text-gray-600 border border-gray-100 rounded-lg shadow-2xs" title={opt.choices.join(', ')}>
                                {opt.name}: <span className="text-indigo-600 font-bold">{opt.choices.length} 项选择</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-1 text-slate-400 select-none">
                          <span className="text-[10px]">⚙️ 标准通用模式（无额外参数）</span>
                        </div>
                      )}

                      {skill.enableUpload && (
                        <div className="mt-2.5 p-2 bg-emerald-50/40 border border-emerald-100/60 rounded-xl flex items-center justify-between text-[10px] text-emerald-700 font-bold">
                          <span className="flex items-center">
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            <span>支持自定义文件上传</span>
                          </span>
                          <span className="px-1.5 py-0.5 bg-white border border-emerald-150 rounded-lg text-[9px] text-emerald-600 font-black">
                            {skill.uploadType === 'all' && '全部类型'}
                            {skill.uploadType === 'text' && '仅文本'}
                            {skill.uploadType === 'image' && '仅图片'}
                            {skill.uploadType === 'video' && '仅视频'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 mt-5 pt-3.5">
                      <span className="text-[10px] text-gray-400 flex items-center font-semibold">
                        {skill.isPublic ? <Globe className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 mr-1 text-gray-400" />}
                        {skill.isPublic ? '公开共享中' : '仅自己可见'}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (skill.isSystem) {
                              const updated = [...removedSystemSkillIds, skill.id];
                              setRemovedSystemSkillIds(updated);
                              localStorage.setItem('removed_system_skills', JSON.stringify(updated));
                              window.dispatchEvent(new CustomEvent('skills-changed'));
                              if (activeSkillId === skill.id) {
                                handleSelectSkill('general');
                              }
                            } else {
                              handleToggleInstallation(skill.id, true);
                            }
                          }}
                          className="px-3 py-1.5 text-[11px] text-red-500 hover:text-red-700 font-bold hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        >
                          移除
                        </button>
                        <button
                          onClick={() => {
                            if (activeSkillId !== skill.id) handleSelectSkill(skill.id);
                          }}
                          className="px-4 py-1.5 text-[11px] font-bold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100/55 cursor-default flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>已添加</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {mySkillsList.length === 0 && (
                  <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-3xl">
                    <Bot className="w-14 h-14 text-gray-300 mx-auto stroke-1" />
                    <p className="text-sm text-gray-400 mt-4 font-medium">没有找到匹配的专属有效技能，请创建一个！</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'explore' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {exploreList.map((skill) => {
                  const isInstalled = skill.isSystem 
                    ? !removedSystemSkillIds.includes(skill.id)
                    : customSkills.some(s => s.id === skill.id && s.isInstalled);
                  return (
                    <div 
                      key={skill.id}
                      className={`p-5 bg-white border rounded-2xl shadow-xs transition-all flex flex-col justify-between hover:shadow-md hover:translate-y-[-2px] ${
                        isInstalled ? 'border-emerald-100/60 bg-emerald-50/5' : 'border-gray-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="truncate">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center flex-wrap gap-1.5">
                              <span>{skill.name}</span>
                              {skill.category === 'image' ? (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100/55 rounded-md shrink-0">
                                  图片场景
                                </span>
                              ) : skill.category === 'video' ? (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100/55 rounded-md shrink-0">
                                  视频场景
                                </span>
                              ) : skill.category === 'all' ? (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-100/55 rounded-md shrink-0">
                                  文本、图片、视频
                                </span>
                              ) : (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100/55 rounded-md shrink-0">
                                  文本场景
                                </span>
                              )}
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                              <UserIcon className="w-3 h-3 mr-1 text-gray-300" />
                              {skill.creatorName || '社区原创'} {String(skill.creatorId) === String(user?.id) && '(我)'}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-1.5">
                            {(String(skill.creatorId) === String(user?.id) || user?.role === 'admin') && (
                              <>
                                <button
                                  onClick={() => handleEditSkillFill(skill)}
                                  className="p-2 hover:bg-gray-100 text-gray-400 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                  title="联合编辑该技能"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(skill.id)}
                                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                                  title="删除该技能"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-[12px] text-gray-600 mt-4 leading-relaxed bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100/40 min-h-[64px] block">
                          {skill.desc || '创建者未添加描述。'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-50 mt-5 pt-3.5">
                        <span className="text-[10px] text-gray-400 flex items-center font-semibold">
                          <Globe className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                          全员共享中
                        </span>

                        <button
                          onClick={() => {
                            if (skill.isSystem) {
                              if (isInstalled) {
                                const updated = [...removedSystemSkillIds, skill.id];
                                setRemovedSystemSkillIds(updated);
                                localStorage.setItem('removed_system_skills', JSON.stringify(updated));
                                window.dispatchEvent(new CustomEvent('skills-changed'));
                              } else {
                                const updated = removedSystemSkillIds.filter(id => id !== skill.id);
                                setRemovedSystemSkillIds(updated);
                                localStorage.setItem('removed_system_skills', JSON.stringify(updated));
                                window.dispatchEvent(new CustomEvent('skills-changed'));
                              }
                            } else {
                              handleToggleInstallation(skill.id, !!isInstalled);
                            }
                          }}
                          className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
                            isInstalled
                              ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-150'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          }`}
                        >
                          {isInstalled ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-0.5" />
                              <span>已添加</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 mr-0.5" />
                              <span>添加</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {exploreList.length === 0 && (
                  <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-3xl">
                    <Globe className="w-14 h-14 text-gray-300 mx-auto stroke-1" />
                    <p className="text-sm text-gray-400 mt-4 font-medium">社区市场中暂无其他公共技能。去建立首个技能服务大家吧！</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'create' && (
              <div className="max-w-3xl mx-auto">
                <form onSubmit={handleCreateOrUpdate} className="bg-white p-8 border border-gray-100 rounded-3xl shadow-xs space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Sparkles className="w-5 h-5 text-indigo-500 mr-2.5 shrink-0 animate-pulse" />
                    {isEditing ? '修改技能参数 (全员联动机能)' : '构建专属 AI 提示词技能'}
                  </h3>

                  <div className="flex gap-4">
                    <div className="w-24 shrink-0">
                      <label className="block text-xs font-bold text-gray-700 mb-2">表情徽标</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                          className={`w-full flex items-center justify-center text-xl h-[46px] bg-gray-50 border rounded-xl cursor-pointer transition-all duration-200 outline-none ${
                            isEmojiPickerOpen 
                              ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-white shadow-xs' 
                              : 'border-gray-100 hover:border-gray-300 hover:bg-gray-100/50'
                          }`}
                        >
                          {formIcon}
                        </button>

                        <AnimatePresence>
                          {isEmojiPickerOpen && (
                            <>
                              {/* Backdrop to close the picker */}
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsEmojiPickerOpen(false)} 
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute left-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl p-2.5 z-50 grid grid-cols-5 gap-1"
                              >
                                {EMOJI_OPTIONS.map(em => (
                                  <button
                                    key={em}
                                    type="button"
                                    onClick={() => {
                                      setFormIcon(em);
                                      setIsEmojiPickerOpen(false);
                                    }}
                                    className={`w-9 h-9 flex items-center justify-center text-lg rounded-lg transition-all duration-150 ${
                                      formIcon === em 
                                        ? 'bg-indigo-50 border border-indigo-200 scale-105 shadow-2xs font-bold' 
                                        : 'hover:bg-gray-50 border border-transparent hover:scale-105 active:scale-95'
                                    }`}
                                  >
                                    {em}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-2">技能名称 <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        required
                        placeholder="例如: 小红书网感爆破手、文案精修大师"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full text-xs py-3 px-4 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2.5">使用场景类型 <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                      {[
                        { value: 'text', label: '✍️ 文本场景', desc: '适用于 灵境文造' },
                        { value: 'image', label: '🎨 图片场景', desc: '适用于 灵境生图' },
                        { value: 'video', label: '🎬 视频场景', desc: '适用于 灵境视频' },
                        { value: 'all', label: '🌐 文本、图片、视频', desc: '全场景联动通用' },
                      ].map((item) => {
                        const isSelected = formCategory === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setFormCategory(item.value as any)}
                            className={cn(
                              "p-3 rounded-2xl text-left border cursor-pointer transition-all flex flex-col justify-between h-20 relative overflow-hidden",
                              isSelected 
                                ? "bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-500/10 text-indigo-900" 
                                : "bg-gray-50 border-gray-150 text-gray-700 hover:bg-gray-100/50"
                            )}
                          >
                            <span className="text-xs font-bold">{item.label}</span>
                            <span className={cn("text-[9px] block mt-1", isSelected ? "text-indigo-500 font-medium" : "text-gray-400")}>
                              {item.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">简短说明 (一句话介绍)</label>
                    <textarea 
                      rows={2}
                      placeholder="例如: 智能生成爆款网感标题，策划核心视觉大纲，配置极高转化率的排版样式。"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full text-xs py-3.5 px-4 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl resize-none leading-relaxed outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                      <span>核心系统提示词 (System Prompt Instructions) <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-gray-400 font-normal">指定大模型遵守的背景设定、输出标准和专业规范</span>
                    </label>
                    <textarea 
                      required
                      rows={7}
                      placeholder={`你是一位资深的高端策划师...`}
                      value={formInstruction}
                      onChange={(e) => setFormInstruction(e.target.value)}
                      className="w-full text-xs py-3.5 px-4 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl font-mono leading-relaxed outline-none transition-all"
                    />
                  </div>

                  {/* 是否具备上传功能 (Upload support option) */}
                  <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">是否具备上传功能</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          开启此功能后，使用该技能时可以上传自定义文件或素材
                        </span>
                      </div>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setFormEnableUpload(!formEnableUpload)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            formEnableUpload ? "bg-indigo-650" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              formEnableUpload ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {formEnableUpload && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-gray-200/50 pt-3"
                        >
                          <label className="block text-xs font-bold text-gray-700 mb-2">上传文件类型 (二级选项)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { value: 'all', label: '全部类型' },
                              { value: 'text', label: '文本' },
                              { value: 'image', label: '图片' },
                              { value: 'video', label: '视频' }
                            ].map((type) => {
                              const isSelected = formUploadType === type.value;
                              return (
                                <button
                                  key={type.value}
                                  type="button"
                                  onClick={() => setFormUploadType(type.value as any)}
                                  className={cn(
                                    "px-3 py-2 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer",
                                    isSelected
                                      ? "bg-white text-indigo-600 border-indigo-200 shadow-2xs"
                                      : "bg-gray-50 border-gray-150 text-gray-500 hover:bg-gray-100/50"
                                  )}
                                >
                                  {type.label}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="p-4 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl">
                    <h4 className="text-xs font-bold text-indigo-900 mb-1 flex items-center space-x-1.5">
                      <span>⚙️</span>
                      <span>参数下拉联动配置 (选填)</span>
                    </h4>
                    <p className="text-[10px] text-indigo-400 leading-relaxed mb-4">
                      为此技能定制特定的下拉配置项（例如：“一级选项”、“二级选项”等），添加后可在工作流节点中动态选择其值。
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        const newOpt: CustomSkillOption = {
                          id: 'opt_' + Date.now(),
                          name: '自定义参数项',
                          choices: ['选项A', '选项B']
                        };
                        setFormCustomOptions([...formCustomOptions, newOpt]);
                      }}
                      className="px-4 py-2 text-xs font-bold text-indigo-600 bg-white border border-indigo-200/60 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer flex items-center"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      添加下拉配置组
                    </button>

                    {formCustomOptions.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {formCustomOptions.map((opt, idx) => (
                          <div key={opt.id} className="p-3 bg-white border border-gray-100 rounded-xl flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <input 
                                type="text"
                                className="w-full text-xs h-9 bg-gray-50 border border-gray-100 rounded-lg px-3 outline-none focus:bg-white"
                                placeholder="参数显示名字 (如: 配乐风格)"
                                value={opt.name}
                                onChange={(e) => {
                                  const updated = [...formCustomOptions];
                                  updated[idx].name = e.target.value;
                                  setFormCustomOptions(updated);
                                }}
                              />
                            </div>
                            <div className="flex-2 flex items-center gap-2">
                              <input 
                                type="text"
                                className="flex-1 text-xs h-9 bg-gray-50 border border-gray-100 rounded-lg px-3 outline-none focus:bg-white"
                                placeholder="候选值(逗号隔开，如: 震撼, 欢快, 悬疑)"
                                value={opt.choices.join(', ')}
                                onChange={(e) => {
                                  const updated = [...formCustomOptions];
                                  updated[idx].choices = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                  setFormCustomOptions(updated);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setFormCustomOptions(formCustomOptions.filter((_, i) => i !== idx));
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-gray-50">
                    <div className="flex items-center space-x-4 bg-gray-50/80 p-3 px-4 rounded-2xl border border-gray-100/50">
                      <div>
                        <span className="text-xs font-bold text-gray-850 block">发布属性</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5 max-w-[280px] sm:max-w-[340px]">
                          {formIsPublic ? '共享就分享到了 SKILL商城中，所有人都可以使用' : '私有，就只能自己使用'}
                        </span>
                      </div>
                      <select
                        value={formIsPublic ? 'public' : 'private'}
                        onChange={(e) => setFormIsPublic(e.target.value === 'public')}
                        className="text-xs font-bold py-2 px-3 bg-white border border-gray-200 focus:ring-1 focus:ring-indigo-500 rounded-xl cursor-pointer text-gray-700 outline-none shadow-xs hover:border-gray-300 transition-all"
                      >
                        <option value="public">🌍 共享</option>
                        <option value="private">🔐 私有</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-3 justify-end">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(null);
                            setFormName('');
                            setFormDesc('');
                            setFormIcon('⚙️');
                            setFormInstruction('');
                            setFormIsPublic(true);
                            setFormCustomOptions([]);
                            setFormCategory('text');
                            setFormEnableUpload(false);
                            setFormUploadType('all');
                            setActiveTab('my');
                          }}
                          className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-150 rounded-xl transition-all cursor-pointer"
                        >
                          取消修改
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
                      >
                        {isEditing ? '保存修改' : '确认并发布新技能'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {category === 'agent' && (
          <UserAgentManager user={user} />
        )}

        {category === 'workflow' && (
          <WorkflowPage user={user} />
        )}

        {category === 'ai-studio' && (
          <PluginPage user={user} />
        )}

        {category === 'api' && (
          <GlobalApiConfigTab onUserUpdate={onUserUpdate} />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">确认删除该技能吗？</h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  您确定要永久删除此技能吗？此操作不可逆，将无法恢复。
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4.5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSkill(deleteConfirmId)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-100 transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

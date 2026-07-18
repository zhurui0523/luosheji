import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Sparkles, 
  Bot, 
  Cpu, 
  Globe, 
  Lock, 
  User, 
  Trash2, 
  Edit2, 
  Check, 
  Bookmark,
  ChevronRight,
  Code,
  ArrowRight,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AI_SKILLS, AiSkill, CustomSkillOption } from '../skills';
import { PLUGINS } from '../plugin';

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customSkills: AiSkill[];
  onRefresh: () => void;
  currentUser: any;
  activeSkillId: string;
  onSelectSkill: (id: string) => void;
}

const PLUGIN_ID_SET = new Set(PLUGINS.map(plugin => plugin.id));

export const SkillsModal: React.FC<SkillsModalProps> = ({
  isOpen,
  onClose,
  customSkills,
  onRefresh,
  currentUser,
  activeSkillId,
  onSelectSkill
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'ai-studio' | 'explore' | 'create'>('my');
  const [searchQuery, setSearchQuery] = useState('');

  const [removedSystemSkillIds, setRemovedSystemSkillIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('removed_system_skills') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleGlobalSkillsChanged = () => {
      try {
        setRemovedSystemSkillIds(JSON.parse(localStorage.getItem('removed_system_skills') || '[]'));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('skills-changed', handleGlobalSkillsChanged);
    return () => {
      window.removeEventListener('skills-changed', handleGlobalSkillsChanged);
    };
  }, []);
  
  // Form states for Create/Edit
  const [isEditing, setIsEditing] = useState<string | null>(null); // contains skill id if editing
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('⚙️');
  const [formInstruction, setFormInstruction] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formTier, setFormTier] = useState<'light' | 'heavy'>('light');
  const [formCustomOptions, setFormCustomOptions] = useState<CustomSkillOption[]>([]);
  const [formEnableUpload, setFormEnableUpload] = useState(false);
  const [formUploadType, setFormUploadType] = useState<'all' | 'text' | 'image' | 'video'>('all');

  const [loading, setLoading] = useState(false);
  const [errorMess, setErrorMessRaw] = useState('');
  const setErrorMess = (msg: string) => {
    if (msg === '技能未找到' || msg.includes('技能未找到')) {
      return;
    }
    setErrorMessRaw(msg);
  };
  const [successMess, setSuccessMess] = useState('');

  // Built-in pre-coded skills for general default showcase
  const defaultShowcaseSystemSkills: AiSkill[] = AI_SKILLS.filter(skill => !PLUGIN_ID_SET.has(skill.id));

  useEffect(() => {
    if (isOpen) {
      setErrorMess('');
      setSuccessMess('');
    }
  }, [isOpen, activeTab]);

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

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formInstruction.trim()) {
      setErrorMess('请填写必填字段（技能名称 & 系统 Prompt 设定）');
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
          tier: formTier,
          customOptions: formCustomOptions,
          enableUpload: formEnableUpload,
          uploadType: formUploadType
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMess(isEditing ? '技能更新成功！' : 'AI专属技能创建并激活成功！');
        onRefresh();
        
        // Reset states
        setTimeout(() => {
          setFormName('');
          setFormDesc('');
          setFormIcon('⚙️');
          setFormInstruction('');
          setFormIsPublic(true);
          setFormTier('light');
          setFormCustomOptions([]);
          setFormEnableUpload(false);
          setFormUploadType('all');
          setIsEditing(null);
          setActiveTab('my');
        }, 1200);
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
    setFormTier(skill.tier || 'light');
    setFormCustomOptions(skill.customOptions || []);
    setFormEnableUpload(!!skill.enableUpload);
    setFormUploadType(skill.uploadType || 'all');
    setActiveTab('create');
  };

  const handleDeleteSkill = async (id: string) => {
    if (!window.confirm('您确定要永久删除此技能吗？此操作不可逆。')) return;

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
        onRefresh();
      } else {
        setErrorMess(data.error || '删除失败');
      }
    } catch (err: any) {
      setErrorMess('网路错误: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallToggle = async (skill: AiSkill) => {
    const token = localStorage.getItem('token');
    const url = `/api/skills/${skill.id}/${skill.isInstalled ? 'uninstall' : 'install'}`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Err toggling installation:', err);
    }
  };

  // Filter skills based on search
  const myActiveList = (customSkills.length > 0 
    ? customSkills.filter(s => s.isInstalled) 
    : defaultShowcaseSystemSkills
  ).filter(skill => {
    if (removedSystemSkillIds.includes(skill.id)) {
      return false;
    }
    if (PLUGIN_ID_SET.has(skill.id)) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return skill.name.toLowerCase().includes(q) || skill.desc.toLowerCase().includes(q);
  });

  const aiStudioList = (customSkills.length > 0 
    ? customSkills 
    : PLUGINS
  ).filter(skill => {
    if (!PLUGIN_ID_SET.has(skill.id)) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return skill.name.toLowerCase().includes(q) || skill.desc.toLowerCase().includes(q);
  });

  const exploreList = customSkills.filter(s => {
    if (PLUGIN_ID_SET.has(s.id)) {
      return false;
    }
    if (s.isSystem && !removedSystemSkillIds.includes(s.id)) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    const isMatched = s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
    return isMatched;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Overlay backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 font-sans"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-linear-to-r from-indigo-50/50 to-white">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">AI Skills 智能体专属技能库</h2>
              <p className="text-xs text-gray-500 mt-0.5">创建、定制或从市场挑选优质技能，让大语言模型完全服从特定角色和工作流</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50 bg-gray-50/30">
          <div className="flex space-x-1 bg-gray-100/80 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => { setActiveTab('my'); setIsEditing(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'my' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>我的专属技能 ({myActiveList.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('ai-studio'); setIsEditing(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'ai-studio' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>plugin ({aiStudioList.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('explore'); setIsEditing(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'explore' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>探索/共享市场 ({customSkills.length})</span>
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
                  setFormEnableUpload(false);
                  setFormUploadType('all');
                }
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'create' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEditing ? '修改自定义技能' : '构建全新技能'}</span>
            </button>
          </div>

          {activeTab !== 'create' && (
            <div className="relative flex items-center w-64 max-w-xs">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="搜索技能名称或详情..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-1.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border-0 focus:ring-1 focus:ring-indigo-500 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Messages and feedback bar */}
        {errorMess && (
          <div className="bg-red-50 text-red-600 px-6 py-2.5 text-xs font-medium flex items-center border-b border-red-100">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-ping" />
            {errorMess}
          </div>
        )}
        {successMess && (
          <div className="bg-emerald-50 text-emerald-600 px-6 py-2.5 text-xs font-medium flex items-center border-b border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping" />
            {successMess}
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 bg-linear-to-b from-gray-50/20 to-white">
          {activeTab === 'my' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myActiveList.map((skill) => (
                <div 
                  key={skill.id}
                  className="p-4 border border-gray-100 bg-white rounded-2xl transition-all flex flex-col justify-between hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl h-10 w-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                          {skill.icon}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 flex items-center flex-wrap gap-1.5">
                            <span>{skill.name}</span>
                            {skill.isSystem && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                                官方默认
                              </span>
                            )}
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {skill.isSystem ? '朱睿 开发团队' : `${skill.creatorName} (自制)`}
                          </p>
                        </div>
                      </div>
                      
                      {(!skill.isSystem || currentUser?.role === 'admin') && (
                        <div className="flex items-center space-x-1">
                          {(String(skill.creatorId) === String(currentUser?.id) || currentUser?.role === 'admin') && (
                            <>
                              <button
                                onClick={() => handleEditSkillFill(skill)}
                                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 rounded-lg transition-all"
                                title="修改技能"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSkill(skill.id)}
                                className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-all"
                                title="删除技能"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                      {skill.desc}
                    </p>

                    {skill.customOptions && skill.customOptions.length > 0 ? (
                      <div className="mt-2.5 p-2 bg-indigo-50/30 rounded-xl border border-indigo-100/30 space-y-1">
                        <div className="text-[9px] font-bold text-indigo-600 flex items-center space-x-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                          <span>🧩 专属功能配置参数</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {skill.customOptions.map((opt: any) => (
                            <span key={opt.id} className="text-[8px] font-medium px-1.5 py-0.5 bg-white text-gray-600 border border-gray-100 rounded-md shadow-2xs">
                              {opt.name}: <span className="text-indigo-600 font-bold">{opt.choices.length} 选</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-1 text-slate-400 select-none">
                        <span className="text-[9px]">⚙️ 标准通用模式</span>
                      </div>
                    )}

                    {skill.enableUpload && (
                      <div className="mt-2 p-1.5 bg-emerald-50/40 border border-emerald-100/60 rounded-lg flex items-center justify-between text-[9px] text-emerald-700 font-bold">
                        <span className="flex items-center">
                          <Upload className="w-3 h-3 mr-1" />
                          <span>支持自定义文件上传</span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-white border border-emerald-150 rounded-md text-[8px] text-emerald-600 font-black">
                          {skill.uploadType === 'all' && '全部类型'}
                          {skill.uploadType === 'text' && '仅文本'}
                          {skill.uploadType === 'image' && '仅图片'}
                          {skill.uploadType === 'video' && '仅视频'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 mt-4 pt-3">
                    <span className="text-[10px] text-gray-400 flex items-center">
                      {skill.isPublic ? <Globe className="w-3 h-3 mr-0.5 text-emerald-500" /> : <Lock className="w-3 h-3 mr-0.5 text-gray-400" />}
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
                              onSelectSkill('general');
                            }
                          } else {
                            handleInstallToggle(skill);
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] text-red-500 hover:text-red-700 font-bold bg-red-50/50 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        移除
                      </button>
                      
                      <button
                        onClick={() => {
                          onSelectSkill(skill.id);
                          onClose();
                        }}
                        className="px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 bg-indigo-50 text-indigo-700 cursor-default"
                      >
                        <Check className="w-3 h-3" />
                        <span>已添加</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {myActiveList.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Bot className="w-12 h-12 text-gray-300 mx-auto stroke-1" />
                  <p className="text-sm text-gray-400 mt-3 font-medium">无匹配的有效技能，请更换搜索词或创建新技能</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai-studio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiStudioList.map((skill) => (
                <div 
                  key={skill.id}
                  className={`p-4 border rounded-2xl transition-all flex flex-col justify-between ${
                    activeSkillId === skill.id 
                      ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200' 
                      : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl h-10 w-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                          {skill.icon}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 flex items-center flex-wrap gap-1.5">
                            <span>{skill.name}</span>
                            {skill.isSystem && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                                官方默认
                              </span>
                            )}
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {skill.isSystem ? '朱睿 开发团队' : `${skill.creatorName} (自制)`}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                      {skill.desc}
                    </p>

                    {skill.customOptions && skill.customOptions.length > 0 ? (
                      <div className="mt-2.5 p-2 bg-indigo-50/30 rounded-xl border border-indigo-100/30 space-y-1">
                        <div className="text-[9px] font-bold text-indigo-600 flex items-center space-x-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                          <span>🧩 专属功能配置参数</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {skill.customOptions.map((opt: any) => (
                            <span key={opt.id} className="text-[8px] font-medium px-1.5 py-0.5 bg-white text-gray-600 border border-gray-100 rounded-md shadow-2xs">
                              {opt.name}: <span className="text-indigo-600 font-bold">{opt.choices.length} 选</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-1 text-slate-400 select-none">
                        <span className="text-[9px]">⚙️ 标准通用模式</span>
                      </div>
                    )}

                    {skill.enableUpload && (
                      <div className="mt-2 p-1.5 bg-emerald-50/40 border border-emerald-100/60 rounded-lg flex items-center justify-between text-[9px] text-emerald-700 font-bold">
                        <span className="flex items-center">
                          <Upload className="w-3 h-3 mr-1" />
                          <span>支持自定义文件上传</span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-white border border-emerald-150 rounded-md text-[8px] text-emerald-600 font-black">
                          {skill.uploadType === 'all' && '全部类型'}
                          {skill.uploadType === 'text' && '仅文本'}
                          {skill.uploadType === 'image' && '仅图片'}
                          {skill.uploadType === 'video' && '仅视频'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 mt-4 pt-3">
                    <span className="text-[10px] text-gray-400 flex items-center">
                      {skill.isPublic ? <Globe className="w-3 h-3 mr-0.5 text-emerald-500" /> : <Lock className="w-3 h-3 mr-0.5 text-gray-400" />}
                      {skill.isPublic ? '公开共享中' : '仅自己可见'}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          onSelectSkill(skill.id);
                          onClose();
                        }}
                        className="px-3 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/55 cursor-default flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>已添加</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {aiStudioList.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Bot className="w-12 h-12 text-gray-300 mx-auto stroke-1" />
                  <p className="text-sm text-gray-400 mt-3 font-medium">无匹配的plugin技能</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'explore' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exploreList.map((skill) => {
                const isInstalled = skill.isSystem 
                  ? !removedSystemSkillIds.includes(skill.id)
                  : skill.isInstalled;
                return (
                  <div 
                    key={skill.id}
                    className={`p-4 border rounded-2xl transition-all flex flex-col justify-between ${
                      isInstalled 
                        ? 'bg-emerald-50/10 border-emerald-100/60' 
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl h-10 w-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                          {skill.icon}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 flex items-center flex-wrap gap-1.5">
                            <span>{skill.name}</span>
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {skill.creatorName || "社区原创"} {skill.creatorId === currentUser?.id && '(我)'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {(String(skill.creatorId) === String(currentUser?.id) || currentUser?.role === 'admin') && (
                          <>
                            <button
                              onClick={() => handleEditSkillFill(skill)}
                              className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 rounded-lg transition-all"
                              title="修改/联合编辑该技能"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSkill(skill.id)}
                              className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-all"
                              title="删除该技能"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                      {skill.desc || '创建者未添加描述'}
                    </p>

                    {skill.customOptions && skill.customOptions.length > 0 ? (
                      <div className="mt-2.5 p-2 bg-indigo-50/30 rounded-xl border border-indigo-100/30 space-y-1">
                        <div className="text-[9px] font-bold text-indigo-600 flex items-center space-x-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                          <span>🧩 专属功能配置参数</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {skill.customOptions.map((opt: any) => (
                            <span key={opt.id} className="text-[8px] font-medium px-1.5 py-0.5 bg-white text-gray-600 border border-gray-100 rounded-md shadow-2xs">
                              {opt.name}: <span className="text-indigo-600 font-bold">{opt.choices.length} 选</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-1 text-slate-400 select-none">
                        <span className="text-[9px]">⚙️ 标准通用模式</span>
                      </div>
                    )}

                    {skill.enableUpload && (
                      <div className="mt-2 p-1.5 bg-emerald-50/40 border border-emerald-100/60 rounded-lg flex items-center justify-between text-[9px] text-emerald-700 font-bold">
                        <span className="flex items-center">
                          <Upload className="w-3 h-3 mr-1" />
                          <span>支持自定义文件上传</span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-white border border-emerald-150 rounded-md text-[8px] text-emerald-600 font-black">
                          {skill.uploadType === 'all' && '全部类型'}
                          {skill.uploadType === 'text' && '仅文本'}
                          {skill.uploadType === 'image' && '仅图片'}
                          {skill.uploadType === 'video' && '仅视频'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 mt-4 pt-3">
                    <span className="text-[10px] text-gray-400 flex items-center">
                      <Globe className="w-3 h-3 mr-0.5 text-emerald-500" />
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
                          handleInstallToggle(skill);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 ${
                        isInstalled
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
              )})}

              {exploreList.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto stroke-1" />
                  <p className="text-sm text-gray-400 mt-3 font-medium">社区市场中暂无其他公共技能。去建立首个技能服务大家吧！</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateOrUpdate} className="max-w-2xl mx-auto bg-white p-6 border border-gray-100 rounded-3xl shadow-xs space-y-5">
              <h3 className="text-base font-bold text-gray-800 flex items-center">
                <Sparkles className="w-4 h-4 text-indigo-500 mr-2 shrink-0 animate-ping" />
                {isEditing ? '修改技能参数 (全员联动)' : '构建专属 AI 提示词技能'}
              </h3>
              
              <div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">技能名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="例如: 小红书文案爆破手"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs py-2.5 px-4 bg-gray-50 border border-gray-100 focus:ring-1 focus:ring-indigo-500 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">简短说明 (一句话介绍)</label>
                <textarea
                  rows={3}
                  placeholder="例如: 智能生成爆款网感标题，策划核心视觉大纲，配置极高转化率的排版。"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full text-xs py-3 px-4 bg-gray-50 border border-gray-100 focus:ring-1 focus:ring-indigo-500 rounded-xl resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>核心系统提示词 (System Prompt Instructions) <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-gray-400 font-normal">指定大模型遵守的背景设定、输出标准和专业规范</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder={`你是一位资深的高端策划师...\n应当提供：黄金前3秒、核心卖点提炼、排版...`}
                  value={formInstruction}
                  onChange={(e) => setFormInstruction(e.target.value)}
                  className="w-full text-xs py-3 px-4 bg-gray-50 border border-gray-100 focus:ring-1 focus:ring-indigo-500 rounded-xl font-mono leading-relaxed"
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
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formEnableUpload ? "bg-indigo-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formEnableUpload ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {formEnableUpload && (
                  <div className="overflow-hidden border-t border-gray-200/50 pt-3">
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
                            className={`px-3 py-2 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-white text-indigo-600 border-indigo-200 shadow-2xs"
                                : "bg-gray-50 border-gray-150 text-gray-500 hover:bg-gray-100/50"
                            }`}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 自定义参数选项配置 (Custom options config) */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">自定义参数选项配置</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">为此技能定制特定的下拉配置项（例如：“一级选项”、“二级选项”等），工作流节点中可动态选择</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newOpt: CustomSkillOption = {
                        id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        name: '',
                        choices: []
                      };
                      setFormCustomOptions([...formCustomOptions, newOpt]);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[11px] font-bold transition-all cursor-pointer border border-indigo-200/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加自定义选项</span>
                  </button>
                </div>

                {formCustomOptions.length === 0 ? (
                  <div className="text-center py-5 text-[11px] text-gray-400 bg-white rounded-xl border border-dashed border-gray-100 leading-relaxed">
                    ⚙️ 暂无自定义配置选项。点击右上角按钮添加一级、二级等专属功能参数。
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formCustomOptions.map((opt, idx) => (
                      <div key={opt.id} className="p-3 bg-white rounded-xl border border-gray-150 flex flex-col md:flex-row gap-3 items-start md:items-center relative shadow-xs">
                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <div className="flex flex-col space-y-0.5">
                            <label className="text-[10px] font-bold text-gray-500">参数名称 (例如: 一级选项、二级选项)</label>
                            <input
                              type="text"
                              required
                              placeholder="例如：一级选项、二级选项"
                              value={opt.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormCustomOptions(prev => prev.map((o, i) => i === idx ? { ...o, name: val } : o));
                              }}
                              className="w-full text-xs py-1.5 px-2.5 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all"
                            />
                          </div>
                          <div className="flex flex-col space-y-0.5">
                            <label className="text-[10px] font-bold text-gray-500">可选项 (用英文或中文逗号分隔)</label>
                            <input
                              type="text"
                              required
                              placeholder="例如: 选项A, 选项B, 选项C"
                              value={opt.choices.join(', ')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parts = val.split(/[，,]/).map(p => p.trim()).filter(Boolean);
                                setFormCustomOptions(prev => prev.map((o, i) => i === idx ? { ...o, choices: parts } : o));
                              }}
                              className="w-full text-xs py-1.5 px-2.5 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormCustomOptions(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-all cursor-pointer self-end md:self-center shrink-0 border border-transparent hover:border-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">发布属性</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formIsPublic ? '共享就分享到了 SKILL商城中，所有人都可以使用' : '私有，就只能自己使用'}
                  </p>
                </div>
                <div className="relative shrink-0">
                  <select
                    value={formIsPublic ? 'public' : 'private'}
                    onChange={(e) => setFormIsPublic(e.target.value === 'public')}
                    className="text-xs font-bold py-2.5 px-4 bg-white border border-gray-200 focus:ring-1 focus:ring-indigo-500 rounded-xl cursor-pointer text-gray-700 outline-none shadow-xs hover:border-gray-300 transition-all"
                  >
                    <option value="public">🌍 共享</option>
                    <option value="private">🔐 私有</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-50">
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
                      setFormEnableUpload(false);
                      setFormUploadType('all');
                      setActiveTab('my');
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                  >
                    取消修改
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:bg-indigo-400"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isEditing ? '保存修改记录' : '立即激活并使用此技能'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

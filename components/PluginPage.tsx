import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Check, 
  ArrowRight, 
  User as UserIcon, 
  Globe, 
  Lock, 
  Bot,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  Sparkles,
  Code,
  Play,
  Save,
  Plus,
  ChevronRight,
  Cpu,
  Layers,
  AlertCircle,
  Send,
  X
} from 'lucide-react';
import { AiSkill } from '../skills/types';
import { PLUGINS, SYSTEM_PLUGINS } from '../plugin';
import { safeJson } from '../lib/fetch';
import { WebSandbox } from './os/WebSandbox';
import { DEFAULT_PLUGIN_CODES } from '../plugin/definitions/defaultPluginCodes';
import { ExtensionRegistry } from '../lib/os/registries/ExtensionRegistry';
import { validateExtensionManifest } from '../lib/os/extension/validateManifest';
import { UserExtensionStore } from '../lib/os/extension/UserExtensionStore';
import { ExtensionHub } from '../lib/os/extension/ExtensionHub';


const getPluginCategory = (id: string, fallback?: 'text' | 'image' | 'video' | 'all'): 'text' | 'image' | 'video' | 'all' => {
  const saved = localStorage.getItem(`plugin_category_${id}`);
  if (saved === 'text' || saved === 'image' || saved === 'video' || saved === 'all') {
    return saved;
  }
  if (fallback) return fallback;
  if (id === 'camera-control') return 'video';
  return 'image';
};

const normalizePluginCategory = (value: any): 'text' | 'image' | 'video' | 'all' => {
  if (value === 'text' || value === 'image' || value === 'video' || value === 'all') {
    return value;
  }
  if (value === 'ui' || value === 'tool' || value === 'data') {
    return 'all';
  }
  return 'all';
};

const readPreferenceJson = <T,>(value: any, fallback: T): T => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const saveUserPreference = async (prefKey: string, prefValue: any) => {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('token');
  if (!token || token === 'guest') return;

  try {
    await fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pref_key: prefKey,
        pref_value: typeof prefValue === 'string' ? prefValue : JSON.stringify(prefValue)
      })
    });
  } catch (err) {
    console.warn(`[PluginPage] Failed to save preference "${prefKey}":`, err);
  }
};

const loadUserPreferences = async () => {
  if (typeof window === 'undefined') return new Map<string, any>();
  const token = localStorage.getItem('token');
  if (!token || token === 'guest') return new Map<string, any>();

  try {
    const res = await fetch('/api/user/preferences', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return new Map<string, any>();
    const data = await safeJson(res);
    const map = new Map<string, any>();
    if (Array.isArray(data?.preferences)) {
      data.preferences.forEach((pref: any) => map.set(pref.pref_key, pref.pref_value));
    }
    return map;
  } catch (err) {
    console.warn('[PluginPage] Failed to load cloud preferences:', err);
    return new Map<string, any>();
  }
};

const CODE_REFERENCE_TOKEN = 'Please use the following code as reference: ';

const extractCodeFromInstruction = (instruction?: string) => {
  const raw = instruction || '';
  const tokenIdx = raw.indexOf(CODE_REFERENCE_TOKEN);
  return tokenIdx !== -1 ? raw.substring(tokenIdx + CODE_REFERENCE_TOKEN.length) : raw;
};

const toNumberIfNumeric = (value: any) => {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value);
  return /^\d+$/.test(text) ? Number(text) : undefined;
};

const normalizePluginPackageToSkill = (pkg: any): AiSkill | null => {
  const manifest = pkg?.manifest || {};
  const contributedSkill = Array.isArray(manifest.contributes?.skills)
    ? manifest.contributes.skills[0]
    : null;
  const sourceRecordId =
    manifest.metadata?.sourceRecordId ||
    contributedSkill?.metadata?.sourceRecordId ||
    contributedSkill?.metadata?.userPluginId;
  const id = String(sourceRecordId || manifest.id || contributedSkill?.id || '').trim();

  if (!id || !manifest.name) return null;

  const category = normalizePluginCategory(
    contributedSkill?.category || manifest.category || manifest.metadata?.category
  );
  const instruction =
    contributedSkill?.instruction ||
    (manifest.runtime?.entry ? `[Generative UI Plugin: ${manifest.name}] ${manifest.description || ''}` : '');

  return {
    id,
    name: String(contributedSkill?.name || manifest.name || id),
    desc: String(contributedSkill?.description || manifest.description || ''),
    icon: String(contributedSkill?.icon || manifest.icon || '🧩'),
    instruction,
    isPublic: true,
    isSystem: false,
    isInstalled: true,
    status: 'approved',
    category,
    customOptions: contributedSkill?.customOptions || null,
    enableUpload: contributedSkill?.enableUpload,
    uploadType: contributedSkill?.uploadType,
    promptLabel: contributedSkill?.promptLabel,
    promptPlaceholder: contributedSkill?.promptPlaceholder,
    code: extractCodeFromInstruction(instruction),
    creatorId: toNumberIfNumeric(manifest.metadata?.ownerId),
    creatorName: manifest.author || '团队自制',
    ...(pkg.packagePath ? { packagePath: pkg.packagePath } : {}),
    ...(manifest.id ? { packageId: manifest.id } : {}),
    source: 'extension_package',
  } as AiSkill & Record<string, any>;
};

const pluginSkillToRegistryDefinition = (plugin: AiSkill & Record<string, any>) => ({
  id: plugin.id,
  name: plugin.name,
  version: '1.0.0',
  description: plugin.desc || '',
  icon: plugin.icon || '🧩',
  category: plugin.category || 'all',
  enabled: true,
  permissions: ['call_model', 'read_canvas', 'write_canvas'],
  metadata: {
    source: 'extension_package',
    packagePath: plugin.packagePath,
    packageId: plugin.packageId,
  },
  contributes: {
    skills: [{
      id: plugin.id,
      name: plugin.name,
      description: plugin.desc || '',
      instruction: plugin.instruction || '',
      category: plugin.category || 'all',
      icon: plugin.icon || '🧩',
      isSystem: false,
      isInstalled: true,
      isPublic: true,
      customOptions: plugin.customOptions,
      enableUpload: plugin.enableUpload,
      uploadType: plugin.uploadType,
      promptLabel: plugin.promptLabel,
      promptPlaceholder: plugin.promptPlaceholder,
    }],
  },
});

interface PluginPageProps {
  user: any;
}

export const PluginPage: React.FC<PluginPageProps> = ({ user }) => {
  const [customSkills, setCustomSkills] = useState<AiSkill[]>([]);
  const [packagePlugins, setPackagePlugins] = useState<AiSkill[]>([]);
  const [tick, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  // Navigation Tab State: 'browse' | 'all' | 'workshop' | 'manifest'
  const [activeTab, setActiveTab] = useState<'browse' | 'all' | 'workshop' | 'manifest'>('browse');

  // Manifest Import States
  const [manifests, setManifests] = useState<any[]>(() => {
    return UserExtensionStore.listManifests(user?.id);
  });
  const [manifestInput, setManifestInput] = useState<string>('');
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [manifestSuccess, setManifestSuccess] = useState<boolean>(false);

  const creativeWriterJson = `{
  "id": "creative-writer",
  "name": "创意写作助手",
  "version": "1.0.0",
  "description": "全自动文学修辞润色、冲突情节自动续写及生成式画风提示词扩展插件。",
  "type": "plugin",
  "author": "XiaoLuo OS Core Team",
  "category": "text",
  "icon": "✍️",
  "permissions": ["call_model"],
  "sandbox": "none",
  "contributes": {
    "skills": [
      {
        "id": "writer-polish",
        "name": "文学级语言润色",
        "description": "对简单、直白的文本进行深度修辞重组与情感张力扩写。",
        "category": "text",
        "instruction": "你是一位精通华丽修辞与叙事张力的文学大师。请对用户输入的段落进行深度润色，保持原意但大幅度提升文采和画面感。"
      },
      {
        "id": "conflict-generator",
        "name": "情节冲突续写",
        "description": "根据当前大纲，自动规划并续写下一阶段的戏剧冲突核心情节。",
        "category": "text",
        "instruction": "你是一位资深的悬疑与戏剧编剧。请根据用户的情节概述，续写至少300字的高潮冲突段落，并制造一个引人入胜的悬念悬崖（Cliffhanger）。"
      }
    ]
  }
}`;

  const assetNamerJson = `{
  "id": "asset-namer",
  "name": "资产自动命名器",
  "version": "1.0.0",
  "description": "基于多模态对生成的数字资产（图片、视频、文本等）进行智能分类与语义化统一命名规范。",
  "type": "plugin",
  "author": "XiaoLuo OS Core Team",
  "category": "data",
  "icon": "🏷️",
  "permissions": ["read_assets", "write_assets"],
  "sandbox": "none",
  "contributes": {
    "skills": [
      {
        "id": "asset-auto-categorize",
        "name": "资产分类与命名",
        "description": "提取数字资产关键特征并按照规范格式重命名。",
        "category": "data",
        "instruction": "你是一位资深的数字资产管理专家（DAM）。请对输入的资产描述与元数据，根据规范【[分类]_[年份]_[关键字]】生成唯一的语义化资产名称并分级归档。"
      }
    ]
  }
}`;

  const handleImportManifest = async () => {
    setManifestError(null);
    setManifestSuccess(false);
    try {
      const parsed = JSON.parse(manifestInput);
      const validation = validateExtensionManifest(parsed);
      if (!validation.ok || !validation.manifest) {
        setManifestError(`校验失败:\n${validation.errors.join('\n')}`);
        return;
      }
      
      const manifest = validation.manifest;
      
      const result = ExtensionHub.installManifest(manifest, { userId: user?.id });
      setManifests(result.manifests);

      try {
        const token = localStorage.getItem('token');
        const syncRes = await fetch('/api/extensions/packages/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ manifest })
        });
        if (!syncRes.ok) {
          throw new Error(`Package import failed with status ${syncRes.status}`);
        }
        await loadPluginPackages();
      } catch (syncErr) {
        console.warn('[PluginPage] Manifest imported locally but package sync failed:', syncErr);
      }
      
      setManifestInput('');
      setManifestSuccess(true);
      forceUpdate();
      
      window.dispatchEvent(new CustomEvent('skills-changed'));
      alert(`🎉 插件 "${manifest.name}" 导入并安装成功！`);
    } catch (err: any) {
      setManifestError(`JSON 解析失败: ${err.message || String(err)}`);
    }
  };

  const handleToggleExtension = (id: string, currentState: string) => {
    if (currentState === 'enabled') {
      ExtensionHub.disable(id, user?.id);
    } else {
      ExtensionHub.enable(id, user?.id);
    }
    forceUpdate();
  };

  const getExtensionStatus = (id: string) => {
    const record = ExtensionRegistry.get(id);
    if (!record) return { state: 'uninstalled', error: null };
    return { state: record.state, error: record.error };
  };

  const handleUninstallExtension = async (id: string) => {
    if (window.confirm('确认要卸载并彻底移除此清单插件及所有贡献项吗？')) {
      const result = ExtensionHub.uninstall(id, user?.id);
      setManifests(result.manifests);
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/extensions/packages/plugin/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        await loadPluginPackages();
      } catch (syncErr) {
        console.warn('[PluginPage] Manifest uninstalled locally but package delete failed:', syncErr);
      }
      
      forceUpdate();
      window.dispatchEvent(new CustomEvent('skills-changed'));
      alert('插件已成功卸载。');
    }
  };


  // Workshop States
  const [workshopSelectedId, setWorkshopSelectedId] = useState<string>('new');
  const [workshopCode, setWorkshopCode] = useState<string>(`// ✨ 欢迎来到 AI 插件工坊！
// 在左侧输入提示词，大模型将自动为您生成功能完备的 React 插件。
// 您也可以在此处直接修改代码，并点击右侧实时预览！

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Sparkles, Activity } from 'lucide-react';

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-55 p-6 text-center select-none">
      <div className="p-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full space-y-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">AI 插件渲染器就绪</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          请在左侧配置大模型，输入你奇妙的创意构想，或者选择推荐预设快速启动。
        </p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`);

  const [workshopPrompt, setWorkshopPrompt] = useState<string>('');
  const [selectedModelSlot, setSelectedModelSlot] = useState<string>('script');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(true);
  const [workshopError, setWorkshopError] = useState<string | null>(null);

  // Workshop Chat History Support
  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    success?: boolean;
  }
  const [workshopChatHistory, setWorkshopChatHistory] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem('workshop_chat_history');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const activeChat = useMemo(() => {
    return workshopChatHistory[workshopSelectedId] || [];
  }, [workshopChatHistory, workshopSelectedId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat]);

  const addChatMessage = (role: 'user' | 'assistant', content: string, success?: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      role,
      content,
      timestamp: Date.now(),
      success
    };
    setWorkshopChatHistory(prev => {
      const updated = {
        ...prev,
        [workshopSelectedId]: [...(prev[workshopSelectedId] || []), newMessage]
      };
      localStorage.setItem('workshop_chat_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearChatHistory = () => {
    if (window.confirm('是否确认清空当前插件的对话记录？')) {
      setWorkshopChatHistory(prev => {
        const updated = { ...prev };
        delete updated[workshopSelectedId];
        localStorage.setItem('workshop_chat_history', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Workshop Save Form State
  const [saveFormName, setSaveFormName] = useState<string>('');
  const [saveFormDesc, setSaveFormDesc] = useState<string>('');
  const [saveFormIcon, setSaveFormIcon] = useState<string>('✨');
  const [saveFormCategory, setSaveFormCategory] = useState<'text' | 'image' | 'video' | 'all'>('all');
  const [showSavePluginModal, setShowSavePluginModal] = useState<boolean>(false);

  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected_plugin_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return PLUGINS.map(p => p.id);
  });
  const [activeSkillId, setActiveSkillId] = useState<string>(() => {
    return localStorage.getItem('selected_ai_skill') || 'general';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const syncPluginPreferencesFromServer = useCallback(async () => {
    const prefs = await loadUserPreferences();
    if (prefs.size === 0) return;

    const selectedIds = readPreferenceJson<string[]>(prefs.get('selected_plugin_ids'), []);
    if (Array.isArray(selectedIds) && selectedIds.length > 0) {
      localStorage.setItem('selected_plugin_ids', JSON.stringify(selectedIds));
      setSelectedPluginIds(selectedIds);
    }

    const activeSkill = prefs.get('selected_ai_skill');
    if (typeof activeSkill === 'string' && activeSkill) {
      localStorage.setItem('selected_ai_skill', activeSkill);
      setActiveSkillId(activeSkill);
    }

    const deletedSystemPlugins = readPreferenceJson<string[]>(prefs.get('deleted_system_plugins'), []);
    if (Array.isArray(deletedSystemPlugins)) {
      localStorage.setItem('deleted_system_plugins', JSON.stringify(deletedSystemPlugins));
    }

    const editedSystemPlugins = readPreferenceJson<Record<string, any>>(prefs.get('edited_system_plugins'), {});
    if (editedSystemPlugins && typeof editedSystemPlugins === 'object') {
      localStorage.setItem('edited_system_plugins', JSON.stringify(editedSystemPlugins));
    }

    prefs.forEach((value, key) => {
      if (key.startsWith('plugin_category_') && typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    });
  }, []);

  // Admin Controls State
  const [editingPlugin, setEditingPlugin] = useState<AiSkill | null>(null);
  const [deletingPluginId, setDeletingPluginId] = useState<string | null>(null);

  // Form State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editCategory, setEditCategory] = useState<'text' | 'image' | 'video' | 'all'>('image');

  const canModifyPlugin = (skill: AiSkill) => {
    if (user?.role === 'admin') return true;
    const systemIds = SYSTEM_PLUGINS.map(sp => sp.id);
    if (systemIds.includes(skill.id) || skill.isSystem) return false;
    if (skill.creatorId && user?.id && String(skill.creatorId) === String(user?.id)) {
      return true;
    }
    return false;
  };

  const canModifySelectedWorkshopPlugin = useMemo(() => {
    if (workshopSelectedId === 'new') return true;
    if (user?.role === 'admin') return true;
    const systemIds = SYSTEM_PLUGINS.map(sp => sp.id);
    if (systemIds.includes(workshopSelectedId)) return false;
    const userPlugins = packagePlugins.length > 0
      ? packagePlugins
      : JSON.parse(localStorage.getItem('user_plugins') || '[]');
    const plugin = userPlugins.find((p: any) => p.id === workshopSelectedId);
    if (plugin && plugin.creatorId && user?.id && String(plugin.creatorId) === String(user?.id)) {
      return true;
    }
    return false;
  }, [workshopSelectedId, user, packagePlugins]);

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
      console.error('Failed to fetch custom skills in PluginPage:', e);
    }
  };

  const syncPackagePluginsToRuntime = useCallback((plugins: AiSkill[]) => {
    const serializablePlugins = plugins.map(plugin => ({ ...plugin }));
    localStorage.setItem('user_plugins', JSON.stringify(serializablePlugins));
    localStorage.setItem(
      'user_plugins_v2',
      JSON.stringify(serializablePlugins.map(plugin => pluginSkillToRegistryDefinition(plugin as any)))
    );
  }, []);

  const loadPluginPackages = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return [];
    }

    try {
      const res = await fetch('/api/extensions/packages?kind=plugin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`插件包发现失败: ${res.status}`);
      }
      const data = await safeJson(res);
      const packages = Array.isArray(data?.packages) ? data.packages : [];
      const discovered = packages
        .map(normalizePluginPackageToSkill)
        .filter(Boolean) as AiSkill[];

      const unique = Array.from(
        new Map(discovered.map(plugin => [plugin.id, plugin])).values()
      );

      setPackagePlugins(unique);
      syncPackagePluginsToRuntime(unique);

      if (!localStorage.getItem('selected_plugin_ids')) {
        const allIds = [...SYSTEM_PLUGINS.map(plugin => plugin.id), ...unique.map(plugin => plugin.id)];
        localStorage.setItem('selected_plugin_ids', JSON.stringify(allIds));
        void saveUserPreference('selected_plugin_ids', allIds);
        setSelectedPluginIds(allIds);
      }

      forceUpdate();
      return unique;
    } catch (e) {
      console.error('Failed to load plugin packages:', e);
      return [];
    }
  }, [syncPackagePluginsToRuntime]);

  const handleApprovePlugin = (id: string) => {
    try {
      const userPluginsStr = localStorage.getItem('user_plugins');
      if (userPluginsStr) {
        const userPlugins = JSON.parse(userPluginsStr);
        const updated = userPlugins.map((p: any) => {
          if (p.id === id) {
            return { ...p, status: 'approved', isPublic: true };
          }
          return p;
        });
        localStorage.setItem('user_plugins', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('skills-changed'));
        alert('插件已通过审核并直接启用！');
      }
    } catch (e) {
      console.error('Failed to approve plugin:', e);
    }
  };

  useEffect(() => {
    syncPluginPreferencesFromServer()
      .finally(() => {
        fetchSkills();
        loadPluginPackages().then(() => {
          window.dispatchEvent(new CustomEvent('skills-changed'));
        });
      });
    
    // Sync active skill id changes
    const handleSkillChange = (e: any) => {
      if (e.detail && e.detail.skillId) {
        setActiveSkillId(e.detail.skillId);
        localStorage.setItem('selected_ai_skill', e.detail.skillId);
        void saveUserPreference('selected_ai_skill', e.detail.skillId);
      }
    };
    const handlePluginsChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail.pluginIds)) {
        setSelectedPluginIds(e.detail.pluginIds);
      }
    };
    const handleSkillsRefresh = () => {
      loadPluginPackages();
      forceUpdate();
    };
    window.addEventListener('selected-skill-changed', handleSkillChange);
    window.addEventListener('selected-plugins-changed', handlePluginsChange);
    window.addEventListener('skills-changed', handleSkillsRefresh);
    return () => {
      window.removeEventListener('selected-skill-changed', handleSkillChange);
      window.removeEventListener('selected-plugins-changed', handlePluginsChange);
      window.removeEventListener('skills-changed', handleSkillsRefresh);
    };
  }, [loadPluginPackages, syncPluginPreferencesFromServer]);

  const handleSelectSkill = (id: string) => {
    setSelectedPluginIds(prev => {
      const isSelected = prev.includes(id);
      let next: string[];
      if (isSelected) {
        next = prev.filter(item => item !== id);
      } else {
        next = [...prev, id];
      }
      localStorage.setItem('selected_plugin_ids', JSON.stringify(next));
      void saveUserPreference('selected_plugin_ids', next);
      window.dispatchEvent(new CustomEvent('selected-plugins-changed', { detail: { pluginIds: next } }));
      return next;
    });
  };

  const handleStartEdit = (plugin: AiSkill) => {
    setEditingPlugin(plugin);
    setEditName(plugin.name);
    setEditDesc(plugin.desc);
    setEditIcon(plugin.icon || '⚙️');
    setEditCategory(getPluginCategory(plugin.id, plugin.category));
  };

  const handleSaveEdit = async () => {
    if (!editingPlugin) return;
    try {
      if (editingPlugin.isSystem) {
        if (user?.role !== 'admin') {
          alert('官方内置插件受保护，普通用户不能修改系统插件包。');
          return;
        }
        const editedPlugins = JSON.parse(localStorage.getItem('edited_system_plugins') || '{}');
        editedPlugins[editingPlugin.id] = {
          ...editedPlugins[editingPlugin.id],
          name: editName,
          desc: editDesc,
          icon: editIcon,
        };
        localStorage.setItem('edited_system_plugins', JSON.stringify(editedPlugins));
        void saveUserPreference('edited_system_plugins', editedPlugins);
      } else {
        // Edit custom plugin in user_plugins
        const userPlugins = packagePlugins.length > 0
          ? packagePlugins
          : JSON.parse(localStorage.getItem('user_plugins') || '[]');
        const existingPlugin = userPlugins.find((p: any) => p.id === editingPlugin.id) as any;
        const existingCode = existingPlugin?.code || extractCodeFromInstruction(existingPlugin?.instruction || editingPlugin.instruction);
        const updated = userPlugins.map((p: any) => {
            if (p.id === editingPlugin.id) {
              return {
                ...p,
                name: editName,
                desc: editDesc,
                icon: editIcon,
                category: editCategory
              };
            }
            return p;
          });
        syncPackagePluginsToRuntime(updated);
        const token = localStorage.getItem('token');
        const syncRes = await fetch('/api/plugins/packages/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: editingPlugin.id,
            name: editName,
            desc: editDesc,
            icon: editIcon,
            category: editCategory,
            code: existingCode || `export default function Plugin() { return null; }`
          })
        });
        if (!syncRes.ok) {
          const err = await syncRes.json().catch(() => ({}));
          throw new Error(err.error || `插件包保存失败: ${syncRes.status}`);
        }
        await loadPluginPackages();
      }
      localStorage.setItem(`plugin_category_${editingPlugin.id}`, editCategory);
      void saveUserPreference(`plugin_category_${editingPlugin.id}`, editCategory);
      setEditingPlugin(null);
      window.dispatchEvent(new CustomEvent('skills-changed'));
      window.dispatchEvent(new CustomEvent('selected-skill-changed', { detail: { skillId: activeSkillId } }));
    } catch (e) {
      console.error('Failed to save edited plugin:', e);
      alert(e instanceof Error ? e.message : '插件保存失败');
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      // Check if it is a user plugin
      const userPlugins = packagePlugins.length > 0
        ? packagePlugins
        : JSON.parse(localStorage.getItem('user_plugins') || '[]');
      const filtered = userPlugins.filter((p: any) => p.id !== id);
      if (filtered.length !== userPlugins.length) {
        const token = localStorage.getItem('token');
        const syncRes = await fetch(`/api/plugins/packages/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!syncRes.ok) {
          const err = await syncRes.json().catch(() => ({}));
          throw new Error(err.error || `插件包删除失败: ${syncRes.status}`);
        }
        syncPackagePluginsToRuntime(filtered);
        await loadPluginPackages();
        setDeletingPluginId(null);
        window.dispatchEvent(new CustomEvent('skills-changed'));
        return;
      }

      if (user?.role !== 'admin') {
        alert('官方内置插件受保护，普通用户不能删除系统插件包。');
        setDeletingPluginId(null);
        return;
      }

      const deletedIds = JSON.parse(localStorage.getItem('deleted_system_plugins') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('deleted_system_plugins', JSON.stringify(deletedIds));
        void saveUserPreference('deleted_system_plugins', deletedIds);
      }
      setDeletingPluginId(null);
      if (activeSkillId === id) {
        handleSelectSkill('general');
      }
      window.dispatchEvent(new CustomEvent('skills-changed'));
      window.dispatchEvent(new CustomEvent('selected-skill-changed', { detail: { skillId: 'general' } }));
    } catch (e) {
      console.error('Failed to delete plugin:', e);
      alert(e instanceof Error ? e.message : '插件删除失败');
    }
  };

  const hasLocalOverrides = () => {
    try {
      const deleted = localStorage.getItem('deleted_system_plugins');
      const edited = localStorage.getItem('edited_system_plugins');
      const user = localStorage.getItem('user_plugins');
      const hasDeleted = deleted && JSON.parse(deleted).length > 0;
      const hasEdited = edited && Object.keys(JSON.parse(edited)).length > 0;
      const hasUser = user && JSON.parse(user).length > 0;
      return !!(hasDeleted || hasEdited || hasUser);
    } catch {
      return false;
    }
  };

  const handleResetAllPlugins = async () => {
    if (window.confirm('确认要恢复所有官方插件并删除所有自建插件吗？')) {
      const token = localStorage.getItem('token');
      if (token && token !== 'guest') {
        for (const plugin of packagePlugins) {
          try {
            await fetch(`/api/plugins/packages/${encodeURIComponent(plugin.id)}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (err) {
            console.warn(`[PluginPage] Failed to delete cloud plugin package "${plugin.id}":`, err);
          }
        }
      }
      localStorage.removeItem('deleted_system_plugins');
      localStorage.removeItem('edited_system_plugins');
      localStorage.removeItem('user_plugins');
      void saveUserPreference('deleted_system_plugins', []);
      void saveUserPreference('edited_system_plugins', {});
      window.dispatchEvent(new CustomEvent('skills-changed'));
      window.dispatchEvent(new CustomEvent('selected-skill-changed', { detail: { skillId: activeSkillId } }));
      window.location.reload();
    }
  };

  // Workshop logic: load custom plugin code
  const handleWorkshopLoadPlugin = (id: string) => {
    setWorkshopSelectedId(id);
    if (id === 'new') {
      setWorkshopCode(`// ✨ 欢迎来到 AI 插件工坊！
// 在左侧输入提示词，大模型将自动为您生成功能完备的 React 插件。
// 您也可以在此处直接修改代码，并点击右侧实时预览！

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Sparkles, Activity } from 'lucide-react';

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-55 p-6 text-center select-none">
      <div className="p-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full space-y-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">AI 插件渲染器就绪</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          请在左侧配置大模型，输入你奇妙的创意构想，或者选择推荐预设快速启动。
        </p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`);
      setSaveFormName('');
      setSaveFormDesc('');
      setSaveFormIcon('✨');
      setSaveFormCategory('all');
    } else {
      const userPlugins = packagePlugins.length > 0
        ? packagePlugins
        : JSON.parse(localStorage.getItem('user_plugins') || '[]');
      let matched = userPlugins.find((p: any) => p.id === id);
      
      // If not in user_plugins, check if it is an edited system plugin in edited_system_plugins
      if (!matched) {
        const editedPlugins = JSON.parse(localStorage.getItem('edited_system_plugins') || '{}');
        if (editedPlugins[id]) {
          matched = { id, ...editedPlugins[id] };
        }
      }

      // If still not found, check if it's one of our default system plugins
      const sysPlugin = SYSTEM_PLUGINS.find(p => p.id === id);
      if (!matched && sysPlugin) {
        const defaultCode = DEFAULT_PLUGIN_CODES[id] || '';
        matched = {
          id,
          name: sysPlugin.name,
          desc: sysPlugin.desc || '',
          icon: sysPlugin.icon || '🔌',
          category: sysPlugin.category || 'image',
          instruction: `[Generative UI Plugin: ${sysPlugin.name}] Please use the following code as reference: ${defaultCode}`
        };
      }

      if (matched) {
        // Extract code from instruction
        const savedCode = matched.code || extractCodeFromInstruction(matched.instruction);
        setWorkshopCode(savedCode);
        setSaveFormName(matched.name);
        setSaveFormDesc(matched.desc || matched.description || '');
        setSaveFormIcon(matched.icon || '✨');
        setSaveFormCategory(matched.category || 'all');
      }
    }
  };

  // Workshop dynamic generation call
  const handleWorkshopGenerate = async () => {
    const currentPrompt = workshopPrompt.trim();
    if (!currentPrompt) {
      setWorkshopError('请输入构想提示词');
      return;
    }
    
    // Add user message to chat history
    addChatMessage('user', currentPrompt);

    setIsGenerating(true);
    setWorkshopError(null);

    const token = localStorage.getItem('token');
    try {
      const isIncremental = workshopSelectedId !== 'new' || workshopCode.includes('function App');
      const body = {
        prompt: currentPrompt,
        existingCode: isIncremental ? workshopCode : undefined,
        modelSlot: selectedModelSlot
      };

      const res = await fetch('/api/plugins/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '生成失败，请检查模型连接');
      }

      const data = await res.json();
      if (data.success && data.code) {
        setWorkshopCode(data.code);
        setWorkshopPrompt('');
        
        // Add successful assistant reply to history
        addChatMessage('assistant', `✨ 代码开发与迭代成功！已在右侧编辑器及实时沙盒中完成热更新，快去右侧进行功能测试吧。`, true);

        // Suggest automatic values if saving a brand new plugin
        if (workshopSelectedId === 'new' && !saveFormName) {
          // extract name placeholder
          const tempName = currentPrompt.substring(0, 10) + '...';
          setSaveFormName(tempName);
        }
      } else {
        throw new Error('未返回有效的生成代码');
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || '网络连接或模型API配置有误';
      setWorkshopError(errMsg);
      // Add failed assistant reply to history
      addChatMessage('assistant', `⚠️ 编译生成失败：${errMsg}`, false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Workshop save action
  const handleWorkshopSave = async (closeModalAfter?: boolean) => {
    if (!saveFormName.trim()) {
      alert('请先输入插件名称');
      return;
    }

    try {
      const userPlugins = packagePlugins.length > 0
        ? packagePlugins
        : JSON.parse(localStorage.getItem('user_plugins') || '[]');
      const isNew = workshopSelectedId === 'new' || !canModifySelectedWorkshopPlugin;
      const pluginId = isNew ? 'custom_' + Date.now().toString() : workshopSelectedId;

      const systemIds = SYSTEM_PLUGINS.map(sp => sp.id);
      if (systemIds.includes(pluginId)) {
        if (user?.role !== 'admin') {
          alert('官方内置插件受保护。普通用户修改官方插件时，会保存为新的自定义插件。');
          return;
        }
        const editedPlugins = JSON.parse(localStorage.getItem('edited_system_plugins') || '{}');
        editedPlugins[pluginId] = {
          ...editedPlugins[pluginId],
          id: pluginId,
          name: saveFormName,
          desc: saveFormDesc,
          icon: saveFormIcon,
          instruction: `[Generative UI Plugin: ${saveFormName}] Please use the following code as reference: ${workshopCode}`,
          category: saveFormCategory,
          isSystem: true,
          isInstalled: true,
          isPublic: true
        };
        localStorage.setItem('edited_system_plugins', JSON.stringify(editedPlugins));
        void saveUserPreference('edited_system_plugins', editedPlugins);
        localStorage.setItem(`plugin_category_${pluginId}`, saveFormCategory);
        void saveUserPreference(`plugin_category_${pluginId}`, saveFormCategory);
      } else {
        const savedPayload = {
          id: pluginId,
          name: saveFormName + (isNew && workshopSelectedId !== 'new' ? ' (副本)' : ''),
          desc: saveFormDesc,
          icon: saveFormIcon,
          instruction: `[Generative UI Plugin: ${saveFormName}] Please use the following code as reference: ${workshopCode}`,
          isPublic: true,
          isSystem: false,
          isInstalled: true,
          category: saveFormCategory,
          status: 'approved',
          code: workshopCode,
          creatorId: isNew ? user?.id : ((userPlugins as any[]).find((p: any) => p.id === pluginId)?.creatorId || user?.id),
          creatorName: isNew ? (user?.username || '团队自制') : ((userPlugins as any[]).find((p: any) => p.id === pluginId)?.creatorName || user?.username || '团队自制')
        };

        const token = localStorage.getItem('token');
        const syncRes = await fetch('/api/plugins/packages/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: pluginId,
            name: savedPayload.name,
            desc: savedPayload.desc,
            icon: savedPayload.icon,
            category: savedPayload.category,
            code: workshopCode
          })
        });
        if (!syncRes.ok) {
          const err = await syncRes.json().catch(() => ({}));
          throw new Error(err.error || `插件包写入失败: ${syncRes.status}`);
        }

        let nextUserPlugins: any[] = [...(userPlugins as any[])];
        if (isNew) {
          nextUserPlugins.push(savedPayload);
          setWorkshopChatHistory(prev => {
            const updated = { ...prev };
            if (updated[workshopSelectedId]) {
              updated[pluginId] = updated[workshopSelectedId];
              if (workshopSelectedId === 'new') {
                delete updated['new'];
              }
            }
            localStorage.setItem('workshop_chat_history', JSON.stringify(updated));
            return updated;
          });
        } else {
          const idx = nextUserPlugins.findIndex((p: any) => p.id === pluginId);
          if (idx !== -1) {
            nextUserPlugins[idx] = savedPayload;
          } else {
            nextUserPlugins.push(savedPayload);
          }
        }

        syncPackagePluginsToRuntime(nextUserPlugins);
        localStorage.setItem(`plugin_category_${pluginId}`, saveFormCategory);
        void saveUserPreference(`plugin_category_${pluginId}`, saveFormCategory);
        await loadPluginPackages();
        if (isNew) {
          setWorkshopSelectedId(pluginId);
          setSelectedPluginIds(prev => {
            if (prev.includes(pluginId)) return prev;
            const next = [...prev, pluginId];
            localStorage.setItem('selected_plugin_ids', JSON.stringify(next));
            void saveUserPreference('selected_plugin_ids', next);
            return next;
          });
        }
      }

      window.dispatchEvent(new CustomEvent('skills-changed'));
      if (isNew && workshopSelectedId !== 'new') {
        alert('🎉 由于您对原插件无修改权限，已自动将您的修改另存为新插件！');
      } else {
        alert('🎉 插件已成功保存为独立插件包并立即启用！');
      }
      if (closeModalAfter === true) {
        setShowSavePluginModal(false);
      }
    } catch (err: any) {
      console.error('[PluginPage] Failed to save plugin package:', err);
      alert(err?.message || '插件保存失败，请检查服务端插件包写入接口。');
    }
  };

  const allPluginList = useMemo(() => {
    const merged = new Map<string, AiSkill>();
    PLUGINS.forEach(plugin => merged.set(plugin.id, plugin));
    packagePlugins.forEach(plugin => merged.set(plugin.id, plugin));
    return Array.from(merged.values());
  }, [packagePlugins, tick]);

  const aiStudioList = allPluginList.filter(skill => {
    const q = searchQuery.toLowerCase();
    return skill.name.toLowerCase().includes(q) || skill.desc.toLowerCase().includes(q);
  });

  const installedPluginsCount = allPluginList.filter(p => selectedPluginIds.includes(p.id)).length;
  const displayedList = activeTab === 'browse'
    ? aiStudioList.filter(skill => selectedPluginIds.includes(skill.id))
    : aiStudioList;

  const customSavedPluginsList = packagePlugins.length > 0
    ? packagePlugins
    : JSON.parse(localStorage.getItem('user_plugins') || '[]');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fcfcfd]">
      {/* Sub header for searching & actions */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between shrink-0 gap-4 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="relative flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 px-2.5 select-none shrink-0">板块导航:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('browse')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all select-none cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-250'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border border-transparent'
              }`}
            >
              🧩 浏览器已装插件 ({installedPluginsCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all select-none cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-250'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border border-transparent'
              }`}
            >
              📦 全部插件 ({allPluginList.length})
            </button>
            <button
              onClick={() => setActiveTab('workshop')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all select-none cursor-pointer ${
                activeTab === 'workshop'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-250'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border border-transparent'
              }`}
            >
              ✨ AI 插件工坊 (Beta)
            </button>
            <button
              onClick={() => setActiveTab('manifest')}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all select-none cursor-pointer ${
                activeTab === 'manifest'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-250'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border border-transparent'
              }`}
            >
              🔌 Manifest 导入
            </button>
          </div>
        </div>

        {activeTab === 'browse' || activeTab === 'all' ? (
          <div className="flex items-center justify-between md:justify-end gap-3 flex-1">
            <div className="relative flex items-center w-full sm:w-64 md:w-72 group">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 transition-colors group-focus-within:text-indigo-500 pointer-events-none" />
              <input
                type="text"
                placeholder="搜索 plugin 功能..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/40 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none rounded-xl transition-all shadow-2xs"
              />
            </div>
          </div>
        ) : activeTab === 'workshop' ? (
          <div className="flex items-center space-x-3 flex-1 justify-end">
            <span className="text-xs text-slate-500">
              ⚙️ 当前工作空间：
            </span>
            <select
              value={workshopSelectedId}
              onChange={(e) => handleWorkshopLoadPlugin(e.target.value)}
              className="text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-48 cursor-pointer font-medium"
            >
              <option value="new">✨ 新建自定义插件</option>
              <optgroup label="官方预设插件">
                {SYSTEM_PLUGINS.map(sp => (
                  <option key={sp.id} value={sp.id}>
                    {sp.icon} {sp.name}
                  </option>
                ))}
              </optgroup>
              {customSavedPluginsList.length > 0 && (
                <optgroup label="自建/自制插件">
                  {customSavedPluginsList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.icon || '📦'} {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        ) : (
          <div className="flex items-center space-x-3 flex-1 justify-end text-xs text-slate-500 font-semibold select-none">
            🔌 支持标准 Extension 插件规范
          </div>
        )}
      </div>

      {activeTab === 'browse' || activeTab === 'all' ? (
        /* Grid view content */
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
            {displayedList.map((skill) => (
              <div 
                key={skill.id}
                className={`p-5 bg-white border rounded-2xl shadow-xs transition-all flex flex-col justify-between hover:shadow-md hover:translate-y-[-2px] ${
                  activeSkillId === skill.id 
                    ? 'border-indigo-200 ring-1 ring-indigo-200 bg-indigo-50/5' 
                    : 'border-gray-100'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="truncate pr-2">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center flex-wrap gap-1.5">
                        <span className="text-lg mr-1">{skill.icon || '🧩'}</span>
                        <span>{skill.name}</span>
                        {skill.isSystem && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100/55 rounded-md shrink-0">
                            官方默认
                          </span>
                        )}
                        {(skill as any).packagePath && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/60 rounded-md shrink-0">
                            独立插件包
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                        <UserIcon className="w-3 h-3 mr-1 text-gray-300" />
                        {skill.isSystem ? '朱睿 开发团队' : `${skill.creatorName || '团队自制'}`}
                      </p>
                    </div>

                    {canModifyPlugin(skill) && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(skill);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          title="编辑插件属性"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingPluginId(skill.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          title="删除插件"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[12px] text-gray-600 mt-4 leading-relaxed bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100/40 min-h-[64px] block">
                    {skill.desc || '暂无描述。'}
                  </p>
                  {(skill as any).packagePath && (
                    <div className="mt-3 text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 truncate" title={(skill as any).packagePath}>
                      {(skill as any).packagePath}
                    </div>
                  )}

                  {skill.customOptions && skill.customOptions.length > 0 ? (
                    <div className="mt-3 p-3 bg-indigo-50/30 rounded-2xl border border-indigo-100/30 space-y-1.5">
                      <div className="text-[10px] font-bold text-indigo-600 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span>🧩 专属功能配置参数</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {skill.customOptions.map((opt: any) => (
                          <span key={opt.id} className="text-[9px] font-medium px-2 py-0.5 bg-white text-gray-600 border border-gray-100 rounded-lg shadow-2xs" title={opt.choices.join(', ')}>
                            {opt.name}: <span className="text-indigo-600 font-bold">{opt.choices.length} 个选项</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-1 text-slate-400 select-none">
                      <span className="text-[10px]">⚙️ 标准自适应渲染模式</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 mt-5 pt-3.5">
                  <span className="text-[10px] flex items-center font-semibold">
                    {selectedPluginIds.includes(skill.id) ? (
                      <>
                        <Globe className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        <span className="text-emerald-500">已直接启用</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        <span className="text-slate-400">未启用</span>
                      </>
                    )}
                  </span>

                   <div className="flex items-center space-x-1.5">
                    {(!skill.isSystem || SYSTEM_PLUGINS.some(sp => sp.id === skill.id) || user?.role === 'admin') && (
                      <button
                        onClick={() => {
                          setActiveTab('workshop');
                          handleWorkshopLoadPlugin(skill.id);
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
                        title={canModifyPlugin(skill) ? "进入代码工坊编辑此自建插件" : "查看此自建插件源码"}
                      >
                        <Code className="w-3.5 h-3.5 text-slate-500" />
                        <span>{canModifyPlugin(skill) ? '编辑代码' : '查看代码'}</span>
                      </button>
                    )}
                    {selectedPluginIds.includes(skill.id) ? (
                      <>
                        <button
                          onClick={() => {
                            handleSelectSkill(skill.id);
                          }}
                          className="px-3 py-1.5 text-[11px] text-red-500 hover:text-red-700 font-bold hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        >
                          移除
                        </button>
                        <button
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100/55 cursor-default flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>已添加</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          handleSelectSkill(skill.id);
                        }}
                        className="px-3.5 py-1.5 text-[11px] font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>添加</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {displayedList.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-3xl">
                <Bot className="w-14 h-14 text-gray-300 mx-auto stroke-1" />
                <p className="text-sm text-gray-400 mt-4 font-medium">
                  {activeTab === 'browse' ? '您当前未启用任何插件！请前往「全部插件」中选择并启用。' : '没有匹配的功能技能！'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'workshop' ? (
        /* AI Plugin Workshop Panel */
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#f8fafc] animate-in fade-in duration-300">
          {/* Workshop Control Sidebar */}
          <div className="w-full md:w-[380px] border-r border-slate-200/60 bg-white flex flex-col overflow-y-auto shrink-0 p-6 space-y-6">
            {!canModifySelectedWorkshopPlugin && (
              <div className="p-3 bg-amber-50 text-amber-800 text-[11px] rounded-xl border border-amber-100 flex items-start space-x-1.5">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed">
                  🔒 <strong>只读预览模式</strong>：此插件由其他成员创建。您当前仅可预览及运行，无权通过AI提词修改或直接保存覆盖。
                </span>
              </div>
            )}

            {/* Conversation/Dialogue History Panel */}
            <div className="space-y-2">
              <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-3 h-[240px] overflow-y-auto space-y-3.5 scrollbar-thin">
                {activeChat.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-1.5 py-4">
                    <Bot className="w-8 h-8 text-slate-300 animate-pulse" />
                    <span className="text-[10px] font-bold">暂无迭代对话记录</span>
                    <span className="text-[9px] text-slate-400 leading-normal max-w-[220px]">
                      在下方输入开发构想或选择推荐预设，大模型将在此展示多轮对话历史。
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {activeChat.map((msg) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={msg.id} className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            isUser ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isUser ? 'U' : <Bot className="w-3.5 h-3.5 text-slate-500" />}
                          </div>

                          {/* Message bubble */}
                          <div className={`max-w-[85%] rounded-2xl p-2.5 text-[11px] leading-relaxed shadow-xs ${
                            isUser 
                              ? 'bg-indigo-600 text-white rounded-tr-none font-medium' 
                              : msg.success === false
                                ? 'bg-rose-50 text-rose-800 border border-rose-100 rounded-tl-none font-medium'
                                : msg.success === true
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-tl-none font-medium'
                                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                          }`}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            <div className={`text-[8px] mt-1 text-right block ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Input & Presets */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100/50">
              <textarea
                value={workshopPrompt}
                onChange={(e) => setWorkshopPrompt(e.target.value)}
                placeholder={
                  !canModifySelectedWorkshopPlugin
                    ? "🔒 只读模式下无法使用提词修改他人插件"
                    : "例如：制作一个水晶质感的倒计时时钟，支持番茄钟，秒表..."
                }
                rows={4}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isGenerating || !canModifySelectedWorkshopPlugin}
              />

              {workshopError && (
                <div className="p-3 bg-red-50 text-red-700 text-[11px] rounded-xl border border-red-100 flex items-start space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{workshopError}</span>
                </div>
              )}

              <button
                onClick={handleWorkshopGenerate}
                disabled={isGenerating || !workshopPrompt.trim() || !canModifySelectedWorkshopPlugin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI 正在全力编译代码...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{workshopSelectedId === 'new' && !workshopCode.includes('App()') ? '生成全新插件' : '对话迭代/优化代码'}</span>
                  </>
                )}
              </button>

              {/* Model Slot Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100/50">
                <div className="relative">
                  <select
                    value={selectedModelSlot}
                    onChange={(e) => setSelectedModelSlot(e.target.value)}
                    disabled={!canModifySelectedWorkshopPlugin}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer font-bold text-slate-700 appearance-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="script">主力通用模型 (Gemini / 推荐)</option>
                    <option value="claudeSonnet">高阶推理大模型 (Claude Sonnet)</option>
                    <option value="gptText">兼容架构模型 (GPT / 兼容渠道)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Viewer & Sandbox Live Iframe Render */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Monospace Code Editor Pane */}
            {showCodeEditor && (
              <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-[#0f172a] h-1/2 md:h-full">
                <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center space-x-1.5">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    <span>PLUGIN_SOURCE_CODE.tsx</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    {!canModifySelectedWorkshopPlugin ? (
                      <span className="text-[9px] font-mono text-amber-500 bg-amber-950 px-2 py-0.5 border border-amber-900/60 rounded-md flex items-center space-x-1">
                        <Lock className="w-3 h-3 mr-0.5 text-amber-500" />
                        <span>只读模式</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-emerald-500 bg-emerald-950 px-2 py-0.5 border border-emerald-900/60 rounded-md">
                        EDITABLE
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  value={workshopCode}
                  onChange={(e) => setWorkshopCode(e.target.value)}
                  readOnly={!canModifySelectedWorkshopPlugin}
                  className={`flex-1 w-full p-4 font-mono text-[11px] leading-relaxed text-slate-355 bg-slate-950 border-none outline-none resize-none focus:ring-0 overflow-y-auto selection:bg-slate-800 selection:text-white ${
                    !canModifySelectedWorkshopPlugin ? 'cursor-not-allowed opacity-80' : ''
                  }`}
                  style={{ color: '#cbd5e1' }}
                />
              </div>
            )}

            {/* Live Render Area */}
            <div className={`flex-1 flex flex-col h-1/2 md:h-full`}>
              <div className="h-11 bg-white border-b border-slate-200/60 flex items-center px-4 justify-between shrink-0">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>实时测试沙盒 (WebGL Sandbox Iframe)</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSavePluginModal(true)}
                    className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow-xs active:scale-[0.98] rounded-lg border-0 transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>{!canModifySelectedWorkshopPlugin ? '克隆为新插件' : '保存插件'}</span>
                  </button>
                  <button
                    onClick={() => setShowCodeEditor(!showCodeEditor)}
                    className="px-2.5 py-1 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                  >
                    {showCodeEditor ? '隐藏代码' : '显示代码'}
                  </button>
                  <span className="text-[9px] font-black text-slate-400 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-md">
                    240 FPS
                  </span>
                </div>
              </div>
              <div className="flex-1 p-6 min-h-0 bg-slate-100/50">
                <WebSandbox code={workshopCode} className="h-full shadow-md rounded-2xl overflow-hidden border border-slate-200/60" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Manifest Page Panel */
        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>🔌 导入新插件 Extension 清单 (Manifest JSON)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              根据标准扩展规范，粘贴 ExtensionManifest 格式的 JSON 进行动态插件与功能贡献项的安装与即插即用部署。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setManifestInput(creativeWriterJson);
                  setManifestError(null);
                  setManifestSuccess(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer border-0"
              >
                📝 载入《创意写作助手》清单示例 (Prompt Skill)
              </button>
              <button
                onClick={() => {
                  setManifestInput(assetNamerJson);
                  setManifestError(null);
                  setManifestSuccess(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer border-0"
              >
                🏷️ 载入《资产自动命名器》清单示例 (Executable Skill)
              </button>
            </div>

            <div className="mt-4">
              <textarea
                value={manifestInput}
                onChange={(e) => setManifestInput(e.target.value)}
                placeholder="在此粘贴 JSON 清单代码..."
                rows={12}
                className="w-full font-mono text-xs p-4 bg-slate-950 text-slate-300 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none leading-relaxed"
              />
            </div>

            {manifestError && (
              <div className="mt-3 p-4 bg-rose-50 text-rose-800 text-xs font-medium rounded-2xl border border-rose-100 whitespace-pre-wrap leading-relaxed">
                ❌ {manifestError}
              </div>
            )}

            {manifestSuccess && (
              <div className="mt-3 p-4 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-2xl border border-emerald-100 leading-relaxed flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>🎉 扩展清单验证通过并成功安装到内核注册表中！该扩展包含的技能也已同步动态激活。</span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setManifestInput('');
                  setManifestError(null);
                  setManifestSuccess(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer bg-white"
              >
                清空输入
              </button>
              <button
                onClick={handleImportManifest}
                disabled={!manifestInput.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer flex items-center space-x-1 shadow-sm active:scale-98 border-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>导入并安装该扩展</span>
              </button>
            </div>
          </div>

          {/* Installed Manifests Management List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2 select-none">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>已安装的清单插件（{manifests.length} 个）</span>
            </h3>

            {manifests.length === 0 ? (
              <div className="py-12 text-center bg-white border border-slate-200/50 rounded-3xl p-6">
                <Bot className="w-12 h-12 text-slate-350 mx-auto stroke-1" />
                <p className="text-xs text-slate-400 mt-3 font-medium">
                  当前尚无任何通过 JSON 清单导入的扩展。请在上方贴入清单并点击导入。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manifests.map((manifest) => {
                  const status = getExtensionStatus(manifest.id);
                  const isEnabled = status.state === 'enabled';
                  return (
                    <div
                      key={manifest.id}
                      className="p-5 bg-white border border-slate-200/60 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-sm hover:border-slate-350 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="truncate pr-2">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5 truncate">
                              <span className="text-lg shrink-0">{manifest.icon || '🔌'}</span>
                              <span className="truncate">{manifest.name}</span>
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              ID: {manifest.id} | v{manifest.version}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {status.state === 'error' ? (
                              <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-md px-1.5 py-0.5" title={status.error || ''}>
                                ERROR
                              </span>
                            ) : isEnabled ? (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">
                                ENABLED
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5">
                                DISABLED
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50 border border-slate-100/60 p-3 rounded-xl min-h-[50px] block">
                          {manifest.description || '暂无描述信息。'}
                        </p>

                        {/* Contribution Summary */}
                        {manifest.contributes?.skills && manifest.contributes.skills.length > 0 && (
                          <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3 select-none">
                            <div className="text-[10px] font-bold text-indigo-600 flex items-center space-x-1">
                              <span>🛠️ 贡献的技能 ({manifest.contributes.skills.length})</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {manifest.contributes.skills.map((s: any) => (
                                <span key={s.id} className="text-[9px] px-2 py-0.5 font-medium bg-slate-100 border border-slate-200/40 text-slate-600 rounded-md" title={s.description}>
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100/65 mt-4 pt-3 shrink-0 select-none">
                        <button
                          onClick={() => handleUninstallExtension(manifest.id)}
                          className="px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border-0 bg-transparent"
                        >
                          卸载 (Uninstall)
                        </button>

                        <button
                          onClick={() => handleToggleExtension(manifest.id, status.state)}
                          disabled={status.state === 'error'}
                          className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                            status.state === 'error'
                              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                              : isEnabled
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200/60'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/60'
                          }`}
                        >
                          {isEnabled ? '禁用 (Disable)' : '启用 (Enable)'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {deletingPluginId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900">确认删除插件</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              您确定要删除该插件吗？自定义插件会从独立插件包目录中移除；官方插件仅管理员可维护。
            </p>
            <div className="flex items-center justify-end space-x-2 mt-5">
              <button
                onClick={() => setDeletingPluginId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingPluginId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plugin Modal */}
      {editingPlugin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 mx-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">修改插件属性</h3>
              <button
                onClick={() => setEditingPlugin(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <span className="text-lg">×</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Plugin Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">插件名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  placeholder="请输入插件名称"
                />
              </div>

              {/* Plugin Icon */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">插件图标</label>
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  placeholder="请输入表情或图标名称 (例如: 🎥, 🎯)"
                />
              </div>

              {/* Plugin Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">描述信息</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
                  placeholder="请输入描述信息"
                />
              </div>

              {/* Plugin Type / Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">插件类型</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'image', label: '图片类型', icon: '🖼️', desc: '用于生成/控制图像' },
                    { id: 'text', label: '文本类型', icon: '✍️', desc: '用于文本处理/提示' },
                    { id: 'video', label: '视频类型', icon: '🎥', desc: '用于视频运镜/调节' },
                    { id: 'all', label: '功能类型', icon: '🧩', desc: '用于多功能/混合工具' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditCategory(cat.id as 'text' | 'image' | 'video' | 'all')}
                      className={`flex flex-col items-center justify-center p-3 sm:p-3.5 border rounded-xl transition-all cursor-pointer text-center ${
                        editCategory === cat.id
                          ? 'border-indigo-500 bg-indigo-50/40 text-indigo-700 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base mb-1">{cat.icon}</span>
                      <span className="text-[11px] font-bold">{cat.label}</span>
                      <span className="text-[9px] text-slate-400 mt-1 leading-tight block">
                        {cat.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingPlugin(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Plugin Modal (Figure 1 Form as a modal dialog) */}
      {showSavePluginModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 mx-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <Save className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">另存为自定义插件</h3>
              </div>
              <button
                onClick={() => setShowSavePluginModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer border-0 bg-transparent flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                💾 <strong>打包与注册：</strong>将当前的测试代码与配置保存为一个全新的、可随时在系统对话和工作流中调用的多模态自定义插件。
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">图标</label>
                  <input
                    type="text"
                    value={saveFormIcon}
                    onChange={(e) => setSaveFormIcon(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all text-center font-bold"
                    placeholder="✨"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">插件名称</label>
                  <input
                    type="text"
                    value={saveFormName}
                    onChange={(e) => setSaveFormName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all font-semibold"
                    placeholder="例如: 高级数字时钟"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">插件分类</label>
                <select
                  value={saveFormCategory}
                  onChange={(e) => setSaveFormCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">通用插件 (All)</option>
                  <option value="text">文字大模型辅助 (Text)</option>
                  <option value="image">图像延展画布 (Image)</option>
                  <option value="video">视频运镜剪辑 (Video)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">插件功能描述</label>
                <textarea
                  value={saveFormDesc}
                  onChange={(e) => setSaveFormDesc(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
                  placeholder="简短说明插件所解决的业务需求..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowSavePluginModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-0"
              >
                取消
              </button>
              <button
                onClick={() => handleWorkshopSave(true)}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center space-x-1 cursor-pointer border-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>保存并部署为全局可用插件</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

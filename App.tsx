
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { Layout } from './components/Layout';
import { SmartGenerationView } from './components/SmartGenerationView';
import { AuthPage } from './components/AuthPage';
import { ProfilePage } from './components/ProfilePage';
import { AdminPage } from './components/AdminPage';
import TeamManagementPage from './components/TeamManagementPage';
import { Codex } from './components/Codex';
import { TaskManager } from './components/TaskManager';
import { SkillsPage } from './components/SkillsPage';
import { DatabaseSetupGuide } from './components/DatabaseSetupGuide';
import { DEFAULT_CONFIG } from './constants';
import { Config, HistoryItem, SmartImageConfig, SmartVideoConfig, CameraParams, PipelineData } from './types';
import { safeJson } from './lib/fetch';
import {
  applyImageGenerationDefaults,
  applyVideoGenerationDefaults,
  getGenerationDefaultsSignature,
} from './lib/modelOptions';

const FALLBACK_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const FALLBACK_VIDEO_MODEL = 'seedance2.0';
const SMART_HISTORY_CACHE_KEY = 'smartHistory';
const LOCAL_PENDING_HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const isObsoletePlaceholderHistoryItem = (item: any) => {
  const config = item?.config || {};
  const type = String(item?.type || '').toLowerCase();
  const title = String(config.title || '').trim().toLowerCase();
  const text = String(item?.revisedPrompt || item?.prompt || config.prompt || '').trim();
  const hasMedia = Boolean(item?.imageUrl || item?.videoUrl || item?.url || item?.ossUrl);
  const hasMeaningfulRole = Boolean(
    config.isIntegratedModelNode ||
    config.isSkillNode ||
    config.isPipelineNode ||
    config.isPlaceholder ||
    config.isUpload ||
    config.isManualPlaceholder ||
    config.isManualNode
  );

  return (
    type === 'gen_script' &&
    !hasMeaningfulRole &&
    !hasMedia &&
    (!text || ['new node', 'script gen', 'untitled node'].includes(title))
  );
};

const getCachedSmartHistory = (): HistoryItem[] => {
  try {
    const saved = localStorage.getItem(SMART_HISTORY_CACHE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Boolean)
      .filter((item: any) => {
        const url = item.imageUrl || item.videoUrl || '';
        return !String(url).startsWith('data:') && !isObsoletePlaceholderHistoryItem(item);
      });
  } catch (e) {
    console.error('Failed to load smartHistory from localStorage:', e);
    return [];
  }
};

const isPendingLocalHistoryItem = (item: HistoryItem) => {
  const status = String(item?.status || '').toLowerCase();
  const ts = Number(item?.timestamp || 0);
  const isRecent = ts > 0 && Date.now() - ts < LOCAL_PENDING_HISTORY_MAX_AGE_MS;
  const mediaUrl = String((item as any)?.imageUrl || (item as any)?.videoUrl || (item as any)?.url || '');

  return (
    (['loading', 'processing', 'running', 'pending'].includes(status) && isRecent) ||
    mediaUrl.startsWith('blob:') ||
    mediaUrl.startsWith('data:') ||
    ((item as any)?.pendingCloudSync === true && isRecent)
  );
};

const pruneForLocalHistoryCache = (obj: any, depth: number = 0): any => {
  if (depth > 5) return null;
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((entry) => pruneForLocalHistoryCache(entry, depth + 1));

  const next = { ...obj };
  for (const [key, value] of Object.entries(next)) {
    if (typeof value === 'string' && value.startsWith('data:')) {
      next[key] = '';
    } else if (value && typeof value === 'object') {
      next[key] = pruneForLocalHistoryCache(value, depth + 1);
    }
  }
  return next;
};

const resolveActiveImageDefaultsModel = (config: Config, currentModel?: string) => {
  if (!currentModel || currentModel === FALLBACK_IMAGE_MODEL) {
    return config?.image?.model || FALLBACK_IMAGE_MODEL;
  }
  return currentModel;
};

const resolveActiveVideoDefaultsModel = (config: Config, currentModel?: string) => {
  return currentModel || config?.videoSeedance?.model || config?.video?.model || FALLBACK_VIDEO_MODEL;
};

const createInitialSmartImageConfig = (config: Config = DEFAULT_CONFIG): SmartImageConfig =>
  applyImageGenerationDefaults(
    {
      prompt: '',
      aspectRatio: '1:1',
      imageSize: '1K',
      gptSize: '1024x1536',
      gptQuality: 'auto',
      gptFormat: 'jpeg',
      referenceImages: [],
      model: config?.image?.model || FALLBACK_IMAGE_MODEL,
    },
    config,
    config?.image?.model || FALLBACK_IMAGE_MODEL,
  ) as SmartImageConfig;

const createInitialSmartVideoConfig = (config: Config = DEFAULT_CONFIG): SmartVideoConfig =>
  applyVideoGenerationDefaults(
    {
      prompt: '',
      resolution: '720p',
      aspectRatio: '16:9',
      duration: '5',
      model: config?.videoSeedance?.model || FALLBACK_VIDEO_MODEL,
      videoMode: 'all-around',
    },
    config,
    config?.videoSeedance?.model || FALLBACK_VIDEO_MODEL,
  ) as SmartVideoConfig;

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('token');
    if (saved && saved !== 'guest') {
      return saved;
    }
    return null;
  });
  const [user, setUser] = useState<any>(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (savedToken && savedToken !== 'guest' && savedUser) {
        return JSON.parse(savedUser);
      }
      return null;
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
      return null;
    }
  });

  const [mainTab, setMainTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('share_media_id')) return 'mycompany';
    return 'space';
  });
  const [smartHistory, setSmartHistory] = useState<HistoryItem[]>(() => getCachedSmartHistory());

  // Persist smartHistory to localStorage (with safety, pruning and debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Local history is only a cache/unsynced fallback. The database remains authoritative.
        const prunedHistory = smartHistory
          .filter((item) => !isObsoletePlaceholderHistoryItem(item))
          .slice(0, 30)
          .map((item) => pruneForLocalHistoryCache(item));
        localStorage.setItem(SMART_HISTORY_CACHE_KEY, JSON.stringify(prunedHistory));
      } catch (e) {
        console.error('Failed to save smartHistory to localStorage:', e);
        try {
          // Emergency fallback: only keep last 5 items
          localStorage.setItem(SMART_HISTORY_CACHE_KEY, JSON.stringify(smartHistory.slice(0, 5).map(item => ({
            ...item,
            imageUrl: item.imageUrl?.startsWith('data:') ? '' : item.imageUrl,
            videoUrl: item.videoUrl?.startsWith('data:') ? '' : item.videoUrl
          }))));
        } catch (innerE) {
          console.warn('Clearing smartHistory from localStorage due to persistent quota issues');
          localStorage.removeItem(SMART_HISTORY_CACHE_KEY);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [smartHistory]);
  const [latestPipeline, setLatestPipeline] = useState<PipelineData | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const refreshState = async () => {
    if (!token) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Re-fetch user profile
      const userRes = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });

      if (userRes.status === 401 || userRes.status === 404) {
        handleLogout();
        clearTimeout(timeoutId);
        return;
      }
      
      if (userRes.ok) {
        const data = await safeJson(userRes);
        if (data) {
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        }
      }

      // Also re-fetch global config
      const configRes = await fetch('/api/user/global-api-config', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      
      if (configRes.ok) {
        const globalConfig = await safeJson(configRes);
        // Merge with DEFAULT_CONFIG to ensure all keys (especially new ones like gptImage) exist
        setConfig(prev => {
          const newConfig = { ...DEFAULT_CONFIG, ...prev };
          if (globalConfig && Object.keys(globalConfig).length > 0) {
            ['script', 'image', 'video', 'videoVeoFast', 'videoSeedance', 'videoSeedanceMini', 'gptImage', 'claudeSonnet'].forEach(key => {
              const moduleKey = key as keyof Config;
              if (globalConfig[key]) {
                 newConfig[moduleKey] = { ...newConfig[moduleKey], ...globalConfig[key] };
              }
            });
            if (globalConfig.customInterfaces) {
              newConfig.customInterfaces = { ...newConfig.customInterfaces, ...globalConfig.customInterfaces };
            }
          }
          return newConfig;
        });
      }
      
      clearTimeout(timeoutId);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to refresh state:', err);
      }
    }
  };

  const refreshUser = refreshState;

  const deductPoints = async (amount: number, reason: string, taskId?: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: '未登录' };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch('/api/user/deduct-points', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ amount, reason, taskId }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await safeJson(res);
      if (res.ok) {
        if (data && data.remainingPoints !== undefined) {
          setUser((prev: any) => {
            if (!prev) return prev;
            const updated = { ...prev };
            if (data.usingTeamPoints) {
              if (updated.teamInfo) {
                updated.teamInfo = { ...updated.teamInfo, teamPoints: data.remainingPoints };
              }
            } else {
              updated.points = data.remainingPoints;
            }
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
          });
        }
        return { success: true };
      } else {
        return { success: false, error: data?.error || '扣费失败' };
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to deduct points:', err);
      }
      return { success: false, error: '网络错误，请稍后重试' };
    }
  };

  const refundPoints = async (amount: number, reason: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch('/api/user/refund-points', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ amount, reason }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await safeJson(res);
      if (res.ok) {
        if (data && data.remainingPoints !== undefined) {
          setUser((prev: any) => {
            if (!prev) return prev;
            const updated = { ...prev };
            // The server returns remainingPoints for the targetId (leader or self)
            // If the user has a leader, we assume it was a team refund if the server says so
            // Actually, the server doesn't return usingTeamPoints for refund yet.
            // But we can check if the user has a leader.
            if (updated.teamInfo) {
              updated.teamInfo = { ...updated.teamInfo, teamPoints: data.remainingPoints };
            } else {
              updated.points = data.remainingPoints;
            }
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
          });
        }
        return true;
      }
      return false;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to refund points:', err);
      }
      return false;
    }
  };

  const loadData = async () => {
    if (!token) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const [historyRes, pipelinesRes] = await Promise.all([
        fetch('/api/user/history', { 
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        }),
        fetch('/api/user/pipelines', { 
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        })
      ]);
      clearTimeout(timeoutId);

      if (historyRes.status === 401 || pipelinesRes.status === 401 || historyRes.status === 404 || pipelinesRes.status === 404) {
        handleLogout();
        return;
      }

      if (historyRes.ok) {
        const history = await safeJson(historyRes);
        if (Array.isArray(history)) {
          setSmartHistory(prev => {
            // Database history is authoritative for logged-in users. Local cache only keeps
            // very recent unfinished work that has not reached the server yet.
            const localBaselineUnfiltered = prev.length > 0 ? prev : getCachedSmartHistory();
            const localBaseline = Array.isArray(localBaselineUnfiltered)
              ? localBaselineUnfiltered.filter(Boolean)
              : [];

            const serverHistory = history.filter(Boolean);
            const serverIds = new Set(serverHistory.map((item: HistoryItem) => item.id));
            const localPending = localBaseline.filter((localItem: HistoryItem) =>
              !serverIds.has(localItem.id) && isPendingLocalHistoryItem(localItem)
            );
            const merged = [...serverHistory, ...localPending];

            // 4. Fallback grid layout: Make sure every item has a valid coordinate to avoid stacking at (0,0)
            const columns = 4;
            const gapX = 400;
            const gapY = 560;
            const startX = 100;
            const startY = 100;

            const occupiedSlots = new Set<string>();

            // Collect existing valid positions
            merged.forEach(item => {
              if (item.position && (item.position.x !== 0 || item.position.y !== 0)) {
                const col = Math.round((item.position.x - startX) / gapX);
                const row = Math.round((item.position.y - startY) / gapY);
                if (col >= 0 && row >= 0) {
                  occupiedSlots.add(`${col},${row}`);
                }
              }
            });

            // Assign free positions to items without predefined positions
            const sortedItems = [...merged].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            let gridCol = 0;
            let gridRow = 0;
            const assignedPositions = new Map<string, { x: number; y: number }>();

            sortedItems.forEach(item => {
              const hasPosition = item.position && (item.position.x !== 0 || item.position.y !== 0);
              if (!hasPosition) {
                while (occupiedSlots.has(`${gridCol},${gridRow}`)) {
                  gridCol++;
                  if (gridCol >= columns) {
                    gridCol = 0;
                    gridRow++;
                  }
                }
                const newPos = {
                  x: startX + gridCol * gapX,
                  y: startY + gridRow * gapY
                };
                assignedPositions.set(item.id, newPos);
                occupiedSlots.add(`${gridCol},${gridRow}`);
                
                gridCol++;
                if (gridCol >= columns) {
                  gridCol = 0;
                  gridRow++;
                }
              }
            });

            const finalMerged = merged.map(item => {
              if (assignedPositions.has(item.id)) {
                return {
                  ...item,
                  position: assignedPositions.get(item.id)
                };
              }
              return item;
            }).filter((item) => !isObsoletePlaceholderHistoryItem(item));

            // Sort by timestamp descending
            return finalMerged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          });
        }
      }

      if (pipelinesRes.ok) {
        const pipelines = await safeJson(pipelinesRes);
        if (Array.isArray(pipelines)) {
          setLatestPipeline(pipelines.length > 0 ? pipelines[0] : null);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load data:', err);
      }
    }
  };

  // Load smart history and latest pipeline from MySQL with automatic active-tab polling
  useEffect(() => {
    loadData();
    refreshUser();

    if (!token) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData();
        refreshUser();
      }
    }, 10000); // Poll every 10 seconds to keep different browsers in sync

    return () => clearInterval(intervalId);
  }, [token]);

  const [smartImageConfig, setSmartImageConfig] = useState<SmartImageConfig>(() => createInitialSmartImageConfig());
  const [smartVideoConfig, setSmartVideoConfig] = useState<SmartVideoConfig>(() => createInitialSmartVideoConfig());
  const [smartCameraParams, setSmartCameraParams] = useState<CameraParams | undefined>();
  const [hasPlatformKey, setHasPlatformKey] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const appliedGenerationDefaultsRef = React.useRef<{ image?: string; video?: string }>({});

  useEffect(() => {
    const activeModel = resolveActiveImageDefaultsModel(config, smartImageConfig.model);
    const signature = getGenerationDefaultsSignature(config, activeModel, 'image');
    if (appliedGenerationDefaultsRef.current.image === signature) return;

    appliedGenerationDefaultsRef.current.image = signature;
    setSmartImageConfig((prev) =>
      applyImageGenerationDefaults(
        prev,
        config,
        resolveActiveImageDefaultsModel(config, prev.model),
      ) as SmartImageConfig,
    );
  }, [config, smartImageConfig.model]);

  useEffect(() => {
    const activeModel = resolveActiveVideoDefaultsModel(config, smartVideoConfig.model);
    const signature = getGenerationDefaultsSignature(config, activeModel, 'video');
    if (appliedGenerationDefaultsRef.current.video === signature) return;

    appliedGenerationDefaultsRef.current.video = signature;
    setSmartVideoConfig((prev) =>
      applyVideoGenerationDefaults(
        prev,
        config,
        resolveActiveVideoDefaultsModel(config, prev.model),
      ) as SmartVideoConfig,
    );
  }, [config, smartVideoConfig.model]);

  useEffect(() => {
    const checkPlatformKey = async () => {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasPlatformKey(hasKey);
      }
    };
    checkPlatformKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasPlatformKey(true);
    }
  };

  useEffect(() => {
    const fetchGlobalConfig = async () => {
      if (!token) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch('/api/user/global-api-config', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.status === 401 || res.status === 404) {
          handleLogout();
          return;
        }
        if (res.ok) {
          const globalConfig = await safeJson(res);
          if (globalConfig && Object.keys(globalConfig).length > 0) {
            setConfig(prev => {
              const newConfig = { ...prev };
              ['script', 'image', 'video', 'videoVeoFast', 'videoSeedance', 'videoSeedanceMini', 'gptImage', 'claudeSonnet'].forEach(key => {
                const moduleKey = key as keyof Config;
                if (globalConfig[key]) {
                   newConfig[moduleKey] = { ...newConfig[moduleKey], ...globalConfig[key] };
                }
              });
              if (globalConfig.customInterfaces) {
                newConfig.customInterfaces = { ...newConfig.customInterfaces, ...globalConfig.customInterfaces };
              }
              return newConfig;
            });
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch global config:', err);
        }
      }
    };
    fetchGlobalConfig();
  }, [token]);

  useEffect(() => {
    // Global config is fetched and set in the other useEffect
  }, [config]);

  const [lastSmartTab, setLastSmartTab] = useState<'image' | 'video' | 'script' | 'director'>('image');
  const [selectedTaskData, setSelectedTaskData] = useState<any>(null);

  const [forwardMaterial, setForwardMaterial] = useState<{ url?: string; name: string; type: string; content?: string } | null>(null);

  const handleNavigate = React.useCallback((tab: string, data?: any) => {
    if (data) {
      if (data.type === 'forward_material') {
        setForwardMaterial({ url: data.url, name: data.name, type: data.materialType, content: data.content });
        setMainTab('mycompany');
        return;
      }
      setSelectedTaskData({ ...data, _navId: Date.now() });
    } else {
      setSelectedTaskData(null);
    }
    
    if (tab === 'image' || tab === 'video' || tab === 'script' || tab === 'director') {
      setLastSmartTab(tab as any);
      setMainTab('space');
    } else {
      setMainTab(tab);
    }
  }, []);

  const handleSetMainTab = React.useCallback((tab: string) => {
    setSelectedTaskData(null);
    if (tab === 'image' || tab === 'video' || tab === 'script' || tab === 'director') {
      setLastSmartTab(tab as any);
      setMainTab('space');
    } else {
      setMainTab(tab);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'image' || mainTab === 'video' || mainTab === 'script' || mainTab === 'director') {
      setLastSmartTab(mainTab as any);
    }
  }, [mainTab]);

  const handleLogin = (newToken: string, newUser: any) => {
    localStorage.removeItem('isGuest');
    // Clear any residual data from a previous session
    localStorage.removeItem(SMART_HISTORY_CACHE_KEY);
    setSmartHistory([]);
    setLatestPipeline(null);
    setSelectedTaskData(null);
    
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(SMART_HISTORY_CACHE_KEY);
    setToken(null);
    setUser(null);
    setSmartHistory([]);
    setLatestPipeline(null);
    setSelectedTaskData(null);
    appliedGenerationDefaultsRef.current = {};
    setSmartImageConfig(createInitialSmartImageConfig(DEFAULT_CONFIG));
    setSmartVideoConfig(createInitialSmartVideoConfig(DEFAULT_CONFIG));
    setSmartCameraParams(undefined);
    setMainTab('space');
  };

  const handleTaskDelete = (id: string, type: string) => {
    if (selectedTaskData?.id === id) setSelectedTaskData(null);
    
    // Also remove from smartHistory if it's an image/video task
    if (type === 'image' || type === 'video') {
      setSmartHistory(prev => prev.filter(item => item.id !== id));
    }

    if (type === 'script') {
      if (latestPipeline?.id === id) {
        setLatestPipeline(null);
        loadData(); // Re-fetch to get the new latest pipeline
      }
    }
  };

  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch('/api/health');
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setDbStatus(data);
        } else {
          // If not JSON, it might be an HTML error page from the proxy/server
          console.warn('Received non-JSON response from /api/health');
          setDbStatus({ 
            database: 'disconnected', 
            error: `Server returned an unexpected response (Status: ${res.status}). This often happens during server startup or if the database is unreachable.` 
          });
        }
      } catch (err) {
        console.error('Failed to check DB status:', err);
        setDbStatus({ 
          database: 'disconnected', 
          error: 'Could not connect to the server. Please wait a moment and try again.' 
        });
      }
    };
    checkDb();
  }, []);

  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        setMainTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('switch-main-tab', handleSwitch);
    return () => window.removeEventListener('switch-main-tab', handleSwitch);
  }, []);

  /* 
  if (dbStatus && dbStatus.database === 'disconnected') {
    return <DatabaseSetupGuide error={dbStatus.error} deniedIp={dbStatus.deniedIp} onRetry={() => window.location.reload()} />;
  }
  */

  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <Layout 
      activeTab={mainTab} 
      setActiveTab={handleSetMainTab} 
      user={user} 
      onLogout={handleLogout}
    >
      <div className="h-full flex overflow-hidden relative">
        {/* 左侧主内容区 */}
        <div className="h-full w-full overflow-hidden flex flex-col border-r border-gray-100">
          <div className="h-full w-full relative">
            {/* Always mounted workspaces to prevent background task cancellation */}
            <div className={(mainTab === 'space') ? 'contents' : 'hidden'}>
              <SmartGenerationView 
                key={`smart-persistent-${user?.id || 'guest'}`}
                mainTab={lastSmartTab}
                setMainTab={setMainTab}
                config={config}
                history={smartHistory}
                setHistory={setSmartHistory}
                imageConfig={smartImageConfig}
                setImageConfig={setSmartImageConfig}
                videoConfig={smartVideoConfig}
                setVideoConfig={setSmartVideoConfig}
                cameraParams={smartCameraParams}
                setCameraParams={setSmartCameraParams}
                initialData={selectedTaskData}
                deductPoints={deductPoints}
                refundPoints={refundPoints}
                userPoints={Math.max(user?.points || 0, user?.teamInfo?.teamPoints || 0)}
                onNavigate={handleNavigate}
                user={user}
                projectAssets={latestPipeline?.assets || []}
                isCollaborationTabActive={false}
              />
            </div>

            <AnimatePresence mode="wait">
              {!['space'].includes(mainTab) && (
                <motion.div
                  key={mainTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-full"
                >
                  {mainTab === 'mycompany' && (
                    <div className="h-full w-full bg-white flex flex-col overflow-hidden">
                      <Codex
                        key={`standalone-codex-${user?.id || "guest"}`}
                        userId={user?.id}
                        config={config}
                        userPoints={Math.max(user?.points || 0, user?.teamInfo?.teamPoints || 0)}
                        deductPoints={deductPoints}
                        refundPoints={refundPoints}
                        isActive={mainTab === 'mycompany'}
                        initialMaterial={forwardMaterial}
                        onClearInitialMaterial={() => setForwardMaterial(null)}
                        onNavigate={handleNavigate}
                        setHistory={setSmartHistory}
                      />
                    </div>
                  )}

                  {mainTab === 'tasks' && (
                    <TaskManager 
                      key={`tasks-${user?.id || 'guest'}`}
                      onNavigate={handleNavigate} 
                      activeTab={mainTab} 
                      onDelete={handleTaskDelete} 
                      user={user} 
                    />
                  )}

                  {mainTab === 'skills' && (
                    <SkillsPage 
                      key={`skills-${user?.id || 'guest'}`}
                      user={user}
                      onUserUpdate={refreshUser}
                    />
                  )}

                  {mainTab === 'profile' && (
                    <ProfilePage 
                      key={`profile-${user?.id || 'guest'}`}
                      onLogout={handleLogout} 
                      onUserUpdate={refreshUser} 
                    />
                  )}

                  {mainTab === 'admin' && (
                    <AdminPage 
                      key={`admin-${user?.id || 'guest'}`}
                      onUserUpdate={refreshUser} 
                      />
                    )}

                  {mainTab === 'leader' && (
                    <TeamManagementPage 
                      key={`leader-${user?.id || 'guest'}`}
                      user={user} 
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;


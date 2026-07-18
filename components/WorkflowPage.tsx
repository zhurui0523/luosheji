import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  Plus,
  Layers,
  FolderOpen,
  Calendar,
  AlertTriangle,
  Globe,
  Package,
  HardDrive
} from 'lucide-react';

interface WorkflowPageProps {
  user: any;
}

interface CanvasRecord {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  createdAt?: number | string;
  history?: any[];
  creatorId?: string | number;
  creatorName?: string;
  isShared?: boolean;
  isWorkflowPackage?: boolean;
  plugAndPlay?: boolean;
  source?: string;
  packageId?: string;
  packagePath?: string;
}

const DEFAULT_CANVAS: CanvasRecord = {
  id: "default",
  name: "默认创作",
  createdAt: Date.now(),
};

const CANVAS_INDEX_STORAGE_KEY = "aistudio_canvases";
const ACTIVE_CANVAS_STORAGE_KEY = "aistudio_active_canvas_id";
const CANVAS_INDEX_PREF_KEY = "aistudio_canvases_v2";

const normalizeCanvasId = (id?: string | null) => id || "default";

const toLightweightCanvasIndex = (canvases: CanvasRecord[]) =>
  canvases.map((canvas) => ({
    id: canvas.id,
    name: canvas.name,
    thumbnailUrl: canvas.thumbnailUrl,
    createdAt: canvas.createdAt,
    source: canvas.source,
    packageId: canvas.packageId,
    packagePath: canvas.packagePath,
    isWorkflowPackage: canvas.isWorkflowPackage,
    plugAndPlay: canvas.plugAndPlay,
    history: [],
  }));

const getCloudHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : null;
};

const getCanvasMediaThumbnail = (items: any[]) => {
  const first = items.find((item) => item?.imageUrl || item?.videoUrl || item?.ossUrl || item?.arkOriginalUrl);
  return first ? (first.imageUrl || first.videoUrl || first.ossUrl || first.arkOriginalUrl) : null;
};

const getCanvasHistory = (items: any[], canvasId: string) =>
  (items || []).filter((item) => normalizeCanvasId(item?.canvasId) === normalizeCanvasId(canvasId));

const inferCanvasName = (canvasId: string, items: any[], existingName?: string) => {
  if (existingName && existingName !== DEFAULT_CANVAS.name) return existingName;
  if (canvasId === "default") return existingName || DEFAULT_CANVAS.name;
  const seed = items.find((item) => item?.config?.title || item?.revisedPrompt || item?.prompt);
  const candidate = String(seed?.config?.title || seed?.revisedPrompt || seed?.prompt || "").trim();
  return candidate ? candidate.slice(0, 15) : `Canvas ${canvasId.slice(-6)}`;
};

const mergeCanvasMetadata = (base: CanvasRecord[], cloud: CanvasRecord[]) => {
  const merged = new Map<string, CanvasRecord>();
  base.forEach((canvas) => merged.set(normalizeCanvasId(canvas.id), canvas));
  cloud.forEach((canvas) => {
    const id = normalizeCanvasId(canvas.id);
    const existing = merged.get(id);
    merged.set(id, {
      ...existing,
      ...canvas,
      id,
      name: canvas.name || existing?.name || (id === "default" ? DEFAULT_CANVAS.name : `Canvas ${id.slice(-6)}`),
      history: existing?.history || [],
      createdAt: canvas.createdAt || existing?.createdAt || Date.now(),
    });
  });
  return Array.from(merged.values());
};

const buildCanvasIndexFromHistory = (items: any[], metadata: CanvasRecord[]) => {
  const metaById = new Map(metadata.map((canvas) => [normalizeCanvasId(canvas.id), canvas]));
  const ids = new Set<string>(["default"]);
  metadata.forEach((canvas) => ids.add(normalizeCanvasId(canvas.id)));
  (items || []).forEach((item) => ids.add(normalizeCanvasId(item?.canvasId)));

  return Array.from(ids).map((id) => {
    const existing = metaById.get(id);
    const canvasHistory = getCanvasHistory(items, id);
    const createdAt = canvasHistory.reduce((min, item) => {
      const ts = Number(item?.timestamp || 0);
      return ts > 0 ? Math.min(min, ts) : min;
    }, Number.POSITIVE_INFINITY);

    return {
      ...(existing || {}),
      id,
      name: inferCanvasName(id, canvasHistory, existing?.name),
      history: canvasHistory,
      thumbnailUrl: getCanvasMediaThumbnail(canvasHistory) || existing?.thumbnailUrl || null,
      createdAt: existing?.createdAt || (Number.isFinite(createdAt) ? createdAt : Date.now()),
      source: existing?.source || "cloud_canvas",
    };
  });
};

export const WorkflowPage: React.FC<WorkflowPageProps> = ({ user }) => {
  const [localCanvases, setLocalCanvases] = useState<CanvasRecord[]>([]);
  const [sharedCanvases, setSharedCanvases] = useState<CanvasRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const saveCanvasIndex = async (nextCanvases: CanvasRecord[]) => {
    const lightweight = toLightweightCanvasIndex(nextCanvases);
    try {
      localStorage.setItem(CANVAS_INDEX_STORAGE_KEY, JSON.stringify(lightweight));
    } catch (e) {
      console.warn("Failed to cache canvas index locally:", e);
    }

    const headers = getCloudHeaders();
    if (!headers) return;

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pref_key: CANVAS_INDEX_PREF_KEY,
          pref_value: JSON.stringify(lightweight),
        }),
      });
    } catch (e) {
      console.warn("Failed to sync canvas index preference:", e);
    }
  };

  const refreshLocalCanvases = async () => {
    const headers = getCloudHeaders();
    if (headers) {
      try {
        const [historyRes, prefRes] = await Promise.all([
          fetch('/api/user/history', { headers }),
          fetch('/api/user/preferences', { headers }),
        ]);

        const history = historyRes.ok ? await historyRes.json() : [];
        const prefData = prefRes.ok ? await prefRes.json() : null;
        const prefValue = prefData?.preferences?.find((pref: any) => pref.pref_key === CANVAS_INDEX_PREF_KEY)?.pref_value;
        const cloudMetadata = prefValue ? JSON.parse(prefValue) : [];
        const mergedMetadata = mergeCanvasMetadata([DEFAULT_CANVAS], Array.isArray(cloudMetadata) ? cloudMetadata : []);
        const cloudCanvases = buildCanvasIndexFromHistory(Array.isArray(history) ? history : [], mergedMetadata);

        setLocalCanvases(cloudCanvases);
        try {
          localStorage.setItem(CANVAS_INDEX_STORAGE_KEY, JSON.stringify(toLightweightCanvasIndex(cloudCanvases)));
        } catch (cacheErr) {
          console.warn("Failed to write cloud canvas index cache:", cacheErr);
        }
        return;
      } catch (e) {
        console.error("Failed to load cloud canvases in WorkflowPage:", e);
      }
    }

    try {
      const saved = localStorage.getItem(CANVAS_INDEX_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      setLocalCanvases(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      console.error("Failed to load local canvases in WorkflowPage:", e);
      setLocalCanvases([]);
    }
  };

  const fetchSharedCanvases = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/shared-canvases', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.canvases)) {
          setSharedCanvases(data.canvases);
        }
      }
    } catch (e) {
      console.error("Failed to fetch shared canvases:", e);
    }
  };

  useEffect(() => {
    refreshLocalCanvases();
    fetchSharedCanvases();
  }, []);

  const getCanvasItemCount = (canvas: CanvasRecord) => {
    const canvasId = canvas.id || "default";
    const hasInlineHistory = Array.isArray(canvas.history) && canvas.history.length > 0;
    let historyList = hasInlineHistory ? canvas.history || [] : [];

    if (!hasInlineHistory && !getCloudHeaders()) {
      try {
        const savedHist = localStorage.getItem(`aistudio_canvas_history_${canvasId}`);
        if (savedHist) {
          const parsed = JSON.parse(savedHist);
          if (Array.isArray(parsed)) {
            historyList = parsed;
          }
        }
      } catch (e) {
        console.warn("Failed to read canvas history:", e);
      }
    }

    return historyList.filter((h: any) => {
      if (!h || h.hiddenFromCanvas || !h.position) return false;
      if (hasInlineHistory) return true;
      return (h.canvasId || "default") === (canvasId || "default");
    }).length;
  };

  const canDeleteCanvas = (canvas: CanvasRecord) => {
    if (canvas.id === "default") return false;
    if (!canvas.isShared) return true;
    return String(canvas.creatorId) === String(user?.id) || user?.role === "admin";
  };

  const handleDeleteCanvas = async (canvasId: string) => {
    try {
      const isSharedOrPackaged = sharedCanvases.some((c) => c.id === canvasId);
      if (isSharedOrPackaged) {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/shared-canvases/${canvasId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          await fetchSharedCanvases();
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || "删除共享画布失败");
        }
      } else {
        const headers = getCloudHeaders();
        if (headers) {
          const targetCanvas = localCanvases.find((canvas) => canvas.id === canvasId);
          const idsToDelete = (targetCanvas?.history || []).map((item) => item?.id).filter(Boolean);
          await Promise.all(
            idsToDelete.map((id) =>
              fetch(`/api/user/history/${id}`, {
                method: 'DELETE',
                headers,
              })
            )
          );

          const updated = localCanvases.filter((canvas) => canvas.id !== canvasId);
          const finalCanvases = updated.length > 0 ? updated : [DEFAULT_CANVAS];
          setLocalCanvases(finalCanvases);
          await saveCanvasIndex(finalCanvases);

          const activeId = localStorage.getItem(ACTIVE_CANVAS_STORAGE_KEY);
          if (activeId === canvasId) {
            localStorage.setItem(ACTIVE_CANVAS_STORAGE_KEY, "default");
            window.dispatchEvent(new CustomEvent('switch-to-canvas', { detail: { canvasId: 'default' } }));
          }
          setDeleteConfirmId(null);
          return;
        }

        const saved = localStorage.getItem(CANVAS_INDEX_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.filter((c: CanvasRecord) => c.id !== canvasId);
            localStorage.setItem(CANVAS_INDEX_STORAGE_KEY, JSON.stringify(updated));
            localStorage.removeItem(`aistudio_canvas_history_${canvasId}`);

            const activeId = localStorage.getItem(ACTIVE_CANVAS_STORAGE_KEY);
            if (activeId === canvasId) {
              localStorage.setItem(ACTIVE_CANVAS_STORAGE_KEY, "default");
              window.dispatchEvent(new CustomEvent('switch-to-canvas', { detail: { canvasId: 'default' } }));
            }
          }
        }
        refreshLocalCanvases();
      }
      setDeleteConfirmId(null);
    } catch (e) {
      console.error("Failed to delete canvas:", e);
    }
  };

  const handleAddCanvas = async (canvas: CanvasRecord) => {
    try {
      const headers = getCloudHeaders();
      const saved = localStorage.getItem(CANVAS_INDEX_STORAGE_KEY);
      const canvasesList: CanvasRecord[] = saved ? JSON.parse(saved) : [];
      const newCanvasId = "canvas_" + Date.now();

      let originalHistory: any[] = Array.isArray(canvas.history) ? canvas.history : [];
      if (originalHistory.length === 0 && !headers) {
        try {
          const savedHist = localStorage.getItem(`aistudio_canvas_history_${canvas.id}`);
          if (savedHist) {
            const parsed = JSON.parse(savedHist);
            if (Array.isArray(parsed)) {
              originalHistory = parsed;
            }
          }
        } catch (e) {
          console.warn("Failed to copy canvas history:", e);
        }
      }

      const duplicatedHistory = originalHistory.map((item: any) => ({
        ...item,
        id: item?.id ? `${item.id}_copy_${Math.random().toString(36).substring(2, 9)}` : undefined,
        canvasId: newCanvasId
      }));

      const newCanvas: CanvasRecord = {
        id: newCanvasId,
        name: canvas.name === "默认创作" ? "添加画布" : `${canvas.name} (自制)`,
        thumbnailUrl: canvas.thumbnailUrl || null,
        createdAt: Date.now(),
        history: [],
        source: canvas.packagePath ? "workflow_package_copy" : "canvas_copy",
        packagePath: canvas.packagePath,
        packageId: canvas.packageId
      };

      if (headers) {
        await Promise.all(
          duplicatedHistory.map((item) =>
            fetch('/api/user/history', {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(item),
            })
          )
        );
        const nextCanvases = [{ ...newCanvas, history: duplicatedHistory }, ...localCanvases];
        setLocalCanvases(nextCanvases);
        await saveCanvasIndex(nextCanvases);
      } else {
        localStorage.setItem(`aistudio_canvas_history_${newCanvasId}`, JSON.stringify(duplicatedHistory));
        localStorage.setItem(CANVAS_INDEX_STORAGE_KEY, JSON.stringify([newCanvas, ...canvasesList]));
      }

      localStorage.setItem(ACTIVE_CANVAS_STORAGE_KEY, newCanvasId);

      window.dispatchEvent(new CustomEvent('switch-to-canvas', { detail: { canvasId: newCanvasId, history: duplicatedHistory } }));
      window.dispatchEvent(new CustomEvent('switch-main-tab', { detail: { tab: 'space' } }));
    } catch (e) {
      console.error("Failed to add canvas:", e);
    }
  };

  const handleAddBlankCanvas = async () => {
    try {
      const saved = localStorage.getItem(CANVAS_INDEX_STORAGE_KEY);
      const canvasesList: CanvasRecord[] = saved ? JSON.parse(saved) : [];
      const newCanvasId = "canvas_" + Date.now();
      const newCanvas: CanvasRecord = {
        id: newCanvasId,
        name: "添加画布",
        history: [],
        createdAt: Date.now(),
        source: getCloudHeaders() ? "cloud_canvas" : "local_canvas"
      };

      if (getCloudHeaders()) {
        const nextCanvases = [newCanvas, ...localCanvases];
        setLocalCanvases(nextCanvases);
        await saveCanvasIndex(nextCanvases);
      } else {
        localStorage.setItem(CANVAS_INDEX_STORAGE_KEY, JSON.stringify([newCanvas, ...canvasesList]));
      }
      localStorage.setItem(ACTIVE_CANVAS_STORAGE_KEY, newCanvasId);

      window.dispatchEvent(new CustomEvent('switch-to-canvas', { detail: { canvasId: newCanvasId } }));
      window.dispatchEvent(new CustomEvent('switch-main-tab', { detail: { tab: 'space' } }));
    } catch (e) {
      console.error("Failed to add blank canvas:", e);
    }
  };

  const sourceLabel = (canvas: CanvasRecord) => {
    if (canvas.packagePath) return "即插即用工作流包";
    if (canvas.isShared) return "公开共享画布";
    return "本地画布";
  };

  const creatorLabel = (canvas: CanvasRecord) => {
    if (canvas.isShared) return `分享者：${canvas.creatorName || "未知用户"}`;
    if (canvas.id === "default") return "系统默认";
    return "团队自制";
  };

  const descriptionLabel = (canvas: CanvasRecord) => {
    if (canvas.packagePath) {
      return "独立工作流包。可被自动发现、添加到画布，也可以从对应用户包目录中热拔插移除。";
    }
    if (canvas.isShared) {
      return `由【${canvas.creatorName || "未知用户"}】分享的创意设计工作流。包含已编辑的素材图层，点击添加即可二次创作。`;
    }
    if (canvas.id === "default") {
      return "默认创作画布，提供零配置的创作入口。";
    }
    return "个性化工作流。包含已编辑的素材图层，方便随时二次编辑与影视生产。";
  };

  const allCanvases = [
    ...(localCanvases.length > 0 ? localCanvases : [DEFAULT_CANVAS]),
    ...sharedCanvases
  ];

  const filteredCanvases = allCanvases.filter((canvas) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [
      canvas.name,
      canvas.creatorName,
      canvas.packagePath,
      canvas.source
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fcfcfd]">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
        <button
          onClick={handleAddBlankCanvas}
          className="px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-100"
        >
          <Plus className="w-3.5 h-3.5" />
          新建空白画布
        </button>

        <div className="relative flex items-center w-full sm:w-64 md:w-72 group">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 transition-colors group-focus-within:text-indigo-500 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索画布或工作流包..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/40 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none rounded-xl transition-all shadow-2xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-2 mb-4">
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-800">创作画布列表</span>
            <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
              {filteredCanvases.length} 个项目
            </span>
          </div>

          {filteredCanvases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-3xl border border-gray-100/80 max-w-xl mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4 shadow-sm shadow-indigo-100">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">没有找到匹配的画布</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                未找到包含“{searchQuery}”的画布或工作流包，请尝试其他搜索词。
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-6 px-4 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
              >
                清除搜索
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 animate-in fade-in duration-300">
              {filteredCanvases.map((canvas) => {
                const itemCount = getCanvasItemCount(canvas);
                const canDelete = canDeleteCanvas(canvas);

                return (
                  <div
                    key={`${canvas.packagePath || "canvas"}-${canvas.id}`}
                    className="w-full sm:w-[380px] p-5 bg-white border border-gray-100 rounded-2xl shadow-xs transition-all flex flex-col justify-between hover:shadow-md hover:translate-y-[-2px] min-h-[300px] shrink-0"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center min-w-0">
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center flex-wrap gap-1.5 leading-tight">
                              <span className="truncate">{canvas.name}</span>
                              {canvas.id === 'default' && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100/55 rounded-md shrink-0">
                                  官方默认
                                </span>
                              )}
                              {canvas.packagePath && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-100/55 rounded-md shrink-0">
                                  工作流包
                                </span>
                              )}
                              {canvas.isShared && !canvas.packagePath && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/55 rounded-md shrink-0">
                                  公开共享
                                </span>
                              )}
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                              <span className="mr-1 text-gray-300">👤</span>
                              {creatorLabel(canvas)}
                            </p>
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirmId(canvas.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                            title="删除画布"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-[12px] text-gray-600 mt-4 leading-relaxed bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100/40 min-h-[64px] block">
                        {descriptionLabel(canvas)}
                      </p>

                      <div className="mt-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 flex items-center">
                            <Layers className="w-3 h-3 mr-1 text-gray-400" />
                            素材统计
                          </span>
                          <span className="font-bold text-indigo-600">{itemCount} 个素材</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                            创建时间
                          </span>
                          <span className="text-gray-500">{new Date(canvas.createdAt || Date.now()).toLocaleDateString('zh-CN')}</span>
                        </div>
                        {canvas.packagePath && (
                          <div className="flex items-start justify-between gap-2 text-[10px]">
                            <span className="text-gray-400 flex items-center shrink-0">
                              <Package className="w-3 h-3 mr-1 text-violet-500" />
                              包路径
                            </span>
                            <span className="font-mono text-[9px] text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-1.5 py-0.5 truncate max-w-[230px]" title={canvas.packagePath}>
                              {canvas.packagePath}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 mt-5 pt-3.5">
                      <span className="text-[10px] text-gray-400 flex items-center font-semibold">
                        {canvas.packagePath ? (
                          <Package className="w-3.5 h-3.5 mr-1 text-violet-500" />
                        ) : canvas.isShared ? (
                          <Globe className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        ) : (
                          <HardDrive className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        )}
                        {sourceLabel(canvas)}
                      </span>

                      <button
                        onClick={() => handleAddCanvas(canvas)}
                        className="px-4 py-1.5 text-[11px] font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer flex items-center space-x-1 shadow-sm shadow-indigo-100"
                      >
                        <Plus className="w-3 h-3" />
                        <span>添加画布</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">确认删除这个画布吗？</h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  这会删除对应的共享画布记录；如果它来自工作流包，也会移除当前用户目录下的独立包文件。此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end space-x-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteCanvas(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-md shadow-red-100 cursor-pointer"
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

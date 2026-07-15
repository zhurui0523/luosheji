import React, { useState, useEffect, useRef } from 'react';
import { 
  Clapperboard, 
  ImageIcon, 
  Film, 
  LayoutDashboard,
  Settings,
  History,
  Library,
  User,
  ShieldCheck,
  LogOut,
  LayoutGrid,
  Zap,
  Database,
  AlertCircle,
  ShoppingBag,
  TrendingUp,
  Users,
  PenTool,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  Cpu,
  HelpCircle,
  MousePointer,
  Hand,
  ChevronDown,
  GitFork,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeJson } from '../lib/fetch';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: any;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  user, 
  onLogout,
}) => {
  const [dbStatus, setDbStatus] = useState<{ mode: string; mysqlConfigured: boolean } | null>(null);
  const [ossStatus, setOssStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isPopupActive, setIsPopupActive] = useState(false);
  const isCollapsed = true;
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'select' | 'pan'>('select');
  const [isCanvasSidebarOpen, setIsCanvasSidebarOpen] = useState(false);
  const [canvasLayoutMode, setCanvasLayoutMode] = useState<'mindmap' | 'bento' | 'semi_auto'>('mindmap');
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isTopLeftHovered, setIsTopLeftHovered] = useState(false);
  const topLeftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTopLeftMouseEnter = () => {
    if (topLeftTimeoutRef.current) {
      clearTimeout(topLeftTimeoutRef.current);
      topLeftTimeoutRef.current = null;
    }
    setIsTopLeftHovered(true);
  };

  const handleTopLeftMouseLeave = () => {
    if (topLeftTimeoutRef.current) {
      clearTimeout(topLeftTimeoutRef.current);
    }
    topLeftTimeoutRef.current = setTimeout(() => {
      setIsTopLeftHovered(false);
    }, 300);
  };

  const handleProfileMouseEnter = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = null;
    }
    setIsProfileHovered(true);
  };

  const handleProfileMouseLeave = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
    }
    profileTimeoutRef.current = setTimeout(() => {
      setIsProfileHovered(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
      if (topLeftTimeoutRef.current) {
        clearTimeout(topLeftTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && customEvent.detail.mode) {
        setInteractionMode(customEvent.detail.mode);
      }
    };
    const handleSidebarSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && typeof customEvent.detail.open === 'boolean') {
        setIsCanvasSidebarOpen(customEvent.detail.open);
      }
    };
    const handleLayoutSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && customEvent.detail.mode) {
        setCanvasLayoutMode(customEvent.detail.mode);
      }
    };
    window.addEventListener('sync-interaction-mode', handleSync);
    window.addEventListener('sync-canvas-sidebar-open', handleSidebarSync);
    window.addEventListener('sync-canvas-layout-mode', handleLayoutSync);
    return () => {
      window.removeEventListener('sync-interaction-mode', handleSync);
      window.removeEventListener('sync-canvas-sidebar-open', handleSidebarSync);
      window.removeEventListener('sync-canvas-layout-mode', handleLayoutSync);
    };
  }, []);

  useEffect(() => {
    const handlePopupChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        setIsPopupActive(!!customEvent.detail.isFullscreen);
      }
    };
    window.addEventListener('generative-ui-fullscreen-change', handlePopupChange);
    return () => {
      window.removeEventListener('generative-ui-fullscreen-change', handlePopupChange);
    };
  }, []);

  const [hidePanels, setHidePanels] = useState(false);

  useEffect(() => {
    const checkFullscreenPopups = () => {
      const fixedElements = document.querySelectorAll('.fixed.inset-0');
      let found = false;
      for (let i = 0; i < fixedElements.length; i++) {
        const el = fixedElements[i] as HTMLElement;
        if (el.classList.contains('context-menu-backdrop') || el.getAttribute('data-context-menu-backdrop') === 'true') {
          continue;
        }
        const style = window.getComputedStyle(el);
        const zIndex = style.zIndex;
        const zNum = parseInt(zIndex, 10);
        
        // Exclude our own layout overlays and lower z-index utility popups
        if (!isNaN(zNum) && zNum >= 50 && zIndex !== '9999') {
          // Transparent click-away backdrops typically have no children and are fully transparent
          if (el.children.length === 0) {
            const bg = style.backgroundColor || "";
            const bgClean = bg.replace(/\s+/g, "").toLowerCase();
            const isTransparent =
              bgClean === "" ||
              bgClean === "transparent" ||
              bgClean === "rgba(0,0,0,0)" ||
              bgClean === "rgba(255,255,255,0)" ||
              bgClean.startsWith("rgba(0,0,0,0") ||
              bgClean.endsWith(",0)") ||
              bgClean.endsWith(",0.0)") ||
              el.classList.contains("bg-transparent") ||
              el.getAttribute("data-dropdown-backdrop") === "true";

            const hasBlur =
              style.backdropFilter !== "none" &&
              style.backdropFilter !== "" &&
              (style as any).webkitBackdropFilter !== "none" &&
              (style as any).webkitBackdropFilter !== "";

            if (isTransparent && !hasBlur) {
              continue;
            }
          }
          
          if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0) {
            found = true;
            break;
          }
        }
      }
      setHidePanels(found);
    };

    // Run initially
    checkFullscreenPopups();

    // Set up MutationObserver to instantly hide/show on DOM updates
    const observer = new MutationObserver(() => {
      checkFullscreenPopups();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    const interval = setInterval(checkFullscreenPopups, 300);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const changeInteractionMode = (mode: 'select' | 'pan') => {
    setInteractionMode(mode);
    window.dispatchEvent(new CustomEvent('change-interaction-mode', {
      detail: { mode }
    }));
  };

  const toggleCanvasSidebar = () => {
    const nextState = !isCanvasSidebarOpen;
    setIsCanvasSidebarOpen(nextState);
    window.dispatchEvent(new CustomEvent('change-canvas-sidebar-open', {
      detail: { open: nextState }
    }));
  };

  const changeCanvasLayoutMode = (mode: 'mindmap' | 'bento' | 'semi_auto') => {
    setCanvasLayoutMode(mode);
    window.dispatchEvent(new CustomEvent('change-canvas-layout-mode', {
      detail: { mode }
    }));
  };

  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        const res = await fetch('/api/db-status');
        if (res.ok) {
          const data = await safeJson(res);
          if (data) setDbStatus(data);
        }
      } catch (err) {
        console.error('获取数据库状态失败:', err);
      }
    };

    const checkOssStatus = async () => {
      try {
        const res = await fetch('/api/oss-status');
        if (res.ok) {
          const data = await safeJson(res);
          if (data) setOssStatus(data);
        }
      } catch (err) {
        console.error('获取 OSS 状态失败:', err);
      }
    };

    checkDbStatus();
    checkOssStatus();
  }, []);

  const navItems = [
    { id: 'space', name: '灵境', icon: ImageIcon },
    { id: 'tasks', name: '资产', icon: LayoutGrid },
    { id: 'skills', name: '插座', icon: Cpu },
  ];

  const allMenuItems = [
    ...navItems,
    { id: 'admin', name: '后台', icon: ShieldCheck },
    { id: 'profile', name: '个人', icon: User },
  ];

  const isAdmin = user?.role === 'admin';
  const isLeader = user?.role === 'leader';
  const isTeamMember = !!user?.leader_id;
  const isGuest = user?.id === 'guest' || localStorage.getItem('isGuest') === 'true';

  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/group-chats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const groups = await safeJson(res);
          if (Array.isArray(groups) && groups.length > 0) {
            let foundUnread = false;
            for (const group of groups) {
              const storageKey = `lastReadAt_${group.id}`;
              const lastRead = Number(localStorage.getItem(storageKey) || 0);
              const messageTime = group.lastMessageAt ? Number(group.lastMessageAt) : 0;
              
              if (messageTime > 0 && messageTime > lastRead) {
                foundUnread = true;
                break;
              }
            }
            setHasUnread(foundUnread);
          }
        }
      } catch (e) {
        console.warn('Failed to check unread messages:', e);
      }
    };

    checkUnread();
    const timer = setInterval(checkUnread, 15000); // Check every 15s to be gentle on rate limits
    return () => clearInterval(timer);
  }, [user, activeTab]);

  return (
    <div className="h-screen flex bg-white text-slate-800">
      {!isGuest && !hidePanels && (
        <>
          {/* Top-Left Panel (Green Box Position): Points Display and Action Buttons */}
          <div 
            onMouseEnter={handleTopLeftMouseEnter}
            onMouseLeave={handleTopLeftMouseLeave}
            className="fixed left-6 top-6 z-[9999] flex items-center gap-3 pointer-events-auto bg-[#f5f2fd]/95 border border-[#e3dbf8] shadow-[0_15px_40px_rgba(124,58,237,0.12)] rounded-2xl p-2 backdrop-blur-md select-none transition-all duration-300 transform-gpu"
          >
            {/* 积分 (Points) */}
            {user && (
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs text-indigo-600 font-extrabold shadow-[0_2px_8px_rgba(99,102,241,0.08)]">
                  <Zap className="w-3.5 h-3.5 fill-indigo-500/10 text-indigo-500 shrink-0" />
                  <span className="font-black text-indigo-700">{user.points || 0}</span>
                </div>
                {user.teamInfo?.teamPoints !== undefined && (
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl text-xs text-amber-600 font-extrabold shadow-[0_2px_8px_rgba(245,158,11,0.08)]">
                    <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>团队积分: <span className="font-black text-amber-700">{user.teamInfo.teamPoints}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            {user && isTopLeftHovered && (
              <div className="w-[1px] h-6 bg-[#e3dbf8] animate-in fade-in duration-200" />
            )}

            {/* Action Buttons */}
            {isTopLeftHovered && (
              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                {isAdmin && (
                  <div className="relative group flex items-center justify-center">
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        activeTab === 'admin' 
                          ? 'bg-white text-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.15)] border border-[#e3dbf8]' 
                          : 'text-[#8f95a3] hover:text-[#7c3aed] hover:bg-[#eae6f5]/50'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </button>
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-white border border-[#e3dbf8] text-slate-700 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-50">
                      系统后台
                    </div>
                  </div>
                )}

                {(isLeader || isAdmin || isTeamMember) && (
                  <div className="relative group flex items-center justify-center">
                    <button
                      onClick={() => setActiveTab('leader')}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        activeTab === 'leader' 
                          ? 'bg-white text-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.15)] border border-[#e3dbf8]' 
                          : 'text-[#8f95a3] hover:text-[#7c3aed] hover:bg-[#eae6f5]/50'
                      }`}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                    </button>
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-white border border-[#e3dbf8] text-slate-700 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-50">
                      团队管理
                    </div>
                  </div>
                )}

                {/* User Profile */}
                <div 
                  className="relative flex items-center justify-center"
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                >
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      activeTab === 'profile' 
                        ? 'bg-white text-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.15)] border border-[#e3dbf8]' 
                        : 'text-[#8f95a3] hover:text-[#7c3aed] hover:bg-[#eae6f5]/50'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </button>
                  {/* Advanced Profile Hover Card */}
                  <div 
                    className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200 z-50 ${
                      isProfileHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="w-56 bg-white border border-[#e3dbf8] rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#f5f2fd] flex items-center justify-center border border-[#e3dbf8]/60">
                          <User className="w-5 h-5 text-[#7c3aed]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-800 truncate">{user?.username || '未登录'}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {user?.role === 'admin' ? '系统管理员' : user?.role === 'leader' ? '团队组长' : '正式会员'}
                          </span>
                        </div>
                      </div>

                      {onLogout && (
                        <div className="border-t border-[#e3dbf8]/60 pt-2 flex flex-col">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLogout();
                            }}
                            className="w-full h-9 px-3 rounded-xl flex items-center gap-2 text-[#8f95a3] hover:text-red-500 hover:bg-red-50 transition-all duration-300 cursor-pointer text-xs font-bold"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>安全退出</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="fixed left-6 top-1/2 -translate-y-1/2 z-[9999] flex flex-col items-center justify-start pointer-events-none select-none transform-gpu">
            {/* Floating Dock Container (Styled like Figure 1's light theme) */}
            <div 
              className="bg-[#f5f2fd]/95 border border-[#e3dbf8] shadow-[0_15px_40px_rgba(124,58,237,0.12)] rounded-2xl py-3 px-2 flex flex-col items-center gap-3 backdrop-blur-md pointer-events-auto transition-all duration-300"
            >
            {/* Interaction Tool & Canvas Controls */}
            {activeTab === 'space' && (
              <>
                {/* Pointer / Hand Tool */}
                <button
                  onClick={() => changeInteractionMode(interactionMode === "select" ? "pan" : "select")}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 relative bg-white text-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.12)] border border-[#e3dbf8] hover:scale-105 active:scale-95 group/tool pointer-events-auto"
                >
                  {interactionMode === "select" ? (
                    <MousePointer className="w-5 h-5 text-[#7c3aed]" />
                  ) : (
                    <Hand className="w-5 h-5 text-[#7c3aed]" />
                  )}

                  {/* Tooltip */}
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-zinc-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg opacity-0 pointer-events-none group-hover/tool:opacity-100 transition-opacity z-[200] shadow-xl flex items-center space-x-1.5 font-bold">
                    {interactionMode === "select" ? (
                      <>
                        <span>多选工具</span>
                        <kbd className="bg-zinc-800 px-1 rounded text-[9px] text-zinc-400 font-mono">V</kbd>
                      </>
                    ) : (
                      <>
                        <span>视图抓手</span>
                        <kbd className="bg-zinc-800 px-1 rounded text-[9px] text-zinc-400 font-mono">Space</kbd>
                      </>
                    )}
                  </div>
                </button>

                {/* 画布管理 Toggle (New) */}
                <button
                  onClick={toggleCanvasSidebar}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 relative group/canvas-manage pointer-events-auto ${
                    isCanvasSidebarOpen 
                      ? 'bg-indigo-50 text-[#7c3aed] border border-[#e3dbf8]' 
                      : 'text-[#8f95a3] hover:text-[#7c3aed] hover:bg-[#eae6f5]/50'
                  }`}
                >
                  <PanelLeftOpen className={`w-5 h-5 transition-transform duration-300 ${isCanvasSidebarOpen ? 'rotate-180 text-[#7c3aed]' : ''}`} />
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-white border border-[#e3dbf8] text-slate-700 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover/canvas-manage:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-50">
                    {isCanvasSidebarOpen ? '收起画布' : '画布管理'}
                  </div>
                </button>

                {/* 画布排列方式 / 自由脑图流 Selector (New) */}
                <div 
                  className="relative group/layout-selector"
                  onMouseEnter={() => setIsLayoutDropdownOpen(true)}
                  onMouseLeave={() => setIsLayoutDropdownOpen(false)}
                >
                  <button
                    onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 relative text-[#8f95a3] hover:text-[#7c3aed] hover:bg-[#eae6f5]/50 pointer-events-auto"
                  >
                    {canvasLayoutMode === "mindmap" && <GitFork className="w-5 h-5 text-purple-500" />}
                    {canvasLayoutMode === "bento" && <LayoutGrid className="w-5 h-5 text-teal-500" />}
                    {canvasLayoutMode === "semi_auto" && <Cpu className="w-5 h-5 text-amber-500" />}
                    
                    {/* Tiny dot indicator */}
                    <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                  </button>

                  {/* Dropdown on the right side */}
                  <AnimatePresence>
                    {isLayoutDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-14 top-0 bg-white border border-[#e3dbf8] rounded-2xl p-1.5 shadow-2xl z-[200] flex flex-col gap-1 min-w-[130px] pointer-events-auto"
                      >
                        <button
                          onClick={() => {
                            changeCanvasLayoutMode("mindmap");
                            setIsLayoutDropdownOpen(false);
                          }}
                          className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left w-full ${
                            canvasLayoutMode === "mindmap"
                              ? "bg-purple-50 text-purple-700"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <GitFork className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>自由脑图流</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            changeCanvasLayoutMode("bento");
                            setIsLayoutDropdownOpen(false);
                          }}
                          className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left w-full ${
                            canvasLayoutMode === "bento"
                              ? "bg-teal-50 text-teal-700"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          <span>整齐网格流</span>
                        </button>

                        <button
                          onClick={() => {
                            changeCanvasLayoutMode("semi_auto");
                            setIsLayoutDropdownOpen(false);
                          }}
                          className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left w-full ${
                            canvasLayoutMode === "semi_auto"
                              ? "bg-amber-50 text-amber-700"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <Cpu className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>区块分类流</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isLayoutDropdownOpen && (
                    <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-white border border-[#e3dbf8] text-slate-700 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover/layout-selector:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-50">
                      {canvasLayoutMode === "mindmap" && "自由脑图流"}
                      {canvasLayoutMode === "bento" && "整齐网格流"}
                      {canvasLayoutMode === "semi_auto" && "区块分类流"}
                    </div>
                  )}
                </div>

                <div className="w-8 border-b border-[#e3dbf8]/80 my-0.5" />
              </>
            )}

            {/* Nav Items */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const itemHasNotification = item.id === 'mycompany' && hasUnread && activeTab !== 'mycompany';

              return (
                <div key={item.id} className="relative group flex items-center justify-center">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${
                      isActive 
                        ? 'bg-white text-[#7c3aed] shadow-[0_4px_12px_rgba(124,58,237,0.18)]' 
                        : 'text-[#8f95a3] hover:text-[#7c3aed] hover:bg-[#eae6f5]/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-105' : 'hover:scale-105'}`} />
                    
                    {itemHasNotification && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </button>

                  {isActive && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-[4.5px] h-7 bg-[#7c3aed] rounded-full shadow-[0_0_8px_rgba(124,58,237,0.3)]" />
                  )}

                  {/* Sleek Tooltip */}
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-white border border-[#e3dbf8] text-slate-700 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-50">
                    {item.name}
                  </div>
                </div>
              );
            })}

          </div>
        </aside>
      </>
    )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${(!isGuest && activeTab !== 'space') ? 'sm:pl-24 pl-20' : ''}`}>
        {/* Top Header (Breadcrumbs/Actions) Removed at user request */}

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/5 rounded-full blur-[100px] pointer-events-none"></div>
          {children}
        </main>
      </div>
    </div>
  );
};

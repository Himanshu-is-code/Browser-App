import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Image, WandSparkles, Plus, MoreHorizontal, Globe2, X, Search, ArrowUpRight } from 'lucide-react';
import cppBridge from '../services/cppBridge';

const dockItems = [
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'tabs', label: 'Tabs', icon: AlbumTabsIcon },
  { id: 'create', label: 'Create', icon: WandSparkles },
];

export default function BottomActionDock({ onPhotos, onCreate, overlayMode = false }) {
  const [active, setActive] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 390 : window.innerWidth);
  const [tabs, setTabs] = useState([]);
  const [selectedTab, setSelectedTab] = useState(null);
  const [tabDrawerOpen, setTabDrawerOpen] = useState(false);
  const [phoneEditingTabId, setPhoneEditingTabId] = useState(null);
  const [linkSearchOpen, setLinkSearchOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const holdTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const linkInputRef = useRef(null);
  const tabIconSize = 40;
  const tabIconPitch = tabIconSize + 4;
  const tabsDockMaxWidth = viewportWidth * 0.9;
  const tabsDockWidth = Math.min(tabsDockMaxWidth, 168 + tabs.length * tabIconPitch);
  const visibleTabCount = Math.min(tabs.length, Math.floor((tabsDockWidth - 168) / tabIconPitch));
  const tabsStripWidth = visibleTabCount * tabIconPitch;
  const dockWidth = !expanded ? 44 : active === 'tabs' ? tabsDockWidth : 220;
  const dockHeight = !expanded ? 44 : active === 'tabs' ? 68 : 78;
  const collapsedDockBottom = viewportWidth < 768 ? 132 : 32;

  const switchToTab = (id) => {
    setSelectedTab(id);
    void cppBridge.dispatch({ action: 'SWITCH_TAB', tabId: String(id) });
  };

  const persistTab = (id) => {
    const tab = tabs.find((item) => item.id === id);
    if (!tab) return;
    void cppBridge.dispatch({ action: 'UPDATE_TAB', tabId: String(id), url: tab.url, title: tab.title });
  };

  const choose = (id) => {
    setActive(id);
    if (id === 'photos') onPhotos();
    if (id === 'create') onCreate?.();
  };

  const collapse = () => {
    window.clearTimeout(holdTimer.current);
    setExpanded(false);
    setActive(null);
    setTabDrawerOpen(false);
  };

  useEffect(() => {
    if (linkSearchOpen) linkInputRef.current?.focus();
  }, [linkSearchOpen]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    const nativeBridge = window.CppEngine;
    if (typeof nativeBridge?.setDockHitRegion !== 'function') return undefined;

    let frameId = 0;
    const startedAt = performance.now();
    const syncTouchRegion = () => {
      if (!overlayMode) {
        nativeBridge.setDockHitRegion(0, 0, 0, 0, false);
        return;
      }

      const dock = document.querySelector('[aria-label="Bottom navigation"]');
      if (!dock) return;
      const rect = dock.getBoundingClientRect();
      nativeBridge.setDockHitRegion(rect.left, rect.top, rect.right, rect.bottom, !expanded);

      // Track the dock as it springs between the raised dot and its expanded position.
      if (!expanded && performance.now() - startedAt < 700) {
        frameId = window.requestAnimationFrame(syncTouchRegion);
      }
    };

    syncTouchRegion();
    return () => window.cancelAnimationFrame(frameId);
  }, [overlayMode, expanded, active, tabs.length, viewportWidth]);

  useEffect(() => {
    const resetDockForPage = () => {
      setExpanded(false);
      setActive(null);
      setTabDrawerOpen(false);
      setLinkSearchOpen(false);
    };
    window.addEventListener('browser:show-dock-overlay', resetDockForPage);
    window.addEventListener('browser:hide-dock-overlay', resetDockForPage);
    return () => {
      window.removeEventListener('browser:show-dock-overlay', resetDockForPage);
      window.removeEventListener('browser:hide-dock-overlay', resetDockForPage);
    };
  }, []);

  useEffect(() => {
    if (!linkSearchOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setLinkSearchOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [linkSearchOpen]);

  const addTab = (event) => {
    event.preventDefault();
    const enteredLink = linkInput.trim();
    if (!enteredLink) return;

    const normalizedUrl = /^https?:\/\//i.test(enteredLink) ? enteredLink : `https://${enteredLink}`;
    let domain;
    try {
      domain = new URL(normalizedUrl).hostname.replace(/^www\./, '');
    } catch {
      setLinkError('Enter a valid website link.');
      return;
    }

    const id = Date.now();
    const nextTab = { id, title: domain || `Tab ${tabs.length + 1}`, url: normalizedUrl, domain };
    setTabs((items) => [...items, nextTab]);
    setSelectedTab(id);
    void cppBridge.dispatch({ action: 'CREATE_TAB', tabId: String(id), url: normalizedUrl, title: nextTab.title });
    void cppBridge.dispatch({ action: 'SWITCH_TAB', tabId: String(id) });
    setTabDrawerOpen(false);
    setLinkSearchOpen(false);
    setLinkInput('');
    setLinkError('');
  };

  const closeTab = (id) => {
    const closedIndex = tabs.findIndex((tab) => tab.id === id);
    const remainingTabs = tabs.filter((tab) => tab.id !== id);
    setTabs(remainingTabs);
    void cppBridge.dispatch({ action: 'CLOSE_TAB', tabId: String(id) });
    if (selectedTab === id) {
      const nextSelectedId = remainingTabs.length
        ? remainingTabs[Math.min(closedIndex, remainingTabs.length - 1)].id
        : null;
      setSelectedTab(nextSelectedId);
      if (nextSelectedId !== null) void cppBridge.dispatch({ action: 'SWITCH_TAB', tabId: String(nextSelectedId) });
    }
  };

  const startTabsHold = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    window.clearTimeout(holdTimer.current);
    longPressTriggered.current = false;
    holdTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setActive(null);
      setTabDrawerOpen(false);
      window.setTimeout(() => { longPressTriggered.current = false; }, 900);
    }, 500);
  };

  const cancelTabsHold = () => window.clearTimeout(holdTimer.current);

  const startPhoneIconHold = (event, tabId) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    window.clearTimeout(holdTimer.current);
    longPressTriggered.current = false;
    holdTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setSelectedTab(tabId);
      setPhoneEditingTabId(tabId);
      window.setTimeout(() => { longPressTriggered.current = false; }, 900);
    }, 500);
  };

  const handleTabsClick = (onTap) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onTap();
  };

  const updateTab = (id, field, value) => {
    setTabs((items) => items.map((tab) => {
      if (tab.id !== id) return tab;
      const updated = { ...tab, [field]: value };
      if (field === 'url') {
        try {
          const normalized = value && !/^https?:\/\//i.test(value) ? `https://${value}` : value;
          updated.domain = normalized ? new URL(normalized).hostname.replace(/^www\./, '') : '';
        } catch {
          updated.domain = '';
        }
      }
      return updated;
    }));
  };

  const tabHoldHandlers = {
    onPointerDown: startTabsHold,
    onPointerUp: cancelTabsHold,
    onPointerCancel: cancelTabsHold,
    onPointerLeave: cancelTabsHold,
    onContextMenu: (event) => event.preventDefault(),
  };

  return (
    <>
      <AnimatePresence>
        {expanded && (
          <motion.button
            aria-label="Collapse navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={collapse}
            className="fixed inset-0 z-30 cursor-default"
          />
        )}
      </AnimatePresence>

      <motion.nav
        layout
        aria-label="Bottom navigation"
        initial={{ opacity: 1, y: 30, scale: 0.96, width: 44, height: 44, bottom: `${collapsedDockBottom}px` }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          width: dockWidth,
          height: dockHeight,
          bottom: `${expanded ? 32 : collapsedDockBottom}px`,
        }}
        transition={{ type: 'spring', stiffness: 230, damping: 28, mass: 0.8 }}
        className="mosaic-glass fixed bottom-0 left-0 right-0 z-40 mx-auto flex max-w-[90vw] items-center justify-center overflow-hidden rounded-full p-1.5 shadow-[0_12px_32px_rgba(42,53,81,0.13),inset_0_1px_0_rgba(255,255,255,0.85)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-white/5 to-sky-100/15" />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 top-0 h-full w-1/2 rounded-full bg-white/20 blur-2xl"
          animate={{ x: [0, 18, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        {!expanded ? (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            type="button"
            aria-label="Expand navigation"
            title="Expand navigation"
            onClick={() => {
              setExpanded(true);
              setActive('tabs');
              setTabDrawerOpen(false);
            }}
            className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-800"
          >
            <MoreHorizontal size={20} />
          </motion.button>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {active === 'tabs' ? (
              <motion.div
                key="tabs-state"
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                className="relative z-10 flex w-full min-w-0 items-center justify-center gap-2"
              >
                <div
                  className="flex shrink-0 items-center gap-1 overflow-x-auto px-0.5 scrollbar-none"
                  style={{ width: tabsStripWidth }}
                >
                  <AnimatePresence initial={false}>
                    {tabs.map((tab) => (
                    <motion.div
                      key={tab.id}
                      layout
                      initial={{ opacity: 0, scale: 0.7, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.55, y: -42, rotate: -10 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.7 }}
                      drag="y"
                      dragConstraints={{ top: -12, bottom: 0 }}
                      dragElastic={{ top: 0, bottom: 0 }}
                      dragMomentum={false}
                      whileDrag={{ scale: 1.1, rotate: -4, zIndex: 20, cursor: 'grabbing' }}
                      onDragEnd={(_, info) => {
                        if (info.offset.y < -10 || info.velocity.y < -550) closeTab(tab.id);
                      }}
                      role="group"
                      className="group relative shrink-0 cursor-grab touch-none active:cursor-grabbing"
                      style={{ width: tabIconSize, height: tabIconSize }}
                      aria-label={`Drag ${tab.title} up to close`}
                    >
                      <button
                        type="button"
                        title={tab.title}
                        aria-label={`Switch to ${tab.title}`}
                        aria-pressed={selectedTab === tab.id}
                        onClick={() => switchToTab(tab.id)}
                        className={`mosaic-glass-control flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/75 ${selectedTab === tab.id ? 'bg-white/75 ring-1 ring-white/90' : ''}`}
                      >
                        {tab.domain ? (
                          <WebsiteIcon tab={tab} className="h-full w-full" />
                        ) : <Globe2 size={18} strokeWidth={1.8} className="text-slate-700" />}
                      </button>
                      <button
                        type="button"
                        title={`Close ${tab.title}`}
                        aria-label={`Close ${tab.title}`}
                        onClick={() => closeTab(tab.id)}
                        className="pointer-events-none absolute right-0 top-0 z-10 flex h-4 w-4 scale-75 items-center justify-center rounded-full border border-white/90 bg-white/95 text-slate-700 opacity-0 shadow-sm transition duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <button
                  type="button"
                  {...tabHoldHandlers}
                  onClick={() => handleTabsClick(() => setTabDrawerOpen(true))}
                  className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/25 px-3 text-sm font-medium text-slate-900 backdrop-blur-lg"
                  aria-label="Tabs. Click to edit tab links, hold to return to navigation"
                >
                  <AlbumTabsIcon size={21} /><span>Tabs</span>
                </button>
                <button
                  type="button"
                  title="Create tab"
                  aria-label="Create tab"
                  onClick={() => { setLinkError(''); setLinkSearchOpen(true); }}
                  className="mosaic-glass-control flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-slate-900"
                >
                  <Plus size={24} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="options-state"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                className="relative z-10 flex w-full items-center justify-center gap-1"
              >
                {dockItems.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    type="button"
                    {...(id === 'tabs' ? tabHoldHandlers : {})}
                    onClick={() => id === 'tabs'
                      ? handleTabsClick(() => choose(id))
                      : id === 'create' ? setActive('create') : choose(id)}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full py-2.5 text-slate-900"
                  >
                    <motion.span
                      animate={{ y: active === id ? -1 : 0, scale: active === id ? 1.03 : 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                      className="relative inline-flex"
                    >
                      <Icon size={id === 'tabs' ? 30 : 20} strokeWidth={1.8} />
                    </motion.span>
                    <span className="text-xs font-medium">{label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.nav>

      <AnimatePresence>
        {linkSearchOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close website search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLinkSearchOpen(false)}
              className="fixed inset-0 z-[60] backdrop-blur-sm"
            />
            <motion.form
              role="search"
              aria-label="Open a website in a new tab"
              onSubmit={addTab}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="mosaic-glass fixed left-0 right-0 top-[40%] z-[61] mx-auto flex w-[min(92vw,440px)] items-center gap-3 rounded-full p-2.5"
            >
              <Search size={19} className="ml-2 shrink-0 text-slate-500" />
              <input
                ref={linkInputRef}
                type="text"
                inputMode="url"
                value={linkInput}
                onChange={(event) => { setLinkInput(event.target.value); setLinkError(''); }}
                placeholder="Enter a website link"
                aria-label="Website link"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                title="Open link in new tab"
                aria-label="Open link in new tab"
                disabled={!linkInput.trim()}
                className="mosaic-glass-control flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-900 disabled:opacity-40"
              >
                <ArrowUpRight size={19} />
              </button>
              {linkError && <span role="alert" className="absolute left-5 top-full mt-2 text-xs text-rose-700">{linkError}</span>}
            </motion.form>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && tabDrawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close tab editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTabDrawerOpen(false)}
              className="fixed inset-0 z-40 hidden md:block"
            />
            <motion.aside
              role="dialog"
              aria-label="Edit tabs and links"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 27 }}
              className="mosaic-glass fixed bottom-[6.25rem] left-0 right-0 z-50 mx-auto hidden w-[min(92vw,440px)] rounded-3xl p-3.5 md:block"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Tabs</h2>
                  <p className="text-[11px] text-slate-500">Edit links here · hold a tab icon to return</p>
                </div>
                <button
                  type="button"
                  aria-label="Close tab editor"
                  onClick={() => setTabDrawerOpen(false)}
                  className="mosaic-glass-control flex h-8 w-8 items-center justify-center rounded-full text-slate-700"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="scrollbar-none flex max-h-[42vh] flex-col gap-2 overflow-y-auto px-0.5 pb-1">
                {tabs.map((tab) => (
                  <div key={tab.id} className={`mosaic-glass-control flex items-center gap-2.5 rounded-2xl p-2 ${selectedTab === tab.id ? 'bg-white/55' : ''}`}>
                    <button
                      type="button"
                      {...tabHoldHandlers}
                      aria-label={`Select ${tab.title}; hold to return to navigation`}
                      aria-pressed={selectedTab === tab.id}
                      onClick={() => handleTabsClick(() => setSelectedTab(tab.id))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/55"
                    >
                      {tab.domain ? (
                        <WebsiteIcon tab={tab} className="h-full w-full" />
                      ) : <Globe2 size={18} className="text-slate-700" />}
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        aria-label={`Name for ${tab.title}`}
                        value={tab.title}
                        onFocus={() => setSelectedTab(tab.id)}
                        onChange={(event) => updateTab(tab.id, 'title', event.target.value)}
                        onBlur={() => persistTab(tab.id)}
                        placeholder="Tab name"
                        className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                      />
                      <input
                        aria-label={`Website link for ${tab.title}`}
                        value={tab.url}
                        onFocus={() => setSelectedTab(tab.id)}
                        onChange={(event) => updateTab(tab.id, 'url', event.target.value)}
                        onBlur={() => persistTab(tab.id)}
                        placeholder="Enter website link"
                        inputMode="url"
                        className="w-full bg-transparent text-[11px] text-slate-600 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
            <motion.section
              role="dialog"
              aria-label="Tabs home screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="fixed inset-0 z-[35] overflow-y-auto bg-slate-100/75 px-0 pb-32 pt-[max(env(safe-area-inset-top),24px)] backdrop-blur-2xl md:hidden"
            >
              <div className="mx-auto w-full max-w-md">
                <header className="mb-9 flex items-center justify-between px-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">Tabs</h2>
                    <p className="mt-1 text-xs text-slate-500">Your open websites</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close tabs home screen"
                    onClick={() => setTabDrawerOpen(false)}
                    className="mosaic-glass-control flex h-10 w-10 items-center justify-center rounded-full text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </header>
                <div className="grid grid-cols-5 gap-x-0 gap-y-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onPointerDown={(event) => startPhoneIconHold(event, tab.id)}
                      onPointerUp={cancelTabsHold}
                      onPointerCancel={cancelTabsHold}
                      onPointerLeave={cancelTabsHold}
                      onContextMenu={(event) => event.preventDefault()}
                      title={tab.url || tab.title}
                      aria-label={`Open ${tab.title}${tab.url ? `, ${tab.url}` : ''}`}
                      onClick={() => handleTabsClick(() => {
                        switchToTab(tab.id);
                        setTabDrawerOpen(false);
                      })}
                      className="flex min-w-0 flex-col items-center justify-start"
                    >
                      <span className={`flex h-[clamp(44px,17vw,64px)] w-[clamp(44px,17vw,64px)] items-center justify-center overflow-hidden rounded-full ${selectedTab === tab.id ? 'scale-105' : ''} ${tab.domain ? '' : 'bg-white/60'}`}>
                        {tab.domain ? (
                          <WebsiteIcon tab={tab} className="h-full w-full" />
                        ) : <Globe2 size={34} strokeWidth={1.7} className="text-slate-700" />}
                      </span>
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {phoneEditingTabId !== null && (() => {
                    const editingTab = tabs.find((tab) => tab.id === phoneEditingTabId);
                    if (!editingTab) return null;
                    return (
                      <>
                        <motion.button
                          type="button"
                          aria-label="Close tab link editor"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setPhoneEditingTabId(null)}
                          className="fixed inset-0 z-[70]"
                        />
                        <div className="pointer-events-none fixed inset-0 z-[71] grid place-items-center p-4">
                          <motion.div
                            role="dialog"
                            aria-label={`Edit ${editingTab.title}`}
                            initial={{ opacity: 0, y: 12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                            className="pointer-events-auto w-full max-w-sm rounded-3xl border border-white/80 bg-white p-4 shadow-[0_18px_48px_rgba(33,43,63,0.18)]"
                          >
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-800">Edit tab</h3>
                            <button type="button" aria-label="Done editing" onClick={() => setPhoneEditingTabId(null)} className="mosaic-glass-control flex h-8 w-8 items-center justify-center rounded-full text-slate-700">
                              <X size={15} />
                            </button>
                          </div>
                          <label className="mb-3 block text-xs text-slate-500">
                            Name
                            <input
                              value={editingTab.title}
                              onChange={(event) => updateTab(editingTab.id, 'title', event.target.value)}
                              onBlur={() => persistTab(editingTab.id)}
                              className="mt-1 w-full rounded-xl bg-white/65 px-3 py-2.5 text-sm text-slate-900 outline-none"
                              placeholder="Tab name"
                            />
                          </label>
                          <label className="block text-xs text-slate-500">
                            Website link
                            <input
                              value={editingTab.url}
                              onChange={(event) => updateTab(editingTab.id, 'url', event.target.value)}
                              onBlur={() => persistTab(editingTab.id)}
                              className="mt-1 w-full rounded-xl bg-white/65 px-3 py-2.5 text-sm text-slate-900 outline-none"
                              placeholder="https://example.com"
                              inputMode="url"
                            />
                          </label>
                          </motion.div>
                        </div>
                      </>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

    </>
  );
}

function WebsiteIcon({ tab, className = '' }) {
  // A few favicons are transparent artwork (for example Gemini and DeepSeek),
  // so give only those marks a white circular backing for contrast.
  const needsWhiteBacking = /(^|\.)deepseek\.com$|(^|\.)gemini\.google\.com$|(^|\.)maps\.google\.com$/i.test(tab.domain);

  if (/youtube\.com|youtu\.be/i.test(tab.domain)) {
    return (
      <svg viewBox="0 0 48 48" className={className} role="img" aria-label="YouTube">
        <circle cx="24" cy="24" r="24" fill="#f1f3f4" />
        <rect x="8" y="14" width="32" height="20" rx="6" fill="#ff0033" />
        <path d="M21 19.5v9l8-4.5-8-4.5Z" fill="#fff" />
      </svg>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${tab.domain}&sz=128`}
      alt=""
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      className={`${className} pointer-events-none select-none rounded-full object-cover ${needsWhiteBacking ? 'bg-white' : ''}`}
    />
  );
}

function AlbumTabsIcon({ size = 20, strokeWidth = 1.8, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8 3.5h8" />
      <rect x="3.5" y="6" width="17" height="15" rx="4" />
      <path d="M10 17.2h4" />
    </svg>
  );
}

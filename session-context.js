(() => {
  const STORAGE_KEY = "cherry-session-context-v1";
  const WORKSPACE_ID = "local-workspace-v1";
  const VALID_ROUTES = new Set(["start", "workspace"]);
  const VALID_VIEWS = new Set(["board", "list"]);

  function workspaceSnapshot() {
    try {
      return window.cherryWorkspace?.getWorkspace?.() || null;
    } catch (_) {
      return null;
    }
  }

  function isStartPageOpen() {
    const page = document.getElementById("startPage");
    return Boolean(page && !page.classList.contains("hidden"));
  }

  function currentView() {
    return VALID_VIEWS.has(state?.viewMode) ? state.viewMode : "board";
  }

  function normalize(candidate) {
    if (!candidate || typeof candidate !== "object") return null;
    return {
      lastRoute: VALID_ROUTES.has(candidate.lastRoute) ? candidate.lastRoute : "start",
      activeWorkspaceId: candidate.activeWorkspaceId === WORKSPACE_ID ? WORKSPACE_ID : null,
      activeTabId: typeof candidate.activeTabId === "string" ? candidate.activeTabId : null,
      activeView: VALID_VIEWS.has(candidate.activeView) ? candidate.activeView : "board"
    };
  }

  function loadContext() {
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch (_) {
      return null;
    }
  }

  function saveContext(route = isStartPageOpen() ? "start" : "workspace") {
    const workspace = workspaceSnapshot();
    const activeTabId = workspace?.tabs?.some(tab => tab.id === workspace.activeTabId)
      ? workspace.activeTabId
      : null;

    const context = {
      lastRoute: route === "workspace" && activeTabId ? "workspace" : "start",
      activeWorkspaceId: workspace ? WORKSPACE_ID : null,
      activeTabId,
      activeView: currentView()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    } catch (_) {
      // Session restoration is optional when browser storage is unavailable.
    }
  }

  function restoreContext() {
    const saved = loadContext();
    const workspace = workspaceSnapshot();
    if (!saved || saved.lastRoute !== "workspace" || saved.activeWorkspaceId !== WORKSPACE_ID) {
      saveContext("start");
      return;
    }

    const tabExists = workspace?.tabs?.some(tab => tab.id === saved.activeTabId);
    if (!tabExists) {
      saveContext("start");
      return;
    }

    window.cherryWorkspace?.openTab?.(saved.activeTabId);
    if (VALID_VIEWS.has(saved.activeView)) {
      state.viewMode = saved.activeView;
      requestRender?.();
    }
    saveContext("workspace");
  }

  function observeRouteChanges() {
    const page = document.getElementById("startPage");
    if (!page) return;
    const observer = new MutationObserver(() => saveContext());
    observer.observe(page, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#startPageBtn, .workspaceStartMini")) {
      queueMicrotask(() => saveContext("start"));
      return;
    }
    if (event.target.closest(".startPageClose, [data-tab-open], [data-action='new-tab'], #listViewBtn")) {
      queueMicrotask(() => saveContext());
    }
  }, true);

  window.addEventListener("cherry-workspace-updated", () => queueMicrotask(() => saveContext()));
  window.addEventListener("beforeunload", () => saveContext());

  observeRouteChanges();
  restoreContext();

  window.cherrySessionContext = {
    storageKey: STORAGE_KEY,
    load: loadContext,
    save: saveContext
  };
})();

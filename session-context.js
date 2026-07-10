(() => {
  const STORAGE_KEY = "cherry-session-context-v1";
  const VALID_ROUTES = new Set(["start", "workspace"]);

  function safeRead() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!VALID_ROUTES.has(parsed?.lastRoute)) return null;
      return {
        lastRoute: parsed.lastRoute,
        activeTabId: typeof parsed.activeTabId === "string" ? parsed.activeTabId : null
      };
    } catch (_) {
      return null;
    }
  }

  function currentRoute() {
    const startPage = document.getElementById("startPage");
    return startPage && !startPage.classList.contains("hidden") ? "start" : "workspace";
  }

  function currentContext() {
    return {
      lastRoute: currentRoute(),
      activeTabId: window.cherryWorkspace?.getActiveTabId?.() || null
    };
  }

  function safeWrite() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentContext()));
    } catch (_) {
      // Session restoration is optional when storage is unavailable.
    }
  }

  function restore() {
    const api = window.cherryWorkspace;
    if (!api) return;

    const saved = safeRead();
    const workspace = api.getWorkspace?.();
    const tabs = Array.isArray(workspace?.tabs) ? workspace.tabs : [];
    const restorableTab = saved?.activeTabId
      ? tabs.find(tab => tab?.id === saved.activeTabId)
      : null;

    if (saved?.lastRoute === "workspace" && restorableTab) {
      api.openTab(restorableTab.id);
    } else {
      api.openStartPage();
    }

    safeWrite();
  }

  function observeRouteChanges() {
    const startPage = document.getElementById("startPage");
    if (!startPage) return;

    const observer = new MutationObserver(() => safeWrite());
    observer.observe(startPage, { attributes: true, attributeFilter: ["class"] });
  }

  window.addEventListener("cherry-workspace-updated", safeWrite);
  window.addEventListener("pagehide", safeWrite);
  window.addEventListener("beforeunload", safeWrite);

  restore();
  observeRouteChanges();

  window.cherrySessionContext = {
    storageKey: STORAGE_KEY,
    read: safeRead,
    save: safeWrite
  };
})();
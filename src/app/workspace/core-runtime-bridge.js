(() => {
  if (window.CherryWorkspaceRuntime) return;

  window.CherryLegacyCore?.withCore(core => {
    const legacy = window.cherryWorkspace;
    const workData = window.CherryWorkDataStorage;
    const workspaceStore = core.runtime?.workspaceStore;
    const events = core.runtime?.events;
    const workspaceModel = core.workspace;
    if (!legacy || !workspaceStore || !workspaceModel) return;

    function normalize(candidate) {
      return workspaceModel.normalizeWorkspaceOrDefault(candidate);
    }

    function sync(candidate, reason = "workspace-sync") {
      const next = normalize(candidate || legacy.getWorkspace());
      workspaceStore.replaceState(next, { reason });
      events?.emit("workspace:changed", next, { source: "workspace-runtime", reason });
      return next;
    }

    function current() {
      return workspaceStore.getState();
    }

    function save(workspace = legacy.getWorkspace()) {
      const next = normalize(workspace);
      workData?.saveWorkspace(next);
      return sync(next, "workspace-save");
    }

    function load(options = {}) {
      const loaded = workData?.loadWorkspace(options) || legacy.getWorkspace();
      return sync(loaded, "workspace-load");
    }

    function invoke(operation, ...args) {
      const handler = legacy[operation];
      if (typeof handler !== "function") {
        throw new Error(`Unknown workspace operation: ${operation}`);
      }
      const result = handler(...args);
      sync(legacy.getWorkspace(), `workspace-${operation}`);
      return result;
    }

    window.addEventListener("cherry-workspace-updated", event => {
      sync(event.detail, "legacy-workspace-updated");
    });

    window.CherryWorkspaceRuntime = Object.freeze({
      store: workspaceStore,
      getWorkspace: current,
      getActiveTabId: () => current().activeTabId,
      getActiveTab: () => current().tabs.find(tab => tab.id === current().activeTabId) || null,
      subscribe: workspaceStore.subscribe,
      refresh: () => sync(legacy.getWorkspace(), "workspace-refresh"),
      load,
      save,
      openTab: tabId => invoke("openTab", tabId),
      createTab: (...args) => invoke("createTab", ...args),
      renameTab: (...args) => invoke("renameTab", ...args),
      duplicateTab: (...args) => invoke("duplicateTab", ...args),
      deleteTab: (...args) => invoke("deleteTab", ...args),
      updateTabState: (...args) => invoke("updateTabState", ...args),
      openStartPage: (...args) => invoke("openStartPage", ...args),
      closeStartPage: (...args) => invoke("closeStartPage", ...args)
    });

    sync(legacy.getWorkspace(), "workspace-runtime-ready");
    events?.emit("workspace:runtime-ready", {
      activeTabId: current().activeTabId,
      tabCount: current().tabs.length
    });
  });
})();
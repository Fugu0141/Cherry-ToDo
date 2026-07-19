(() => {
  if (window.CherryWorkDataStorage) return;

  const adapter = window.CherryStorageAdapters?.local;
  if (!adapter) return;

  const keys = Object.freeze({
    workspace: "cherry-workspace-v1",
    sessionContext: "cherry-session-context-v1",
    taskState: "quest-sticky-todo-v10",
    legacyTaskStates: Object.freeze([
      "quest-sticky-todo-v9",
      "quest-sticky-todo-v8",
      "quest-sticky-todo-v6",
      "quest-sticky-todo-v5",
      "quest-sticky-todo-v4",
      "quest-sticky-todo-v3",
      "quest-sticky-todo-v2"
    ])
  });

  let storage = null;
  let workspaceModel = null;
  let eventBus = null;

  function get(key) {
    const normalizedKey = String(key);
    return storage ? storage.get(normalizedKey) : adapter.get(normalizedKey);
  }

  function set(key, value) {
    const normalizedKey = String(key);
    const normalizedValue = String(value);
    return storage
      ? storage.set(normalizedKey, normalizedValue)
      : adapter.set(normalizedKey, normalizedValue);
  }

  function remove(key) {
    const normalizedKey = String(key);
    return storage ? storage.remove(normalizedKey) : adapter.remove(normalizedKey);
  }

  function getJson(key, fallback = null) {
    const normalizedKey = String(key);
    if (normalizedKey === keys.workspace && workspaceModel) {
      const raw = get(normalizedKey);
      return raw ? workspaceModel.parseWorkspace(raw) : fallback;
    }

    if (storage) return storage.getJson(normalizedKey, { fallback });

    const raw = get(normalizedKey);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function setJson(key, value) {
    const normalizedKey = String(key);
    if (normalizedKey === keys.workspace && workspaceModel) {
      return set(normalizedKey, workspaceModel.serializeWorkspace(value));
    }

    return storage
      ? storage.setJson(normalizedKey, value)
      : set(normalizedKey, JSON.stringify(value));
  }

  function getFirst(keysToTry) {
    for (const key of keysToTry) {
      const value = get(key);
      if (value) return value;
    }
    return null;
  }

  function loadWorkspace(options = {}) {
    if (!workspaceModel) return getJson(keys.workspace, options.fallback ?? null);
    return workspaceModel.loadWorkspace(get, keys.workspace, options);
  }

  function saveWorkspace(workspace, options = {}) {
    if (!workspaceModel) return setJson(keys.workspace, workspace);
    return set(keys.workspace, workspaceModel.serializeWorkspace(workspace, options));
  }

  window.CherryWorkDataStorage = Object.freeze({
    keys,
    get,
    set,
    remove,
    getJson,
    setJson,
    getFirst,
    loadWorkspace,
    saveWorkspace,
    getEventBus: () => eventBus,
    getOrchestrator: () => storage
  });

  window.CherryLegacyCore?.withCore(core => {
    const createStorageOrchestrator = core.storage?.createStorageOrchestrator;
    workspaceModel = core.workspace || null;
    eventBus = core.runtime?.events || null;
    if (typeof createStorageOrchestrator !== "function") return;

    const orchestrator = createStorageOrchestrator({
      defaultAdapterName: "work-data",
      eventBus
    });
    orchestrator.registerAdapter("work-data", adapter);
    storage = orchestrator;
    eventBus?.emit("work-data:ready", {
      adapter: "work-data",
      keys
    });
  });
})();

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
    if (storage) return storage.getJson(String(key), { fallback });

    const raw = get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function setJson(key, value) {
    return storage
      ? storage.setJson(String(key), value)
      : set(key, JSON.stringify(value));
  }

  function getFirst(keysToTry) {
    for (const key of keysToTry) {
      const value = get(key);
      if (value) return value;
    }
    return null;
  }

  window.CherryWorkDataStorage = {
    keys,
    get,
    set,
    remove,
    getJson,
    setJson,
    getFirst
  };

  window.CherryLegacyCore?.withCore(core => {
    const createStorageOrchestrator = core.storage?.createStorageOrchestrator;
    if (typeof createStorageOrchestrator !== "function") return;

    const orchestrator = createStorageOrchestrator({
      defaultAdapterName: "work-data"
    });
    orchestrator.registerAdapter("work-data", adapter);
    storage = orchestrator;
  });
})();
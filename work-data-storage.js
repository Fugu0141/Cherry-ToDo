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

  function get(key) {
    return adapter.get(String(key));
  }

  function set(key, value) {
    return adapter.set(String(key), String(value));
  }

  function remove(key) {
    return adapter.remove(String(key));
  }

  function getJson(key, fallback = null) {
    const raw = get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function setJson(key, value) {
    return set(key, JSON.stringify(value));
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
})();

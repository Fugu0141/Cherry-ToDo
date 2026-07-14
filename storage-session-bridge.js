(() => {
  const policy = window.CherryStoragePolicy;
  const memory = window.CherryStorageAdapters?.memory;
  if (!policy || !memory || window.CherryStorageSessionBridge) return;

  const routedKeys = new Set([
    "cherry-workspace-v1",
    "cherry-session-context-v1",
    "quest-sticky-todo-v10",
    "quest-sticky-todo-v9",
    "quest-sticky-todo-v8",
    "quest-sticky-todo-v6",
    "quest-sticky-todo-v5",
    "quest-sticky-todo-v4",
    "quest-sticky-todo-v3",
    "quest-sticky-todo-v2"
  ]);

  const storagePrototype = Object.getPrototypeOf(window.localStorage);
  const originalGetItem = storagePrototype.getItem;
  const originalSetItem = storagePrototype.setItem;
  const originalRemoveItem = storagePrototype.removeItem;

  function shouldRoute(storage, key) {
    return storage === window.localStorage
      && policy.mode() === "session"
      && routedKeys.has(String(key));
  }

  storagePrototype.getItem = function getItem(key) {
    if (shouldRoute(this, key)) return memory.get(String(key));
    return originalGetItem.call(this, key);
  };

  storagePrototype.setItem = function setItem(key, value) {
    if (shouldRoute(this, key)) {
      memory.set(String(key), String(value));
      return;
    }
    return originalSetItem.call(this, key, value);
  };

  storagePrototype.removeItem = function removeItem(key) {
    if (shouldRoute(this, key)) {
      memory.remove(String(key));
      return;
    }
    return originalRemoveItem.call(this, key);
  };

  function hasEphemeralWork() {
    if (policy.mode() !== "session") return false;

    const rawWorkspace = memory.get("cherry-workspace-v1");
    if (rawWorkspace) {
      try {
        const workspace = JSON.parse(rawWorkspace);
        if (Array.isArray(workspace?.tabs) && workspace.tabs.length > 0) return true;
      } catch (_) {
        return true;
      }
    }

    const rawState = memory.get("quest-sticky-todo-v10");
    if (!rawState) return false;
    try {
      const savedState = JSON.parse(rawState);
      return Object.keys(savedState?.tasks || {}).length > 0;
    } catch (_) {
      return true;
    }
  }

  window.addEventListener("beforeunload", event => {
    if (!hasEphemeralWork()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  window.CherryStorageSessionBridge = {
    routedKeys: [...routedKeys],
    hasEphemeralWork
  };
})();

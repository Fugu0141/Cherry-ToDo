(() => {
  const policy = window.CherryStoragePolicy;
  const memory = window.CherryStorageAdapters?.memory;
  const workData = window.CherryWorkDataStorage;
  if (!policy || !memory || window.CherryStorageSessionBridge) return;

  const routedKeys = new Set([
    workData?.keys?.workspace || "cherry-workspace-v1",
    workData?.keys?.sessionContext || "cherry-session-context-v1",
    workData?.keys?.taskState || "quest-sticky-todo-v10",
    ...(workData?.keys?.legacyTaskStates || [
      "quest-sticky-todo-v9",
      "quest-sticky-todo-v8",
      "quest-sticky-todo-v6",
      "quest-sticky-todo-v5",
      "quest-sticky-todo-v4",
      "quest-sticky-todo-v3",
      "quest-sticky-todo-v2"
    ])
  ]);
  const consentKey = policy.consentKey || "cherry-storage-consent-v1";

  function persistentStorage() {
    try {
      return window.localStorage;
    } catch (_) {
      return null;
    }
  }

  function hasEphemeralWork() {
    if (policy.mode() !== "session") return false;

    const rawWorkspace = memory.get(workData?.keys?.workspace || "cherry-workspace-v1");
    if (rawWorkspace) {
      try {
        const workspace = JSON.parse(rawWorkspace);
        if (Array.isArray(workspace?.tabs) && workspace.tabs.length > 0) return true;
      } catch (_) {
        return true;
      }
    }

    const rawState = memory.get(workData?.keys?.taskState || "quest-sticky-todo-v10");
    if (!rawState) return false;
    try {
      const savedState = JSON.parse(rawState);
      return Object.keys(savedState?.tasks || {}).length > 0;
    } catch (_) {
      return true;
    }
  }

  function hasPersistentData() {
    const storage = persistentStorage();
    if (!storage) return false;
    try {
      return [...routedKeys].some(key => storage.getItem(key) !== null);
    } catch (_) {
      return false;
    }
  }

  function clearPersistentData() {
    const storage = persistentStorage();
    if (!storage) return false;
    try {
      for (const key of routedKeys) storage.removeItem(key);
      storage.removeItem(consentKey);
      return true;
    } catch (_) {
      return false;
    }
  }

  window.addEventListener("beforeunload", event => {
    if (!hasEphemeralWork()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  // Compatibility name kept for existing UI code. This object no longer patches Storage.prototype.
  window.CherryStorageSessionBridge = {
    routedKeys: [...routedKeys],
    hasEphemeralWork,
    hasPersistentData,
    clearPersistentData
  };
})();
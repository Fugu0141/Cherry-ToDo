(() => {
  const currentStorageKey = "quest-sticky-todo-v10";
  const legacyStorageKeys = [
    "quest-sticky-todo-v9", "quest-sticky-todo-v8", "quest-sticky-todo-v6",
    "quest-sticky-todo-v5", "quest-sticky-todo-v4", "quest-sticky-todo-v3", "quest-sticky-todo-v2"
  ];
  const saveDelayMs = 160;
  const maxUndoSnapshots = 80;
  const appBootSaveNow = typeof saveNow === "function" ? saveNow : null;
  const adapters = window.CherryStorageAdapters;
  const primaryStorage = adapters?.local;
  const fallbackStorage = adapters?.memory;

  function readItem(key) {
    return primaryStorage?.get(key) ?? fallbackStorage?.get(key) ?? null;
  }

  function writeItem(key, value) {
    if (primaryStorage?.set(key, value)) return true;
    return fallbackStorage?.set(key, value) ?? false;
  }

  function storedStateRaw() {
    return [currentStorageKey, ...legacyStorageKeys].map(readItem).find(Boolean) || null;
  }

  function normalizeLegacyBranchModes(nextState) {
    for (const task of Object.values(nextState?.tasks || {})) {
      if (task.parentId && !task.branchMode) task.branchMode = "same";
    }
  }

  function saveNowFromState() {
    writeItem(currentStorageKey, JSON.stringify(state));
  }

  function scheduleStateSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, saveDelayMs);
  }

  function loadStoredState() {
    const raw = storedStateRaw();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tasks) {
        normalizeLegacyBranchModes(parsed);
        state = parsed;
      }
    } catch {
      state = makeInitialState();
    }
  }

  function snapshotState() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > maxUndoSnapshots) undoStack.shift();
  }

  if (appBootSaveNow) window.removeEventListener("beforeunload", appBootSaveNow);
  saveNow = saveNowFromState;
  scheduleSave = scheduleStateSave;
  load = loadStoredState;
  snapshot = snapshotState;
  window.addEventListener("beforeunload", saveNowFromState);

  window.cherryStorage = {
    currentStorageKey,
    legacyStorageKeys: [...legacyStorageKeys],
    load: loadStoredState,
    saveNow: saveNowFromState,
    scheduleSave: scheduleStateSave,
    snapshot: snapshotState
  };

  const shouldMountWorkspace = window.CherryStartupState?.shouldMountWorkspace?.() ?? true;
  if (shouldMountWorkspace) {
    load();
    refreshLaneDates();
    branchLayout();
    requestRender();
  }
})();
(() => {
  const policy = window.CherryStoragePolicy;
  const memory = window.CherryStorageAdapters?.memory;
  if (!policy || !memory || window.CherryStorageSessionBridge) return;

  const routedKeys = new Set([
    "cherry-workspace-v1",
    "cherry-session-context-v1",
    "quest-sticky-todo-v10",
    "quest-sticky-todo-v9",
    "quest-st
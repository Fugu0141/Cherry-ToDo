(() => {
  const PERSISTENT = "persistent";
  const SESSION = "session";
  const choiceKey = "cherry-storage-mode-v1";
  const adapters = window.CherryStorageAdapters;

  function readSessionChoice() {
    try {
      return sessionStorage.getItem(choiceKey) === SESSION ? SESSION : null;
    } catch (_) {
      return null;
    }
  }

  function writeSessionChoice(value) {
    try {
      if (value) sessionStorage.setItem(choiceKey, value);
      else sessionStorage
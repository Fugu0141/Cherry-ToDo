(() => {
  const root = document.documentElement;
  const consentKey = "cherry-storage-consent-v1";
  const sessionKey = "cherry-session-context-v1";
  const workspaceKey = "cherry-workspace-v1";
  const workspaceId = "local-workspace-v1";
  const shellFadeDurationMs = 180;

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null
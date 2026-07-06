(() => {
  const storageKey = "cherry-todo-welcome-dismissed-v1";

  try {
    localStorage.setItem(storageKey, "true");
  } catch (_) {
    // The welcome splash has been folded into the Start page for v0.1.
  }

  window.cherryWelcomeSplash = {
    storageKey,
    disabled: true,
    reason: "The first-run welcome popup was replaced by the Start page."
  };
})();

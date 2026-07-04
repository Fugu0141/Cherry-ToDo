(() => {
  const STORAGE_KEY = "cherry-theme-mode";
  const MODES = ["system", "light", "dark"];
  const LABELS = {
    system: "テーマ: 自動",
    light: "テーマ: ライト",
    dark: "テーマ: ダーク",
  };

  const TITLES = {
    system: "システム設定に合わせてテーマを自動選択します",
    light: "ライトテーマを使用中です。クリックでダークテーマに切り替えます",
    dark: "ダークテーマを使用中です。クリックで自動選択に戻します",
  };

  function safeGetMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return MODES.includes(saved) ? saved : "system";
    } catch (_) {
      return "system";
    }
  }

  function safeSetMode(mode) {
    try {
      if (mode === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch (_) {
      // Theme switching should still work for the current page even if storage is unavailable.
    }
  }

  function applyMode(mode, button) {
    const nextMode = MODES.includes(mode) ? mode : "system";
    document.documentElement.dataset.theme = nextMode;

    if (button) {
      button.textContent = LABELS[nextMode];
      button.title = TITLES[nextMode];
      button.dataset.themeMode = nextMode;
      button.setAttribute("aria-label", `${LABELS[nextMode]}。クリックで切り替え`);
    }
  }

  function getNextMode(mode) {
    if (mode === "system") return "light";
    if (mode === "light") return "dark";
    return "system";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("themeToggleBtn");
    let currentMode = safeGetMode();
    applyMode(currentMode, button);

    if (!button) return;

    button.addEventListener("click", () => {
      currentMode = getNextMode(currentMode);
      safeSetMode(currentMode);
      applyMode(currentMode, button);
    });

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", () => {
      if (currentMode === "system") {
        applyMode(currentMode, button);
      }
    });
  });
})();

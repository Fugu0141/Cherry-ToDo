(() => {
  const STORAGE_KEY = "cherry-theme-mode";
  const MODES = ["system", "light", "dark"];

  function t(key, fallback) {
    return window.CherryI18n?.t(key) || fallback;
  }

  function labelFor(mode) {
    if (mode === "light") return t("toolbar.themeLight", "テーマ: ライト");
    if (mode === "dark") return t("toolbar.themeDark", "テーマ: ダーク");
    return t("toolbar.themeAuto", "テーマ: 自動");
  }

  function titleFor(mode) {
    if (mode === "light") return t("theme.lightTitle", "ライトテーマを使用中です。クリックでダークテーマに切り替えます");
    if (mode === "dark") return t("theme.darkTitle", "ダークテーマを使用中です。クリックで自動選択に戻します");
    return t("theme.systemTitle", "システム設定に合わせてテーマを自動選択します");
  }

  function loadStylesheetOnce(id, href) {
    if (document.querySelector(`link[data-experiment-id="${id}"]`)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.experimentId = id;
    document.head.appendChild(link);
  }

  function loadScriptOnce(id, src) {
    if (document.querySelector(`script[data-experiment-id="${id}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.dataset.experimentId = id;
    document.body.appendChild(script);
  }

  function loadExperimentStylesheets() {
    loadStylesheetOnce("paper-canvas", "./theme-experiment-a.css?v=20260705-1");
    loadStylesheetOnce("mobile-control-cleanup", "./mobile-control-cleanup.css?v=20260705-1");
  }

  function loadReleasePrepAssets() {
    loadScriptOnce("release-prep-loader", "./release-prep-loader.js?v=20260706-1");
  }

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
      const label = labelFor(nextMode);
      button.textContent = label;
      button.title = titleFor(nextMode);
      button.dataset.themeMode = nextMode;
      button.setAttribute("aria-label", window.CherryI18n?.t("theme.aria", { label }) || `${label}。クリックで切り替え`);
    }
  }

  function getNextMode(mode) {
    if (mode === "system") return "light";
    if (mode === "light") return "dark";
    return "system";
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadExperimentStylesheets();
    loadReleasePrepAssets();

    const button = document.getElementById("themeToggleBtn");
    let currentMode = safeGetMode();
    applyMode(currentMode, button);

    if (!button) return;

    button.addEventListener("click", () => {
      currentMode = getNextMode(currentMode);
      safeSetMode(currentMode);
      applyMode(currentMode, button);
    });

    window.CherryI18n?.onChange(() => applyMode(currentMode, button));

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", () => {
      if (currentMode === "system") {
        applyMode(currentMode, button);
      }
    });
  });
})();

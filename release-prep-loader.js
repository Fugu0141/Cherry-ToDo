(() => {
  const version = "20260715-2";

  const defaultScriptOrder = [
    ["i18n", "i18n.js"],
    ["dialog", "cherry-dialog.js"],
    ["ui", "release-prep-ui.js"],
    ["task-delete", "task-delete-dialog.js"],
    ["flow-popovers", "release-flow-popovers.js"],
    ["tutorial", "tutorial.js"],
    ["storage-session-bridge", "storage-session-bridge.js"],
    ["tabs", "tab-manager.js"],
    ["tab-add-button-inline", "tab-add-button-inline.js"],
    ["tab-rename", "tab-rename-shortcut.js"],
    ["start-page-oss", "start-page-oss.js"],
    ["storage-data-controls", "storage-data-controls.js"],
    ["start-page-focus", "start-page-focus.js"],
    ["start-page-language", "start-page-language.js"],
    ["toolbar-command-menu", "toolbar-command-menu.js"],
    ["mobile-list-filters", "mobile-list-filter-collapse.js"],
    ["list-state-guard", "list-view-state-guard.js"],
    ["session-context", "session-context.js"],
    ["workspace-startup-guard", "workspace-startup-guard.js"]
  ];

  const startFirstScriptOrder = [
    ["i18n", "i18n.js"],
    ["dialog", "cherry-dialog.js"],
    ["storage-session-bridge", "storage-session-bridge.js"],
    ["tabs", "tab-manager.js"],
    ["tab-add-button-inline", "tab-add-button-inline.js"],
    ["tab-rename", "tab-rename-shortcut.js"],
    ["start-page-focus", "start-page-focus.js"],
    ["start-page-language", "start-page-language.js"],
    ["storage-data-controls", "storage-data-controls.js"],
    ["start-page-oss", "start-page-oss.js"],
    ["ui", "release-prep-ui.js"],
    ["task-delete", "task-delete-dialog.js"],
    ["flow-popovers", "release-flow-popovers.js"],
    ["tutorial", "tutorial.js"],
    ["toolbar-command-menu", "toolbar-command-menu.js"],
    ["mobile-list-filters", "mobile-list-filter-collapse.js"],
    ["list-state-guard", "list-view-state-guard.js"],
    ["session-context", "session-context.js"],
    ["workspace-startup-guard", "workspace-startup-guard.js"]
  ];

  function loadCssOnce(id, href) {
    if (document.querySelector(`link[data-release-prep-id="${id}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.releasePrepId = id;
    document.head.appendChild(link);
  }

  function loadScriptOnce(id, src) {
    return new Promise(resolve => {
      if (document.querySelector(`script[data-release-prep-id="${id}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.dataset.releasePrepId = id;
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  }

  function waitForStartPageReady() {
    if (document.getElementById("startPage")?.dataset.enhancedReady === "true") {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      let settled = false;
      let timeoutId = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("cherry-start-page-ready", finish);
        if (timeoutId !== null) clearTimeout(timeoutId);
        resolve();
      };

      window.addEventListener("cherry-start-page-ready", finish, { once: true });
      timeoutId = setTimeout(finish, 1500);
      requestAnimationFrame(() => {
        if (document.getElementById("startPage")?.dataset.enhancedReady === "true") finish();
      });
    });
  }

  async function loadScriptsInOrder(order, { pauseAfterStartReady = false } = {}) {
    for (const [id, filename] of order) {
      await loadScriptOnce(id, `./${filename}?v=${version}`);
      if (pauseAfterStartReady && id === "start-page-oss") {
        await waitForStartPageReady();
      }
    }
  }

  async function loadReleasePrep() {
    loadCssOnce("layout-polish", `./release-layout-polish.css?v=${version}`);
    loadCssOnce("contrast", `./release-contrast.css?v=${version}`);
    loadCssOnce("toolbar-priority", `./release-toolbar-priority.css?v=${version}`);
    loadCssOnce("toolbar-command-menu", `./toolbar-command-menu.css?v=${version}`);
    loadCssOnce("dialog", `./cherry-dialog.css?v=${version}`);
    loadCssOnce("task-delete", `./task-delete-dialog.css?v=${version}`);
    loadCssOnce("tab-rename", `./tab-rename-shortcut.css?v=${version}`);
    loadCssOnce("flow-popovers", `./release-flow-popovers.css?v=${version}`);
    loadCssOnce("tutorial", `./tutorial.css?v=${version}`);
    loadCssOnce("tutorial-preview-fix", `./tutorial-preview-fix.css?v=${version}`);
    loadCssOnce("tabs", `./tab-manager.css?v=${version}`);
    loadCssOnce("workspace-grid", `./workspace-grid-row-fix.css?v=${version}`);
    loadCssOnce("start-page-oss", `./start-page-oss.css?v=${version}`);
    loadCssOnce("start-page-focus", `./start-page-focus.css?v=${version}`);
    loadCssOnce("start-page-language", `./start-page-language.css?v=${version}`);
    loadCssOnce("mobile-rescue", `./mobile-release-rescue.css?v=${version}`);
    loadCssOnce("start-page-footer-oss", `./start-page-footer-oss.css?v=${version}`);
    loadCssOnce("storage-data-controls", `./storage-data-controls.css?v=${version}`);
    loadCssOnce("mobile-list-filters", `./mobile-list-filter-collapse.css?v=${version}`);
    loadCssOnce("workspace-tab-overflow", `./workspace-tab-overflow-fix.css?v=${version}`);
    loadCssOnce("tab-add-button-inline", `./tab-add-button-inline.css?v=${version}`);
    loadCssOnce("list-overlap", `./list-view-overlap-fix.css?v=${version}`);
    loadCssOnce("mobile-desktop-toolbar-fit", `./mobile-desktop-toolbar-fit.css?v=${version}`);
    loadCssOnce("v02-mobile-toolbar", `./v02-mobile-toolbar.css?v=${version}`);
    loadCssOnce("v02-mobile-actions", `./v02-mobile-actions.css?v=${version}`);

    const startRoute = window.CherryStartupState?.route === "start";
    await loadScriptsInOrder(
      startRoute ? startFirstScriptOrder : defaultScriptOrder,
      { pauseAfterStartReady: startRoute }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReleasePrep, { once: true });
  } else {
    loadReleasePrep();
  }
})();

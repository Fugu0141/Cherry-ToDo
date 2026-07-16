(() => {
  const version = "20260715-2";

  const defaultScriptOrder = [
    ["i18n", "i18n.js"],
    ["dialog", "cherry-dialog.js"],
    ["ui", "release-prep-ui.js"],
    ["task-delete", "src/features/task-delete/implementation.js"],
    ["task-delete-context-action-registration", "src/features/task-delete/registration.js"],
    ["auto-layout-board-tool-registration", "src/features/auto-layout/registration.js"],
    ["flow-popovers", "release-flow-popovers.js"],
    ["tutorial", "src/features/tutorial/implementation.js"],
    ["tutorial-extension-registration", "src/features/tutorial/registration.js"],
    ["storage-session-bridge", "src/infrastructure/storage/session-bridge.js"],
    ["tabs", "tab-manager.js"],
    ["workspace-transfer-extension-registration", "src/features/workspace-transfer/registration.js"],
    ["tab-add-button-inline", "src/features/workspace-tabs/inline-add-button.js"],
    ["tab-rename", "src/features/workspace-tabs/rename-shortcut.js"],
    ["start-page-oss", "src/features/start-page/implementation.js"],
    ["storage-data-controls", "src/infrastructure/storage/data-controls.js"],
    ["start-page-focus", "src/features/start-page/focus.js"],
    ["start-page-language", "src/features/start-page/language.js"],
    ["toolbar-command-menu", "toolbar-command-menu.js"],
    ["mobile-list-filters", "mobile-list-filter-collapse.js"],
    ["list-state-guard", "list-view-state-guard.js"],
    ["session-context", "src/app/workspace/session-context.js"],
    ["workspace-startup-guard", "src/app/workspace/startup-guard.js"]
  ];

  const startFirstScriptOrder = [
    ["i18n", "i18n.js"],
    ["dialog", "cherry-dialog.js"],
    ["storage-session-bridge", "src/infrastructure/storage/session-bridge.js"],
    ["tabs", "tab-manager.js"],
    ["workspace-transfer-extension-registration", "src/features/workspace-transfer/registration.js"],
    ["tab-add-button-inline", "src/features/workspace-tabs/inline-add-button.js"],
    ["tab-rename", "src/features/workspace-tabs/rename-shortcut.js"],
    ["start-page-focus", "src/features/start-page/focus.js"],
    ["start-page-language", "src/features/start-page/language.js"],
    ["storage-data-controls", "src/infrastructure/storage/data-controls.js"],
    ["start-page-oss", "src/features/start-page/implementation.js"],
    ["ui", "release-prep-ui.js"],
    ["task-delete", "src/features/task-delete/implementation.js"],
    ["task-delete-context-action-registration", "src/features/task-delete/registration.js"],
    ["auto-layout-board-tool-registration", "src/features/auto-layout/registration.js"],
    ["flow-popovers", "release-flow-popovers.js"],
    ["tutorial", "src/features/tutorial/implementation.js"],
    ["tutorial-extension-registration", "src/features/tutorial/registration.js"],
    ["toolbar-command-menu", "toolbar-command-menu.js"],
    ["mobile-list-filters", "mobile-list-filter-collapse.js"],
    ["list-state-guard", "list-view-state-guard.js"],
    ["session-context", "src/app/workspace/session-context.js"],
    ["workspace-startup-guard", "src/app/workspace/startup-guard.js"]
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
    loadCssOnce("task-delete", `./src/features/task-delete/styles.css?v=${version}`);
    loadCssOnce("tab-rename", `./src/features/workspace-tabs/rename-shortcut.css?v=${version}`);
    loadCssOnce("flow-popovers", `./release-flow-popovers.css?v=${version}`);
    loadCssOnce("tutorial", `./src/features/tutorial/styles.css?v=${version}`);
    loadCssOnce("tutorial-preview-fix", `./src/features/tutorial/preview-fix.css?v=${version}`);
    loadCssOnce("tabs", `./tab-manager.css?v=${version}`);
    loadCssOnce("workspace-grid", `./workspace-grid-row-fix.css?v=${version}`);
    loadCssOnce("start-page-oss", `./src/features/start-page/styles.css?v=${version}`);
    loadCssOnce("start-page-focus", `./src/features/start-page/focus.css?v=${version}`);
    loadCssOnce("start-page-language", `./src/features/start-page/language.css?v=${version}`);
    loadCssOnce("mobile-rescue", `./mobile-release-rescue.css?v=${version}`);
    loadCssOnce("start-page-footer-oss", `./src/features/start-page/footer-layout.css?v=${version}`);
    loadCssOnce("storage-data-controls", `./src/infrastructure/storage/data-controls.css?v=${version}`);
    loadCssOnce("mobile-list-filters", `./mobile-list-filter-collapse.css?v=${version}`);
    loadCssOnce("workspace-tab-overflow", `./workspace-tab-overflow-fix.css?v=${version}`);
    loadCssOnce("tab-add-button-inline", `./src/features/workspace-tabs/inline-add-button.css?v=${version}`);
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
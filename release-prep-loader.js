(() => {
  const version = "20260707-7";

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
    loadCssOnce("tabs", `./tab-manager.css?v=${version}`);
    loadCssOnce("start-page-oss", `./start-page-oss.css?v=${version}`);
    loadCssOnce("start-page-focus", `./start-page-focus.css?v=${version}`);
    loadCssOnce("mobile-rescue", `./mobile-release-rescue.css?v=${version}`);
    loadCssOnce("start-page-footer-oss", `./start-page-footer-oss.css?v=${version}`);
    loadCssOnce("mobile-list-filters", `./mobile-list-filter-collapse.css?v=${version}`);
    loadCssOnce("workspace-tab-overflow", `./workspace-tab-overflow-fix.css?v=${version}`);
    loadCssOnce("list-overlap", `./list-view-overlap-fix.css?v=${version}`);

    await loadScriptOnce("i18n", `./i18n.js?v=${version}`);
    await loadScriptOnce("dialog", `./cherry-dialog.js?v=${version}`);
    await loadScriptOnce("ui", `./release-prep-ui.js?v=${version}`);
    await loadScriptOnce("task-delete", `./task-delete-dialog.js?v=${version}`);
    await loadScriptOnce("flow-popovers", `./release-flow-popovers.js?v=${version}`);
    await loadScriptOnce("tutorial", `./tutorial.js?v=${version}`);
    await loadScriptOnce("tabs", `./tab-manager.js?v=${version}`);
    await loadScriptOnce("tab-rename", `./tab-rename-shortcut.js?v=${version}`);
    await loadScriptOnce("start-page-oss", `./start-page-oss.js?v=${version}`);
    await loadScriptOnce("start-page-focus", `./start-page-focus.js?v=${version}`);
    await loadScriptOnce("toolbar-command-menu", `./toolbar-command-menu.js?v=${version}`);
    await loadScriptOnce("mobile-list-filters", `./mobile-list-filter-collapse.js?v=${version}`);
    await loadScriptOnce("list-state-guard", `./list-view-state-guard.js?v=${version}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReleasePrep, { once: true });
  } else {
    loadReleasePrep();
  }
})();

(() => {
  const version = "20260706-5";

  function loadCssOnce(id, href) {
    if (document.querySelector(`link[data-release-prep-id="${id}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.releasePrepId = id;
    document.head.appendChild(link);
  }

  function loadScriptOnce(id, src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-release-prep-id="${id}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.dataset.releasePrepId = id;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadReleasePrep() {
    loadCssOnce("layout-polish", `./release-layout-polish.css?v=${version}`);
    loadCssOnce("contrast", `./release-contrast.css?v=${version}`);
    loadCssOnce("dialog", `./cherry-dialog.css?v=${version}`);
    loadCssOnce("flow-popovers", `./release-flow-popovers.css?v=${version}`);
    loadCssOnce("tutorial", `./tutorial.css?v=${version}`);
    loadCssOnce("tabs", `./tab-manager.css?v=${version}`);
    loadCssOnce("start-page-oss", `./start-page-oss.css?v=${version}`);

    try {
      await loadScriptOnce("i18n", `./i18n.js?v=${version}`);
      await loadScriptOnce("dialog", `./cherry-dialog.js?v=${version}`);
      await loadScriptOnce("ui", `./release-prep-ui.js?v=${version}`);
      await loadScriptOnce("flow-popovers", `./release-flow-popovers.js?v=${version}`);
      await loadScriptOnce("tutorial", `./tutorial.js?v=${version}`);
      await loadScriptOnce("tabs", `./tab-manager.js?v=${version}`);
      await loadScriptOnce("start-page-oss", `./start-page-oss.js?v=${version}`);
    } catch (error) {
      console.error(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReleasePrep, { once: true });
  } else {
    loadReleasePrep();
  }
})();

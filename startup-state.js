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
      return null;
    }
  }

  function safeParse(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  function hasRestorableWorkspace() {
    const context = safeParse(safeGet(sessionKey));
    const workspace = safeParse(safeGet(workspaceKey));
    if (!context || !workspace || !Array.isArray(workspace.tabs)) return false;
    if (context.lastRoute !== "workspace" || context.activeWorkspaceId !== workspaceId) return false;
    if (typeof context.activeTabId !== "string") return false;
    return workspace.tabs.some(tab => tab?.id === context.activeTabId && tab?.state?.tasks);
  }

  const hasPersistentConsent = safeGet(consentKey) === "persistent";
  const route = !hasPersistentConsent
    ? "storage-choice"
    : hasRestorableWorkspace()
      ? "workspace"
      : "start";

  root.dataset.cherryStartupRoute = route;
  root.dataset.cherryStartupState = "booting";
  if (route === "workspace") root.dataset.cherryWorkspacePhase = "pending";

  const copy = {
    ja: {
      kicker: "Cherry を準備しています",
      workspaceTitle: "前回の作業を復元しています",
      workspaceBody: "最後に開いていたタブと表示を確認しています。",
      startTitle: "スタート画面を準備しています",
      startBody: "保存済みの作業と利用できる操作を確認しています。",
      storageTitle: "保存方法を確認しています",
      storageBody: "この端末に残すか、今回だけ使うかを選べます。",
      recoveryKicker: "起動を完了できませんでした",
      recoveryTitle: "Cherry の読み込みに時間がかかっています",
      recoveryBody: "ページを再読み込みしてください。保存済みデータは削除されません。",
      reload: "再読み込み"
    },
    en: {
      kicker: "Preparing Cherry",
      workspaceTitle: "Restoring your previous work",
      workspaceBody: "Checking the last active tab and view.",
      startTitle: "Preparing the Start page",
      startBody: "Checking saved work and available actions.",
      storageTitle: "Checking how to save your work",
      storageBody: "Choose whether to save on this device or use Cherry only for this session.",
      recoveryKicker: "Startup could not finish",
      recoveryTitle: "Cherry is taking longer than expected to load",
      recoveryBody: "Reload the page. Your saved data will not be deleted.",
      reload: "Reload"
    }
  };

  function currentLanguage() {
    const saved = safeGet("cherry-language-v1");
    if (saved === "en" || saved === "ja") return saved;
    return String(navigator.language || "ja").toLowerCase().startsWith("en") ? "en" : "ja";
  }

  function setShellCopy({ recovery = false } = {}) {
    const shell = document.getElementById("startupShell");
    if (!shell) return;
    const text = copy[currentLanguage()];

    const titleKey = route === "workspace"
      ? "workspaceTitle"
      : route === "storage-choice"
        ? "storageTitle"
        : "startTitle";
    const bodyKey = route === "workspace"
      ? "workspaceBody"
      : route === "storage-choice"
        ? "storageBody"
        : "startBody";

    shell.querySelector("[data-startup-copy='kicker']").textContent = recovery ? text.recoveryKicker : text.kicker;
    shell.querySelector("[data-startup-copy='title']").textContent = recovery ? text.recoveryTitle : text[titleKey];
    shell.querySelector("[data-startup-copy='body']").textContent = recovery ? text.recoveryBody : text[bodyKey];

    const reloadButton = shell.querySelector("[data-startup-reload]");
    if (reloadButton) {
      reloadButton.textContent = text.reload;
      reloadButton.hidden = !recovery;
    }
  }

  function expectedSurfaceReady() {
    if (route === "storage-choice") {
      const backdrop = document.querySelector(".storageChoiceBackdrop");
      const dialog = backdrop?.querySelector(".storageChoiceDialog");
      return Boolean(backdrop?.classList.contains("storageChoiceVisible") && dialog);
    }

    const startPage = document.getElementById("startPage");
    const workspaceBar = document.getElementById("workspaceBar");
    if (!startPage || !workspaceBar) return false;

    if (route === "workspace") {
      return startPage.classList.contains("hidden")
        && root.dataset.cherryWorkspacePhase === "ready";
    }

    return !startPage.classList.contains("hidden") && startPage.dataset.enhancedReady === "true";
  }

  function reducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }

  function nextPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  let observer = null;
  let recoveryTimer = null;
  let shellHideTimer = null;
  let ready = false;
  let releasing = false;

  function showShell() {
    clearTimeout(shellHideTimer);
    const shell = document.getElementById("startupShell");
    if (!shell) return;
    shell.removeAttribute("hidden");
    shell.dataset.startupVisible = "true";
  }

  async function finishStartup() {
    if (ready || releasing) return;
    releasing = true;
    clearTimeout(recoveryTimer);
    observer?.disconnect();

    const shell = document.getElementById("startupShell");
    const app = document.querySelector(".app");
    root.dataset.cherryStartupReleasing = "true";
    app?.removeAttribute("aria-hidden");

    await nextPaint();

    ready = true;
    if (shell) shell.dataset.startupVisible = "false";
    const fadeDuration = reducedMotion() ? 0 : shellFadeDurationMs;

    shellHideTimer = setTimeout(() => {
      shell?.setAttribute("hidden", "");
      root.dataset.cherryStartupState = route;
      delete root.dataset.cherryStartupReleasing;
      window.dispatchEvent(new CustomEvent("cherry-startup-ready", { detail: { route } }));
    }, fadeDuration);
  }

  function checkReady() {
    if (expectedSurfaceReady()) void finishStartup();
  }

  function beginWatching() {
    document.querySelector(".app")?.setAttribute("aria-hidden", "true");
    showShell();
    setShellCopy();

    document.querySelector("[data-startup-reload]")?.addEventListener("click", () => location.reload());

    observer = new MutationObserver(checkReady);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-enhanced-ready", "data-cherry-workspace-phase"]
    });

    window.addEventListener("cherry-workspace-updated", checkReady);
    window.addEventListener("cherry-start-page-ready", checkReady);
    window.addEventListener("cherry-workspace-view-ready", checkReady);
    checkReady();

    recoveryTimer = setTimeout(() => {
      if (ready || releasing) return;
      root.dataset.cherryStartupState = "fatal-recovery";
      setShellCopy({ recovery: true });
      showShell();
    }, 12000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", beginWatching, { once: true });
  } else {
    beginWatching();
  }

  window.CherryStartupState = {
    route,
    shouldMountWorkspace: () => route === "workspace",
    isReady: () => ready,
    checkReady
  };
})();
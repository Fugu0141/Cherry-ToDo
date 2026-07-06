(() => {
  let clickTimer = null;
  let lastTap = { tabId: null, time: 0 };
  let viewportCleanup = null;
  const doubleClickDelay = 260;
  const doubleTapDelay = 360;

  function bind() {
    const bar = document.getElementById("workspaceBar");
    const list = bar?.querySelector(".workspaceTabList");
    if (!bar || !list || bar.dataset.renameShortcutBound) return;
    bar.dataset.renameShortcutBound = "1";

    list.addEventListener("click", event => {
      const closeButton = event.target.closest("[data-tab-delete]");
      if (closeButton) return;

      const tabButton = event.target.closest("[data-tab-open]");
      if (!tabButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const tabId = tabButton.dataset.tabOpen;
      if (!tabId) return;

      const now = Date.now();
      const isNativeDoubleClick = event.detail >= 2;
      const isMobileDoubleTap = lastTap.tabId === tabId && now - lastTap.time <= doubleTapDelay;

      if (isNativeDoubleClick || isMobileDoubleTap) {
        clearTimeout(clickTimer);
        clickTimer = null;
        lastTap = { tabId: null, time: 0 };
        openRename(tabId);
        return;
      }

      lastTap = { tabId, time: now };
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickTimer = null;
        window.cherryWorkspace?.openTab?.(tabId);
      }, doubleClickDelay);
    }, true);

    list.addEventListener("dblclick", event => {
      const tabButton = event.target.closest("[data-tab-open]");
      if (!tabButton) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      clearTimeout(clickTimer);
      clickTimer = null;
      lastTap = { tabId: null, time: 0 };
      openRename(tabButton.dataset.tabOpen);
    }, true);
  }

  function syncKeyboardClass() {
    const viewport = window.visualViewport;
    const keyboardOpen = viewport ? window.innerHeight - viewport.height > 140 : false;
    document.body.classList.toggle("tabRenameKeyboardOpen", keyboardOpen);
  }

  function startViewportTracking() {
    viewportCleanup?.();
    const viewport = window.visualViewport;
    syncKeyboardClass();

    if (!viewport) {
      const onFocusIn = event => {
        if (event.target?.classList?.contains("cherryDialogField")) {
          document.body.classList.add("tabRenameKeyboardOpen");
        }
      };
      const onFocusOut = () => document.body.classList.remove("tabRenameKeyboardOpen");
      document.addEventListener("focusin", onFocusIn);
      document.addEventListener("focusout", onFocusOut);
      viewportCleanup = () => {
        document.removeEventListener("focusin", onFocusIn);
        document.removeEventListener("focusout", onFocusOut);
        document.body.classList.remove("tabRenameKeyboardOpen");
      };
      return;
    }

    viewport.addEventListener("resize", syncKeyboardClass);
    viewport.addEventListener("scroll", syncKeyboardClass);
    window.addEventListener("resize", syncKeyboardClass);
    viewportCleanup = () => {
      viewport.removeEventListener("resize", syncKeyboardClass);
      viewport.removeEventListener("scroll", syncKeyboardClass);
      window.removeEventListener("resize", syncKeyboardClass);
      document.body.classList.remove("tabRenameKeyboardOpen");
    };
  }

  async function openRename(tabId) {
    if (!tabId || !window.cherryWorkspace?.renameTab) return;
    document.body.classList.add("tabRenameDialogMode");
    startViewportTracking();
    try {
      await window.cherryWorkspace.renameTab(tabId);
    } finally {
      viewportCleanup?.();
      viewportCleanup = null;
      setTimeout(() => {
        document.body.classList.remove("tabRenameDialogMode");
        document.body.classList.remove("tabRenameKeyboardOpen");
      }, 120);
    }
  }

  function decorateTabs() {
    document.querySelectorAll("#workspaceBar [data-tab-open]").forEach(button => {
      button.dataset.renameHint = "true";
      button.removeAttribute("title");
      button.style.touchAction = "manipulation";
    });
  }

  function refresh() {
    bind();
    decorateTabs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh, { once: true });
  } else {
    refresh();
  }

  window.addEventListener("cherry-workspace-updated", refresh);
  window.CherryI18n?.onChange(refresh);
})();

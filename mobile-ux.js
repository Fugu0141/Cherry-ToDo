(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;

  if (!baseEnsureContentSize) return;

  function isMobileVerticalBoard() {
    return mobileViewportQuery.matches && typeof isVerticalMode === "function" && isVerticalMode();
  }

  function minimumVisibleWidth() {
    const boardWidth = board?.clientWidth || 0;
    const viewportWidth = document.documentElement?.clientWidth || 0;
    return Math.max(320, boardWidth, viewportWidth - 12);
  }

  function compactVerticalContentWidth() {
    let width = minimumVisibleWidth();

    for (const task of getTasks()) {
      if (!Number.isFinite(task.x)) continue;
      width = Math.max(width, task.x + noteW + 64);
    }

    if (Number.isFinite(maxTrack)) {
      const lastTrack = Math.max(0, maxTrack);
      width = Math.max(width, vTrackToX(lastTrack) + noteW + 64);
    }

    return Math.ceil(width);
  }

  function applyLayerWidth(width) {
    [links, lanesEl, dateHud, notesEl].forEach(el => {
      if (!el) return;
      el.style.minWidth = `${width}px`;
      el.style.width = `${width}px`;
    });

    if (links) links.setAttribute("width", String(width));
    board.style.setProperty("--mobile-content-w", `${width}px`);
  }

  function clampScrollToContent() {
    if (!isMobileVerticalBoard()) return;
    const maxLeft = Math.max(0, contentWidth - board.clientWidth);
    if (board.scrollLeft > maxLeft) board.scrollLeft = maxLeft;
  }

  ensureContentSize = function() {
    baseEnsureContentSize();

    if (!isMobileVerticalBoard()) return;

    contentWidth = compactVerticalContentWidth();
    applyLayerWidth(contentWidth);
    clampScrollToContent();
  };

  board.addEventListener("scroll", clampScrollToContent, { passive: true });

  mobileViewportQuery.addEventListener("change", () => {
    if (typeof requestRender === "function") requestRender();
  });
})();

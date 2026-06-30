(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;
  const baseSyncMetrics = typeof syncMetrics === "function" ? syncMetrics : null;

  if (!baseEnsureContentSize) return;

  function isMobileVerticalBoard() {
    return mobileViewportQuery.matches && typeof isVerticalMode === "function" && isVerticalMode();
  }

  function isDesktopHorizontalBoard() {
    return !mobileViewportQuery.matches && typeof isVerticalMode === "function" && !isVerticalMode();
  }

  function layerElements() {
    return [links, lanesEl, dateHud, notesEl].filter(Boolean);
  }

  function minimumVisibleWidth() {
    const boardWidth = board?.clientWidth || 0;
    const viewportWidth = document.documentElement?.clientWidth || 0;
    return Math.max(320, boardWidth, viewportWidth - 12);
  }

  function minimumVisibleHeight() {
    const boardHeight = board?.clientHeight || 0;
    const viewportHeight = document.documentElement?.clientHeight || 0;
    return Math.max(360, boardHeight, viewportHeight - 170);
  }

  function mobileBalancedNoteWidth() {
    const visibleWidth = minimumVisibleWidth();
    const leftRail = 92;
    const sidePadding = 30;
    return Math.max(mobileNoteW, Math.min(260, visibleWidth - leftRail - sidePadding));
  }

  if (baseSyncMetrics) {
    syncMetrics = function() {
      baseSyncMetrics();
      if (!isMobileVerticalBoard()) return;

      noteW = mobileBalancedNoteWidth();
      board.style.setProperty("--note-w", `${noteW}px`);
      board.style.setProperty("--note-h", `${noteH}px`);
    };
  }

  function compactVerticalContentWidth() {
    let width = minimumVisibleWidth();

    for (const task of getTasks()) {
      if (!Number.isFinite(task.x)) continue;
      width = Math.max(width, task.x + noteW + 44);
    }

    if (Number.isFinite(maxTrack)) {
      const lastTrack = Math.max(0, maxTrack);
      width = Math.max(width, vTrackToX(lastTrack) + noteW + 44);
    }

    return Math.ceil(width);
  }

  function compactHorizontalContentHeight() {
    let height = minimumVisibleHeight();

    for (const task of getTasks()) {
      if (!Number.isFinite(task.y)) continue;
      height = Math.max(height, task.y + noteH + 92);
    }

    if (Number.isFinite(maxTrack)) {
      const lastTrack = Math.max(0, maxTrack);
      height = Math.max(height, hTrackToY(lastTrack) + noteH + 92);
    }

    return Math.ceil(height);
  }

  function applyLayerWidth(width) {
    layerElements().forEach(el => {
      el.style.minWidth = `${width}px`;
      el.style.width = `${width}px`;
    });

    if (links) links.setAttribute("width", String(width));
    board.style.setProperty("--mobile-content-w", `${width}px`);
  }

  function applyLayerHeight(height) {
    layerElements().forEach(el => {
      el.style.minHeight = `${height}px`;
      el.style.height = `${height}px`;
    });

    if (links) links.setAttribute("height", String(height));
    board.style.setProperty("--desktop-content-h", `${height}px`);
  }

  function clearManagedInlineSizes() {
    layerElements().forEach(el => {
      el.style.width = "";
      el.style.height = "";
    });
  }

  function clampScrollToContent() {
    if (isMobileVerticalBoard()) {
      const maxLeft = Math.max(0, contentWidth - board.clientWidth);
      if (board.scrollLeft > maxLeft) board.scrollLeft = maxLeft;
    }

    if (isDesktopHorizontalBoard()) {
      const maxTop = Math.max(0, contentHeight - board.clientHeight);
      if (board.scrollTop > maxTop) board.scrollTop = maxTop;
    }
  }

  ensureContentSize = function() {
    baseEnsureContentSize();
    clearManagedInlineSizes();

    if (isMobileVerticalBoard()) {
      contentWidth = compactVerticalContentWidth();
      applyLayerWidth(contentWidth);
    }

    if (isDesktopHorizontalBoard()) {
      contentHeight = compactHorizontalContentHeight();
      applyLayerHeight(contentHeight);
    }

    clampScrollToContent();
  };

  board.addEventListener("scroll", clampScrollToContent, { passive: true });

  mobileViewportQuery.addEventListener("change", () => {
    if (typeof requestRender === "function") requestRender();
  });
})();

(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;

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

  function taskRightEdge() {
    let right = 0;
    for (const task of getTasks()) {
      if (!Number.isFinite(task.x)) continue;
      right = Math.max(right, task.x + noteW);
    }
    return right;
  }

  function taskBottomEdge() {
    let bottom = 0;
    for (const task of getTasks()) {
      if (!Number.isFinite(task.y)) continue;
      bottom = Math.max(bottom, task.y + noteH);
    }
    return bottom;
  }

  function compactVerticalContentWidth() {
    const visibleWidth = minimumVisibleWidth();
    const taskEdge = taskRightEdge();
    const taskPadding = taskEdge > 0 ? 28 : 0;
    return Math.ceil(Math.max(visibleWidth, taskEdge + taskPadding));
  }

  function compactHorizontalContentHeight() {
    const visibleHeight = minimumVisibleHeight();
    const taskEdge = taskBottomEdge();
    const taskPadding = taskEdge > 0 ? 72 : 0;
    return Math.ceil(Math.max(visibleHeight, taskEdge + taskPadding));
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

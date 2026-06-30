(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;
  const rootStyle = document.documentElement.style;

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

  function activeMobileModal() {
    if (!mobileViewportQuery.matches) return null;
    return document.querySelector(".modalBackdrop:not(.hidden) .modal");
  }

  function activeModalInput() {
    const modal = activeMobileModal();
    const active = document.activeElement;
    return modal && active instanceof HTMLElement && modal.contains(active) && active.matches("input, textarea, select")
      ? active
      : null;
  }

  function updateMobileViewportVars() {
    if (!mobileViewportQuery.matches) {
      rootStyle.removeProperty("--mobile-visual-viewport-top");
      rootStyle.removeProperty("--mobile-visual-viewport-height");
      document.body.classList.remove("mobileKeyboardOpen");
      return;
    }

    const viewport = window.visualViewport;
    const height = Math.max(320, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 520));
    const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
    const layoutHeight = Math.round(window.innerHeight || document.documentElement.clientHeight || height);
    const keyboardLikelyOpen = Boolean(activeModalInput()) && height < layoutHeight - 72;

    rootStyle.setProperty("--mobile-visual-viewport-top", `${top}px`);
    rootStyle.setProperty("--mobile-visual-viewport-height", `${height}px`);
    document.body.classList.toggle("mobileKeyboardOpen", keyboardLikelyOpen);

    requestAnimationFrame(keepFocusedFieldVisible);
  }

  function keepFocusedFieldVisible() {
    const input = activeModalInput();
    if (!input) return;

    input.scrollIntoView({ block: "nearest", inline: "nearest" });
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
    updateMobileViewportVars();
  };

  board.addEventListener("scroll", clampScrollToContent, { passive: true });

  mobileViewportQuery.addEventListener("change", () => {
    updateMobileViewportVars();
    if (typeof requestRender === "function") requestRender();
  });

  window.addEventListener("resize", updateMobileViewportVars, { passive: true });
  window.addEventListener("orientationchange", () => requestAnimationFrame(updateMobileViewportVars));
  window.visualViewport?.addEventListener("resize", updateMobileViewportVars, { passive: true });
  window.visualViewport?.addEventListener("scroll", updateMobileViewportVars, { passive: true });

  document.addEventListener("focusin", event => {
    if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select")) {
      updateMobileViewportVars();
    }
  });

  document.addEventListener("focusout", event => {
    if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select")) {
      setTimeout(updateMobileViewportVars, 80);
    }
  });

  [taskCancelBtn, taskSaveBtn, dateCancelBtn, dateSaveBtn].forEach(button => {
    button.addEventListener("click", () => requestAnimationFrame(updateMobileViewportVars));
  });

  updateMobileViewportVars();
})();

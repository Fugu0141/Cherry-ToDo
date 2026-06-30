(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;
  const rootStyle = document.documentElement.style;
  const visibleGap = 8;

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

  function visualHeight() {
    return Math.max(260, Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 520));
  }

  function readCurrentOffset() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--mobile-ime-offset");
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function neededOffset() {
    const modal = activeMobileModal();
    if (!activeModalInput() || !modal) return 0;

    const currentOffset = readCurrentOffset();
    const rect = modal.getBoundingClientRect();
    const unshiftedTop = rect.top + currentOffset;
    const unshiftedBottom = rect.bottom + currentOffset;
    const maxVisibleBottom = visualHeight() - visibleGap;

    const overlap = Math.max(0, unshiftedBottom - maxVisibleBottom);
    const safeTopLimit = Math.max(0, unshiftedTop - visibleGap);
    return Math.round(Math.min(overlap, safeTopLimit));
  }

  function updateMobileViewportVars() {
    if (!mobileViewportQuery.matches) {
      rootStyle.removeProperty("--mobile-ime-offset");
      rootStyle.removeProperty("--mobile-visible-height");
      document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
      return;
    }

    const inputActive = Boolean(activeModalInput());
    const availableHeight = visualHeight();
    const offset = neededOffset();

    rootStyle.setProperty("--mobile-ime-offset", `${offset}px`);
    rootStyle.setProperty("--mobile-visible-height", `${availableHeight}px`);
    document.body.classList.toggle("mobileModalInputActive", inputActive);
    document.body.classList.toggle("mobileImeOpen", offset > 0);

    scheduleFocusedFieldReveal();
  }

  function scheduleFocusedFieldReveal() {
    requestAnimationFrame(keepFocusedFieldVisible);
    setTimeout(keepFocusedFieldVisible, 80);
    setTimeout(keepFocusedFieldVisible, 220);
    setTimeout(keepFocusedFieldVisible, 420);
  }

  function keepFocusedFieldVisible() {
    const input = activeModalInput();
    const modal = activeMobileModal();
    if (!input || !modal) return;

    const desiredTop = Math.max(0, input.offsetTop - 72);
    const maxScroll = Math.max(0, modal.scrollHeight - modal.clientHeight);
    modal.scrollTop = Math.min(desiredTop, maxScroll);
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

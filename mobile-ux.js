(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;
  const rootStyle = document.documentElement.style;
  const visibleGap = 4;
  let currentModalOffset = 0;

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

  function activeModalBackdrop() {
    return activeMobileModal()?.closest(".modalBackdrop") || null;
  }

  function activeModalInput() {
    const modal = activeMobileModal();
    const active = document.activeElement;
    return modal && active instanceof HTMLElement && modal.contains(active) && active.matches("input, textarea, select")
      ? active
      : null;
  }

  function setImportant(el, name, value) {
    el?.style.setProperty(name, value, "important");
  }

  function applyModalLayout(offset = currentModalOffset) {
    const modal = activeMobileModal();
    const backdrop = activeModalBackdrop();
    if (!modal || !backdrop || !mobileViewportQuery.matches) return;

    setImportant(backdrop, "position", "fixed");
    setImportant(backdrop, "inset", "0");
    setImportant(backdrop, "display", "flex");
    setImportant(backdrop, "align-items", "center");
    setImportant(backdrop, "justify-content", "center");
    setImportant(backdrop, "width", "100vw");
    setImportant(backdrop, "height", "100dvh");
    setImportant(backdrop, "padding", "12px 10px");
    setImportant(backdrop, "overflow", "hidden");
    setImportant(backdrop, "place-items", "initial");

    setImportant(modal, "flex", "0 0 auto");
    setImportant(modal, "width", "100%");
    setImportant(modal, "max-width", "min(640px, calc(100vw - 20px))");
    setImportant(modal, "height", "auto");
    setImportant(modal, "min-height", "0");
    setImportant(modal, "max-height", "min(72dvh, calc(100dvh - 24px))");
    setImportant(modal, "margin", "0");
    setImportant(modal, "border-radius", "24px");
    setImportant(modal, "overflow", "auto");
    setImportant(modal, "transform", `translateY(${-offset}px)`);
    setImportant(modal, "transition", "transform .16s ease");
  }

  function visualHeight() {
    return Math.max(260, Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 520));
  }

  function neededOffset() {
    const modal = activeMobileModal();
    if (!activeModalInput() || !modal) return 0;

    applyModalLayout(0);
    const rect = modal.getBoundingClientRect();
    const maxVisibleBottom = visualHeight() - visibleGap;
    const overlap = Math.max(0, rect.bottom - maxVisibleBottom);
    const safeTopLimit = Math.max(0, rect.top - visibleGap);
    return Math.round(Math.min(overlap, safeTopLimit));
  }

  function resetMobileImeVars() {
    currentModalOffset = 0;
    rootStyle.setProperty("--mobile-ime-offset", "0px");
    document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
    applyModalLayout(0);
  }

  function updateMobileViewportVars() {
    if (!mobileViewportQuery.matches) {
      rootStyle.removeProperty("--mobile-ime-offset");
      document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
      return;
    }

    const inputActive = Boolean(activeModalInput());
    const offset = inputActive ? neededOffset() : 0;
    currentModalOffset = offset;

    rootStyle.setProperty("--mobile-ime-offset", `${offset}px`);
    document.body.classList.toggle("mobileModalInputActive", inputActive);
    document.body.classList.toggle("mobileImeOpen", offset > 0);
    applyModalLayout(offset);

    if (inputActive) scheduleFocusedFieldReveal();
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
      setTimeout(resetMobileImeVars, 80);
      setTimeout(updateMobileViewportVars, 180);
    }
  });

  [taskModal, dateModal].forEach(modalRoot => {
    if (!modalRoot) return;
    new MutationObserver(updateMobileViewportVars).observe(modalRoot, { attributes: true, attributeFilter: ["class"] });
  });

  [taskCancelBtn, taskSaveBtn, dateCancelBtn, dateSaveBtn].forEach(button => {
    button.addEventListener("click", () => requestAnimationFrame(resetMobileImeVars));
  });

  updateMobileViewportVars();
})();

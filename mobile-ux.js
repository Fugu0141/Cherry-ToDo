(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;
  const rootStyle = document.documentElement.style;
  const visibleGap = 8;
  let modalActionLocked = false;
  let unlockTimer = null;

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

  function visualViewportMetrics() {
    const viewport = window.visualViewport;
    const layoutHeight = window.innerHeight || document.documentElement.clientHeight || 520;
    const height = Math.max(260, Math.round(viewport?.height || layoutHeight));
    const top = Math.max(0, Math.round(viewport?.offsetTop || 0));

    return { top, height, bottom: top + height, layoutHeight };
  }

  function readCurrentShift() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--mobile-modal-shift-y");
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function neededShift() {
    const modal = activeMobileModal();
    if (!activeModalInput() || !modal) return 0;

    const currentShift = readCurrentShift();
    const rect = modal.getBoundingClientRect();
    const metrics = visualViewportMetrics();
    const safeTop = metrics.top + visibleGap;
    const safeBottom = metrics.bottom - visibleGap;
    const naturalTop = rect.top - currentShift;
    const naturalBottom = rect.bottom - currentShift;

    if (naturalBottom <= safeBottom && naturalTop >= safeTop) return 0;

    const overlapBottom = Math.max(0, naturalBottom - safeBottom);
    let shift = -overlapBottom;

    if (naturalTop + shift < safeTop) {
      shift = safeTop - naturalTop;
    }

    return Math.round(shift);
  }

  function keyboardProbablyOpen(metrics, inputActive, shift) {
    return inputActive && (shift !== 0 || metrics.height < metrics.layoutHeight - 96);
  }

  function updateMobileViewportVars() {
    if (!mobileViewportQuery.matches) {
      rootStyle.removeProperty("--mobile-modal-shift-y");
      document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
      return;
    }

    if (modalActionLocked) return;

    const inputActive = Boolean(activeModalInput());
    const metrics = visualViewportMetrics();
    const shift = neededShift();

    rootStyle.setProperty("--mobile-modal-shift-y", `${shift}px`);
    document.body.classList.toggle("mobileModalInputActive", inputActive);
    document.body.classList.toggle("mobileImeOpen", keyboardProbablyOpen(metrics, inputActive, shift));

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
    if (!input || !modal || modal.scrollHeight <= modal.clientHeight + 2) return;

    const metrics = visualViewportMetrics();
    const inputRect = input.getBoundingClientRect();
    const safeTop = metrics.top + 48;
    const safeBottom = metrics.bottom - 88;

    if (inputRect.top >= safeTop && inputRect.bottom <= safeBottom) return;

    const desiredTop = Math.max(0, input.offsetTop - 72);
    const maxScroll = Math.max(0, modal.scrollHeight - modal.clientHeight);
    modal.scrollTop = Math.min(desiredTop, maxScroll);
  }

  function lockModalPositionDuringAction() {
    modalActionLocked = true;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => {
      modalActionLocked = false;
      updateMobileViewportVars();
    }, 180);
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
    button.addEventListener("pointerdown", lockModalPositionDuringAction);
    button.addEventListener("click", () => requestAnimationFrame(updateMobileViewportVars));
  });

  updateMobileViewportVars();
})();

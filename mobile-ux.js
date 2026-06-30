(() => {
  const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
  const baseEnsureContentSize = typeof ensureContentSize === "function" ? ensureContentSize : null;
  const rootStyle = document.documentElement.style;
  const visibleGap = 8;
  const keyboardThreshold = 80;
  let closedViewportHeight = 0;
  let modalPollTimer = null;

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

  function layoutHeight() {
    return Math.max(
      visualHeight(),
      Math.round(window.innerHeight || 0),
      Math.round(document.documentElement.clientHeight || 0)
    );
  }

  function rememberClosedViewportHeight() {
    const height = layoutHeight();
    closedViewportHeight = Math.max(closedViewportHeight, height);
    rootStyle.setProperty("--mobile-closed-height", `${closedViewportHeight}px`);
  }

  function keyboardInset() {
    const viewport = window.visualViewport;
    const visible = visualHeight();
    const base = Math.max(closedViewportHeight || 0, layoutHeight(), visible);
    if (!viewport) return Math.max(0, base - visible);
    return Math.max(0, base - (viewport.offsetTop || 0) - visible);
  }

  function isKeyboardOpen() {
    return Boolean(activeModalInput()) && keyboardInset() >= keyboardThreshold;
  }

  function measureUnshiftedModalRect(modal) {
    const previousOffset = rootStyle.getPropertyValue("--mobile-ime-offset");
    rootStyle.setProperty("--mobile-ime-offset", "0px");
    const rect = modal.getBoundingClientRect();

    if (previousOffset) rootStyle.setProperty("--mobile-ime-offset", previousOffset);
    else rootStyle.removeProperty("--mobile-ime-offset");

    return rect;
  }

  function centeredOffset() {
    const modal = activeMobileModal();
    if (!modal) return 0;

    const rect = measureUnshiftedModalRect(modal);
    const modalCenter = rect.top + rect.height / 2;
    const viewportCenter = visualHeight() / 2;
    const offset = modalCenter - viewportCenter;
    const maxDownShift = Math.max(0, visualHeight() - rect.bottom - visibleGap);
    const maxUpShift = Math.max(0, rect.top - visibleGap);

    return Math.round(Math.min(maxUpShift, Math.max(-maxDownShift, offset)));
  }

  function neededOffset(availableHeight) {
    const modal = activeMobileModal();
    if (!isKeyboardOpen() || !modal) return centeredOffset();

    const rect = measureUnshiftedModalRect(modal);
    const maxVisibleBottom = availableHeight - visibleGap;

    const overlap = Math.max(0, rect.bottom - maxVisibleBottom);
    const safeTopLimit = Math.max(0, rect.top - visibleGap);
    return Math.round(Math.min(overlap, safeTopLimit));
  }

  function resetMobileViewportVars() {
    const offset = centeredOffset();
    rootStyle.setProperty("--mobile-ime-offset", `${offset}px`);
    rootStyle.setProperty("--mobile-visible-height", `${closedViewportHeight || layoutHeight()}px`);
    document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
  }

  function updateMobileViewportVars() {
    if (!mobileViewportQuery.matches) {
      rootStyle.removeProperty("--mobile-ime-offset");
      rootStyle.removeProperty("--mobile-visible-height");
      rootStyle.removeProperty("--mobile-closed-height");
      document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
      stopModalPoll();
      return;
    }

    const modal = activeMobileModal();
    if (!modal) {
      rootStyle.setProperty("--mobile-ime-offset", "0px");
      rootStyle.setProperty("--mobile-visible-height", `${closedViewportHeight || layoutHeight()}px`);
      document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
      stopModalPoll();
      return;
    }

    startModalPoll();

    const inputActive = Boolean(activeModalInput());
    const keyboardOpen = isKeyboardOpen();

    if (!keyboardOpen) {
      rememberClosedViewportHeight();
      resetMobileViewportVars();
      return;
    }

    const availableHeight = visualHeight();
    const offset = neededOffset(availableHeight);

    rootStyle.setProperty("--mobile-ime-offset", `${offset}px`);
    rootStyle.setProperty("--mobile-visible-height", `${availableHeight}px`);
    document.body.classList.toggle("mobileModalInputActive", inputActive);
    document.body.classList.toggle("mobileImeOpen", offset > 0);

    scheduleFocusedFieldReveal();
  }

  function startModalPoll() {
    if (modalPollTimer) return;
    modalPollTimer = window.setInterval(updateMobileViewportVars, 180);
  }

  function stopModalPoll() {
    if (!modalPollTimer) return;
    window.clearInterval(modalPollTimer);
    modalPollTimer = null;
  }

  function scheduleFocusedFieldReveal() {
    requestAnimationFrame(keepFocusedFieldVisible);
    setTimeout(keepFocusedFieldVisible, 80);
    setTimeout(keepFocusedFieldVisible, 220);
    setTimeout(keepFocusedFieldVisible, 420);
  }

  function keepFocusedFieldVisible() {
    if (!isKeyboardOpen()) return;
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
      setTimeout(updateMobileViewportVars, 260);
    }
  });

  [taskModal, dateModal].forEach(modalRoot => {
    if (!modalRoot) return;
    new MutationObserver(() => {
      if (!modalRoot.classList.contains("hidden")) {
        rememberClosedViewportHeight();
        resetMobileViewportVars();
        startModalPoll();
        requestAnimationFrame(updateMobileViewportVars);
      } else {
        requestAnimationFrame(updateMobileViewportVars);
      }
    }).observe(modalRoot, { attributes: true, attributeFilter: ["class"] });
  });

  [taskCancelBtn, taskSaveBtn, dateCancelBtn, dateSaveBtn].forEach(button => {
    button.addEventListener("click", () => requestAnimationFrame(updateMobileViewportVars));
  });

  rememberClosedViewportHeight();
  updateMobileViewportVars();
})();

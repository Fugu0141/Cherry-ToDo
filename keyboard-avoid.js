(() => {
  const mobileQuery = window.matchMedia("(max-width: 980px)");
  const rootStyle = document.documentElement.style;
  const minKeyboardOffset = 80;

  function openModal() {
    return document.querySelector(".modalBackdrop:not(.hidden) .modal");
  }

  function activeModalInput() {
    const modal = openModal();
    const active = document.activeElement;
    return modal && active instanceof HTMLElement && modal.contains(active) && active.matches("input, textarea, select")
      ? active
      : null;
  }

  function layoutHeight() {
    return Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      window.visualViewport?.height || 0
    );
  }

  function keyboardOffset() {
    const input = activeModalInput();
    if (!mobileQuery.matches || !input) return 0;

    const viewport = window.visualViewport;
    if (!viewport) return 0;

    const fullHeight = layoutHeight();
    const visibleHeight = viewport.height || fullHeight;
    const byHeight = Math.max(0, fullHeight - visibleHeight);
    const byBottom = Math.max(0, fullHeight - (viewport.offsetTop || 0) - visibleHeight);
    const offset = Math.max(byHeight, byBottom);

    return offset >= minKeyboardOffset ? Math.round(offset) : 0;
  }

  function setKeyboardVars() {
    if (!mobileQuery.matches) {
      rootStyle.removeProperty("--mobile-keyboard-offset");
      rootStyle.removeProperty("--mobile-available-height");
      document.body.classList.remove("mobileKeyboardOpen", "mobileModalInputActive");
      return;
    }

    const input = activeModalInput();
    const fullHeight = layoutHeight();
    const offset = keyboardOffset();
    const availableHeight = Math.max(260, fullHeight - offset);

    rootStyle.setProperty("--mobile-keyboard-offset", `${offset}px`);
    rootStyle.setProperty("--mobile-available-height", `${availableHeight}px`);
    document.body.classList.toggle("mobileModalInputActive", Boolean(input));
    document.body.classList.toggle("mobileKeyboardOpen", offset > 0);

    scheduleReveal();
  }

  function scheduleReveal() {
    requestAnimationFrame(revealFocusedField);
    setTimeout(revealFocusedField, 80);
    setTimeout(revealFocusedField, 220);
    setTimeout(revealFocusedField, 420);
  }

  function revealFocusedField() {
    const modal = openModal();
    const input = activeModalInput();
    if (!modal || !input) return;

    const fieldTop = input.offsetTop;
    const desiredTop = Math.max(0, fieldTop - 72);
    const maxScroll = Math.max(0, modal.scrollHeight - modal.clientHeight);
    modal.scrollTop = Math.min(desiredTop, maxScroll);
  }

  function bind() {
    setKeyboardVars();
  }

  window.visualViewport?.addEventListener("resize", bind, { passive: true });
  window.visualViewport?.addEventListener("scroll", bind, { passive: true });
  window.addEventListener("resize", bind, { passive: true });
  window.addEventListener("orientationchange", () => requestAnimationFrame(bind));
  mobileQuery.addEventListener("change", bind);

  document.addEventListener("focusin", event => {
    if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select")) {
      bind();
    }
  });

  document.addEventListener("focusout", event => {
    if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select")) {
      setTimeout(bind, 80);
    }
  });

  document.addEventListener("pointerdown", event => {
    if (event.target.closest?.(".modalBackdrop")) requestAnimationFrame(bind);
  }, true);

  bind();
})();

(() => {
  const mobileQuery = window.matchMedia("(max-width: 980px)");
  const rootStyle = document.documentElement.style;
  const keyboardThreshold = 80;
  let largestVisibleHeight = 0;
  let keyboardWasOpen = false;

  function activeModal() {
    if (!mobileQuery.matches) return null;
    return document.querySelector(".modalBackdrop:not(.hidden) .modal");
  }

  function visibleHeight() {
    return Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
  }

  function resetModalPosition() {
    const modal = activeModal();
    rootStyle.setProperty("--mobile-ime-offset", "0px");
    rootStyle.setProperty("--mobile-visible-height", `${visibleHeight()}px`);
    document.body.classList.remove("mobileImeOpen", "mobileModalInputActive");
    if (modal) modal.scrollTop = 0;
  }

  function update() {
    if (!mobileQuery.matches) {
      largestVisibleHeight = 0;
      keyboardWasOpen = false;
      return;
    }

    const modal = activeModal();
    const currentHeight = visibleHeight();

    if (!modal) {
      largestVisibleHeight = Math.max(largestVisibleHeight, currentHeight);
      keyboardWasOpen = false;
      return;
    }

    largestVisibleHeight = Math.max(largestVisibleHeight, currentHeight);
    const inset = Math.max(0, largestVisibleHeight - currentHeight);
    const keyboardOpen = inset >= keyboardThreshold;

    if (keyboardWasOpen && !keyboardOpen) {
      resetModalPosition();
      requestAnimationFrame(resetModalPosition);
      setTimeout(resetModalPosition, 120);
      setTimeout(resetModalPosition, 320);
    }

    keyboardWasOpen = keyboardOpen;

    if (!keyboardOpen && !document.activeElement?.matches?.("input, textarea, select")) {
      largestVisibleHeight = currentHeight;
    }
  }

  window.visualViewport?.addEventListener("resize", update, { passive: true });
  window.visualViewport?.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("orientationchange", () => {
    largestVisibleHeight = 0;
    requestAnimationFrame(update);
  });
  document.addEventListener("focusin", update);
  document.addEventListener("focusout", () => {
    setTimeout(update, 80);
    setTimeout(update, 260);
  });

  new MutationObserver(update).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });

  update();
})();

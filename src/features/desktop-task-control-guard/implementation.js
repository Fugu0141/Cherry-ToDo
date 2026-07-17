(() => {
  const desktopQuery = window.matchMedia("(min-width: 981px)");
  const dragThreshold = 8;
  let handleSession = null;

  function isPrimaryPointer(event) {
    return event.isPrimary !== false && (event.pointerType !== "mouse" || event.button === 0);
  }

  function clearSession(pointerId = null) {
    if (!handleSession) return;
    if (pointerId !== null && handleSession.pointerId !== pointerId) return;
    handleSession = null;
  }

  document.addEventListener("pointerdown", event => {
    if (!desktopQuery.matches || !isPrimaryPointer(event)) return;

    const handle = event.target.closest?.(".note .handle");
    if (!handle) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    handleSession = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      activated: false
    };
  }, true);

  document.addEventListener("pointermove", event => {
    const session = handleSession;
    if (!session || session.pointerId !== event.pointerId || session.activated) return;

    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
    if (distance < dragThreshold) return;

    session.activated = true;
    if (typeof onHandlePointerDown !== "function") {
      clearSession(event.pointerId);
      return;
    }

    onHandlePointerDown({
      currentTarget: session.handle,
      pointerId: event.pointerId,
      clientX: session.startX,
      clientY: session.startY,
      stopPropagation() {},
      preventDefault() {}
    });
  }, true);

  document.addEventListener("dblclick", event => {
    if (!desktopQuery.matches) return;
    if (!event.target.closest?.(".note .doneBtn, .note .deleteBtn, .note .handle")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener("pointerup", event => clearSession(event.pointerId), true);
  document.addEventListener("pointercancel", event => clearSession(event.pointerId), true);
  window.addEventListener("blur", () => clearSession());
})();

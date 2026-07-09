(() => {
  if (window.__cherryDragEdgeScrollLoaded) return;
  window.__cherryDragEdgeScrollLoaded = true;

  const board = document.getElementById("board");
  if (!board) return;

  const edge = 82;
  const mobileQuery = window.matchMedia("(max-width: 980px)");
  let lastPointer = null;
  let rafId = null;
  let syntheticMove = false;

  function axisMaxSpeed(axis) {
    if (mobileQuery.matches) {
      return axis === "y" ? 9 : 12;
    }
    return axis === "x" ? 10 : 16;
  }

  function clampSpeed(distanceIntoEdge, axis) {
    const ratio = Math.min(1, Math.max(0, distanceIntoEdge / edge));
    return Math.round(axisMaxSpeed(axis) * ratio * ratio);
  }

  function getScrollDelta(clientX, clientY) {
    const rect = board.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (clientX < rect.left + edge) dx = -clampSpeed(rect.left + edge - clientX, "x");
    else if (clientX > rect.right - edge) dx = clampSpeed(clientX - (rect.right - edge), "x");

    if (clientY < rect.top + edge) dy = -clampSpeed(rect.top + edge - clientY, "y");
    else if (clientY > rect.bottom - edge) dy = clampSpeed(clientY - (rect.bottom - edge), "y");

    return { dx, dy };
  }

  function dispatchSyntheticPointerMove(source) {
    if (!source) return;
    syntheticMove = true;
    const event = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      pointerId: source.pointerId,
      pointerType: source.pointerType || "mouse",
      clientX: source.clientX,
      clientY: source.clientY,
      screenX: source.screenX || source.clientX,
      screenY: source.screenY || source.clientY,
      buttons: source.buttons || 1,
      pressure: source.pressure || 0.5
    });
    window.dispatchEvent(event);
    syntheticMove = false;
  }

  function tick() {
    rafId = null;

    if (!lastPointer || !board.classList.contains("grabbing")) {
      board.classList.remove("edgeScrollActive");
      return;
    }

    const { dx, dy } = getScrollDelta(lastPointer.clientX, lastPointer.clientY);
    if (!dx && !dy) {
      board.classList.remove("edgeScrollActive");
      schedule();
      return;
    }

    const beforeLeft = board.scrollLeft;
    const beforeTop = board.scrollTop;
    board.scrollLeft += dx;
    board.scrollTop += dy;

    const moved = board.scrollLeft !== beforeLeft || board.scrollTop !== beforeTop;
    board.classList.toggle("edgeScrollActive", moved);

    if (moved) dispatchSyntheticPointerMove(lastPointer);
    schedule();
  }

  function schedule() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", event => {
    if (syntheticMove) return;
    if (!board.classList.contains("grabbing")) return;

    lastPointer = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      buttons: event.buttons,
      pressure: event.pressure
    };
    schedule();
  }, true);

  window.addEventListener("pointerup", () => {
    lastPointer = null;
    board.classList.remove("edgeScrollActive");
  }, true);

  window.addEventListener("pointercancel", () => {
    lastPointer = null;
    board.classList.remove("edgeScrollActive");
  }, true);
})();

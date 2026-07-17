(() => {
  const desktopQuery = window.matchMedia("(min-width: 981px)");
  const dragThreshold = 8;
  let handleSession = null;

  function isPrimaryPointer(event) {
    return event.isPrimary !== false && (event.pointerType !== "mouse" || event.button === 0);
  }

  function resetConnectPreview() {
    if (typeof connectDrag !== "undefined") connectDrag = null;
    if (typeof ghost !== "undefined" && ghost) ghost.classList.add("hidden");
    if (typeof previewPath !== "undefined" && previewPath) previewPath.remove();
    if (typeof previewPath !== "undefined") previewPath = null;
    if (typeof hotLaneDate !== "undefined") hotLaneDate = null;
    if (typeof hotLineDate !== "undefined") hotLineDate = null;
    if (typeof boardRect !== "undefined") boardRect = null;
    if (typeof renderLanes === "function") renderLanes();
  }

  document.addEventListener("pointerdown", event => {
    if (!desktopQuery.matches || !isPrimaryPointer(event)) return;
    const handle = event.target.closest
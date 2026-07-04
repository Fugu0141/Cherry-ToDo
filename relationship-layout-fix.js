(() => {
  const MOBILE_QUERY = "(max-width: 980px)";

  function injectMobileActionDragStyle() {
    if (document.getElementById("mobileActionDragHideStyle")) return;

    const style = document.createElement("style");
    style.id = "mobileActionDragHideStyle";
    style.textContent = `
      @media (max-width: 980px) {
        #mobileActionBar.dragHidden {
          opacity: 0;
          pointer-events: none;
          transform: translateY(6px) scale(.96);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setMobileActionDragHidden(hidden) {
    const bar = document.getElementById("mobileActionBar");
    if (!bar) return;
    bar.classList.toggle("dragHidden", hidden);
  }

  function isMovingSelectedBlock() {
    try {
      return Boolean(drag && drag.moved);
    } catch {
      return false;
    }
  }

  function installMobileActionDragHide() {
    injectMobileActionDragStyle();

    window.addEventListener("pointermove", () => {
      if (!window.matchMedia(MOBILE_QUERY).matches) return;
      if (isMovingSelectedBlock()) setMobileActionDragHidden(true);
    }, true);

    const reveal = () => {
      requestAnimationFrame(() => setMobileActionDragHidden(false));
    };

    window.addEventListener("pointerup", reveal, true);
    window.addEventListener("pointercancel", reveal, true);
    window.addEventListener("blur", reveal, true);
  }

  function installLiveDragLinkRefresh() {
    if (typeof renderLinks !== "function") return;

    let queued = false;
    function scheduleLinkRefresh() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        try {
          if (drag && drag.moved) renderLinks();
        } catch (error) {
          console.warn("Cherry-ToDo live link refresh failed.", error);
        }
      });
    }

    window.addEventListener("pointermove", () => {
      if (!isMovingSelectedBlock()) return;
      scheduleLinkRefresh();
    });
  }

  installMobileActionDragHide();
  installLiveDragLinkRefresh();
})();

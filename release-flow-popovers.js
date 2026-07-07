(() => {
  const modals = [document.getElementById("taskModal"), document.getElementById("dateModal")].filter(Boolean);
  modals.forEach(modal => modal.classList.add("flowPopover"));

  let lastCreateContext = null;

  function selectedNoteRect() {
    if (!selectedId || !notesEl) return null;
    const escapedId = window.CSS?.escape ? CSS.escape(selectedId) : selectedId.replace(/"/g, "\\\"");
    const note = notesEl.querySelector(`[data-id="${escapedId}"]`);
    return note?.getBoundingClientRect?.() || null;
  }

  function rootActionRect() {
    return document.getElementById("addRootBtn")?.getBoundingClientRect?.() || null;
  }

  function preferredAnchorRect(modal) {
    if (modal?.id === "taskModal" && lastCreateContext && !lastCreateContext.parentId) {
      return rootActionRect();
    }
    return selectedNoteRect();
  }

  function place(modal) {
    if (!modal || modal.classList.contains("hidden")) return;
    const panel = modal.querySelector(".modal");
    if (!panel) return;

    if (window.matchMedia("(max-width: 760px)").matches) {
      panel.style.left = "";
      panel.style.top = "";
      return;
    }

    const rect = preferredAnchorRect(modal);
    const isRootCreate = modal.id === "taskModal" && lastCreateContext && !lastCreateContext.parentId;
    const panelWidth = Math.min(400, window.innerWidth - 28);
    const panelHeight = Math.min(panel.offsetHeight || 260, window.innerHeight - 28);

    let left;
    let top;

    if (isRootCreate && rect) {
      left = Math.max(14, Math.min(rect.left, window.innerWidth - panelWidth - 14));
      top = rect.bottom + 14;
    } else {
      left = rect ? rect.right + 18 : window.innerWidth - panelWidth - 24;
      top = rect ? rect.top : 92;
    }

    if (left + panelWidth > window.innerWidth - 14) left = Math.max(14, (rect?.left || window.innerWidth / 2) - panelWidth - 18);
    if (top + panelHeight > window.innerHeight - 14) top = Math.max(14, window.innerHeight - panelHeight - 14);
    top = Math.max(14, top);

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function placeAll() {
    modals.forEach(place);
  }

  const observer = new MutationObserver(placeAll);
  modals.forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ["class"] }));

  window.addEventListener("resize", placeAll, { passive: true });
  document.getElementById("board")?.addEventListener("scroll", placeAll, { passive: true });

  const baseOpenCreate = typeof openCreateTaskModal === "function" ? openCreateTaskModal : null;
  if (baseOpenCreate) {
    openCreateTaskModal = function openCreateTaskPopover(context = {}) {
      lastCreateContext = context || {};
      baseOpenCreate(context);
      requestAnimationFrame(() => place(document.getElementById("taskModal")));
    };
  }

  const baseOpenEdit = typeof openEditTaskModal === "function" ? openEditTaskModal : null;
  if (baseOpenEdit) {
    openEditTaskModal = function openEditTaskPopover(taskId) {
      lastCreateContext = null;
      baseOpenEdit(taskId);
      requestAnimationFrame(() => place(document.getElementById("taskModal")));
    };
  }

  const baseOpenDate = typeof openChangeDateModal === "function" ? openChangeDateModal : null;
  if (baseOpenDate) {
    openChangeDateModal = function openChangeDatePopover(...args) {
      lastCreateContext = null;
      baseOpenDate(...args);
      requestAnimationFrame(() => place(document.getElementById("dateModal")));
    };
  }

  placeAll();
})();

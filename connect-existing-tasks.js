(() => {
  if (window.__cherryConnectExistingTasksLoaded) return;
  window.__cherryConnectExistingTasksLoaded = true;

  const board = document.getElementById("board");
  const links = document.getElementById("links");
  const notes = document.getElementById("notes");
  const ghost = document.getElementById("ghost");
  if (!board || !links || !notes || !ghost) return;

  const mobileQuery = window.matchMedia("(max-width: 980px)");

  const labels = {
    ja: {
      kicker: "タスクの流れ",
      title: "流れをどうしますか？",
      create: "新しいタスクを作成",
      createHelp: "新しいタスクを作って、この流れに追加します。",
      connect: "このタスクにつなげる",
      connectHelp: "既存のタスクへ流れをつなげます。"
    },
    en: {
      kicker: "Task flow",
      title: "What should happen to this flow?",
      create: "Create a new task",
      createHelp: "Create a new task and add it to this flow.",
      connect: "Connect to this task",
      connectHelp: "Connect the flow to the existing task."
    }
  };

  let handleDrag = null;
  let previewPath = null;
  let highlightedTargetId = null;
  let choiceCleanup = null;

  function lang() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function copy(key) {
    return labels[lang()]?.[key] || labels.ja[key] || key;
  }

  function task(taskId) {
    return state.tasks[taskId] || null;
  }

  function escapeId(taskId) {
    return window.CSS?.escape ? CSS.escape(taskId) : String(taskId).replace(/"/g, "\\\"");
  }

  function noteForTask(taskId) {
    return notes.querySelector(`.note[data-id="${escapeId(taskId)}"]`);
  }

  function noteSize(noteEl) {
    const rect = noteEl.getBoundingClientRect();
    return { width: rect.width || 180, height: rect.height || 90 };
  }

  function boardPointFor(event) {
    if (typeof boardPoint === "function") return boardPoint(event);
    const rect = board.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + board.scrollLeft,
      y: event.clientY - rect.top + board.scrollTop
    };
  }

  function targetDateFor(event) {
    if (typeof getDateForPointer === "function") return getDateForPointer(event);
    return typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0, 10);
  }

  function isAncestor(possibleAncestorId, taskId) {
    let current = task(taskId);
    const seen = new Set();

    while (current?.parentId && !seen.has(current.id)) {
      if (current.parentId === possibleAncestorId) return true;
      seen.add(current.id);
      current = task(current.parentId);
    }

    return false;
  }

  function canAttachTaskToParent(taskId, parentId) {
    if (!taskId || !parentId || taskId === parentId) return false;
    if (!task(taskId) || !task(parentId)) return false;
    return !isAncestor(taskId, parentId);
  }

  function taskAtPoint(clientX, clientY, sourceId) {
    const noteEls = [...notes.querySelectorAll(".note[data-id]")];

    for (let i = noteEls.length - 1; i >= 0; i--) {
      const noteEl = noteEls[i];
      const targetId = noteEl.dataset.id;
      if (!targetId || targetId === sourceId) continue;

      const rect = noteEl.getBoundingClientRect();
      const inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      if (inside) return targetId;
    }

    return null;
  }

  function clearHighlight() {
    if (!highlightedTargetId) return;
    noteForTask(highlightedTargetId)?.classList.remove("connectDropTarget");
    highlightedTargetId = null;
  }

  function setHighlight(targetId) {
    if (highlightedTargetId === targetId) return;
    clearHighlight();
    highlightedTargetId = targetId;
    if (targetId) noteForTask(targetId)?.classList.add("connectDropTarget");
  }

  function createPreviewPath() {
    if (previewPath?.isConnected) return previewPath;

    previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    previewPath.setAttribute("fill", "none");
    previewPath.setAttribute("stroke", "#7357ff");
    previewPath.setAttribute("stroke-width", "4");
    previewPath.setAttribute("stroke-linecap", "round");
    previewPath.setAttribute("stroke-linejoin", "round");
    previewPath.setAttribute("stroke-dasharray", "8 8");
    previewPath.dataset.connectExistingPreview = "1";
    links.appendChild(previewPath);
    return previewPath;
  }

  function updatePreview(point, targetId = null) {
    if (!handleDrag) return;
    const source = task(handleDrag.sourceId);
    if (!source) return;

    const sourceCenterX = source.x + handleDrag.size.width / 2;
    const sourceCenterY = source.y + handleDrag.size.height / 2;
    let endX = point.x;
    let endY = point.y;

    const target = targetId ? task(targetId) : null;
    if (target) {
      endX = target.x + handleDrag.size.width / 2;
      endY = target.y + handleDrag.size.height / 2;
    }

    createPreviewPath().setAttribute("d", `M ${sourceCenterX} ${sourceCenterY} L ${endX} ${endY}`);
  }

  function cleanupDrag() {
    clearHighlight();
    ghost.classList.add("hidden");
    previewPath?.remove();
    previewPath = null;
    board.classList.remove("grabbing");
    handleDrag?.sourceEl?.classList.remove("dragging");
    handleDrag = null;
  }

  function closeChoice() {
    choiceCleanup?.();
    choiceCleanup = null;
  }

  function openCreateFromContext(context) {
    closeChoice();
    openCreateTaskModal({
      parentId: context.sourceId,
      targetAt: context.targetAt,
      branchMode: context.branchMode || "branch"
    });
  }

  function connectTargetToSource(context) {
    closeChoice();
    const source = task(context.sourceId);
    const target = task(context.targetId);
    if (!source || !target) return false;
    if (!canAttachTaskToParent(target.id, source.id)) return false;

    snapshot();
    target.parentId = source.id;
    target.branchMode = context.branchMode || "branch";
    setSelected(target.id);
    refreshLaneDates();
    branchLayout();
    requestRender();
    return true;
  }

  function openChoice(context) {
    closeChoice();

    const backdrop = document.createElement("div");
    backdrop.className = "connectChoiceBackdrop";

    const menu = document.createElement("section");
    menu.className = "connectChoiceMenu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-modal", "true");
    menu.innerHTML = `
      <p class="connectChoiceKicker"></p>
      <h2 class="connectChoiceTitle"></h2>
      <div class="connectChoiceActions">
        <button type="button" class="connectChoiceAction" data-action="create">
          <strong></strong>
          <span></span>
        </button>
        <button type="button" class="connectChoiceAction primary" data-action="connect">
          <strong></strong>
          <span></span>
        </button>
      </div>
    `;

    menu.querySelector(".connectChoiceKicker").textContent = copy("kicker");
    menu.querySelector(".connectChoiceTitle").textContent = copy("title");
    menu.querySelector("[data-action='create'] strong").textContent = copy("create");
    menu.querySelector("[data-action='create'] span").textContent = copy("createHelp");
    menu.querySelector("[data-action='connect'] strong").textContent = copy("connect");
    menu.querySelector("[data-action='connect'] span").textContent = copy("connectHelp");

    backdrop.appendChild(menu);
    document.body.appendChild(backdrop);

    const width = Math.min(360, window.innerWidth - 28);
    const left = Math.min(Math.max(14, context.clientX + 12), window.innerWidth - width - 14);
    const top = Math.min(Math.max(14, context.clientY + 12), window.innerHeight - 260);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    const onKey = event => {
      if (event.key === "Escape") closeChoice();
    };

    backdrop.addEventListener("pointerdown", event => {
      if (event.target === backdrop) closeChoice();
    });

    menu.addEventListener("click", event => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "create") openCreateFromContext(context);
      if (action === "connect") connectTargetToSource(context);
    });

    window.addEventListener("keydown", onKey);
    choiceCleanup = () => {
      window.removeEventListener("keydown", onKey);
      backdrop.remove();
    };
  }

  document.addEventListener("pointerdown", event => {
    // Mobile creation is handled by the selected-task bottom + button, so this desktop-only hook must not intercept it.
    if (mobileQuery.matches) return;

    const handle = event.target.closest?.(".handle");
    if (!handle) return;

    const noteEl = handle.closest(".note[data-id]");
    if (!noteEl) return;

    const sourceId = noteEl.dataset.id;
    const source = task(sourceId);
    if (!source) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    closeChoice();
    if (typeof startPointerSession === "function") startPointerSession();
    setSelected(sourceId);

    const point = boardPointFor(event);
    const size = noteSize(noteEl);
    handleDrag = {
      sourceId,
      sourceEl: noteEl,
      pointerId: event.pointerId,
      size,
      branchMode: "same",
      targetAt: targetDateFor(event),
      moved: false,
      startX: event.clientX,
      startY: event.clientY
    };

    ghost.classList.remove("hidden");
    setObjectPos(ghost, point.x - size.width / 2, point.y - size.height / 2);
    noteEl.classList.add("dragging");
    board.classList.add("grabbing");
    noteEl.setPointerCapture?.(event.pointerId);
    updatePreview(point);
  }, true);

  window.addEventListener("pointermove", event => {
    if (!handleDrag) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const point = boardPointFor(event);
    const source = task(handleDrag.sourceId);
    if (!source) return;

    if (Math.hypot(event.clientX - handleDrag.startX, event.clientY - handleDrag.startY) > 8) {
      handleDrag.moved = true;
    }

    const targetId = taskAtPoint(event.clientX, event.clientY, handleDrag.sourceId);
    handleDrag.branchMode = typeof inferBranchMode === "function" ? inferBranchMode(source, point) : "branch";
    handleDrag.targetAt = targetDateFor(event);
    handleDrag.targetId = targetId;

    setObjectPos(ghost, Math.max(40, point.x - handleDrag.size.width / 2), Math.max(30, point.y - handleDrag.size.height / 2));
    setHighlight(targetId && canAttachTaskToParent(targetId, handleDrag.sourceId) ? targetId : null);
    updatePreview(point, targetId);
  }, true);

  window.addEventListener("pointerup", event => {
    if (!handleDrag) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const context = {
      sourceId: handleDrag.sourceId,
      targetId: handleDrag.targetId || taskAtPoint(event.clientX, event.clientY, handleDrag.sourceId),
      targetAt: targetDateFor(event),
      branchMode: handleDrag.branchMode,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: handleDrag.moved
    };

    cleanupDrag();

    if (context.moved && context.targetId && canAttachTaskToParent(context.targetId, context.sourceId)) {
      openChoice(context);
      return;
    }

    openCreateFromContext(context);
  }, true);

  window.addEventListener("pointercancel", event => {
    if (handleDrag?.pointerId === event.pointerId) cleanupDrag();
  }, true);
})();

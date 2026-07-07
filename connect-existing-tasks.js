(() => {
  const board = document.getElementById("board");
  const links = document.getElementById("links");
  const ghost = document.getElementById("ghost");
  if (!board || !links || !ghost) return;

  const labels = {
    ja: {
      kicker: "タスクの流れ",
      title: "流れをどうしますか？",
      create: "新しいタスクを作成",
      createHelp: "新しいタスクを作って、この流れに追加します。",
      connect: "このタスクにつなげる",
      connectHelp: "既存のタスクへ流れをつなげます。",
      alreadyConnected: "このタスクはすでにつながっています。",
      unsafe: "この接続は循環するため作成できません。"
    },
    en: {
      kicker: "Task flow",
      title: "What should happen to this flow?",
      create: "Create a new task",
      createHelp: "Create a new task and add it to this flow.",
      connect: "Connect to this task",
      connectHelp: "Connect the flow to the existing task.",
      alreadyConnected: "This task is already connected.",
      unsafe: "This connection would create a loop."
    }
  };

  let drag = null;
  let pendingMobileAdd = null;
  let suppressNextMobileAddClick = false;
  let previewPath = null;
  let highlightedTargetId = null;
  let choiceCleanup = null;

  function lang() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function copy(key) {
    return labels[lang()]?.[key] || labels.ja[key] || key;
  }

  function tasks() {
    return typeof window.getTasks === "function" ? window.getTasks() : [];
  }

  function findTask(taskId) {
    return tasks().find(task => task.id === taskId) || null;
  }

  function taskAtPoint(clientX, clientY, sourceId) {
    const notes = [...document.querySelectorAll(".note[data-id]")];
    return notes.find(note => {
      const taskId = note.dataset.id;
      if (!taskId || taskId === sourceId) return false;
      const rect = note.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    })?.dataset.id || null;
  }

  function isAncestor(possibleAncestorId, taskId) {
    let task = findTask(taskId);
    const seen = new Set();
    while (task?.parentId && !seen.has(task.id)) {
      if (task.parentId === possibleAncestorId) return true;
      seen.add(task.id);
      task = findTask(task.parentId);
    }
    return false;
  }

  function connectionStatus(sourceId, targetId) {
    const target = findTask(targetId);
    if (!target || sourceId === targetId) return { canConnect: false, reason: "unsafe" };
    if (target.parentId === sourceId) return { canConnect: false, reason: "alreadyConnected" };
    if (isAncestor(targetId, sourceId)) return { canConnect: false, reason: "unsafe" };
    return { canConnect: true, reason: null };
  }

  function setObjectPos(el, x, y) {
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
  }

  function getBoardPoint(event) {
    if (typeof window.boardPoint === "function") return window.boardPoint(event);
    const rect = board.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + board.scrollLeft,
      y: event.clientY - rect.top + board.scrollTop
    };
  }

  function noteSize(noteEl) {
    const rect = noteEl.getBoundingClientRect();
    return { width: rect.width || 180, height: rect.height || 90 };
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

  function inferMode(sourceTask, point) {
    if (typeof window.inferBranchMode === "function") return window.inferBranchMode(sourceTask, point);
    const sourceNote = document.querySelector(`.note[data-id="${CSS.escape(sourceTask.id)}"]`);
    const size = sourceNote ? noteSize(sourceNote) : { width: 180, height: 90 };
    return Math.abs(point.y - (sourceTask.y + size.height / 2)) < size.height ? "same" : "branch";
  }

  function updatePreview(point, targetId = null) {
    if (!drag) return;
    const source = findTask(drag.sourceId);
    if (!source) return;

    const sourceCenterX = source.x + drag.size.width / 2;
    const sourceCenterY = source.y + drag.size.height / 2;
    let endX = point.x;
    let endY = point.y;

    const target = targetId ? findTask(targetId) : null;
    if (target) {
      endX = target.x + drag.size.width / 2;
      endY = target.y + drag.size.height / 2;
    }

    const d = `M ${sourceCenterX} ${sourceCenterY} L ${endX} ${endY}`;
    createPreviewPath().setAttribute("d", d);
  }

  function clearHighlight() {
    if (!highlightedTargetId) return;
    document.querySelector(`.note[data-id="${CSS.escape(highlightedTargetId)}"]`)?.classList.remove("connectDropTarget");
    highlightedTargetId = null;
  }

  function setHighlight(targetId) {
    if (highlightedTargetId === targetId) return;
    clearHighlight();
    highlightedTargetId = targetId;
    if (targetId) document.querySelector(`.note[data-id="${CSS.escape(targetId)}"]`)?.classList.add("connectDropTarget");
  }

  function cleanupDrag() {
    clearHighlight();
    ghost.classList.add("hidden");
    previewPath?.remove();
    previewPath = null;
    board.classList.remove("grabbing");
    drag?.sourceEl?.classList.remove("dragging");
    drag = null;
  }

  function closeChoice() {
    choiceCleanup?.();
    choiceCleanup = null;
  }

  function openCreateFromContext(context) {
    closeChoice();
    if (typeof window.openCreateTaskModal === "function") {
      window.openCreateTaskModal({
        parentId: context.sourceId,
        targetAt: context.targetAt,
        branchMode: context.branchMode
      });
    }
  }

  function connectExistingTask(context) {
    closeChoice();
    const source = findTask(context.sourceId);
    const target = findTask(context.targetId);
    if (!source || !target) return;
    const status = connectionStatus(source.id, target.id);
    if (!status.canConnect) return;

    if (typeof window.snapshot === "function") window.snapshot();
    target.parentId = source.id;
    target.branchMode = context.branchMode || "branch";
    if (typeof window.setSelected === "function") window.setSelected(target.id);
    if (typeof window.refreshLaneDates === "function") window.refreshLaneDates();
    if (typeof window.branchLayout === "function") window.branchLayout();
    if (typeof window.requestRender === "function") window.requestRender();
  }

  function openChoice(context) {
    closeChoice();
    const status = connectionStatus(context.sourceId, context.targetId);
    const disabledText = status.reason ? copy(status.reason) : copy("connectHelp");

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
    menu.querySelector("[data-action='connect'] span").textContent = disabledText;
    menu.querySelector("[data-action='connect']").disabled = !status.canConnect;

    backdrop.appendChild(menu);
    document.body.appendChild(backdrop);

    if (!window.matchMedia("(max-width: 760px)").matches) {
      const width = Math.min(360, window.innerWidth - 28);
      const left = Math.min(Math.max(14, context.clientX + 12), window.innerWidth - width - 14);
      const top = Math.min(Math.max(14, context.clientY + 12), window.innerHeight - 260);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }

    const onKey = event => {
      if (event.key === "Escape") closeChoice();
    };

    backdrop.addEventListener("pointerdown", event => {
      if (event.target === backdrop) closeChoice();
    });

    menu.addEventListener("click", event => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "create") openCreateFromContext(context);
      if (action === "connect") connectExistingTask(context);
    });

    window.addEventListener("keydown", onKey);
    choiceCleanup = () => {
      window.removeEventListener("keydown", onKey);
      backdrop.remove();
    };
  }

  function targetDateForPointer(event) {
    if (typeof window.getDateForPointer === "function") return window.getDateForPointer(event);
    return typeof window.todayISO === "function" ? window.todayISO() : new Date().toISOString().slice(0, 10);
  }

  function selectedNoteElement() {
    return document.querySelector(".note.selected[data-id]");
  }

  function sourceDate(sourceId) {
    return findTask(sourceId)?.targetAt || targetDateForPointer({ clientX: 0, clientY: 0 });
  }

  function startDrag(event, noteEl, sourceId, { preventStart = true, fromMobileAdd = false } = {}) {
    const source = findTask(sourceId);
    if (!source) return;

    if (preventStart) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    closeChoice();
    if (typeof window.startPointerSession === "function") window.startPointerSession();
    if (typeof window.setSelected === "function") window.setSelected(sourceId);

    const point = getBoardPoint(event);
    const size = noteSize(noteEl);
    drag = {
      sourceId,
      sourceEl: noteEl,
      pointerId: event.pointerId,
      size,
      point,
      branchMode: fromMobileAdd ? "branch" : "same",
      targetAt: fromMobileAdd ? sourceDate(sourceId) : targetDateForPointer(event),
      clientX: event.clientX,
      clientY: event.clientY,
      fromMobileAdd
    };

    ghost.classList.remove("hidden");
    setObjectPos(ghost, point.x - size.width / 2, point.y - size.height / 2);
    noteEl.classList.add("dragging");
    board.classList.add("grabbing");
    noteEl.setPointerCapture?.(event.pointerId);
    updatePreview(point);
  }

  document.addEventListener("pointerdown", event => {
    const handle = event.target.closest?.(".handle");
    if (handle) {
      const noteEl = handle.closest(".note[data-id]");
      if (!noteEl) return;
      startDrag(event, noteEl, noteEl.dataset.id, { preventStart: true });
      return;
    }

    const mobileAdd = event.target.closest?.(".mobileActionButton.add");
    if (!mobileAdd) return;
    const noteEl = selectedNoteElement();
    if (!noteEl) return;

    pendingMobileAdd = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      noteEl,
      sourceId: noteEl.dataset.id
    };
  }, true);

  window.addEventListener("pointermove", event => {
    if (!drag && pendingMobileAdd && pendingMobileAdd.pointerId === event.pointerId) {
      const dx = event.clientX - pendingMobileAdd.startX;
      const dy = event.clientY - pendingMobileAdd.startY;
      if (Math.hypot(dx, dy) > 12) {
        suppressNextMobileAddClick = true;
        window.setTimeout(() => {
          suppressNextMobileAddClick = false;
        }, 450);
        startDrag(event, pendingMobileAdd.noteEl, pendingMobileAdd.sourceId, { preventStart: true, fromMobileAdd: true });
        pendingMobileAdd = null;
      }
    }

    if (!drag) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const point = getBoardPoint(event);
    const source = findTask(drag.sourceId);
    if (!source) return;

    const targetId = taskAtPoint(event.clientX, event.clientY, drag.sourceId);
    drag.point = point;
    drag.branchMode = drag.fromMobileAdd ? "branch" : inferMode(source, point);
    drag.targetAt = drag.fromMobileAdd && !targetId ? sourceDate(drag.sourceId) : targetDateForPointer(event);
    drag.targetId = targetId;
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;

    setObjectPos(ghost, Math.max(40, point.x - drag.size.width / 2), Math.max(30, point.y - drag.size.height / 2));
    setHighlight(targetId);
    updatePreview(point, targetId);
  }, true);

  window.addEventListener("pointerup", event => {
    if (pendingMobileAdd && pendingMobileAdd.pointerId === event.pointerId && !drag) {
      pendingMobileAdd = null;
      return;
    }

    if (!drag) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const targetId = drag.targetId || taskAtPoint(event.clientX, event.clientY, drag.sourceId);
    const context = {
      sourceId: drag.sourceId,
      targetId,
      targetAt: drag.fromMobileAdd && !targetId ? sourceDate(drag.sourceId) : targetDateForPointer(event),
      branchMode: drag.fromMobileAdd && !targetId ? "branch" : drag.branchMode,
      clientX: event.clientX,
      clientY: event.clientY
    };

    cleanupDrag();

    if (context.targetId) {
      openChoice(context);
      return;
    }

    openCreateFromContext(context);
  }, true);

  window.addEventListener("pointercancel", event => {
    if (pendingMobileAdd?.pointerId === event.pointerId) pendingMobileAdd = null;
    if (drag?.pointerId === event.pointerId) cleanupDrag();
  }, true);

  document.addEventListener("click", event => {
    if (!suppressNextMobileAddClick) return;
    if (!event.target.closest?.(".mobileActionButton.add")) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    suppressNextMobileAddClick = false;
  }, true);
})();

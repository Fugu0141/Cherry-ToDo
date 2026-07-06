(() => {
  const copy = {
    ja: {
      kicker: "DELETE TASK",
      title: "タスクを削除しますか？",
      message: "子タスクがある場合は、親側につなぎ直されます。この操作は戻るボタンで取り消せます。",
      cancel: "キャンセル",
      confirm: "削除する"
    },
    en: {
      kicker: "DELETE TASK",
      title: "Delete this task?",
      message: "If this task has child tasks, they will be reconnected to the parent. You can undo this with the Undo button.",
      cancel: "Cancel",
      confirm: "Delete"
    }
  };

  let layer = null;
  let activeResolve = null;

  function language() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function c(key) {
    return copy[language()][key] || copy.ja[key] || key;
  }

  function taskElement(taskId) {
    if (!taskId || !notesEl) return null;
    const escapedId = window.CSS?.escape ? CSS.escape(taskId) : String(taskId).replace(/"/g, "\\\"");
    return notesEl.querySelector(`[data-id="${escapedId}"]`);
  }

  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "taskDeleteLayer";
    layer.className = "taskDeleteLayer hidden";
    layer.innerHTML = `
      <section class="taskDeleteDialog" role="dialog" aria-modal="true" aria-labelledby="taskDeleteTitle">
        <div class="taskDeleteHeader">
          <div class="taskDeleteIcon">×</div>
          <div>
            <p class="taskDeleteKicker"></p>
            <h2 id="taskDeleteTitle" class="taskDeleteTitle"></h2>
          </div>
        </div>
        <div class="taskDeleteBody">
          <p class="taskDeleteTaskName"></p>
          <p class="taskDeleteMessage"></p>
        </div>
        <div class="taskDeleteActions">
          <button type="button" class="taskDeleteCancel"></button>
          <button type="button" class="taskDeleteConfirm"></button>
        </div>
      </section>
    `;
    document.body.appendChild(layer);

    layer.addEventListener("click", event => {
      if (event.target === layer || event.target.closest(".taskDeleteCancel")) close(false);
      if (event.target.closest(".taskDeleteConfirm")) close(true);
    });

    document.addEventListener("keydown", event => {
      if (!layer || layer.classList.contains("hidden")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
      if (event.key === "Enter" && document.activeElement?.classList?.contains("taskDeleteConfirm")) {
        event.preventDefault();
        close(true);
      }
    });

    return layer;
  }

  function close(value) {
    if (!layer || layer.classList.contains("hidden")) return;
    layer.classList.add("hidden");
    const resolve = activeResolve;
    activeResolve = null;
    resolve?.(value);
  }

  function placeNearTask(taskId) {
    const dialog = layer?.querySelector(".taskDeleteDialog");
    if (!dialog) return;

    if (window.matchMedia("(max-width: 760px)").matches) {
      layer.classList.remove("contextual");
      dialog.style.left = "";
      dialog.style.top = "";
      return;
    }

    const note = taskElement(taskId);
    const rect = note?.getBoundingClientRect?.();
    const width = Math.min(420, window.innerWidth - 28);
    const height = Math.min(dialog.offsetHeight || 260, window.innerHeight - 28);
    let left = rect ? rect.right + 18 : window.innerWidth / 2 - width / 2;
    let top = rect ? rect.top : window.innerHeight / 2 - height / 2;

    if (left + width > window.innerWidth - 14) left = Math.max(14, (rect?.left || window.innerWidth / 2) - width - 18);
    if (top + height > window.innerHeight - 14) top = Math.max(14, window.innerHeight - height - 14);
    top = Math.max(14, top);

    layer.classList.add("contextual");
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
  }

  function confirmTaskDelete(task) {
    ensureLayer();
    layer.querySelector(".taskDeleteKicker").textContent = c("kicker");
    layer.querySelector(".taskDeleteTitle").textContent = c("title");
    layer.querySelector(".taskDeleteTaskName").textContent = task.title || "New task";
    layer.querySelector(".taskDeleteMessage").textContent = c("message");
    layer.querySelector(".taskDeleteCancel").textContent = c("cancel");
    layer.querySelector(".taskDeleteConfirm").textContent = c("confirm");

    return new Promise(resolve => {
      activeResolve = resolve;
      layer.classList.remove("hidden");
      requestAnimationFrame(() => {
        placeNearTask(task.id);
        layer.querySelector(".taskDeleteConfirm")?.focus?.({ preventScroll: true });
      });
    });
  }

  function clampScroll() {
    try {
      const maxLeft = Math.max(0, contentWidth - board.clientWidth);
      const maxTop = Math.max(0, contentHeight - board.clientHeight);
      if (board.scrollLeft > maxLeft) board.scrollLeft = maxLeft;
      if (board.scrollTop > maxTop) board.scrollTop = maxTop;
    } catch (_) {
      // Non-critical.
    }
  }

  function performDelete(taskId) {
    const task = state.tasks?.[taskId];
    if (!task) return;

    snapshot();

    const parentId = task.parentId || null;
    const children = getChildren(taskId).sort(sortByDateThenTitle);

    children.forEach((child, index) => {
      child.parentId = parentId;
      child.branchMode = parentId ? (index === 0 ? (child.branchMode || "same") : "branch") : null;
    });

    delete state.tasks[taskId];
    selectedId = parentId && state.tasks[parentId] ? parentId : null;

    refreshLaneDates();
    branchLayout();
    requestRender();
    requestAnimationFrame(clampScroll);
  }

  deleteTask = async function deleteTaskWithCherryDialog(taskId = selectedId) {
    const task = state.tasks?.[taskId];
    if (!task) return;
    const ok = await confirmTaskDelete(task);
    if (!ok) return;
    performDelete(taskId);
  };

  window.cherryTaskDeleteDialog = {
    confirmTaskDelete,
    performDelete
  };
})();

(() => {
  function currentTaskDate(task) {
    return typeof window.getTaskDate === "function" ? window.getTaskDate(task) : null;
  }

  function validISODate(value) {
    return typeof window.isValidISODate === "function" && window.isValidISODate(value);
  }

  function scheduleDate(schedule) {
    return schedule && (schedule.type === "date" || schedule.type === "datetime")
      ? schedule.date
      : null;
  }

  function normalizeCreationSchedule(schedule, targetAt) {
    const hasExplicitSchedule = schedule !== undefined;
    const initialTargetAt = targetAt === undefined && !hasExplicitSchedule ? null : targetAt;

    if (typeof window.normalizeSchedule === "function") {
      return window.normalizeSchedule(schedule, initialTargetAt);
    }

    if (schedule && typeof schedule === "object") return schedule;
    return validISODate(initialTargetAt)
      ? { type: "date", date: initialTargetAt, time: null }
      : { type: "none", date: null, time: null };
  }

  function recentAskTargetDate(fallbackDate) {
    const hit = window.questStickyRecentDateHit;
    const at = hit?.at || 0;
    const targetDate = hit?.targetDate || hit?.date;
    const fresh = hit && targetDate && hit.mode === "ask" && Date.now() - at < 1500;
    return fresh ? targetDate : fallbackDate;
  }

  function normalizedFreePosition(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
    return {
      x: Math.max(40, position.x),
      y: Math.max(30, position.y)
    };
  }

  function freePlacementFor(parentId, branchMode, requestedPosition) {
    const requested = normalizedFreePosition(requestedPosition);
    if (requested) return requested;

    const parent = parentId ? state.tasks[parentId] : null;
    if (!parent) {
      const scrollLeft = typeof board !== "undefined" && Number.isFinite(board?.scrollLeft) ? board.scrollLeft : 0;
      const scrollTop = typeof board !== "undefined" && Number.isFinite(board?.scrollTop) ? board.scrollTop : 0;
      return { x: scrollLeft + 80, y: scrollTop + 80 };
    }

    const width = typeof noteW !== "undefined" && Number.isFinite(noteW) ? noteW : 180;
    const height = typeof noteH !== "undefined" && Number.isFinite(noteH) ? noteH : 90;
    const siblings = typeof getChildren === "function" ? getChildren(parent.id) : [];
    const vertical = typeof isVerticalMode === "function" && isVerticalMode();

    if (vertical) {
      if (branchMode === "same") {
        const sameCount = siblings.filter(child => child.branchMode === "same").length;
        return {
          x: Math.max(40, parent.x),
          y: Math.max(30, parent.y + (sameCount + 1) * (height + 72))
        };
      }

      const branchCount = siblings.filter(child => child.branchMode !== "same").length;
      return {
        x: Math.max(40, parent.x + (branchCount + 1) * (width + 48)),
        y: Math.max(30, parent.y + height + 72)
      };
    }

    if (branchMode === "same") {
      const sameCount = siblings.filter(child => child.branchMode === "same").length;
      return {
        x: Math.max(40, parent.x + (sameCount + 1) * (width + 72)),
        y: Math.max(30, parent.y)
      };
    }

    const branchCount = siblings.filter(child => child.branchMode !== "same").length;
    return {
      x: Math.max(40, parent.x + width + 72),
      y: Math.max(30, parent.y + (branchCount + 1) * (height + 44))
    };
  }

  openCreateTaskModal = function canonicalCreateTaskModal({
    parentId = null,
    targetAt,
    schedule,
    branchMode = "same",
    position = null
  } = {}) {
    const hasExplicitSchedule = schedule !== undefined;
    let nextSchedule = normalizeCreationSchedule(schedule, targetAt);
    const nextDate = scheduleDate(nextSchedule);
    const freshTarget = parentId && !hasExplicitSchedule ? recentAskTargetDate(nextDate) : nextDate;

    if (freshTarget && freshTarget !== nextDate) {
      nextSchedule = typeof window.makeScheduleDate === "function"
        ? window.makeScheduleDate(freshTarget)
        : { type: "date", date: freshTarget, time: null };
    }

    taskModalMode = "create";
    taskModalContext = {
      parentId,
      schedule: nextSchedule,
      targetAt: scheduleDate(nextSchedule),
      branchMode,
      position: normalizedFreePosition(position)
    };
    taskModalTitle.textContent = parentId
      ? branchMode === "same" ? "同じブランチに追加" : "分岐タスクを作成"
      : "ルートタスクを作成";
    taskNameInput.value = "";
    taskDateInput.value = scheduleDate(nextSchedule) || "";
    taskModal.classList.remove("hidden");
    requestAnimationFrame(() => taskNameInput.focus({ preventScroll: true }));
  };

  openEditTaskModal = function canonicalEditTaskModal(taskId) {
    const task = state.tasks[taskId];
    if (!task) return;

    taskModalMode = "edit";
    taskModalContext = { taskId };
    taskModalTitle.textContent = "タスクを編集";
    taskNameInput.value = task.title;
    taskDateInput.value = currentTaskDate(task) || "";
    taskModal.classList.remove("hidden");
    requestAnimationFrame(() => taskNameInput.select());
  };

  getSameBranchTail = function canonicalSameBranchTail(startId, targetAt) {
    let current = state.tasks[startId];
    if (!current || !validISODate(targetAt)) return startId;

    const seen = new Set();

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const next = getChildren(current.id)
        .filter(child => child.branchMode === "same"
          && typeof window.hasTaskDate === "function"
          && window.hasTaskDate(child)
          && currentTaskDate(child) <= targetAt)
        .sort(sortByDateThenTitle)
        .at(-1);

      if (!next) break;
      current = next;
    }

    return current ? current.id : startId;
  };

  saveTaskModal = function canonicalSaveTaskModal() {
    const title = taskNameInput.value.trim() || "新しいタスク";
    const nextSchedule = window.setTaskDateFromInput({}, taskDateInput.value);
    const targetDate = scheduleDate(nextSchedule);

    snapshot();

    if (taskModalMode === "create") {
      const branchMode = taskModalContext.branchMode || "same";
      const parentId = branchMode === "same" && taskModalContext.parentId && targetDate
        ? getSameBranchTail(taskModalContext.parentId, targetDate)
        : taskModalContext.parentId;

      const task = makeTask({ title, parentId, schedule: nextSchedule, branchMode });
      if (!state.showLanes) {
        const position = freePlacementFor(parentId, branchMode, taskModalContext.position);
        task.x = position.x;
        task.y = position.y;
      }
      state.tasks[task.id] = task;
      selectedId = task.id;
    }

    if (taskModalMode === "edit") {
      const task = state.tasks[taskModalContext.taskId];
      if (task) {
        task.title = title;
        window.setTaskSchedule(task, nextSchedule);
        selectedId = task.id;
      }
    }

    closeTaskModal();
    refreshLaneDates();
    if (state.showLanes) branchLayout();
    requestRender();
  };

  openChangeDateModal = function canonicalChangeDateModal(taskId, defaultDate, original) {
    const task = state.tasks[taskId];
    if (!task) return;

    const date = validISODate(defaultDate) ? defaultDate : currentTaskDate(task);
    dateModalContext = { taskId, original };
    changeDateInput.value = date || "";
    dateModal.classList.remove("hidden");
    requestAnimationFrame(() => changeDateInput.focus({ preventScroll: true }));
  };

  closeDateModal = function canonicalCloseDateModal({ restore = false } = {}) {
    if (restore && dateModalContext) {
      const task = state.tasks[dateModalContext.taskId];
      const original = dateModalContext.original;
      if (task && original) {
        task.x = original.x;
        task.y = original.y;
      }
    }

    dateModal.classList.add("hidden");
    dateModalContext = null;
    hotLaneDate = null;
    hotLineDate = null;
    requestRender();
  };

  saveDateModal = function canonicalSaveDateModal() {
    if (!dateModalContext) return;

    const task = state.tasks[dateModalContext.taskId];
    if (task) window.setTaskDateFromInput(task, changeDateInput.value);

    dateModal.classList.add("hidden");
    dateModalContext = null;
    hotLaneDate = null;
    hotLineDate = null;
    branchLayout();
    requestRender();
  };
})();
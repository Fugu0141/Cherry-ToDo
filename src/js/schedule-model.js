(() => {
  const baseMakeTask = makeTask;
  const baseMakeInitialState = makeInitialState;
  const baseSaveNow = saveNow;

  function isValidISODate(value) {
    if (typeof value !== "string") return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }

  function isValidTime(value) {
    if (typeof value !== "string") return false;
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return false;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  function makeScheduleNone() {
    return { type: "none", date: null, time: null };
  }

  function makeScheduleDate(date) {
    return isValidISODate(date)
      ? { type: "date", date, time: null }
      : makeScheduleNone();
  }

  function makeScheduleDateTime(date, time) {
    return isValidISODate(date) && isValidTime(time)
      ? { type: "datetime", date, time }
      : makeScheduleNone();
  }

  function scheduleFromLegacyTargetAt(targetAt) {
    return isValidISODate(targetAt) ? makeScheduleDate(targetAt) : makeScheduleNone();
  }

  function normalizeSchedule(schedule, legacyTargetAt) {
    if (schedule && typeof schedule === "object") {
      if (schedule.type === "none") return makeScheduleNone();
      if (schedule.type === "date" && isValidISODate(schedule.date)) return makeScheduleDate(schedule.date);
      if (schedule.type === "datetime" && isValidISODate(schedule.date) && isValidTime(schedule.time)) {
        return makeScheduleDateTime(schedule.date, schedule.time);
      }
    }

    return scheduleFromLegacyTargetAt(legacyTargetAt);
  }

  function scheduleDate(schedule) {
    return schedule && (schedule.type === "date" || schedule.type === "datetime")
      ? schedule.date
      : null;
  }

  function getLegacyTargetAt(task) {
    if (!task) return null;
    try {
      return task.targetAt;
    } catch (_) {
      return null;
    }
  }

  function sameSchedule(a, b) {
    return a?.type === b?.type && a?.date === b?.date && a?.time === b?.time;
  }

  function installTargetAtAccessor(task, schedule) {
    let currentTargetAt = scheduleDate(schedule);

    Object.defineProperty(task, "targetAt", {
      enumerable: true,
      configurable: true,
      get() {
        return currentTargetAt;
      },
      set(value) {
        const nextSchedule = scheduleFromLegacyTargetAt(value);
        task.schedule = nextSchedule;
        currentTargetAt = scheduleDate(nextSchedule);
      }
    });
  }

  function setTaskSchedule(task, schedule) {
    if (!task) return makeScheduleNone();

    const normalized = normalizeSchedule(schedule, null);
    task.schedule = normalized;
    installTargetAtAccessor(task, normalized);
    return normalized;
  }

  function normalizeTaskSchedule(task) {
    if (!task) return makeScheduleNone();

    const legacyTargetAt = getLegacyTargetAt(task);
    const normalized = normalizeSchedule(task.schedule, legacyTargetAt);

    if (!sameSchedule(task.schedule, normalized)) task.schedule = normalized;
    installTargetAtAccessor(task, normalized);
    return normalized;
  }

  function normalizeAllTasks() {
    for (const task of getTasks()) {
      normalizeTaskSchedule(task);
      if (task.parentId && !task.branchMode) task.branchMode = "same";
    }
  }

  function getTaskSchedule(task) {
    return normalizeTaskSchedule(task);
  }

  function getTaskDate(task) {
    return scheduleDate(getTaskSchedule(task));
  }

  function hasTaskDate(task) {
    return Boolean(getTaskDate(task));
  }

  function isUnscheduledTask(task) {
    return getTaskSchedule(task).type === "none";
  }

  function setTaskDate(task, date) {
    return setTaskSchedule(task, makeScheduleDate(date));
  }

  function setTaskDateFromInput(task, value) {
    const date = String(value || "").trim();
    return setTaskSchedule(task, date ? makeScheduleDate(date) : makeScheduleNone());
  }

  function taskLayoutDate(task) {
    return getTaskDate(task) || todayISO();
  }

  function taskSortDate(task) {
    return getTaskDate(task) || "9999-12-31";
  }

  function recentAskTargetDate(fallbackDate) {
    const hit = window.questStickyRecentDateHit;
    const at = hit?.at || 0;
    const targetDate = hit?.targetDate || hit?.date;
    const fresh = hit && targetDate && hit.mode === "ask" && Date.now() - at < 1500;
    return fresh ? targetDate : fallbackDate;
  }

  window.isValidISODate = isValidISODate;
  window.isValidTime = isValidTime;
  window.makeScheduleNone = makeScheduleNone;
  window.makeScheduleDate = makeScheduleDate;
  window.makeScheduleDateTime = makeScheduleDateTime;
  window.scheduleFromLegacyTargetAt = scheduleFromLegacyTargetAt;
  window.normalizeSchedule = normalizeSchedule;
  window.getTaskSchedule = getTaskSchedule;
  window.getTaskDate = getTaskDate;
  window.hasTaskDate = hasTaskDate;
  window.isUnscheduledTask = isUnscheduledTask;
  window.setTaskSchedule = setTaskSchedule;
  window.setTaskDate = setTaskDate;
  window.setTaskDateFromInput = setTaskDateFromInput;
  window.taskSortDate = taskSortDate;

  makeInitialState = function makeInitialStateWithSchedule() {
    const next = baseMakeInitialState();
    for (const task of Object.values(next.tasks || {})) normalizeTaskSchedule(task);
    return next;
  };

  makeTask = function makeTaskWithSchedule({
    title,
    parentId = null,
    targetAt,
    schedule,
    status = "todo",
    branchMode = "same"
  } = {}) {
    const legacyTargetAt = targetAt === undefined && schedule === undefined ? todayISO() : targetAt;
    const normalizedSchedule = normalizeSchedule(schedule, legacyTargetAt);
    const task = {
      id: id(),
      title: title || "新しいタスク",
      parentId,
      x: 0,
      y: 0,
      schedule: normalizedSchedule,
      status,
      branchMode: parentId ? branchMode : null
    };

    installTargetAtAccessor(task, normalizedSchedule);
    return task;
  };

  saveNow = function saveNowWithSchedule() {
    normalizeAllTasks();
    baseSaveNow();
  };

  refreshLaneDates = function refreshLaneDatesWithSchedule() {
    const dates = new Set([todayISO()]);
    for (const task of getTasks()) {
      const date = getTaskDate(task);
      if (date) dates.add(date);
    }
    cachedLaneDates = [...dates].sort((a, b) => a.localeCompare(b));
  };

  taskX = function taskXWithSchedule(task) {
    return isVerticalMode() ? vTrackToX(task._track ?? 0) : hDateToX(taskLayoutDate(task));
  };

  taskY = function taskYWithSchedule(task) {
    return isVerticalMode() ? vDateToY(taskLayoutDate(task)) : hTrackToY(task._track ?? 0);
  };

  sortByDateThenTitle = function sortByDateThenTitleWithSchedule(a, b) {
    const dateDiff = taskSortDate(a).localeCompare(taskSortDate(b));
    if (dateDiff !== 0) return dateDiff;
    return String(a.title).localeCompare(String(b.title), "ja");
  };

  getSameBranchTail = function getSameBranchTailWithSchedule(startId, targetAt) {
    let current = state.tasks[startId];
    if (!current || !isValidISODate(targetAt)) return startId;

    const target = targetAt;
    const seen = new Set();

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const next = getChildren(current.id)
        .filter(child => child.branchMode === "same" && hasTaskDate(child) && getTaskDate(child) <= target)
        .sort(sortByDateThenTitle)
        .at(-1);

      if (!next) break;
      current = next;
    }

    return current ? current.id : startId;
  };

  resolveTrackCollisions = function resolveTrackCollisionsWithSchedule() {
    const tasks = getTasks()
      .slice()
      .sort((a, b) => {
        const dateDiff = taskSortDate(a).localeCompare(taskSortDate(b));
        if (dateDiff !== 0) return dateDiff;
        const columnDiff = (a._dayColumn ?? 0) - (b._dayColumn ?? 0);
        if (columnDiff !== 0) return columnDiff;
        return getTaskDepth(a.id) - getTaskDepth(b.id);
      });

    for (let pass = 0; pass < 8; pass++) {
      let changed = false;
      const occupied = new Set();

      for (const task of tasks) {
        if (!Number.isFinite(task._track)) task._track = 0;

        let track = task._track;
        const dateKey = getTaskDate(task) || `none:${task.id}`;
        const dayColumn = task._dayColumn ?? 0;
        while (occupied.has(`${dateKey}:${dayColumn}:${track}`)) track += 1;

        if (track !== task._track) {
          shiftSubtreeTracks(task.id, track - task._track);
          changed = true;
        }

        occupied.add(`${dateKey}:${dayColumn}:${task._track}`);
        maxTrack = Math.max(maxTrack, task._track);
      }

      if (!changed) break;
    }
  };

  openCreateTaskModal = function openCreateTaskModalWithSchedule({ parentId = null, targetAt, schedule, branchMode = "same" } = {}) {
    const initialTargetAt = targetAt === undefined && schedule === undefined ? todayISO() : targetAt;
    let nextSchedule = normalizeSchedule(schedule, initialTargetAt);
    const nextDate = getTaskDate({ schedule: nextSchedule, targetAt: scheduleDate(nextSchedule) });
    const freshTarget = parentId ? recentAskTargetDate(nextDate) : nextDate;
    if (freshTarget && freshTarget !== nextDate) nextSchedule = makeScheduleDate(freshTarget);

    taskModalMode = "create";
    taskModalContext = { parentId, schedule: nextSchedule, targetAt: scheduleDate(nextSchedule), branchMode };
    taskModalTitle.textContent = parentId
      ? branchMode === "same" ? "同じブランチに追加" : "分岐タスクを作成"
      : "ルートタスクを作成";
    taskNameInput.value = "";
    taskDateInput.value = scheduleDate(nextSchedule) || "";
    taskModal.classList.remove("hidden");
    requestAnimationFrame(() => taskNameInput.focus({ preventScroll: true }));
  };

  openEditTaskModal = function openEditTaskModalWithSchedule(taskId) {
    const task = state.tasks[taskId];
    if (!task) return;

    normalizeTaskSchedule(task);
    taskModalMode = "edit";
    taskModalContext = { taskId };
    taskModalTitle.textContent = "タスクを編集";
    taskNameInput.value = task.title;
    taskDateInput.value = getTaskDate(task) || "";
    taskModal.classList.remove("hidden");
    requestAnimationFrame(() => taskNameInput.select());
  };

  saveTaskModal = function saveTaskModalWithSchedule() {
    const title = taskNameInput.value.trim() || "新しいタスク";
    const nextSchedule = setTaskDateFromInput({}, taskDateInput.value);
    const targetDate = scheduleDate(nextSchedule);

    snapshot();

    if (taskModalMode === "create") {
      const branchMode = taskModalContext.branchMode || "same";
      const parentId = branchMode === "same" && taskModalContext.parentId && targetDate
        ? getSameBranchTail(taskModalContext.parentId, targetDate)
        : taskModalContext.parentId;

      const task = makeTask({ title, parentId, schedule: nextSchedule, branchMode });
      state.tasks[task.id] = task;
      selectedId = task.id;
    }

    if (taskModalMode === "edit") {
      const task = state.tasks[taskModalContext.taskId];
      if (task) {
        task.title = title;
        setTaskSchedule(task, nextSchedule);
        selectedId = task.id;
      }
    }

    closeTaskModal();
    refreshLaneDates();
    branchLayout();
    requestRender();
  };

  openChangeDateModal = function openChangeDateModalWithSchedule(taskId, defaultDate, original) {
    const task = state.tasks[taskId];
    if (!task) return;

    normalizeTaskSchedule(task);
    const date = isValidISODate(defaultDate) ? defaultDate : getTaskDate(task);
    dateModalContext = { taskId, original };
    changeDateInput.value = date || "";
    dateModal.classList.remove("hidden");
    requestAnimationFrame(() => changeDateInput.focus({ preventScroll: true }));
  };

  saveDateModal = function saveDateModalWithSchedule() {
    if (!dateModalContext) return;

    const task = state.tasks[dateModalContext.taskId];
    if (task) setTaskDateFromInput(task, changeDateInput.value);

    dateModal.classList.add("hidden");
    dateModalContext = null;
    hotLaneDate = null;
    hotLineDate = null;
    branchLayout();
    requestRender();
  };

  normalizeAllTasks();
  refreshLaneDates();
  branchLayout();
  requestRender();

  window.cherrySchedule = {
    normalizeAllTasks,
    getTaskSchedule,
    getTaskDate,
    hasTaskDate,
    isUnscheduledTask,
    setTaskDate,
    setTaskSchedule,
    makeScheduleNone,
    makeScheduleDate,
    makeScheduleDateTime
  };
})();

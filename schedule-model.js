(() => {
  const baseSaveNow = saveNow;

  function coreScheduleModel() {
    const getScheduleModel = window.CherryScheduleBridge?.getScheduleModel;
    return typeof getScheduleModel === "function" ? getScheduleModel() : null;
  }

  function isValidISODate(value) {
    const core = coreScheduleModel();
    if (typeof core?.isValidISODate === "function") return core.isValidISODate(value);

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
    const core = coreScheduleModel();
    if (typeof core?.isValidTime === "function") return core.isValidTime(value);

    if (typeof value !== "string") return false;
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return false;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  function makeScheduleNone() {
    const core = coreScheduleModel();
    if (typeof core?.makeScheduleNone === "function") return core.makeScheduleNone();
    return { type: "none", date: null, time: null };
  }

  function makeScheduleDate(date) {
    const core = coreScheduleModel();
    if (typeof core?.makeScheduleDate === "function") return core.makeScheduleDate(date);
    return isValidISODate(date)
      ? { type: "date", date, time: null }
      : makeScheduleNone();
  }

  function makeScheduleDateTime(date, time) {
    const core = coreScheduleModel();
    if (typeof core?.makeScheduleDateTime === "function") return core.makeScheduleDateTime(date, time);
    return isValidISODate(date) && isValidTime(time)
      ? { type: "datetime", date, time }
      : makeScheduleNone();
  }

  function scheduleFromLegacyTargetAt(targetAt) {
    const core = coreScheduleModel();
    if (typeof core?.scheduleFromLegacyTargetAt === "function") return core.scheduleFromLegacyTargetAt(targetAt);
    return isValidISODate(targetAt) ? makeScheduleDate(targetAt) : makeScheduleNone();
  }

  function normalizeSchedule(schedule, legacyTargetAt) {
    const core = coreScheduleModel();
    if (typeof core?.normalizeSchedule === "function") return core.normalizeSchedule(schedule, legacyTargetAt);

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
    const core = coreScheduleModel();
    if (typeof core?.scheduleDate === "function") return core.scheduleDate(schedule);
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
    const core = coreScheduleModel();
    if (typeof core?.sameSchedule === "function") return core.sameSchedule(a, b);
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
    if (!task) return makeScheduleNone();
    return normalizeSchedule(task.schedule, getLegacyTargetAt(task));
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

  saveNow = function saveNowWithSchedule() {
    normalizeAllTasks();
    baseSaveNow();
  };

  refreshLaneDates = function refreshLaneDatesWithSchedule() {
    const collectLaneDates = window.CherryScheduleBridge?.collectLaneDates;
    cachedLaneDates = typeof collectLaneDates === "function"
      ? collectLaneDates(getTasks(), todayISO())
      : [todayISO()];
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

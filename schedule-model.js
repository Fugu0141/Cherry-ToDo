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

  normalizeAllTasks();

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

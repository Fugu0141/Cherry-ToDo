(() => {
  const baseMakeInitialState = makeInitialState;

  function fallbackSchedule(schedule, targetAt) {
    if (schedule && typeof schedule === "object") {
      if (schedule.type === "none") return { type: "none", date: null, time: null };
      if (schedule.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(schedule.date || ""))) {
        return { type: "date", date: schedule.date, time: null };
      }
      if (schedule.type === "datetime"
        && /^\d{4}-\d{2}-\d{2}$/.test(String(schedule.date || ""))
        && /^\d{2}:\d{2}$/.test(String(schedule.time || ""))) {
        return { type: "datetime", date: schedule.date, time: schedule.time };
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(String(targetAt || ""))) {
      return { type: "date", date: String(targetAt), time: null };
    }

    return { type: "none", date: null, time: null };
  }

  function normalizeCreationSchedule(schedule, targetAt) {
    const hasExplicitSchedule = schedule !== undefined;
    const legacyTargetAt = targetAt === undefined && !hasExplicitSchedule ? null : targetAt;
    return typeof window.normalizeSchedule === "function"
      ? window.normalizeSchedule(schedule, legacyTargetAt)
      : fallbackSchedule(schedule, legacyTargetAt);
  }

  function applySchedule(task, schedule) {
    if (typeof window.setTaskSchedule === "function") {
      window.setTaskSchedule(task, schedule);
      return task;
    }

    task.schedule = schedule;
    task.targetAt = schedule?.type === "date" || schedule?.type === "datetime"
      ? schedule.date
      : null;
    return task;
  }

  makeTask = function canonicalMakeTask({
    title,
    parentId = null,
    targetAt,
    schedule,
    status = "todo",
    branchMode = "same"
  } = {}) {
    const normalizedSchedule = normalizeCreationSchedule(schedule, targetAt);
    const task = {
      id: id(),
      title: title || "新しいタスク",
      parentId,
      x: 0,
      y: 0,
      status,
      branchMode: parentId ? branchMode : null
    };

    return applySchedule(task, normalizedSchedule);
  };

  makeInitialState = function canonicalMakeInitialState() {
    const next = baseMakeInitialState();
    if (typeof window.normalizeSchedule !== "function" || typeof window.setTaskSchedule !== "function") {
      return next;
    }

    for (const task of Object.values(next.tasks || {})) {
      const normalizedSchedule = window.normalizeSchedule(task.schedule, task.targetAt);
      window.setTaskSchedule(task, normalizedSchedule);
      if (task.parentId && !task.branchMode) task.branchMode = "same";
    }

    return next;
  };

  window.CherryTaskScheduleFactory = Object.freeze({
    normalizeCreationSchedule
  });
})();

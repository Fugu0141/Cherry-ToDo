(() => {
  function taskLayoutDate(task) {
    const getTaskDate = window.getTaskDate;
    return typeof getTaskDate === "function" ? (getTaskDate(task) || todayISO()) : todayISO();
  }

  function taskSortDate(task) {
    const getSortDate = window.taskSortDate;
    return typeof getSortDate === "function" ? getSortDate(task) : "9999-12-31";
  }

  refreshLaneDates = function canonicalRefreshLaneDates() {
    const collectLaneDates = window.CherryScheduleBridge?.collectLaneDates;
    cachedLaneDates = typeof collectLaneDates === "function"
      ? collectLaneDates(getTasks(), todayISO())
      : [todayISO()];
  };

  taskX = function canonicalTaskX(task) {
    return isVerticalMode() ? vTrackToX(task._track ?? 0) : hDateToX(taskLayoutDate(task));
  };

  taskY = function canonicalTaskY(task) {
    return isVerticalMode() ? vDateToY(taskLayoutDate(task)) : hTrackToY(task._track ?? 0);
  };

  sortByDateThenTitle = function canonicalSortByDateThenTitle(a, b) {
    const dateDiff = taskSortDate(a).localeCompare(taskSortDate(b));
    if (dateDiff !== 0) return dateDiff;
    return String(a.title).localeCompare(String(b.title), "ja");
  };

  resolveTrackCollisions = function canonicalResolveTrackCollisions() {
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
        const getTaskDate = window.getTaskDate;
        const dateKey = (typeof getTaskDate === "function" ? getTaskDate(task) : null) || `none:${task.id}`;
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

  refreshLaneDates();
  branchLayout();
  requestRender();

  window.CherryScheduleLayout = Object.freeze({
    refresh() {
      refreshLaneDates();
      branchLayout();
      requestRender();
    }
  });
})();

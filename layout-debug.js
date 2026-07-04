(() => {
  const sameDayStepX = () => noteW + 44;
  const sameDayStepY = () => noteH + 34;

  function roundSlot(value) {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }

  function readSlot(task) {
    const date = normalizeDate(task.targetAt);
    const vertical = isVerticalMode();

    const track = vertical
      ? roundSlot((task.x - vTrackLeft) / vTrackGap)
      : roundSlot((task.y - hTrackTop) / hTrackGap);

    const dayColumn = vertical
      ? roundSlot((task.y - vDateToY(date)) / sameDayStepY())
      : roundSlot((task.x - hDateToX(date)) / sameDayStepX());

    return { date, track, dayColumn };
  }

  function summarizeTask(task) {
    const slot = readSlot(task);
    return {
      id: task.id,
      title: task.title,
      parentId: task.parentId || null,
      branchMode: task.branchMode || "root",
      status: task.status,
      date: slot.date,
      track: slot.track,
      dayColumn: slot.dayColumn,
      depth: getTaskDepth(task.id),
      x: Math.round(task.x || 0),
      y: Math.round(task.y || 0),
      layoutHint: task.layoutHint || null
    };
  }

  function slots() {
    const rows = getTasks()
      .map(summarizeTask)
      .sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        if (a.dayColumn !== b.dayColumn) return a.dayColumn - b.dayColumn;
        if (a.track !== b.track) return a.track - b.track;
        return a.depth - b.depth;
      });
    return rows;
  }

  function collisions() {
    const groups = new Map();
    for (const row of slots()) {
      const key = `${row.date}:${row.dayColumn}:${row.track}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    return [...groups.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([slot, rows]) => ({ slot, tasks: rows.map(row => row.id) }));
  }

  function gaps() {
    const groups = new Map();
    for (const row of slots()) {
      const key = `${row.date}:${row.dayColumn}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row.track);
    }

    const result = [];
    for (const [group, tracks] of groups.entries()) {
      const unique = [...new Set(tracks)].sort((a, b) => a - b);
      const max = unique.at(-1) ?? -1;
      const occupied = new Set(unique);
      for (let track = 0; track < max; track++) {
        if (!occupied.has(track)) result.push({ group, track });
      }
    }
    return result;
  }

  function print() {
    const rows = slots();
    console.table(rows);

    const hitCollisions = collisions();
    if (hitCollisions.length) {
      console.warn("Cherry layout slot collisions", hitCollisions);
    }

    const holeList = gaps();
    if (holeList.length) {
      console.info("Cherry layout slot gaps", holeList);
    }

    return { rows, collisions: hitCollisions, gaps: holeList };
  }

  window.cherryLayoutDebug = {
    slots,
    collisions,
    gaps,
    print
  };
})();

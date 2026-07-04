(() => {
  if (typeof makePath !== "function") return;

  function elbow(start, end, padding, minStep) {
    if (end >= start) return Math.max(start + minStep, end - padding);
    return Math.min(start - minStep, end + padding);
  }

  makeHorizontalBranchPath = function(a, b, color, width, dash) {
    const sameTrack = Math.abs(a.y - b.y) < 6;
    const sameDate = Math.abs(a.x - b.x) < 6;
    let d;

    if (sameTrack || b.branchMode === "same") {
      d = `M ${a.x + noteW} ${a.y + noteH / 2} L ${b.x} ${b.y + noteH / 2}`;
    } else if (sameDate) {
      const x = a.x + noteW / 2;
      d = `M ${x} ${a.y + noteH} L ${x} ${b.y}`;
    } else if (b.x + noteW / 2 >= a.x + noteW / 2) {
      const x1 = a.x + noteW;
      const y1 = a.y + noteH / 2;
      const x2 = b.x;
      const y2 = b.y + noteH / 2;
      const ex = elbow(x1, x2, 42, 34);
      d = `M ${x1} ${y1} L ${ex} ${y1} L ${ex} ${y2} L ${x2} ${y2}`;
    } else {
      const x1 = a.x;
      const y1 = a.y + noteH / 2;
      const x2 = b.x + noteW;
      const y2 = b.y + noteH / 2;
      const ex = elbow(x1, x2, 42, 34);
      d = `M ${x1} ${y1} L ${ex} ${y1} L ${ex} ${y2} L ${x2} ${y2}`;
    }

    return makePath(d, color, width, dash);
  };

  makeVerticalBranchPath = function(a, b, color, width, dash) {
    const sameTrack = Math.abs(a.x - b.x) < 6;
    const sameDate = Math.abs(a.y - b.y) < 6;
    let d;

    if (sameTrack || b.branchMode === "same") {
      const x = a.x + noteW / 2;
      d = `M ${x} ${a.y + noteH} L ${x} ${b.y}`;
    } else if (sameDate) {
      d = `M ${a.x + noteW} ${a.y + noteH / 2} L ${b.x} ${b.y + noteH / 2}`;
    } else if (b.y + noteH / 2 >= a.y + noteH / 2) {
      const x1 = a.x + noteW / 2;
      const y1 = a.y + noteH;
      const x2 = b.x + noteW / 2;
      const y2 = b.y;
      const ey = elbow(y1, y2, 34, 28);
      d = `M ${x1} ${y1} L ${x1} ${ey} L ${x2} ${ey} L ${x2} ${y2}`;
    } else {
      const x1 = a.x + noteW / 2;
      const y1 = a.y;
      const x2 = b.x + noteW / 2;
      const y2 = b.y + noteH;
      const ey = elbow(y1, y2, 34, 28);
      d = `M ${x1} ${y1} L ${x1} ${ey} L ${x2} ${ey} L ${x2} ${y2}`;
    }

    return makePath(d, color, width, dash);
  };
})();

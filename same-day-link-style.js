(() => {
  const baseMakeBranchPath = typeof makeBranchPath === "function" ? makeBranchPath : null;
  if (!baseMakeBranchPath) return;

  function taskDate(task) {
    if (!task) return null;
    if (typeof getTaskDate === "function") return getTaskDate(task);
    return task.targetAt ? normalizeDate(task.targetAt) : null;
  }

  function isSameDayLink(parent, child) {
    const parentDate = taskDate(parent);
    const childDate = taskDate(child);
    return Boolean(parentDate && childDate && parentDate === childDate);
  }

  makeBranchPath = function makeBranchPathWithSameDayClass(parent, child, color, width, dash) {
    const path = baseMakeBranchPath(parent, child, color, width, dash);
    path.classList.add(isSameDayLink(parent, child) ? "sameDayLink" : "crossDayLink");
    return path;
  };
})();

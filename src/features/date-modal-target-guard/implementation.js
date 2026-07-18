(() => {
  const recentHitKey = "questStickyRecentDateHit";
  const baseOpenChangeDateModal = typeof openChangeDateModal === "function" ? openChangeDateModal : null;
  const baseOpenCreateTaskModal = typeof openCreateTaskModal === "function" ? openCreateTaskModal : null;

  function freshTargetDate(fallbackDate) {
    const hit = window[recentHitKey];
    const at = Number(hit?.at || 0);

    if (!hit || hit.mode !== "ask" || !hit.targetDate) return fallbackDate;
    if (Date.now() - at < 5000) return hit.targetDate;

    if (fallbackDate && hit.date && normalizeDate(fallbackDate) === normalizeDate(hit.date)) {
      return hit.targetDate;
    }

    return fallbackDate;
  }

  if (baseOpenChangeDateModal) {
    openChangeDateModal = function(taskId, defaultDate, original) {
      return baseOpenChangeDateModal(taskId, freshTargetDate(defaultDate), original);
    };
  }

  if (baseOpenCreateTaskModal) {
    openCreateTaskModal = function(options = {}) {
      const next = { ...options };
      if (next.parentId) next.targetAt = freshTargetDate(next.targetAt);
      return baseOpenCreateTaskModal(next);
    };
  }
})();

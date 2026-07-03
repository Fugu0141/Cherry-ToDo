(() => {
  const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateTimePrefixPattern = /^(\d{4})-(\d{2})-(\d{2})[T\s]/;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function isValidDateParts(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }

  function partsFromMatch(match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    };
  }

  function formatDateKey(year, month, day) {
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  function formatLocalToday() {
    const now = new Date();
    return formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function isValidDateKey(value) {
    const match = typeof value === "string" ? dateOnlyPattern.exec(value) : null;
    if (!match) return false;
    const { year, month, day } = partsFromMatch(match);
    return isValidDateParts(year, month, day);
  }

  function normalizeDateKey(value, fallback = formatLocalToday()) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      const exact = dateOnlyPattern.exec(trimmed);
      if (exact) {
        const { year, month, day } = partsFromMatch(exact);
        if (isValidDateParts(year, month, day)) return formatDateKey(year, month, day);
      }

      const prefixed = dateTimePrefixPattern.exec(trimmed);
      if (prefixed) {
        const { year, month, day } = partsFromMatch(prefixed);
        if (isValidDateParts(year, month, day)) return formatDateKey(year, month, day);
      }
    }

    return fallback;
  }

  function addDays(dateKey, days = 1) {
    const normalized = normalizeDateKey(dateKey);
    const [year, month, day] = normalized.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  window.cherryDateOnly = {
    today: formatLocalToday,
    normalize: normalizeDateKey,
    addDays,
    isValid: isValidDateKey
  };

  window.todayISO = function todayISO() {
    return formatLocalToday();
  };

  window.normalizeDate = function normalizeDate(value) {
    return normalizeDateKey(value, formatLocalToday());
  };
})();

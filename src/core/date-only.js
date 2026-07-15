const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T\s]/;

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

export function formatDateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function today() {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isValid(value) {
  const match = typeof value === "string" ? DATE_ONLY_PATTERN.exec(value) : null;
  if (!match) return false;
  const { year, month, day } = partsFromMatch(match);
  return isValidDateParts(year, month, day);
}

export function normalize(value, fallback = today()) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const exact = DATE_ONLY_PATTERN.exec(trimmed);
    if (exact) {
      const { year, month, day } = partsFromMatch(exact);
      if (isValidDateParts(year, month, day)) return formatDateKey(year, month, day);
    }

    const prefixed = DATE_TIME_PREFIX_PATTERN.exec(trimmed);
    if (prefixed) {
      const { year, month, day } = partsFromMatch(prefixed);
      if (isValidDateParts(year, month, day)) return formatDateKey(year, month, day);
    }
  }

  return fallback;
}

export function addDays(dateKey, days = 1) {
  const normalized = normalize(dateKey);
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export const dateOnly = Object.freeze({
  today,
  normalize,
  addDays,
  isValid,
  formatDateKey
});

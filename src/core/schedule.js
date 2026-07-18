import { isValid as isValidDateOnly } from "./date-only.js";

export function isValidISODate(value) {
  return isValidDateOnly(value);
}

export function isValidTime(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function makeScheduleNone() {
  return { type: "none", date: null, time: null };
}

export function makeScheduleDate(date) {
  return isValidISODate(date)
    ? { type: "date", date, time: null }
    : makeScheduleNone();
}

export function makeScheduleDateTime(date, time) {
  return isValidISODate(date) && isValidTime(time)
    ? { type: "datetime", date, time }
    : makeScheduleNone();
}

export function scheduleFromLegacyTargetAt(targetAt) {
  return isValidISODate(targetAt) ? makeScheduleDate(targetAt) : makeScheduleNone();
}

export function normalizeSchedule(schedule, legacyTargetAt) {
  if (schedule && typeof schedule === "object") {
    if (schedule.type === "none") return makeScheduleNone();
    if (schedule.type === "date" && isValidISODate(schedule.date)) return makeScheduleDate(schedule.date);
    if (schedule.type === "datetime" && isValidISODate(schedule.date) && isValidTime(schedule.time)) {
      return makeScheduleDateTime(schedule.date, schedule.time);
    }
  }

  return scheduleFromLegacyTargetAt(legacyTargetAt);
}

export function scheduleDate(schedule) {
  return schedule && (schedule.type === "date" || schedule.type === "datetime")
    ? schedule.date
    : null;
}

export function sameSchedule(a, b) {
  return a?.type === b?.type && a?.date === b?.date && a?.time === b?.time;
}

export const scheduleModel = Object.freeze({
  isValidISODate,
  isValidTime,
  makeScheduleNone,
  makeScheduleDate,
  makeScheduleDateTime,
  scheduleFromLegacyTargetAt,
  normalizeSchedule,
  scheduleDate,
  sameSchedule
});

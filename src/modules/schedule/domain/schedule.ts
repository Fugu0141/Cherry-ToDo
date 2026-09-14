import { err, ok, type Result } from '../../../shared/result/index.ts';

declare const localDateBrand: unique symbol;
declare const localTimeBrand: unique symbol;

export type LocalDate = string & { readonly [localDateBrand]: 'LocalDate' };
export type LocalTime = string & { readonly [localTimeBrand]: 'LocalTime' };

export type Schedule =
  | { readonly kind: 'none' }
  | { readonly kind: 'date'; readonly date: LocalDate }
  | {
      readonly kind: 'datetime';
      readonly date: LocalDate;
      readonly time: LocalTime;
      readonly timeZone?: string;
    };

export interface ScheduleValidationError {
  readonly code: 'invalid-local-date' | 'invalid-local-time' | 'invalid-time-zone';
  readonly value: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 0;
}

export function parseLocalDate(value: string): Result<LocalDate, ScheduleValidationError> {
  const match = DATE_PATTERN.exec(value);
  if (match === null) {
    return err({ code: 'invalid-local-date', value });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const valid =
    year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);

  return valid ? ok(value as LocalDate) : err({ code: 'invalid-local-date', value });
}

export function parseLocalTime(value: string): Result<LocalTime, ScheduleValidationError> {
  return TIME_PATTERN.test(value)
    ? ok(value as LocalTime)
    : err({ code: 'invalid-local-time', value });
}

export function noSchedule(): Schedule {
  return { kind: 'none' };
}

export function scheduleOnDate(value: string): Result<Schedule, ScheduleValidationError> {
  const date = parseLocalDate(value);
  return date.ok ? ok({ kind: 'date', date: date.value }) : date;
}

export function scheduleAtDateTime(
  dateValue: string,
  timeValue: string,
  timeZone?: string,
): Result<Schedule, ScheduleValidationError> {
  const date = parseLocalDate(dateValue);
  if (!date.ok) return date;

  const time = parseLocalTime(timeValue);
  if (!time.ok) return time;

  if (timeZone !== undefined && timeZone.trim().length === 0) {
    return err({ code: 'invalid-time-zone', value: timeZone });
  }

  return ok(
    timeZone === undefined
      ? { kind: 'datetime', date: date.value, time: time.value }
      : { kind: 'datetime', date: date.value, time: time.value, timeZone },
  );
}

export function validateSchedule(schedule: Schedule): Result<Schedule, ScheduleValidationError> {
  if (schedule.kind === 'none') return ok(schedule);

  const date = parseLocalDate(schedule.date);
  if (!date.ok) return date;
  if (schedule.kind === 'date') return ok(schedule);

  const time = parseLocalTime(schedule.time);
  if (!time.ok) return time;
  if (schedule.timeZone !== undefined && schedule.timeZone.trim().length === 0) {
    return err({ code: 'invalid-time-zone', value: schedule.timeZone });
  }

  return ok(schedule);
}

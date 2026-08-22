import { scheduleModel } from "./schedule.js";

export function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function makeIcs(sourceWorkspace, { getTabName = tab => tab?.name || "" } = {}) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cherry//Cherry v0.1//EN"];

  sourceWorkspace.tabs.forEach(tab => {
    Object.values(tab.state?.tasks || {}).forEach(task => {
      const schedule = scheduleModel.normalizeSchedule(task?.schedule, task?.targetAt);
      const effectiveDate = scheduleModel.scheduleDate(schedule);
      const date = effectiveDate ? effectiveDate.replace(/-/g, "") : "";

      lines.push("BEGIN:VTODO");
      lines.push(`UID:${task.id}@cherry`);
      lines.push(`SUMMARY:${escapeIcs(task.title)}`);
      lines.push(`CATEGORIES:${escapeIcs(getTabName(tab))}`);
      if (date) lines.push(`DUE;VALUE=DATE:${date}`);
      lines.push(`STATUS:${task.status === "done" ? "COMPLETED" : "NEEDS-ACTION"}`);
      lines.push("END:VTODO");
    });
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export const icsModel = Object.freeze({
  escapeIcs,
  makeIcs
});

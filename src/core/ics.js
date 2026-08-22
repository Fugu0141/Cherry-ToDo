import { scheduleModel } from "./schedule.js";

export function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function unescapeIcs(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
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

function scheduleFromIcsDue(due) {
  if (!due) return scheduleModel.makeScheduleNone();
  const date = `${due.slice(0, 4)}-${due.slice(4, 6)}-${due.slice(6, 8)}`;
  return scheduleModel.makeScheduleDate(date);
}

export function parseIcsTodos(text) {
  const blocks = String(text || "").split(/BEGIN:VTODO/i).slice(1);

  return blocks.map((block, index) => {
    const content = block.split(/END:VTODO/i)[0] || "";
    const summary = content.match(/^SUMMARY:(.*)$/mi)?.[1];
    const due = content.match(/^DUE(?:;VALUE=DATE)?:(\d{8})/mi)?.[1] || null;

    return {
      title: unescapeIcs(summary || `Task ${index + 1}`),
      schedule: scheduleFromIcsDue(due),
      status: /STATUS:COMPLETED/i.test(content) ? "done" : "todo"
    };
  });
}

function defaultMakeId() {
  return `tab-${Math.random().toString(36).slice(2, 9)}`;
}

export function makeTabFromIcs(text, filename, options = {}) {
  const makeId = typeof options.makeId === "function" ? options.makeId : defaultMakeId;
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const tasks = {};

  parseIcsTodos(text).forEach(todo => {
    const id = makeId();
    const schedule = scheduleModel.normalizeSchedule(todo.schedule, null);
    tasks[id] = {
      id,
      title: todo.title,
      parentId: null,
      x: 0,
      y: 0,
      schedule,
      targetAt: scheduleModel.scheduleDate(schedule),
      status: todo.status,
      branchMode: null
    };
  });

  return {
    id: makeId(),
    name: String(filename || "").replace(/\.[^.]+$/, "") || "iCalendar",
    systemNameKey: null,
    state: { tasks, showLanes: true, viewMode: "board" },
    updatedAt: now()
  };
}

export const icsModel = Object.freeze({
  escapeIcs,
  unescapeIcs,
  makeIcs,
  parseIcsTodos,
  makeTabFromIcs
});
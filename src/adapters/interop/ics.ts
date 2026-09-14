import { createEmptyBoardDocumentState } from '../../modules/board/index';
import {
  noSchedule,
  scheduleAtDateTime,
  scheduleOnDate,
  type Schedule,
} from '../../modules/schedule/index';
import type { Task } from '../../modules/task/index';
import type { TabDocument } from '../../modules/workspace/index';
import { parseTabId, parseTaskId, type TaskId } from '../../shared/ids/index';
import type { RevisionMeta } from '../../shared/revision/index';
import { err, ok, type Result } from '../../shared/result/index';
import type { ExternalTabImport } from './import-plan';

export type IcsImportError =
  | { readonly code: 'invalid-calendar'; readonly message: string }
  | { readonly code: 'no-supported-components'; readonly message: string };

interface IcsProperty {
  readonly name: string;
  readonly params: Readonly<Record<string, string>>;
  readonly value: string;
}

interface IcsComponent {
  readonly kind: 'VEVENT' | 'VTODO';
  readonly properties: readonly IcsProperty[];
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function unfoldLines(text: string): readonly string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      const previous = lines[lines.length - 1];
      if (previous !== undefined) lines[lines.length - 1] = previous + line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseProperty(line: string): IcsProperty | null {
  const colon = line.indexOf(':');
  if (colon <= 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(';');
  const name = parts.shift()?.toUpperCase();
  if (name === undefined) return null;
  const params: Record<string, string> = {};
  for (const part of parts) {
    const equals = part.indexOf('=');
    if (equals <= 0) continue;
    params[part.slice(0, equals).toUpperCase()] = part.slice(equals + 1);
  }
  return { name, params, value };
}

function parseComponents(text: string): readonly IcsComponent[] {
  const lines = unfoldLines(text);
  const components: IcsComponent[] = [];
  let kind: IcsComponent['kind'] | null = null;
  let properties: IcsProperty[] = [];
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === 'BEGIN:VEVENT' || upper === 'BEGIN:VTODO') {
      kind = upper.endsWith('VEVENT') ? 'VEVENT' : 'VTODO';
      properties = [];
      continue;
    }
    if (kind !== null && upper === `END:${kind}`) {
      components.push({ kind, properties });
      kind = null;
      properties = [];
      continue;
    }
    if (kind !== null) {
      const property = parseProperty(line);
      if (property !== null) properties.push(property);
    }
  }
  return components;
}

function first(component: IcsComponent, name: string): IcsProperty | null {
  return component.properties.find((property) => property.name === name) ?? null;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function compactDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return match === null ? null : `${match[1]}-${match[2]}-${match[3]}`;
}

function scheduleFromProperty(property: IcsProperty | null): Schedule | null {
  if (property === null) return noSchedule();
  const value = property.value.trim();
  if (property.params.VALUE?.toUpperCase() === 'DATE' || /^\d{8}$/.test(value)) {
    const date = compactDate(value);
    if (date === null) return null;
    const scheduled = scheduleOnDate(date);
    return scheduled.ok ? scheduled.value : null;
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value);
  if (match === null) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const time = `${match[4]}:${match[5]}${match[6] === undefined ? '' : `:${match[6]}`}`;
  const timeZone = match[7] === 'Z' ? 'UTC' : property.params.TZID;
  const scheduled = scheduleAtDateTime(date, time, timeZone);
  return scheduled.ok ? scheduled.value : null;
}

function meta(now: string): RevisionMeta {
  return { createdAt: now, updatedAt: now, revision: 0 };
}

export function importIcsToTab(
  source: string,
  name = 'iCalendar',
  now: string = new Date().toISOString(),
): Result<ExternalTabImport, IcsImportError> {
  if (!/BEGIN:VCALENDAR/i.test(source) || !/END:VCALENDAR/i.test(source)) {
    return err({ code: 'invalid-calendar', message: 'ICS input is not a VCALENDAR document.' });
  }
  const components = parseComponents(source);
  if (components.length === 0) {
    return err({
      code: 'no-supported-components',
      message: 'ICS input contains no supported VEVENT or VTODO components.',
    });
  }

  const warnings: string[] = [];
  const tasks: Record<string, Task> = {};
  for (const [index, component] of components.entries()) {
    const summary = unescapeText(first(component, 'SUMMARY')?.value ?? `Imported item ${index + 1}`);
    const notes = unescapeText(first(component, 'DESCRIPTION')?.value ?? '');
    const uid = first(component, 'UID')?.value ?? `${component.kind}-${index + 1}`;
    const idResult = parseTaskId(`ics-${index + 1}-${stableHash(uid)}`);
    if (!idResult.ok) continue;
    const scheduleProperty =
      component.kind === 'VEVENT'
        ? first(component, 'DTSTART')
        : first(component, 'DUE') ?? first(component, 'DTSTART');
    const schedule = scheduleFromProperty(scheduleProperty);
    if (schedule === null) {
      warnings.push(`Item ${index + 1} has an unsupported or malformed date and was imported unscheduled.`);
    }
    if (first(component, 'RRULE') !== null) {
      warnings.push(`Recurring item ${index + 1} was imported once; recurrence was not expanded.`);
    }
    const taskId: TaskId = idResult.value;
    tasks[taskId] = {
      id: taskId,
      title: summary,
      notes,
      status: first(component, 'STATUS')?.value.toUpperCase() === 'COMPLETED' ? 'done' : 'todo',
      schedule: schedule ?? noSchedule(),
      appearance: { importance: 'none' },
      meta: meta(now),
    };
  }

  if (Object.keys(tasks).length === 0) {
    return err({ code: 'no-supported-components', message: 'ICS input produced no valid tasks.' });
  }
  const tabIdResult = parseTabId(`ics-${stableHash(source)}`);
  if (!tabIdResult.ok) {
    return err({ code: 'invalid-calendar', message: 'Could not allocate an ICS import tab ID.' });
  }
  const cleanName = name.replace(/\.[^.]+$/, '').trim() || 'iCalendar';
  const tab: TabDocument = {
    id: tabIdResult.value,
    name: cleanName,
    tasks,
    flowEdges: {},
    annotations: {},
    board: createEmptyBoardDocumentState(),
    meta: meta(now),
  };
  return ok({
    tab,
    summary: {
      taskCount: Object.keys(tasks).length,
      connectionCount: 0,
      skippedCount: 0,
      warnings,
    },
  });
}

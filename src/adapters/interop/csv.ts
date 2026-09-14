import { createEmptyBoardDocumentState } from '../../modules/board/index';
import { validateFlowGraph, type FlowEdge } from '../../modules/flow/index';
import {
  noSchedule,
  scheduleAtDateTime,
  scheduleOnDate,
  type Schedule,
} from '../../modules/schedule/index';
import type { Task, TaskImportance, TaskStatus } from '../../modules/task/index';
import type { TabDocument } from '../../modules/workspace/index';
import {
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  type FlowEdgeId,
  type TaskId,
} from '../../shared/ids/index';
import type { RevisionMeta } from '../../shared/revision/index';
import { err, ok, type Result } from '../../shared/result/index';
import type { ExternalTabImport } from './import-plan';

export const CHERRY_CSV_COLUMNS = [
  'record_type',
  'id',
  'title',
  'notes',
  'status',
  'schedule_kind',
  'date',
  'time',
  'time_zone',
  'importance',
  'from_task_id',
  'to_task_id',
  'flow_kind',
  'flow_order',
] as const;

export type CsvImportError =
  | { readonly code: 'invalid-csv'; readonly row: number; readonly message: string }
  | { readonly code: 'invalid-header'; readonly row: 1; readonly message: string }
  | { readonly code: 'invalid-relationship'; readonly row: number; readonly message: string };

function encodeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseCsv(source: string): readonly string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function meta(now: string): RevisionMeta {
  return { createdAt: now, updatedAt: now, revision: 0 };
}

function scheduleFromRow(
  kind: string,
  date: string,
  time: string,
  timeZone: string,
): Schedule | null {
  if (kind === 'none' || kind === '') return noSchedule();
  if (kind === 'date') {
    const scheduled = scheduleOnDate(date);
    return scheduled.ok ? scheduled.value : null;
  }
  if (kind === 'datetime') {
    const scheduled = scheduleAtDateTime(date, time, timeZone.length > 0 ? timeZone : undefined);
    return scheduled.ok ? scheduled.value : null;
  }
  return null;
}

function importance(value: string): TaskImportance | null {
  return value === 'none' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'urgent'
    ? value
    : null;
}

function taskStatus(value: string): TaskStatus | null {
  return value === 'todo' || value === 'done' ? value : null;
}

export function exportTabToCsv(tab: TabDocument): string {
  const rows: string[][] = [[...CHERRY_CSV_COLUMNS]];
  for (const task of Object.values(tab.tasks)) {
    const schedule = task.schedule;
    rows.push([
      'task',
      task.id,
      task.title,
      task.notes,
      task.status,
      schedule.kind,
      schedule.kind === 'none' ? '' : schedule.date,
      schedule.kind === 'datetime' ? schedule.time : '',
      schedule.kind === 'datetime' ? (schedule.timeZone ?? '') : '',
      task.appearance.importance,
      '',
      '',
      '',
      '',
    ]);
  }
  for (const edge of Object.values(tab.flowEdges)) {
    rows.push([
      'flow',
      edge.id,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      edge.fromTaskId,
      edge.toTaskId,
      edge.kind,
      edge.kind === 'reference' ? '' : String(edge.order),
    ]);
  }
  return rows.map((row) => row.map(encodeCell).join(',')).join('\r\n');
}

export function importCsvToTab(
  source: string,
  name = 'CSV import',
  now: string = new Date().toISOString(),
): Result<ExternalTabImport, CsvImportError> {
  const rows = parseCsv(source);
  const header = rows[0];
  if (
    header === undefined ||
    CHERRY_CSV_COLUMNS.some((column, index) => header[index] !== column)
  ) {
    return err({
      code: 'invalid-header',
      row: 1,
      message: `CSV header must start with: ${CHERRY_CSV_COLUMNS.join(',')}`,
    });
  }
  const indexOf = (column: (typeof CHERRY_CSV_COLUMNS)[number]): number =>
    CHERRY_CSV_COLUMNS.indexOf(column);
  const tasks: Record<string, Task> = {};
  const edgeRows: Array<{ readonly row: number; readonly cells: readonly string[] }> = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex];
    if (cells === undefined || cells.every((cell) => cell.length === 0)) continue;
    const rowNumber = rowIndex + 1;
    const type = cells[indexOf('record_type')] ?? '';
    if (type === 'flow') {
      edgeRows.push({ row: rowNumber, cells });
      continue;
    }
    if (type !== 'task') {
      return err({
        code: 'invalid-csv',
        row: rowNumber,
        message: 'record_type must be task or flow.',
      });
    }
    const idRaw = cells[indexOf('id')] ?? '';
    const parsedId = parseTaskId(idRaw);
    if (!parsedId.ok || tasks[parsedId.value] !== undefined) {
      return err({
        code: 'invalid-csv',
        row: rowNumber,
        message: `Invalid or duplicate Task ID "${idRaw}".`,
      });
    }
    const status = taskStatus(cells[indexOf('status')] ?? '');
    const taskImportance = importance(cells[indexOf('importance')] ?? '');
    const schedule = scheduleFromRow(
      cells[indexOf('schedule_kind')] ?? '',
      cells[indexOf('date')] ?? '',
      cells[indexOf('time')] ?? '',
      cells[indexOf('time_zone')] ?? '',
    );
    if (status === null || taskImportance === null || schedule === null) {
      return err({
        code: 'invalid-csv',
        row: rowNumber,
        message: 'Task status, importance, or schedule is invalid.',
      });
    }
    const taskId: TaskId = parsedId.value;
    tasks[taskId] = {
      id: taskId,
      title: cells[indexOf('title')] ?? '',
      notes: cells[indexOf('notes')] ?? '',
      status,
      schedule,
      appearance: { importance: taskImportance },
      meta: meta(now),
    };
  }

  const flowEdges: Record<string, FlowEdge> = {};
  for (const edgeRow of edgeRows) {
    const idRaw = edgeRow.cells[indexOf('id')] ?? '';
    const parsedId = parseFlowEdgeId(idRaw);
    const fromRaw = edgeRow.cells[indexOf('from_task_id')] ?? '';
    const toRaw = edgeRow.cells[indexOf('to_task_id')] ?? '';
    const from = parseTaskId(fromRaw);
    const to = parseTaskId(toRaw);
    const kind = edgeRow.cells[indexOf('flow_kind')] ?? '';
    if (
      !parsedId.ok ||
      !from.ok ||
      !to.ok ||
      tasks[from.value] === undefined ||
      tasks[to.value] === undefined ||
      (kind !== 'continuation' && kind !== 'branch' && kind !== 'reference') ||
      flowEdges[parsedId.value] !== undefined
    ) {
      return err({
        code: 'invalid-relationship',
        row: edgeRow.row,
        message: 'Flow relationship references invalid IDs, endpoints, or kind.',
      });
    }
    const edgeId: FlowEdgeId = parsedId.value;
    if (kind === 'reference') {
      flowEdges[edgeId] = {
        id: edgeId,
        kind: 'reference',
        fromTaskId: from.value,
        toTaskId: to.value,
        meta: meta(now),
      };
      continue;
    }
    const orderRaw = edgeRow.cells[indexOf('flow_order')] ?? '';
    const order = Number(orderRaw);
    if (!Number.isSafeInteger(order) || order < 0) {
      return err({
        code: 'invalid-relationship',
        row: edgeRow.row,
        message: 'Invalid Flow order.',
      });
    }
    flowEdges[edgeId] = {
      id: edgeId,
      kind,
      fromTaskId: from.value,
      toTaskId: to.value,
      order,
      meta: meta(now),
    };
  }

  const flowValidation = validateFlowGraph(
    Object.values(tasks).map((task) => task.id),
    flowEdges,
  );
  if (!flowValidation.ok) {
    return err({
      code: 'invalid-relationship',
      row: 1,
      message: `CSV Flow graph is invalid: ${flowValidation.error.map((issue) => issue.code).join(', ')}`,
    });
  }
  const tabId = parseTabId(`csv-${Math.abs(source.length)}-${Object.keys(tasks).length}`);
  if (!tabId.ok) {
    return err({ code: 'invalid-csv', row: 1, message: 'Could not allocate CSV import tab ID.' });
  }
  return ok({
    tab: {
      id: tabId.value,
      name: name.replace(/\.[^.]+$/, '').trim() || 'CSV import',
      tasks,
      flowEdges: flowValidation.value.edges,
      annotations: {},
      board: createEmptyBoardDocumentState(),
      meta: meta(now),
    },
    summary: {
      taskCount: Object.keys(tasks).length,
      connectionCount: Object.keys(flowEdges).length,
      skippedCount: 0,
      warnings: [
        'CSV does not preserve Board positions or annotations; native .cherry is the full-fidelity format.',
      ],
    },
  });
}

import { describe, expect, it } from 'vitest';

import { MemoryWorkspaceRepository } from '../../src/adapters/persistence/memory/index';
import {
  commitPreparedExternalImport,
  exportTabToCsv,
  importCsvToTab,
  importIcsToTab,
  prepareExternalImportAsNewTab,
} from '../../src/adapters/interop/index';
import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import { scheduleOnDate } from '../../src/modules/schedule/index';
import type { TabDocument, WorkspaceDocument } from '../../src/modules/workspace/index';
import { CHERRY_V2_SCHEMA_VERSION } from '../../src/modules/workspace/index';
import {
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type FlowEdgeId,
  type TabId,
  type TaskId,
  type WorkspaceId,
} from '../../src/shared/ids/index';

const NOW = '2026-09-14T00:00:00.000Z';
const meta = { createdAt: NOW, updatedAt: NOW, revision: 0 } as const;

function unwrap<T>(value: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!value.ok) throw new Error('Invalid test value.');
  return value.value;
}

function sourceTab(): TabDocument {
  const tabId: TabId = unwrap(parseTabId('csv-source'));
  const a: TaskId = unwrap(parseTaskId('task-a'));
  const b: TaskId = unwrap(parseTaskId('task-b'));
  const edgeId: FlowEdgeId = unwrap(parseFlowEdgeId('edge-a-b'));
  const date = unwrap(scheduleOnDate('2026-09-20'));
  return {
    id: tabId,
    name: '日本語タブ',
    tasks: {
      [a]: {
        id: a,
        title: '文化祭の準備',
        notes: '机、椅子、装飾を確認',
        status: 'todo',
        schedule: date,
        appearance: { importance: 'high' },
        meta,
      },
      [b]: {
        id: b,
        title: '最終確認',
        notes: '「引用符」と,カンマも保持',
        status: 'done',
        schedule: { kind: 'none' },
        appearance: { importance: 'none' },
        meta,
      },
    },
    flowEdges: {
      [edgeId]: {
        id: edgeId,
        kind: 'continuation',
        fromTaskId: a,
        toTaskId: b,
        order: 0,
        meta,
      },
    },
    annotations: {},
    board: createEmptyBoardDocumentState(),
    meta,
  };
}

function workspace(): WorkspaceDocument {
  const workspaceId: WorkspaceId = unwrap(parseWorkspaceId('interop-workspace'));
  const tabId: TabId = unwrap(parseTabId('existing'));
  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Interop',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Existing',
        tasks: {},
        flowEdges: {},
        annotations: {},
        board: createEmptyBoardDocumentState(),
        meta,
      },
    },
    tabOrder: [tabId],
    meta,
  };
}

describe('Phase 9 external interoperability', () => {
  it('imports common VEVENT/VTODO data and explicitly bounds recurrence to one occurrence', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:event-1',
      'SUMMARY:文化祭準備',
      'DESCRIPTION:展示を確認',
      'DTSTART;VALUE=DATE:20260920',
      'RRULE:FREQ=DAILY;COUNT=5',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:event-2',
      'SUMMARY:打ち合わせ',
      'DTSTART;TZID=Asia/Tokyo:20260921T153000',
      'END:VEVENT',
      'BEGIN:VTODO',
      'UID:todo-1',
      'SUMMARY:提出',
      'DUE;VALUE=DATE:20260922',
      'STATUS:COMPLETED',
      'END:VTODO',
      'END:VCALENDAR',
    ].join('\r\n');

    const imported = importIcsToTab(ics, '予定.ics', NOW);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.value.summary.taskCount).toBe(3);
    expect(imported.value.summary.warnings).toContain(
      'Recurring item 1 was imported once; recurrence was not expanded.',
    );
    const tasks = Object.values(imported.value.tab.tasks);
    expect(tasks.find((task) => task.title === '文化祭準備')?.schedule).toEqual({
      kind: 'date',
      date: '2026-09-20',
    });
    expect(tasks.find((task) => task.title === '打ち合わせ')?.schedule).toEqual({
      kind: 'datetime',
      date: '2026-09-21',
      time: '15:30',
      timeZone: 'Asia/Tokyo',
    });
    expect(tasks.find((task) => task.title === '提出')?.status).toBe('done');
  });

  it('round-trips UTF-8 Japanese CSV and validates malformed dates and relationships', () => {
    const csv = exportTabToCsv(sourceTab());
    expect(csv).toContain('文化祭の準備');
    expect(csv).toContain('「引用符」と,カンマも保持');

    const imported = importCsvToTab(csv, 'tasks.csv', NOW);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.value.summary).toMatchObject({ taskCount: 2, connectionCount: 1 });
    expect(imported.value.tab.tasks['task-a']?.title).toBe('文化祭の準備');
    expect(imported.value.tab.tasks['task-b']?.notes).toBe('「引用符」と,カンマも保持');
    expect(imported.value.tab.flowEdges['edge-a-b']).toMatchObject({
      kind: 'continuation',
      fromTaskId: 'task-a',
      toTaskId: 'task-b',
    });

    const badDate = importCsvToTab(csv.replace('2026-09-20', '2026-99-99'), 'bad.csv', NOW);
    expect(badDate.ok).toBe(false);
    if (!badDate.ok) expect(badDate.error.code).toBe('invalid-csv');

    const badRelationship = importCsvToTab(csv.replace('task-a,task-b,continuation', 'missing,task-b,continuation'), 'bad.csv', NOW);
    expect(badRelationship.ok).toBe(false);
    if (!badRelationship.ok) expect(badRelationship.error.code).toBe('invalid-relationship');
  });

  it('imports external data into a new tab and uses revision-aware commit', async () => {
    const current = workspace();
    const repository = new MemoryWorkspaceRepository([current]);
    const csvImport = importCsvToTab(exportTabToCsv(sourceTab()), 'tasks.csv', NOW);
    expect(csvImport.ok).toBe(true);
    if (!csvImport.ok) return;

    const prepared = prepareExternalImportAsNewTab(current, csvImport.value, NOW);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.value.destination).toBe('new-tab');
    expect(current.tabOrder).toEqual(['existing']);
    expect(prepared.value.workspace.tabOrder.length).toBe(2);

    const committed = await commitPreparedExternalImport(repository, current, prepared.value);
    expect(committed.kind).toBe('saved');
    const saved = await repository.load(current.id);
    expect(saved?.tabOrder.length).toBe(2);

    const stalePrepared = prepareExternalImportAsNewTab(current, csvImport.value, NOW);
    expect(stalePrepared.ok).toBe(true);
    if (!stalePrepared.ok) return;
    const staleCommit = await commitPreparedExternalImport(repository, current, stalePrepared.value);
    expect(staleCommit.kind).toBe('save-failed');
  });
});

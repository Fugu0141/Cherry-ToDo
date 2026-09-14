import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import { noSchedule } from '../../src/modules/schedule/index';
import type { Task } from '../../src/modules/task/index';
import {
  ApplicationStore,
  CHERRY_V2_SCHEMA_VERSION,
  type MutationOutcome,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index';
import {
  parseAnnotationId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type AnnotationId,
  type TabId,
  type TaskId,
} from '../../src/shared/ids/index';
import type { RevisionMeta } from '../../src/shared/revision/index';

const meta: RevisionMeta = {
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
  revision: 0,
};

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture id.');
  return result.value;
}

const tabId: TabId = unwrap(parseTabId('tab'));
const taskId: TaskId = unwrap(parseTaskId('task-a'));
const annotationId: AnnotationId = unwrap(parseAnnotationId('annotation-a'));

function fixture(): WorkspaceDocument {
  const task: Task = {
    id: taskId,
    title: 'Task A',
    notes: '',
    status: 'todo',
    schedule: noSchedule(),
    appearance: { importance: 'none' },
    meta,
  };
  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: unwrap(parseWorkspaceId('workspace')),
    name: 'Workspace',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Plan',
        tasks: { [taskId]: task },
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

function committed(result: ReturnType<ApplicationStore['createTextAnnotation']>): MutationOutcome {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  expect(result.value.kind).toBe('committed');
  return result.value;
}

describe('Phase 8 annotation application commands', () => {
  it('creates, edits, deletes, undoes, and redoes a text annotation as logical history operations', () => {
    const store = new ApplicationStore(fixture(), () => '2026-09-14T01:00:00.000Z');

    committed(
      store.createTextAnnotation(tabId, {
        id: annotationId,
        rect: { x: 80, y: 100, width: 220, height: 100 },
        text: 'Idea',
        styleToken: 'note',
      }),
    );
    expect(store.workspace.tabs[tabId]?.annotations[annotationId]).toMatchObject({
      kind: 'text',
      text: 'Idea',
      styleToken: 'note',
    });

    const updated = store.updateAnnotation(tabId, annotationId, {
      rect: { x: 120, y: 140, width: 280, height: 120 },
      text: 'Revised idea',
      styleToken: 'accent',
    });
    expect(updated.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.annotations[annotationId]).toMatchObject({
      kind: 'text',
      text: 'Revised idea',
      styleToken: 'accent',
      rect: { x: 120, y: 140, width: 280, height: 120 },
    });

    const removed = store.deleteAnnotation(tabId, annotationId);
    expect(removed.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.annotations[annotationId]).toBeUndefined();

    expect(store.undo().ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.annotations[annotationId]).toMatchObject({
      text: 'Revised idea',
      styleToken: 'accent',
    });
    expect(store.redo().ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.annotations[annotationId]).toBeUndefined();
  });

  it('simplifies a dense stroke before committing it', () => {
    const store = new ApplicationStore(fixture());
    const strokeId = unwrap(parseAnnotationId('stroke-a'));
    const points = Array.from({ length: 2000 }, (_, index) => ({
      x: index * 0.5,
      y: 200 + Math.sin(index / 10) * 20,
    }));

    const result = store.createStrokeAnnotation(tabId, {
      id: strokeId,
      points,
      widthToken: 'medium',
      styleToken: 'ink',
    });
    expect(result.ok).toBe(true);
    const annotation = store.workspace.tabs[tabId]?.annotations[strokeId];
    expect(annotation?.kind).toBe('stroke');
    if (annotation?.kind === 'stroke') {
      expect(annotation.points.length).toBeLessThanOrEqual(512);
      expect(annotation.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('enters freehand composition through Board settings without rewriting Task semantics', () => {
    const store = new ApplicationStore(fixture());
    const before = store.workspace.tabs[tabId];
    if (before === undefined) throw new Error('missing fixture tab');
    const originalTask = before.tasks[taskId];
    const originalEdges = before.flowEdges;

    const result = store.setBoardSettings(tabId, {
      ...before.board.settings,
      showDateLanes: false,
      autoLayout: false,
    });
    expect(result.ok).toBe(true);

    const after = store.workspace.tabs[tabId];
    expect(after?.board.settings.showDateLanes).toBe(false);
    expect(after?.board.settings.autoLayout).toBe(false);
    expect(after?.tasks[taskId]).toEqual(originalTask);
    expect(after?.flowEdges).toEqual(originalEdges);
  });
});

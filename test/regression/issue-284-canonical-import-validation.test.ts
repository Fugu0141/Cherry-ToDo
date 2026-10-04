import { describe, expect, it } from 'vitest';

import { CHERRY_CSV_COLUMNS, importCsvToTab } from '../../src/adapters/interop/index';
import { MemoryWorkspaceRepository } from '../../src/adapters/persistence/memory/index';
import { NativeV2WorkspaceCodec } from '../../src/adapters/serialization/index';
import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import type { FlowEdge } from '../../src/modules/flow/index';
import type { Task } from '../../src/modules/task/index';
import {
  CHERRY_V2_SCHEMA_VERSION,
  commitPreparedWorkspaceCandidate,
  prepareWorkspaceCandidate,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index';
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
import type { RevisionMeta } from '../../src/shared/revision/index';

const NOW = '2026-10-04T00:00:00.000Z';
const meta: RevisionMeta = { createdAt: NOW, updatedAt: NOW, revision: 0 };

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture ID.');
  return result.value;
}

function taskId(value: string): TaskId {
  return unwrap(parseTaskId(value));
}

function edgeId(value: string): FlowEdgeId {
  return unwrap(parseFlowEdgeId(value));
}

function task(value: string, status: 'todo' | 'done'): Task {
  return {
    id: taskId(value),
    title: value,
    notes: '',
    status,
    schedule: { kind: 'none' },
    appearance: { importance: 'none' },
    meta,
  };
}

function edge(
  id: string,
  kind: 'continuation' | 'branch' | 'reference',
  from: string,
  to: string,
  order = 0,
): FlowEdge {
  if (kind === 'reference') {
    return {
      id: edgeId(id),
      kind,
      fromTaskId: taskId(from),
      toTaskId: taskId(to),
      meta,
    };
  }
  return {
    id: edgeId(id),
    kind,
    fromTaskId: taskId(from),
    toTaskId: taskId(to),
    order,
    meta,
  };
}

function workspace(
  tasks: readonly Task[],
  edges: readonly FlowEdge[],
  board = createEmptyBoardDocumentState(),
): WorkspaceDocument {
  const workspaceId: WorkspaceId = unwrap(parseWorkspaceId('issue-284-workspace'));
  const tabId: TabId = unwrap(parseTabId('plan'));
  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Issue 284',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Plan',
        tasks: Object.fromEntries(tasks.map((value) => [value.id, value])),
        flowEdges: Object.fromEntries(edges.map((value) => [value.id, value])),
        annotations: {},
        board,
        meta,
      },
    },
    tabOrder: [tabId],
    meta,
  };
}

function csvRow(values: Partial<Record<(typeof CHERRY_CSV_COLUMNS)[number], string>>): string {
  return CHERRY_CSV_COLUMNS.map((column) => values[column] ?? '').join(',');
}

function csvForMerge(): string {
  return [
    CHERRY_CSV_COLUMNS.join(','),
    csvRow({
      record_type: 'task',
      id: 'A',
      title: 'A',
      status: 'todo',
      schedule_kind: 'none',
      importance: 'none',
    }),
    csvRow({
      record_type: 'task',
      id: 'B',
      title: 'B',
      status: 'done',
      schedule_kind: 'none',
      importance: 'none',
    }),
    csvRow({
      record_type: 'task',
      id: 'M',
      title: 'M',
      status: 'done',
      schedule_kind: 'none',
      importance: 'none',
    }),
    csvRow({
      record_type: 'flow',
      id: 'am',
      from_task_id: 'A',
      to_task_id: 'M',
      flow_kind: 'continuation',
      flow_order: '0',
    }),
    csvRow({
      record_type: 'flow',
      id: 'bm',
      from_task_id: 'B',
      to_task_id: 'M',
      flow_kind: 'continuation',
      flow_order: '0',
    }),
  ].join('\r\n');
}

describe('issue #284 canonical import validation', () => {
  it('rejects a native workspace with a completed Task behind a closed merge gate', () => {
    const codec = new NativeV2WorkspaceCodec();
    const invalid = workspace(
      [task('A', 'todo'), task('B', 'done'), task('M', 'done')],
      [edge('am', 'continuation', 'A', 'M'), edge('bm', 'continuation', 'B', 'M')],
    );

    const decoded = codec.decode(codec.encode(invalid));
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.error.code).toBe('invalid-workspace');
      if (decoded.error.code === 'invalid-workspace') {
        expect(
          decoded.error.causes.some((cause) => cause.code === 'execution-normalization-required'),
        ).toBe(true);
      }
    }
  });

  it('rejects an execution-dependency deadlock at native decode', () => {
    const codec = new NativeV2WorkspaceCodec();
    const invalid = workspace(
      [task('A', 'todo'), task('B', 'todo'), task('C', 'todo'), task('M', 'todo')],
      [
        edge('ab', 'branch', 'A', 'B', 0),
        edge('ac', 'branch', 'A', 'C', 1),
        edge('bm', 'continuation', 'B', 'M'),
        edge('cm', 'continuation', 'C', 'M'),
        edge('am', 'branch', 'A', 'M', 2),
      ],
    );

    const decoded = codec.decode(codec.encode(invalid));
    expect(decoded.ok).toBe(false);
    if (!decoded.ok && decoded.error.code === 'invalid-workspace') {
      expect(
        decoded.error.causes.some(
          (cause) =>
            cause.code === 'invalid-flow' &&
            cause.causes.some((flowCause) => flowCause.code === 'execution-dependency-cycle'),
        ),
      ).toBe(true);
    }
  });

  it('rejects invalid BoardSettings primitive and enum values from native JSON', () => {
    const codec = new NativeV2WorkspaceCodec();
    const source = workspace([], []);
    const raw = JSON.parse(new TextDecoder().decode(codec.encode(source))) as {
      tabs: { plan: { board: { settings: Record<string, unknown> } } };
    };
    raw.tabs.plan.board.settings.autoLayout = 'yes';
    raw.tabs.plan.board.settings.timeGuide = 'sometimes';

    const decoded = codec.decode(new TextEncoder().encode(JSON.stringify(raw)));
    expect(decoded.ok).toBe(false);
    if (!decoded.ok && decoded.error.code === 'invalid-workspace') {
      expect(decoded.error.causes.some((cause) => cause.code === 'invalid-board')).toBe(true);
    }
  });

  it('rejects CSV status data that would require merge-gate normalization', () => {
    const imported = importCsvToTab(csvForMerge(), 'invalid.csv', NOW);
    expect(imported.ok).toBe(false);
    if (!imported.ok) {
      expect(imported.error.code).toBe('invalid-execution-state');
    }
  });

  it('does not let reference edges participate in canonical execution validation', () => {
    const codec = new NativeV2WorkspaceCodec();
    const valid = workspace(
      [task('A', 'todo'), task('B', 'todo'), task('M', 'done')],
      [edge('am-ref', 'reference', 'A', 'M'), edge('bm-ref', 'reference', 'B', 'M')],
    );

    expect(codec.decode(codec.encode(valid)).ok).toBe(true);
  });

  it('does not replace a readable workspace when semantic validation rejects a candidate', async () => {
    const codec = new NativeV2WorkspaceCodec();
    const current = workspace([task('A', 'todo')], []);
    const repository = new MemoryWorkspaceRepository([current]);
    const invalid = workspace(
      [task('A', 'todo'), task('B', 'done'), task('M', 'done')],
      [edge('am', 'continuation', 'A', 'M'), edge('bm', 'continuation', 'B', 'M')],
    );

    const prepared = prepareWorkspaceCandidate(codec, codec.encode(invalid));
    expect(prepared.ok).toBe(false);
    if (prepared.ok) {
      await commitPreparedWorkspaceCandidate(repository, prepared.value, current.meta.revision);
    }

    expect(await repository.load(current.id)).toEqual(current);
  });
});

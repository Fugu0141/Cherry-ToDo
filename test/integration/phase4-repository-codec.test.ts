import { describe, expect, it } from 'vitest';

import {
  BrowserWorkspaceRepository,
  type BrowserBinaryStore,
} from '../../src/adapters/persistence/browser/index';
import { MemoryWorkspaceRepository } from '../../src/adapters/persistence/memory/index';
import { NativeV2WorkspaceCodec } from '../../src/adapters/serialization/index';
import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import type { FlowEdge } from '../../src/modules/flow/index';
import { parseLocalDate, scheduleOnDate } from '../../src/modules/schedule/index';
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
import { revisionMeta } from '../domain/fixtures';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid test fixture.');
  return result.value;
}

function fixture(): WorkspaceDocument {
  const workspaceId: WorkspaceId = unwrap(parseWorkspaceId('workspace-phase4'));
  const tabId: TabId = unwrap(parseTabId('plan'));
  const a: TaskId = unwrap(parseTaskId('A'));
  const b: TaskId = unwrap(parseTaskId('B'));
  const edgeId: FlowEdgeId = unwrap(parseFlowEdgeId('A-B'));
  const date = unwrap(parseLocalDate('2026-09-20'));
  const scheduled = unwrap(scheduleOnDate(date));

  const task = (id: TaskId, title: string): Task => ({
    id,
    title,
    notes: '',
    status: 'todo',
    schedule: id === a ? scheduled : { kind: 'none' },
    appearance: { importance: 'none' },
    meta: revisionMeta,
  });

  const edge: FlowEdge = {
    id: edgeId,
    kind: 'continuation',
    fromTaskId: a,
    toTaskId: b,
    order: 0,
    meta: revisionMeta,
  };

  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Phase 4 Workspace',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Plan',
        tasks: { [a]: task(a, 'A'), [b]: task(b, 'B') },
        flowEdges: { [edgeId]: edge },
        annotations: {},
        board: {
          ...createEmptyBoardDocumentState(),
          positions: {
            [a]: { x: 120, y: 240 },
            [b]: { x: 420, y: 240 },
          },
        },
        meta: revisionMeta,
      },
    },
    tabOrder: [tabId],
    meta: revisionMeta,
  };
}

class FakeBinaryStore implements BrowserBinaryStore {
  readonly #values = new Map<string, Uint8Array>();

  async listKeys(): Promise<readonly string[]> {
    return [...this.#values.keys()];
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.#values.get(key)?.slice() ?? null;
  }

  async put(key: string, value: Uint8Array): Promise<void> {
    this.#values.set(key, value.slice());
  }

  async delete(key: string): Promise<void> {
    this.#values.delete(key);
  }

  async clear(): Promise<void> {
    this.#values.clear();
  }
}

describe('Phase 4 native V2 data and repositories', () => {
  it('round-trips native V2 bytes deterministically with semantic state intact', () => {
    const codec = new NativeV2WorkspaceCodec();
    const original = fixture();
    const firstBytes = codec.encode(original);
    const decoded = codec.decode(firstBytes);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    expect(decoded.value).toEqual(original);
    expect(codec.encode(decoded.value)).toEqual(firstBytes);

    const tab = decoded.value.tabs.plan;
    expect(tab?.flowEdges['A-B']).toMatchObject({ fromTaskId: 'A', toTaskId: 'B' });
    expect(tab?.tasks.A?.schedule).toEqual({ kind: 'date', date: '2026-09-20' });
    expect(tab?.board.positions.A).toEqual({ x: 120, y: 240 });
  });

  it('keeps MemoryWorkspaceRepository isolated and revision-aware', async () => {
    const repository = new MemoryWorkspaceRepository();
    const original = fixture();

    expect(await repository.save(original)).toEqual({ kind: 'saved', revision: 0 });
    const loaded = await repository.load(original.id);
    expect(loaded).toEqual(original);
    expect(loaded).not.toBe(original);

    const conflict = await repository.save(
      { ...original, meta: { ...original.meta, revision: 1 } },
      99,
    );
    expect(conflict).toEqual({
      kind: 'revision-conflict',
      expectedRevision: 99,
      actualRevision: 0,
    });
    expect((await repository.load(original.id))?.meta.revision).toBe(0);
  });

  it('uses the same repository contract for persistent browser storage', async () => {
    const codec = new NativeV2WorkspaceCodec();
    const repository = new BrowserWorkspaceRepository(new FakeBinaryStore(), codec);
    const original = fixture();

    expect(await repository.save(original)).toEqual({ kind: 'saved', revision: 0 });
    expect(await repository.list()).toEqual([
      {
        id: original.id,
        name: original.name,
        revision: 0,
        updatedAt: revisionMeta.updatedAt,
      },
    ]);
    expect(await repository.load(original.id)).toEqual(original);
  });

  it('does not overwrite a readable workspace when a native candidate is corrupt', async () => {
    const codec = new NativeV2WorkspaceCodec();
    const repository = new MemoryWorkspaceRepository();
    const current = fixture();
    await repository.save(current);

    const corrupt = new TextEncoder().encode('{ definitely-not-json');
    const prepared = prepareWorkspaceCandidate(codec, corrupt);
    expect(prepared.ok).toBe(false);

    if (prepared.ok) {
      await commitPreparedWorkspaceCandidate(repository, prepared, current.meta.revision);
    }

    expect(await repository.load(current.id)).toEqual(current);
  });
});

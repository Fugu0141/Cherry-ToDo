import { describe, expect, it } from 'vitest';

import { MemoryWorkspaceRepository } from '../../src/adapters/persistence/memory/index';
import {
  prepareEncryptedV1Migration,
  prepareV1Migration,
  recoverLegacyBrowserV1,
  resolvePreparedV1Migration,
} from '../../src/adapters/migration/index';
import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import {
  CHERRY_V2_SCHEMA_VERSION,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index';
import {
  parseTabId,
  parseWorkspaceId,
  type TabId,
  type WorkspaceId,
} from '../../src/shared/ids/index';
import plainFixture from '../fixtures/v1/plain-workspace.cherry?raw';
import encryptedFixture from '../fixtures/v1/encrypted-workspace.cherry?raw';

const NOW = '2026-09-14T00:00:00.000Z';
const meta = { createdAt: NOW, updatedAt: NOW, revision: 0 } as const;

function unwrap<T>(value: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!value.ok) throw new Error('Invalid test ID.');
  return value.value;
}

function currentWorkspace(): WorkspaceDocument {
  const workspaceId: WorkspaceId = unwrap(parseWorkspaceId('current-v2'));
  const tabId: TabId = unwrap(parseTabId('current-tab'));
  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Current V2',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Current',
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

describe('Phase 9 V1 migration', () => {
  it('migrates the frozen plain V1 fixture deterministically and previews goal normalization', () => {
    const first = prepareV1Migration(plainFixture, { now: NOW });
    const second = prepareV1Migration(plainFixture, { now: NOW });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.value.normalized).toEqual(second.value.normalized);
    expect(first.value.requiresConfirmation).toBe(true);
    expect(first.value.completionNormalizations).toEqual([
      {
        taskId: 'root',
        from: 'done',
        to: 'todo',
        reason: 'derived-goal-flow-evaluator',
      },
    ]);
    const tab = first.value.normalized.tabs['tab-main'];
    expect(tab?.tasks.root?.status).toBe('todo');
    expect(tab?.tasks.a?.schedule).toEqual({ kind: 'date', date: '2026-09-20' });
    expect(tab?.board.positions.root).toEqual({ x: 100, y: 80 });
    expect(Object.values(tab?.flowEdges ?? {}).map((edge) => edge.kind).sort()).toEqual([
      'branch',
      'continuation',
    ]);
  });

  it('decrypts the frozen encrypted V1 fixture with the valid passphrase and fails safely otherwise', async () => {
    const valid = await prepareEncryptedV1Migration(encryptedFixture, 'correct horse', { now: NOW });
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.value.normalized.tabs['tab-main']?.tasks.root?.status).toBe('todo');

    const invalid = await prepareEncryptedV1Migration(encryptedFixture, 'wrong passphrase', { now: NOW });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error.code).toBe('invalid-credentials');
  });

  it('keeps the current V2 workspace unchanged on cancel and commits only after confirmation', async () => {
    const current = currentWorkspace();
    const repository = new MemoryWorkspaceRepository([current]);
    const prepared = prepareV1Migration(plainFixture, { now: NOW });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    expect(await resolvePreparedV1Migration(repository, prepared.value, 'cancel')).toEqual({
      kind: 'cancelled',
    });
    expect(await repository.load(current.id)).toEqual(current);
    expect((await repository.list()).length).toBe(1);

    const committed = await resolvePreparedV1Migration(repository, prepared.value, 'confirm');
    expect(committed.kind).toBe('saved');
    expect(await repository.load(current.id)).toEqual(current);
    expect((await repository.list()).length).toBe(2);
  });

  it('recovers legacy browser keys best-effort without throwing on damaged storage', () => {
    const legacyState = JSON.stringify({
      tasks: {
        a: {
          id: 'a',
          title: '旧タスク',
          parentId: null,
          x: 10,
          y: 20,
          targetAt: '2026-09-30',
          status: 'todo',
          branchMode: null,
        },
      },
      showLanes: true,
    });
    const storage = {
      getItem(key: string): string | null {
        return key === 'quest-sticky-todo-v10' ? legacyState : null;
      },
    };
    const recovered = recoverLegacyBrowserV1(storage, { now: NOW });
    expect(recovered.kind).toBe('prepared');
    if (recovered.kind === 'prepared') {
      expect(recovered.sourceKey).toBe('quest-sticky-todo-v10');
      expect(recovered.migration.normalized.tabs['legacy-tab']?.tasks.a?.title).toBe('旧タスク');
    }

    const damaged = recoverLegacyBrowserV1(
      { getItem: (key) => (key === 'cherry-workspace-v1' ? '{broken' : null) },
      { now: NOW },
    );
    expect(damaged.kind).toBe('failed');

    const inaccessible = recoverLegacyBrowserV1({
      getItem() {
        throw new Error('blocked');
      },
    });
    expect(inaccessible).toEqual({ kind: 'none' });
  });
});

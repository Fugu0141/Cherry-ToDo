import { describe, expect, it } from 'vitest';

import { NativeV2WorkspaceCodec } from '../../src/adapters/serialization/index';
import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import {
  CHERRY_V2_SCHEMA_VERSION,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index';
import {
  parseAnnotationId,
  parseTabId,
  parseWorkspaceId,
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

function fixture(): WorkspaceDocument {
  const workspaceId = unwrap(parseWorkspaceId('workspace-phase8'));
  const tabId = unwrap(parseTabId('plan'));
  const textId = unwrap(parseAnnotationId('text-note'));
  const strokeId = unwrap(parseAnnotationId('stroke-note'));

  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Phase 8 Workspace',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Freehand',
        tasks: {},
        flowEdges: {},
        annotations: {
          [textId]: {
            id: textId,
            kind: 'text',
            rect: { x: 100, y: 120, width: 240, height: 110 },
            text: 'Persist me',
            styleToken: 'accent',
            meta,
          },
          [strokeId]: {
            id: strokeId,
            kind: 'stroke',
            points: [
              { x: 60, y: 80 },
              { x: 90, y: 120 },
              { x: 160, y: 100 },
            ],
            widthToken: 'thick',
            styleToken: 'ink',
            meta,
          },
        },
        board: {
          ...createEmptyBoardDocumentState(),
          settings: {
            ...createEmptyBoardDocumentState().settings,
            showDateLanes: false,
            autoLayout: false,
          },
        },
        meta,
      },
    },
    tabOrder: [tabId],
    meta,
  };
}

describe('Phase 8 annotation persistence', () => {
  it('round-trips text and stroke annotations through the native V2 codec', () => {
    const codec = new NativeV2WorkspaceCodec();
    const original = fixture();
    const bytes = codec.encode(original);
    const decoded = codec.decode(bytes);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value).toEqual(original);
    const tab = decoded.value.tabs.plan;
    expect(tab?.annotations['text-note']).toMatchObject({
      kind: 'text',
      text: 'Persist me',
      styleToken: 'accent',
    });
    expect(tab?.annotations['stroke-note']).toMatchObject({
      kind: 'stroke',
      widthToken: 'thick',
      styleToken: 'ink',
    });
  });
});

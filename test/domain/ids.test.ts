import { describe, expect, it } from 'vitest';

import {
  parseAnnotationId,
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
} from '../../src/shared/ids/index.ts';

describe('stable entity ids', () => {
  it('preserves valid serialized values without rewriting them', () => {
    const workspace = parseWorkspaceId('workspace-01');
    const tab = parseTabId('tab-01');
    const task = parseTaskId('task-01');
    const edge = parseFlowEdgeId('edge-01');
    const annotation = parseAnnotationId('annotation-01');

    expect(workspace.ok && workspace.value).toBe('workspace-01');
    expect(tab.ok && tab.value).toBe('tab-01');
    expect(task.ok && task.value).toBe('task-01');
    expect(edge.ok && edge.value).toBe('edge-01');
    expect(annotation.ok && annotation.value).toBe('annotation-01');
  });

  it('rejects empty and control-character ids', () => {
    expect(parseTaskId('   ').ok).toBe(false);
    expect(parseTaskId('task\n01').ok).toBe(false);
  });
});

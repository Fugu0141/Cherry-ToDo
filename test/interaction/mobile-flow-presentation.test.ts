import { describe, expect, it } from 'vitest';

import { buildListFlowContext } from '../../src/ui/default/interaction/mobile-flow-presentation';
import type { WorkspaceScreenModel } from '../../src/ui-contract/index';

function workspace(): WorkspaceScreenModel {
  return {
    workspaceId: 'workspace-1',
    workspaceName: 'Mobile Flow',
    tabId: 'tab-1',
    tabName: 'Main',
    tabs: [{ id: 'tab-1', name: 'Main' }],
    activeView: 'list',
    board: {
      settings: { showDateLanes: false, autoLayout: true, timeGuide: 'auto' },
      lanes: [],
      width: 800,
      height: 600,
    },
    tasks: ['A', 'B', 'C', 'D'].map((title) => ({
      id: `task-${title.toLowerCase()}`,
      title,
      notes: '',
      status: 'todo',
      importance: 'none',
      schedule: { kind: 'none' },
      scheduleLabel: null,
      isDerivedGoal: title === 'A',
      isMergeTarget: title === 'D',
      canManuallyComplete: title !== 'A',
      blocked: false,
      blockedReasonKey: null,
      position: null,
    })),
    annotations: [],
    connections: [
      { id: 'e1', kind: 'continuation', fromTaskId: 'task-a', toTaskId: 'task-b', path: null },
      { id: 'e2', kind: 'branch', fromTaskId: 'task-a', toTaskId: 'task-c', path: null },
      { id: 'e3', kind: 'continuation', fromTaskId: 'task-b', toTaskId: 'task-d', path: null },
      { id: 'e4', kind: 'continuation', fromTaskId: 'task-c', toTaskId: 'task-d', path: null },
      { id: 'r1', kind: 'reference', fromTaskId: 'task-b', toTaskId: 'task-c', path: null },
    ],
    linearFlowOrder: null,
    canUndo: true,
    canRedo: false,
  };
}

describe('mobile List Flow context', () => {
  it('keeps branch destinations visible for a derived goal', () => {
    expect(buildListFlowContext(workspace(), 'task-a')).toEqual({
      incomingStructuralTitles: [],
      outgoingStructuralTitles: ['B', 'C'],
      referenceTitles: [],
    });
  });

  it('keeps merge predecessors visible for a merge target', () => {
    expect(buildListFlowContext(workspace(), 'task-d')).toEqual({
      incomingStructuralTitles: ['B', 'C'],
      outgoingStructuralTitles: [],
      referenceTitles: [],
    });
  });

  it('keeps reference relationships visually separate from structural Flow', () => {
    expect(buildListFlowContext(workspace(), 'task-b')).toEqual({
      incomingStructuralTitles: ['A'],
      outgoingStructuralTitles: ['D'],
      referenceTitles: ['C'],
    });
  });
});

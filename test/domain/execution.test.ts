import { describe, expect, it } from 'vitest';

import {
  buildTaskExecutionReadModels,
  deriveManualCompletionControl,
  deriveTaskCompletionAvailability,
  evaluateDerivedGoalStatuses,
  validateFlowGraph,
  type FlowEdge,
  type FlowGraph,
} from '../../src/modules/flow/index';
import { createTask, type Task } from '../../src/modules/task/index';
import {
  parseFlowEdgeId,
  parseTaskId,
  type FlowEdgeId,
  type TaskId,
} from '../../src/shared/ids/index';
import { revisionMeta } from './fixtures';

function taskId(value: string): TaskId {
  const parsed = parseTaskId(value);
  if (!parsed.ok) throw new Error(`Invalid Task id: ${value}`);
  return parsed.value;
}

function edgeId(value: string): FlowEdgeId {
  const parsed = parseFlowEdgeId(value);
  if (!parsed.ok) throw new Error(`Invalid edge id: ${value}`);
  return parsed.value;
}

function task(value: string, status: 'todo' | 'done' = 'todo'): Task {
  const created = createTask({ id: taskId(value), title: value, status, meta: revisionMeta });
  if (!created.ok) throw new Error(`Invalid Task fixture: ${value}`);
  return created.value;
}

function structural(
  id: string,
  kind: 'continuation' | 'branch',
  from: string,
  to: string,
  order = 0,
): FlowEdge {
  return {
    id: edgeId(id),
    kind,
    fromTaskId: taskId(from),
    toTaskId: taskId(to),
    order,
    meta: revisionMeta,
  };
}

function reference(id: string, from: string, to: string): FlowEdge {
  return {
    id: edgeId(id),
    kind: 'reference',
    fromTaskId: taskId(from),
    toTaskId: taskId(to),
    meta: revisionMeta,
  };
}

function graph(tasks: Readonly<Record<string, Task>>, edges: readonly FlowEdge[]): FlowGraph {
  const validated = validateFlowGraph(
    Object.values(tasks).map((value) => value.id),
    Object.fromEntries(edges.map((edge) => [edge.id, edge])),
  );
  if (!validated.ok) throw new Error('Invalid Flow fixture.');
  return validated.value;
}

describe('derived branching goal evaluation', () => {
  it('requires every reachable structural descendant, including work after reconvergence', () => {
    const tasks = {
      A: task('A'),
      B: task('B', 'done'),
      C: task('C', 'done'),
      D: task('D', 'done'),
      E: task('E'),
    };
    const flow = graph(tasks, [
      structural('ab', 'branch', 'A', 'B', 0),
      structural('ac', 'branch', 'A', 'C', 1),
      structural('bd', 'continuation', 'B', 'D'),
      structural('cd', 'continuation', 'C', 'D'),
      structural('de', 'continuation', 'D', 'E'),
    ]);

    const [before] = evaluateDerivedGoalStatuses(tasks, flow);
    expect(before?.taskId).toBe(taskId('A'));
    expect(before?.descendantTaskIds).toEqual([taskId('B'), taskId('C'), taskId('D'), taskId('E')]);
    expect(before?.shouldBeDone).toBe(false);

    const completedTasks = { ...tasks, E: task('E', 'done') };
    const [after] = evaluateDerivedGoalStatuses(completedTasks, flow);
    expect(after?.shouldBeDone).toBe(true);
  });

  it('evaluates nested goals deterministically even before their canonical status is rewritten', () => {
    const tasks = {
      A: task('A'),
      B: task('B'),
      C: task('C', 'done'),
      D: task('D', 'done'),
      E: task('E', 'done'),
    };
    const flow = graph(tasks, [
      structural('ab', 'branch', 'A', 'B', 0),
      structural('ae', 'branch', 'A', 'E', 1),
      structural('bc', 'branch', 'B', 'C', 0),
      structural('bd', 'branch', 'B', 'D', 1),
    ]);

    const evaluations = evaluateDerivedGoalStatuses(tasks, flow);
    expect(evaluations.find((value) => value.taskId === taskId('B'))?.shouldBeDone).toBe(true);
    expect(evaluations.find((value) => value.taskId === taskId('A'))?.shouldBeDone).toBe(true);
  });

  it('does not expose a direct manual completion action for a current derived goal', () => {
    const tasks = { A: task('A'), B: task('B'), C: task('C') };
    const flow = graph(tasks, [
      structural('ab', 'branch', 'A', 'B', 0),
      structural('ac', 'branch', 'A', 'C', 1),
    ]);

    expect(deriveManualCompletionControl(taskId('A'), tasks, flow)).toEqual({
      kind: 'derived-goal-controlled',
    });
    expect(buildTaskExecutionReadModels(tasks, flow).A?.goal?.total).toBe(2);
  });
});

describe('merge execution gates', () => {
  it('blocks an unresolved merge target and its downstream region', () => {
    const tasks = {
      A: task('A', 'done'),
      B: task('B'),
      C: task('C'),
      D: task('D'),
    };
    const flow = graph(tasks, [
      structural('ac', 'continuation', 'A', 'C'),
      structural('bc', 'continuation', 'B', 'C'),
      structural('cd', 'continuation', 'C', 'D'),
    ]);

    expect(deriveTaskCompletionAvailability(taskId('C'), tasks, flow)).toEqual({
      kind: 'blocked-by-merge',
      gateTaskIds: [taskId('C')],
      remainingPredecessorIds: [taskId('B')],
    });
    expect(deriveTaskCompletionAvailability(taskId('D'), tasks, flow)).toEqual({
      kind: 'blocked-by-merge',
      gateTaskIds: [taskId('C')],
      remainingPredecessorIds: [taskId('B')],
    });
  });

  it('keeps ordinary one-line structural Flow non-blocking', () => {
    const tasks = { A: task('A'), B: task('B'), C: task('C') };
    const flow = graph(tasks, [
      structural('ab', 'continuation', 'A', 'B'),
      structural('bc', 'continuation', 'B', 'C'),
    ]);

    expect(deriveTaskCompletionAvailability(taskId('B'), tasks, flow)).toEqual({
      kind: 'available',
    });
    expect(deriveTaskCompletionAvailability(taskId('C'), tasks, flow)).toEqual({
      kind: 'available',
    });
  });

  it('ignores reference edges when deriving execution locks', () => {
    const tasks = { A: task('A'), B: task('B'), C: task('C') };
    const flow = graph(tasks, [reference('ab', 'A', 'B'), reference('cb', 'C', 'B')]);

    expect(deriveTaskCompletionAvailability(taskId('B'), tasks, flow)).toEqual({
      kind: 'available',
    });
  });

  it('opens a merge when all direct predecessors are effectively complete', () => {
    const tasks = {
      A: task('A', 'done'),
      B: task('B', 'done'),
      C: task('C'),
      D: task('D'),
    };
    const flow = graph(tasks, [
      structural('ac', 'continuation', 'A', 'C'),
      structural('bc', 'continuation', 'B', 'C'),
      structural('cd', 'continuation', 'C', 'D'),
    ]);

    expect(deriveTaskCompletionAvailability(taskId('C'), tasks, flow)).toEqual({
      kind: 'available',
    });
    expect(deriveTaskCompletionAvailability(taskId('D'), tasks, flow)).toEqual({
      kind: 'available',
    });
  });
});

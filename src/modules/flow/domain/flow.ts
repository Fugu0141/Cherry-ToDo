import type { FlowEdgeId, TaskId } from '../../../shared/ids/index';
import { validateRevisionMeta, type RevisionMeta } from '../../../shared/revision/index';
import { err, ok, type Result } from '../../../shared/result/index';

export type StructuralFlowKind = 'continuation' | 'branch';

export interface StructuralFlowEdge {
  readonly id: FlowEdgeId;
  readonly kind: StructuralFlowKind;
  readonly fromTaskId: TaskId;
  readonly toTaskId: TaskId;
  readonly order: number;
  readonly meta: RevisionMeta;
}

export interface ReferenceFlowEdge {
  readonly id: FlowEdgeId;
  readonly kind: 'reference';
  readonly fromTaskId: TaskId;
  readonly toTaskId: TaskId;
  readonly meta: RevisionMeta;
}

export type FlowEdge = StructuralFlowEdge | ReferenceFlowEdge;

export interface FlowGraph {
  readonly edges: Readonly<Record<string, FlowEdge>>;
}

export type ExecutionDependencyKind = 'goal-descendant' | 'merge-predecessor';

export interface ExecutionDependencyEdge {
  readonly kind: ExecutionDependencyKind;
  readonly fromTaskId: TaskId;
  readonly toTaskId: TaskId;
}

export interface ExecutionTopologyAnalysis {
  readonly derivedGoalTaskIds: readonly TaskId[];
  readonly mergeTaskIds: readonly TaskId[];
  readonly independentBranchRootIds: Readonly<Record<string, readonly TaskId[]>>;
  readonly goalDescendantTaskIds: Readonly<Record<string, readonly TaskId[]>>;
  readonly mergePredecessorTaskIds: Readonly<Record<string, readonly TaskId[]>>;
  readonly dependencyEdges: readonly ExecutionDependencyEdge[];
  readonly dependencyCycleTaskIds: readonly TaskId[];
}

export type FlowInvariantErrorCode =
  | 'edge-key-mismatch'
  | 'edge-id-in-use'
  | 'missing-endpoint'
  | 'self-edge'
  | 'duplicate-edge'
  | 'continuation-conflict'
  | 'invalid-order'
  | 'branch-order-conflict'
  | 'invalid-edge-revision'
  | 'structural-cycle'
  | 'execution-dependency-cycle';

export interface FlowInvariantError {
  readonly code: FlowInvariantErrorCode;
  readonly message: string;
  readonly edgeId?: FlowEdgeId;
  readonly taskId?: TaskId;
}

function structuralEdges(edges: Readonly<Record<string, FlowEdge>>): readonly StructuralFlowEdge[] {
  return Object.values(edges).filter(
    (edge): edge is StructuralFlowEdge => edge.kind !== 'reference',
  );
}

function relationshipKey(edge: FlowEdge): string {
  const category = edge.kind === 'reference' ? 'reference' : 'structural';
  return `${category}:${edge.fromTaskId}:${edge.toTaskId}`;
}

function stableTaskIds(ids: Iterable<TaskId>): readonly TaskId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function hasStructuralCycle(
  taskIds: readonly TaskId[],
  edges: readonly StructuralFlowEdge[],
): boolean {
  const indegree = new Map<TaskId, number>();
  const outgoing = new Map<TaskId, TaskId[]>();

  for (const taskId of taskIds) {
    indegree.set(taskId, 0);
    outgoing.set(taskId, []);
  }

  for (const edge of edges) {
    if (!indegree.has(edge.fromTaskId) || !indegree.has(edge.toTaskId)) {
      continue;
    }

    indegree.set(edge.toTaskId, (indegree.get(edge.toTaskId) ?? 0) + 1);
    outgoing.get(edge.fromTaskId)?.push(edge.toTaskId);
  }

  const queue: TaskId[] = [];
  for (const [taskId, degree] of indegree) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  let visited = 0;
  while (queue.length > 0) {
    const taskId = queue.shift();
    if (taskId === undefined) {
      break;
    }

    visited += 1;
    for (const nextTaskId of outgoing.get(taskId) ?? []) {
      const nextDegree = (indegree.get(nextTaskId) ?? 0) - 1;
      indegree.set(nextTaskId, nextDegree);
      if (nextDegree === 0) {
        queue.push(nextTaskId);
      }
    }
  }

  return visited !== indegree.size;
}

export function outgoingStructuralEdges(
  taskId: TaskId,
  graph: FlowGraph,
): readonly StructuralFlowEdge[] {
  return structuralEdges(graph.edges)
    .filter((edge) => edge.fromTaskId === taskId)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

export function incomingStructuralEdges(
  taskId: TaskId,
  graph: FlowGraph,
): readonly StructuralFlowEdge[] {
  return structuralEdges(graph.edges)
    .filter((edge) => edge.toTaskId === taskId)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

export function uniqueOutgoingStructuralTaskIds(
  taskId: TaskId,
  graph: FlowGraph,
): readonly TaskId[] {
  return stableTaskIds(outgoingStructuralEdges(taskId, graph).map((edge) => edge.toTaskId));
}

export function uniqueIncomingStructuralTaskIds(
  taskId: TaskId,
  graph: FlowGraph,
): readonly TaskId[] {
  return stableTaskIds(incomingStructuralEdges(taskId, graph).map((edge) => edge.fromTaskId));
}

export function reachableStructuralTaskIds(taskId: TaskId, graph: FlowGraph): readonly TaskId[] {
  const seen = new Set<TaskId>();
  const queue = [...uniqueOutgoingStructuralTaskIds(taskId, graph)];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) {
      continue;
    }

    seen.add(current);
    for (const next of uniqueOutgoingStructuralTaskIds(current, graph)) {
      if (!seen.has(next)) {
        queue.push(next);
      }
    }
  }

  return stableTaskIds(seen);
}

export function independentStructuralSuccessorTaskIds(
  taskId: TaskId,
  graph: FlowGraph,
): readonly TaskId[] {
  const successors = uniqueOutgoingStructuralTaskIds(taskId, graph);
  if (successors.length < 2) {
    return successors;
  }

  const reachableBySuccessor = new Map<TaskId, ReadonlySet<TaskId>>();
  for (const successor of successors) {
    reachableBySuccessor.set(successor, new Set(reachableStructuralTaskIds(successor, graph)));
  }

  return successors.filter(
    (candidate) =>
      !successors.some(
        (other) =>
          other !== candidate && (reachableBySuccessor.get(other)?.has(candidate) ?? false),
      ),
  );
}

export function isDerivedBranchingGoal(taskId: TaskId, graph: FlowGraph): boolean {
  return independentStructuralSuccessorTaskIds(taskId, graph).length >= 2;
}

function findDependencyCycle(
  taskIds: readonly TaskId[],
  dependencies: readonly ExecutionDependencyEdge[],
): readonly TaskId[] {
  const taskSet = new Set(taskIds);
  const outgoing = new Map<TaskId, TaskId[]>();
  for (const taskId of taskIds) {
    outgoing.set(taskId, []);
  }
  for (const dependency of dependencies) {
    if (!taskSet.has(dependency.fromTaskId) || !taskSet.has(dependency.toTaskId)) {
      continue;
    }
    const current = outgoing.get(dependency.fromTaskId) ?? [];
    current.push(dependency.toTaskId);
    outgoing.set(dependency.fromTaskId, current);
  }
  for (const [taskId, targets] of outgoing) {
    outgoing.set(taskId, stableTaskIds(targets) as TaskId[]);
  }

  const state = new Map<TaskId, 0 | 1 | 2>();
  const stack: TaskId[] = [];
  const stackIndex = new Map<TaskId, number>();

  const visit = (taskId: TaskId): readonly TaskId[] | null => {
    state.set(taskId, 1);
    stackIndex.set(taskId, stack.length);
    stack.push(taskId);

    for (const next of outgoing.get(taskId) ?? []) {
      const nextState = state.get(next) ?? 0;
      if (nextState === 1) {
        const index = stackIndex.get(next) ?? 0;
        return stableTaskIds(stack.slice(index));
      }
      if (nextState === 0) {
        const nested = visit(next);
        if (nested !== null) {
          return nested;
        }
      }
    }

    stack.pop();
    stackIndex.delete(taskId);
    state.set(taskId, 2);
    return null;
  };

  for (const taskId of stableTaskIds(taskIds)) {
    if ((state.get(taskId) ?? 0) !== 0) {
      continue;
    }
    const cycle = visit(taskId);
    if (cycle !== null) {
      return cycle;
    }
  }

  return [];
}

export function analyzeExecutionTopology(
  taskIds: readonly TaskId[],
  graph: FlowGraph,
): ExecutionTopologyAnalysis {
  const stableIds = stableTaskIds(taskIds);
  const derivedGoalTaskIds = stableIds.filter((taskId) => isDerivedBranchingGoal(taskId, graph));
  const mergeTaskIds = stableIds.filter(
    (taskId) => uniqueIncomingStructuralTaskIds(taskId, graph).length >= 2,
  );
  const independentBranchRootIds: Record<string, readonly TaskId[]> = {};
  const goalDescendantTaskIds: Record<string, readonly TaskId[]> = {};
  const mergePredecessorTaskIds: Record<string, readonly TaskId[]> = {};
  const dependencyEdges: ExecutionDependencyEdge[] = [];

  for (const taskId of derivedGoalTaskIds) {
    const branchRoots = independentStructuralSuccessorTaskIds(taskId, graph);
    const descendants = reachableStructuralTaskIds(taskId, graph);
    independentBranchRootIds[taskId] = branchRoots;
    goalDescendantTaskIds[taskId] = descendants;
    for (const descendantId of descendants) {
      dependencyEdges.push({
        kind: 'goal-descendant',
        fromTaskId: taskId,
        toTaskId: descendantId,
      });
    }
  }

  for (const taskId of mergeTaskIds) {
    const predecessors = uniqueIncomingStructuralTaskIds(taskId, graph);
    mergePredecessorTaskIds[taskId] = predecessors;
    for (const predecessorId of predecessors) {
      dependencyEdges.push({
        kind: 'merge-predecessor',
        fromTaskId: taskId,
        toTaskId: predecessorId,
      });
    }
  }

  dependencyEdges.sort(
    (left, right) =>
      left.fromTaskId.localeCompare(right.fromTaskId) ||
      left.toTaskId.localeCompare(right.toTaskId) ||
      left.kind.localeCompare(right.kind),
  );

  return {
    derivedGoalTaskIds,
    mergeTaskIds,
    independentBranchRootIds,
    goalDescendantTaskIds,
    mergePredecessorTaskIds,
    dependencyEdges,
    dependencyCycleTaskIds: findDependencyCycle(stableIds, dependencyEdges),
  };
}

export function validateFlowGraph(
  taskIds: readonly TaskId[],
  edges: Readonly<Record<string, FlowEdge>>,
): Result<FlowGraph, readonly FlowInvariantError[]> {
  const errors: FlowInvariantError[] = [];
  const taskIdSet = new Set(taskIds);
  const seenRelationships = new Set<string>();
  const continuationOwners = new Map<TaskId, FlowEdgeId>();
  const branchOrders = new Set<string>();

  for (const [key, edge] of Object.entries(edges)) {
    if (key !== edge.id) {
      errors.push({
        code: 'edge-key-mismatch',
        edgeId: edge.id,
        message: `Flow edge map key "${key}" does not match edge id "${edge.id}".`,
      });
    }

    if (!taskIdSet.has(edge.fromTaskId) || !taskIdSet.has(edge.toTaskId)) {
      errors.push({
        code: 'missing-endpoint',
        edgeId: edge.id,
        message: `Flow edge "${edge.id}" references a Task outside the current Tab.`,
      });
    }

    if (edge.fromTaskId === edge.toTaskId) {
      errors.push({
        code: 'self-edge',
        edgeId: edge.id,
        taskId: edge.fromTaskId,
        message: `Flow edge "${edge.id}" cannot connect a Task to itself.`,
      });
    }

    const revision = validateRevisionMeta(edge.meta);
    if (!revision.ok) {
      errors.push({
        code: 'invalid-edge-revision',
        edgeId: edge.id,
        message: `Flow edge "${edge.id}" has invalid revision metadata.`,
      });
    }

    const relationship = relationshipKey(edge);
    if (seenRelationships.has(relationship)) {
      errors.push({
        code: 'duplicate-edge',
        edgeId: edge.id,
        message:
          edge.kind === 'reference'
            ? `Duplicate reference Flow connection from "${edge.fromTaskId}" to "${edge.toTaskId}".`
            : `Duplicate structural Flow connection from "${edge.fromTaskId}" to "${edge.toTaskId}".`,
      });
    } else {
      seenRelationships.add(relationship);
    }

    if (edge.kind !== 'reference') {
      if (!Number.isSafeInteger(edge.order) || edge.order < 0) {
        errors.push({
          code: 'invalid-order',
          edgeId: edge.id,
          message: `Structural Flow edge "${edge.id}" has an invalid order.`,
        });
      }

      if (edge.kind === 'branch') {
        const orderKey = `${edge.fromTaskId}:${edge.order}`;
        if (branchOrders.has(orderKey)) {
          errors.push({
            code: 'branch-order-conflict',
            edgeId: edge.id,
            taskId: edge.fromTaskId,
            message: `Task "${edge.fromTaskId}" has more than one branch at order ${edge.order}.`,
          });
        } else {
          branchOrders.add(orderKey);
        }
      }

      if (edge.kind === 'continuation') {
        const existing = continuationOwners.get(edge.fromTaskId);
        if (existing !== undefined) {
          errors.push({
            code: 'continuation-conflict',
            edgeId: edge.id,
            taskId: edge.fromTaskId,
            message: `Task "${edge.fromTaskId}" has more than one outgoing continuation edge.`,
          });
        } else {
          continuationOwners.set(edge.fromTaskId, edge.id);
        }
      }
    }
  }

  const graph: FlowGraph = { edges: { ...edges } };
  const structuralCycle = hasStructuralCycle(taskIds, structuralEdges(edges));
  if (structuralCycle) {
    errors.push({
      code: 'structural-cycle',
      message: 'Structural Flow edges must form a directed acyclic graph.',
    });
  }

  const hasInvalidEndpoint = errors.some(
    (error) => error.code === 'missing-endpoint' || error.code === 'self-edge',
  );
  if (!structuralCycle && !hasInvalidEndpoint) {
    const execution = analyzeExecutionTopology(taskIds, graph);
    const cycleTaskId = execution.dependencyCycleTaskIds[0];
    if (cycleTaskId !== undefined) {
      errors.push({
        code: 'execution-dependency-cycle',
        taskId: cycleTaskId,
        message: `Flow completion dependencies must remain acyclic. Cycle involves: ${execution.dependencyCycleTaskIds.join(', ')}.`,
      });
    }
  }

  return errors.length === 0 ? ok(graph) : err(errors);
}

export function addFlowEdge(
  taskIds: readonly TaskId[],
  graph: FlowGraph,
  edge: FlowEdge,
): Result<FlowGraph, readonly FlowInvariantError[]> {
  if (graph.edges[edge.id] !== undefined) {
    return err([
      {
        code: 'edge-id-in-use',
        edgeId: edge.id,
        message: `Flow edge id "${edge.id}" is already in use.`,
      },
    ]);
  }

  return validateFlowGraph(taskIds, { ...graph.edges, [edge.id]: edge });
}

import type { FlowEdgeId, TaskId } from '../../../shared/ids/index.ts';
import { validateRevisionMeta, type RevisionMeta } from '../../../shared/revision/index.ts';
import { err, ok, type Result } from '../../../shared/result/index.ts';

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
  | 'structural-cycle';

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

function duplicateKey(edge: FlowEdge): string {
  return `${edge.kind}:${edge.fromTaskId}:${edge.toTaskId}`;
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

export function validateFlowGraph(
  taskIds: readonly TaskId[],
  edges: Readonly<Record<string, FlowEdge>>,
): Result<FlowGraph, readonly FlowInvariantError[]> {
  const errors: FlowInvariantError[] = [];
  const taskIdSet = new Set(taskIds);
  const seenTuples = new Set<string>();
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

    const tuple = duplicateKey(edge);
    if (seenTuples.has(tuple)) {
      errors.push({
        code: 'duplicate-edge',
        edgeId: edge.id,
        message: `Duplicate ${edge.kind} Flow connection from "${edge.fromTaskId}" to "${edge.toTaskId}".`,
      });
    } else {
      seenTuples.add(tuple);
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

  if (hasStructuralCycle(taskIds, structuralEdges(edges))) {
    errors.push({
      code: 'structural-cycle',
      message: 'Structural Flow edges must form a directed acyclic graph.',
    });
  }

  return errors.length === 0 ? ok({ edges: { ...edges } }) : err(errors);
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

export function isDerivedBranchingGoal(taskId: TaskId, graph: FlowGraph): boolean {
  return outgoingStructuralEdges(taskId, graph).length >= 2;
}

import type { FlowConnectionModel, WorkspaceScreenModel } from '../../../ui-contract/index';

export interface ListFlowContext {
  readonly incomingStructuralTitles: readonly string[];
  readonly outgoingStructuralTitles: readonly string[];
  readonly referenceTitles: readonly string[];
}

function taskTitle(workspace: WorkspaceScreenModel, taskId: string): string {
  return workspace.tasks.find((task) => task.id === taskId)?.title ?? taskId;
}

function structural(edge: FlowConnectionModel): boolean {
  return edge.kind !== 'reference';
}

export function buildListFlowContext(
  workspace: WorkspaceScreenModel,
  taskId: string,
): ListFlowContext {
  const incomingStructuralTitles = workspace.connections
    .filter((edge) => structural(edge) && edge.toTaskId === taskId)
    .map((edge) => taskTitle(workspace, edge.fromTaskId));
  const outgoingStructuralTitles = workspace.connections
    .filter((edge) => structural(edge) && edge.fromTaskId === taskId)
    .map((edge) => taskTitle(workspace, edge.toTaskId));
  const referenceTitles = workspace.connections
    .filter(
      (edge) =>
        edge.kind === 'reference' && (edge.fromTaskId === taskId || edge.toTaskId === taskId),
    )
    .map((edge) =>
      edge.fromTaskId === taskId
        ? taskTitle(workspace, edge.toTaskId)
        : taskTitle(workspace, edge.fromTaskId),
    );

  return { incomingStructuralTitles, outgoingStructuralTitles, referenceTitles };
}

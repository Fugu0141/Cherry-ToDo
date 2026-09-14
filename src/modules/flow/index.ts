export {
  addFlowEdge,
  incomingStructuralEdges,
  isDerivedBranchingGoal,
  outgoingStructuralEdges,
  validateFlowGraph,
  type FlowEdge,
  type FlowGraph,
  type FlowInvariantError,
  type FlowInvariantErrorCode,
  type ReferenceFlowEdge,
  type StructuralFlowEdge,
  type StructuralFlowKind,
} from './domain/flow';

export {
  buildTaskExecutionReadModels,
  deriveManualCompletionControl,
  deriveTaskCompletionAvailability,
  evaluateDerivedGoalStatuses,
  reachableStructuralTaskIds,
  type GoalEvaluation,
  type ManualCompletionControl,
  type TaskCompletionAvailability,
  type TaskExecutionReadModel,
} from './domain/execution';

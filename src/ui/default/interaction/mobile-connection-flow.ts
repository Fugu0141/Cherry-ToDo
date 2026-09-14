import type { CherryFlowKind, ConnectTasksIntent } from '../../../ui-contract/index';
import type { InteractionCoordinator } from './interaction-coordinator';

export interface MobileConnectionDraft {
  readonly sourceTaskId: string;
  readonly kind: CherryFlowKind;
}

export function beginMobileConnection(
  coordinator: InteractionCoordinator,
  sourceTaskId: string,
  kind: CherryFlowKind,
): MobileConnectionDraft | null {
  if (!coordinator.beginConnection(sourceTaskId, kind)) return null;
  return { sourceTaskId, kind };
}

export function completeMobileConnection(
  coordinator: InteractionCoordinator,
  targetTaskId: string,
): ConnectTasksIntent | null {
  const state = coordinator.state;
  if (state.kind !== 'creating-connection' || state.sourceTaskId === targetTaskId) return null;
  coordinator.completeConnection();
  return {
    fromTaskId: state.sourceTaskId,
    toTaskId: targetTaskId,
    kind: state.relation,
  };
}

export function cancelMobileConnection(coordinator: InteractionCoordinator): boolean {
  if (coordinator.state.kind !== 'creating-connection') return false;
  coordinator.cancel();
  return true;
}

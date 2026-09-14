export interface InteractionPoint {
  readonly x: number;
  readonly y: number;
}

export type PointerInteractionKind =
  | 'panning'
  | 'dragging-task'
  | 'reordering-flow'
  | 'drawing-stroke'
  | 'editing-annotation'
  | 'editing-text';

export type ConnectionRelation = 'continuation' | 'branch' | 'reference';

export type InteractionState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: PointerInteractionKind;
      readonly pointerId: number;
      readonly origin: InteractionPoint;
      readonly current: InteractionPoint;
      readonly subjectId?: string;
    }
  | {
      readonly kind: 'creating-connection';
      readonly sourceTaskId: string;
      readonly relation: ConnectionRelation;
    };

export interface BeginPointerInteraction {
  readonly kind: PointerInteractionKind;
  readonly pointerId: number;
  readonly point: InteractionPoint;
  readonly subjectId?: string;
}

export class InteractionCoordinator {
  #state: InteractionState = { kind: 'idle' };

  get state(): InteractionState {
    return this.#state;
  }

  get active(): boolean {
    return this.#state.kind !== 'idle';
  }

  beginPointer(input: BeginPointerInteraction): boolean {
    if (this.active) return false;
    this.#state = {
      kind: input.kind,
      pointerId: input.pointerId,
      origin: input.point,
      current: input.point,
      ...(input.subjectId === undefined ? {} : { subjectId: input.subjectId }),
    };
    return true;
  }

  beginConnection(sourceTaskId: string, relation: ConnectionRelation): boolean {
    if (this.active) return false;
    this.#state = { kind: 'creating-connection', sourceTaskId, relation };
    return true;
  }

  updatePointer(pointerId: number, point: InteractionPoint): InteractionState | null {
    const current = this.#state;
    if (current.kind === 'idle' || current.kind === 'creating-connection') return null;
    if (current.pointerId !== pointerId) return null;
    this.#state = { ...current, current: point };
    return this.#state;
  }

  endPointer(pointerId: number): InteractionState | null {
    const current = this.#state;
    if (current.kind === 'idle' || current.kind === 'creating-connection') return null;
    if (current.pointerId !== pointerId) return null;
    this.#state = { kind: 'idle' };
    return current;
  }

  completeConnection(): InteractionState | null {
    if (this.#state.kind !== 'creating-connection') return null;
    const current = this.#state;
    this.#state = { kind: 'idle' };
    return current;
  }

  cancel(): InteractionState | null {
    if (this.#state.kind === 'idle') return null;
    const current = this.#state;
    this.#state = { kind: 'idle' };
    return current;
  }

  ownsPointer(pointerId: number, kind?: PointerInteractionKind): boolean {
    const current = this.#state;
    if (current.kind === 'idle' || current.kind === 'creating-connection') return false;
    return current.pointerId === pointerId && (kind === undefined || current.kind === kind);
  }
}

export function interactionDistanceSquared(state: InteractionState): number {
  if (state.kind === 'idle' || state.kind === 'creating-connection') return 0;
  const dx = state.current.x - state.origin.x;
  const dy = state.current.y - state.origin.y;
  return dx * dx + dy * dy;
}

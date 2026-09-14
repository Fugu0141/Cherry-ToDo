export interface HistoryState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoDepth: number;
  readonly redoDepth: number;
}

export class SnapshotHistory<T> {
  readonly #past: T[] = [];
  readonly #future: T[] = [];

  get state(): HistoryState {
    return {
      canUndo: this.#past.length > 0,
      canRedo: this.#future.length > 0,
      undoDepth: this.#past.length,
      redoDepth: this.#future.length,
    };
  }

  record(previous: T): void {
    this.#past.push(previous);
    this.#future.length = 0;
  }

  undo(current: T): T | undefined {
    const previous = this.#past.pop();
    if (previous === undefined) {
      return undefined;
    }

    this.#future.push(current);
    return previous;
  }

  redo(current: T): T | undefined {
    const next = this.#future.pop();
    if (next === undefined) {
      return undefined;
    }

    this.#past.push(current);
    return next;
  }

  clear(): void {
    this.#past.length = 0;
    this.#future.length = 0;
  }
}

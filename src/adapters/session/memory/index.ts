import type { SessionContext, SessionRepository } from '../../../modules/startup/index';

export class MemorySessionRepository implements SessionRepository {
  #context: SessionContext | null;

  constructor(initialContext: SessionContext | null = null) {
    this.#context = initialContext === null ? null : structuredClone(initialContext);
  }

  load(): Promise<SessionContext | null> {
    return Promise.resolve(this.#context === null ? null : structuredClone(this.#context));
  }

  save(context: SessionContext): Promise<void> {
    this.#context = structuredClone(context);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.#context = null;
    return Promise.resolve();
  }
}

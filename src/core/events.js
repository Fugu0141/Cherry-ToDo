export function createEventBus() {
  const listeners = new Map();

  function on(type, listener) {
    if (typeof type !== "string" || !type.trim()) {
      throw new TypeError("Event type must be a non-empty string.");
    }
    if (typeof listener !== "function") {
      throw new TypeError("Event listener must be a function.");
    }

    const eventType = type.trim();
    const bucket = listeners.get(eventType) || new Set();
    bucket.add(listener);
    listeners.set(eventType, bucket);

    return () => off(eventType, listener);
  }

  function once(type, listener) {
    let unsubscribe = null;
    unsubscribe = on(type, event => {
      unsubscribe?.();
      listener(event);
    });
    return unsubscribe;
  }

  function off(type, listener) {
    const bucket = listeners.get(type);
    if (!bucket) return false;

    const deleted = bucket.delete(listener);
    if (!bucket.size) listeners.delete(type);
    return deleted;
  }

  function emit(type, detail, metadata = {}) {
    const eventType = typeof type === "string" ? type.trim() : "";
    if (!eventType) {
      throw new TypeError("Event type must be a non-empty string.");
    }

    const event = Object.freeze({
      type: eventType,
      detail,
      metadata: Object.freeze({ ...metadata })
    });

    const bucket = listeners.get(eventType);
    if (!bucket?.size) return event;

    for (const listener of [...bucket]) {
      listener(event);
    }

    return event;
  }

  function clear(type) {
    if (typeof type === "string") {
      return listeners.delete(type);
    }
    listeners.clear();
    return true;
  }

  function listenerCount(type) {
    return listeners.get(type)?.size || 0;
  }

  return Object.freeze({
    on,
    once,
    off,
    emit,
    clear,
    listenerCount
  });
}

export const eventCore = Object.freeze({
  createEventBus
});

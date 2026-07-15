function normalizeEventType(type) {
  if (typeof type !== "string" || !type.trim()) {
    throw new TypeError("Event type must be a non-empty string.");
  }

  return type.trim();
}

function assertEventListener(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("Event listener must be a function.");
  }

  return listener;
}

export function createEventBus() {
  const listeners = new Map();

  function on(type, listener) {
    const eventType = normalizeEventType(type);
    assertEventListener(listener);

    const bucket = listeners.get(eventType) || new Set();
    bucket.add(listener);
    listeners.set(eventType, bucket);

    return () => off(eventType, listener);
  }

  function once(type, listener) {
    assertEventListener(listener);

    let unsubscribe = null;
    unsubscribe = on(type, event => {
      unsubscribe?.();
      listener(event);
    });
    return unsubscribe;
  }

  function off(type, listener) {
    const eventType = normalizeEventType(type);
    const bucket = listeners.get(eventType);
    if (!bucket) return false;

    const deleted = bucket.delete(listener);
    if (!bucket.size) listeners.delete(eventType);
    return deleted;
  }

  function emit(type, detail, metadata = {}) {
    const eventType = normalizeEventType(type);

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
      return listeners.delete(normalizeEventType(type));
    }
    listeners.clear();
    return true;
  }

  function listenerCount(type) {
    return listeners.get(normalizeEventType(type))?.size || 0;
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
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
  const anyListeners = new Set();

  function on(type, listener) {
    const eventType = normalizeEventType(type);
    assertEventListener(listener);

    const bucket = listeners.get(eventType) || new Set();
    bucket.add(listener);
    listeners.set(eventType, bucket);

    return () => off(eventType, listener);
  }

  function onAny(listener) {
    anyListeners.add(assertEventListener(listener));
    return () => anyListeners.delete(listener);
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

  function createEvent(type, detail, metadata = {}) {
    return Object.freeze({
      type: normalizeEventType(type),
      detail,
      metadata: Object.freeze({ ...metadata })
    });
  }

  function matchingListeners(eventType) {
    return [
      ...(listeners.get(eventType) || []),
      ...anyListeners
    ];
  }

  function emit(type, detail, metadata = {}) {
    const event = createEvent(type, detail, metadata);

    for (const listener of matchingListeners(event.type)) {
      listener(event);
    }

    return event;
  }

  async function emitAsync(type, detail, metadata = {}) {
    const event = createEvent(type, detail, metadata);
    await Promise.all(matchingListeners(event.type).map(listener => listener(event)));
    return event;
  }

  function waitFor(type, options = {}) {
    const eventType = normalizeEventType(type);
    const timeout = Math.max(0, Number(options.timeout) || 0);

    return new Promise((resolve, reject) => {
      let timer = null;
      let unsubscribe = null;

      function cleanup() {
        unsubscribe?.();
        if (timer) clearTimeout(timer);
        options.signal?.removeEventListener("abort", onAbort);
      }

      function onAbort() {
        cleanup();
        reject(options.signal?.reason || new DOMException("Aborted", "AbortError"));
      }

      unsubscribe = once(eventType, event => {
        cleanup();
        resolve(event);
      });

      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      options.signal?.addEventListener("abort", onAbort, { once: true });

      if (timeout > 0) {
        timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Timed out waiting for event: ${eventType}`));
        }, timeout);
      }
    });
  }

  function clear(type) {
    if (typeof type === "string") {
      return listeners.delete(normalizeEventType(type));
    }
    listeners.clear();
    anyListeners.clear();
    return true;
  }

  function listenerCount(type) {
    if (typeof type !== "string") {
      return anyListeners.size + [...listeners.values()].reduce((total, bucket) => total + bucket.size, 0);
    }
    return (listeners.get(normalizeEventType(type))?.size || 0) + anyListeners.size;
  }

  return Object.freeze({
    on,
    onAny,
    once,
    off,
    emit,
    emitAsync,
    waitFor,
    clear,
    listenerCount
  });
}

export const eventCore = Object.freeze({
  createEventBus
});

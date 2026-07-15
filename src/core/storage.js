function assertStorageAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("A storage adapter object is required.");
  }

  for (const method of ["get", "set", "remove"]) {
    if (typeof adapter[method] !== "function") {
      throw new TypeError(`Storage adapter must implement ${method}().`);
    }
  }

  return adapter;
}

function normalizeAdapterName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Storage adapter name must be a non-empty string.");
  }

  return name.trim();
}

export function createStorageOrchestrator(options = {}) {
  const adapters = new Map();
  const defaultAdapterName = options.defaultAdapterName == null
    ? null
    : normalizeAdapterName(options.defaultAdapterName);

  function registerAdapter(name, adapter) {
    const normalizedName = normalizeAdapterName(name);
    const entry = Object.freeze({
      adapter: assertStorageAdapter(adapter)
    });
    adapters.set(normalizedName, entry);

    return () => {
      if (adapters.get(normalizedName) !== entry) return false;
      return adapters.delete(normalizedName);
    };
  }

  function hasAdapter(name) {
    return adapters.has(normalizeAdapterName(name));
  }

  function listAdapters() {
    return [...adapters.keys()];
  }

  function resolveAdapter(name) {
    const resolvedName = name
      ? normalizeAdapterName(name)
      : defaultAdapterName;
    const entry = resolvedName ? adapters.get(resolvedName) : null;

    if (!entry) {
      throw new Error(`Unknown storage adapter: ${resolvedName || "(none)"}`);
    }

    return { name: resolvedName, adapter: entry.adapter };
  }

  function get(key, options = {}) {
    const { adapter } = resolveAdapter(options.adapter);
    return adapter.get(key);
  }

  function set(key, value, options = {}) {
    const { adapter } = resolveAdapter(options.adapter);
    return adapter.set(key, value);
  }

  function remove(key, options = {}) {
    const { adapter } = resolveAdapter(options.adapter);
    return adapter.remove(key);
  }

  function getJson(key, options = {}) {
    const raw = get(key, options);
    if (raw == null || raw === "") return options.fallback ?? null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      if (options.strict) throw error;
      return options.fallback ?? null;
    }
  }

  function setJson(key, value, options = {}) {
    return set(key, JSON.stringify(value), options);
  }

  function clear(options = {}) {
    const { adapter } = resolveAdapter(options.adapter);
    if (typeof adapter.clear !== "function") {
      throw new Error("Storage adapter does not implement clear().");
    }
    return adapter.clear();
  }

  return Object.freeze({
    registerAdapter,
    hasAdapter,
    listAdapters,
    get,
    set,
    remove,
    getJson,
    setJson,
    clear
  });
}

export function createKeyValueAdapter(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new TypeError("A Storage-like object is required.");
  }

  return Object.freeze({
    get(key) {
      return storage.getItem(key);
    },
    set(key, value) {
      storage.setItem(key, String(value));
      return value;
    },
    remove(key) {
      storage.removeItem(key);
    },
    clear() {
      storage.clear();
    }
  });
}

export const storageCore = Object.freeze({
  createStorageOrchestrator,
  createKeyValueAdapter
});
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

function normalizeStorageKey(key) {
  if (typeof key !== "string" || !key) {
    throw new TypeError("Storage key must be a non-empty string.");
  }

  return key;
}

export function createStorageOrchestrator(options = {}) {
  const adapters = new Map();
  const eventBus = options.eventBus || null;
  const defaultAdapterName = options.defaultAdapterName == null
    ? null
    : normalizeAdapterName(options.defaultAdapterName);

  function emit(type, detail) {
    eventBus?.emit?.(type, detail, { source: "storage" });
  }

  function registerAdapter(name, adapter) {
    const normalizedName = normalizeAdapterName(name);
    const entry = Object.freeze({
      adapter: assertStorageAdapter(adapter)
    });
    adapters.set(normalizedName, entry);
    emit("storage:adapter-registered", { adapter: normalizedName });

    return () => {
      if (adapters.get(normalizedName) !== entry) return false;
      const deleted = adapters.delete(normalizedName);
      if (deleted) emit("storage:adapter-removed", { adapter: normalizedName });
      return deleted;
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

  function perform(operation, key, value, options = {}) {
    const normalizedKey = key == null ? null : normalizeStorageKey(key);
    const { name, adapter } = resolveAdapter(options.adapter);

    try {
      const result = normalizedKey == null
        ? adapter[operation]()
        : operation === "set"
          ? adapter.set(normalizedKey, value)
          : adapter[operation](normalizedKey);
      emit(`storage:${operation}`, { adapter: name, key: normalizedKey, value, result });
      return result;
    } catch (error) {
      emit("storage:error", { operation, adapter: name, key: normalizedKey, error });
      throw error;
    }
  }

  function get(key, options = {}) {
    return perform("get", key, undefined, options);
  }

  function set(key, value, options = {}) {
    return perform("set", key, value, options);
  }

  function remove(key, options = {}) {
    return perform("remove", key, undefined, options);
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
    return perform("clear", null, undefined, options);
  }

  function createNamespace(prefix, namespaceOptions = {}) {
    const normalizedPrefix = normalizeStorageKey(prefix);
    const adapter = namespaceOptions.adapter;
    const keyFor = key => `${normalizedPrefix}${normalizeStorageKey(key)}`;

    return Object.freeze({
      get: (key, options = {}) => get(keyFor(key), { ...options, adapter: options.adapter || adapter }),
      set: (key, value, options = {}) => set(keyFor(key), value, { ...options, adapter: options.adapter || adapter }),
      remove: (key, options = {}) => remove(keyFor(key), { ...options, adapter: options.adapter || adapter }),
      getJson: (key, options = {}) => getJson(keyFor(key), { ...options, adapter: options.adapter || adapter }),
      setJson: (key, value, options = {}) => setJson(keyFor(key), value, { ...options, adapter: options.adapter || adapter })
    });
  }

  function apply(operations, options = {}) {
    if (!Array.isArray(operations)) {
      throw new TypeError("Storage operations must be an array.");
    }

    return operations.map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        throw new TypeError(`Storage operation at index ${index} must be an object.`);
      }

      const operation = entry.operation || entry.type;
      const operationOptions = { ...options, ...(entry.options || {}) };
      if (operation === "get") return get(entry.key, operationOptions);
      if (operation === "set") return set(entry.key, entry.value, operationOptions);
      if (operation === "remove") return remove(entry.key, operationOptions);
      if (operation === "getJson") return getJson(entry.key, operationOptions);
      if (operation === "setJson") return setJson(entry.key, entry.value, operationOptions);
      if (operation === "clear") return clear(operationOptions);
      throw new Error(`Unknown storage operation at index ${index}: ${operation}`);
    });
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
    clear,
    createNamespace,
    apply
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

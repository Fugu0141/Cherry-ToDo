function assertName(name, label = "registry entry") {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError(`${label} name must be a non-empty string.`);
  }

  return name.trim();
}

export function createRegistry(options = {}) {
  const {
    name = "registry",
    validate = () => true
  } = options;

  const entries = new Map();

  function register(entryName, value) {
    const key = assertName(entryName, name);

    if (!validate(value, key)) {
      throw new TypeError(`Invalid ${name} entry: ${key}`);
    }

    entries.set(key, value);

    return function unregister() {
      return entries.delete(key);
    };
  }

  function unregister(entryName) {
    return entries.delete(assertName(entryName, name));
  }

  function has(entryName) {
    return entries.has(assertName(entryName, name));
  }

  function get(entryName) {
    return entries.get(assertName(entryName, name)) ?? null;
  }

  function list() {
    return [...entries.entries()].map(([entryName, value]) => ({
      name: entryName,
      value
    }));
  }

  function values() {
    return [...entries.values()];
  }

  function clear() {
    entries.clear();
  }

  return Object.freeze({
    register,
    unregister,
    has,
    get,
    list,
    values,
    clear
  });
}

export function createExtensionRegistries() {
  return Object.freeze({
    views: createRegistry({ name: "view" }),
    toolbarActions: createRegistry({ name: "toolbar action" }),
    contextActions: createRegistry({ name: "context action" }),
    importers: createRegistry({ name: "importer" }),
    exporters: createRegistry({ name: "exporter" }),
    boardTools: createRegistry({ name: "board tool" })
  });
}

export const registryCore = Object.freeze({
  createRegistry,
  createExtensionRegistries
});
export const WORKSPACE_VERSION = 1;

export function makeEmptyTabState() {
  return { tasks: {}, showLanes: true, viewMode: "board" };
}

export function makeDefaultWorkspace(now = () => new Date().toISOString()) {
  return {
    version: WORKSPACE_VERSION,
    activeTabId: null,
    tabs: [],
    updatedAt: now()
  };
}

export function normalizeTab(tab, index = 0, options = {}) {
  const now = options.now || (() => new Date().toISOString());
  const makeId = options.makeId || (() => `tab-${Math.random().toString(36).slice(2, 9)}`);
  const name = typeof tab?.name === "string" ? tab.name : "";
  const isMainName = ["メイン", "Main"].includes(name);
  const isNewName = ["新しいタブ", "New tab"].includes(name);

  return {
    id: typeof tab?.id === "string" && tab.id ? tab.id : makeId(),
    name: isMainName || isNewName ? "" : name,
    systemNameKey: tab?.systemNameKey || (index === 0 && isMainName
      ? "workspace.defaultTabName"
      : isNewName
        ? "workspace.newTabName"
        : null),
    state: tab?.state && typeof tab.state === "object" ? tab.state : makeEmptyTabState(),
    updatedAt: typeof tab?.updatedAt === "string" && tab.updatedAt ? tab.updatedAt : now()
  };
}

export function normalizeWorkspace(candidate, options = {}) {
  const now = options.now || (() => new Date().toISOString());
  if (!candidate || !Array.isArray(candidate.tabs)) return null;

  // Match the current tab-manager acceptance rule during migration.
  // Older saved workspaces may contain recoverable task containers that are
  // truthy without satisfying a stricter object-type check.
  const tabs = candidate.tabs
    .filter(tab => tab && tab.state && tab.state.tasks)
    .map((tab, index) => normalizeTab(tab, index, options));

  return {
    version: WORKSPACE_VERSION,
    activeTabId: tabs.some(tab => tab.id === candidate.activeTabId)
      ? candidate.activeTabId
      : (tabs[0]?.id || null),
    tabs,
    updatedAt: typeof candidate.updatedAt === "string" && candidate.updatedAt
      ? candidate.updatedAt
      : now()
  };
}

export const workspaceModel = Object.freeze({
  version: WORKSPACE_VERSION,
  makeEmptyTabState,
  makeDefaultWorkspace,
  normalizeTab,
  normalizeWorkspace
});

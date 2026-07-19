(() => {
  if (window.CherryWorkspaceRuntime) return;

  window.CherryLegacyCore?.withCore(core => {
    const legacy = window.cherryWorkspace;
    const workData = window.CherryWorkDataStorage;
    const workspaceStore = core.runtime?.workspaceStore;
    const events = core.runtime?.events;
    const workspaceModel = core.workspace;
    if (!legacy || !workspaceStore || !workspaceModel) return;

    function normalize(candidate) {
      return workspaceModel.normalizeWorkspaceOrDefault(candidate);
    }


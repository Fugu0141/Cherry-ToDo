(() => {
  const core = window.CherryCore;
  const actions = core?.extensions?.toolbarActions;
  if (!actions || actions.has("tutorial.open")) return;

  actions.register("tutorial.open", Object.freeze({
    id: "tutorial.open",
    run: () => window.cherryTutorial?.open?.()
  }));
})();
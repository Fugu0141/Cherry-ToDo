(() => {
  const extensions = window.CherryCore?.extensions;
  const workspace = window.cherryWorkspace;
  if (!extensions || !workspace) return;

  if (!extensions.importers.has("workspace.cherry")) {
    extensions.importers.register("workspace.cherry", {
      id: "workspace.cherry",
      run: (...args) => workspace.importWorkspace?.(...args)
    });
  }

  if (!extensions.exporters.has("workspace.cherry")) {
    extensions.exporters.register("workspace.cherry", {
      id: "workspace.cherry",
      run: (...args) => workspace.exportWorkspace?.(...args)
    });
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest("#startPage [data-action='export']");
    if (!trigger) return;

    const exporter = extensions.exporters.get("workspace.cherry");
    if (!exporter?.run) return;

    event.preventDefault();
    event.stopPropagation();
    Promise.resolve(exporter.run()).catch(error => {
      console.error("Workspace export failed through the exporter registry.", error);
    });
  }, true);

  document.addEventListener("change", event => {
    const input = event.target;
    if (input?.type !== "file" || !String(input.accept).includes(".cherry")) return;

    const file = input.files?.[0];
    const importer = extensions.importers.get("workspace.cherry");
    if (!file || !importer?.run) return;

    event.stopPropagation();
    input.value = "";
    Promise.resolve(importer.run(file)).catch(error => {
      console.error("Workspace import failed through the importer registry.", error);
    });
  }, true);
})();
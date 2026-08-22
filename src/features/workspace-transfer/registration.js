(() => {
  const extensions = window.CherryCore?.extensions;
  const workspace = window.cherryWorkspace;
  if (!extensions || !workspace) return;

  function hasEncryptedExportCrypto() {
    return typeof window.crypto?.getRandomValues === "function"
      && Boolean(window.crypto?.subtle);
  }

  function encryptedExportUnavailableMessage() {
    const language = window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
    return language === "en"
      ? "Encrypted .cherry export requires HTTPS or localhost. It is unavailable from a plain HTTP LAN address such as http://192.168.x.x."
      : "暗号化された .cherry の保存には HTTPS または localhost が必要です。http://192.168.x.x のようなLAN内の平文HTTPでは利用できません。";
  }

  function reportEncryptedExportUnavailable() {
    const message = encryptedExportUnavailableMessage();
    const status = document.querySelector("#startPage .startPageStatus");
    if (status) status.textContent = message;
    console.warn(message);
  }

  function canonicalScheduleCopy(schedule) {
    if (!schedule || typeof schedule !== "object") return null;
    return {
      type: schedule.type,
      date: schedule.date ?? null,
      time: schedule.time ?? null
    };
  }

  async function importWorkspaceWithCanonicalIcs(file) {
    const nativeImport = workspace.importWorkspace;
    if (typeof nativeImport !== "function") return;

    const isIcs = String(file?.name || "").toLowerCase().endsWith(".ics");
    const parseIcsTodos = window.CherryCore?.ics?.parseIcsTodos;
    if (!isIcs || typeof parseIcsTodos !== "function" || typeof file?.text !== "function") {
      return nativeImport(file);
    }

    const text = await file.text();
    const importedTodos = parseIcsTodos(text);
    const beforeWorkspace = workspace.getWorkspace?.();
    const beforeTabIds = new Set((beforeWorkspace?.tabs || []).map(tab => tab.id));

    await nativeImport(file);

    const afterWorkspace = workspace.getWorkspace?.();
    const importedTabs = (afterWorkspace?.tabs || []).filter(tab => !beforeTabIds.has(tab.id));
    if (importedTabs.length !== 1) return;

    const importedTab = importedTabs[0];
    const importedTasks = Object.values(importedTab.state?.tasks || {});
    if (importedTasks.length !== importedTodos.length) {
      console.warn("Skipped ICS schedule reconciliation because imported task counts did not match.");
      return;
    }

    // Migration bridge: the legacy tab-manager importer currently assigns today's
    // date to VTODOs without DUE. Reapply the Core parser's canonical schedules
    // after that import until the legacy parser is removed from tab-manager.js.
    workspace.updateTabState?.(importedTab.id, tabState => {
      const tasks = Object.values(tabState?.tasks || {});
      tasks.forEach((task, index) => {
        const schedule = canonicalScheduleCopy(importedTodos[index]?.schedule);
        if (!schedule) return;
        task.schedule = schedule;
        task.targetAt = schedule.type === "none" ? null : schedule.date;
      });
    });
  }

  if (!extensions.importers.has("workspace.cherry")) {
    extensions.importers.register("workspace.cherry", {
      id: "workspace.cherry",
      run: (...args) => importWorkspaceWithCanonicalIcs(...args)
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

    if (!hasEncryptedExportCrypto()) {
      event.preventDefault();
      event.stopPropagation();
      reportEncryptedExportUnavailable();
      return;
    }

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
(() => {
  const extensions = window.CherryCore?.extensions;
  const workspace = window.cherryWorkspace;
  if (!extensions || !workspace) return;

  const emptyIcsShell = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "END:VCALENDAR"
  ].join("\r\n");

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

  function replaceTabState(target, source) {
    if (!target || !source || typeof source !== "object") return;
    Object.keys(target).forEach(key => delete target[key]);
    Object.assign(target, source);
  }

  function makeLegacyIcsShellFile(file) {
    return {
      name: String(file?.name || "import.ics"),
      type: file?.type || "text/calendar",
      async text() {
        return emptyIcsShell;
      }
    };
  }

  async function importWorkspaceWithCoreIcs(file) {
    const nativeImport = workspace.importWorkspace;
    if (typeof nativeImport !== "function") return;

    const isIcs = String(file?.name || "").toLowerCase().endsWith(".ics");
    const makeTabFromIcs = window.CherryCore?.ics?.makeTabFromIcs;
    if (!isIcs || typeof makeTabFromIcs !== "function" || typeof file?.text !== "function") {
      return nativeImport(file);
    }

    const text = await file.text();
    const coreTab = makeTabFromIcs(text, file.name);
    if (!coreTab?.state || typeof coreTab.state !== "object") {
      return nativeImport(file);
    }

    const beforeWorkspace = workspace.getWorkspace?.();
    const beforeTabIds = new Set((beforeWorkspace?.tabs || []).map(tab => tab.id));

    // Keep the legacy importer only for its import-mode/workspace shell. The real
    // VTODO payload is parsed exclusively by Core, so the local parser no longer
    // constructs temporary legacy tasks that are immediately discarded.
    await nativeImport(makeLegacyIcsShellFile(file));

    const afterWorkspace = workspace.getWorkspace?.();
    const importedTabs = (afterWorkspace?.tabs || []).filter(tab => !beforeTabIds.has(tab.id));
    if (importedTabs.length !== 1) {
      console.warn("Skipped Core ICS state routing because the imported tab could not be identified uniquely.");
      return;
    }

    workspace.updateTabState?.(importedTabs[0].id, tabState => {
      replaceTabState(tabState, coreTab.state);
    });
  }

  if (!extensions.importers.has("workspace.cherry")) {
    extensions.importers.register("workspace.cherry", {
      id: "workspace.cherry",
      run: (...args) => importWorkspaceWithCoreIcs(...args)
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
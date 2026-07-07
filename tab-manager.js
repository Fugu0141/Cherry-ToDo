(() => {
  if (!window.CherryI18n || typeof state === "undefined") return;

  const workspaceKey = "cherry-workspace-v1";
  const fileFormat = "cherry-workspace-encrypted";
  const fileVersion = 1;
  const kdfIterations = 250000;

  function t(key, values = {}) {
    return window.CherryI18n.t(key, values);
  }

  function copy(key, fallback, values = {}) {
    const language = window.CherryI18n.getLanguage?.() === "en" ? "en" : "ja";
    const dictionary = {
      ja: {
        emptyTitle: "まだタブはありません",
        emptyBody: "新しいタブを作るか、保存ファイルを読み込んで始めましょう。",
        newBoard: "新しい作業を始める",
        deleteTitle: "タブを削除しますか？",
        deleteMessage: "この操作は元に戻せません。削除する前に必要なら保存してください。",
        deleteAction: "削除する",
        renameTitle: "タブ名を変更",
        renameAction: "変更する",
        importTitle: "インポート方法",
        importMessage: "現在のワークスペースを置き換えるか、追加で読み込むかを選んでください。",
        importReplace: "置き換える",
        importMerge: "追加する",
        importAction: "読み込む",
        exportTitle: "保存形式を選択",
        exportCherry: "Cherry workspace (.cherry)",
        exportCherryMeta: "全タブをAES-GCMで暗号化",
        exportIcs: "iCalendar VTODO (.ics)",
        exportIcsMeta: "予定/ToDo互換向け。暗号化なし",
        exportAction: "保存する",
        passTitle: "パスフレーズ",
        passMessage: "暗号化ファイルに使うパスフレーズを入力してください。忘れると復元できません。",
        passMismatch: "パスフレーズが一致しません。",
        passRequired: "パスフレーズが必要です。",
        importFailed: "読み込みに失敗しました。形式またはパスフレーズを確認してください。",
        exported: "保存ファイルを作成しました。",
        imported: "インポートしました。",
        cancel: "キャンセル",
        confirm: "決定",
        closeDisabled: "タブがない間はスタートページを閉じられません。"
      },
      en: {
        emptyTitle: "No tabs yet",
        emptyBody: "Create a new tab or import a saved file to begin.",
        newBoard: "Start new work",
        deleteTitle: "Delete this tab?",
        deleteMessage: "This cannot be undone. Save first if you need a backup.",
        deleteAction: "Delete",
        renameTitle: "Rename tab",
        renameAction: "Rename",
        importTitle: "Import mode",
        importMessage: "Choose whether to replace this workspace or add the file to it.",
        importReplace: "Replace",
        importMerge: "Add",
        importAction: "Import",
        exportTitle: "Choose export format",
        exportCherry: "Cherry workspace (.cherry)",
        exportCherryMeta: "All tabs, encrypted with AES-GCM",
        exportIcs: "iCalendar VTODO (.ics)",
        exportIcsMeta: "Calendar/todo-compatible. Not encrypted",
        exportAction: "Export",
        passTitle: "Passphrase",
        passMessage: "Enter a passphrase for the encrypted file. It cannot be recovered if forgotten.",
        passMismatch: "Passphrases do not match.",
        passRequired: "A passphrase is required.",
        importFailed: "Import failed. Check the format or passphrase.",
        exported: "Export file created.",
        imported: "Imported.",
        cancel: "Cancel",
        confirm: "OK",
        closeDisabled: "The Start page stays open until you create or import a tab."
      }
    };
    const template = dictionary[language][key] || fallback || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function now() {
    return new Date().toISOString();
  }

  function makeId() {
    return `tab-${Math.random().toString(36).slice(2, 9)}`;
  }

  function makeEmptyState() {
    return { tasks: {}, showLanes: true, viewMode: "board" };
  }

  function normalizeTab(tab, index) {
    const name = tab?.name || "";
    const isMainName = ["メイン", "Main"].includes(name);
    const isNewName = ["新しいタブ", "New tab"].includes(name);

    return {
      id: tab?.id || makeId(),
      name: isMainName || isNewName ? "" : (name || ""),
      systemNameKey: tab?.systemNameKey || (index === 0 && isMainName ? "workspace.defaultTabName" : isNewName ? "workspace.newTabName" : null),
      state: tab?.state || makeEmptyState(),
      updatedAt: tab?.updatedAt || now()
    };
  }

  function normalizeWorkspace(candidate) {
    if (!candidate || !Array.isArray(candidate.tabs)) return null;
    const tabs = candidate.tabs
      .filter(tab => tab && tab.state && tab.state.tasks)
      .map(normalizeTab);

    return {
      version: 1,
      activeTabId: tabs.some(tab => tab.id === candidate.activeTabId) ? candidate.activeTabId : (tabs[0]?.id || null),
      tabs,
      updatedAt: candidate.updatedAt || now()
    };
  }

  function makeDefaultWorkspace() {
    return {
      version: 1,
      activeTabId: null,
      tabs: [],
      updatedAt: now()
    };
  }

  function loadWorkspace() {
    try {
      const raw = localStorage.getItem(workspaceKey);
      const parsed = raw ? normalizeWorkspace(JSON.parse(raw)) : null;
      return parsed || makeDefaultWorkspace();
    } catch (_) {
      return makeDefaultWorkspace();
    }
  }

  let workspace = loadWorkspace();
  let saveTimer = null;
  let startPage = null;
  let fileInput = null;

  function activeTab() {
    return workspace.tabs.find(tab => tab.id === workspace.activeTabId) || null;
  }

  function tabDisplayName(tab) {
    if (!tab) return t("workspace.untitled");
    if (tab.systemNameKey) return t(tab.systemNameKey);
    return tab.name || t("workspace.untitled");
  }

  function syncActiveState() {
    const tab = activeTab();
    if (!tab) return;
    tab.state = clone(state);
    tab.updatedAt = now();
    workspace.updatedAt = now();
  }

  function notifyWorkspaceChanged() {
    window.dispatchEvent(new CustomEvent("cherry-workspace-updated", { detail: clone(workspace) }));
  }

  function commitActiveState() {
    syncActiveState();
    try {
      localStorage.setItem(workspaceKey, JSON.stringify(workspace));
      if (activeTab()) localStorage.setItem(window.cherryStorage?.currentStorageKey || "quest-sticky-todo-v10", JSON.stringify(state));
    } catch (_) {
      // Local persistence may be unavailable in strict browser modes.
    }
    renderTabRail();
    notifyWorkspaceChanged();
  }

  function saveWorkspaceNow() {
    commitActiveState();
  }

  function scheduleWorkspaceSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWorkspaceNow, 160);
  }

  function persistWorkspaceOnly() {
    try {
      localStorage.setItem(workspaceKey, JSON.stringify(workspace));
    } catch (_) {
      // Non-critical for the current session.
    }
    notifyWorkspaceChanged();
  }

  function closeStartPage() {
    if (!workspace.tabs.length) {
      setStartStatus(copy("closeDisabled"));
      return;
    }
    document.querySelector(".stage")?.classList.remove("startPageMode");
    startPage?.classList.add("hidden");
  }

  function openTab(tabId) {
    const next = workspace.tabs.find(tab => tab.id === tabId);
    if (!next) return;
    commitActiveState();
    workspace.activeTabId = next.id;
    state = clone(next.state || makeEmptyState());
    selectedId = null;
    undoStack = [];
    persistWorkspaceOnly();
    closeStartPage();
    branchLayout();
    requestRender();
    renderTabRail();
    renderStartPage();
  }

  function createTab() {
    commitActiveState();
    const tab = {
      id: makeId(),
      name: "",
      systemNameKey: "workspace.newTabName",
      state: makeEmptyState(),
      updatedAt: now()
    };
    workspace.tabs.push(tab);
    workspace.activeTabId = tab.id;
    state = clone(tab.state);
    selectedId = null;
    undoStack = [];
    persistWorkspaceOnly();
    closeStartPage();
    branchLayout();
    requestRender();
    renderTabRail();
    renderStartPage();
  }

  async function renameTab(tabId) {
    const tab = workspace.tabs.find(item => item.id === tabId);
    if (!tab) return;
    const name = await window.cherryDialog.prompt({
      title: copy("renameTitle"),
      message: "",
      value: tabDisplayName(tab),
      confirmText: copy("renameAction"),
      cancelText: copy("cancel")
    });
    if (!name?.trim()) return;
    tab.name = name.trim();
    tab.systemNameKey = null;
    tab.updatedAt = now();
    persistWorkspaceOnly();
    renderTabRail();
    renderStartPage();
  }

  function duplicateTab(tabId) {
    const source = workspace.tabs.find(item => item.id === tabId);
    if (!source) return;
    commitActiveState();
    const copyTab = {
      id: makeId(),
      name: `${tabDisplayName(source)} copy`,
      systemNameKey: null,
      state: clone(source.state || makeEmptyState()),
      updatedAt: now()
    };
    workspace.tabs.push(copyTab);
    workspace.activeTabId = copyTab.id;
    state = clone(copyTab.state);
    selectedId = null;
    undoStack = [];
    persistWorkspaceOnly();
    closeStartPage();
    branchLayout();
    requestRender();
    renderTabRail();
    renderStartPage();
  }

  async function deleteTab(tabId) {
    const tab = workspace.tabs.find(item => item.id === tabId);
    if (!tab) return;
    const ok = await window.cherryDialog.confirm({
      kicker: "Cherry",
      title: copy("deleteTitle"),
      message: `${tabDisplayName(tab)}\n${copy("deleteMessage")}`,
      confirmText: copy("deleteAction"),
      cancelText: copy("cancel"),
      danger: true
    });
    if (!ok) return;

    workspace.tabs = workspace.tabs.filter(item => item.id !== tabId);
    workspace.activeTabId = workspace.tabs[0]?.id || null;
    const next = activeTab();
    state = clone(next?.state || makeEmptyState());
    selectedId = null;
    undoStack = [];
    persistWorkspaceOnly();
    if (!next) openStartPage();
    branchLayout();
    requestRender();
    renderTabRail();
    renderStartPage();
  }

  function ensureTabRail() {
    if (document.getElementById("workspaceBar")) return;
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const bar = document.createElement("div");
    bar.id = "workspaceBar";
    bar.className = "workspaceBar";
    bar.innerHTML = `
      <button type="button" class="workspaceStartMini"></button>
      <div class="workspaceTabList" role="tablist"></div>
      <button type="button" class="workspaceAddTab" aria-label="+"></button>
    `;
    topbar.insertAdjacentElement("afterend", bar);

    bar.querySelector(".workspaceStartMini").addEventListener("click", openStartPage);
    bar.querySelector(".workspaceAddTab").addEventListener("click", createTab);
    bar.querySelector(".workspaceTabList").addEventListener("click", event => {
      const closeButton = event.target.closest("[data-tab-delete]");
      if (closeButton) {
        event.stopPropagation();
        deleteTab(closeButton.dataset.tabDelete);
        return;
      }

      const tabButton = event.target.closest("[data-tab-open]");
      if (tabButton) openTab(tabButton.dataset.tabOpen);
    });
  }

  function renderTabRail() {
    ensureTabRail();
    const bar = document.getElementById("workspaceBar");
    if (!bar) return;

    bar.querySelector(".workspaceStartMini").textContent = t("workspace.start");
    bar.querySelector(".workspaceAddTab").textContent = "+";
    const list = bar.querySelector(".workspaceTabList");
    list.innerHTML = "";

    workspace.tabs.forEach(tab => {
      const item = document.createElement("div");
      item.className = `workspaceTabItem ${tab.id === workspace.activeTabId ? "active" : ""}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "workspaceTab";
      button.dataset.tabOpen = tab.id;
      button.textContent = tabDisplayName(tab);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", tab.id === workspace.activeTabId ? "true" : "false");

      item.appendChild(button);

      const close = document.createElement("button");
      close.type = "button";
      close.className = "workspaceTabClose";
      close.dataset.tabDelete = tab.id;
      close.textContent = "×";
      close.title = t("workspace.delete");
      item.appendChild(close);

      list.appendChild(item);
    });
  }

  function ensureStartPage() {
    if (startPage) return startPage;

    const stage = document.querySelector(".stage");
    startPage = document.createElement("section");
    startPage.id = "startPage";
    startPage.className = "startPageView hidden";
    startPage.setAttribute("aria-labelledby", "startPageTitle");
    startPage.innerHTML = `
      <div class="startPagePanel">
        <div class="startPageHeader">
          <div>
            <p class="startPageKicker">Flow first, date second.</p>
            <h2 id="startPageTitle"></h2>
            <p></p>
          </div>
          <button type="button" class="startPageClose">×</button>
        </div>
        <div class="startPageBody">
          <div class="startPageTabs">
            <p class="startPageSectionTitle"></p>
            <div class="startPageEmpty hidden"></div>
            <div class="startPageTabList"></div>
          </div>
          <div class="startPageActions">
            <button type="button" class="startPagePrimary" data-action="new-tab"></button>
            <button type="button" class="startPageSecondary" data-action="import"></button>
            <button type="button" class="startPageSecondary" data-action="export"></button>
            <p class="startPageNote startPageFileNote"></p>
            <p class="startPageNote startPageSecurityNote"></p>
          </div>
        </div>
        <div class="startPageFooter">
          <span class="startPageStatus"></span>
        </div>
      </div>
    `;
    stage?.appendChild(startPage);

    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".cherry,.ics,text/calendar,application/json";
    fileInput.hidden = true;
    document.body.appendChild(fileInput);

    startPage.addEventListener("click", event => {
      if (event.target.closest(".startPageClose")) closeStartPage();

      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "new-tab") createTab();
      if (action === "import") fileInput.click();
      if (action === "export") exportWorkspace();

      const cardAction = event.target.closest("[data-tab-action]");
      if (!cardAction) return;
      const tabId = cardAction.closest("[data-tab-id]")?.dataset.tabId;
      if (!tabId) return;
      const type = cardAction.dataset.tabAction;
      if (type === "open") openTab(tabId);
      if (type === "rename") renameTab(tabId);
      if (type === "duplicate") duplicateTab(tabId);
      if (type === "delete") deleteTab(tabId);
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (file) importWorkspace(file);
    });

    return startPage;
  }

  function setStartStatus(message) {
    const status = startPage?.querySelector(".startPageStatus");
    if (status) status.textContent = message || t("workspace.localNote");
  }

  function renderStartPage() {
    const page = ensureStartPage();
    page.querySelector("#startPageTitle").textContent = t("workspace.title");
    page.querySelector(".startPageHeader p:not(.startPageKicker)").textContent = t("workspace.subtitle");
    page.querySelector(".startPageClose").setAttribute("aria-label", t("workspace.close"));
    page.querySelector(".startPageClose").classList.toggle("hidden", !workspace.tabs.length);
    page.querySelector(".startPageSectionTitle").textContent = t("workspace.tabs");
    page.querySelector("[data-action='new-tab']").textContent = copy("newBoard");
    page.querySelector("[data-action='import']").textContent = t("workspace.import");
    page.querySelector("[data-action='export']").textContent = t("workspace.export");
    page.querySelector("[data-action='export']").disabled = !workspace.tabs.length;
    page.querySelector(".startPageFileNote").textContent = "Cherry形式は暗号化、iCalendar形式はVTODO互換の平文として保存できます。";
    page.querySelector(".startPageSecurityNote").textContent = t("workspace.securityNote");
    setStartStatus(t("workspace.localNote"));

    const list = page.querySelector(".startPageTabList");
    const empty = page.querySelector(".startPageEmpty");
    list.innerHTML = "";
    empty.classList.toggle("hidden", workspace.tabs.length > 0);
    empty.innerHTML = `<strong>${copy("emptyTitle")}</strong><span>${copy("emptyBody")}</span>`;

    workspace.tabs.forEach(tab => {
      const taskCount = Object.keys(tab.state?.tasks || {}).length;
      const card = document.createElement("div");
      card.className = `startPageTabCard ${tab.id === workspace.activeTabId ? "active" : ""}`;
      card.dataset.tabId = tab.id;
      card.innerHTML = `
        <div>
          <div class="startPageTabName"></div>
          <div class="startPageTabMeta"></div>
        </div>
        <div class="startPageTabActions">
          <button type="button" class="startPageSecondary" data-tab-action="open"></button>
          <button type="button" class="startPageSecondary" data-tab-action="rename"></button>
          <button type="button" class="startPageSecondary" data-tab-action="duplicate"></button>
          <button type="button" class="startPageDanger" data-tab-action="delete"></button>
        </div>
      `;
      card.querySelector(".startPageTabName").textContent = tabDisplayName(tab);
      card.querySelector(".startPageTabMeta").textContent = `${taskCount} tasks · ${tab.id === workspace.activeTabId ? t("workspace.active") : t("workspace.localNote")}`;
      card.querySelector("[data-tab-action='open']").textContent = t("workspace.open");
      card.querySelector("[data-tab-action='rename']").textContent = t("workspace.rename");
      card.querySelector("[data-tab-action='duplicate']").textContent = t("workspace.duplicate");
      card.querySelector("[data-tab-action='delete']").textContent = t("workspace.delete");
      list.appendChild(card);
    });
  }

  function openStartPage() {
    renderStartPage();
    state.viewMode = "board";
    document.querySelector(".stage")?.classList.add("startPageMode");
    ensureStartPage().classList.remove("hidden");
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function deriveKey(passphrase, salt) {
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: kdfIterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptPayload(payload, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
    return {
      format: fileFormat,
      version: fileVersion,
      kdf: { name: "PBKDF2", hash: "SHA-256", iterations: kdfIterations, salt: bytesToBase64(salt) },
      cipher: { name: "AES-GCM", iv: bytesToBase64(iv) },
      data: bytesToBase64(ciphertext)
    };
  }

  async function decryptPayload(fileData, passphrase) {
    if (!fileData || fileData.format !== fileFormat || fileData.version !== fileVersion) throw new Error("Unsupported Cherry file");
    const salt = base64ToBytes(fileData.kdf?.salt || "");
    const iv = base64ToBytes(fileData.cipher?.iv || "");
    const ciphertext = base64ToBytes(fileData.data || "");
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  function downloadText(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function askExportFormat() {
    const result = await window.cherryDialog.open({
      title: copy("exportTitle"),
      message: "",
      choices: [
        { value: "cherry", label: copy("exportCherry"), meta: copy("exportCherryMeta") },
        { value: "ics", label: copy("exportIcs"), meta: copy("exportIcsMeta") }
      ],
      initialChoice: "cherry",
      confirmText: copy("exportAction"),
      cancelText: copy("cancel")
    });
    return result?.choice || null;
  }

  async function askPassphraseForExport() {
    const result = await window.cherryDialog.passphrase({ title: copy("passTitle"), message: copy("passMessage"), confirm: true });
    if (result?.error === "mismatch") {
      await window.cherryDialog.confirm({ title: copy("passMismatch"), message: "", confirmText: copy("confirm"), cancelText: copy("cancel") });
      return null;
    }
    if (!result) return null;
    return result;
  }

  async function exportWorkspace() {
    try {
      commitActiveState();
      if (!workspace.tabs.length) return;
      const format = await askExportFormat();
      if (!format) return;
      if (format === "ics") {
        downloadText(`cherry-tasks-${new Date().toISOString().slice(0, 10)}.ics`, makeIcs(workspace), "text/calendar");
        setStartStatus(copy("exported"));
        return;
      }

      const passphrase = await askPassphraseForExport();
      if (!passphrase) return;
      const payload = { format: "cherry-workspace", version: 1, exportedAt: now(), workspace };
      const encrypted = await encryptPayload(payload, passphrase);
      downloadText(`cherry-workspace-${new Date().toISOString().slice(0, 10)}.cherry`, JSON.stringify(encrypted, null, 2), "application/json");
      setStartStatus(copy("exported"));
    } catch (error) {
      console.error(error);
      setStartStatus(t("workspace.exportFailed"));
    }
  }

  async function askImportMode() {
    const result = await window.cherryDialog.open({
      title: copy("importTitle"),
      message: copy("importMessage"),
      choices: [
        { value: "merge", label: copy("importMerge") },
        { value: "replace", label: copy("importReplace") }
      ],
      initialChoice: "merge",
      confirmText: copy("importAction"),
      cancelText: copy("cancel")
    });
    return result?.choice || null;
  }

  async function importWorkspace(file) {
    try {
      const mode = await askImportMode();
      if (!mode) return;
      const text = await file.text();
      let incoming = null;

      if (file.name.toLowerCase().endsWith(".ics") || text.includes("BEGIN:VCALENDAR")) {
        incoming = { version: 1, activeTabId: null, tabs: [makeTabFromIcs(text, file.name)], updatedAt: now() };
      } else {
        const passphrase = await window.cherryDialog.passphrase({ title: copy("passTitle"), message: t("workspace.passphrasePrompt"), confirm: false });
        if (!passphrase) return;
        const payload = await decryptPayload(JSON.parse(text), passphrase);
        incoming = normalizeWorkspace(payload.workspace);
      }

      if (!incoming) throw new Error("Invalid workspace");
      if (mode === "replace") {
        workspace = normalizeWorkspace(incoming) || makeDefaultWorkspace();
      } else {
        const current = normalizeWorkspace(workspace) || makeDefaultWorkspace();
        const importedTabs = (incoming.tabs || []).map(tab => ({ ...normalizeTab(tab, 0), id: makeId(), name: tabDisplayName(tab) }));
        workspace = { ...current, tabs: [...current.tabs, ...importedTabs], updatedAt: now() };
      }

      workspace.activeTabId = workspace.tabs[0]?.id || null;
      const tab = activeTab();
      state = clone(tab?.state || makeEmptyState());
      selectedId = null;
      undoStack = [];
      persistWorkspaceOnly();
      openStartPage();
      branchLayout();
      requestRender();
      renderTabRail();
      renderStartPage();
      setStartStatus(copy("imported"));
    } catch (error) {
      console.error(error);
      setStartStatus(copy("importFailed"));
    }
  }

  function escapeIcs(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  function makeIcs(sourceWorkspace) {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cherry//Cherry v0.1//EN"];
    sourceWorkspace.tabs.forEach(tab => {
      Object.values(tab.state?.tasks || {}).forEach(task => {
        const date = String(task.targetAt || "").slice(0, 10).replace(/-/g, "");
        lines.push("BEGIN:VTODO");
        lines.push(`UID:${task.id}@cherry`);
        lines.push(`SUMMARY:${escapeIcs(task.title)}`);
        lines.push(`CATEGORIES:${escapeIcs(tabDisplayName(tab))}`);
        if (date) lines.push(`DUE;VALUE=DATE:${date}`);
        lines.push(`STATUS:${task.status === "done" ? "COMPLETED" : "NEEDS-ACTION"}`);
        lines.push("END:VTODO");
      });
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function makeTabFromIcs(text, filename) {
    const tasks = {};
    const blocks = text.split(/BEGIN:VTODO/i).slice(1);
    blocks.forEach((block, index) => {
      const content = block.split(/END:VTODO/i)[0] || "";
      const summary = (content.match(/^SUMMARY:(.*)$/mi)?.[1] || `Task ${index + 1}`).replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
      const due = content.match(/^DUE(?:;VALUE=DATE)?:(\d{8})/mi)?.[1];
      const id = makeId();
      tasks[id] = {
        id,
        title: summary,
        parentId: null,
        x: 0,
        y: 0,
        targetAt: due ? `${due.slice(0, 4)}-${due.slice(4, 6)}-${due.slice(6, 8)}` : new Date().toISOString().slice(0, 10),
        status: /STATUS:COMPLETED/i.test(content) ? "done" : "todo",
        branchMode: null
      };
    });
    return { id: makeId(), name: filename.replace(/\.[^.]+$/, "") || "iCalendar", systemNameKey: null, state: { tasks, showLanes: true, viewMode: "board" }, updatedAt: now() };
  }

  function updateTabState(tabId, updater) {
    const tab = workspace.tabs.find(item => item.id === tabId);
    if (!tab) return;
    updater(tab.state);
    tab.updatedAt = now();
    if (tab.id === workspace.activeTabId) state = clone(tab.state);
    persistWorkspaceOnly();
    branchLayout();
    requestRender();
    renderStartPage();
  }

  saveNow = saveWorkspaceNow;
  scheduleSave = scheduleWorkspaceSave;
  window.addEventListener("beforeunload", saveWorkspaceNow);

  const selected = activeTab();
  state = clone(selected?.state || makeEmptyState());
  branchLayout();
  requestRender();

  renderTabRail();
  ensureStartPage();

  document.getElementById("startPageBtn")?.addEventListener("click", openStartPage);
  window.CherryI18n.onChange(() => {
    renderTabRail();
    renderStartPage();
  });

  window.cherryWorkspace = {
    openStartPage,
    closeStartPage,
    openTab,
    createTab,
    renameTab,
    duplicateTab,
    deleteTab,
    exportWorkspace,
    importWorkspace,
    updateTabState,
    getWorkspace: () => {
      syncActiveState();
      return clone(workspace);
    },
    getActiveTabId: () => workspace.activeTabId,
    getTabDisplayName: tab => tabDisplayName(tab)
  };

  notifyWorkspaceChanged();
  openStartPage();
})();

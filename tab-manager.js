(() => {
  if (!window.CherryI18n || typeof state === "undefined") return;

  const workspaceKey = "cherry-workspace-v1";
  const fileFormat = "cherry-workspace-encrypted";
  const fileVersion = 1;
  const kdfIterations = 250000;

  function t(key, values = {}) {
    return window.CherryI18n.t(key, values);
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

  function normalizeTab(tab, index) {
    const name = tab?.name || "";
    const isMainName = ["メイン", "Main"].includes(name);
    const isNewName = ["新しいタブ", "New tab"].includes(name);

    return {
      id: tab?.id || makeId(),
      name: isMainName || isNewName ? "" : (name || ""),
      systemNameKey: tab?.systemNameKey || (index === 0 && isMainName ? "workspace.defaultTabName" : isNewName ? "workspace.newTabName" : null),
      state: tab?.state,
      updatedAt: tab?.updatedAt || now()
    };
  }

  function normalizeWorkspace(candidate) {
    if (!candidate || !Array.isArray(candidate.tabs) || !candidate.tabs.length) return null;
    const tabs = candidate.tabs
      .filter(tab => tab && tab.state && tab.state.tasks)
      .map(normalizeTab);

    if (!tabs.length) return null;
    if (!tabs[0].name && !tabs[0].systemNameKey) tabs[0].systemNameKey = "workspace.defaultTabName";

    return {
      version: 1,
      activeTabId: tabs.some(tab => tab.id === candidate.activeTabId) ? candidate.activeTabId : tabs[0].id,
      tabs,
      updatedAt: candidate.updatedAt || now()
    };
  }

  function makeDefaultWorkspace() {
    return {
      version: 1,
      activeTabId: "main",
      tabs: [
        {
          id: "main",
          name: "",
          systemNameKey: "workspace.defaultTabName",
          state: clone(state),
          updatedAt: now()
        }
      ],
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
    return workspace.tabs.find(tab => tab.id === workspace.activeTabId) || workspace.tabs[0];
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
      localStorage.setItem(window.cherryStorage?.currentStorageKey || "quest-sticky-todo-v10", JSON.stringify(state));
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
    document.querySelector(".stage")?.classList.remove("startPageMode");
    startPage?.classList.add("hidden");
  }

  function openTab(tabId) {
    const next = workspace.tabs.find(tab => tab.id === tabId);
    if (!next) return;
    commitActiveState();
    workspace.activeTabId = next.id;
    state = clone(next.state);
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
      state: makeInitialState(),
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

  function renameTab(tabId) {
    const tab = workspace.tabs.find(item => item.id === tabId);
    if (!tab) return;
    const name = prompt(t("workspace.renamePrompt"), tabDisplayName(tab))?.trim();
    if (!name) return;
    tab.name = name;
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
    const copy = {
      id: makeId(),
      name: `${tabDisplayName(source)} copy`,
      systemNameKey: null,
      state: clone(source.state),
      updatedAt: now()
    };
    workspace.tabs.push(copy);
    workspace.activeTabId = copy.id;
    state = clone(copy.state);
    selectedId = null;
    undoStack = [];
    persistWorkspaceOnly();
    closeStartPage();
    branchLayout();
    requestRender();
    renderTabRail();
    renderStartPage();
  }

  function deleteTab(tabId) {
    if (workspace.tabs.length <= 1) return;
    const tab = workspace.tabs.find(item => item.id === tabId);
    if (!tab || !confirm(`${t("workspace.deleteConfirm")}\n${tabDisplayName(tab)}`)) return;

    workspace.tabs = workspace.tabs.filter(item => item.id !== tabId);
    if (workspace.activeTabId === tabId) workspace.activeTabId = workspace.tabs[0].id;
    const next = activeTab();
    state = clone(next.state);
    selectedId = null;
    undoStack = [];
    persistWorkspaceOnly();
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

      if (workspace.tabs.length > 1) {
        const close = document.createElement("button");
        close.type = "button";
        close.className = "workspaceTabClose";
        close.dataset.tabDelete = tab.id;
        close.textContent = "×";
        close.title = t("workspace.delete");
        item.appendChild(close);
      }

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
            <p class="startPageKicker">Cherry workspace</p>
            <h2 id="startPageTitle"></h2>
            <p></p>
          </div>
          <button type="button" class="startPageClose">×</button>
        </div>
        <div class="startPageBody">
          <div class="startPageTabs">
            <p class="startPageSectionTitle"></p>
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
    fileInput.accept = ".cherry,application/json";
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

  function renderStartPage() {
    const page = ensureStartPage();
    page.querySelector("#startPageTitle").textContent = t("workspace.title");
    page.querySelector(".startPageHeader p:not(.startPageKicker)").textContent = t("workspace.subtitle");
    page.querySelector(".startPageClose").setAttribute("aria-label", t("workspace.close"));
    page.querySelector(".startPageSectionTitle").textContent = t("workspace.tabs");
    page.querySelector("[data-action='new-tab']").textContent = t("workspace.newTab");
    page.querySelector("[data-action='import']").textContent = t("workspace.import");
    page.querySelector("[data-action='export']").textContent = t("workspace.export");
    page.querySelector(".startPageFileNote").textContent = t("workspace.fileNote");
    page.querySelector(".startPageSecurityNote").textContent = t("workspace.securityNote");
    page.querySelector(".startPageStatus").textContent = t("workspace.localNote");

    const list = page.querySelector(".startPageTabList");
    list.innerHTML = "";

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
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

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
      kdf: {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: kdfIterations,
        salt: bytesToBase64(salt)
      },
      cipher: {
        name: "AES-GCM",
        iv: bytesToBase64(iv)
      },
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

  function askPassphraseForExport() {
    const first = prompt(t("workspace.passphrasePrompt"));
    if (!first) {
      alert(t("workspace.passphraseRequired"));
      return null;
    }
    const second = prompt(t("workspace.passphraseAgainPrompt"));
    if (first !== second) {
      alert(t("workspace.passphraseMismatch"));
      return null;
    }
    return first;
  }

  async function exportWorkspace() {
    try {
      commitActiveState();
      const passphrase = askPassphraseForExport();
      if (!passphrase) return;
      const payload = {
        format: "cherry-workspace",
        version: 1,
        exportedAt: now(),
        workspace
      };
      const encrypted = await encryptPayload(payload, passphrase);
      const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cherry-workspace-${new Date().toISOString().slice(0, 10)}.cherry`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      alert(t("workspace.exported"));
    } catch (error) {
      console.error(error);
      alert(t("workspace.exportFailed"));
    }
  }

  async function importWorkspace(file) {
    try {
      const passphrase = prompt(t("workspace.passphrasePrompt"));
      if (!passphrase) {
        alert(t("workspace.passphraseRequired"));
        return;
      }
      const fileData = JSON.parse(await file.text());
      const payload = await decryptPayload(fileData, passphrase);
      const nextWorkspace = normalizeWorkspace(payload.workspace);
      if (!nextWorkspace) throw new Error("Invalid workspace");
      workspace = nextWorkspace;
      workspace.activeTabId = workspace.tabs[0].id;
      const tab = activeTab();
      state = clone(tab.state);
      selectedId = null;
      undoStack = [];
      persistWorkspaceOnly();
      closeStartPage();
      branchLayout();
      requestRender();
      renderTabRail();
      renderStartPage();
      alert(t("workspace.imported"));
    } catch (error) {
      console.error(error);
      alert(t("workspace.importFailed"));
    }
  }

  saveNow = saveWorkspaceNow;
  scheduleSave = scheduleWorkspaceSave;
  window.addEventListener("beforeunload", saveWorkspaceNow);

  const selected = activeTab();
  if (selected) {
    state = clone(selected.state);
    branchLayout();
    requestRender();
  }

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
    createTab,
    renameTab,
    duplicateTab,
    deleteTab,
    exportWorkspace,
    importWorkspace,
    getWorkspace: () => {
      syncActiveState();
      return clone(workspace);
    },
    getActiveTabId: () => workspace.activeTabId,
    getTabDisplayName: tab => tabDisplayName(tab)
  };

  notifyWorkspaceChanged();
})();

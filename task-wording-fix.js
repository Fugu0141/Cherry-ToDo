(() => {
  const overrideMap = {
    ja: {
      "toolbar.addRoot": "+ タスクを追加",
      "modal.createRoot": "新しいタスクを作成",
      "list.lead": "最初のタスクを見出しとして、未定・今日まで・今後の実行タスクを確認できます。",
      "list.rootDirect": "この流れの先頭",
      "welcome.root": "最初のタスク",
      "welcome.hint": "まずはタスクを作成して、必要な作業を枝のように伸ばしてみてください。",
      "tutorial.steps": [
        { title: "1. まずはタスクを作る", body: "最初のタスクは、プロジェクトや大きな目的の出発点です。画面上部の「+ タスクを追加」から作れます。" },
        { title: "2. 次のタスクを枝のように伸ばす", body: "タスク右下の「＋」から次の作業を作ります。横に伸ばすと同じ流れ、少しずらすと分岐として扱えます。" },
        { title: "3. 日付は流れを補助するもの", body: "Cherryは日付だけでなく、親子関係と流れを中心に整理します。タスクを日付レーンに置くと予定日を変えられます。" },
        { title: "4. 実行リストで今日やることを見る", body: "リスト表示では、未定・今日まで・今後のタスクを流れごとに確認できます。流れを作ってから実行に移るための場所です。" },
        { title: "5. 保存と共有", body: "スタートページから、暗号化されたCherryファイルやiCalendar形式で保存できます。" }
      ]
    },
    en: {
      "toolbar.addRoot": "+ Add task",
      "modal.createRoot": "Create new task",
      "list.lead": "Use the first task as a heading and review unscheduled, due, and upcoming action tasks.",
      "list.rootDirect": "Start of this flow",
      "welcome.root": "First task",
      "welcome.hint": "Start by creating a task, then extend the work like branches.",
      "tutorial.steps": [
        { title: "1. Create a task first", body: "The first task is the starting point for a project or larger goal. Create one from the + Add task button." },
        { title: "2. Extend next tasks like branches", body: "Use the + handle on a task to create the next piece of work. Continue straight or offset it to branch." },
        { title: "3. Dates support the flow", body: "Cherry is not only a date list. Drop tasks onto date lanes to change their target date." },
        { title: "4. Use the list when it is time to execute", body: "List view groups tasks by flow so you can build the flow first, then decide what to do now." },
        { title: "5. Save and share", body: "The Start page can export encrypted Cherry files or iCalendar files." }
      ]
    }
  };

  const textReplacements = {
    ja: [
      ["＋ ルート", "+ タスクを追加"],
      ["+ ルート", "+ タスクを追加"],
      ["ルートタスクを作成", "新しいタスクを作成"],
      ["実行リスト / ルート別", "実行リスト / 流れ別"],
      ["ルート別", "流れ別"],
      ["ルートを見出しとして、タスクの流れごとに確認できます。", "最初のタスクを見出しとして、流れごとに確認できます。"],
      ["ルートを見出しとして、未定・今日まで・今後の実行タスクを確認できます。", "最初のタスクを見出しとして、未定・今日まで・今後の実行タスクを確認できます。"],
      ["ルート直下", "この流れの先頭"],
      ["ルート: ", "流れ: "],
      ["まずはルートを作って、必要な作業を枝のように伸ばしてみてください。", "まずはタスクを作成して、必要な作業を枝のように伸ばしてみてください。"],
      ["1. まずはルートを作る", "1. まずはタスクを作る"],
      ["ルートはプロジェクトや大きな目的のようなものです。画面上部の「＋ ルート」から作れます。", "最初のタスクは、プロジェクトや大きな目的の出発点です。画面上部の「+ タスクを追加」から作れます。"],
      ["リスト表示では、未定・今日まで・今後のタスクをルートごとに確認できます。", "リスト表示では、未定・今日まで・今後のタスクを流れごとに確認できます。"]
    ],
    en: [
      ["+ Root", "+ Add task"],
      ["Create root task", "Create new task"],
      ["Execution list / By root", "Execution list / By flow"],
      ["Root sort", "Flow sort"],
      ["By root", "By flow"],
      ["Root: ", "Flow: "],
      ["Directly under root", "Start of this flow"],
      ["Use root tasks as headings and review action tasks.", "Use the first task as a heading and review action tasks."],
      ["Start with a root task, then extend the work like branches.", "Start by creating a task, then extend the work like branches."],
      ["1. Start with a root", "1. Create a task first"],
      ["A root is like a project or a large goal. Create one from the + Root button.", "The first task is the starting point for a project or larger goal. Create one from the + Add task button."],
      ["Review tasks grouped by root and flow.", "Review tasks grouped by flow."]
    ]
  };

  function language() {
    return window.CherryI18n?.getLanguage?.() === "en" ? "en" : "ja";
  }

  function format(template, values = {}) {
    if (typeof template !== "string") return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  function patchI18n() {
    const i18n = window.CherryI18n;
    if (!i18n || i18n.__taskWordingPatched) return Boolean(i18n);

    const originalT = i18n.t?.bind(i18n);
    const originalList = i18n.list?.bind(i18n);

    i18n.t = (key, values = {}) => {
      const lang = language();
      const override = overrideMap[lang]?.[key];
      if (override !== undefined) return format(override, values);
      return originalT ? originalT(key, values) : key;
    };

    i18n.list = key => {
      const lang = language();
      const override = overrideMap[lang]?.[key];
      if (Array.isArray(override)) return override;
      return originalList ? originalList(key) : [];
    };

    i18n.__taskWordingPatched = true;
    i18n.apply?.(document);
    i18n.onChange?.(() => requestAnimationFrame(applyTaskWording));
    return true;
  }

  function patchCreateModal() {
    if (typeof window.openCreateTaskModal !== "function" || window.openCreateTaskModal.__taskWordingPatched) return;

    const originalOpenCreateTaskModal = window.openCreateTaskModal;
    window.openCreateTaskModal = function patchedOpenCreateTaskModal(options = {}) {
      const result = originalOpenCreateTaskModal.call(this, options);
      requestAnimationFrame(() => {
        if (!options?.parentId) {
          const title = document.getElementById("taskModalTitle");
          if (title) title.textContent = language() === "en" ? "Create new task" : "新しいタスクを作成";
        }
      });
      return result;
    };

    window.openCreateTaskModal.__taskWordingPatched = true;
  }

  function patchCreateButton() {
    const button = document.getElementById("addRootBtn");
    if (!button) return;

    button.classList.add("primaryCreateAction");
    button.textContent = language() === "en" ? "+ Add task" : "+ タスクを追加";
    button.title = language() === "en" ? "Create a new task" : "新しいタスクを作成します";
    button.setAttribute("aria-label", button.title);
  }

  function patchTaskModalTitle() {
    const title = document.getElementById("taskModalTitle");
    if (!title) return;
    replaceTextNode(title.firstChild);
  }

  function replaceTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    let next = node.nodeValue;
    for (const [from, to] of textReplacements[language()]) next = next.split(from).join(to);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function patchListControls() {
    const isEnglish = language() === "en";
    document.querySelectorAll(".listControls button").forEach(button => {
      if (isEnglish && button.textContent === "Root") button.textContent = "Flow";
      if (!isEnglish && button.textContent === "ルート別") button.textContent = "流れ別";
    });
  }

  function removeDuplicateStartButton() {
    document.getElementById("startPageBtn")?.remove();
  }

  function patchVisibleText(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, input, textarea, .noteText, .listTaskTitle, .listRootTitle")) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (nodes.length < 300) {
      const node = walker.nextNode();
      if (!node) break;
      nodes.push(node);
    }

    nodes.forEach(replaceTextNode);
  }

  function applyTaskWording(root = document.body) {
    patchI18n();
    patchCreateModal();
    patchCreateButton();
    patchTaskModalTitle();
    patchListControls();
    removeDuplicateStartButton();
    patchVisibleText(root);
  }

  let scheduled = false;
  function scheduleApply(root = document.body) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyTaskWording(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scheduleApply(), { once: true });
  } else {
    scheduleApply();
  }

  const observer = new MutationObserver(mutations => {
    const target = mutations.find(mutation => mutation.target)?.target;
    scheduleApply(target?.nodeType === Node.ELEMENT_NODE ? target : document.body);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  const timer = setInterval(() => {
    applyTaskWording();
    if (window.CherryI18n?.__taskWordingPatched && window.openCreateTaskModal?.__taskWordingPatched) clearInterval(timer);
  }, 400);

  window.cherryTaskWordingFix = { apply: applyTaskWording };
})();

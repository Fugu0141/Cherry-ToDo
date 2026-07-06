(() => {
  const storageKey = "cherry-language-v1";
  const supportedLanguages = ["ja", "en"];

  const translations = {
    ja: {
      app: {
        title: "Cherry",
        tagline: "タスクの流れを、ブロックで育てる。"
      },
      toolbar: {
        addRoot: "＋ ルート",
        autoLayout: "自動整列",
        verticalLayout: "縦整列",
        dateLanes: "日付レーン {state}",
        themeAuto: "テーマ: 自動",
        themeLight: "テーマ: ライト",
        themeDark: "テーマ: ダーク",
        language: "Language: 日本語",
        start: "スタート",
        guide: "使い方",
        undo: "戻る",
        delete: "削除",
        reset: "リセット"
      },
      stage: {
        help: "PC: 日付は上に固定 / スマホ: 日付は左に固定 / 完了済みの日付はクリックで展開"
      },
      modal: {
        createTask: "タスクを作成",
        createRoot: "ルートタスクを作成",
        createSameBranch: "同じブランチに追加",
        createBranch: "分岐タスクを作成",
        addTask: "タスクを追加",
        editTask: "タスクを編集",
        taskName: "タスク名",
        taskNamePlaceholder: "例：ワーク12ページ",
        targetDate: "目標日",
        cancel: "キャンセル",
        save: "決定",
        changeDate: "日付を変更",
        changeDateDescription: "区切り線や空白に置かれました。移動先の日付を選んでください。",
        restore: "戻す",
        change: "変更",
        resetConfirm: "初期状態に戻しますか？"
      },
      note: {
        newTask: "新しいタスク",
        delete: "削除",
        toggleDone: "完了切替",
        addSameMobile: "タップで同じブランチに追加",
        addBranchDesktop: "右へ引くと同じブランチ / 下へずらすと分岐"
      },
      list: {
        openList: "リスト表示",
        openBoard: "ボード表示",
        buttonTitle: "今日まで・今後のタスクをリストで見る",
        title: "実行リスト",
        lead: "ルートを見出しとして、未定・今日まで・今後の実行タスクを確認できます。",
        summary: "未完了 {todo} / 完了 {done}",
        unscheduled: "未定",
        unscheduledDescription: "まだ日付を決めていない実行タスクです。今日扱いにはしません。",
        today: "今日まで",
        todayDescription: "今日以前の未処理を見落とさないための場所です。",
        upcoming: "今後",
        upcomingDescription: "明日以降のタスクです。",
        count: "{count}件",
        emptyUnscheduled: "未定の実行タスクはありません。",
        emptyToday: "今日までの実行タスクはありません。",
        emptyUpcoming: "今後の実行タスクはありません。",
        markTodo: "未完了に戻す",
        markDone: "完了にする",
        board: "ボード",
        openOnBoard: "ボード上で見る",
        rootDirect: "ルート直下",
        noDate: "未定"
      },
      mobile: {
        done: "完了",
        restore: "戻す",
        add: "追加",
        edit: "編集",
        delete: "削除"
      },
      welcome: {
        close: "閉じる",
        kicker: "FLOW FIRST, DATE SECOND.",
        title: "やることの流れを、見失わない。",
        lead: "Cherryは、タスクブロックを枝のようにつなぎながら、親子関係と日付で整理するOSSのToDoアプリです。",
        conceptLabel: "Cherryの基本コンセプト",
        root: "ルート",
        child: "子タスク",
        today: "今日やること",
        hint: "まずはルートを作って、必要な作業を枝のように伸ばしてみてください。",
        start: "はじめる",
        github: "GitHub",
        contribute: "貢献する",
        donationPending: "寄付は準備中",
        releases: "リリースノート",
        guide: "使い方を見る"
      },
      tutorial: {
        open: "使い方",
        close: "閉じる",
        previous: "戻る",
        next: "次へ",
        done: "完了",
        stepCount: "{current} / {total}",
        steps: [
          {
            title: "1. まずはルートを作る",
            body: "ルートはプロジェクトや大きな目的のようなものです。画面上部の「＋ ルート」から作れます。"
          },
          {
            title: "2. 子タスクを枝のように伸ばす",
            body: "タスク右下の「＋」から次の作業を作ります。横に伸ばすと同じ流れ、少しずらすと分岐として扱えます。"
          },
          {
            title: "3. 日付は流れを補助するもの",
            body: "Cherryは日付だけでなく、親子関係と流れを中心に整理します。タスクを日付レーンに置くと予定日を変えられます。"
          },
          {
            title: "4. 実行リストで今日やることを見る",
            body: "リスト表示では、未定・今日まで・今後のタスクをルートごとに確認できます。流れを作ってから実行に移るための場所です。"
          },
          {
            title: "5. 保存はブラウザ内、共有はCherryファイルで",
            body: "通常の作業はブラウザ内に保存されます。スタートページから、複数タブをまとめた暗号化Cherryファイルとして書き出せます。"
          }
        ]
      },
      workspace: {
        start: "スタート",
        title: "スタートページ",
        subtitle: "作業タブの切り替え、追加、暗号化Cherryファイルの読み書きをここで行います。",
        tabs: "タブ",
        newTab: "新しいタブ",
        rename: "名前変更",
        duplicate: "複製",
        delete: "削除",
        open: "開く",
        active: "現在開いています",
        import: "インポート",
        export: "暗号化して保存",
        exportShort: "保存",
        close: "閉じる",
        defaultTabName: "メイン",
        newTabName: "新しいタブ",
        untitled: "無題",
        localNote: "ローカル保存中",
        fileNote: "1つの .cherry ファイルに全タブをまとめて保存します。タブごとのファイル乱立を避けます。",
        securityNote: "CherryファイルはAES-GCMで暗号化されます。パスフレーズを忘れると復元できません。",
        renamePrompt: "タブ名を入力してください",
        deleteConfirm: "このタブを削除しますか？",
        passphrasePrompt: "Cherryファイルのパスフレーズを入力してください。忘れると復元できません。",
        passphraseAgainPrompt: "確認のため、もう一度パスフレーズを入力してください。",
        passphraseMismatch: "パスフレーズが一致しません。",
        passphraseRequired: "パスフレーズが必要です。",
        importFailed: "読み込みに失敗しました。ファイル形式またはパスフレーズを確認してください。",
        exportFailed: "保存に失敗しました。",
        imported: "インポートしました。",
        exported: "保存ファイルを作成しました。"
      },
      release: {
        notes: "リリースノート"
      },
      theme: {
        systemTitle: "システム設定に合わせてテーマを自動選択します",
        lightTitle: "ライトテーマを使用中です。クリックでダークテーマに切り替えます",
        darkTitle: "ダークテーマを使用中です。クリックで自動選択に戻します",
        aria: "{label}。クリックで切り替え"
      }
    },
    en: {
      app: {
        title: "Cherry",
        tagline: "Grow task flows with blocks."
      },
      toolbar: {
        addRoot: "+ Root",
        autoLayout: "Auto layout",
        verticalLayout: "Vertical layout",
        dateLanes: "Date lanes {state}",
        themeAuto: "Theme: Auto",
        themeLight: "Theme: Light",
        themeDark: "Theme: Dark",
        language: "Language: English",
        start: "Start",
        guide: "Guide",
        undo: "Undo",
        delete: "Delete",
        reset: "Reset"
      },
      stage: {
        help: "Desktop: dates stay at the top / Mobile: dates stay on the left / Click completed dates to expand"
      },
      modal: {
        createTask: "Create task",
        createRoot: "Create root task",
        createSameBranch: "Add to same branch",
        createBranch: "Create branch task",
        addTask: "Add task",
        editTask: "Edit task",
        taskName: "Task name",
        taskNamePlaceholder: "Example: Read chapter 12",
        targetDate: "Target date",
        cancel: "Cancel",
        save: "Save",
        changeDate: "Change date",
        changeDateDescription: "The task was dropped on a boundary or blank area. Choose the destination date.",
        restore: "Restore",
        change: "Change",
        resetConfirm: "Reset to the initial state?"
      },
      note: {
        newTask: "New task",
        delete: "Delete",
        toggleDone: "Toggle done",
        addSameMobile: "Tap to add to the same branch",
        addBranchDesktop: "Drag right for the same branch / drag downward to branch"
      },
      list: {
        openList: "List view",
        openBoard: "Board view",
        buttonTitle: "View due and upcoming tasks as a list",
        title: "Execution list",
        lead: "Use root tasks as headings and review unscheduled, due, and upcoming action tasks.",
        summary: "Todo {todo} / Done {done}",
        unscheduled: "Unscheduled",
        unscheduledDescription: "Action tasks without dates. They are not treated as today.",
        today: "Due today",
        todayDescription: "A place to avoid missing unfinished tasks due today or earlier.",
        upcoming: "Upcoming",
        upcomingDescription: "Tasks scheduled for tomorrow or later.",
        count: "{count}",
        emptyUnscheduled: "There are no unscheduled action tasks.",
        emptyToday: "There are no action tasks due today.",
        emptyUpcoming: "There are no upcoming action tasks.",
        markTodo: "Mark as todo",
        markDone: "Mark as done",
        board: "Board",
        openOnBoard: "Open on board",
        rootDirect: "Directly under root",
        noDate: "No date"
      },
      mobile: {
        done: "Done",
        restore: "Undo",
        add: "Add",
        edit: "Edit",
        delete: "Delete"
      },
      welcome: {
        close: "Close",
        kicker: "FLOW FIRST, DATE SECOND.",
        title: "Never lose the flow of work.",
        lead: "Cherry is an open-source todo app that organizes task blocks by parent-child relationships and dates.",
        conceptLabel: "Cherry basic concept",
        root: "Root",
        child: "Child task",
        today: "Today's work",
        hint: "Start with a root task, then extend the work like branches.",
        start: "Get started",
        github: "GitHub",
        contribute: "Contribute",
        donationPending: "Donation coming soon",
        releases: "Release notes",
        guide: "View guide"
      },
      tutorial: {
        open: "Guide",
        close: "Close",
        previous: "Back",
        next: "Next",
        done: "Done",
        stepCount: "{current} / {total}",
        steps: [
          {
            title: "1. Start with a root",
            body: "A root is like a project or a large goal. Create one from the \"+ Root\" button in the toolbar."
          },
          {
            title: "2. Extend child tasks like branches",
            body: "Use the + handle on a task to create the next piece of work. Continue straight for the same flow, or offset it to create a branch."
          },
          {
            title: "3. Dates support the flow",
            body: "Cherry is not only a date list. Parent-child relationships and flow are the main structure. Drop tasks onto date lanes to change their target date."
          },
          {
            title: "4. Use the list when it is time to execute",
            body: "List view groups unscheduled, due, and upcoming tasks under their roots. Build the flow first, then decide what to do now."
          },
          {
            title: "5. Work locally, share with Cherry files",
            body: "Normal work is saved in your browser. The Start page can export all tabs into one encrypted Cherry file."
          }
        ]
      },
      workspace: {
        start: "Start",
        title: "Start page",
        subtitle: "Switch tabs, add workspaces, and import or export encrypted Cherry files here.",
        tabs: "Tabs",
        newTab: "New tab",
        rename: "Rename",
        duplicate: "Duplicate",
        delete: "Delete",
        open: "Open",
        active: "Open now",
        import: "Import",
        export: "Encrypt and save",
        exportShort: "Save",
        close: "Close",
        defaultTabName: "Main",
        newTabName: "New tab",
        untitled: "Untitled",
        localNote: "Saved locally",
        fileNote: "All tabs are saved into one .cherry file to avoid file clutter.",
        securityNote: "Cherry files are encrypted with AES-GCM. If you forget the passphrase, the file cannot be recovered.",
        renamePrompt: "Enter a tab name",
        deleteConfirm: "Delete this tab?",
        passphrasePrompt: "Enter a passphrase for the Cherry file. It cannot be recovered if forgotten.",
        passphraseAgainPrompt: "Enter the passphrase again to confirm.",
        passphraseMismatch: "Passphrases do not match.",
        passphraseRequired: "A passphrase is required.",
        importFailed: "Import failed. Check the file format or passphrase.",
        exportFailed: "Export failed.",
        imported: "Imported.",
        exported: "Export file created."
      },
      release: {
        notes: "Release notes"
      },
      theme: {
        systemTitle: "Theme follows your system setting",
        lightTitle: "Light theme is active. Click to switch to dark.",
        darkTitle: "Dark theme is active. Click to return to auto.",
        aria: "{label}. Click to switch"
      }
    }
  };

  const dynamicTitleKeys = new Map([
    ["タスクを作成", "modal.createTask"],
    ["Create task", "modal.createTask"],
    ["ルートタスクを作成", "modal.createRoot"],
    ["Create root task", "modal.createRoot"],
    ["同じブランチに追加", "modal.createSameBranch"],
    ["Add to same branch", "modal.createSameBranch"],
    ["分岐タスクを作成", "modal.createBranch"],
    ["Create branch task", "modal.createBranch"],
    ["タスクを追加", "modal.addTask"],
    ["Add task", "modal.addTask"],
    ["タスクを編集", "modal.editTask"],
    ["Edit task", "modal.editTask"]
  ]);

  const callbacks = new Set();
  let language = loadLanguage();
  let observer = null;
  let applying = false;
  let applyQueued = false;

  function loadLanguage() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (supportedLanguages.includes(saved)) return saved;
    } catch (_) {
      // Non-critical. Fall back to browser language.
    }

    const preferred = String(navigator.language || "ja").toLowerCase();
    return preferred.startsWith("en") ? "en" : "ja";
  }

  function saveLanguage(nextLanguage) {
    try {
      localStorage.setItem(storageKey, nextLanguage);
    } catch (_) {
      // Language switching should still work for the current session.
    }
  }

  function readPath(source, key) {
    return key.split(".").reduce((current, part) => current?.[part], source);
  }

  function format(template, values = {}) {
    if (typeof template !== "string") return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  function t(key, values = {}) {
    const value = readPath(translations[language], key) ?? readPath(translations.ja, key) ?? key;
    return format(value, values);
  }

  function list(key) {
    const value = readPath(translations[language], key) ?? readPath(translations.ja, key);
    return Array.isArray(value) ? value : [];
  }

  function setText(selector, key, values) {
    const element = document.querySelector(selector);
    if (element) element.textContent = t(key, values);
  }

  function translateAttributes(root = document) {
    root.querySelectorAll?.("[data-i18n]").forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll?.("[data-i18n-title]").forEach(element => {
      element.title = t(element.dataset.i18nTitle);
    });

    root.querySelectorAll?.("[data-i18n-placeholder]").forEach(element => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });

    root.querySelectorAll?.("[data-i18n-aria-label]").forEach(element => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
  }

  function translateKnownDynamicUi() {
    const laneButton = document.getElementById("toggleLanesBtn");
    if (laneButton && typeof state !== "undefined") {
      laneButton.textContent = t("toolbar.dateLanes", { state: state.showLanes ? "ON" : "OFF" });
    }

    const modalTitle = document.getElementById("taskModalTitle");
    if (modalTitle) {
      const key = dynamicTitleKeys.get(modalTitle.textContent.trim()) || modalTitle.dataset.i18nDynamicKey;
      if (key) {
        modalTitle.dataset.i18nDynamicKey = key;
        modalTitle.textContent = t(key);
      }
    }

    const nameInput = document.getElementById("taskNameInput");
    if (nameInput) nameInput.placeholder = t("modal.taskNamePlaceholder");

    document.querySelectorAll(".deleteBtn").forEach(element => {
      element.title = t("note.delete");
    });

    document.querySelectorAll(".doneBtn").forEach(element => {
      element.title = t("note.toggleDone");
    });

    const isVertical = document.getElementById("board")?.classList.contains("verticalMode");
    document.querySelectorAll(".handle").forEach(element => {
      element.title = t(isVertical ? "note.addSameMobile" : "note.addBranchDesktop");
    });
  }

  function apply(root = document) {
    if (applying) return;
    applying = true;

    document.documentElement.lang = language;
    document.title = t("app.title");
    translateAttributes(root);
    translateKnownDynamicUi();

    applying = false;
  }

  function queueApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(() => {
      applyQueued = false;
      apply(document);
    });
  }

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage) || nextLanguage === language) return;
    language = nextLanguage;
    saveLanguage(language);
    apply(document);
    callbacks.forEach(callback => callback(language));
    if (typeof requestRender === "function") requestRender();
  }

  function toggleLanguage() {
    setLanguage(language === "ja" ? "en" : "ja");
  }

  function onChange(callback) {
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  }

  function init() {
    const button = document.getElementById("languageToggleBtn");
    if (button) {
      button.addEventListener("click", toggleLanguage);
    }

    apply(document);

    observer = new MutationObserver(queueApply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "data-i18n", "data-i18n-title", "data-i18n-placeholder", "data-i18n-aria-label"]
    });
  }

  window.CherryI18n = {
    t,
    list,
    apply,
    onChange,
    setLanguage,
    toggleLanguage,
    getLanguage: () => language,
    supportedLanguages: [...supportedLanguages]
  };

  window.cherryT = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

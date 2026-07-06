(() => {
  const storageKey = "cherry-language-v1";
  const supportedLanguages = ["ja", "en"];

  const translations = {
    ja: {
      app: { title: "Cherry", tagline: "タスクの流れを、ブロックで育てる。" },
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
      stage: { help: "PC: 日付は上に固定 / スマホ: 日付は左に固定 / 完了済みの日付はクリックで展開" },
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
        today: "今日まで",
        upcoming: "今後",
        count: "{count}件",
        markTodo: "未完了に戻す",
        markDone: "完了にする",
        board: "ボード",
        openOnBoard: "ボード上で見る",
        rootDirect: "ルート直下",
        noDate: "未定"
      },
      mobile: { done: "完了", restore: "戻す", add: "追加", edit: "編集", delete: "削除" },
      welcome: {
        close: "閉じる",
        kicker: "FLOW FIRST, DATE SECOND.",
        title: "やることの流れを、見失わない。",
        lead: "Cherryは、タスクブロックを枝のようにつなぎながら、親子関係と日付で整理するOSSのToDoアプリです。",
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
          { title: "1. まずはルートを作る", body: "ルートはプロジェクトや大きな目的のようなものです。画面上部の「＋ ルート」から作れます。" },
          { title: "2. 子タスクを枝のように伸ばす", body: "タスク右下の「＋」から次の作業を作ります。横に伸ばすと同じ流れ、少しずらすと分岐として扱えます。" },
          { title: "3. 日付は流れを補助するもの", body: "Cherryは日付だけでなく、親子関係と流れを中心に整理します。タスクを日付レーンに置くと予定日を変えられます。" },
          { title: "4. 実行リストで今日やることを見る", body: "リスト表示では、未定・今日まで・今後のタスクをルートごとに確認できます。流れを作ってから実行に移るための場所です。" },
          { title: "5. 保存と共有", body: "スタートページから、暗号化されたCherryファイルやiCalendar形式で保存できます。" }
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
        securityNote: "CherryファイルはAES-GCMで暗号化されます。パスフレーズを忘れると復元できません。",
        passphrasePrompt: "Cherryファイルのパスフレーズを入力してください。忘れると復元できません。",
        importFailed: "読み込みに失敗しました。ファイル形式またはパスフレーズを確認してください。",
        exportFailed: "保存に失敗しました。",
        imported: "インポートしました。",
        exported: "保存ファイルを作成しました。"
      },
      theme: {
        systemTitle: "システム設定に合わせてテーマを自動選択します",
        lightTitle: "ライトテーマを使用中です。クリックでダークテーマに切り替えます",
        darkTitle: "ダークテーマを使用中です。クリックで自動選択に戻します",
        aria: "{label}。クリックで切り替え"
      },
      dialog: { ok: "決定", cancel: "キャンセル" }
    },
    en: {
      app: { title: "Cherry", tagline: "Grow task flows with blocks." },
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
      stage: { help: "Desktop: dates stay at the top / Mobile: dates stay on the left / Click completed dates to expand" },
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
        lead: "Use root tasks as headings and review action tasks.",
        summary: "Todo {todo} / Done {done}",
        unscheduled: "Unscheduled",
        today: "Due today",
        upcoming: "Upcoming",
        count: "{count}",
        markTodo: "Mark as todo",
        markDone: "Mark as done",
        board: "Board",
        openOnBoard: "Open on board",
        rootDirect: "Directly under root",
        noDate: "No date"
      },
      mobile: { done: "Done", restore: "Undo", add: "Add", edit: "Edit", delete: "Delete" },
      welcome: {
        close: "Close",
        kicker: "FLOW FIRST, DATE SECOND.",
        title: "Never lose the flow of work.",
        lead: "Cherry is an open-source todo app that organizes task blocks by parent-child relationships and dates.",
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
          { title: "1. Start with a root", body: "A root is like a project or a large goal. Create one from the + Root button." },
          { title: "2. Extend child tasks like branches", body: "Use the + handle on a task to create the next piece of work. Continue straight or offset it to branch." },
          { title: "3. Dates support the flow", body: "Cherry is not only a date list. Drop tasks onto date lanes to change their target date." },
          { title: "4. Use the list when it is time to execute", body: "List view groups tasks so you can build the flow first, then decide what to do now." },
          { title: "5. Save and share", body: "The Start page can export encrypted Cherry files or iCalendar files." }
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
        securityNote: "Cherry files are encrypted with AES-GCM. If you forget the passphrase, the file cannot be recovered.",
        passphrasePrompt: "Enter a passphrase for the Cherry file. It cannot be recovered if forgotten.",
        importFailed: "Import failed. Check the file format or passphrase.",
        exportFailed: "Export failed.",
        imported: "Imported.",
        exported: "Export file created."
      },
      theme: {
        systemTitle: "Theme follows your system setting",
        lightTitle: "Light theme is active. Click to switch to dark.",
        darkTitle: "Dark theme is active. Click to return to auto.",
        aria: "{label}. Click to switch"
      },
      dialog: { ok: "OK", cancel: "Cancel" }
    }
  };

  const callbacks = new Set();
  let language = loadLanguage();

  function loadLanguage() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (supportedLanguages.includes(saved)) return saved;
    } catch (_) {}
    return String(navigator.language || "ja").toLowerCase().startsWith("en") ? "en" : "ja";
  }

  function saveLanguage(nextLanguage) {
    try { localStorage.setItem(storageKey, nextLanguage); } catch (_) {}
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

  function apply(root = document) {
    document.documentElement.lang = language;
    document.title = t("app.title");
    root.querySelectorAll?.("[data-i18n]").forEach(element => {
      const value = t(element.dataset.i18n);
      if (element.textContent !== value) element.textContent = value;
    });
    root.querySelectorAll?.("[data-i18n-title]").forEach(element => {
      const value = t(element.dataset.i18nTitle);
      if (element.title !== value) element.title = value;
    });
    root.querySelectorAll?.("[data-i18n-placeholder]").forEach(element => {
      const value = t(element.dataset.i18nPlaceholder);
      if (element.placeholder !== value) element.placeholder = value;
    });
    root.querySelectorAll?.("[data-i18n-aria-label]").forEach(element => {
      const value = t(element.dataset.i18nAriaLabel);
      if (element.getAttribute("aria-label") !== value) element.setAttribute("aria-label", value);
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
    document.getElementById("languageToggleBtn")?.addEventListener("click", toggleLanguage);
    apply(document);
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

(() => {
  const storageKey = "cherry-todo-welcome-dismissed-v1";
  const repoUrl = "https://github.com/Fugu0141/Cherry-ToDo";
  let previouslyFocused = null;

  function getStoredDismissed() {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }

  function setStoredDismissed() {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // The welcome window is non-critical. If localStorage is unavailable,
      // closing it should still work for the current page session.
    }
  }

  function buildSplash() {
    const backdrop = document.createElement("div");
    backdrop.id = "welcomeSplash";
    backdrop.className = "welcomeSplashBackdrop hidden";
    backdrop.innerHTML = `
      <section class="welcomeSplash" role="dialog" aria-modal="true" aria-labelledby="welcomeSplashTitle">
        <div class="welcomeSplashHero">
          <div class="welcomeSplashTopLine">
            <div class="welcomeSplashLogo" aria-label="Cherry-ToDo">
              <span class="welcomeSplashLogoMark">C</span>
              <span>Cherry-ToDo</span>
            </div>
            <div class="welcomeSplashVersion">OSS prototype</div>
            <button type="button" class="welcomeSplashClose" data-welcome-close aria-label="閉じる">×</button>
          </div>
          <div class="welcomeSplashTitle">
            <h2 id="welcomeSplashTitle">Welcome to Cherry-ToDo</h2>
            <p>Cherry-ToDoは、タスクをただのリストではなく「流れ・分岐・日付」で整理する、オープンソースの付箋ToDoアプリです。</p>
          </div>
        </div>

        <div class="welcomeSplashBody">
          <div>
            <p class="welcomeSplashSectionTitle">Start</p>
            <p class="welcomeSplashLead">
              まずはルートタスクを作り、そこから子タスクを伸ばしていきます。
              ボードは流れを組み立てる場所、リスト表示は今日やることを確認する場所として育てていく予定です。
            </p>
            <div class="welcomeSplashActions">
              <button type="button" class="welcomeSplashAction primary" data-welcome-close>はじめる</button>
              <a class="welcomeSplashLink" href="${repoUrl}" target="_blank" rel="noopener noreferrer">
                <strong>GitHubを開く</strong>
                <span>ソースコード、Issue、今後の開発状況を見る</span>
              </a>
            </div>
            <p class="welcomeSplashFootnote">
              この案内は初回起動時だけ表示されます。閉じると、このブラウザでは次回から表示されません。
            </p>
          </div>

          <div>
            <p class="welcomeSplashSectionTitle">Community</p>
            <div class="welcomeSplashLinks">
              <a class="welcomeSplashLink" href="${repoUrl}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">
                <strong>貢献する</strong>
                <span>バグ報告・要望・ドキュメント改善・PRの入口</span>
              </a>
              <div class="welcomeSplashPlaceholder" aria-disabled="true">
                <strong>寄付</strong>
                <span>支援ページは後から追加予定です</span>
              </div>
              <a class="welcomeSplashLink" href="${repoUrl}/releases" target="_blank" rel="noopener noreferrer">
                <strong>リリースノート</strong>
                <span>更新内容を確認する場所として整備予定です</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    `;

    return backdrop;
  }

  function getFocusableElements(backdrop) {
    return [...backdrop.querySelectorAll("a[href], button:not([disabled])")];
  }

  function closeSplash(backdrop) {
    setStoredDismissed();
    backdrop.classList.add("hidden");
    document.removeEventListener("keydown", onKeyDown);

    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus({ preventScroll: true });
    }
  }

  function onKeyDown(event) {
    const backdrop = document.getElementById("welcomeSplash");
    if (!backdrop || backdrop.classList.contains("hidden")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeSplash(backdrop);
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusableElements(backdrop);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showSplash(backdrop) {
    previouslyFocused = document.activeElement;
    backdrop.classList.remove("hidden");

    const firstButton = backdrop.querySelector("[data-welcome-close]");
    if (firstButton) firstButton.focus({ preventScroll: true });

    document.addEventListener("keydown", onKeyDown);
  }

  function initWelcomeSplash() {
    if (getStoredDismissed() || document.getElementById("welcomeSplash")) return;

    const backdrop = buildSplash();
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop || event.target.closest("[data-welcome-close]")) {
        closeSplash(backdrop);
      }
    });

    requestAnimationFrame(() => showSplash(backdrop));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWelcomeSplash, { once: true });
  } else {
    initWelcomeSplash();
  }

  window.cherryWelcomeSplash = {
    storageKey
  };
})();

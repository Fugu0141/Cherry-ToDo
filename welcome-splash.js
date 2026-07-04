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
        <div class="welcomeSplashHeader">
          <div class="welcomeSplashBrand" aria-label="Cherry">
            <span class="welcomeSplashMark">C</span>
            <span>Cherry</span>
          </div>
          <button type="button" class="welcomeSplashClose" data-welcome-close aria-label="閉じる">×</button>
        </div>

        <div class="welcomeSplashContent">
          <p class="welcomeSplashKicker">Flow first, date second.</p>
          <h2 id="welcomeSplashTitle">やることの流れを、見失わない。</h2>
          <p class="welcomeSplashLead">
            Cherryは、タスクブロックを枝のようにつなぎながら、親子関係と日付で整理するOSSのToDoアプリです。
          </p>

          <div class="welcomeSplashFlow" aria-label="Cherryの基本コンセプト">
            <span>ルート</span>
            <span aria-hidden="true">→</span>
            <span>子タスク</span>
            <span aria-hidden="true">→</span>
            <span>今日やること</span>
          </div>

          <p class="welcomeSplashHint">
            まずはルートを作って、必要な作業を枝のように伸ばしてみてください。
          </p>

          <button type="button" class="welcomeSplashStart" data-welcome-close>はじめる</button>
        </div>

        <div class="welcomeSplashFooter" aria-label="プロジェクトリンク">
          <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="${repoUrl}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">貢献する</a>
          <span>寄付は準備中</span>
          <a href="${repoUrl}/releases" target="_blank" rel="noopener noreferrer">リリースノート</a>
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

    const startButton = backdrop.querySelector(".welcomeSplashStart");
    if (startButton) startButton.focus({ preventScroll: true });

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

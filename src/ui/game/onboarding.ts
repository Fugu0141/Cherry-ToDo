export const CHERRY_ONBOARDING_SESSION_KEY = 'cherry:v2:ui:onboarding-seen';

export interface CherryOnboardingState {
  readonly seen: boolean;
  readonly hasWorkspace: boolean;
  readonly taskCount: number;
}

export interface CherryOnboardingStep {
  readonly selector: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}

export const CHERRY_ONBOARDING_STEPS: readonly CherryOnboardingStep[] = [
  {
    selector: '.cg-fab',
    eyebrow: 'STEP 1 / 4',
    title: 'まず、タスクを置く',
    body: '右下の＋から最初のタスクを作ります。Cherryでは、入力フォームではなくボードそのものが作業の中心です。',
  },
  {
    selector: '.cg-board-scroll',
    eyebrow: 'STEP 2 / 4',
    title: 'タスクを直接動かす',
    body: 'タスクはクリックで選択、ドラッグで移動できます。選択すると下の操作ドックから完了・編集・次のタスク作成をその場で行えます。',
  },
  {
    selector: '.cg-tabs',
    eyebrow: 'STEP 3 / 4',
    title: 'Flowを伸ばす',
    body: 'タスク右端の＋や「次へ」「分岐」から次のタスクをつなげられます。「既存へ」を使えば、すでにあるタスクにも接続できます。',
  },
  {
    selector: '.cg-topbar-actions',
    eyebrow: 'STEP 4 / 4',
    title: '必要な道具だけ呼び出す',
    body: 'ボード／リスト切替、Undo／Redo、表示設定は右上にまとめています。迷ったら左下の？から、このガイドをいつでも開けます。',
  },
];

export function shouldAutoOpenCherryOnboarding(state: CherryOnboardingState): boolean {
  return state.hasWorkspace && !state.seen && state.taskCount === 0;
}

function makeButton(label: string, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

export function installCherryOnboarding(root: HTMLElement): () => void {
  let disposed = false;
  let autoAttempted = false;
  let currentStep = 0;
  let overlay: HTMLDivElement | null = null;
  let spotlight: HTMLDivElement | null = null;
  let card: HTMLDivElement | null = null;

  const helpButton = makeButton('?', 'cg-help-button');
  helpButton.setAttribute('aria-label', 'Cherryの使い方を開く');
  helpButton.hidden = true;
  document.body.append(helpButton);

  const hasSeen = (): boolean => {
    try {
      return window.sessionStorage.getItem(CHERRY_ONBOARDING_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  };

  const markSeen = (): void => {
    try {
      window.sessionStorage.setItem(CHERRY_ONBOARDING_SESSION_KEY, '1');
    } catch {
      return;
    }
  };

  const workspaceMounted = (): boolean => root.querySelector('.cg-shell') !== null;

  const updateSpotlight = (): void => {
    if (!overlay || !spotlight || !workspaceMounted()) return;
    const step = CHERRY_ONBOARDING_STEPS[currentStep];
    const target = root.querySelector<HTMLElement>(step.selector);
    if (!target) {
      spotlight.hidden = true;
      return;
    }

    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      spotlight.hidden = true;
      return;
    }

    const pad = 8;
    spotlight.hidden = false;
    spotlight.style.left = `${Math.max(6, rect.left - pad)}px`;
    spotlight.style.top = `${Math.max(6, rect.top - pad)}px`;
    spotlight.style.width = `${Math.max(20, rect.width + pad * 2)}px`;
    spotlight.style.height = `${Math.max(20, rect.height + pad * 2)}px`;
  };

  const closeTutorial = (remember: boolean): void => {
    if (remember) markSeen();
    overlay?.remove();
    overlay = null;
    spotlight = null;
    card = null;
  };

  const renderStep = (): void => {
    if (!card) return;
    const step = CHERRY_ONBOARDING_STEPS[currentStep];
    card.replaceChildren();

    const eyebrow = document.createElement('span');
    eyebrow.className = 'cg-onboarding-eyebrow';
    eyebrow.textContent = step.eyebrow;

    const title = document.createElement('h2');
    title.textContent = step.title;

    const body = document.createElement('p');
    body.textContent = step.body;

    const actions = document.createElement('div');
    actions.className = 'cg-onboarding-actions';

    const skip = makeButton('あとで', 'cg-onboarding-button quiet');
    skip.addEventListener('click', () => closeTutorial(true));
    actions.append(skip);

    if (currentStep > 0) {
      const back = makeButton('戻る', 'cg-onboarding-button quiet');
      back.addEventListener('click', () => {
        currentStep -= 1;
        renderStep();
      });
      actions.append(back);
    }

    const next = makeButton(
      currentStep === CHERRY_ONBOARDING_STEPS.length - 1 ? '使ってみる' : '次へ',
      'cg-onboarding-button primary',
    );
    next.addEventListener('click', () => {
      if (currentStep === CHERRY_ONBOARDING_STEPS.length - 1) {
        closeTutorial(true);
        return;
      }
      currentStep += 1;
      renderStep();
    });
    actions.append(next);

    card.append(eyebrow, title, body, actions);
    requestAnimationFrame(updateSpotlight);
  };

  const openTutorial = (): void => {
    if (disposed || overlay || !workspaceMounted()) return;
    currentStep = 0;

    overlay = document.createElement('div');
    overlay.className = 'cg-onboarding-layer';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cherryの使い方');

    spotlight = document.createElement('div');
    spotlight.className = 'cg-onboarding-spotlight';
    spotlight.setAttribute('aria-hidden', 'true');

    card = document.createElement('div');
    card.className = 'cg-onboarding-card';

    overlay.append(spotlight, card);
    document.body.append(overlay);
    renderStep();
  };

  const refresh = (): void => {
    const mounted = workspaceMounted();
    helpButton.hidden = !mounted;

    if (!mounted) {
      closeTutorial(false);
      return;
    }

    const state: CherryOnboardingState = {
      seen: hasSeen(),
      hasWorkspace: true,
      taskCount: root.querySelectorAll('.cg-task').length,
    };
    if (!autoAttempted && shouldAutoOpenCherryOnboarding(state)) {
      autoAttempted = true;
      requestAnimationFrame(openTutorial);
    }
  };

  const observer = new MutationObserver(refresh);
  observer.observe(root, { childList: true, subtree: true });

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && overlay) closeTutorial(false);
  };
  const onViewportChange = (): void => updateSpotlight();

  helpButton.addEventListener('click', openTutorial);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('scroll', onViewportChange, true);
  refresh();

  return () => {
    disposed = true;
    observer.disconnect();
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('scroll', onViewportChange, true);
    overlay?.remove();
    helpButton.remove();
  };
}

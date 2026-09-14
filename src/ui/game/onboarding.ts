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

export const CHERRY_ONBOARDING_STEPS_EN: readonly CherryOnboardingStep[] = [
  {
    selector: '.cg-fab',
    eyebrow: 'STEP 1 / 4',
    title: 'Place your first task',
    body: 'Use the + button at the lower right to create your first task. In Cherry, the board itself is the main planning surface.',
  },
  {
    selector: '.cg-board-scroll',
    eyebrow: 'STEP 2 / 4',
    title: 'Move tasks directly',
    body: 'Select a task with a click or tap and drag it to move it. The action dock lets you complete, edit, or continue from the selected task.',
  },
  {
    selector: '.cg-tabs',
    eyebrow: 'STEP 3 / 4',
    title: 'Grow the Flow',
    body: 'Use the + handle, Next, or Branch to extend a Flow. Existing lets you connect to a task that is already on the board.',
  },
  {
    selector: '.cg-topbar-actions',
    eyebrow: 'STEP 4 / 4',
    title: 'Bring in tools only when needed',
    body: 'Board/List, Undo/Redo, and display settings live at the upper right. You can reopen this guide any time from the ? button.',
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

export function installCherryOnboarding(root: HTMLElement, locale: 'ja' | 'en' = 'ja'): () => void {
  let disposed = false;
  let autoAttempted = false;
  let currentStep = 0;
  let overlay: HTMLDivElement | null = null;
  let spotlight: HTMLDivElement | null = null;
  let card: HTMLDivElement | null = null;
  const steps = locale === 'en' ? CHERRY_ONBOARDING_STEPS_EN : CHERRY_ONBOARDING_STEPS;

  const helpButton = makeButton('?', 'cg-help-button');
  helpButton.setAttribute(
    'aria-label',
    locale === 'ja' ? 'Cherryの使い方を開く' : 'Open Cherry guide',
  );
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

  const currentOnboardingStep = (): CherryOnboardingStep => steps[currentStep] ?? steps[0]!;

  const updateSpotlight = (): void => {
    if (!overlay || !spotlight || !workspaceMounted()) return;
    const step = currentOnboardingStep();
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
    const step = currentOnboardingStep();
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

    const skip = makeButton(locale === 'ja' ? 'あとで' : 'Later', 'cg-onboarding-button quiet');
    skip.addEventListener('click', () => closeTutorial(true));
    actions.append(skip);

    if (currentStep > 0) {
      const back = makeButton(locale === 'ja' ? '戻る' : 'Back', 'cg-onboarding-button quiet');
      back.addEventListener('click', () => {
        currentStep -= 1;
        renderStep();
      });
      actions.append(back);
    }

    const next = makeButton(
      currentStep === steps.length - 1
        ? locale === 'ja'
          ? '使ってみる'
          : 'Start planning'
        : locale === 'ja'
          ? '次へ'
          : 'Next',
      'cg-onboarding-button primary',
    );
    next.addEventListener('click', () => {
      if (currentStep === steps.length - 1) {
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
    overlay.setAttribute('aria-label', locale === 'ja' ? 'Cherryの使い方' : 'How to use Cherry');

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

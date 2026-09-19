import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ONBOARDING_KEY = 'cherry:v2:ui:onboarding-seen';

async function suppressOnboarding(page: Page): Promise<void> {
  await page.evaluate((key) => window.sessionStorage.setItem(key, '1'), ONBOARDING_KEY);
}

async function chooseEphemeral(page: Page): Promise<void> {
  await page.goto('/');
  await suppressOnboarding(page);
  await expect(page.getByRole('heading', { name: 'この端末に作業を保存しますか？' })).toBeVisible();
  await page.getByRole('button', { name: '今回は保存しない' }).click();
  await expect(page.getByRole('button', { name: '＋ 新しいワークスペース' })).toBeVisible();
}

async function choosePersistent(page: Page): Promise<void> {
  await page.goto('/');
  await suppressOnboarding(page);
  await expect(page.getByRole('heading', { name: 'この端末に作業を保存しますか？' })).toBeVisible();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByRole('button', { name: '＋ 新しいワークスペース' })).toBeVisible();
}

async function createWorkspace(page: Page, name: string): Promise<void> {
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(name);
  });
  await page.getByRole('button', { name: '＋ 新しいワークスペース' }).click();
  await expect(page.locator('.cg-workspace-name')).toHaveText(name);
}

async function addTask(page: Page, title: string): Promise<void> {
  await page.locator('.cg-fab').click();
  const dialog = page.locator('.cg-quick-create');
  await expect(dialog).toBeVisible();
  await dialog.locator('.cg-quick-input').fill(title);
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(page.locator('.cg-task').filter({ hasText: title }).first()).toBeVisible();
}

async function selectTask(page: Page, title: string): Promise<void> {
  await page.locator('.cg-task').filter({ hasText: title }).first().click();
  await expect(page.locator('.cg-action-dock')).toBeVisible();
}

async function createNextTask(page: Page, fromTitle: string, title: string): Promise<void> {
  await selectTask(page, fromTitle);
  await page.getByRole('button', { name: '＋ 次へ' }).click();
  const dialog = page.locator('.cg-quick-create');
  await dialog.locator('.cg-quick-input').fill(title);
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(page.locator('.cg-task').filter({ hasText: title }).first()).toBeVisible();
}

async function connectExisting(page: Page, fromTitle: string, toTitle: string): Promise<void> {
  await selectTask(page, fromTitle);
  const existing = page.getByRole('button', { name: '🔗 既存へ' });
  if (!(await existing.isVisible())) {
    await page.getByRole('button', { name: '••• その他' }).click();
  }
  await page.getByRole('button', { name: '🔗 既存へ' }).click();
  await expect(page.locator('.cg-connect-hint')).toContainText('接続先のタスクを選んでください');
  await page.locator('.cg-task').filter({ hasText: toTitle }).first().click();
}

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(
    blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target),
    })),
  ).toEqual([]);
}

test('direct-manipulation planning journey works and key surfaces pass accessibility audit', async ({
  page,
}, testInfo) => {
  await chooseEphemeral(page);
  await expectNoSeriousAccessibilityViolations(page);

  await createWorkspace(page, 'Release workspace');
  await addTask(page, '設計');
  await createNextTask(page, '設計', '実装');

  await expect(page.locator('.cg-flow')).toHaveCount(1);
  await page.getByRole('button', { name: 'リスト' }).click();
  await expect(page.locator('.cg-list')).toBeVisible();
  await page.getByRole('button', { name: 'ボード' }).click();

  const firstTask = page.locator('.cg-task').filter({ hasText: '設計' }).first();
  await firstTask.dblclick();
  await expect(page.locator('.cg-editor')).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('button', { name: 'キャンセル' }).click();

  const bootMeasure = await page.evaluate(() => {
    const entry = performance.getEntriesByName('cherry:boot').at(-1);
    return entry === undefined ? null : { duration: entry.duration, entryType: entry.entryType };
  });
  expect(bootMeasure?.entryType).toBe('measure');
  expect(bootMeasure?.duration).toBeGreaterThanOrEqual(0);
  console.log(
    `[ui-overhaul-perf] ${testInfo.project.name} cherry:boot=${bootMeasure?.duration.toFixed(2)}ms`,
  );
});

test('persistent opt-in restores the active workspace after reload', async ({ page }) => {
  await choosePersistent(page);
  await createWorkspace(page, 'Restore workspace');
  await addTask(page, '保存されるタスク');

  await page.reload();
  await expect(page.locator('.cg-workspace-name')).toHaveText('Restore workspace');
  await expect(
    page.locator('.cg-task').filter({ hasText: '保存されるタスク' }).first(),
  ).toBeVisible();
});

test('multiple named planning tabs keep independent content and restore the active tab', async ({
  page,
}) => {
  await choosePersistent(page);
  await createWorkspace(page, 'Tabbed workspace');
  await addTask(page, 'Plan only');

  const tabs = page.locator('.cg-tabs');
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('調査');
  });
  await tabs.locator('.cg-tab-add').click();
  await expect(tabs.locator('.cg-tab.active')).toContainText('調査');
  await expect(page.locator('.cg-task').filter({ hasText: 'Plan only' })).toHaveCount(0);
  await addTask(page, 'Research only');

  await tabs.getByRole('button', { name: 'Plan' }).click();
  await expect(page.locator('.cg-task').filter({ hasText: 'Plan only' }).first()).toBeVisible();
  await expect(page.locator('.cg-task').filter({ hasText: 'Research only' })).toHaveCount(0);

  await tabs.getByRole('button', { name: '調査' }).click();
  await page.reload();
  await expect(page.locator('.cg-workspace-name')).toHaveText('Tabbed workspace');
  await expect(page.locator('.cg-tabs .cg-tab.active')).toContainText('調査');
  await expect(page.locator('.cg-task').filter({ hasText: 'Research only' }).first()).toBeVisible();
  await expect(page.locator('.cg-task').filter({ hasText: 'Plan only' })).toHaveCount(0);
});

test('existing tasks can be connected through the contextual planning surface', async ({
  page,
}) => {
  await chooseEphemeral(page);
  await createWorkspace(page, 'Connect workspace');
  await addTask(page, 'A');
  await addTask(page, 'B');

  await connectExisting(page, 'A', 'B');
  await expect(page.locator('.cg-flow')).toHaveCount(1);
});

test('first empty workspace exposes onboarding and the guide can be reopened', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '今回は保存しない' }).click();

  page.once('dialog', async (dialog) => {
    await dialog.accept('Onboarding workspace');
  });
  await page.getByRole('button', { name: '＋ 新しいワークスペース' }).click();

  await expect(page.getByRole('dialog', { name: 'Cherryの使い方' })).toBeVisible();
  await page.getByRole('button', { name: 'あとで' }).click();
  await expect(page.getByRole('dialog', { name: 'Cherryの使い方' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Cherryの使い方を開く' }).click();
  await expect(page.getByRole('dialog', { name: 'Cherryの使い方' })).toBeVisible();
});

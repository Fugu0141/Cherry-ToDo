import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function chooseEphemeral(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'この端末に保存しますか？' })).toBeVisible();
  await page.getByRole('button', { name: '今はしない' }).click();
  await expect(page.getByRole('heading', { name: 'Cherry' })).toBeVisible();
}

async function createWorkspace(page: Page, name: string): Promise<void> {
  await page.getByLabel('ワークスペース名').fill(name);
  await page.getByRole('button', { name: '新しいワークスペース' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

async function addTask(page: Page, title: string): Promise<void> {
  const taskForm = page.locator('.cherry-inline-form');
  await taskForm.getByLabel('タイトル').fill(title);
  await taskForm.getByRole('button', { name: 'タスクを追加' }).click();
  await expect(page.locator('.cherry-task').filter({ hasText: title })).toBeVisible();
}

async function connectTasks(
  page: Page,
  fromTitle: string,
  toTitle: string,
  mobile: boolean,
): Promise<void> {
  if (mobile) {
    const source = page.locator('.cherry-task').filter({ hasText: fromTitle });
    const target = page.locator('.cherry-task').filter({ hasText: toTitle });
    await source.getByRole('button', { name: '通常Flowをつなぐ' }).click();
    await expect(page.getByRole('status')).toContainText('接続先のタスクを選んでください');
    await target.getByRole('button', { name: '接続先にする' }).click();
    return;
  }

  const flowForm = page.locator('.cherry-flow-form');
  await flowForm.getByLabel('接続元').selectOption({ label: fromTitle });
  await flowForm.getByLabel('接続の種類').selectOption('continuation');
  await flowForm.getByLabel('接続先').selectOption({ label: toTitle });
  await flowForm.getByRole('button', { name: 'タスクをつなぐ' }).click();
}

async function connectBranch(page: Page, fromTitle: string, toTitle: string): Promise<void> {
  const flowForm = page.locator('.cherry-flow-form');
  await flowForm.getByLabel('接続元').selectOption({ label: fromTitle });
  await flowForm.getByLabel('接続の種類').selectOption('branch');
  await flowForm.getByLabel('接続先').selectOption({ label: toTitle });
  await flowForm.getByRole('button', { name: 'タスクをつなぐ' }).click();
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

test('ephemeral planning journey works and key surfaces pass accessibility audit', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expectNoSeriousAccessibilityViolations(page);

  await page.getByRole('button', { name: '今はしない' }).click();
  await expectNoSeriousAccessibilityViolations(page);

  await createWorkspace(page, 'Release workspace');
  await addTask(page, '設計');
  await addTask(page, '実装');

  await connectTasks(page, '設計', '実装', testInfo.project.name.startsWith('mobile-'));
  await expect(page.locator('.cherry-flow-line')).toHaveCount(1);

  await page.getByRole('button', { name: 'リスト' }).click();
  await expect(page.locator('.cherry-list')).toBeVisible();
  await page.getByRole('button', { name: 'ボード' }).click();

  const firstTask = page.locator('.cherry-task').filter({ hasText: '設計' });
  await firstTask.getByRole('button', { name: 'タスクを編集' }).click();
  await expect(page.getByRole('dialog', { name: 'タスクを編集' })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('button', { name: 'キャンセル' }).click();

  const bootMeasure = await page.evaluate(() => {
    const entry = performance.getEntriesByName('cherry:boot').at(-1);
    return entry === undefined ? null : { duration: entry.duration, entryType: entry.entryType };
  });
  expect(bootMeasure?.entryType).toBe('measure');
  expect(bootMeasure?.duration).toBeGreaterThanOrEqual(0);
  console.log(
    `[phase10-perf] ${testInfo.project.name} cherry:boot=${bootMeasure?.duration.toFixed(2)}ms`,
  );
});

test('persistent opt-in restores the active workspace after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '保存を許可' }).click();
  await createWorkspace(page, 'Restore workspace');
  await addTask(page, '保存されるタスク');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Restore workspace' })).toBeVisible();
  await expect(page.locator('.cherry-task').filter({ hasText: '保存されるタスク' })).toBeVisible();
});

test('persistent data clearing requires explicit destructive confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '保存を許可' }).click();
  await createWorkspace(page, 'Clear storage workspace');
  await addTask(page, '一時保存タスク');

  const storageActions = page.locator('.cherry-storage-actions');
  await expect(storageActions.getByRole('button', { name: '保存データを削除して停止' })).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('保存したCherryのデータを削除');
    await dialog.accept();
  });
  await storageActions.getByRole('button', { name: '保存データを削除して停止' }).click();
  await expect(page.locator('.cherry-storage-actions')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'この端末に保存しますか？' })).toBeVisible();
});

test('derived branching goals expose an editable non-color-only importance marker', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile-'), 'Desktop goal editor coverage.');

  await chooseEphemeral(page);
  await createWorkspace(page, 'Goal importance workspace');
  await addTask(page, 'Goal');
  await addTask(page, 'Branch A');
  await addTask(page, 'Branch B');

  await connectBranch(page, 'Goal', 'Branch A');
  await connectBranch(page, 'Goal', 'Branch B');

  const goal = page.locator('.cherry-task').filter({ hasText: 'Goal' });
  await expect(goal.getByText('Goal', { exact: true })).toBeVisible();
  await goal.getByRole('button', { name: 'タスクを編集' }).click();

  const editor = page.getByRole('dialog', { name: 'タスクを編集' });
  await editor.getByLabel('重要度').selectOption('high');
  await editor.getByRole('button', { name: '保存' }).click();

  await expect(page.getByRole('dialog', { name: 'タスクを編集' })).toHaveCount(0);
  await expect(goal.getByText('重要度: 高')).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test('mobile can connect existing tasks without hover-only discovery', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'Mobile release journey only.');

  await chooseEphemeral(page);
  await createWorkspace(page, 'Mobile workspace');
  await addTask(page, 'A');
  await addTask(page, 'B');

  const source = page.locator('.cherry-task').filter({ hasText: 'A' });
  const target = page.locator('.cherry-task').filter({ hasText: 'B' });
  await source.getByRole('button', { name: '通常Flowをつなぐ' }).click();
  await expect(page.getByRole('status')).toContainText('接続先のタスクを選んでください');
  await target.getByRole('button', { name: '接続先にする' }).click();

  await expect(page.locator('.cherry-flow-line')).toHaveCount(1);
  await expectNoSeriousAccessibilityViolations(page);
});

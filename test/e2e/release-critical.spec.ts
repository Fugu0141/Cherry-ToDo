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

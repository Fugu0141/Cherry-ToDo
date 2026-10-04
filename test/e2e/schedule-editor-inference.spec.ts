import { expect, test, type Page } from '@playwright/test';

const ONBOARDING_KEY = 'cherry:v2:ui:onboarding-seen';

async function chooseTemporaryStorage(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((key) => window.sessionStorage.setItem(key, '1'), ONBOARDING_KEY);
  await page.getByRole('button', { name: '今回は保存しない' }).click();
}

async function createWorkspace(page: Page): Promise<void> {
  page.once('dialog', (dialog) => dialog.accept('Schedule regression'));
  await page.getByRole('button', { name: '＋ 新しいワークスペース' }).click();
}

async function addTask(page: Page, title: string): Promise<void> {
  await page.locator('.cg-fab').click();
  const dialog = page.locator('.cg-quick-create');
  await dialog.locator('.cg-quick-input').fill(title);
  await dialog.getByRole('button', { name: '作成' }).click();
}

test('editing a no-date task infers and persists date and time without a schedule-type UI', async ({
  page,
}) => {
  await chooseTemporaryStorage(page);
  await createWorkspace(page);
  await addTask(page, 'Schedule me');

  const task = page.locator('.cg-task').filter({ hasText: 'Schedule me' }).first();
  await task.dblclick();

  const editor = page.locator('.cg-editor');
  const scheduleKind = editor.locator('select[data-schedule-kind-internal="true"]');
  const date = editor.locator('input[type="date"]');
  const time = editor.locator('input[type="time"]');

  await expect(scheduleKind).toHaveCount(1);
  await expect(scheduleKind).toHaveAttribute('aria-hidden', 'true');

  await date.fill('2026-10-05');
  await time.fill('16:45');

  await editor.getByRole('button', { name: '保存' }).click();
  await expect(task).toContainText('2026-10-05 16:45');

  await task.dblclick();
  await expect(page.locator('.cg-editor input[type="date"]')).toHaveValue('2026-10-05');
  await expect(page.locator('.cg-editor input[type="time"]')).toHaveValue('16:45');
});

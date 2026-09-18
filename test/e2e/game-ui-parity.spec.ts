import { expect, test, type Page } from '@playwright/test';

const ONBOARDING_KEY = 'cherry:v2:ui:onboarding-seen';

async function suppressOnboarding(page: Page): Promise<void> {
  await page.evaluate((key) => window.sessionStorage.setItem(key, '1'), ONBOARDING_KEY);
}

async function chooseStorage(page: Page, persistent: boolean): Promise<void> {
  await page.goto('/');
  await suppressOnboarding(page);
  await page.getByRole('button', { name: persistent ? '保存する' : '今回は保存しない' }).click();
}

async function createWorkspace(page: Page, name: string): Promise<void> {
  page.once('dialog', (dialog) => dialog.accept(name));
  await page.getByRole('button', { name: '＋ 新しいワークスペース' }).click();
  await expect(page.locator('.cg-workspace-name')).toHaveText(name);
}

async function addTask(page: Page, title: string): Promise<void> {
  await page.locator('.cg-fab').click();
  const dialog = page.locator('.cg-quick-create');
  await dialog.locator('.cg-quick-input').fill(title);
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(page.locator('.cg-task').filter({ hasText: title }).first()).toBeVisible();
}

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: '•••' }).click();
  await expect(page.locator('.cg-settings')).toBeVisible();
}

test('task importance is editable and presented with text', async ({ page }) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Importance workspace');
  await addTask(page, 'Prioritize me');

  await page.locator('.cg-task').filter({ hasText: 'Prioritize me' }).first().dblclick();
  const editor = page.locator('.cg-editor');
  await editor.getByLabel('重要度').selectOption('high');
  await editor.getByRole('button', { name: '保存' }).click();

  await expect(page.locator('.cg-task').filter({ hasText: 'Prioritize me' }).first()).toContainText(
    '重要度: 高',
  );
});

test('CSV import creates a new tab and CSV export downloads the active tab', async ({ page }) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Interop workspace');
  await openSettings(page);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'CSVを取り込む' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles('test/fixtures/game-ui-sample.csv');

  await expect(page.locator('.cg-task').filter({ hasText: 'Imported task' }).first()).toBeVisible();
  await expect(page.locator('.cg-tabs .cg-tab.active')).toContainText('game-ui-sample');

  if (!(await page.locator('.cg-settings').isVisible())) await openSettings(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSVを書き出す' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test('language preference reloads the product in English', async ({ page }) => {
  await chooseStorage(page, true);
  await createWorkspace(page, 'Locale workspace');
  await openSettings(page);

  await page.getByLabel('言語').selectOption('en');
  await expect(page.getByRole('button', { name: 'Board' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'List' })).toBeVisible();

  await page.getByRole('button', { name: '•••' }).click();
  await expect(page.getByLabel('Language')).toHaveValue('en');
  await expect(page.getByLabel('Theme')).toBeVisible();
});

test('persistent data can be cleared when device storage is disabled', async ({ page }) => {
  await chooseStorage(page, true);
  await createWorkspace(page, 'Disposable workspace');
  await addTask(page, 'Disposable task');
  await openSettings(page);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '保存データを削除して停止' }).click();
  await expect(page.getByRole('button', { name: '保存データを削除して停止' })).toHaveCount(0);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'この端末に作業を保存しますか？' })).toBeVisible();
  await page.getByRole('button', { name: '今回は保存しない' }).click();
  await expect(page.getByRole('button', { name: 'Disposable workspace' })).toHaveCount(0);
});

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
  await page.getByRole('button', { name: '•••', exact: true }).click();
  await expect(page.locator('.cg-settings')).toBeVisible();
}

async function selectTask(page: Page, title: string): Promise<void> {
  const task = page.locator('.cg-task').filter({ hasText: title }).first();
  if ((await task.getAttribute('data-selected')) !== 'true') await task.click();
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

async function setTaskDate(page: Page, title: string, date: string): Promise<void> {
  await page.locator('.cg-task').filter({ hasText: title }).first().dblclick();
  const editor = page.locator('.cg-editor');
  await editor.getByLabel('日付設定').selectOption('date');
  await editor.locator('input[type="date"]').fill(date);
  await editor.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('.cg-task').filter({ hasText: title }).first()).toContainText(date);
}

async function setDateLanes(page: Page, enabled: boolean): Promise<void> {
  await openSettings(page);
  const settings = page.locator('.cg-settings');
  const toggle = settings.getByLabel('日付レーン');
  if (enabled) await toggle.check();
  else await toggle.uncheck();
  if (enabled) await expect(page.locator('.cg-lane')).not.toHaveCount(0);
  else await expect(page.locator('.cg-lane')).toHaveCount(0);
  await settings.getByRole('button', { name: '×' }).click();
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

  await page.getByRole('button', { name: '•••', exact: true }).click();
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

test('board text annotations can be created from Game UI settings', async ({ page }) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Annotation workspace');
  await openSettings(page);

  await page.getByRole('button', { name: 'テキストを追加' }).click();

  const annotation = page.locator('.cherry-text-annotation');
  await expect(annotation).toHaveCount(1);
  await expect(annotation).toContainText('メモ');
  await expect(page.getByText('注釈を管理 (1)')).toBeVisible();
});

test('linear Flow can be reordered and disconnected from Game UI settings', async ({ page }) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Flow management workspace');
  await addTask(page, 'A');
  await createNextTask(page, 'A', 'B');
  await createNextTask(page, 'B', 'C');
  await expect(page.locator('.cg-flow')).toHaveCount(2);

  await openSettings(page);
  const orderRows = page.locator('.cg-flow-order-row');
  await expect(orderRows).toHaveCount(3);
  await orderRows.nth(1).getByRole('button', { name: '前へ移動' }).click();
  await expect(page.locator('.cg-flow-order-row').first()).toContainText('B');

  const flowRows = page.locator('.cg-flow-management-row');
  await expect(flowRows).toHaveCount(2);
  await flowRows.first().getByRole('button', { name: 'Flowを切断' }).click();
  await expect(page.locator('.cg-flow')).toHaveCount(1);
});

test('task editor can delete a linear downstream chain', async ({ page }) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Downstream workspace');
  await addTask(page, 'A');
  await createNextTask(page, 'A', 'B');
  await createNextTask(page, 'B', 'C');

  await page.locator('.cg-task').filter({ hasText: 'A' }).first().dblclick();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'この先も削除' }).click();

  await expect(page.locator('.cg-task')).toHaveCount(0);
});

test('responsive board progression follows the platform axis', async ({ page }, testInfo) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Responsive layout workspace');
  await setDateLanes(page, false);
  await addTask(page, 'Axis A');
  await createNextTask(page, 'Axis A', 'Axis B');
  await createNextTask(page, 'Axis B', 'Axis C');

  const first = await page.locator('.cg-task').filter({ hasText: 'Axis A' }).first().boundingBox();
  const second = await page.locator('.cg-task').filter({ hasText: 'Axis B' }).first().boundingBox();
  const third = await page.locator('.cg-task').filter({ hasText: 'Axis C' }).first().boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(third).not.toBeNull();
  if (first === null || second === null || third === null) return;

  if (testInfo.project.name === 'mobile-chromium') {
    expect(second.y).toBeGreaterThan(first.y);
    expect(third.y).toBeGreaterThan(second.y);
    expect(Math.abs(second.x - first.x)).toBeLessThan(8);
  } else {
    expect(second.x).toBeGreaterThan(first.x);
    expect(third.x).toBeGreaterThan(second.x);
    expect(Math.abs(second.y - first.y)).toBeLessThan(8);
  }
});

test('date lanes follow platform direction and desktop lane drops update schedule', async ({
  page,
}, testInfo) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Date lane workspace');
  await addTask(page, 'Lane A');
  await createNextTask(page, 'Lane A', 'Lane B');
  await setTaskDate(page, 'Lane A', '2026-09-20');
  await setTaskDate(page, 'Lane B', '2026-09-21');

  const firstLane = page.locator('.cg-lane[data-lane-id="date:2026-09-20"]');
  const secondLane = page.locator('.cg-lane[data-lane-id="date:2026-09-21"]');
  const firstBox = await firstLane.boundingBox();
  const secondBox = await secondLane.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (firstBox === null || secondBox === null) return;

  if (testInfo.project.name === 'mobile-chromium') {
    expect(secondBox.y).toBeGreaterThan(firstBox.y);
    expect(Math.abs(secondBox.x - firstBox.x)).toBeLessThan(8);
  } else {
    expect(secondBox.x).toBeGreaterThan(firstBox.x);
    expect(Math.abs(secondBox.y - firstBox.y)).toBeLessThan(8);

    const task = page.locator('.cg-task').filter({ hasText: 'Lane A' }).first();
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    const clientX = secondBox.x + Math.min(80, secondBox.width / 2);
    const clientY = secondBox.y + Math.min(180, secondBox.height - 20);
    await task.dispatchEvent('dragstart', { dataTransfer });
    await secondLane.dispatchEvent('dragover', { dataTransfer, clientX, clientY });
    await expect(secondLane).toHaveAttribute('data-drop-active', 'true');
    await secondLane.dispatchEvent('drop', { dataTransfer, clientX, clientY });
    await task.dispatchEvent('dragend', { dataTransfer });
    await expect(page.locator('.cg-task').filter({ hasText: 'Lane A' }).first()).toContainText(
      '2026-09-21',
    );
  }
});

test('selected task actions are contextual on desktop and progressive on mobile', async ({
  page,
}, testInfo) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Context actions workspace');
  await addTask(page, 'Context task');
  await selectTask(page, 'Context task');

  const task = page.locator('.cg-task').filter({ hasText: 'Context task' }).first();
  const dock = page.locator('.cg-action-dock');

  if (testInfo.project.name === 'mobile-chromium') {
    await expect(dock).toHaveAttribute('data-layout', 'mobile');
    await expect(page.getByRole('button', { name: '↗ 分岐' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '↝ 参照' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '🔗 既存へ' })).toHaveCount(0);
    await expect(page.locator('.cg-fab')).toHaveCount(0);

    await page.getByRole('button', { name: 'その他', exact: true }).click();
    await expect(page.getByRole('button', { name: '↗ 分岐' })).toBeVisible();
    await expect(page.getByRole('button', { name: '↝ 参照' })).toBeVisible();
    await expect(page.getByRole('button', { name: '🔗 既存へ' })).toBeVisible();

    await page.getByRole('button', { name: '↗ 分岐' }).click();
    await expect(page.locator('.cg-quick-create')).toBeVisible();
    await expect(page.locator('.cg-create-modes')).toHaveCount(0);
    await expect(page.locator('.cg-kicker')).toContainText('分岐');
  } else {
    await expect(dock).toHaveAttribute('data-layout', 'contextual');
    const taskBox = await task.boundingBox();
    const dockBox = await dock.boundingBox();
    expect(taskBox).not.toBeNull();
    expect(dockBox).not.toBeNull();
    if (taskBox === null || dockBox === null) return;
    expect(dockBox.y).toBeGreaterThanOrEqual(taskBox.y + taskBox.height);
    expect(dockBox.y - (taskBox.y + taskBox.height)).toBeLessThan(30);
    expect(Math.abs(dockBox.x - taskBox.x)).toBeLessThan(12);
  }
});

test('quick create can set date and time and inherits parent schedule', async ({ page }) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Quick schedule workspace');

  await page.locator('.cg-fab').click();
  let dialog = page.locator('.cg-quick-create');
  await dialog.locator('.cg-quick-input').fill('Timed root');
  await dialog.getByLabel('日付（任意）').fill('2026-09-22');
  await dialog.getByLabel('時間（任意）').fill('14:30');
  await dialog.getByRole('button', { name: '作成' }).click();

  const rootTask = page.locator('.cg-task').filter({ hasText: 'Timed root' }).first();
  await expect(rootTask).toContainText('2026-09-22 14:30');

  await selectTask(page, 'Timed root');
  await page.getByRole('button', { name: '＋ 次へ' }).click();
  dialog = page.locator('.cg-quick-create');
  await expect(dialog.getByLabel('日付（任意）')).toHaveValue('2026-09-22');
  await expect(dialog.getByLabel('時間（任意）')).toHaveValue('14:30');
  await dialog.locator('.cg-quick-input').fill('Timed child');
  await dialog.getByRole('button', { name: '作成' }).click();

  await expect(page.locator('.cg-task').filter({ hasText: 'Timed child' }).first()).toContainText(
    '2026-09-22 14:30',
  );
});

test('major Game UI surfaces stay inside the viewport without overlapping navigation', async ({
  page,
}, testInfo) => {
  await chooseStorage(page, false);
  await createWorkspace(page, 'Layout guard workspace');
  await addTask(page, 'Layout task');
  await selectTask(page, 'Layout task');

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (viewport === null) return;

  const dock = page.locator('.cg-action-dock');
  const dockBox = await dock.boundingBox();
  expect(dockBox).not.toBeNull();
  if (dockBox === null) return;

  if (testInfo.project.name === 'mobile-chromium') {
    expect(dockBox.x).toBeGreaterThanOrEqual(0);
    expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(dockBox.y + dockBox.height).toBeLessThanOrEqual(viewport.height + 1);
  } else {
    const canvas = page.locator('.cg-board');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (canvasBox !== null) {
      expect(dockBox.x).toBeGreaterThanOrEqual(canvasBox.x);
      expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1);
      expect(dockBox.y + dockBox.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height + 1);
    }
  }

  await page.getByRole('button', { name: '•••', exact: true }).click();
  const topbar = page.locator('.cg-topbar');
  const settings = page.locator('.cg-settings');
  const topbarBox = await topbar.boundingBox();
  const settingsBox = await settings.boundingBox();
  expect(topbarBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  if (topbarBox !== null && settingsBox !== null) {
    expect(settingsBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height - 1);
    expect(settingsBox.x).toBeGreaterThanOrEqual(0);
    expect(settingsBox.x + settingsBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(settingsBox.y + settingsBox.height).toBeLessThanOrEqual(viewport.height + 1);
  }
});

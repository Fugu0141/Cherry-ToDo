import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function setup(page: Page, persistent = false): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.sessionStorage.setItem('cherry:v2:ui:onboarding-seen', '1'));
  await page.getByRole('button', { name: persistent ? '保存する' : '今回は保存しない' }).click();
  page.once('dialog', (dialog) => dialog.accept('Phase 1 disposable workspace'));
  await page.getByRole('button', { name: '＋ 新しいワークスペース' }).click();
  await expect(page.locator('.cg-workspace-name')).toHaveText('Phase 1 disposable workspace');
}

async function addTask(page: Page, title: string): Promise<void> {
  await page.locator('.cg-fab').click();
  const form = page.locator('.cg-quick-create');
  await form.locator('.cg-quick-input').fill(title);
  await form.getByRole('button', { name: '作成' }).click();
  await expect(page.locator('.cg-task').filter({ hasText: title })).toBeVisible();
}

async function openSettings(page: Page): Promise<void> {
  const panel = page.locator('.cg-settings');
  if (!(await panel.isVisible())) {
    await page.getByRole('button', { name: '•••', exact: true }).click();
  }
  await expect(panel).toBeVisible();
}

async function record(
  page: Page,
  info: TestInfo,
  observation: Record<string, unknown>,
): Promise<void> {
  const report = {
    project: info.project.name,
    viewport: page.viewportSize(),
    ...observation,
  };
  console.log('[phase1-audit]', JSON.stringify(report));
  await info.attach('observation', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
  await info.attach('viewport', { body: await page.screenshot(), contentType: 'image/png' });
}

// Observation tests: assertions establish that the scenario ran, not that the product is fixed.
test('B01 memory-mode locale change', async ({ page }, info) => {
  await setup(page);
  await addTask(page, 'Unsaved audit task');
  await openSettings(page);
  let navigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });
  await page.getByLabel('言語').selectOption('en');
  const notNow = page.getByRole('button', { name: 'Not now', exact: true });
  const newWorkspace = page.getByRole('button', { name: '＋ New workspace', exact: true });
  const board = page.getByRole('button', { name: 'Board', exact: true });
  await expect(board.or(notNow).or(newWorkspace).first()).toBeVisible();
  if (await notNow.isVisible()) {
    await notNow.click();
    await expect(newWorkspace).toBeVisible();
  }
  const recent = page.getByRole('button', { name: 'Phase 1 disposable workspace', exact: true });
  if (await recent.isVisible()) {
    await recent.click();
    await expect(page.locator('.cg-workspace-name')).toHaveText('Phase 1 disposable workspace');
  }
  const task = page.locator('.cg-task').filter({ hasText: 'Unsaved audit task' });
  const retained = await task.isVisible();
  await record(page, info, {
    id: 'B01',
    navigations,
    retained,
    locale: await page.locator('html').getAttribute('lang'),
    outcome: navigations === 0 && retained ? 'not-reproduced' : 'reproduced',
  });
});

test('B03 residual data management after stop without clear', async ({ page }, info) => {
  await setup(page, true);
  await addTask(page, 'Stored audit task');
  await openSettings(page);
  const stop = page.getByRole('button', { name: '端末保存を停止', exact: true });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(stop).toHaveCount(0);
  await openSettings(page);
  const cleanup = page.getByRole('button', { name: /保存データを削除/ });
  const reachable = await cleanup.first().isVisible();
  const retained = await page
    .locator('.cg-task')
    .filter({ hasText: 'Stored audit task' })
    .isVisible();
  await record(page, info, {
    id: 'B03',
    cleanupReachable: reachable,
    memoryTaskRetained: retained,
    outcome: reachable && retained ? 'not-reproduced' : 'reproduced',
  });
});

test('B08 draft retention when changing desktop connection kind', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Desktop-only connection kind chips');
  await setup(page);
  await addTask(page, 'Parent task');
  await page.locator('.cg-task').filter({ hasText: 'Parent task' }).click();
  await page.getByRole('button', { name: '＋ 次へ' }).click();
  const form = page.locator('.cg-quick-create');
  const input = form.locator('.cg-quick-input');
  await input.fill('Keep this draft');
  await form.locator('input[type="date"]').fill('2027-01-15');
  await form.locator('input[type="time"]').fill('14:30');
  await form.getByRole('button', { name: '↗ 分岐', exact: true }).click();
  await expect(form).toBeVisible();
  const title = await input.inputValue();
  const date = await form.locator('input[type="date"]').inputValue();
  const time = await form.locator('input[type="time"]').inputValue();
  await record(page, info, {
    id: 'B08-draft',
    title,
    date,
    time,
    outcome:
      title === 'Keep this draft' && date === '2027-01-15' && time === '14:30'
        ? 'not-reproduced'
        : 'reproduced',
  });
});

function csvFixture(count: number): string {
  const rows = [
    'record_type,id,title,notes,status,schedule_kind,date,time,time_zone,importance,from_task_id,to_task_id,flow_kind,flow_order',
  ];
  for (let i = 0; i < count; i += 1) {
    rows.push(`task,audit-task-${i},Audit task ${i},,todo,none,,,,none,,,,`);
    // Independent ten-task chains avoid an artificial 500-task deep dependency chain.
    if (i % 10 !== 0) {
      rows.push(`flow,audit-edge-${i},,,,,,,,,audit-task-${i - 1},audit-task-${i},continuation,0`);
    }
  }
  return rows.join('\r\n');
}

for (const count of [10, 50, 100, 500]) {
  test(`B09/B11 baseline: ${count} tasks`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await setup(page);
    await openSettings(page);
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'CSVを取り込む' }).click();
    const chooser = await chooserPromise;
    const started = performance.now();
    await chooser.setFiles({
      name: `audit-${count}.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(csvFixture(count)),
    });
    const cards = page.locator('.cg-board-task');
    await expect(cards).toHaveCount(count, { timeout: 90_000 });
    const importToCardsMs = performance.now() - started;
    const overlaps = await cards.evaluateAll((elements) => {
      const bounds = elements.map((element) => element.getBoundingClientRect());
      let pairs = 0;
      for (const [i, a] of bounds.entries()) {
        for (const b of bounds.slice(i + 1)) {
          if (
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
          ) {
            pairs += 1;
          }
        }
      }
      return pairs;
    });
    const bootMs = await page.evaluate(
      () => performance.getEntriesByName('cherry:boot').at(-1)?.duration ?? null,
    );
    const scroll = page.locator('.cg-board-scroll');
    const panel = page.locator('.cg-settings');
    if (await panel.isVisible()) await panel.getByRole('button', { name: '×' }).click();
    const before = await scroll.evaluate((element) => {
      element.scrollLeft = 150;
      element.scrollTop = 150;
      return { x: element.scrollLeft, y: element.scrollTop };
    });
    await openSettings(page);
    const after = await scroll.evaluate((element) => ({
      x: element.scrollLeft,
      y: element.scrollTop,
    }));
    await record(page, info, {
      id: 'B09/B11/B08-scroll',
      tasks: count,
      fixture: 'independent ten-task chains; one sample per browser project',
      bootMs,
      importToCardsMs,
      overlapPairs: overlaps,
      scrollBefore: before,
      scrollAfter: after,
      scrollOutcome:
        before.x === 0 && before.y === 0
          ? 'inconclusive-no-scroll'
          : before.x === after.x && before.y === after.y
            ? 'not-reproduced'
            : 'reproduced',
    });
  });
}

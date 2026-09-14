import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function enterStart(page: Page): Promise<void> {
  await page.getByRole('button', { name: '今回は保存しない' }).click();
  await expect(page.getByRole('button', { name: '＋ 新しいワークスペース' })).toBeVisible();
}

async function blockingA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    .map((violation) => ({ id: violation.id, help: violation.help }));
}

test('system dark presentation remains readable and accessible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await enterStart(page);

  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(16, 19, 24)');
  expect(await blockingA11yViolations(page)).toEqual([]);
});

test('explicit light presentation overrides a dark system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('cherry:v2:ui:theme', 'light');
  });
  await page.reload();
  await enterStart(page);

  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(246, 247, 249)');
  expect(await blockingA11yViolations(page)).toEqual([]);
});

test('explicit dark presentation works independently of system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('cherry:v2:ui:theme', 'dark');
  });
  await page.reload();
  await enterStart(page);

  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(16, 19, 24)');
  expect(await blockingA11yViolations(page)).toEqual([]);
});

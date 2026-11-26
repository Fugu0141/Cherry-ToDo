import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';

export default defineConfig({
  ...baseline,
  testDir: './test/phase1-audit',
  retries: 0,
  workers: 1,
  reporter: [['line'], ['json', { outputFile: 'test-results/phase1-report.json' }]],
  outputDir: 'test-results/phase1',
});

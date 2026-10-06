import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 12000 },

  /* Run all spec files in parallel across workers */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,

  /* Use 4 workers so multiple "users" hit the server simultaneously */
  workers: process.env.CI ? 2 : 4,

  /* Rich HTML report + list output */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    /* Simulate network that might see real server latency */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    /* ── Desktop browsers ── */
    {
      name: 'chrome-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } },
    },
    /* ── Mobile viewports ── */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    /* ── Concurrent-traffic project (runs load specs only) ── */
    {
      name: 'concurrent-users',
      testMatch: '**/load_concurrent.spec.js',
      timeout: 120000,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
});

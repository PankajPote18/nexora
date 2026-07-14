import { defineConfig, devices } from '@playwright/test';

// No webServer entry here on purpose: the frontend (`npm run dev`) and, for
// the @live-tagged suite, the backend (`cd backend && npm run dev`) must be
// started manually before running tests. Backend boot runs
// sequelize.sync({ alter: true }) against the configured database, which
// should stay an explicit action a person takes, not something a test run
// triggers unattended.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 'list' prints live progress to the terminal; 'html' generates the
  // interactive report (pass/fail per test, timeline, traces, screenshots)
  // viewable via `npx playwright show-report`.
  reporter: [['list'], ['html', { open: 'never' }]],
  // Tests tagged @live hit a real PayU sandbox transaction and write to the
  // configured database. Run them explicitly via `npm run test:e2e:live`
  // (--grep @live); the default `npm run test:e2e` excludes them
  // (--grep-invert @live) so they're never part of a routine run.

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

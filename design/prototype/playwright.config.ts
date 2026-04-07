import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright config for Label Suite HTML prototypes.
 * Serves design/prototype/ via Python HTTP server on port 8888.
 * Tests run against static HTML pages to validate spec acceptance criteria.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:8888',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'python3 -m http.server 8888',
    cwd: path.resolve(__dirname),
    url: 'http://localhost:8888',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

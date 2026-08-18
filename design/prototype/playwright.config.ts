import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright config for Label Suite HTML prototypes.
 * Serves design/prototype/ via the Node static server (tests/serve.mjs) on port 8888.
 * Tests run against static HTML pages to validate spec acceptance criteria.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    // 127.0.0.1 literal matches serve.mjs's bind address; 'localhost' can
    // resolve to ::1 first on IPv6-preferring hosts, where nothing listens.
    baseURL: 'http://127.0.0.1:8888',
    trace: 'retain-on-failure',
  },

  webServer: {
    // Node static server (tests/serve.mjs): the previous Python servers --
    // stock http.server and the ThreadingHTTPServer/HTTP-1.1 variant -- both
    // intermittently dropped sockets under parallel load
    // (net::ERR_SOCKET_NOT_CONNECTED on a random <script src>), leaving page
    // globals undefined and flaking unrelated tests. Node's single event
    // loop has no accept-queue race to lose.
    command: 'node tests/serve.mjs',
    cwd: path.resolve(__dirname),
    url: 'http://127.0.0.1:8888',
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

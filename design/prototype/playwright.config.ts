import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright config for Label Suite HTML prototypes.
 * Serves design/prototype/ via the Node static server (tests/serve.mjs).
 * Tests run against static HTML pages to validate spec acceptance criteria.
 */

// Port is configurable via PW_PORT so that a Playwright run in one git
// worktree never silently reuses another worktree's already-listening
// server through reuseExistingServer (issue #582) -- give each worktree its
// own PW_PORT and they can run in parallel without cross-contaminating.
export function resolvePort(): number {
  return Number(process.env.PW_PORT) || 8888;
}

const PORT = resolvePort();
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    // 127.0.0.1 literal matches serve.mjs's bind address; 'localhost' can
    // resolve to ::1 first on IPv6-preferring hosts, where nothing listens.
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },

  webServer: {
    // Node static server (tests/serve.mjs): the previous Python servers --
    // stock http.server and the ThreadingHTTPServer/HTTP-1.1 variant -- both
    // intermittently dropped sockets under parallel load
    // (net::ERR_SOCKET_NOT_CONNECTED on a random <script src>), leaving page
    // globals undefined and flaking unrelated tests. Node's single event
    // loop has no accept-queue race to lose.
    command: `node tests/serve.mjs ${PORT}`,
    cwd: path.resolve(__dirname),
    url: BASE_URL,
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

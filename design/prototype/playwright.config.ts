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
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    baseURL: 'http://localhost:8888',
    trace: 'retain-on-failure',
  },

  webServer: {
    // HTTP/1.1 keep-alive + larger accept backlog: the stock `python3 -m http.server`
    // CLI is HTTP/1.0 (one connection per request) and intermittently drops sockets
    // (net::ERR_SOCKET_NOT_CONNECTED) under full-suite load, killing page scripts.
    command:
      'python3 -c "'
      + "from http.server import ThreadingHTTPServer as S, SimpleHTTPRequestHandler as H; "
      + "H.protocol_version='HTTP/1.1'; S.request_queue_size=128; "
      + "S(('127.0.0.1', 8888), H).serve_forever()"
      + '"',
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

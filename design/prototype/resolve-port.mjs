/* PW_PORT resolution for the prototype Playwright harness.
 *
 * Extracted out of playwright.config.ts (issue #1059) so the contract can be
 * exercised by a Node unit test: `node --test` cannot load a .ts config, and
 * a pure function over process.env has no business holding a browser worker.
 * playwright.config.ts imports it for its own baseURL/webServer port, so
 * this file is the single source of truth for both the harness and the gate.
 */

// Port is configurable via PW_PORT so that a Playwright run in one git
// worktree never silently reuses another worktree's already-listening
// server through reuseExistingServer (issue #582) -- give each worktree its
// own PW_PORT and they can run in parallel without cross-contaminating.
export function resolvePort() {
  const parsed = Number(process.env.PW_PORT);
  return parsed > 0 && parsed <= 65535 ? parsed : 8888;
}

import { test as base, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

/**
 * Shared Playwright fixture for every prototype spec (issue #1071).
 *
 * Specs read computed styles (`getComputedStyle`, `toHaveCSS`). When the
 * measured property is mid-transition the read returns an interpolated value,
 * so pass/fail depends on timing rather than on the style. A transition only
 * affects intermediate values, never the settled one, so suppressing motion
 * pins the value the assertion was written for.
 *
 * Not `reducedMotion: 'reduce'`: the prototype CSS has no
 * `prefers-reduced-motion` rules, so the media feature would change nothing.
 *
 * Specs import `test` / `expect` from here instead of '@playwright/test'
 * (enforced by tests-node/fixture-import.test.mjs).
 */
const NO_MOTION_CSS = `*, *::before, *::after {
  transition: none !important;
  animation: none !important;
}`;

/**
 * Injects NO_MOTION_CSS into every document the context loads, including
 * pages opened later via `context.newPage()`. An init script is used because
 * it applies before the page's own scripts run, so there is no window where
 * the first class change can start a transition.
 */
export async function disableMotion(context: BrowserContext): Promise<void> {
  await context.addInitScript((css) => {
    const inject = () => {
      const style = document.createElement('style');
      style.setAttribute('data-test-no-motion', '');
      style.textContent = css;
      document.documentElement.appendChild(style);
    };
    if (document.documentElement) {
      inject();
      return;
    }
    // The init script can run before <html> is parsed.
    const observer = new MutationObserver(() => {
      if (document.documentElement) {
        observer.disconnect();
        inject();
      }
    });
    observer.observe(document, { childList: true });
  }, NO_MOTION_CSS);
}

type Options = {
  /**
   * Default true. Set `false` via `test.use({ disableMotion: false })` only in
   * a spec whose subject is the transition/animation itself.
   */
  disableMotion: boolean;
};

export const test = base.extend<Options>({
  disableMotion: [true, { option: true }],
  context: async ({ context, disableMotion: enabled }, use) => {
    if (enabled) await disableMotion(context);
    await use(context);
  },
});

export { expect };

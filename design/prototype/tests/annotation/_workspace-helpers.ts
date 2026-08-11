/* Shared helpers for the outputs[]-model Annotation Workspace test suite
 * (spec 015 v2.0.0). Not itself a *.spec.ts file, so Playwright does not run
 * it as a test file; it only exports helpers consumed by the specs below.
 *
 * URL contract (spec 015 v2.0.0, BREAKING): the workspace and the
 * annotation list both resolve everything from `task_id` -> TaskProfile.
 * `task_type` / `sub_type` query params no longer exist.
 */
import { expect, type Page } from '@playwright/test';

export type Role = 'annotator' | 'reviewer';
export type RunType = 'dry_run' | 'official_run';

export function buildWorkspaceUrl(params: {
  task_id: string;
  sample_id: string;
  role?: Role;
  run_type?: RunType;
}): string {
  const { task_id, sample_id, role = 'annotator', run_type = 'official_run' } = params;
  return `/pages/annotation/annotation-workspace.html?task_id=${task_id}&sample_id=${sample_id}&role=${role}&run_type=${run_type}`;
}

export function buildListUrl(params: { task_id: string; role?: Role; run_type?: RunType }): string {
  const { task_id, role = 'annotator', run_type = 'official_run' } = params;
  return `/pages/annotation/annotation-list.html?task_id=${task_id}&role=${role}&run_type=${run_type}`;
}

/* Every spec below skips the first-visit guideline modal so interaction
 * tests don't have to special-case it; kept as an explicit opt-in helper
 * (rather than a global beforeEach) so guideline-focused specs can still
 * exercise the modal itself. */
export async function skipGuidelineModal(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  });
}

export async function dismissGuidelineModal(page: Page) {
  const confirmBtn = page.getByTestId('ws-guideline-modal-confirm');
  await confirmBtn.click({ timeout: 2000 }).catch(() => {
    // The modal may not render for every sample/role transition.
  });
}

/* Intercepts a LabelSuite*.data.js host-global fixture file and appends a
 * runtime-only patch expression after it, so tests can cover configurations
 * absent from the 13 illustrative seeds (e.g. allow_bypass on a type that
 * doesn't set it, or a second dataset record) WITHOUT touching any file
 * under pages/. The patch runs after the IIFE has already attached its
 * global, so it can freely mutate `window.<Global>.profiles[...]`. */
export async function patchDataFile(page: Page, fileName: string, patchScript: string) {
  await page.route(`**/${fileName}`, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({
      response,
      body: `${body}\n;(function(){\n${patchScript}\n})();\n`,
    });
  });
}

export async function setRangeValue(locator: import('@playwright/test').Locator, value: string) {
  await locator.evaluate((node, nextValue) => {
    const input = node as HTMLInputElement;
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

/* Selects `text` (first occurrence) inside the element located by `testId`
 * and fires the mouseup the engine's passage-selection handler listens for.
 * Walks text nodes so the target can live inside an entity highlight span
 * or a plain text segment between spans — mirrors how an annotator drags
 * over the passage in the relation builder flow (E1/Arg1 → Relation →
 * E2/Arg2). */
export async function selectWorkspaceText(page: Page, testId: string, text: string) {
  const el = page.getByTestId(testId);
  await el.evaluate((node, target) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const idx = textNode.textContent?.indexOf(target) ?? -1;
      if (idx < 0) continue;
      const range = document.createRange();
      range.setStart(textNode, idx);
      range.setEnd(textNode, idx + target.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    throw new Error(`selectWorkspaceText: "${target}" not found in any text node`);
  }, text);
  await el.dispatchEvent('mouseup');
}

/* Regression guard for the old workspace's `summarizeReviewerAspectCorrections`
 * ReferenceError (annotation-workspace.html:5029) that fired on review
 * submit. Attach before navigation; call assertNoPageErrors() after the
 * flow under test to fail loudly (with the real error message) instead of
 * silently swallowing a JS exception as a generic timeout. */
export function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

export function assertNoPageErrors(errors: Error[]) {
  expect(errors, `Unexpected page errors: ${errors.map((e) => e.message).join('; ')}`).toEqual([]);
}

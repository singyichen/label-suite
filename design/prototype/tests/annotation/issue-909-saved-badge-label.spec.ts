import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #909: `draft_saved` is the current action value (issue #578/#596),
 * but builds before 2026-08-31 wrote the same event under the old name
 * `saved`. shared/annotation-history.js's ACTION_LABEL table (issue #600)
 * has no `saved` key, so actionLabelFor('saved') falls through to its
 * "unknown action" branch and returns the raw English string `saved`
 * verbatim. annotation-workspace.html's `.history-action-badge` rule then
 * applies `text-transform: uppercase`, so an annotator with pre-rename
 * history in localStorage sees an all-caps English badge, `SAVED`, instead
 * of any Traditional Chinese label.
 *
 * This spec seeds one `saved` event (the legacy value under test) beside one
 * `draft_saved` event (the current value, kept here as a same-test control)
 * and asserts both the DOM textContent (via toHaveText -- unaffected by CSS
 * text-transform, so it exposes the actionLabelFor() lookup itself) and the
 * rendered/visual text (via innerText() -- CSS-aware, so it also exposes the
 * uppercase overlay) read "已存草稿" for both, never "SAVED" or "saved".
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const BUCKET_KEY = `labelsuite.wsSubmissions.${TASK}::annotator::official_run::${ANNOTATOR}::-`;

const LEGACY_ACTION = 'saved';
const CURRENT_ACTION = 'draft_saved';
const EXPECTED_LABEL = '已存草稿';

type SeededEvent = { action: string; role: string; actorId: string; at: string; summary: string };

function seedHistory(page: Page, events: SeededEvent[]) {
  return page.addInitScript(
    ([key, sample, history]) => {
      window.localStorage.setItem(
        key as string,
        JSON.stringify({
          [sample as string]: {
            status: 'submitted',
            submittedAt: '2026-08-31T09:00:00.000Z',
            answers: {},
            history,
          },
        })
      );
    },
    [BUCKET_KEY, SAMPLE, events] as const
  );
}

test.describe('issue #909 -- legacy `saved` history action must render a Traditional Chinese label', () => {
  test('a `saved` event badge shows 已存草稿, not the English fallback (upper- or lowercase)', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedHistory(page, [
      {
        action: LEGACY_ACTION,
        role: 'annotator',
        actorId: ANNOTATOR,
        at: '2026-08-31T09:10:00.000Z',
        summary: '舊版存草稿事件',
      },
      {
        action: CURRENT_ACTION,
        role: 'annotator',
        actorId: ANNOTATOR,
        at: '2026-08-31T09:11:00.000Z',
        summary: '目前版本存草稿事件',
      },
    ]);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));
    await page.getByTestId('ws-guideline-tab-history').click();

    const legacyBadge = page.locator('#wsHistoryContainer .history-action-badge[data-action="saved"]');
    const currentBadge = page.locator('#wsHistoryContainer .history-action-badge[data-action="draft_saved"]');

    // The `data-action` contract must not change: it still carries the raw
    // English event value, regardless of what label is displayed for it.
    await expect(legacyBadge).toHaveAttribute('data-action', 'saved');
    await expect(currentBadge).toHaveAttribute('data-action', 'draft_saved');

    // DOM text content (unaffected by CSS text-transform) must already be
    // the Traditional Chinese label -- this is what actionLabelFor() itself
    // is responsible for, independent of any CSS layered on top.
    await expect(legacyBadge).toHaveText(EXPECTED_LABEL);
    await expect(currentBadge).toHaveText(EXPECTED_LABEL);

    // Rendered/visual text (CSS-aware, reflects text-transform) must also
    // read the Chinese label. Chinese has no case, so text-transform:
    // uppercase is a no-op on it -- but it is NOT a no-op on the English
    // fallback string, which is exactly how this bug surfaces as `SAVED`.
    const legacyVisibleText = await legacyBadge.innerText();
    const currentVisibleText = await currentBadge.innerText();
    expect(legacyVisibleText).toBe(EXPECTED_LABEL);
    expect(currentVisibleText).toBe(EXPECTED_LABEL);

    // Explicitly rule out both failure shapes: the raw lowercase fallback
    // and the CSS-uppercased version an annotator actually sees.
    expect(legacyVisibleText).not.toBe('SAVED');
    expect(legacyVisibleText).not.toBe('saved');

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });
});

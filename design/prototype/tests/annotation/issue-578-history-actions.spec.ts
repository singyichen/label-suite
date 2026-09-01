import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #578 / spec 015 v4.61.0 FR-086: `action` is a free string today and
 * renderHistoryPanel() hardcodes a three-way ternary
 * (saved / rejected / else submitted), so four of the seven badge styles
 * defined in annotation-workspace.html are dead code and any other action
 * value silently renders with the 'submitted' style -- a `skipped` event
 * would read as a submission.
 *
 * AC-2.16: the seven HISTORY_ACTIONS values each get their own badge and the
 * seven semantic colors are pairwise distinct; a value outside the set
 * renders with the neutral base badge and does not break the rest of the list.
 * AC-2.15 (second AND): an event written before v4.61.0 -- i.e. carrying only
 * role / actorId / at / action / summary -- still renders as-is and throws
 * nothing.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const BUCKET_KEY = `labelsuite.wsSubmissions.${TASK}::annotator::official_run::${ANNOTATOR}::-`;

const HISTORY_ACTIONS = [
  'draft_saved',
  'submitted',
  'skipped',
  'modified',
  'accepted',
  'rejected',
  'adjudicated',
] as const;

/* Deliberately outside the set: the shape of a pre-v4.61.0 event that some
   older build wrote, which must survive the constant rollout. */
const LEGACY_ACTION = 'consensus';

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

function seededEvents(): SeededEvent[] {
  return [...HISTORY_ACTIONS, LEGACY_ACTION].map((action, idx) => ({
    action,
    role: action === 'accepted' || action === 'rejected' || action === 'adjudicated' ? 'reviewer' : 'annotator',
    actorId: ANNOTATOR,
    /* ascending so the panel's newest-first reversal is deterministic */
    at: `2026-08-31T09:${String(10 + idx).padStart(2, '0')}:00.000Z`,
    summary: `事件 ${action}`,
  }));
}

test.describe('issue #578 -- FR-086 歷程動作常數化', () => {
  test('AC-2.16: seven HISTORY_ACTIONS render seven pairwise-distinct badges, an out-of-set value renders neutral', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedHistory(page, seededEvents());
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));
    await page.getByTestId('ws-guideline-tab-history').click();

    const badges = page.locator('#wsHistoryContainer .history-action-badge');
    await expect(badges).toHaveCount(HISTORY_ACTIONS.length + 1);

    const rendered = await badges.evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = window.getComputedStyle(node);
        return {
          action: node.getAttribute('data-action'),
          label: (node.textContent || '').trim(),
          classes: Array.from(node.classList),
          swatch: `${style.color}|${style.backgroundColor}`,
        };
      })
    );

    /* every constant is present exactly once */
    for (const action of HISTORY_ACTIONS) {
      expect(rendered.filter((b) => b.action === action)).toHaveLength(1);
    }

    /* ...and the seven semantic colors are pairwise distinct */
    const swatches = HISTORY_ACTIONS.map((action) => rendered.find((b) => b.action === action)!.swatch);
    expect(new Set(swatches).size).toBe(HISTORY_ACTIONS.length);

    /* the out-of-set value falls back to the neutral base badge -- no
       modifier class, so it can never masquerade as one of the seven */
    const legacy = rendered.find((b) => b.action === LEGACY_ACTION)!;
    expect(legacy.classes).toEqual(['history-action-badge']);

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });

  test('AC-2.15: a pre-v4.61.0 event carrying only the five legacy fields still renders in full', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedHistory(page, [
      {
        action: 'submitted',
        role: 'annotator',
        actorId: ANNOTATOR,
        at: '2026-08-31T09:10:00.000Z',
        summary: '舊事件摘要',
      },
    ]);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));
    await page.getByTestId('ws-guideline-tab-history').click();

    const card = page.locator('#wsHistoryContainer .history-item');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.history-actor')).toHaveText(`標記員 · ${ANNOTATOR}`);
    await expect(card.locator('.history-time')).not.toHaveText('');
    await expect(card.locator('.history-action-badge')).toHaveAttribute('data-action', 'submitted');
    await expect(card.locator('.history-action-badge')).toHaveText('已提交');
    await expect(card.locator('.history-summary')).toHaveText('舊事件摘要');

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });
});

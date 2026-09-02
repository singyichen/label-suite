import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #578 / spec 015 FR-086: `action` used to be a free string, and
 * renderHistoryPanel() hardcoded a three-way ternary (saved / rejected /
 * else submitted), so most of the badge styles defined in
 * annotation-workspace.html were dead code and any other action value
 * silently rendered with the 'submitted' style -- a `skipped` event would
 * read as a submission.
 *
 * AC-2.16: each action value gets its own badge, the semantic colors are
 * pairwise distinct, and a value outside the set renders with the neutral
 * base badge without breaking the rest of the list.
 * AC-2.15 (second AND): an event written before v4.61.0 -- i.e. carrying only
 * role / actorId / at / action / summary -- still renders as-is and throws
 * nothing.
 *
 * Scope narrowed in v5.0.0 (issue #596). The vocabulary is nine values now,
 * and asserting the whole of it lives in issue-596-history-chain.spec.ts,
 * which owns the relay's badge contract. What this file still owns is the
 * COLOR half of AC-2.16, and that can only be checked for values whose
 * .history-action-badge.<modifier> rule exists in annotation-workspace.html.
 * The three actions the relay added have no rule yet -- the file is held by
 * another PR group -- so listing them here would assert against the base
 * swatch three times and fail for a reason this file is not about.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const BUCKET_KEY = `labelsuite.wsSubmissions.${TASK}::annotator::official_run::${ANNOTATOR}::-`;

/* The actions that both belong to the current set AND own a color rule --
   the intersection the color assertion below can speak about. */
const STYLED_ACTIONS = [
  'draft_saved',
  'submitted',
  'skipped',
  'modified',
  'accepted',
  'adjudicated',
] as const;

/* Retired by the single-owner relay (issue #596): no rework loop means no
   new event can carry it, but events already in localStorage still do, and
   annotation-workspace.html still holds its now-unreachable color rule. It
   must land on the neutral badge like any other out-of-set value -- the rule
   surviving in CSS must not be enough to make it look current. */
const RETIRED_ACTION = 'rejected';

/* Never in any set: the shape of a pre-v4.61.0 event that some older build
   wrote, which must survive the constant rollout. */
const LEGACY_ACTION = 'consensus';

const NEUTRAL_ACTIONS = [RETIRED_ACTION, LEGACY_ACTION];

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

const REVIEWER_ACTIONS = ['accepted', 'adjudicated', RETIRED_ACTION];

function seededEvents(): SeededEvent[] {
  return [...STYLED_ACTIONS, ...NEUTRAL_ACTIONS].map((action, idx) => ({
    action,
    role: REVIEWER_ACTIONS.indexOf(action) >= 0 ? 'reviewer' : 'annotator',
    actorId: ANNOTATOR,
    /* ascending so the panel's newest-first reversal is deterministic */
    at: `2026-08-31T09:${String(10 + idx).padStart(2, '0')}:00.000Z`,
    summary: `事件 ${action}`,
  }));
}

test.describe('issue #578 -- FR-086 歷程動作常數化', () => {
  test('AC-2.16: every styled action renders a badge of its own color, and out-of-set values render neutral', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedHistory(page, seededEvents());
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));
    await page.getByTestId('ws-guideline-tab-history').click();

    const badges = page.locator('#wsHistoryContainer .history-action-badge');
    await expect(badges).toHaveCount(STYLED_ACTIONS.length + NEUTRAL_ACTIONS.length);

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
    for (const action of STYLED_ACTIONS) {
      expect(rendered.filter((b) => b.action === action)).toHaveLength(1);
    }

    /* ...and their semantic colors are pairwise distinct */
    const swatches = STYLED_ACTIONS.map((action) => rendered.find((b) => b.action === action)!.swatch);
    expect(new Set(swatches).size).toBe(STYLED_ACTIONS.length);

    /* out-of-set values fall back to the neutral base badge -- no modifier
       class, so neither the retired action nor an unknown one can masquerade
       as a current one. Asserted by class rather than by color: the retired
       action's CSS rule still exists, so only the missing class proves the
       lookup rejected it. */
    for (const action of NEUTRAL_ACTIONS) {
      const neutral = rendered.find((b) => b.action === action)!;
      expect(neutral.classes, `${action} must render on the base badge`).toEqual(['history-action-badge']);
      expect(neutral.swatch).not.toBe(swatches[0]);
    }

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

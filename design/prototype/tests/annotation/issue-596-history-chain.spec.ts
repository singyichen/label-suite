import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* 歷程動作集合與責任鏈加詳 (spec 015 v5.0.0, issue #596 群組 4).
 *
 * FR-086 / AC-2.16: HISTORY_ACTIONS becomes nine values -- `rejected` leaves
 * with the rework loop, `bypassed` / `exception_resolved` / `excluded` arrive
 * with the three-way decision, arbitration and the final exception pool.
 * Every value owns its own badge modifier, and a `rejected` event already in
 * localStorage stays readable: the maintainer ruled on 2026-09-01 that
 * ACTION_LABEL keeps `rejected: 審核退回` while ACTIONS / BADGE_CLASS drop it,
 * so an old event still reads in Chinese and its badge falls to the neutral
 * base -- which is exactly the signal "this came from the old model".
 *
 * FR-097: every card carries the four things the responsibility chain is made
 * of -- action badge, per-outKey 前值 → 後值, 耗時, and a named decider --
 * and an unsubmitted peer draft is not one of them (FR-062).
 *
 * The nine events are seeded straight into the submission bucket rather than
 * driven through the UI: `bypassed` / `exception_resolved` / `excluded` get
 * their emission points in groups 3 and 6, and AC-2.16 is about how the set
 * RENDERS, not about who writes it.
 *
 * Not asserted here, deliberately: that the nine semantic colours are
 * pairwise distinct. The colours live in .history-action-badge.<modifier>
 * rules inside annotation-workspace.html, which PR group 4 may not touch
 * (group 3 owns that file concurrently). The single-source-of-truth half of
 * FR-086 -- one distinct modifier class per value, chosen by table and not by
 * a render-site branch -- is fully asserted below; the three new rules are
 * tracked as a follow-up for whoever owns that file next.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const PEER_REVIEWER = 'reviewer_li';
const ANNOTATOR_BUCKET = `labelsuite.wsSubmissions.${TASK}::annotator::official_run::${ANNOTATOR}::-`;
const PEER_DRAFT_BUCKET = `labelsuite.wsSubmissions.${TASK}::reviewer::official_run::${ANNOTATOR}::${PEER_REVIEWER}`;

/* action -> [badge modifier, 中文標籤]; the maintainer's 2026-09-01 ruling for
   the three new values, and FR-086's listed order. */
const HISTORY_ACTIONS: Array<[string, string, string]> = [
  ['draft_saved', 'draft-saved', '已存草稿'],
  ['submitted', 'submitted', '已提交'],
  ['skipped', 'skipped', '已跳過'],
  ['modified', 'modified', '審核修正'],
  ['accepted', 'accepted', '審核通過'],
  ['bypassed', 'bypassed', '無法判定'],
  ['adjudicated', 'adjudicated', '仲裁定案'],
  ['exception_resolved', 'exception-resolved', '例外收尾'],
  ['excluded', 'excluded', '已排除'],
];

const RETIRED_ACTION = 'rejected';

type SeededEvent = {
  action: string;
  role: string;
  actorId: string;
  at: string;
  summary: string;
  lead_time?: number;
  started_at?: string;
  result_snapshot?: unknown;
};

function seedBucket(page: Page, key: string, status: string, events: SeededEvent[]) {
  return page.addInitScript(
    ([bucketKey, sample, entryStatus, history]) => {
      window.localStorage.setItem(
        bucketKey as string,
        JSON.stringify({
          [sample as string]: {
            status: entryStatus as string,
            submittedAt: '2026-08-31T09:00:00.000Z',
            answers: {},
            history,
          },
        })
      );
    },
    [key, SAMPLE, status, events] as const
  );
}

const ANNOTATOR_ACTIONS = ['draft_saved', 'submitted', 'skipped'];

function at(idx: number): string {
  return `2026-08-31T09:${String(10 + idx).padStart(2, '0')}:00.000Z`;
}

/* The nine constants plus one retired value, so the set and its compatibility
   path are proved by the same rendered list. */
function vocabularyEvents(): SeededEvent[] {
  return HISTORY_ACTIONS.map(([action]) => action)
    .concat(RETIRED_ACTION)
    .map((action, idx) => ({
      action,
      role: ANNOTATOR_ACTIONS.indexOf(action) >= 0 ? 'annotator' : 'reviewer',
      actorId: ANNOTATOR_ACTIONS.indexOf(action) >= 0 ? ANNOTATOR : REVIEWER,
      at: at(idx),
      summary: `事件 ${action}`,
    }));
}

async function openHistory(page: Page) {
  await page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: REVIEWER,
  }));
  await page.getByTestId('ws-guideline-tab-history').click();
}

test.describe('FR-086 / AC-2.16 歷程動作九值集合', () => {
  test('九值各有專屬徽章修飾類別與中文標籤，且集合中不含 rejected', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedBucket(page, ANNOTATOR_BUCKET, 'submitted', vocabularyEvents());
    await openHistory(page);

    const badges = page.locator('#wsHistoryContainer .history-action-badge');
    await expect(badges).toHaveCount(HISTORY_ACTIONS.length + 1);

    const rendered = await badges.evaluateAll((nodes) =>
      nodes.map((node) => ({
        action: node.getAttribute('data-action'),
        label: (node.textContent || '').trim(),
        classes: Array.from(node.classList),
      }))
    );

    for (const [action, modifier, label] of HISTORY_ACTIONS) {
      const matches = rendered.filter((b) => b.action === action);
      expect(matches, `expected exactly one ${action} badge`).toHaveLength(1);
      expect(matches[0].classes).toEqual(['history-action-badge', modifier]);
      expect(matches[0].label).toBe(label);
    }

    /* one modifier per value, never shared -- a shared class is how the
       three-way ternary FR-086 replaced used to make `skipped` read as a
       submission. */
    const modifiers = HISTORY_ACTIONS.map(([, modifier]) => modifier);
    expect(new Set(modifiers).size).toBe(HISTORY_ACTIONS.length);

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });

  test('v5.0.0 以前的 rejected 事件以中性徽章原樣呈現，且不中斷其餘渲染', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedBucket(page, ANNOTATOR_BUCKET, 'submitted', vocabularyEvents());
    await openHistory(page);

    const retired = page.locator(`#wsHistoryContainer .history-action-badge[data-action="${RETIRED_ACTION}"]`);
    await expect(retired).toHaveCount(1);
    /* no modifier: outside the set it can never borrow another action's
       meaning, and the neutral base badge IS the "old model" signal. */
    expect(await retired.evaluate((node) => Array.from(node.classList))).toEqual(['history-action-badge']);
    /* ...but still Chinese: ACTION_LABEL keeps the key so an event already in
       localStorage does not regress to an English identifier. */
    await expect(retired).toHaveText('審核退回');

    await expect(page.locator('#wsHistoryContainer .history-item')).toHaveCount(HISTORY_ACTIONS.length + 1);
    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });
});

test.describe('FR-097 歷程事件的責任鏈加詳', () => {
  const CHAIN: SeededEvent[] = [
    {
      action: 'submitted',
      role: 'annotator',
      actorId: ANNOTATOR,
      at: at(0),
      summary: '標記員提交',
      started_at: '2026-08-31T09:09:00.000Z',
      lead_time: 12_000,
      result_snapshot: { previewState: { single_label: { selected: 'positive' } } },
    },
    {
      action: 'modified',
      role: 'reviewer',
      actorId: REVIEWER,
      at: at(1),
      summary: '審核員修正',
      started_at: '2026-08-31T09:10:30.000Z',
      lead_time: 8_000,
      result_snapshot: { previewState: { single_label: { selected: 'negative' } } },
    },
  ];

  test('卡片呈現逐 outKey 前值 → 後值、耗時與具名決策者', async ({ page }) => {
    await skipGuidelineModal(page);
    await seedBucket(page, ANNOTATOR_BUCKET, 'submitted', CHAIN);
    await openHistory(page);

    const cards = page.locator('#wsHistoryContainer .history-item');
    await expect(cards).toHaveCount(2);

    /* newest first, so the correction is the first card */
    const correction = cards.first();
    await expect(correction.locator('.history-action-badge')).toHaveAttribute('data-action', 'modified');
    await expect(correction.locator('.history-actor')).toHaveText(`審核員 · ${REVIEWER}`);
    await expect(correction.locator('.history-diff-item')).toHaveCount(1);
    await expect(correction.locator('.history-diff-item')).toHaveText(/^single_label: .+ → .+$/);
    await expect(correction.getByTestId('ws-history-lead-time')).toContainText('8s');

    const submit = cards.nth(1);
    await expect(submit.locator('.history-actor')).toHaveText(`標記員 · ${ANNOTATOR}`);
    await expect(submit.getByTestId('ws-history-lead-time')).toContainText('12s');
  });

  test('FR-062：其他審核員未提交的草稿事件不出現於責任鏈', async ({ page }) => {
    await skipGuidelineModal(page);
    await seedBucket(page, ANNOTATOR_BUCKET, 'submitted', CHAIN);
    await seedBucket(page, PEER_DRAFT_BUCKET, 'saved', [
      {
        action: 'draft_saved',
        role: 'reviewer',
        actorId: PEER_REVIEWER,
        at: at(2),
        summary: '同儕未送出的草稿',
      },
    ]);
    await openHistory(page);

    await expect(page.locator('#wsHistoryContainer .history-item')).toHaveCount(2);
    await expect(page.locator('#wsHistoryContainer')).not.toContainText(PEER_REVIEWER);
  });
});

import { test, expect } from '@playwright/test';
import { buildListUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #834 -- FR-096 試標歷史回饋 on annotation-list: ended rounds are
 * rendered grouped by round, each with its own modified count and ratio,
 * and the in-progress round only shows the pending note.
 *
 * Sources (change `annotation-dry-run-feedback-by-round`):
 *   spec delta FR-096 point 1 "MUST 逐回合分列計算，MUST NOT 將多個回合合併為
 *     單一分母"; scenario "下一回合進行中仍可見已結束回合之試標歷史回饋":
 *     "R{n} 之回饋 MUST 照常呈現…R{n+1} 之任何提交、定案結果與審核判斷 MUST NOT
 *     出現在回饋中，且畫面 MUST 說明 R{n+1} 需待該回合結束" / "任務轉入
 *     `official_run_in_progress` 後，已結束之各試標回合回饋 MUST 仍可見"
 *   design.md D3 (per-round groups, existing testids kept, pending note
 *     for the in-progress round; new group testids fixed by this contract).
 *
 * Contract fixed here for Green 2.2:
 *   - one `ws-dry-run-feedback-round` element per disclosed round, carrying
 *     `data-round="<n>"`, ordered by ascending round;
 *   - inside it a `ws-dry-run-feedback-round-title` naming `R<n>`, one
 *     `ws-dry-run-feedback-summary` computed over that round only, and that
 *     round's `ws-dry-run-feedback-row` elements;
 *   - `ws-dry-run-feedback-pending` shown iff a trial round is in progress.
 *
 * Fixture: R1 = one arbitrated (modified) + one approved (unchanged) sample
 * -> 2 total, 1 modified, 50%; R2 = one arbitrated sample -> 1 total,
 * 1 modified, 100%. A cumulative summary (3 total, 2 modified, 66.7%)
 * matches neither, so this pins per-round computation.
 */

const TASK_ID = 'T002';
const MY_ANNOTATOR_ID = 'kioleemg12';
const REVIEWER_ID = 'reviewer_wang';
const ARBITER_ID = 'reviewer_chen';

const R1_MODIFIED = 'emo-001';
const R1_APPROVED = 'emo-003';
const R2_MODIFIED = 'emo-002';
const R1_MARKER = 'ROUND1-LIST-834-a1';
const R2_MARKER = 'ROUND2-LIST-834-b2';

type Status = 'dry_run_in_progress' | 'waiting_iaa_confirmation' | 'official_run_in_progress';

function setRoundJs(round: number): string {
  return `window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(TASK_ID)}].materializedRuns = { dry_run: { round: ${round}, total: 10 } };`;
}

function submitJs(sampleId: string, decision: 'modify' | 'approve'): string {
  const reviewerAnswer = decision === 'modify' ? ['sad', 'angry'] : ['sad', 'fear'];
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(sampleId)},
        { previewState: { multi_label: { selected: ['sad', 'fear'] } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(sampleId)},
        {
          previewState: { multi_label: { selected: ${JSON.stringify(reviewerAnswer)} } },
          decisions: { multi_label: ${JSON.stringify(decision)} },
          reasons: ${decision === 'modify' ? "{ multi_label: 'fixture modify reason' }" : '{}'}
        }, '', identity);
    })();
  `;
}

function arbitrateJs(sampleId: string, reason: string): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(REVIEWER_ID)} };
      var items = data.getDisputeItems(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)}, identity, ['multi_label']);
      if (!items.length) throw new Error('fixture assumption broken: no dispute items');
      data.submitArbitration(${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(sampleId)},
        { annotatorId: ${JSON.stringify(MY_ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(ARBITER_ID)} },
        items.map(function (item) {
          return { itemId: item.outKey + '::' + item.key, choice: 'adopt_b',
            value: item.reviewerValues[${JSON.stringify(REVIEWER_ID)}], reason: ${JSON.stringify(reason)} };
        }));
    })();
  `;
}

async function seedTwoRounds(page: import('@playwright/test').Page, status: Status) {
  await patchDataFile(
    page,
    'annotation-workspace.data.js',
    setRoundJs(1) +
      submitJs(R1_MODIFIED, 'modify') +
      arbitrateJs(R1_MODIFIED, R1_MARKER) +
      submitJs(R1_APPROVED, 'approve') +
      setRoundJs(2) +
      submitJs(R2_MODIFIED, 'modify') +
      arbitrateJs(R2_MODIFIED, R2_MARKER) +
      `window.LabelSuiteTaskListData.tasks.find(function (t) { return t.id === ${JSON.stringify(TASK_ID)}; }).status = ${JSON.stringify(status)};`
  );
  await page.goto(buildListUrl({ task_id: TASK_ID, run_type: 'dry_run' }));
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #834: FR-096 dry-run feedback grouped per round (annotation-list)', () => {
  test('R2 in progress: ended R1 group renders with the pending note, R2 stays hidden', async ({ page }) => {
    await seedTwoRounds(page, 'dry_run_in_progress');

    await expect(page.getByTestId('ws-dry-run-feedback-pending')).toBeVisible();
    const groups = page.getByTestId('ws-dry-run-feedback-round');
    await expect(groups).toHaveCount(1);
    await expect(groups.first()).toHaveAttribute('data-round', '1');
    await expect(groups.first().getByTestId('ws-dry-run-feedback-round-title')).toContainText('R1');
    await expect(groups.first().getByTestId('ws-dry-run-feedback-row')).toHaveCount(2);
    await expect(groups.first().getByTestId('ws-dry-run-feedback-reason')).toHaveText(R1_MARKER);
    await expect(page.locator('body')).not.toContainText(R2_MARKER);
  });

  test('waiting after R2: one group per round, each summary counts its own round only', async ({ page }) => {
    await seedTwoRounds(page, 'waiting_iaa_confirmation');

    await expect(page.getByTestId('ws-dry-run-feedback-pending')).toHaveCount(0);
    const groups = page.getByTestId('ws-dry-run-feedback-round');
    await expect(groups).toHaveCount(2);

    const r1 = groups.nth(0);
    await expect(r1).toHaveAttribute('data-round', '1');
    await expect(r1.getByTestId('ws-dry-run-feedback-summary')).toContainText('共 2 筆');
    await expect(r1.getByTestId('ws-dry-run-feedback-summary')).toContainText('其中 1 筆');
    await expect(r1.getByTestId('ws-dry-run-feedback-summary')).toContainText('50%');
    await expect(r1.getByTestId('ws-dry-run-feedback-row')).toHaveCount(2);

    const r2 = groups.nth(1);
    await expect(r2).toHaveAttribute('data-round', '2');
    await expect(r2.getByTestId('ws-dry-run-feedback-round-title')).toContainText('R2');
    await expect(r2.getByTestId('ws-dry-run-feedback-summary')).toContainText('共 1 筆');
    await expect(r2.getByTestId('ws-dry-run-feedback-summary')).toContainText('100%');
    await expect(r2.getByTestId('ws-dry-run-feedback-reason')).toHaveText(R2_MARKER);
  });

  test('official_run_in_progress: ended trial rounds stay visible without a pending note', async ({ page }) => {
    await seedTwoRounds(page, 'official_run_in_progress');

    await expect(page.getByTestId('ws-dry-run-feedback-pending')).toHaveCount(0);
    const groups = page.getByTestId('ws-dry-run-feedback-round');
    await expect(groups).toHaveCount(2);
    await expect(page.getByTestId('ws-dry-run-feedback-reason')).toHaveText([R1_MARKER, R2_MARKER]);
  });
});

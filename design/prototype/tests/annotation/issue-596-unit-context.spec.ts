import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, patchDataFile, skipGuidelineModal, type RunType } from './_workspace-helpers';

/* issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task 3.5,
 * RED): the review-unit context banner loses its finalize-threshold chip,
 * the status track collapses from the five-state quorum route to FR-051's
 * three states, and the FR-070 review-decision tooltip is rewritten to
 * describe what the three-way decision actually does.
 *
 * The CURRENT implementation (annotation-workspace.config.js
 * buildReviewUnitContext() around :4046 and buildReviewStatusTrack() around
 * :3952) still renders the `定稿門檻 {x} / {n} 位審核員` chip between the
 * state pill and the flow trigger, still keys REVIEW_TRACK_ROUTES off a
 * `minReviewers >= 2` quorum column that draws 已同意／已修改 nodes, still
 * labels the branches 答案未修改／答案有修改, and still shows the pre-#596
 * tooltip copy. Every case below is expected to fail today.
 *
 * --- Decided Red contract (task 3.6's Green implementation is wrong if it
 *     disagrees with this file, not the other way round) ---
 *
 *   - Banner (FR-064 / AC-4.37): children in order are exactly
 *     `.rv-unit-chip.rv-unit-run`, `.rv-unit-state`, `.rv-flow-trigger`,
 *     `.rv-review-note`. `.rv-unit-threshold` MUST NOT exist, and the
 *     banner MUST NOT contain the string 定稿門檻 anywhere (the interim
 *     `未達定稿門檻 {x} / {n}` pill note goes with it -- FR-093 leaves no
 *     state between 待審 and a decided unit).
 *   - Track (FR-064 / AC-4.55): exactly three `role="listitem"` nodes,
 *     reading 待審 / 爭議中 / 已定稿 in that order; 已同意 and 已修改 MUST
 *     NOT render under ANY task configuration -- including a task that
 *     still carries the retired per-task reviewer-count field, which is why
 *     one case patches it back in.
 *   - Branch labels: exactly three `.review-track-branch` elements reading
 *     審核通過 / 修正或無法判定 / 仲裁後, each carrying `data-branch`,
 *     none carrying `aria-hidden` or `role="listitem"`.
 *   - Tooltip (FR-070 / AC-3.40): `ws-review-note-bubble` names the effect
 *     of all three decisions (通過 直接定稿, 修正 進爭議池待仲裁, 無法判定
 *     進爭議池且仲裁採 B 定案為無法判定) and states that neither run_type
 *     sends work back for re-annotation. It MUST NOT contain 退回,
 *     重新標記, 定稿門檻 or 多數決. The `dry_run` copy is the `official_run`
 *     copy plus ONE trailing sentence about 試標 定稿 producing no final
 *     answer -- character-for-character identical otherwise.
 *
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/
 *   specs/annotation/015-annotation-workspace/spec.md FR-064 (AC-4.37,
 *   AC-4.55), FR-070 (AC-3.40 + 說明文案與三向決策一致), FR-051, FR-093;
 *   design/system/MASTER.md §Tooltip; tasks.md task 3.5.
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';

const BANNED_COPY = ['退回', '重新標記', '定稿門檻', '多數決'];

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seed(
  page: Page,
  args: { role: string; runType: string; payload: unknown; identity: Identity }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, a.runType, 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

/* A unit the reviewer can still act on: the annotator submitted, nobody
 * reviewed yet -> 待審. FR-070's tooltip renders only on interactive units,
 * so every banner case uses this state. */
async function seedPendingUnit(page: Page, runType: RunType): Promise<void> {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: runType }));
  await seed(page, {
    role: 'annotator', runType, payload: labelPayload('sad'),
    identity: { annotatorId: ANNOTATOR },
  });
}

function gotoAsReviewer(page: Page, runType: RunType) {
  return page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: runType,
    annotator_id: ANNOTATOR, reviewer_id: REVIEWER,
  }));
}

async function openFlowDrawer(page: Page) {
  await page.getByTestId('ws-review-flow-trigger').click();
  await expect(page.getByTestId('ws-review-flow-drawer')).toBeVisible();
}

async function bubbleText(page: Page, runType: RunType): Promise<string> {
  await seedPendingUnit(page, runType);
  await gotoAsReviewer(page, runType);
  const bubble = page.getByTestId('ws-review-note-bubble');
  await expect(bubble).toHaveCount(1);
  return ((await bubble.textContent()) || '').trim();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #596 FR-064: unit-context banner without a finalize threshold', () => {
  /* FAILS TODAY: chip() appends `.rv-unit-threshold` unconditionally, so
     the count is 1 and the banner text carries 定稿門檻. */
  test('the banner has no threshold chip and never says 定稿門檻', async ({ page }) => {
    await seedPendingUnit(page, 'official_run');
    await gotoAsReviewer(page, 'official_run');

    const banner = page.getByTestId('ws-review-unit-context');
    await expect(banner).toBeVisible();
    await expect(banner.locator('.rv-unit-threshold')).toHaveCount(0);
    await expect(banner).not.toContainText('定稿門檻');
  });

  /* FAILS TODAY: the threshold chip sits third, so the class sequence reads
     run / state / threshold / trigger / note. */
  test('banner children are run chip, state pill, flow trigger, review note', async ({ page }) => {
    await seedPendingUnit(page, 'official_run');
    await gotoAsReviewer(page, 'official_run');

    const classes = await page.getByTestId('ws-review-unit-context').evaluate((el) =>
      Array.from(el.children).map((child) => child.className)
    );
    expect(classes).toHaveLength(4);
    expect(classes[0]).toContain('rv-unit-run');
    expect(classes[1]).toContain('rv-unit-state');
    expect(classes[2]).toContain('rv-flow-trigger');
    expect(classes[3]).toContain('rv-review-note');
    /* AC-4.37's second clause: the role-dependent action hint stays out. */
    await expect(page.getByTestId('ws-review-unit-context').locator('.rv-action-hint')).toHaveCount(0);
  });
});

test.describe('issue #596 FR-064: three-node review status track', () => {
  /* FAILS TODAY: buildReviewStatusTrack() still switches to the five-node
     quorum column whenever a profile carries the retired reviewer-count
     field, so this renders 已同意 and 已修改 again. FR-093 leaves exactly
     one reviewer per unit -- there is no configuration that may reintroduce
     those nodes, which is why the retired field must stop being read. */
  test('a task still carrying the retired reviewer-count field renders the same three nodes', async ({ page }) => {
    await seedPendingUnit(page, 'official_run');
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.${TASK}.minReviewers = 3;
    `);
    await gotoAsReviewer(page, 'official_run');
    await openFlowDrawer(page);

    const nodes = page.getByTestId('ws-review-flow-drawer').locator('[role="listitem"]');
    await expect(nodes).toHaveCount(3);
    await expect(page.getByTestId('ws-review-flow-drawer').locator('.review-track'))
      .not.toContainText('已同意');
  });

  /* FAILS TODAY: the labels read 答案未修改 / 答案有修改 / 仲裁後. The node
     assertions live here rather than in a case of their own because a
     single-reviewer profile ALREADY draws three nodes today (issue #525
     PR-C dropped 已同意／已修改 from the `single` column), so on their own
     they would be a green case inside a Red file. */
  test('the drawer track is 待審 / 爭議中 / 已定稿 with the new branch labels', async ({ page }) => {
    await seedPendingUnit(page, 'official_run');
    await gotoAsReviewer(page, 'official_run');
    await openFlowDrawer(page);

    const nodes = page.getByTestId('ws-review-flow-drawer').locator('[role="listitem"]');
    await expect(nodes).toHaveCount(3);
    await expect(nodes.nth(0)).toContainText('待審');
    await expect(nodes.nth(1)).toContainText('爭議中');
    await expect(nodes.nth(2)).toContainText('已定稿');
    const track = page.getByTestId('ws-review-flow-drawer').locator('.review-track');
    await expect(track).not.toContainText('已同意');
    await expect(track).not.toContainText('已修改');

    const branches = page.getByTestId('ws-review-flow-drawer').locator('.review-track-branch');
    await expect(branches).toHaveCount(3);
    await expect(branches.nth(0)).toHaveText('審核通過');
    await expect(branches.nth(1)).toHaveText('修正或無法判定');
    await expect(branches.nth(2)).toHaveText('仲裁後');

    const flags = await branches.evaluateAll((els) =>
      els.map((el) => ({
        branch: el.getAttribute('data-branch'),
        hidden: el.getAttribute('aria-hidden'),
        role: el.getAttribute('role'),
      }))
    );
    flags.forEach((flag) => {
      expect(flag.branch).toBeTruthy();
      expect(flag.hidden).toBeNull();
      expect(flag.role).toBeNull();
    });
  });
});

test.describe('issue #596 FR-070: review-decision tooltip matches the three-way model', () => {
  /* FAILS TODAY: the copy still describes 通過 as "採用目前顯示的作答" and
     never mentions 爭議池 or 仲裁 at all. */
  test('the bubble states what 通過 / 修正 / 無法判定 actually do', async ({ page }) => {
    const text = await bubbleText(page, 'official_run');

    expect(text).toContain('通過');
    expect(text).toContain('直接定稿');
    expect(text).toContain('修正');
    expect(text).toContain('不會立即生效');
    expect(text).toContain('無法判定');
    expect(text).toContain('爭議池');
    expect(text).toContain('仲裁');
    /* FR-070 point 4: neither run_type sends work back to be re-annotated. */
    expect(text).toMatch(/不.*(重做|重新)/);
  });

  /* PASSES TODAY on the banned strings (the old copy happens to avoid
     them) but FAILS on the surrounding contract assertions, which is
     deliberate: this case exists so task 3.6's rewrite cannot reintroduce
     a retired mechanism while adding the new sentences. */
  test('the bubble never names a retired mechanism', async ({ page }) => {
    const text = await bubbleText(page, 'official_run');
    BANNED_COPY.forEach((banned) => expect(text).not.toContain(banned));
    /* Guard against the assertion above passing on an empty read. */
    expect(text.length).toBeGreaterThan(40);
    expect(text).toContain('爭議池');
  });

  /* FAILS TODAY: `reviewNote` is one run_type-independent string, so the
     dry_run text equals the official_run text and the extra-sentence slice
     is empty. */
  test('dry_run copy is the official_run copy plus one 試標 sentence', async ({ page }) => {
    const official = await bubbleText(page, 'official_run');

    const dry = await bubbleText(page, 'dry_run');

    expect(dry.startsWith(official)).toBeTruthy();
    const extra = dry.slice(official.length);
    expect(extra).toContain('試標');
    expect(extra).toContain('不產生最終答案');
    expect(extra).toContain('一致性');
    expect(extra).toContain('被修改率');
    BANNED_COPY.forEach((banned) => expect(extra).not.toContain(banned));
  });
});

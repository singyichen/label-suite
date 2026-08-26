import { test, expect, type Page } from '@playwright/test';

/* Pre-decision arbitration context (issue #454, spec 015 v4.29.0).
 *
 * Before this change the arbitration card showed two bare candidate values
 * (`A・標記員：neutral` / `B・審核員：positive`) with no indication of WHY the
 * unit reached the dispute pool: how many reviewers had submitted, what the
 * finalization quorum was, how the votes were distributed across candidate
 * values, and which strict-majority condition (`> N / 2`) failed. An arbiter
 * could only guess whether A had any reviewer support at all.
 *
 * The four scenarios below are all real seeded review units, so nothing here
 * depends on a task id branch in production code -- every number is derived
 * from the reviewer submissions of the unit under test:
 *   T017 / oft-01-even-tie        min_reviewers 2, 1:1 even tie
 *   T016 / ofm-05-all-divergent   min_reviewers 3, 1/1/1 all divergent
 *   T016 / ofm-04-majority-converged  converged -> never an arbitration card
 *
 * Data Fairness (constitution NON-NEGOTIABLE): the vote context is derived
 * from submitted answers only -- no ground truth / gold column is ever read.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-074, AC-4.30
 */

const WORKSPACE_URL = '/pages/annotation/annotation-workspace.html';
const ARBITER = 'reviewer_chen'; // the only can_arbitrate reviewer outside every seeded dispute

function openAsArbiter(page: Page, taskId: string, sampleId: string) {
  return page.goto(
    `${WORKSPACE_URL}?task_id=${taskId}&sample_id=${sampleId}` +
      `&role=reviewer&run_type=official_run&reviewer_id=${ARBITER}`,
  );
}

function tallies(page: Page) {
  return page.getByTestId('ws-arbitration-vote-tally');
}

function tallyFor(page: Page, value: string) {
  return page.locator(`[data-testid="ws-arbitration-vote-tally"][data-value="${value}"]`);
}

test.describe('issue #454 -- arbitration card explains why the unit is disputed', () => {
  test('T017 oft-01-even-tie: 1:1 tie, per-value tallies and quorum context', async ({ page }) => {
    await openAsArbiter(page, 'T017', 'oft-01-even-tie');

    const card = page.getByTestId('ws-arbitration-card');
    await expect(card).toBeVisible();

    /* Submitted reviewers vs. the finalization threshold, so the arbiter can
       tell "1:1 tie" apart from "quorum not reached yet". */
    const quorum = page.getByTestId('ws-arbitration-quorum');
    await expect(quorum).toContainText('已提交審核員 2 位');
    await expect(quorum).toContainText('定稿門檻 2 位');

    /* Both candidate values, each with its vote count and share. The
       annotator's own answer (neutral) is marked so the arbiter sees that A
       is not merely the annotator's unilateral claim -- one reviewer agreed
       with it by submitting the same value. */
    await expect(tallies(page)).toHaveCount(2);
    await expect(tallyFor(page, 'neutral')).toHaveAttribute('data-count', '1');
    await expect(tallyFor(page, 'neutral')).toContainText('50%');
    await expect(tallyFor(page, 'neutral')).toHaveAttribute('data-annotator', 'true');
    await expect(tallyFor(page, 'positive')).toHaveAttribute('data-count', '1');
    await expect(tallyFor(page, 'positive')).toContainText('50%');
    await expect(tallyFor(page, 'positive')).not.toHaveAttribute('data-annotator', 'true');

    /* The failed convergence condition, spelled out with the actual strict
       majority threshold (> N / 2 = > 1 for N = 2). */
    const reason = page.getByTestId('ws-arbitration-vote-reason');
    await expect(reason).toHaveAttribute('data-reason', 'even_tie');
    await expect(reason).toContainText('平手');
    await expect(reason).toContainText('1：1');
    await expect(reason).toContainText('> 1');
  });

  test('T016 ofm-05-all-divergent: 1/1/1 all-divergent reason, three tallies', async ({ page }) => {
    await openAsArbiter(page, 'T016', 'ofm-05-all-divergent');

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();

    const quorum = page.getByTestId('ws-arbitration-quorum');
    await expect(quorum).toContainText('已提交審核員 3 位');
    await expect(quorum).toContainText('定稿門檻 3 位');

    await expect(tallies(page)).toHaveCount(3);
    for (const value of ['neutral', 'positive', 'negative']) {
      await expect(tallyFor(page, value)).toHaveAttribute('data-count', '1');
      await expect(tallyFor(page, value)).toContainText('33%');
    }
    await expect(tallyFor(page, 'neutral')).toHaveAttribute('data-annotator', 'true');

    const reason = page.getByTestId('ws-arbitration-vote-reason');
    await expect(reason).toHaveAttribute('data-reason', 'all_divergent');
    await expect(reason).toContainText('全數分歧');
    await expect(reason).toContainText('1：1：1');
    await expect(reason).toContainText('> 1.5');
  });

  test('a converged unit never reaches the arbitration card', async ({ page }) => {
    await openAsArbiter(page, 'T016', 'ofm-04-majority-converged');

    /* neutral 2 > 3/2 converges per FR-061, so the unit is 已定稿: the
       read-only finalized card renders and no arbitration context exists. */
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-arbitration-vote-tally')).toHaveCount(0);
    await expect(page.getByTestId('ws-arbitration-vote-reason')).toHaveCount(0);
  });

  test('a single dissenting reviewer is explained by the N < 2 rule, not by > N/2', async ({ page }) => {
    await openAsArbiter(page, 'T015', 'ofs-02-modified-dispute');

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expect(page.getByTestId('ws-arbitration-quorum')).toContainText('已提交審核員 1 位');

    /* T015 runs min_reviewers = 1, so the lone dissenting reviewer holds 1 of
       1 votes -- arithmetically a strict majority. FR-061 blocks convergence
       below N = 2 anyway, so explaining this unit as "no strict majority"
       would contradict the rule that actually kept it open. */
    const reason = page.getByTestId('ws-arbitration-vote-reason');
    await expect(reason).toHaveAttribute('data-reason', 'single_reviewer');
    await expect(reason).toContainText('單一審核員不足以推翻標記員答案');
    await expect(reason).not.toContainText('嚴格多數');
  });

  test('vote context is anonymous: aggregate counts without reviewer identity', async ({ page }) => {
    await openAsArbiter(page, 'T016', 'ofm-05-all-divergent');

    const votes = page.getByTestId('ws-arbitration-votes');
    await expect(votes).toHaveCount(1);

    /* Identity disclosure obeys blind review: the pre-decision context never
       attributes a value to a named reviewer, yet the aggregate tally is
       still fully available (3 values x 1 vote). */
    const text = (await votes.innerText()).replace(/\s+/g, '');
    expect(text).not.toContain('reviewer_');
    expect(text).not.toContain('王小明');
    expect(text).not.toContain('李大華');
    expect(text).not.toContain('林佳蓉');
    await expect(page.getByTestId('ws-finalized-vote')).toHaveCount(0);
    await expect(tallies(page)).toHaveCount(3);
  });

  test('the vote context is scoped per dispute item and states what arbitration does', async ({ page }) => {
    await openAsArbiter(page, 'T017', 'oft-01-even-tie');

    /* One votes block per dispute item, nested inside that item's row, so a
       multi-item unit cannot show a single merged tally. */
    const item = page.getByTestId('ws-arbitration-item');
    await expect(item).toHaveCount(1);
    await expect(item.getByTestId('ws-arbitration-votes')).toHaveCount(1);
    await expect(item.getByTestId('ws-arbitration-vote-reason')).toHaveCount(1);

    /* Arbitration finalizes a value per disputed item; it is not a re-annotation. */
    await expect(page.getByTestId('ws-arbitration-card')).toContainText('不重新標記');
  });
});

import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* FR-093 指派結果於 annotation-list 生效 (spec 015 v5.0.0, issue #596 群組 4).
 *
 * Task 1.5 derived the assignment and exported getAssignedReviewUnits(), but
 * nothing in groups 1-7 called it, so FR-093 was implemented and inert: every
 * reviewer still saw all fifteen review units of T001. This file is the
 * contract for wiring it in.
 *
 * Absence, not disablement, is the requirement. A greyed-out row for someone
 * else's unit still shows that reviewer the sample text and the annotator's
 * answer, which is work they were not given and context they do not need.
 *
 * The two run types differ only in granularity (FR-093 calls this their ONLY
 * process difference): official_run spreads units evenly, dry_run hands one
 * reviewer every annotator's take on the same sample, so a sample's units
 * appear together or not at all.
 *
 * FR-060 rides on top of this and is asserted here too, because a naive
 * assignment filter silently voids it. An arbiter is eligible precisely
 * BECAUSE they have no submission on the unit -- i.e. because they are not
 * its assigned reviewer -- so filtering to assigned units alone removes
 * every row on which 仲裁 could ever appear, and FR-060's MUST would become
 * unreachable without a single test going red. The visible set is therefore
 * the union: units assigned to me, plus disputed units I may arbitrate.
 */

const TASK = 'T001';
const OFFICIAL = 'official_run' as const;

/* FR-093's per_unit round-robin over T001's 15 units and the 4-reviewer
   roster. Sorted by sample_id then annotator_id, so these are derived, not
   chosen -- they are here as a concrete anchor for the relational
   assertions, which alone could be satisfied by an empty list. */
const OFFICIAL_ASSIGNMENT: Record<string, string[]> = {
  reviewer_wang: ['sent-001/113450022', 'sent-002/kioleemg12', 'sent-003/tony0950127', 'sent-005/113450022'],
  reviewer_lin: ['sent-002/113450022', 'sent-003/kioleemg12', 'sent-004/tony0950127'],
};

/* dry_run round-robins over DISTINCT samples: 5 samples over 4 reviewers, so
   reviewer_wang draws sent-001 and sent-005 whole. */
const DRY_RUN_SAMPLES = ['sent-001', 'sent-005'];
const ANNOTATORS_PER_SAMPLE = 3;

const DISPUTE = { sample: 'sent-001', annotator: 'kioleemg12' };
/* the assigned reviewer of the disputed unit, hence a participant */
const PARTICIPANT = 'reviewer_li';
/* can_arbitrate and holds no submission on that unit -- and is NOT its
   assigned reviewer, which is the whole point */
const ARBITER = 'reviewer_chen';

function gotoList(page: Page, reviewerId: string, runType: 'official_run' | 'dry_run' = OFFICIAL) {
  return page.goto(buildListUrl({
    task_id: TASK, role: 'reviewer', run_type: runType, reviewer_id: reviewerId,
  }));
}

/* the rendered rows as "sample/annotator", the same shape FR-093 addresses a
   review unit by */
async function visibleUnits(page: Page): Promise<string[]> {
  return page.getByTestId('ws-sample-item').evaluateAll((rows) =>
    rows.map((row) => {
      const id = row.querySelector('[data-testid="list-review-id"]');
      const annotator = row.querySelector('[data-testid="list-review-annotator"]');
      return `${(id?.textContent || '').trim()}/${(annotator?.textContent || '').trim()}`;
    })
  );
}

type SeedArgs = { role: string; selected: string; identity: { annotatorId?: string; reviewerId?: string } };

function seed(page: Page, args: SeedArgs): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        markSampleSubmitted: (
          taskId: string, role: string, runType: string, sampleId: string,
          payload: unknown, historySummary: string,
          identity: { annotatorId?: string; reviewerId?: string }
        ) => void;
      };
    }).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      'T001', a.role, 'official_run', 'sent-001',
      { previewState: { single_label: { selected: a.selected } } }, '', a.identity
    );
  }, args);
}

test.describe('FR-093 official_run：逐單位平均分派', () => {
  test('審核員只看到指派給自己的審核單位', async ({ page }) => {
    await gotoList(page, 'reviewer_wang');

    expect((await visibleUnits(page)).sort()).toEqual([...OFFICIAL_ASSIGNMENT.reviewer_wang].sort());
  });

  test('未指派給自己的單位整列不存在，而非僅停用按鈕', async ({ page }) => {
    await gotoList(page, 'reviewer_wang');

    /* sent-001/kioleemg12 belongs to reviewer_li. The row must be gone --
       a disabled button would still leak the sample text and the answer. */
    const foreign = page
      .getByTestId('ws-sample-item')
      .filter({ hasText: DISPUTE.sample })
      .filter({ has: page.getByTestId('list-review-annotator').getByText(DISPUTE.annotator) });
    await expect(foreign).toHaveCount(0);
  });

  test('兩位審核員所見筆數差 ≤ 1 且無交集', async ({ page }) => {
    await gotoList(page, 'reviewer_wang');
    const wang = await visibleUnits(page);
    await gotoList(page, 'reviewer_lin');
    const lin = await visibleUnits(page);

    expect(wang.length).toBeGreaterThan(0);
    expect(lin.length).toBeGreaterThan(0);
    expect(Math.abs(wang.length - lin.length)).toBeLessThanOrEqual(1);
    expect(wang.filter((unit) => lin.indexOf(unit) >= 0)).toEqual([]);
  });
});

test.describe('FR-093 dry_run：同一樣本的單位同進同出', () => {
  test('指派到的樣本，其全部標記員單位都在；其餘樣本一列不出現', async ({ page }) => {
    await gotoList(page, 'reviewer_wang', 'dry_run');
    const units = await visibleUnits(page);

    expect(units).toHaveLength(DRY_RUN_SAMPLES.length * ANNOTATORS_PER_SAMPLE);

    /* every visible row belongs to an assigned sample... */
    const samples = units.map((unit) => unit.split('/')[0]);
    expect([...new Set(samples)].sort()).toEqual([...DRY_RUN_SAMPLES].sort());
    /* ...and each assigned sample brought its whole group, never a subset */
    DRY_RUN_SAMPLES.forEach((sample) => {
      expect(samples.filter((s) => s === sample)).toHaveLength(ANNOTATORS_PER_SAMPLE);
    });
  });
});

test.describe('FR-060 指派過濾不得使仲裁入口消失', () => {
  test.beforeEach(async ({ page }) => {
    await gotoList(page, ARBITER);
    await seed(page, { role: 'annotator', selected: 'positive', identity: { annotatorId: DISPUTE.annotator } });
    await seed(page, {
      role: 'reviewer',
      selected: 'negative',
      identity: { annotatorId: DISPUTE.annotator, reviewerId: PARTICIPANT },
    });
  });

  test('具資格的仲裁者看得到未指派給自己的爭議單位', async ({ page }) => {
    await gotoList(page, ARBITER);
    const units = await visibleUnits(page);

    /* not among reviewer_chen's four assigned units, yet present -- because
       the dispute is claimable by them */
    expect(units).toContain(`${DISPUTE.sample}/${DISPUTE.annotator}`);

    const row = page
      .getByTestId('ws-sample-item')
      .filter({ has: page.getByTestId('list-review-annotator').getByText(DISPUTE.annotator) })
      .filter({ hasText: '爭議中' });
    await expect(row.getByTestId('list-arbitrate-entry')).toHaveText('仲裁');
  });

  test('無仲裁資格者仍看不到未指派給自己的爭議單位', async ({ page }) => {
    /* reviewer_wang is not flagged can_arbitrate, so the dispute buys them
       nothing: the row stays absent exactly as it was before it became
       disputed. Without this, "show disputed units too" would degrade into
       "show everyone everything once anything is contested". */
    await gotoList(page, 'reviewer_wang');

    expect(await visibleUnits(page)).not.toContain(`${DISPUTE.sample}/${DISPUTE.annotator}`);
  });
});

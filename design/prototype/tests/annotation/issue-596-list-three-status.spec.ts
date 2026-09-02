import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, patchDataFile } from './_workspace-helpers';

/* annotation-list 三態狀態篩選與仲裁入口 (spec 015 v5.0.0, issue #596 群組 4).
 *
 * FR-055 / AC-1.26: the reviewer status filter MUST offer exactly the three
 * REVIEW_UNIT_STATUS values (待審 / 爭議中 / 已定稿) and MUST derive that list
 * from the constant rather than enumerating it in the select. The old
 * five-state order array survived group 1's removal of APPROVED/MODIFIED,
 * so the select currently renders two dead options whose value is the
 * string "undefined" and whose label falls through to the 全部 branch.
 *
 * FR-060 / AC-4.53: a disputed row swaps 編輯 for 仲裁 only for a reviewer who
 * is both flagged can_arbitrate and not a participant in that dispute.
 * annotation-list-dispute-entry.spec.ts owns the full eligibility matrix
 * (bystander / non-disputed rows); this file pins the pair that AC-4.53
 * names so the three-state filter and the arbitration entry stay verified
 * together.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
/* FR-093 assigns (sent-001, kioleemg12) to reviewer_li under official_run's
 * per_unit round-robin, so the participant here is also the unit's assigned
 * reviewer -- the row stays visible once task 4.7 filters by assignment. */
const PARTICIPANT = 'reviewer_li';
const ARBITER = 'reviewer_chen'; // can_arbitrate: true, no submission on this unit

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

function gotoList(page: Page, reviewerId: string) {
  return page.goto(buildListUrl({
    task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: reviewerId,
  }));
}

async function optionValues(page: Page): Promise<string[]> {
  return page.locator('#statusFilter option').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLOptionElement).value)
  );
}

test.describe('AC-1.26 reviewer 狀態篩選為三態', () => {
  test('選項恰為 待審 / 爭議中 / 已定稿', async ({ page }) => {
    await gotoList(page, ARBITER);

    expect(await optionValues(page)).toEqual(['', 'pending', 'disputed', 'finalized']);

    const texts = await page.locator('#statusFilter option').allTextContents();
    expect(texts).toEqual(['全部審核狀態', '待審', '爭議中', '已定稿']);
    expect(texts.join('|')).not.toContain('已同意');
    expect(texts.join('|')).not.toContain('已修改');
  });

  test('選單由 REVIEW_UNIT_STATUS 推導，而非於選單硬編狀態清單', async ({ page }) => {
    /* A state added to the data layer's constant must reach the select on its
       own. A hardcoded order array cannot see it, which is exactly what this
       asserts -- no production file is touched, the fixture is patched at
       request time. */
    await patchDataFile(
      page,
      'annotation-workspace.data.js',
      "window.LabelSuiteAnnotationWorkspaceData.REVIEW_UNIT_STATUS.PROBE = 'zz_probe';"
    );
    await gotoList(page, ARBITER);

    expect(await optionValues(page)).toEqual(['', 'pending', 'disputed', 'finalized', 'zz_probe']);
  });

  test('annotator 檢視維持既有三態，不受 reviewer 收斂影響', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'annotator', run_type: 'official_run' }));

    expect(await optionValues(page)).toEqual(['', 'submitted', 'saved', 'pending']);
  });
});

test.describe('AC-4.53 爭議中列的仲裁入口', () => {
  test.beforeEach(async ({ page }) => {
    await gotoList(page, ARBITER);
    await seed(page, { role: 'annotator', selected: 'positive', identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      selected: 'negative',
      identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
    });
    await page.reload();
  });

  function disputedRow(page: Page) {
    return page
      .getByTestId('ws-sample-item')
      .filter({ has: page.getByTestId('list-review-annotator').getByText(ANNOTATOR) })
      .filter({ hasText: '爭議中' });
  }

  test('具仲裁資格者於爭議中列看到 仲裁', async ({ page }) => {
    const entry = disputedRow(page).getByTestId('list-arbitrate-entry');
    await expect(entry).toHaveText('仲裁');

    await entry.click();
    const url = new URL(page.url());
    expect(url.searchParams.get('sample_id')).toBe(SAMPLE);
    expect(url.searchParams.get('annotator_id')).toBe(ANNOTATOR);
    expect(url.searchParams.get('reviewer_id')).toBe(ARBITER);
  });

  test('已對該單位提交審核者看到 編輯', async ({ page }) => {
    await gotoList(page, PARTICIPANT);

    const row = disputedRow(page);
    await expect(row.getByTestId('list-arbitrate-entry')).toHaveCount(0);
    await expect(row.locator('.mini-btn-primary')).toHaveText('編輯');
  });
});

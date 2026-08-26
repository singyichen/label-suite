import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Dispute-pool list entry (spec 015 v4.7.0, issue #147 P3b).
 *
 * The five-state filter has offered 爭議中 since v4.2.0, but no test ever
 * drove a unit INTO that state from the list side, and a disputed row gave
 * an arbitration-eligible reviewer no way to tell it apart from ordinary
 * review work. This file pins the positive path:
 *   - a genuinely disputed unit surfaces through the 爭議中 filter, and
 *   - its row action reads 仲裁 for a reviewer who may claim it
 *     (can_arbitrate flag AND not a participant in the dispute),
 *     while participants and non-arbiters keep the plain 編輯 entry.
 * The workspace-side arbitration layout arrives in P3c; navigation here
 * only has to carry the full review-unit identity.
 */

type SeedArgs = {
  role: string;
  payload: unknown;
  identity: { annotatorId?: string; reviewerId?: string };
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang'; // submitted the differing decision
const BYSTANDER = 'reviewer_li'; // no submission, but no can_arbitrate flag
const ARBITER = 'reviewer_chen'; // can_arbitrate: true, not a participant

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
      'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
    );
  }, args);
}

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

/* Annotator says sad, reviewer_wang says fear -> with min_reviewers = 1 the
 * unit derives straight to disputed (FR-051). */
async function seedDisputedUnit(page: Page): Promise<void> {
  await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
  await seed(page, {
    role: 'reviewer',
    payload: labelPayload('fear'),
    identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
  });
}

function gotoList(page: Page, reviewerId: string) {
  return page.goto(buildListUrl({
    task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: reviewerId,
  }));
}

function disputedRow(page: Page) {
  return page
    .getByTestId('ws-sample-item')
    .filter({ has: page.getByTestId('list-review-annotator').getByText(ANNOTATOR) })
    .filter({ hasText: '爭議中' });
}

test.beforeEach(async ({ page }) => {
  await gotoList(page, ARBITER);
  await seedDisputedUnit(page);
  await page.reload();
});

test.describe('爭議中 filter: positive path', () => {
  test('a disputed unit surfaces through the disputed filter', async ({ page }) => {
    await page.locator('#statusFilter').selectOption('disputed');

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.status-badge')).toHaveText('爭議中 · 未定稿');
    await expect(rows.first().getByTestId('list-review-annotator')).toHaveText(ANNOTATOR);
  });
});

test.describe('arbitration entry on disputed rows', () => {
  test('an eligible arbiter sees 仲裁 and it carries the unit identity', async ({ page }) => {
    const entry = disputedRow(page).getByTestId('list-arbitrate-entry');
    await expect(entry).toHaveText('仲裁');

    await entry.click();
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    const url = new URL(page.url());
    expect(url.searchParams.get('task_id')).toBe(TASK);
    expect(url.searchParams.get('sample_id')).toBe(SAMPLE);
    expect(url.searchParams.get('annotator_id')).toBe(ANNOTATOR);
    expect(url.searchParams.get('reviewer_id')).toBe(ARBITER);
  });

  test('a dispute participant keeps the plain 編輯 entry', async ({ page }) => {
    await gotoList(page, PARTICIPANT);

    const row = disputedRow(page);
    await expect(row.getByTestId('list-arbitrate-entry')).toHaveCount(0);
    await expect(row.locator('.mini-btn-primary')).toHaveText('編輯');
  });

  test('a non-participant without the can_arbitrate flag keeps 編輯', async ({ page }) => {
    await gotoList(page, BYSTANDER);

    const row = disputedRow(page);
    await expect(row.getByTestId('list-arbitrate-entry')).toHaveCount(0);
    await expect(row.locator('.mini-btn-primary')).toHaveText('編輯');
  });

  test('non-disputed rows never offer 仲裁, even to an arbiter', async ({ page }) => {
    const pendingRows = page
      .getByTestId('ws-sample-item')
      .filter({ hasText: '待審' });
    await expect(pendingRows.first()).toBeVisible();
    await expect(page.getByTestId('list-arbitrate-entry')).toHaveCount(1); // only the one disputed row
  });
});

import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Per-sample tri-state list rows (spec 015 FR-007B) and the quick-continue
 * "latest unfinished sample" rule (FR-004B, spec 015: prefer the LAST
 * pending record, else the last saved record, else fall back to the task's
 * last record).
 *
 * Sample state is seeded directly into the workspace submission store
 * (labelsuite.wsSubmissions) — the same store annotation-workspace.data.js
 * writes — so these list-side specs don't have to drive the full workspace
 * UI per sample.
 *
 * The bucket key gained its identity dimensions in spec 015 v3.8.0
 * (FR-049): `taskId::role::runType::annotatorId::reviewerId`, where an
 * annotator bucket has no reviewer dimension and carries '-' so every key
 * keeps the same arity. These specs open the list without identity params,
 * so both pages resolve the default roster annotator. */
const DEFAULT_ANNOTATOR_BUCKET = 'T001::annotator::official_run::kioleemg12::-';

function seedSubmissionStore(page: Page, bucket: Record<string, { status: string }>) {
  return page.addInitScript(
    ([key, bucketJson]) => {
      window.localStorage.setItem('labelsuite.wsSubmissions', JSON.stringify({ [key]: JSON.parse(bucketJson) }));
    },
    [DEFAULT_ANNOTATOR_BUCKET, JSON.stringify(bucket)]
  );
}

function entry(status: 'submitted' | 'saved') {
  return { status, answers: {} };
}

test.describe('Per-sample status rows (FR-007B)', () => {
  test('rows reflect per-sample submitted / saved / pending status', async ({ page }) => {
    await seedSubmissionStore(page, {
      'sent-001': entry('submitted'),
      'sent-002': entry('saved'),
    });
    await page.goto(buildListUrl({ task_id: 'T001' }));

    const rows = page.getByTestId('ws-sample-item');
    await expect(rows.filter({ hasText: 'sent-001' }).locator('.status-badge')).toHaveText('已提交');
    await expect(rows.filter({ hasText: 'sent-002' }).locator('.status-badge')).toHaveText('已儲存');
    await expect(rows.filter({ hasText: 'sent-003' }).locator('.status-badge')).toHaveText('待處理');
  });

  test('the saved status filter narrows rows and clear restores them', async ({ page }) => {
    await seedSubmissionStore(page, {
      'sent-001': entry('submitted'),
      'sent-002': entry('saved'),
    });
    await page.goto(buildListUrl({ task_id: 'T001' }));

    await page.locator('#statusFilter').selectOption('saved');
    const rows = page.getByTestId('ws-sample-item');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('sent-002');

    await page.locator('#clearFiltersBtn').click();
    await expect(rows).toHaveCount(5);
  });
});

test.describe('Quick-continue latest-unfinished rule (FR-004B)', () => {
  test('with no progress it opens the last pending record', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001' }));
    await page.getByTestId('list-quick-continue-btn').click();
    await expect(page).toHaveURL(/sample_id=sent-005/);
  });

  test('submitted records are skipped — it opens the last still-pending record', async ({ page }) => {
    await seedSubmissionStore(page, {
      'sent-004': entry('submitted'),
      'sent-005': entry('submitted'),
    });
    await page.goto(buildListUrl({ task_id: 'T001' }));
    await page.getByTestId('list-quick-continue-btn').click();
    await expect(page).toHaveURL(/sample_id=sent-003/);
  });

  test('with no pending records it opens the last saved record', async ({ page }) => {
    await seedSubmissionStore(page, {
      'sent-001': entry('submitted'),
      'sent-002': entry('saved'),
      'sent-003': entry('submitted'),
      'sent-004': entry('submitted'),
      'sent-005': entry('submitted'),
    });
    await page.goto(buildListUrl({ task_id: 'T001' }));
    await page.getByTestId('list-quick-continue-btn').click();
    await expect(page).toHaveURL(/sample_id=sent-002/);
  });

  test('with everything submitted it falls back to the last record', async ({ page }) => {
    await seedSubmissionStore(page, {
      'sent-001': entry('submitted'),
      'sent-002': entry('submitted'),
      'sent-003': entry('submitted'),
      'sent-004': entry('submitted'),
      'sent-005': entry('submitted'),
    });
    await page.goto(buildListUrl({ task_id: 'T001' }));
    await page.getByTestId('list-quick-continue-btn').click();
    await expect(page).toHaveURL(/sample_id=sent-005/);
  });
});

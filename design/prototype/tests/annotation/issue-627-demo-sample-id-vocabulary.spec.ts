import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildListUrl } from './_workspace-helpers';

/* Issue #627 item 3 (OpenSpec change rename-misleading-review-sample-ids).
 *
 * T016's review units are string-coupled across three consumers: the
 * workspace answer seed (map key) plus its review seed row, task-detail's
 * REVIEW_FLOW_UNITS copy, and the docs/product/example-data fixture. Two ids
 * still encode interim states that v5.0.0 removed from REVIEW_UNIT_STATUS
 * (`approved`, `modified`). This suite pins the renamed ids on every consumer
 * AND that each one still resolves to a rendered, correctly-derived unit --
 * a partial rename leaves the seed row without an answer and the row silently
 * disappears, so "the old id is gone" alone would pass on a broken rename.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-044,
 *   AC-4.31, AC-4.36; openspec/changes/rename-misleading-review-sample-ids
 */

const RETIRED_STATE_WORD = /approved|modified/;
const RENAMED: Record<string, string> = {
  'ofm-02-reviewer-accepts-a': '已定稿 · 已鎖定',
  'ofm-03-awaiting-arbitration': '爭議中 · 未定稿',
};
const ROSTER = ['reviewer_wang', 'reviewer_li', 'reviewer_chen', 'reviewer_lin'] as const;

/* A unit may show on two reviewer lists (assignee + eligible arbiter,
   FR-060), so the four views are merged by sample id. */
async function t016BadgesBySampleId(page: Page): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const reviewerId of ROSTER) {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: reviewerId }));
    const rows = page.getByTestId('ws-sample-item');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const sampleId = (await rows.nth(i).getByTestId('list-review-id').innerText()).trim();
      map.set(sampleId, (await rows.nth(i).locator('.status-badge').innerText()).trim());
    }
  }
  return map;
}

test.describe('T016 demo sample ids carry no retired review-state word (issue #627 item 3)', () => {
  test('workspace reviewer lists: all 5 units render, none named after a retired state, renamed ids derive their scripted state', async ({ page }) => {
    const badges = await t016BadgesBySampleId(page);
    expect(badges.size).toBe(5);
    for (const sampleId of badges.keys()) {
      expect(sampleId, sampleId).not.toMatch(RETIRED_STATE_WORD);
    }
    for (const [sampleId, badge] of Object.entries(RENAMED)) {
      expect(badges.get(sampleId), sampleId).toBe(badge);
    }
  });

  test('task-detail annotation results: the renamed ids list as T016 summary rows', async ({ page }) => {
    await page.goto('/pages/task-management/task-detail.html?task_id=T016&tab=annotation-results');
    const summaryRows = page.locator('#arResultTableBody tr.ar-summary-row');
    await expect(summaryRows.first()).toBeVisible({ timeout: 15000 });
    const texts = await summaryRows.allInnerTexts();
    expect(texts.join('\n')).not.toMatch(/ofm-\d+-(approved|modified)-/);
    for (const sampleId of Object.keys(RENAMED)) {
      await expect(summaryRows.filter({ hasText: sampleId }), sampleId).toHaveCount(1);
    }
  });

  test('docs example-data fixture uses the same renamed ids', () => {
    const fixturePath = resolve(__dirname, '../../../../docs/product/example-data/review-flow-official-multi.json');
    const ids = (JSON.parse(readFileSync(fixturePath, 'utf8')) as Array<{ id: string }>).map((row) => row.id);
    for (const id of ids) {
      expect(id, id).not.toMatch(RETIRED_STATE_WORD);
    }
    for (const sampleId of Object.keys(RENAMED)) {
      expect(ids).toContain(sampleId);
    }
  });
});

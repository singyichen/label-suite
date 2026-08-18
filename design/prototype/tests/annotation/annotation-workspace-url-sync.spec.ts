import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* The address bar tracks the displayed review unit (issue #151).
 *
 * The workspace read `sample_id` once at boot and never wrote it back, so the
 * URL stayed pinned to the entry sample forever: a reload jumped back to it,
 * a copied link opened someone else's sample, and Back/Forward did nothing.
 *
 * Since v4.3.0 a URL addresses a review UNIT, not a sample, so the reviewer's
 * `annotator_id` has to travel with `sample_id` -- syncing only the sample
 * would reload onto the default annotator, i.e. a different unit than the one
 * on screen.
 */

function paramsOf(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

test.describe('Switching samples syncs sample_id', () => {
  test('annotator: 下一筆 rewrites sample_id to the displayed record', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await page.getByTestId('ws-next-btn').click();

    // An annotator entry renders an ordinal + text preview, not the sample id,
    // so position is what identifies it (the reviewer entries carry the id).
    await expect(page.getByTestId('ws-sample-item').nth(1)).toHaveClass(/active/);
    expect(paramsOf(page.url()).get('sample_id')).toBe('sent-002');
  });

  test('annotator: clicking a list entry rewrites sample_id', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await page.getByTestId('ws-sample-item').nth(3).click();

    expect(paramsOf(page.url()).get('sample_id')).toBe('sent-004');
  });

  test('annotator: no annotator_id is injected when the entry URL had none', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await page.getByTestId('ws-next-btn').click();

    // An annotator's identity never changes while stepping; writing it in
    // would put a param in the URL the entry link never carried.
    expect(paramsOf(page.url()).has('annotator_id')).toBe(false);
  });
});

test.describe('Reviewers sync both halves of the review unit', () => {
  test('下一筆 within a sample rewrites annotator_id and keeps sample_id', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'dry_run',
        annotator_id: 'kioleemg12',
      })
    );

    await page.getByTestId('ws-next-btn').click();

    await expect(page.locator('.sample-item.active').getByTestId('ws-sample-annotator')).toHaveText('113450022');
    const params = paramsOf(page.url());
    expect(params.get('sample_id')).toBe('sent-001');
    expect(params.get('annotator_id')).toBe('113450022');
  });

  test('a reload lands on the same review unit, not the entry one', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'dry_run',
        annotator_id: 'kioleemg12',
      })
    );

    await page.getByTestId('ws-next-btn').click();
    await page.getByTestId('ws-next-btn').click();
    await page.reload();

    const active = page.locator('.sample-item.active');
    await expect(active).toContainText('sent-001');
    await expect(active.getByTestId('ws-sample-annotator')).toHaveText('tony0950127');
    // tony0950127 answered positive on sent-001; the seeded panel proves the
    // reload restored the unit rather than merely the sample.
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a reviewer arriving without annotator_id gets the displayed one written in', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await page.getByTestId('ws-sample-item').nth(2).click();

    expect(paramsOf(page.url()).get('annotator_id')).toBe('tony0950127');
  });
});

test.describe('The rewrite replaces rather than stacks history', () => {
  test('stepping many times does not grow the history stack', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    const before = await page.evaluate(() => window.history.length);
    await page.getByTestId('ws-next-btn').click();
    await page.getByTestId('ws-next-btn').click();
    await page.getByTestId('ws-next-btn').click();

    expect(paramsOf(page.url()).get('sample_id')).toBe('sent-004');
    // pushState here would make 上一頁 walk back one sample at a time, so
    // leaving the workspace would take as many Backs as samples visited.
    expect(await page.evaluate(() => window.history.length)).toBe(before);
  });
});

test.describe('The rewrite preserves the rest of the query string', () => {
  test('task_id / role / run_type survive and no unknown param appears', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: 'kioleemg12',
        reviewer_id: 'reviewer_chen',
      })
    );

    await page.getByTestId('ws-next-btn').click();

    const params = paramsOf(page.url());
    expect(params.get('task_id')).toBe('T001');
    expect(params.get('role')).toBe('reviewer');
    expect(params.get('run_type')).toBe('official_run');
    expect(params.get('reviewer_id')).toBe('reviewer_chen');
    // Rebuilding the query string from known keys would silently drop
    // anything else; the v2.0.0 contract also forbids these two coming back.
    await expect(page).not.toHaveURL(/task_type=/);
    await expect(page).not.toHaveURL(/sub_type=/);
  });

  test('an unresolvable sample_id is normalized to the record actually shown', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'no-such-sample', role: 'annotator', run_type: 'dry_run' })
    );

    // selectSample() falls back to the first record; without the rewrite a
    // reload would keep re-resolving a sample that does not exist.
    await expect(page.getByTestId('ws-sample-item').nth(0)).toHaveClass(/active/);
    expect(paramsOf(page.url()).get('sample_id')).toBe('sent-001');
  });
});

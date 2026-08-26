import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Workspace left-column review-unit grouping (issue #455).
 *
 * The reviewer left column renders one entry per review unit
 * (sample × annotator × run_type, FR-051/FR-056). T014 (dry_run, 5 samples
 * × 3 annotators) therefore flattens to 15 near-identical entries: the SAME
 * record snippet is repeated three times in a row, while the only thing that
 * actually distinguishes the three -- the annotator account -- sits on a
 * secondary line inside a 256px column and gets ellipsised. A reviewer
 * stepping with 下一筆 cannot tell whether they moved to another annotator
 * of the same sample or into the next sample.
 *
 * annotation-list already got the equivalent treatment in #407 / PR #441
 * (data-group-start + list-review-id-muted). This is the workspace-shaped
 * counterpart: a real per-sample group wrapper carrying the sample identity
 * and the shared snippet ONCE, with the units inside it reduced to what
 * actually differs (annotator + review state).
 *
 * Data model is untouched -- still one entry per sample × annotator ×
 * run_type; prev/next granularity, the URL contract and the annotator view
 * must all be unchanged.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 * FR-071 / AC-4.29 (grouping), FR-056 / AC-4.12~AC-4.14 (unchanged
 * granularity), FR-057 / AC-4.16 (unchanged URL contract).
 */

const T014 = { task_id: 'T014', role: 'reviewer', run_type: 'dry_run' } as const;
const T014_SAMPLES = [
  'dry-01-all-agree',
  'dry-02-one-divergent',
  'dry-03-dispute-open',
  'dry-04-dispute-resolved',
  'dry-05-pending-review',
];
const T014_ANNOTATORS = ['kioleemg12', '113450022', 'tony0950127'];

/* Same retry guard the sibling review-unit specs carry: parallel workers
   hammering the static server occasionally drop a <script src>, which looks
   exactly like an unrendered left column. Kept as retries rather than
   `mode: 'serial'` so one failure does not mask the rest of the suite. */
test.describe.configure({ retries: 2 });

test.describe('issue #455 -- the reviewer left column groups review units by sample', () => {
  test('T014 renders 5 sample groups of 3 review units each', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

    const groups = page.getByTestId('ws-sample-group');
    await expect(groups).toHaveCount(5);
    // The flattened unit count (FR-056) is unchanged by the grouping.
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(15);
    // Denominator stays the review-unit count (T014's numerator is whatever
    // seedReviewFlowDemo staged, which this spec has no stake in).
    await expect(page.getByTestId('ws-progress-text')).toHaveText(/\/ 15$/);

    for (let g = 0; g < 5; g += 1) {
      const group = groups.nth(g);
      await expect(group).toHaveAttribute('data-sample-id', T014_SAMPLES[g]);
      await expect(group.getByTestId('ws-sample-group-id')).toHaveText(T014_SAMPLES[g]);
      await expect(group.getByTestId('ws-sample-item')).toHaveCount(3);
    }
  });

  test('the repeated record text is rendered once per group, not once per unit', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

    // One shared snippet per sample group...
    await expect(page.getByTestId('ws-sample-group-snippet')).toHaveCount(5);
    // ...and none repeated inside the individual review-unit entries.
    await expect(page.locator('#sampleList .sample-item .sample-snippet')).toHaveCount(0);

    // What the entries DO carry is the annotator identity and the review state.
    const firstGroup = page.getByTestId('ws-sample-group').nth(0);
    for (let i = 0; i < 3; i += 1) {
      const item = firstGroup.getByTestId('ws-sample-item').nth(i);
      await expect(item.getByTestId('ws-sample-annotator')).toHaveText(T014_ANNOTATORS[i]);
      await expect(item.getByTestId('ws-sample-status')).not.toHaveText('');
    }
  });

  test('truncated sample and annotator ids expose their full value via title', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

    const group = page.getByTestId('ws-sample-group').nth(1);
    await expect(group.getByTestId('ws-sample-group-id')).toHaveAttribute('title', T014_SAMPLES[1]);

    const item = group.getByTestId('ws-sample-item').nth(2);
    await expect(item.getByTestId('ws-sample-annotator')).toHaveAttribute('title', T014_ANNOTATORS[2]);
  });

  test('every entry carries an accessible name naming both sample and annotator', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

    const group = page.getByTestId('ws-sample-group').nth(2);
    // role=group with a sample-scoped accessible name, inside the listbox.
    await expect(group).toHaveAttribute('role', 'group');
    await expect(group).toHaveAttribute('aria-label', new RegExp(T014_SAMPLES[2]));
    await expect(page.locator('#sampleList')).toHaveAttribute('role', 'listbox');

    const item = group.getByTestId('ws-sample-item').nth(1);
    const label = await item.getAttribute('aria-label');
    expect(label).toContain(T014_SAMPLES[2]);
    expect(label).toContain(T014_ANNOTATORS[1]);
    // Reachable by that accessible name, so the entry is addressable by AT.
    await expect(page.getByRole('button', { name: label as string })).toHaveCount(1);
  });

  test('the selected entry is marked with BOTH its sample and its annotator', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[1], annotator_id: T014_ANNOTATORS[2] })
    );

    const active = page.locator('.sample-item.active');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute('data-sample-id', T014_SAMPLES[1]);
    await expect(active).toHaveAttribute('data-annotator-id', T014_ANNOTATORS[2]);
    // The owning group is marked too, so the selection is legible at group level.
    await expect(page.locator('.sample-group.has-active')).toHaveAttribute(
      'data-sample-id',
      T014_SAMPLES[1]
    );
  });

  test('prev / next still step one review unit at a time and keep the URL contract', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0], annotator_id: T014_ANNOTATORS[0] })
    );

    // Within the group: same sample, next annotator.
    await page.getByTestId('ws-next-btn').click();
    await expect(page.locator('.sample-item.active')).toHaveAttribute(
      'data-annotator-id',
      T014_ANNOTATORS[1]
    );
    let params = new URL(page.url()).searchParams;
    expect(params.get('sample_id')).toBe(T014_SAMPLES[0]);
    expect(params.get('annotator_id')).toBe(T014_ANNOTATORS[1]);

    // Across the group boundary: next sample, first annotator.
    await page.getByTestId('ws-next-btn').click();
    await page.getByTestId('ws-next-btn').click();
    await expect(page.locator('.sample-item.active')).toHaveAttribute(
      'data-sample-id',
      T014_SAMPLES[1]
    );
    await expect(page.locator('.sample-item.active')).toHaveAttribute(
      'data-annotator-id',
      T014_ANNOTATORS[0]
    );
    params = new URL(page.url()).searchParams;
    expect(params.get('sample_id')).toBe(T014_SAMPLES[1]);
    expect(params.get('annotator_id')).toBe(T014_ANNOTATORS[0]);
    expect(params.get('task_id')).toBe('T014');
    expect(params.get('role')).toBe('reviewer');
    expect(params.get('run_type')).toBe('dry_run');
  });

  test('entries stay keyboard-operable buttons: focus then Enter selects that unit', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

    const target = page.getByTestId('ws-sample-group').nth(3).getByTestId('ws-sample-item').nth(1);
    await expect(target).toHaveJSProperty('tagName', 'BUTTON');
    await target.focus();
    await expect(target).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('.sample-item.active')).toHaveAttribute(
      'data-annotator-id',
      T014_ANNOTATORS[1]
    );
    const params = new URL(page.url()).searchParams;
    expect(params.get('sample_id')).toBe(T014_SAMPLES[3]);
    expect(params.get('annotator_id')).toBe(T014_ANNOTATORS[1]);
  });

  for (const width of [768, 1024, 1440]) {
    test(`at ${width}px the identity info is visible and the column does not overflow`, async ({
      page,
    }) => {
      await skipGuidelineModal(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

      await expect(page.getByTestId('ws-sample-group-id').nth(0)).toBeVisible();
      await expect(
        page.getByTestId('ws-sample-item').nth(0).getByTestId('ws-sample-annotator')
      ).toBeVisible();
      await expect(page.getByTestId('ws-sample-item').nth(0).getByTestId('ws-sample-status')).toBeVisible();

      const overflow = await page
        .locator('#sampleList')
        .evaluate((node) => node.scrollWidth - node.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('at 375px the left column stays collapsed and the context banner carries the identity', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(
      buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0], annotator_id: T014_ANNOTATORS[1] })
    );

    // AC-5.2: the sample column is deliberately hidden below 768px, so the
    // grouping can never obscure identity info there -- the FR-064 context
    // banner is what names the unit at this width.
    await expect(page.locator('.col-samples')).toBeHidden();
    await expect(page.getByTestId('ws-review-unit-context')).toContainText(T014_ANNOTATORS[1]);
  });
});

test.describe('issue #455 -- the annotator left column is untouched', () => {
  test('T001 annotator: no groups, one entry per record, snippet still per entry', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' })
    );

    await expect(page.getByTestId('ws-sample-group')).toHaveCount(0);
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(5);
    await expect(page.locator('#sampleList .sample-item .sample-snippet')).toHaveCount(5);
    await expect(page.getByTestId('ws-sample-annotator')).toHaveCount(0);
  });
});

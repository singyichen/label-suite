import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Reviewer left-column review-unit entries drop the trailing muted sample
 * ID echo (issue #557, follow-up to #455's grouping).
 *
 * #455 moved the sample ID to the group header (`ws-sample-group-id`),
 * shared once per sample, but left a second, per-unit copy on the entry
 * itself (`.sample-unit-line` = annotator + `·` + muted sample ID). For a
 * 3-annotator group (T014, dry_run) the SAME sample_id therefore renders 4
 * times (1 header + 3 muted echoes), and the 256px left column truncates
 * the muted echo to an indistinguishable prefix on every row -- it carries
 * no identification value the header doesn't already carry.
 *
 * This spec asserts the entry line is reduced to just the annotator
 * (`ws-sample-annotator`), the `.sample-unit-sep` / `.sample-unit-id`
 * elements are gone, and nothing else that issue #455 established
 * (group header, addressability, a11y name, annotator view) regresses.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 * FR-071 (v4.56.0 revision, issue #557), AC-4.29 (unchanged assertions
 * carried over).
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

test.describe.configure({ retries: 2 });

test.describe('issue #557 -- reviewer unit entries no longer echo the sample ID', () => {
  test('each unit line renders only the annotator, no separator or muted sample id', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

    await expect(page.locator('.sample-unit-id')).toHaveCount(0);
    await expect(page.locator('.sample-unit-sep')).toHaveCount(0);

    const group = page.getByTestId('ws-sample-group').nth(0);
    for (let i = 0; i < 3; i += 1) {
      const item = group.getByTestId('ws-sample-item').nth(i);
      const unitLine = item.locator('.sample-unit-line');
      // Exactly one child: the annotator span.
      await expect(unitLine.locator('> *')).toHaveCount(1);
      const annotator = item.getByTestId('ws-sample-annotator');
      await expect(annotator).toHaveText(T014_ANNOTATORS[i]);
      await expect(annotator).toHaveAttribute('title', T014_ANNOTATORS[i]);
    }
  });

  test('group header still carries the sample id, count, and snippet', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[0] }));

    const group = page.getByTestId('ws-sample-group').nth(1);
    await expect(group.getByTestId('ws-sample-group-id')).toHaveText(T014_SAMPLES[1]);
    await expect(group.getByTestId('ws-sample-group-id')).toHaveAttribute('title', T014_SAMPLES[1]);
    await expect(group.getByTestId('ws-sample-group-count')).toBeVisible();
    await expect(group.getByTestId('ws-sample-group-snippet')).toBeVisible();
  });

  test('the entry keeps its sample/annotator addressability and accessible name', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ ...T014, sample_id: T014_SAMPLES[2] }));

    const group = page.getByTestId('ws-sample-group').nth(2);
    const item = group.getByTestId('ws-sample-item').nth(1);
    await expect(item).toHaveAttribute('data-sample-id', T014_SAMPLES[2]);
    await expect(item).toHaveAttribute('data-annotator-id', T014_ANNOTATORS[1]);
    const label = await item.getAttribute('aria-label');
    expect(label).toContain(T014_SAMPLES[2]);
    expect(label).toContain(T014_ANNOTATORS[1]);
  });

  test('the annotator role view renders no unit line at all', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' })
    );

    await expect(page.locator('.sample-unit-line')).toHaveCount(0);
    await expect(page.locator('.sample-unit-id')).toHaveCount(0);
    await expect(page.locator('.sample-unit-sep')).toHaveCount(0);
  });
});

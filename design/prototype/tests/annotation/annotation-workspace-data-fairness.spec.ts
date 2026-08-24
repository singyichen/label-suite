import { test, expect } from '@playwright/test';
import {
  buildListUrl,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Data Fairness (constitution NON-NEGOTIABLE): annotator-facing responses
 * must never expose ground-truth/hidden data the annotator wasn't meant to
 * see. field_role_map drives exactly what renders: only 'input' / 'evidence'
 * / 'output' roled fields may appear in the annotator-facing DOM, and only
 * inside their own designated area — everything else stays hidden.
 *
 * NOTE: none of the 13 seed TaskProfiles map a field containing actual
 * gold/ground-truth CONTENT as unassigned — every gold_* / triples /
 * gold_entities-style field is deliberately mapped to the 'output' role
 * (an explicit, allowed exception: task-creator-declared annotator-visible
 * preannotation, distinct from hidden ground truth). The closest available
 * leak-prevention proxy in the current fixtures is unassigned record
 * METADATA (id-like / source-tracking fields) that must never render. The
 * negative-control describe block below (issue #209) closes that gap with a
 * runtime-patched field that carries real answer CONTENT rather than
 * metadata. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('unassigned metadata fields never leak into annotator-facing DOM', () => {
  test('T011 (item_pair): Title / Source ID / Source URL / ID never render', async ({ page }) => {
    // T011 records key their identity as `ID` (uppercase), not the
    // lowercase `id` every other seed profile uses, so this navigates via
    // the list's first-row click rather than guessing a sample_id for the
    // URL directly (see annotation-workspace-item-pair.spec.ts).
    await page.goto(buildListUrl({ task_id: 'T011' }));
    await page.getByTestId('ws-sample-item').first().click();
    await dismissGuidelineModal(page);

    const root = page.getByTestId('ws-root');
    for (const forbidden of ['麻醉科', '32895f62', 'sp1.hso.mohw.gov.tw', '00183']) {
      await expect(root).not.toContainText(forbidden);
    }
  });

  test('T012 (free_text): article_id / angle metadata never render', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T012', sample_id: 'eac8d013' }));
    await dismissGuidelineModal(page);

    const root = page.getByTestId('ws-root');
    for (const forbidden of ['eac8d013', '病因與症狀']) {
      await expect(root).not.toContainText(forbidden);
    }
  });
});

test.describe('output-role prefill is confined to its own answer control', () => {
  test('T001 gold_label prefill appears only inside the single_label panel, not as a separate answer-key element', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    // The output-role prefill is legitimate INSIDE its own control...
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
    // ...but must not additionally appear as a standalone "answer key" /
    // "gold" badge elsewhere in the sample content area.
    await expect(page.getByTestId('ws-input-content')).not.toContainText('positive');
    await expect(page.getByTestId('ws-input-content').locator('[data-testid*="gold"]')).toHaveCount(0);
  });
});

test.describe('reviewer mode does not leak unassigned metadata either', () => {
  test('T011 reviewer view still hides Source ID / Source URL', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T011', role: 'reviewer' }));
    // Reviewer rows toggle the annotator detail on click (spec 015 user
    // story 3); navigation to the workspace goes through the 編輯 button.
    await page.getByTestId('ws-sample-item').first().getByRole('button', { name: '編輯' }).click();
    await dismissGuidelineModal(page);

    const root = page.getByTestId('ws-root');
    for (const forbidden of ['32895f62', 'sp1.hso.mohw.gov.tw']) {
      await expect(root).not.toContainText(forbidden);
    }
  });
});

/* Negative control (issue #209, w7 §6.2-3): every existing case above tests
 * unmapped record METADATA (ids / source tracking) or an output-role field
 * that's a legitimate visible answer OPTION (e.g. T001's "positive" chip
 * label) -- neither proves the unmapped-fields-never-render guarantee holds
 * for a field that carries genuine, unambiguous GOLD ANSWER CONTENT. This
 * patches an unmapped field onto T001's dataset record whose value is real
 * gold-verification content (not just an id) and asserts it never reaches
 * the annotator/reviewer DOM.
 *
 * Scope limit (explicitly acknowledged, w7 §4): this is a prototype-layer
 * DOM-rendering check only. It cannot verify the field is withheld at the
 * network/API layer -- this static prototype has no backend, so the full
 * dataset JSON (including this unmapped field) is always fully fetched to
 * the browser; the fairness guarantee here is "never rendered", not "never
 * transmitted". Backend access-control verification requires the formal
 * full-stack E2E phase (blocked on the e2e/ + backend infra scaffolded per
 * ADR-034 / issue #203, which does not exist yet) and remains open. */
test.describe('negative control: unmapped GOLD CONTENT (not just metadata) never leaks', () => {
  const GOLD_CONTENT_MARKER = 'GOLD-GUARD-9f31: 資深標記員覆核判定為 positive，理由：語氣正向、無負面詞彙';

  test.beforeEach(async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `var record = window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords.find(function (r) { return r.id === 'sent-001'; });
       record.internal_gold_verification_note = ${JSON.stringify(GOLD_CONTENT_MARKER)};`
    );
  });

  test('annotator view never renders the unmapped gold-verification field', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-root')).not.toContainText(GOLD_CONTENT_MARKER);
  });

  test('reviewer view never renders the unmapped gold-verification field', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-root')).not.toContainText(GOLD_CONTENT_MARKER);
  });
});

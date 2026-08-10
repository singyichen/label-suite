import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, patchDataFile } from './_workspace-helpers';

/* UI-chrome localization only (zh / en). The old TASK-015-* mock fixtures
 * carried bilingual dataset content (e.g. `#sampleText` itself switched
 * language), which let earlier tests assert on translated SAMPLE CONTENT.
 * The 13 new seed TaskProfiles are single-language (uploaded dataset
 * content is whatever language the file was authored in — translating it
 * based on a UI language toggle isn't a real product behavior), so this
 * rewrite narrows scope to genuine UI chrome: labels, placeholders, and
 * aria-labels that this workspace itself owns and localizes. See the QA
 * report for this scope reduction rationale. */

test.describe('Annotation workspace UI-chrome localization', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
      window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
    });
  });

  async function ensureEnglishMode(page: import('@playwright/test').Page) {
    if ((await page.getByTestId('ws-lang-label').textContent()) !== 'EN') {
      await page.getByTestId('ws-lang-toggle').click();
    }
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }

  test('annotation note label and placeholder follow English language mode', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);
    await ensureEnglishMode(page);

    await expect(page.getByTestId('ws-note-label')).toHaveText('Notes (optional)');
    await expect(page.getByTestId('ws-note-input')).toHaveAttribute('placeholder', 'Describe special cases here...');
  });

  test('submit validation error follows English language mode', async ({ page }) => {
    // read-001's gold_score is an output-role prefill (013 FR-003g-5) that
    // would otherwise leave this sample already-answered on load; strip it
    // so submit is genuinely exercised against a blank output type.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T004.datasetRecords[0].gold_score = null;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001' }));
    await dismissGuidelineModal(page);
    await ensureEnglishMode(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-single_dim')).toHaveAttribute('data-error', 'true');
  });

  test('multi_label selection limit hint follows English language mode', async ({ page }) => {
    // emo-001's gold_labels prefill is already at max_selections=3; strip it
    // so the picks below genuinely exercise hitting the limit.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T002.datasetRecords[0].gold_labels = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001' }));
    await dismissGuidelineModal(page);
    await ensureEnglishMode(page);

    await page.getByTestId('ws-multi-label-selector-toggle').click();
    for (const label of ['sad', 'fear', 'surprise']) {
      await page.getByTestId(`ws-multi-label-node-${label}`).click();
    }
    await page.getByTestId('ws-multi-label-node-angry').click();
    await expect(page.getByTestId('ws-multi-label-limit-hint')).toContainText('most 3');
  });
});

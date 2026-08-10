import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl } from './_workspace-helpers';

test.describe('Relation identification accessibility', () => {
  test('undo button keeps a localized aria-label', async ({ page }) => {
    // T008: pure-mode relation_identification (no entity_recognition output).
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    const zhGuidelineConfirm = page.getByTestId('ws-guideline-modal-confirm');
    if (await zhGuidelineConfirm.isVisible()) {
      await zhGuidelineConfirm.click();
    }

    const undoButton = page.getByTestId('ws-ri-undo-btn');
    await expect(undoButton).toHaveAttribute('aria-label', '撤銷');

    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    const enGuidelineConfirm = page.getByTestId('ws-guideline-modal-confirm');
    if (await enGuidelineConfirm.isVisible()) {
      await enGuidelineConfirm.click();
    }
    await expect(undoButton).toHaveAttribute('aria-label', 'Undo');
  });
});

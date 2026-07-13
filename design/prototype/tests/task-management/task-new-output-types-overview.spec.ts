import { expect, test } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const overviewUrl = pathToFileURL(path.resolve(
  __dirname,
  '../../../../docs/product/visual-overview/task-new-output-types.html',
)).href;

test.describe('Task new output types visual overview', () => {
  test('boundary card matches the static Step 2 preview', async ({ page }) => {
    await page.goto(overviewUrl);

    const card = page.getByTestId('boundary-overview-card');
    await expect(card).toBeVisible();
    await expect(card.getByTestId('boundary-type-sentence')).toHaveAttribute(
      'data-selected',
      'true',
    );
    await expect(card.getByTestId('boundary-result-paragraph')).toHaveCount(2);
    await expect(card.getByTestId('boundary-result-sentence')).toHaveCount(5);

    const sentenceMarker = card.getByTestId('boundary-gap-13');
    const paragraphMarker = card.getByTestId('boundary-gap-26');
    await expect(sentenceMarker).toHaveAccessibleName(
      '移除 sentence 邊界 (offset 13)',
    );
    await expect(paragraphMarker).toHaveAccessibleName(
      '移除 paragraph 邊界 (offset 26)',
    );
    await expect(sentenceMarker.locator('.boundary-marker-code')).toHaveText('S');
    await expect(paragraphMarker.locator('.boundary-marker-code')).toHaveText('P');

    const markerColors = await Promise.all(
      [sentenceMarker, paragraphMarker].map((marker) => marker.evaluate((element) =>
        window.getComputedStyle(element).color,
      )),
    );
    expect(markerColors[0]).not.toBe(markerColors[1]);

    const spacing = await card.evaluate((element) => {
      const left = element.querySelector('[data-testid="boundary-segment-1"]');
      const marker = element.querySelector('[data-testid="boundary-gap-13"]');
      const right = element.querySelector('[data-testid="boundary-segment-2"]');
      if (!left || !marker || !right) return null;
      const leftBox = left.getBoundingClientRect();
      const markerBox = marker.getBoundingClientRect();
      const rightBox = right.getBoundingClientRect();
      return {
        leftGap: markerBox.left - leftBox.right,
        rightGap: rightBox.left - markerBox.right,
      };
    });
    expect(spacing).not.toBeNull();
    expect(spacing!.leftGap).toBeGreaterThanOrEqual(2);
    expect(spacing!.rightGap).toBeGreaterThanOrEqual(2);
  });

  test('relation cards separate trigger spans from semantic relation types', async ({
    page,
  }) => {
    await page.goto(overviewUrl);

    const relationCard = page.getByTestId('relation-triple-overview-card');
    const relationRow = relationCard.getByTestId('relation-triple-row').filter({
      hasText: '導致 (12,13)',
    });
    await expect(relationRow).toContainText('高血壓 (0,2)');
    await expect(relationRow).toContainText('動脈硬化 (14,17)');
    await expect(relationRow.getByTestId('relation-trigger')).toHaveText(
      '導致 (12,13)',
    );
    await expect(relationRow.getByTestId('relation-semantic-type')).toHaveText(
      '類型：causes',
    );
    await expect(relationRow.getByTestId('relation-type-action')).toHaveText('類型');
    await expect(relationRow.getByTestId('relation-delete-action')).toHaveText('刪除');

    const medicalCard = page.getByTestId('medical-ner-re-overview-card');
    const medicalRow = medicalCard.getByTestId('relation-triple-row').filter({
      hasText: '心電圖 (12,14)',
    });
    await expect(medicalRow).toContainText('ST段上升 (19,23)');
    await expect(medicalRow.getByTestId('relation-trigger')).toHaveText(
      '發現 (17,18)',
    );
    await expect(medicalRow.getByTestId('relation-semantic-type')).toHaveText(
      '類型：typicalTest',
    );

    const visualSeparation = await medicalRow.evaluate((element) => {
      const trigger = element.querySelector('[data-testid="relation-trigger"]');
      const semanticType = element.querySelector(
        '[data-testid="relation-semantic-type"]',
      );
      if (!trigger || !semanticType) return null;
      return {
        triggerColor: window.getComputedStyle(trigger).color,
        typeColor: window.getComputedStyle(semanticType).color,
      };
    });
    expect(visualSeparation).not.toBeNull();
    expect(visualSeparation!.triggerColor).not.toBe(visualSeparation!.typeColor);
  });

  test('ABSA card matches the static Step 2 relation rows', async ({ page }) => {
    await page.goto(overviewUrl);

    const card = page.getByTestId('absa-va-overview-card');
    const rows = card.getByTestId('relation-triple-row');
    await expect(rows).toHaveCount(2);

    const aspectRow = rows.filter({ hasText: 'has_aspect' });
    await expect(aspectRow).toContainText('Note 10 plus/target');
    await expect(aspectRow).toContainText('過熱問題/aspect');
    await expect(aspectRow.getByTestId('relation-trigger')).toHaveAttribute(
      'data-origin',
      'task-config',
    );

    const opinionRow = rows.filter({ hasText: 'has_opinion' });
    await expect(opinionRow).toContainText('Note 10 plus/target');
    await expect(opinionRow).toContainText('嚴重/opinion');
    await expect(opinionRow).not.toContainText('過熱問題/aspect');

    for (const row of [aspectRow, opinionRow]) {
      await expect(row.getByTestId('relation-semantic-type')).toHaveCount(0);
      await expect(row.getByTestId('relation-type-action')).toHaveText('類型');
      await expect(row.getByTestId('relation-delete-action')).toHaveText('刪除');
    }
  });
});

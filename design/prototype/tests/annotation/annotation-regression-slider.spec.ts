import { expect, test, type Locator } from '@playwright/test';

const PENDING_VA_URL =
  '/pages/annotation/annotation-workspace.html?role=annotator&task_id=TASK-015-A2&run_type=dry_run&task_type=single_sentence_va_scoring&sample_id=A2-004';

async function setRangeValue(slider: Locator, value: string) {
  await slider.evaluate((node, nextValue) => {
    const input = node as HTMLInputElement;
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  });
});

test('VA regression uses distinct sliders with values following each thumb', async ({ page }) => {
  await page.goto(PENDING_VA_URL);

  const valenceControl = page.getByTestId('va-valence-control');
  const arousalControl = page.getByTestId('va-arousal-control');
  const valenceSlider = page.getByTestId('va-valence-slider');
  const arousalSlider = page.getByTestId('va-arousal-slider');
  const valenceValue = page.getByTestId('va-valence-value-tooltip');
  const arousalValue = page.getByTestId('va-arousal-value-tooltip');
  const valenceInput = page.getByTestId('va-valence-value-input');
  const arousalInput = page.getByTestId('va-arousal-value-input');

  await expect(valenceSlider).toHaveAttribute('type', 'range');
  await expect(arousalSlider).toHaveAttribute('type', 'range');
  await expect(valenceInput).toHaveAttribute('type', 'number');
  await expect(arousalInput).toHaveAttribute('type', 'number');
  await expect(valenceInput).toHaveAttribute('step', 'any');
  await expect(arousalInput).toHaveAttribute('step', 'any');
  await expect(page.locator('#vaAnnotatorPanel input[type="radio"]')).toHaveCount(0);
  await expect(valenceValue).toHaveText('—');
  await expect(arousalValue).toHaveText('—');
  await expect(valenceInput).toHaveValue('');
  await expect(arousalInput).toHaveValue('');
  await expect(valenceInput).toHaveAttribute('placeholder', '—');
  await expect(arousalInput).toHaveAttribute('placeholder', '—');
  await expect(valenceSlider).toHaveAttribute('data-value-set', 'false');
  await expect(arousalSlider).toHaveAttribute('data-value-set', 'false');

  const colors = await Promise.all(
    [valenceControl, arousalControl].map((control) =>
      control.evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--regression-dimension-color').trim(),
      ),
    ),
  );
  expect(colors[0]).not.toBe(colors[1]);

  await page.locator('#submitBtn').click();
  await expect(page.locator('#toast')).toContainText('請先完成 Valence 與 Arousal 評分');

  await setRangeValue(valenceSlider, '6');
  await expect(valenceValue).toHaveText('6');
  await expect(valenceInput).toHaveValue('6');
  await expect(valenceSlider).toHaveAttribute('data-value-set', 'true');

  const valenceGeometry = await page.evaluate(() => {
    const slider = document.querySelector('[data-testid="va-valence-slider"]') as HTMLInputElement | null;
    const value = document.querySelector('[data-testid="va-valence-value-tooltip"]') as HTMLElement | null;
    if (!slider || !value) return null;
    const sliderRect = slider.getBoundingClientRect();
    const valueRect = value.getBoundingClientRect();
    const ratio = (Number(slider.value) - Number(slider.min)) /
      (Number(slider.max) - Number(slider.min));
    return {
      expectedCenterX: sliderRect.left + 9 + ratio * (sliderRect.width - 18),
      valueCenterX: valueRect.left + valueRect.width / 2,
      valueBottom: valueRect.bottom,
      sliderTop: sliderRect.top,
    };
  });
  expect(valenceGeometry).not.toBeNull();
  expect(Math.abs(valenceGeometry!.valueCenterX - valenceGeometry!.expectedCenterX)).toBeLessThan(3);
  expect(valenceGeometry!.valueBottom).toBeLessThanOrEqual(valenceGeometry!.sliderTop);

  await arousalSlider.focus();
  await arousalSlider.press('ArrowRight');
  await expect(arousalSlider).toHaveAttribute('data-value-set', 'true');
  await expect(arousalValue).toHaveText(await arousalSlider.inputValue());
  await expect(arousalInput).toHaveValue(await arousalSlider.inputValue());

  await valenceInput.fill('7.5');
  await valenceInput.blur();
  await expect(valenceSlider).toHaveValue('7.5');
  await expect(valenceValue).toHaveText('7.5');

  await valenceInput.fill('7.4');
  await valenceInput.blur();
  await expect(valenceInput).toHaveValue('7.4');
  await expect(valenceSlider).toHaveValue('7.4');
  await expect(valenceValue).toHaveText('7.4');

  await valenceInput.fill('99');
  await valenceInput.blur();
  await expect(valenceInput).toHaveValue('9');
  await expect(valenceSlider).toHaveValue('9');
  await expect(valenceValue).toHaveText('9');
});

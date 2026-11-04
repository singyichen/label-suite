/*
 * Traceability: specs/task-management/014-task-detail/spec.md AC-1.16 (issue #1311).
 *
 * TDD Red. In the annotation-results export history, the disabled "download"
 * button of a row whose conditionsSnapshot is incomplete only carries its
 * reason in its own `title`. `.mini-btn:disabled { pointer-events: none }`
 * makes the browser skip the button, so hover never shows that tooltip. Green
 * wraps the button in `<span class="btn-disabled-tip" title="<reason>">`
 * (same pattern as #1129). Asserting only the button's `title` attribute is a
 * known false green, so these tests probe the real hit chain at the button
 * center (elementFromPoint) and require a title carrier that is a
 * DESCENDANT of the row's `td` (neither the td nor the tr), distinct from
 * the button itself.
 *
 * Seed: T006 first export-history row has no snapshot (see
 * issue-772-export-history-redownload.spec.ts).
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function openDisabledDownload(page: Page) {
  await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T006&tab=annotation-results`);
  await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
  const btn = page.locator('#arExportHistoryBody tr:first-child .ar-export-action-btn');
  await expect(btn).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
  await expect(btn).toBeDisabled();
  await btn.scrollIntoViewIfNeeded();
  return btn;
}

// Walk from the element under the button center up to the row; return the
// title carriers found strictly inside the td and other than the button.
async function hitChainCarrier(page: Page) {
  return page.evaluate(() => {
    const btn = document.querySelector<HTMLButtonElement>('#arExportHistoryBody tr:first-child .ar-export-action-btn')!;
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const td = btn.closest('td')!;
    let carrierTitle: string | null = null;
    let carrierTag: string | null = null;
    for (let el: Element | null = hit; el && el !== td && el !== td.parentElement; el = el.parentElement) {
      if (td.contains(el) && el !== td && el !== btn && el.getAttribute('title')) {
        carrierTitle = el.getAttribute('title');
        carrierTag = el.tagName;
        break;
      }
    }
    return { buttonTitle: btn.title, hitTag: hit ? hit.tagName : null, carrierTitle, carrierTag };
  });
}

test.describe('Disabled export download tooltip (#1311, AC-1.16)', () => {
  test('hit chain at the disabled download button center includes a title carrier inside the td', async ({ page }) => {
    await openDisabledDownload(page);
    const res = await hitChainCarrier(page);
    expect(res.buttonTitle, 'button keeps its own title').not.toBe('');
    expect(res.carrierTitle, `elementFromPoint hit <${res.hitTag}> with no title carrier below the td`).toBe(res.buttonTitle);
  });

  test('carrier reason is Chinese in zh and CJK-free English after switching to en', async ({ page }) => {
    await openDisabledDownload(page);
    const zh = await hitChainCarrier(page);
    expect(zh.carrierTitle, 'title carrier present (zh)').toBeTruthy();
    expect(zh.carrierTitle as string).toMatch(/[一-鿿]/);

    await page.locator('#langToggle').click();
    await openDisabledDownloadAfterToggle(page);
    const en = await hitChainCarrier(page);
    expect(en.carrierTitle, 'title carrier present (en)').toBeTruthy();
    expect(en.carrierTitle as string).not.toMatch(/[一-鿿　-〿＀-￯]/);
    expect(en.carrierTitle as string).toMatch(/[A-Za-z]{3,}/);
  });

  test('carrier reason does not leak an internal object path', async ({ page }) => {
    await openDisabledDownload(page);
    const res = await hitChainCarrier(page);
    expect(res.carrierTitle, 'title carrier present').toBeTruthy();
    const reason = res.carrierTitle as string;
    expect(reason).not.toMatch(/s3:\/\//i);
    expect(reason).not.toMatch(/bucket|object/i);
    expect(reason).not.toMatch(/\.(json|csv)\b/i);
    expect(reason).not.toMatch(/\/[\w.-]+\/[\w.-]+/);
  });

  test('real hover on the carrier wrapper works and its box covers the button center', async ({ page }) => {
    const btn = await openDisabledDownload(page);
    const carrier = page.locator('#arExportHistoryBody tr:first-child td [title]:not(button)').first();
    await expect(carrier, 'a non-button element with a title exists inside the td').toBeVisible({ timeout: 2000 });
    await carrier.hover({ timeout: 3000 });
    const [cb, bb] = await Promise.all([carrier.boundingBox(), btn.boundingBox()]);
    expect(cb).not.toBeNull();
    expect(bb).not.toBeNull();
    const cx = bb!.x + bb!.width / 2;
    const cy = bb!.y + bb!.height / 2;
    expect(cx).toBeGreaterThanOrEqual(cb!.x);
    expect(cx).toBeLessThanOrEqual(cb!.x + cb!.width);
    expect(cy).toBeGreaterThanOrEqual(cb!.y);
    expect(cy).toBeLessThanOrEqual(cb!.y + cb!.height);
  });
});

async function openDisabledDownloadAfterToggle(page: Page) {
  const btn = page.locator('#arExportHistoryBody tr:first-child .ar-export-action-btn');
  await expect(btn).toBeDisabled();
  await btn.scrollIntoViewIfNeeded();
}

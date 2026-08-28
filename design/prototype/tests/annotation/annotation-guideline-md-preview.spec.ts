import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, patchDataFile } from './_workspace-helpers';

/* Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-020, FR-020D, AC-5.3, SC-005D
 *
 * Issue #527: clicking a Markdown guideline file must open an in-page
 * preview modal (same interaction contract as the PDF / image modals)
 * with the Markdown rendered to HTML, instead of dumping the raw source
 * into an inline block under the file list. Annotator and reviewer share
 * renderGuidelineFileList(), so the annotator path covers both roles.
 */

const mdItem = (page: import('@playwright/test').Page) =>
  page.getByTestId('ws-guideline-file-item').filter({ hasText: '.md' });

test('opens the Markdown preview modal with the file name as title', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await mdItem(page).click();

  const modal = page.getByTestId('ws-guideline-md-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.modal-title')).toHaveText('常見問題.md');
  // The old inline block must be gone -- no second rendering surface.
  await expect(page.locator('#wsGuidelineMdPreview')).toHaveCount(0);
});

test('renders Markdown to HTML instead of showing raw source', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await mdItem(page).click();

  const body = page.getByTestId('ws-guideline-md-modal-body');
  await expect(body.locator('h1')).toHaveText('常見問題');
  await expect(body.locator('li')).toHaveCount(2);
  await expect(body.locator('li strong').first()).toHaveText('Q: 如何開始標記？');
  await expect(body).not.toContainText('**');
  await expect(body).not.toContainText('# ');
});

test('closes via close button, backdrop and Esc', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const modal = page.getByTestId('ws-guideline-md-modal');

  await mdItem(page).click();
  await expect(modal).toBeVisible();
  await page.getByTestId('ws-guideline-md-modal-close').click();
  await expect(modal).toBeHidden();

  await mdItem(page).click();
  await expect(modal).toBeVisible();
  await modal.click({ position: { x: 5, y: 5 } });
  await expect(modal).toBeHidden();

  await mdItem(page).click();
  await expect(modal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});

test('first-visit guideline gate renders the same Markdown to HTML', async ({ page }) => {
  // No seed sets forceShowGuideline; stub it at runtime like issue-184 does.
  await patchDataFile(
    page,
    'task-detail.data.js',
    `window.LabelSuiteTaskDetailData.profiles.T001.forceShowGuideline = true;`
  );
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

  const body = page.getByTestId('ws-guideline-modal-body');
  await expect(body.locator('h1')).toHaveText('常見問題');
  await expect(body).not.toContainText('**');
});

test('escapes raw HTML in Markdown source (no script injection)', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  // Parse the renderer output into a detached element and inspect the DOM:
  // the injected <img> must survive only as escaped text, never as a node,
  // and the javascript: link must not become an anchor.
  const result = await page.evaluate(() => {
    const html = (window as any).renderMarkdown(
      '# T <img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))'
    );
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    return {
      imgCount: tpl.content.querySelectorAll('img').length,
      anchorCount: tpl.content.querySelectorAll('a').length,
      headingText: tpl.content.querySelector('h1')?.textContent ?? '',
    };
  });
  expect(result.imgCount).toBe(0);
  expect(result.anchorCount).toBe(0);
  expect(result.headingText).toContain('<img src=x onerror="alert(1)">');
});

/* Issue #527 decision record (maintainer, 2026-08-27): the minimal renderer
 * also covers fenced code blocks, tables and images; image src goes through
 * the same protocol allowlist as link href.
 */
const renderDom = (page: import('@playwright/test').Page, source: string) =>
  page.evaluate((src) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = (window as any).renderMarkdown(src);
    const q = (sel: string) => Array.from(tpl.content.querySelectorAll(sel));
    return {
      pre: q('pre > code').map((el) => el.textContent),
      b: q('b').length,
      th: q('th').map((el) => el.textContent),
      td: q('td').map((el) => el.textContent),
      img: q('img').map((el) => ({ src: el.getAttribute('src'), alt: el.getAttribute('alt') })),
    };
  }, source);

test('renders fenced code blocks with escaped content', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const r = await renderDom(page, '```json\n{"label": "<b>x</b>"}\n**not bold**\n```');
  expect(r.pre).toEqual(['{"label": "<b>x</b>"}\n**not bold**']);
  expect(r.b).toBe(0);
});

test('renders pipe tables with a header row', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const r = await renderDom(page, '| 標籤 | 說明 |\n|---|---|\n| positive | **正面** |\n| negative | 負面 |');
  expect(r.th).toEqual(['標籤', '說明']);
  expect(r.td).toEqual(['positive', '正面', 'negative', '負面']);
});

test('renders images and drops unsafe image sources', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const r = await renderDom(
    page,
    '![範例圖](../../assets/images/task-management/generic-guideline-example.svg)\n\n![bad](javascript:alert(1))'
  );
  expect(r.img).toEqual([
    { src: '../../assets/images/task-management/generic-guideline-example.svg', alt: '範例圖' },
  ]);
});

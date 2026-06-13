const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file:///X:/mandy/label-suite/design/prototype/pages/task-management/task-new.html';
const DATA_DIR = 'X:\\mandy\\label-suite\\docs\\product\\example-data';

const FILES = [
  { name: 'absa-va.json', expectedCols: ['gold_triplets', 'incomplete_annotations'] },
  { name: 'nli.json',     expectedCols: ['ID', 'Title', 'Premise', 'Hypothesis', 'Label', 'Evidence', 'Source ID', 'Source URL'], expectedRows: 2 },
  { name: 'mrc.json',     expectedCols: ['article_id', 'angle', 'instruction', 'background', 'question', 'answer'] },
];

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  let allPass = true;

  for (const { name, expectedCols } of FILES) {
    console.log(`\n=== Testing: ${name} ===`);

    await page.goto(FILE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Step 1 panel must be visible
    const step1 = page.locator('#step1Panel');
    await step1.waitFor({ state: 'visible', timeout: 10000 });

    // Upload file via hidden input
    const filePath = path.join(DATA_DIR, name);
    await page.locator('#datasetFileInput').setInputFiles(filePath);

    // Wait for inline preview to appear (max 4s)
    const preview = page.locator('#inlineDatasetPreview');
    try {
      await preview.waitFor({ state: 'visible', timeout: 4000 });
    } catch {
      console.error(`  FAIL: inline preview did not appear for ${name}`);
      allPass = false;
      await page.screenshot({ path: `test-upload-${name.replace('.json','')}-fail.png` });
      continue;
    }

    // Grab rendered column headers (label text only)
    const colLabels = await page.locator('#inlineDatasetPreview .inline-preview-col-label').allInnerTexts();
    console.log(`  Columns found : ${JSON.stringify(colLabels)}`);
    console.log(`  Columns expect: ${JSON.stringify(expectedCols)}`);

    const match = JSON.stringify(colLabels) === JSON.stringify(expectedCols);
    if (match) {
      console.log('  ✓ Columns match');
    } else {
      console.error('  ✗ Column mismatch!');
      allPass = false;
    }

    // Grab all data cell texts
    const cells = await page.locator('#inlineDatasetPreview tbody td').allInnerTexts();
    console.log(`  Data cells (${cells.length}): ${JSON.stringify(cells)}`);

    // Verify no [object Object] leaks
    const ugly = cells.filter(c => c.includes('[object Object]'));
    if (ugly.length > 0) {
      console.error(`  ✗ Found [object Object] in cells: ${JSON.stringify(ugly)}`);
      allPass = false;
    } else {
      console.log('  ✓ No [object Object] in cell values');
    }

    // Screenshot for visual inspection
    await preview.screenshot({ path: `test-upload-${name.replace('.json','')}.png` });
    console.log(`  Screenshot saved: test-upload-${name.replace('.json','')}.png`);
  }

  console.log(`\n=== Result: ${allPass ? 'ALL PASS ✓' : 'SOME TESTS FAILED ✗'} ===`);
  await browser.close();
  process.exit(allPass ? 0 : 1);
})();

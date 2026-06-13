const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file:///X:/mandy/label-suite/design/prototype/pages/task-management/task-new.html';
const DATA_DIR = 'X:\\mandy\\label-suite\\docs\\product\\example-data';

async function getPreviewRows(page) {
  const visible = await page.locator('#inlineDatasetPreview').isVisible();
  if (!visible) return { visible: false, rows: 0, cols: [] };
  const cols = await page.locator('#inlineDatasetPreview .inline-preview-col-label').allInnerTexts();
  const rows = await page.locator('#inlineDatasetPreview tbody tr').count();
  return { visible: true, rows, cols };
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  let allPass = true;

  // ── Scenario 1: upload same file twice (without removing) ──────────────────
  console.log('\n=== Scenario 1: Upload nli.json → upload nli.json again ===');
  await page.goto(FILE_URL);
  await page.locator('#step1Panel').waitFor({ state: 'visible', timeout: 10000 });

  await page.locator('#datasetFileInput').setInputFiles(path.join(DATA_DIR, 'nli.json'));
  await page.locator('#inlineDatasetPreview').waitFor({ state: 'visible', timeout: 4000 });
  const after1st = await getPreviewRows(page);
  console.log('  After 1st upload:', JSON.stringify(after1st));

  // Re-upload same file
  await page.locator('#datasetFileInput').setInputFiles(path.join(DATA_DIR, 'nli.json'));
  await page.waitForTimeout(600);
  const after2nd = await getPreviewRows(page);
  console.log('  After 2nd upload:', JSON.stringify(after2nd));

  if (after2nd.visible && after2nd.rows >= 1) {
    console.log('  ✓ Table still visible and has rows after re-upload');
  } else {
    console.error('  ✗ Table not visible or empty after re-upload');
    allPass = false;
  }
  await page.screenshot({ path: 'test-reupload-s1.png' });

  // ── Scenario 2: remove then re-upload ─────────────────────────────────────
  console.log('\n=== Scenario 2: Upload nli.json → remove → upload nli.json again ===');
  await page.goto(FILE_URL);
  await page.locator('#step1Panel').waitFor({ state: 'visible', timeout: 10000 });

  await page.locator('#datasetFileInput').setInputFiles(path.join(DATA_DIR, 'nli.json'));
  await page.locator('#inlineDatasetPreview').waitFor({ state: 'visible', timeout: 4000 });
  console.log('  Table visible after 1st upload ✓');

  // Remove the file
  await page.locator('.upload-file-remove').first().click();
  await page.waitForTimeout(300);
  const afterRemove = await getPreviewRows(page);
  console.log('  After remove:', JSON.stringify(afterRemove));
  if (!afterRemove.visible) {
    console.log('  ✓ Table hidden after remove');
  } else {
    console.error('  ✗ Table should be hidden after removing all files');
    allPass = false;
  }

  // Re-upload
  await page.locator('#datasetFileInput').setInputFiles(path.join(DATA_DIR, 'nli.json'));
  await page.locator('#inlineDatasetPreview').waitFor({ state: 'visible', timeout: 4000 });
  const afterReupload = await getPreviewRows(page);
  console.log('  After re-upload:', JSON.stringify(afterReupload));
  if (afterReupload.visible && afterReupload.rows >= 1) {
    console.log('  ✓ Table refreshed after re-upload');
  } else {
    console.error('  ✗ Table did not refresh after re-upload');
    allPass = false;
  }
  await page.screenshot({ path: 'test-reupload-s2.png' });

  // ── Scenario 3: upload nli.json → upload mrc.json (blocked) → re-upload nli.json ──
  console.log('\n=== Scenario 3: nli.json → mrc.json (blocked) → nli.json again ===');
  await page.goto(FILE_URL);
  await page.locator('#step1Panel').waitFor({ state: 'visible', timeout: 10000 });

  await page.locator('#datasetFileInput').setInputFiles(path.join(DATA_DIR, 'nli.json'));
  await page.locator('#inlineDatasetPreview').waitFor({ state: 'visible', timeout: 4000 });
  const s3_after_nli = await getPreviewRows(page);
  console.log('  After nli upload:', JSON.stringify(s3_after_nli));

  await page.locator('#datasetFileInput').setInputFiles(path.join(DATA_DIR, 'mrc.json'));
  await page.waitForTimeout(600);
  const s3_after_mrc = await getPreviewRows(page);
  const errVisible = await page.locator('#errDatasetCompat').isVisible();
  console.log('  After mrc upload (should be blocked):', JSON.stringify(s3_after_mrc), '| error shown:', errVisible);
  if (!errVisible) {
    console.error('  ✗ Error message not shown for column mismatch');
    allPass = false;
  } else {
    console.log('  ✓ Column mismatch error shown');
  }

  // Table cols should still be nli's
  if (JSON.stringify(s3_after_mrc.cols) === JSON.stringify(s3_after_nli.cols)) {
    console.log('  ✓ Table still shows nli columns after blocked mrc upload');
  } else {
    console.error('  ✗ Table columns changed unexpectedly');
    allPass = false;
  }

  // Upload nli again — table should refresh
  await page.locator('#datasetFileInput').setInputFiles(path.join(DATA_DIR, 'nli.json'));
  await page.waitForTimeout(600);
  const s3_after_nli2 = await getPreviewRows(page);
  console.log('  After nli re-upload:', JSON.stringify(s3_after_nli2));
  if (s3_after_nli2.visible && s3_after_nli2.rows >= 1) {
    console.log('  ✓ Table refreshed after nli re-upload');
  } else {
    console.error('  ✗ Table did not refresh after nli re-upload');
    allPass = false;
  }
  await page.screenshot({ path: 'test-reupload-s3.png' });

  console.log(`\n=== Result: ${allPass ? 'ALL PASS ✓' : 'SOME TESTS FAILED ✗'} ===`);
  await browser.close();
  process.exit(allPass ? 0 : 1);
})();

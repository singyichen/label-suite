import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/* issue #811 (RED), group 2 (tasks.md 2.1): task-config.data.js `BYPASS_FIELD`,
 * task-config.engine.js preview chips, task-detail.data.js's three demo-guide
 * sentences, and dashboard.i18n.js / dashboard.html `stepReviewer2Desc` are
 * the task-management-surface consumers of the two i18n sources group 1
 * created in `shared/sidebar.js` (`window.LabelSuiteSharedSidebar.BYPASS_WORDING`,
 * design.md D1). Group 1's issue-811-bypass-answer-decision-wording.spec.ts
 * already pins the review-facing surfaces (annotation module); this file
 * pins the remaining four task-management/dashboard surfaces named in
 * tasks.md 2.1. Green (tasks.md 2.2-2.6) has not run yet, so:
 *
 *   - the toggle's English copy is still the pre-#811 `Allow bypass (unable
 *     to determine)`, not the ruled `Allow "Unable to determine (Bypass)"`
 *     (design.md R2);
 *   - the preview chips are still literal strings, not read from the shared
 *     answer-value source at runtime -- they happen to already equal that
 *     source byte-for-byte (design.md D2: only the source-of-truth ownership
 *     changes, not the wording), so this pair is a regression pin against
 *     future drift and is not expected to fail on its own;
 *   - the dashboard step description and the three task-detail demo-guide
 *     sentences still use the decision name `無法判定` where the ruled name is
 *     `無法裁決` (design.md D3). R1: this does NOT touch the finalized-RESULT
 *     wording FR-061/FR-063/FR-095/FR-097 describe -- those keep `無法判定`
 *     and are out of scope here; the three sentences pinned below describe
 *     the review *decision* (審核決策為通過／修正／無法判定三選一), not a
 *     finalized value, which is why design.md D3 lists them as in-scope.
 *
 * Type declarations use local casts (no second `declare global`) per the
 * group 1 convention -- issue-596-arbitration.spec.ts already established
 * why a second global declaration collides (TS2717).
 */

type SharedSidebarWindow = Window & {
  LabelSuiteSharedSidebar?: {
    BYPASS_WORDING: {
      zh: { answer: string; decision: string };
      en: { answer: string; decision: string };
    };
  };
};

async function bypassAnswerWording(page: Page, lang: 'zh' | 'en'): Promise<string> {
  const value = await page.evaluate((l) => {
    const w = window as unknown as SharedSidebarWindow;
    return w.LabelSuiteSharedSidebar?.BYPASS_WORDING[l].answer;
  }, lang);
  if (!value) {
    throw new Error('window.LabelSuiteSharedSidebar.BYPASS_WORDING is not available on this page');
  }
  return value;
}

async function setLangEn(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

interface Step2Config {
  taskName: string;
  category: string;
  outputType: string | string[];
  inputType: string;
  dataFile: string;
  roles: Record<string, string>;
}

/* Trimmed copy of task-new-output-type-preview.spec.ts's setupAndGoToStep2.
 * That file does not export it, and every task-new spec file under
 * tests/task-management/ keeps its own copy of this navigation helper (no
 * shared module exists there); this is the single-output-type subset this
 * file needs, plus the array branch (borrowed from the sibling file's
 * setupAndGoToStep2) the sentinel-ownership block below needs to reach the
 * composite entity_recognition + relation_identification preview. */
async function goToStep2(page: Page, config: Step2Config) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', config.taskName);
  await page.locator(`#taskCategoryChips [data-key="${config.category}"]`).click();
  // Input type must be selected before output type so the taxonomy can apply
  // any granularity constraints before rendering the output choices.
  await page.locator(`#taskInputTypeChips [data-key="${config.inputType}"]`).click();
  const outputTypes = Array.isArray(config.outputType) ? config.outputType : [config.outputType];
  for (const ot of outputTypes) {
    await page.locator(`#taskOutputTypeChips [data-key="${ot}"]`).click();
  }

  await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, config.dataFile));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

  for (const [col, role] of Object.entries(config.roles)) {
    await page.locator(`.inline-preview-role-select[aria-label$="${col}"]`).selectOption(role);
  }

  await page.evaluate(() => {
    (window as unknown as { revalidateCurrentStep?: () => void }).revalidateCurrentStep?.();
  });
  await page.waitForTimeout(200);

  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

/* Ownership-proving sentinel pin (bot review finding on PR #860): the specs
 * above compare consumer text against `window.LabelSuiteSharedSidebar
 * .BYPASS_WORDING`, which is byte-identical to the pre-#811 hard-coded
 * literals -- so a consumer that regressed to copy-pasting the literal would
 * still pass them. These sentinels rewrite the *only* source of the answer
 * wording (shared/sidebar.js's BYPASS_WORDING, canon 015 FR-092/AC-3.60) to
 * unique strings that do not equal the literal, so a consumer that still
 * hardcodes the literal renders the literal, not the sentinel, and fails. */
const SENTINEL_ANSWER_ZH = '__SENTINEL_ANSWER_ZH__';
const SENTINEL_ANSWER_EN = '__SENTINEL_ANSWER_EN__';

/* sidebar.js loads before task-config.data.js and task-config.engine.js in
 * task-new.html (`<script src="../shared/sidebar.js">` ahead of both), so
 * routing it before `page.goto` guarantees the sentinel is in place before
 * BYPASS_FIELD is computed at data.js load time and before any engine.js
 * render call reads BYPASS_WORDING. Registered per-test on a fresh `page`
 * fixture (Playwright test isolation), so it never replays into another
 * test's navigation. */
async function interceptBypassWordingWithSentinel(page: Page) {
  await page.route('**/pages/shared/sidebar.js', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original
      .replace("answer: '無法判定 (Bypass)'", `answer: '${SENTINEL_ANSWER_ZH}'`)
      .replace("answer: 'Unable to determine (Bypass)'", `answer: '${SENTINEL_ANSWER_EN}'`);
    if (body === original) {
      throw new Error(
        'interceptBypassWordingWithSentinel: BYPASS_WORDING answer literals not found in ' +
          'shared/sidebar.js -- update this helper to match the current source text',
      );
    }
    await route.fulfill({ response, body });
  });
}

test.describe('issue #811: task-new allow_bypass toggle wording (task-config.data.js BYPASS_FIELD, design.md R2)', () => {
  test('zh: the toggle label keeps 允許無法判定 (Bypass), exactly', async ({ page }) => {
    await goToStep2(page, {
      taskName: 'issue-811-bypass-toggle-zh',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const toggleLabel = page.locator('.schema-bypass-field .schema-toggle-label');
    await expect(toggleLabel).toHaveCount(1);
    await expect(toggleLabel).toHaveText('允許無法判定 (Bypass)');
  });

  test('en: the toggle label reads Allow "Unable to determine (Bypass)", exactly', async ({ page }) => {
    await setLangEn(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-toggle-en',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const toggleLabel = page.locator('.schema-bypass-field .schema-toggle-label');
    await expect(toggleLabel).toHaveCount(1);
    await expect(toggleLabel).toHaveText('Allow "Unable to determine (Bypass)"');
  });
});

test.describe('issue #811: task-new preview bypass chip wording (task-config.engine.js, design.md D2)', () => {
  test('zh: the preview bypass chip text equals the shared answer-value source, read at runtime', async ({ page }) => {
    await goToStep2(page, {
      taskName: 'issue-811-bypass-chip-zh',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', spans: 'output' },
    });

    const answer = await bypassAnswerWording(page, 'zh');
    expect(answer.length).toBeGreaterThan(0);
    const chip = page.locator('#annotationPreview').getByRole('button', { name: answer, exact: true });
    await expect(chip).toHaveCount(1);
  });

  test('en: the preview bypass chip text equals the shared answer-value source, read at runtime', async ({ page }) => {
    await setLangEn(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-chip-en',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', spans: 'output' },
    });

    const answer = await bypassAnswerWording(page, 'en');
    expect(answer.length).toBeGreaterThan(0);
    const chip = page.locator('#annotationPreview').getByRole('button', { name: answer, exact: true });
    await expect(chip).toHaveCount(1);
  });
});

test.describe('issue #811 ownership proof: task-new allow_bypass toggle reads BYPASS_WORDING live, not a hand-copied literal (task-config.data.js BYPASS_FIELD)', () => {
  test('zh: the toggle label reflects a sentinel injected into shared/sidebar.js', async ({ page }) => {
    await interceptBypassWordingWithSentinel(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-toggle-sentinel-zh',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const toggleLabel = page.locator('.schema-bypass-field .schema-toggle-label');
    await expect(toggleLabel).toHaveCount(1);
    await expect(toggleLabel).toHaveText(`允許${SENTINEL_ANSWER_ZH}`);
  });

  test('en: the toggle label reflects a sentinel injected into shared/sidebar.js', async ({ page }) => {
    await interceptBypassWordingWithSentinel(page);
    await setLangEn(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-toggle-sentinel-en',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const toggleLabel = page.locator('.schema-bypass-field .schema-toggle-label');
    await expect(toggleLabel).toHaveCount(1);
    await expect(toggleLabel).toHaveText(`Allow "${SENTINEL_ANSWER_EN}"`);
  });
});

test.describe('issue #811 ownership proof: task-new preview bypass chips read BYPASS_WORDING live at render time, not a hand-copied literal (task-config.engine.js)', () => {
  test('zh: appendBypassControl call site (standalone preview, e.g. sequence_tagging) shows the sentinel', async ({ page }) => {
    await interceptBypassWordingWithSentinel(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-chip-sentinel-zh',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', spans: 'output' },
    });

    const chip = page
      .locator('#annotationPreview')
      .getByRole('button', { name: SENTINEL_ANSWER_ZH, exact: true });
    await expect(chip).toHaveCount(1);
  });

  test('en: appendBypassControl call site (standalone preview, e.g. sequence_tagging) shows the sentinel', async ({ page }) => {
    await interceptBypassWordingWithSentinel(page);
    await setLangEn(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-chip-sentinel-en',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', spans: 'output' },
    });

    const chip = page
      .locator('#annotationPreview')
      .getByRole('button', { name: SENTINEL_ANSWER_EN, exact: true });
    await expect(chip).toHaveCount(1);
  });

  /* bypassChipLabel (task-config.engine.js) is the composite call site --
   * hit only when both entity_recognition and relation_identification are
   * selected, which routes to the unified ABSA-style preview instead of the
   * standalone appendBypassControl path above. dataFile/roles borrowed from
   * task-new-output-type-preview.spec.ts's "dual output" test, the existing
   * setup known to produce this composite preview. */
  test('zh: bypassChipLabel call site (composite entity_recognition + relation_identification preview) shows the sentinel', async ({
    page,
  }) => {
    await interceptBypassWordingWithSentinel(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-chip-sentinel-composite-zh',
      category: 'sequence',
      outputType: ['entity_recognition', 'relation_identification'],
      inputType: 'single_item',
      dataFile: 'medical-ner-re.json',
      roles: { text: 'input', entities: 'output', triples: 'output' },
    });

    const sentinelChips = page
      .locator('.preview-bypass-row')
      .getByRole('button', { name: new RegExp(SENTINEL_ANSWER_ZH) });
    await expect(sentinelChips).toHaveCount(2);
  });

  test('en: bypassChipLabel call site (composite entity_recognition + relation_identification preview) shows the sentinel', async ({
    page,
  }) => {
    await interceptBypassWordingWithSentinel(page);
    await setLangEn(page);
    await goToStep2(page, {
      taskName: 'issue-811-bypass-chip-sentinel-composite-en',
      category: 'sequence',
      outputType: ['entity_recognition', 'relation_identification'],
      inputType: 'single_item',
      dataFile: 'medical-ner-re.json',
      roles: { text: 'input', entities: 'output', triples: 'output' },
    });

    const sentinelChips = page
      .locator('.preview-bypass-row')
      .getByRole('button', { name: new RegExp(SENTINEL_ANSWER_EN) });
    await expect(sentinelChips).toHaveCount(2);
  });
});

test.describe('issue #811: dashboard reviewer step description decision name (dashboard.i18n.js / dashboard.html stepReviewer2Desc)', () => {
  const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

  test('zh: the description drops 無法判定 for 無法裁決', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    const desc = page.locator('#stepReviewer2Desc');
    await expect(desc).toBeVisible();
    const descText = await desc.textContent();
    expect(descText?.trim().length).toBeGreaterThan(0);

    await expect(desc).not.toContainText('無法判定');
    await expect(desc).toContainText('無法裁決');
  });

  test('en: the description drops "unable to determine" for "cannot adjudicate"', async ({ page }) => {
    await setLangEn(page);
    await page.goto(DASHBOARD_URL);

    const desc = page.locator('#stepReviewer2Desc');
    await expect(desc).toBeVisible();
    const descText = await desc.textContent();
    expect(descText?.trim().length).toBeGreaterThan(0);

    await expect(desc).not.toContainText('unable to determine');
    await expect(desc).toContainText('cannot adjudicate');
  });
});

test.describe('issue #811: task-detail demo-guide sentences decision name (task-detail.data.js reviewerGuidelineText, design.md D3/R1)', () => {
  const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
  /* R1: only the decision name in these three sentences changes. The
   * finalized-RESULT wording (FR-061/FR-063/FR-095/FR-097) is out of scope
   * and keeps 無法判定; these sentences describe the review decision
   * (審核決策為通過／修正／無法判定三選一), not a finalized value, which is
   * why design.md D3 lists them as in-scope. English is not asserted: these
   * profiles have no reviewerGuidelineTextEn override (getTaskGuidelineRoleText
   * falls back to the zh-only base field regardless of state.lang), matching
   * tasks.md 2.1's wording which does not say "兩種語言" for this surface. */
  const TASK_IDS = ['T014', 'T015', 'T016'];

  for (const taskId of TASK_IDS) {
    test(`zh: ${taskId} reviewer guideline drops 無法判定 for 無法裁決`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);

      const summary = page.locator('#valueReviewerGuidelineContentSummary');
      // design.md's own seed content always includes 審核判準 (issue #405) --
      // a positive check the summary rendered real guideline copy, not the
      // empty-state fallback, before the negative assertion below.
      await expect(summary).toContainText('審核判準');

      await expect(summary).not.toContainText('無法判定');
      await expect(summary).toContainText('無法裁決');
    });
  }
});

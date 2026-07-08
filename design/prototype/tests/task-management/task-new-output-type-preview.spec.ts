import { test, expect, type Page } from '@playwright/test';
import path from 'path';

declare global {
  interface Window {
    state?: Record<string, unknown>;
    revalidateCurrentStep?: () => void;
  }
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

interface SetupConfig {
  taskName: string;
  category: string | string[];
  outputType: string | string[];
  inputType: string;
  dataFile: string;
  roles: Record<string, string>;
}

async function setupAndGoToStep2(page: Page, config: SetupConfig) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', config.taskName);

  const categories = Array.isArray(config.category)
    ? config.category
    : [config.category];
  for (const cat of categories) {
    await page.locator(`#taskCategoryChips [data-key="${cat}"]`).click();
  }

  // Input type must be selected before output types: granularity-constrained
  // outputs (e.g. entity_relation, item_pair only) are hidden until then
  await page.locator(`#taskInputTypeChips [data-key="${config.inputType}"]`).click();

  const outputTypes = Array.isArray(config.outputType)
    ? config.outputType
    : [config.outputType];
  for (const ot of outputTypes) {
    await page.locator(`#taskOutputTypeChips [data-key="${ot}"]`).click();
  }

  await page.locator('#datasetFileInput').setInputFiles(
    path.join(EXAMPLE_DATA, config.dataFile),
  );
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

  for (const [col, role] of Object.entries(config.roles)) {
    await page
      .locator(`.inline-preview-role-select[aria-label$="${col}"]`)
      .selectOption(role);
  }

  await page.evaluate(() => {
    window.revalidateCurrentStep?.();
  });
  await page.waitForTimeout(200);

  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

interface LabelOption {
  name: string;
  color: string;
}

interface DimensionConfig {
  name: string;
  min: number;
  max: number;
  step: number;
}

interface OutputConfig {
  label_options?: LabelOption[];
  dimensions?: DimensionConfig[];
  dimension_name?: string;
  min?: number;
  max?: number;
  step?: number;
  _autoPopulated?: boolean;
  [key: string]: unknown;
}

interface PreviewStateEntry {
  selected?: string | string[];
  value?: number;
  text?: string;
  activeType?: string;
  markers?: { position: number; type: string }[];
  tokens?: string[];
  _seeded?: boolean;
  [key: string]: unknown;
}

interface Triple {
  subj: string;
  rel: string;
  obj: string;
}

interface Entity {
  text: string;
  type: string;
  start: number;
  end: number;
  color: string;
}

type WindowState = {
  outputConfigs: Record<string, OutputConfig>;
  previewState: Record<string, PreviewStateEntry>;
  previewTriples: Triple[];
  previewEntities: Entity[];
};

function getState(page: Page, key: string) {
  return page.evaluate(
    (k) => window.state?.[k],
    key,
  );
}

// FR-003g-2: evidence-role fields must never render in the Step 2 preview.
// The legacy card class guards against a verbatim revert; `evidenceText`
// must be a substring unique to the evidence field so the check also
// catches re-introduction under different markup.
async function expectNoEvidenceInPreview(page: Page, evidenceText?: string) {
  const preview = page.locator('#annotationPreview');
  await expect(preview.locator('.sp-evidence-card')).toHaveCount(0);
  if (evidenceText) {
    await expect(preview).not.toContainText(evidenceText);
  }
}

// ─── 10 Basic Output Types ──────────────────────────────────

test.describe('Step 2 preview: all 10 output types with example data', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('single_label — gold_label pre-selected, labels from unique values', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'single-label-test',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const labels = cfg.single_label.label_options!.map((l: LabelOption) => l.name);
    expect(labels).toContain('positive');
    expect(labels).toContain('negative');
    expect(labels).toContain('neutral');

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.single_label.selected).toBe('positive');
  });

  test('multi_label — gold_labels array parsed, labels pre-selected', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'multi-label-test',
      category: 'classification',
      outputType: 'multi_label',
      inputType: 'single_item',
      dataFile: 'multi-label.json',
      roles: { text: 'input', gold_labels: 'output' },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const labels = cfg.multi_label.label_options!.map((l: LabelOption) => l.name);
    expect(labels.length).toBeGreaterThanOrEqual(3);

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.multi_label.selected!.length).toBeGreaterThanOrEqual(1);
  });

  test('free_text — gold_answer pre-filled in textarea', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'free-text-test',
      category: 'generation',
      outputType: 'free_text',
      inputType: 'single_item',
      dataFile: 'free-text.json',
      roles: { text: 'input', gold_answer: 'output', reference: 'evidence' },
    });

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.free_text.text!).toBeTruthy();
    expect(typeof ps.free_text.text).toBe('string');
    expect(ps.free_text.text!.length).toBeGreaterThan(0);

    const textarea = page.locator('#annotationPreview textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).not.toBeEmpty();

    await expectNoEvidenceInPreview(page, '免費諮商服務');
  });

  test('single_dim — gold_score shown on slider', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'single-dim-test',
      category: 'regression',
      outputType: 'single_dim',
      inputType: 'single_item',
      dataFile: 'single-dim.json',
      roles: { text: 'input', gold_score: 'output' },
    });

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.single_dim.value).toBeDefined();
    expect(typeof ps.single_dim.value).toBe('number');
  });

  test('multi_dim — dimensions auto-populated from gold_scores object', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'multi-dim-test',
      category: 'regression',
      outputType: 'multi_dim',
      inputType: 'single_item',
      dataFile: 'multi-dim.json',
      roles: { source: 'input', gold_scores: 'output' },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const dims = cfg.multi_dim.dimensions!.map((d: DimensionConfig) => d.name);
    expect(dims).toContain('fluency');
    expect(dims).toContain('adequacy');
    expect(dims).toContain('coherence');
  });

  test('token_class — gold_tags parsed as array', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'token-class-test',
      category: 'sequence',
      outputType: 'token_class',
      inputType: 'single_item',
      dataFile: 'token-class.json',
      roles: { text: 'input', gold_tags: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview).toBeVisible();

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.token_class).toBeDefined();
  });

  test('span — gold_spans shown in preview', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'span-test',
      category: 'sequence',
      outputType: 'span',
      inputType: 'single_item',
      dataFile: 'span.json',
      roles: { text: 'input', gold_spans: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview).toBeVisible();

    const inited = await getState(page, 'previewInited');
    expect(inited).toBe(true);

    const entities = (await getState(page, 'previewEntities')) as Entity[];
    expect(entities.length).toBeGreaterThanOrEqual(1);
  });

  test('boundary — gold_boundaries shown in preview', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'boundary-test',
      category: 'sequence',
      outputType: 'boundary',
      inputType: 'single_item',
      dataFile: 'boundary.json',
      roles: { text: 'input', gold_boundaries: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview).toBeVisible();

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.boundary).toBeDefined();
  });

  test('relation_triple — gold_triples loaded with subj/rel/obj format', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'relation-triple-test',
      category: 'sequence',
      outputType: 'relation_triple',
      inputType: 'single_item',
      dataFile: 'relation-triple.json',
      roles: { text: 'input', gold_triples: 'output' },
    });

    const triples = (await getState(page, 'previewTriples')) as Triple[];
    expect(triples.length).toBeGreaterThanOrEqual(1);
    expect(triples[0]).toHaveProperty('subj');
    expect(triples[0]).toHaveProperty('rel');
    expect(triples[0]).toHaveProperty('obj');

    // Standalone relation_triple uses the same sequential builder as the ABSA
    // unified path (E1/Arg1 → Relation → E2/Arg2), not the legacy dropdowns:
    // no <select> anywhere, and the step buttons gate sequentially (only
    // E1/Arg1 enabled until an entity is bound).
    const preview = page.locator('#annotationPreview');
    expect(await preview.locator('select').count()).toBe(0);
    await expect(preview.getByRole('button', { name: 'E1/Arg1' })).toBeEnabled();
    await expect(preview.getByRole('button', { name: 'Relation', exact: true })).toBeDisabled();
    await expect(preview.getByRole('button', { name: 'E2/Arg2' })).toBeDisabled();
  });

  test('entity_relation — item_pair with treats/causes/prevents labels', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'entity-relation-test',
      category: 'classification',
      outputType: 'entity_relation',
      inputType: 'item_pair',
      dataFile: 'entity-relation.json',
      roles: {
        entity1: 'input',
        entity2: 'input',
        gold_relation: 'output',
        context: 'evidence',
      },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const labels = cfg.entity_relation.label_options!.map((l: LabelOption) => l.name);
    expect(labels).toContain('treats');
    expect(labels).toContain('causes');
    expect(labels).toContain('prevents');

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.entity_relation.selected).toBe('treats');

    await expectNoEvidenceInPreview(page, '胰島素阻抗');

    const html = await page.locator('#annotationPreview').innerHTML();
    expect(html).toContain('Metformin');
    expect(html).toContain('第二型糖尿病');
  });
});

// ─── 4 Composite Tasks ─────────────────────────────────────

test.describe('Step 2 preview: composite task data files', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('nli.json — item_pair single_label with Premise/Hypothesis', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'nli-composite-test',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'item_pair',
      dataFile: 'nli.json',
      roles: {
        Premise: 'input',
        Hypothesis: 'input',
        Label: 'output',
        Evidence: 'evidence',
      },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const labels = cfg.single_label.label_options!.map((l: LabelOption) => l.name);
    expect(labels).toContain('contradiction');
    expect(labels).toContain('entailment');

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.single_label.selected).toBe('contradiction');

    await expectNoEvidenceInPreview(page, '術前仍有必要');

    const preview = page.locator('#annotationPreview');
    const pairLabels = preview.locator('.annotation-preview-pair-label');
    await expect(pairLabels).toHaveCount(2);
    await expect(pairLabels.nth(0)).toContainText('Premise');
    await expect(pairLabels.nth(1)).toContainText('Hypothesis');
  });

  test('mrc.json — free_text with background as evidence', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'mrc-composite-test',
      category: 'generation',
      outputType: 'free_text',
      inputType: 'single_item',
      dataFile: 'mrc.json',
      roles: {
        question: 'input',
        answer: 'output',
        background: 'evidence',
      },
    });

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.free_text.text!.length).toBeGreaterThan(50);

    await expectNoEvidenceInPreview(page, '免費心理諮商');

    const textarea = page.locator('#annotationPreview textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).not.toBeEmpty();
  });

  test('medical-ner-re.json — dual output (span + relation_triple) with entities and triples', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'medical-ner-re-test',
      category: 'sequence',
      outputType: ['span', 'relation_triple'],
      inputType: 'single_item',
      dataFile: 'medical-ner-re.json',
      roles: { text: 'input', entities: 'output', triples: 'output' },
    });

    const triples = (await getState(page, 'previewTriples')) as Triple[];
    expect(triples.length).toBe(8);
    expect(triples[0].subj).toContain('左心耳');
    expect(triples[0].obj).toContain('左心房');

    const entities = (await getState(page, 'previewEntities')) as Entity[];
    expect(entities.length).toBe(11);

    const html = await page.locator('#annotationPreview').innerHTML();
    expect(html).toContain('整合預覽');

    // relation_types is auto-populated from the distinct semantic type labels
    // in the pre-labeled triples — NOT trigger words or hardcoded defaults.
    const cfg = (await getState(page, 'outputConfigs')) as WindowState['outputConfigs'];
    const relTypes = (cfg.relation_triple as { relation_types: string[] }).relation_types;
    expect(relTypes).toEqual(['bodyLocation', 'causes', 'adverseOutcome']);
    expect(relTypes).not.toContain('has_aspect');
    expect(relTypes).not.toContain('has_opinion');

    // The generated config must not leak the hardcoded defaults either.
    const code = await page.evaluate(() => {
      const editor = document.getElementById('codeEditor') as HTMLTextAreaElement;
      return editor?.value || '';
    });
    expect(code).not.toContain('has_aspect');
    expect(code).toContain('bodyLocation');
  });

  test('absa-va.json — triple output (span + relation_triple + multi_dim) across two categories', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'absa-va-test',
      category: ['regression', 'sequence'],
      outputType: ['span', 'relation_triple', 'multi_dim'],
      inputType: 'single_item',
      dataFile: 'absa-va.json',
      roles: {
        utterances: 'evidence',
        text: 'input',
        gold_triplets: 'output',
        incomplete_annotations: 'output',
      },
    });

    const triples = (await getState(page, 'previewTriples')) as Triple[];
    expect(triples.length).toBeGreaterThanOrEqual(2);
    expect(triples[0].subj).toContain('Note 10 plus');

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    expect(Object.keys(cfg)).toContain('multi_dim');
    expect(Object.keys(cfg)).toContain('span');
    expect(Object.keys(cfg)).toContain('relation_triple');

    const html = await page.locator('#annotationPreview').innerHTML();
    expect(html).toContain('整合預覽');
    expect(html).toContain('多維度回歸');
    expect(html).toContain('rottenrockteahouse');

    // No unique content probe: the input `text` column concatenates the
    // utterances, so every utterances substring also appears in input text.
    await expectNoEvidenceInPreview(page);
  });
});

// ─── Data Transformation Validation ───────────────────────

test.describe('Step 2 preview: data transformation and config integrity', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('generated config does not contain _autoPopulated or other private keys', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'config-integrity-test',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const codeContent = await page.evaluate(() => {
      const editor = document.getElementById('codeEditor') as HTMLTextAreaElement;
      return editor?.value || '';
    });

    expect(codeContent).not.toContain('_autoPopulated');
    expect(codeContent).not.toContain('_seeded');
    expect(codeContent.length).toBeGreaterThan(0);
  });

  test('preview renders visible UI elements for seeded data', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'render-validation-test',
      category: 'regression',
      outputType: 'single_dim',
      inputType: 'single_item',
      dataFile: 'single-dim.json',
      roles: { text: 'input', gold_score: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview).toBeVisible();

    const slider = preview.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    const sliderValue = await slider.inputValue();
    expect(Number(sliderValue)).not.toBeNaN();
  });
});

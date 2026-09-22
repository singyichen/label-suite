import { test, expect, type Locator, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, fillArbitrationReasons, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* FR-100 §1 / §4 / §7, AC-3.57, AC-3.58, SC-004Z (spec 015, issue #766) --
 * the finalized card's remaining-count cue and its zero-state exit.
 *
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *   FR-100 §1 -- remaining == 0 MUST always agree with
 *                findNextActionableReviewUnit() returning null; there is no
 *                second counting formula.
 *   FR-100 §4 -- the zero-state link's target MUST be
 *                buildListReturnUrl() + '&notice=no_actionable_review',
 *                MUST be an anchor element (never a button/form control),
 *                and MUST NOT carry sample_id.
 *   FR-100 §7 -- the retired FR-082 three-exit post-submit card
 *                (`ws-post-submit-cta*` / `.rv-exits*`) MUST NOT resurrect;
 *                the zero-state exit count is exactly 1.
 *
 * design.md D1 -- listActionableReviewUnits() (already exported by Green
 * task 1.2, commit 6e8cb406) is the SOLE source both the remaining count and
 * findNextActionableReviewUnit() read.
 * design.md D2 -- NO_ACTIONABLE_REVIEW_LABELS (already exported by Green
 * task 1.2) is the SOLE definition of the zero-state wording, shared with
 * annotation-list.html's `list-no-actionable-notice` (Green task 1.4,
 * landed).
 * design.md D3 -- the zero-state link's URL is buildListReturnUrl() +
 * '&notice=no_actionable_review', the SAME construction FR-099 §5's
 * no-actionable exit already uses.
 * design.md D4 -- the link is an `<a>`, placed after the read-only note and
 * before the first outKey value line; new testids, none of FR-082's retired
 * ones.
 *
 * This is the Red contract for Green task 1.6, which has NOT been
 * implemented yet: `renderFinalizedCard()`
 * (design/prototype/pages/annotation/annotation-workspace.config.js) does
 * not append anything between the read-only note and the first outKey line
 * today, so every assertion on `ws-finalized-remaining` (and its
 * zero-state children `ws-finalized-remaining-title` /
 * `-message` / `ws-finalized-back-to-list`) is expected to FAIL because
 * that testid does not exist -- NOT because of a page-load, seeding or
 * selector problem. The "stays in place, no navigation" and "retired exits
 * absent" assertions in each test are a regression floor that already
 * passes under today's code (mirroring
 * issue-719-review-submit-auto-advance.spec.ts's finalization-exemption
 * cases): a future Green implementation must not regress them while adding
 * the new cue.
 *
 * Seeding mirrors issue-719-review-submit-auto-advance.spec.ts:
 * REVIEWER_MOCK_ROWS.T001 is pinned at runtime via patchDataFile (never the
 * source file) so the review-unit ENUMERATION is deterministic, and every
 * unit gets a real markSampleSubmitted() annotator submission (an un-seeded
 * mock row derives status `null`, which reviewUnitActionRank() also ranks
 * actionable -- see that file's header comment). Reviewer submissions use a
 * bare `{ previewState: { single_label: { selected } } }` payload with no
 * `decisions` field: annotation-workspace.data.js's convertSubmissionAnswer()
 * (:1638) only ever reads `submission.previewState[outKey]`, and
 * anyReviewerChanged()'s dispute derivation is driven by an answer-VALUE
 * difference alone, so the richer decisions/reasons/values payload
 * issue-596-finalized-card.spec.ts uses is not needed to reach
 * PENDING/DISPUTED/FINALIZED deterministically here.
 *
 * Traceability: openspec/changes/finalized-card-remaining-cue/tasks.md task
 * 1.5 (Red, this file) / 1.6 (Green, not yet done); design.md D1-D4;
 * specs/annotation/015-annotation-workspace/spec.md FR-100, AC-3.57,
 * AC-3.58, SC-004Z; FR-081 (view-state keys), FR-049 (identity keys),
 * FR-093 (single-owner review relay), FR-060 (arbiter eligibility), FR-099
 * §7 (finalization exemption -- a submit that finalizes a unit stays in
 * place); issue-596-finalized-card.spec.ts (button-exclusion pattern,
 * ws-trace-actor); issue-719-review-submit-auto-advance.spec.ts
 * (pinReviewUnits/seedSubmission/countLoads/requested-URL pattern);
 * issue-517-post-submit-cta-removed.spec.ts (retired testids/classes).
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type ReviewUnit = { sampleId: string; annotatorId: string; status: string | null };

/* Not declared via `declare global` -- shared across every spec file
 * TypeScript compiles together, and other files already declare this
 * window property with a different, incompatible shape (TS2717). An inline
 * cast at each call site sidesteps that, mirroring every sibling spec's
 * pattern. */
type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: Identity,
  ) => void;
  listActionableReviewUnits: (
    taskId: string,
    runType: string,
    reviewerId: string,
  ) => Array<{ unit: ReviewUnit; rank: number }>;
  findNextActionableReviewUnit: (taskId: string, runType: string, reviewerId: string) => ReviewUnit | null;
};

const TASK = 'T001';
const RUN_TYPE = 'official_run';

/* Roster (annotation-workspace.data.js REVIEWER_ROSTER): wang/li/chen/lin.
 * Only chen carries can_arbitrate: true (FR-060) -- reused here from
 * issue-719-review-submit-auto-advance.spec.ts's naming so PARTICIPANT vs
 * ARBITER also reads as "two identities with different eligibility",
 * exactly what the different-identity clause below needs. */
const PARTICIPANT = 'reviewer_wang';
const ARBITER = 'reviewer_chen';
const SOLO_PARTICIPANT = [{ id: PARTICIPANT, name: '王小明' }];
const SOLO_ARBITER = [{ id: ARBITER, name: '陳美玲', can_arbitrate: true }];
const TWO_REVIEWER_ROSTER = [
  { id: PARTICIPANT, name: '王小明' },
  { id: ARBITER, name: '陳美玲', can_arbitrate: true },
];

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seedSubmission(
  page: Page,
  role: 'annotator' | 'reviewer',
  sampleId: string,
  value: string,
  identity: Identity,
): Promise<void> {
  return page.evaluate(
    (a) => {
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        a.task,
        a.role,
        a.runType,
        a.sampleId,
        a.payload,
        '',
        a.identity,
      );
    },
    { task: TASK, role, runType: RUN_TYPE, sampleId, payload: labelPayload(value), identity },
  );
}

/* Pins the review-unit ENUMERATION to exactly the (sample, annotator) pairs
 * a fixture constructs -- see issue-719-review-submit-auto-advance.spec.ts's
 * pinReviewUnits() header comment for why this is necessary and why the
 * roster is spliced in place rather than reassigned. */
function pinReviewUnits(
  page: Page,
  rows: Record<string, Array<{ annotator: string; answers: unknown }>>,
  roster?: Array<{ id: string; name: string; can_arbitrate?: boolean }>,
) {
  return patchDataFile(
    page,
    'annotation-workspace.data.js',
    `
    window.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS.${TASK} = ${JSON.stringify(rows)};
    ${
      roster
        ? `
    var roster = window.LabelSuiteAnnotationWorkspaceData.REVIEWER_ROSTER;
    roster.splice.apply(roster, [0, roster.length].concat(${JSON.stringify(roster)}));`
        : ''
    }
  `,
  );
}

/* Distinguishes an in-place same-page re-render from a real navigation --
 * see issue-719-review-submit-auto-advance.spec.ts's countLoads() header
 * comment. */
function countLoads(page: Page): { value: number } {
  const counter = { value: 0 };
  page.on('load', () => {
    counter.value += 1;
  });
  return counter;
}

function workspaceUrl(params: { sampleId: string; annotatorId: string; reviewerId: string; extraQuery?: string }): string {
  return (
    buildWorkspaceUrl({
      task_id: TASK,
      sample_id: params.sampleId,
      role: 'reviewer',
      run_type: RUN_TYPE,
      annotator_id: params.annotatorId,
      reviewer_id: params.reviewerId,
    }) + (params.extraQuery || '')
  );
}

function readActionableCount(page: Page, reviewerId: string): Promise<number> {
  return page.evaluate(
    (a) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData;
      return data.listActionableReviewUnits(a.task, a.runType, a.reviewerId).length;
    },
    { task: TASK, runType: RUN_TYPE, reviewerId },
  );
}

function readFindNext(page: Page, reviewerId: string): Promise<ReviewUnit | null> {
  return page.evaluate(
    (a) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData;
      return data.findNextActionableReviewUnit(a.task, a.runType, a.reviewerId);
    },
    { task: TASK, runType: RUN_TYPE, reviewerId },
  );
}

/* design.md D4: ws-finalized-remaining MUST sit immediately after the
 * read-only note (a plain <p>) and immediately before the first outKey
 * value line (a <div> whose text starts with the outKey name + '：',
 * annotation-workspace.config.js renderFinalizedCard() :4204). Checked
 * structurally via DOM siblings rather than a fixed child index, so this
 * Red contract does not assume exactly how Green wraps the new element. */
async function assertRemainingPosition(remaining: Locator): Promise<void> {
  const info = await remaining.evaluate((el) => ({
    prevTag: el.previousElementSibling ? el.previousElementSibling.tagName : null,
    nextStartsWithOutKey: el.nextElementSibling ? /^single_label(：|:)/.test(el.nextElementSibling.textContent || '') : false,
  }));
  expect(info.prevTag, 'ws-finalized-remaining must immediately follow the read-only note (a <p> element), per design.md D4').toBe('P');
  expect(
    info.nextStartsWithOutKey,
    'ws-finalized-remaining must immediately precede the first outKey value line',
  ).toBe(true);
}

/* Parallel workers hitting the static server occasionally drop a
 * <script src> (issue #582 lineage); every test below does its own
 * page.goto, so this guards the same known flake the sibling review-unit
 * specs already carry. */
test.describe.configure({ retries: 2 });

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* Fixture A: exactly one actionable unit remains for the sole reviewer --
 * sent-001 is finalized (approve, same value 'sad') and is the unit being
 * viewed; sent-002 is pending, assigned to the same (sole) reviewer. */
async function seedNonZeroRemaining(page: Page): Promise<void> {
  await pinReviewUnits(
    page,
    {
      'sent-001': [{ annotator: 'kioleemg12', answers: { single_label: 'sad' } }],
      'sent-002': [{ annotator: '113450022', answers: { single_label: 'positive' } }],
    },
    SOLO_PARTICIPANT,
  );
  await page.goto(workspaceUrl({ sampleId: 'sent-001', annotatorId: 'kioleemg12', reviewerId: PARTICIPANT }));
  await seedSubmission(page, 'annotator', 'sent-001', 'sad', { annotatorId: 'kioleemg12' });
  await seedSubmission(page, 'reviewer', 'sent-001', 'sad', { annotatorId: 'kioleemg12', reviewerId: PARTICIPANT });
  await seedSubmission(page, 'annotator', 'sent-002', 'positive', { annotatorId: '113450022' });
  await page.reload();
}

test.describe('AC-3.57 clauses 1-2: N > 0 renders the count, positioned per design.md D4, with no zero-state elements', () => {
  test('exactly one ws-finalized-remaining containing the derived count; no link/title/message', async ({ page }) => {
    await seedNonZeroRemaining(page);

    const count = await readActionableCount(page, PARTICIPANT);
    expect(count, 'precondition: exactly one actionable unit remains for PARTICIPANT').toBe(1);
    const next = await readFindNext(page, PARTICIPANT);
    expect(next, 'precondition: findNextActionableReviewUnit() must be non-null when remaining > 0 (FR-100 §1)').not.toBeNull();

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card).toBeVisible();

    const remaining = card.getByTestId('ws-finalized-remaining');
    await expect(remaining).toHaveCount(1);
    await expect(remaining).toContainText(String(count));

    await expect(card.getByTestId('ws-finalized-remaining-title')).toHaveCount(0);
    await expect(card.getByTestId('ws-finalized-remaining-message')).toHaveCount(0);
    await expect(card.getByTestId('ws-finalized-back-to-list')).toHaveCount(0);

    await assertRemainingPosition(remaining);
  });
});

/* Fixture B: two identities on the SAME finalized unit (sent-001) derive
 * two genuinely different non-zero counts, per listActionableReviewUnits()
 * (FR-100 §1) -- not because either identity's number is stale. Assignment
 * is positional (getReviewAssignments(): official_run walks the sorted
 * unit list with `roster[index % roster.length]`) against the effective
 * assignment roster. ARBITER is reserved, so PARTICIPANT receives every
 * new pending unit:
 *   sent-001 (index 0 -> PARTICIPANT) finalized, the unit being viewed.
 *   sent-002 and sent-003 pending, assigned to PARTICIPANT only.
 *   sent-004 disputed -- PARTICIPANT reviewed it with
 *     a differing value ('fear' vs the annotator's 'joy'), so PARTICIPANT
 *     already holds a reviewer submission on it (not arbiter-eligible
 *     regardless of the can_arbitrate flag) while ARBITER never touched it
 *     and IS arbiter-eligible (FR-060).
 * Derived: PARTICIPANT's actionable = {sent-002, sent-003} -> 2;
 *          ARBITER's actionable = {sent-004} -> 1.
 */
async function seedTwoIdentityRemaining(page: Page): Promise<void> {
  await pinReviewUnits(
    page,
    {
      'sent-001': [{ annotator: 'kioleemg12', answers: { single_label: 'sad' } }],
      'sent-002': [{ annotator: '113450022', answers: { single_label: 'positive' } }],
      'sent-003': [{ annotator: 'tony0950127', answers: { single_label: 'neutral' } }],
      'sent-004': [{ annotator: 'annie0102', answers: { single_label: 'joy' } }],
    },
    TWO_REVIEWER_ROSTER,
  );
  await page.goto(workspaceUrl({ sampleId: 'sent-001', annotatorId: 'kioleemg12', reviewerId: PARTICIPANT }));
  await seedSubmission(page, 'annotator', 'sent-001', 'sad', { annotatorId: 'kioleemg12' });
  await seedSubmission(page, 'reviewer', 'sent-001', 'sad', { annotatorId: 'kioleemg12', reviewerId: PARTICIPANT });
  await seedSubmission(page, 'annotator', 'sent-002', 'positive', { annotatorId: '113450022' });
  await seedSubmission(page, 'annotator', 'sent-003', 'neutral', { annotatorId: 'tony0950127' });
  await seedSubmission(page, 'annotator', 'sent-004', 'joy', { annotatorId: 'annie0102' });
  await seedSubmission(page, 'reviewer', 'sent-004', 'fear', { annotatorId: 'annie0102', reviewerId: PARTICIPANT });
  await page.reload();
}

test.describe('AC-3.57 clause 4: a different identity on the same finalized unit shows its OWN derived count', () => {
  test('PARTICIPANT and ARBITER each see the remaining count listActionableReviewUnits derives for their own identity, not a stale one', async ({
    page,
  }) => {
    await seedTwoIdentityRemaining(page);

    const participantCount = await readActionableCount(page, PARTICIPANT);
    const arbiterCount = await readActionableCount(page, ARBITER);
    expect(participantCount, 'precondition: PARTICIPANT derived actionable count').toBe(2);
    expect(arbiterCount, 'precondition: ARBITER derived actionable count').toBe(1);
    expect(
      participantCount,
      'this fixture is deliberately built so the two identities derive genuinely different non-zero counts -- if this ever fails, the fixture (not the feature) needs revisiting',
    ).not.toBe(arbiterCount);

    await page.goto(workspaceUrl({ sampleId: 'sent-001', annotatorId: 'kioleemg12', reviewerId: PARTICIPANT }));
    const participantRemaining = page.getByTestId('ws-finalized-remaining');
    await expect(participantRemaining).toHaveCount(1);
    await expect(participantRemaining).toContainText(String(participantCount));

    await page.goto(workspaceUrl({ sampleId: 'sent-001', annotatorId: 'kioleemg12', reviewerId: ARBITER }));
    const arbiterRemaining = page.getByTestId('ws-finalized-remaining');
    await expect(arbiterRemaining).toHaveCount(1);
    await expect(arbiterRemaining).toContainText(String(arbiterCount));
  });
});

/* Fixture C: the sole reviewer's only unit is finalized (approve, same
 * value) and no other unit exists on the task -> listActionableReviewUnits
 * is empty -> N = 0. */
async function seedZeroRemaining(page: Page, extraQuery = ''): Promise<void> {
  await pinReviewUnits(
    page,
    {
      'sent-001': [{ annotator: 'kioleemg12', answers: { single_label: 'sad' } }],
    },
    SOLO_PARTICIPANT,
  );
  await page.goto(
    workspaceUrl({ sampleId: 'sent-001', annotatorId: 'kioleemg12', reviewerId: PARTICIPANT, extraQuery }),
  );
  await seedSubmission(page, 'annotator', 'sent-001', 'sad', { annotatorId: 'kioleemg12' });
  await seedSubmission(page, 'reviewer', 'sent-001', 'sad', { annotatorId: 'kioleemg12', reviewerId: PARTICIPANT });
  await page.reload();
}

test.describe('AC-3.57 clause 3, SC-004Z: the zero-state title/message match list-no-actionable-notice, in zh and after switching to en', () => {
  test('title and message read from the shared data-layer definition equal the live list page notice, in both languages; link count exactly 1', async ({
    page,
    context,
  }) => {
    await seedZeroRemaining(page);

    const nextUnit = await readFindNext(page, PARTICIPANT);
    expect(nextUnit, 'precondition: findNextActionableReviewUnit() must be null for the zero state to apply (FR-100 §1)').toBeNull();

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card).toBeVisible();

    const remaining = card.getByTestId('ws-finalized-remaining');
    await expect(remaining, 'ws-finalized-remaining is present in every render, zero-state included').toHaveCount(1);
    await assertRemainingPosition(remaining);

    const title = card.getByTestId('ws-finalized-remaining-title');
    const message = card.getByTestId('ws-finalized-remaining-message');
    await expect(title).toHaveCount(1);
    await expect(message).toHaveCount(1);
    await expect(card.getByTestId('ws-finalized-back-to-list')).toHaveCount(1);

    const zhTitle = await title.textContent();
    const zhMessage = await message.textContent();

    const listPage = await context.newPage();
    await listPage.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }) + '&notice=no_actionable_review');
    const notice = listPage.getByTestId('list-no-actionable-notice');
    await expect(notice).toBeVisible();
    await expect(notice.locator('strong')).toHaveText(zhTitle ?? '');
    await expect(notice.locator('span')).toHaveText(zhMessage ?? '');

    await page.locator('#langToggle').click();
    const enTitle = await title.textContent();
    const enMessage = await message.textContent();
    expect(enTitle, 'switching language on the workspace must actually change the rendered title').not.toBe(zhTitle);

    await listPage.locator('#langToggle').click();
    await expect(notice.locator('strong')).toHaveText(enTitle ?? '');
    await expect(notice.locator('span')).toHaveText(enMessage ?? '');

    await listPage.close();
  });
});

test.describe('AC-3.58 clauses 4-5: the zero-state link requests the FR-081/FR-049 list-return URL, never sample_id', () => {
  test('clicking ws-finalized-back-to-list requests annotation-list.html carrying the pre-visit view state, identity params and notice=no_actionable_review', async ({
    page,
  }) => {
    await seedZeroRemaining(page, '&status=pending&q=%E6%89%8B%E8%A1%93&limit=50&offset=0');

    const nextUnit = await readFindNext(page, PARTICIPANT);
    expect(nextUnit).toBeNull();

    const link = page.getByTestId('ws-finalized-back-to-list');
    await expect(link).toHaveCount(1);

    /* Assert on the REQUESTED navigation URL, not page.url() after landing
       -- annotation-list.html re-normalises its own address on boot
       (UXC-11), which would measure the destination's normalisation
       instead of what the link's href actually carried. Mirrors
       issue-719-review-submit-auto-advance.spec.ts's identical pitfall
       note. */
    const returnRequest = page.waitForRequest((req) => req.url().includes('annotation-list.html'), { timeout: 5000 });
    await link.click();

    const url = new URL((await returnRequest).url());
    expect(url.searchParams.get('task_id')).toBe(TASK);
    expect(url.searchParams.get('role')).toBe('reviewer');
    expect(url.searchParams.get('run_type')).toBe(RUN_TYPE);
    expect(url.searchParams.get('status')).toBe('pending');
    expect(url.searchParams.get('q')).toBe('手術');
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(url.searchParams.get('reviewer_id')).toBe(PARTICIPANT);
    expect(url.searchParams.get('notice')).toBe('no_actionable_review');
    expect(url.searchParams.has('sample_id'), 'the zero-state exit must never carry sample_id (FR-100 §4)').toBe(false);

    await expect(page).toHaveURL(/annotation-list\.html\?/);
    await expect(page.getByTestId('list-no-actionable-notice')).toBeVisible();
  });
});

test.describe('AC-3.58 clause 6: the zero-state link is an anchor, not a button, and adds no new button to the card', () => {
  test('ws-finalized-back-to-list is an <a> element; the card still has zero non-trace buttons (issue-596 pattern)', async ({ page }) => {
    await seedZeroRemaining(page);

    const card = page.getByTestId('ws-review-finalized-card');
    const link = card.getByTestId('ws-finalized-back-to-list');
    await expect(link).toHaveCount(1);
    const tagName = await link.evaluate((el) => el.tagName);
    expect(tagName, 'the zero-state exit MUST be an anchor element, never a button/form control (FR-100 §4)').toBe('A');

    /* Only the trace's ws-trace-actor tooltip triggers may be <button>
       (issue-596-finalized-card.spec.ts's identical assertion). */
    await expect(card.locator('button:not([data-testid="ws-trace-actor"])')).toHaveCount(0);
  });
});

test.describe('FR-100 §7 / issue #517 regression floor: the retired FR-082 exit card never resurrects on the zero-state card', () => {
  test('no ws-post-submit-cta* testid, no .rv-exits* class, and no "next actionable unit" / "back to Dashboard" text anywhere on the page', async ({
    page,
  }) => {
    await seedZeroRemaining(page);
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();

    const RETIRED_TESTIDS = [
      'ws-post-submit-cta',
      'ws-post-submit-cta-title',
      'ws-post-submit-next-unit',
      'ws-post-submit-next-none',
      'ws-post-submit-list',
      'ws-post-submit-dashboard',
    ];
    for (const testId of RETIRED_TESTIDS) {
      await expect(page.getByTestId(testId)).toHaveCount(0);
    }
    await expect(page.locator('.rv-exits, .rv-exits-title, .rv-exits-note, .rv-exits-actions, .rv-exits-none')).toHaveCount(0);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card).not.toContainText('下一個可處理單位');
    await expect(card).not.toContainText('返回 Dashboard');
  });
});

/* Fixture D: the arbiter's sole actionable unit is a dispute (sent-001,
 * annotator 'sad' vs reviewer 'fear'). Resolving it (仲裁採 B) finalizes the
 * unit and leaves no actionable unit anywhere on the task for this
 * identity -- the finalized card must re-render the zero state IN PLACE,
 * with no reload and no navigation requested before the user clicks the
 * link. Mirrors issue-719-review-submit-auto-advance.spec.ts's "FR-099
 * clause 7 (finalization exemption): an arbitration submit that finalizes
 * the unit stays in place" fixture verbatim -- that test already proves
 * `ws-review-finalized-card` count 1 / loads 0 pass today; this test adds
 * the NEW `ws-finalized-remaining*` zero-state assertions on top. */
async function seedArbiterLastUnitDisputed(page: Page): Promise<void> {
  await pinReviewUnits(
    page,
    {
      'sent-001': [{ annotator: 'kioleemg12', answers: { single_label: 'sad' } }],
    },
    SOLO_ARBITER,
  );
  await page.goto(workspaceUrl({ sampleId: 'sent-001', annotatorId: 'kioleemg12', reviewerId: ARBITER }));
  await seedSubmission(page, 'annotator', 'sent-001', 'sad', { annotatorId: 'kioleemg12' });
  await seedSubmission(page, 'reviewer', 'sent-001', 'fear', { annotatorId: 'kioleemg12', reviewerId: PARTICIPANT });
  await page.reload();
}

test.describe('AC-3.57 clause 5 / FR-099 §7: an arbitration submit that finalizes the last actionable unit re-renders the zero state in place', () => {
  test("the arbiter's last actionable dispute, once resolved, shows the zero-state card without a reload or any navigation request", async ({
    page,
  }) => {
    await seedArbiterLastUnitDisputed(page);
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();

    const preCount = await readActionableCount(page, ARBITER);
    const preNext = await readFindNext(page, ARBITER);
    expect(preCount, 'precondition: exactly one actionable dispute exists for ARBITER before the submit').toBe(1);
    expect(preNext, 'precondition: findNextActionableReviewUnit() must resolve to this very unit before the submit').not.toBeNull();

    const loads = countLoads(page);
    let sawListReturn = false;
    page.on('request', (req) => {
      if (req.url().includes('annotation-list.html')) sawListReturn = true;
    });

    await page.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    await expect(page.getByTestId('ws-review-finalized-card')).toHaveCount(1);
    await expect(page.getByTestId('ws-finalized-remaining')).toHaveCount(1);
    await expect(page.getByTestId('ws-finalized-remaining-title')).toHaveCount(1);
    await expect(page.getByTestId('ws-finalized-remaining-message')).toHaveCount(1);
    await expect(page.getByTestId('ws-finalized-back-to-list')).toHaveCount(1);

    const postCount = await readActionableCount(page, ARBITER);
    const postNext = await readFindNext(page, ARBITER);
    expect(postCount, 'no actionable units remain for ARBITER after the submit').toBe(0);
    expect(postNext).toBeNull();

    expect(loads.value, 'the card must re-render in place -- no full page load').toBe(0);
    expect(sawListReturn, 'no navigation to annotation-list.html may be requested before the user clicks the zero-state link').toBe(
      false,
    );
  });
});

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  assertNoPageErrors,
  buildListUrl,
  buildWorkspaceUrl,
  patchDataFile,
  skipGuidelineModal,
  trackPageErrors,
} from '../annotation/_workspace-helpers';
import {
  buildXRoleSeedPatch,
  DRY_RUN_RECORD_IDS,
  FIXTURE_MIN_REVIEWERS,
  FORCED_DIVERGENCE_RECORD_ID,
  OFFICIAL_RUN_ASSIGNMENTS,
  OFFICIAL_RUN_RECORD_IDS,
} from './fixtures/build-xrole-patch';

/* Cross-role canonical journey (issue #212, PR-B1 + PR-B2).
 *
 * PR-B1 covers XROLE-01 through XROLE-09 -- journey steps 1-7 (task
 * creation -> dataset upload -> guideline -> sampling/review settings ->
 * member management -> dry-run marking -> IAA gate) plus the two cross-page
 * reconciliation checkpoints (A: publish -> annotation-list count, B: 6
 * dry-run submissions -> status sync). PR-B2 extends this same file with
 * XROLE-10 through XROLE-25 (official run -> review -> dispute/arbitration
 * -> completion gaps -> export -> resilience checks).
 *
 * ── Two task ids, by design (not an oversight) ────────────────────────────
 * Issue #285 fixed `task-new.html`'s `submitTask()` (task-new.html:1398) so
 * it now persists the wizard's result into a `labelsuite.createdTasks`
 * localStorage bucket that `task-list.data.js` / `task-detail.data.js` merge
 * into `window.LabelSuiteTaskListData.tasks` / `window.LabelSuiteTaskDetailData
 * .profiles` at load time -- `resetTaskData()` (task-detail.html:4303-4352)
 * now resolves the wizard-created id instead of falling into
 * `TASK_NOT_FOUND`. XROLE-01/02 still run their wizard walkthrough against
 * its own generated `wizardTaskId` and every later stage (guideline onward)
 * still runs against a separate `fixtureTaskId` seeded via
 * `buildXRoleSeedPatch` (PR-A, already merged) -- not because the wizard task
 * is a dead end anymore, but because the persisted profile only carries what
 * the wizard itself collected (name/category/output config/a 2-record
 * dataset preview) and none of the richer fixture state (member roster,
 * dry-run/review settings, multi-record run-scoped dataset) the rest of the
 * journey needs. This matches the established pattern in
 * `xrole-fixture-smoke.spec.ts` and the single-page task-detail specs this
 * file's steps mirror.
 *
 * ── Shared BrowserContext (w4 plan §0.1, mandatory) ────────────────────────
 * One `browser.newContext()` + one `context.newPage()` per role (PL, A01,
 * A02, A03, and PR-B2's reviewer pages R01, R02, R03) instead of independent
 * contexts/storageState, because the dry-run submission buckets and
 * `DRY_RUN_PROGRESS_KEY` (annotation-workspace.data.js:314-345,
 * task-detail.html:4418-4439) live in `localStorage`, which is scoped to
 * the browser context's origin -- independent contexts would each start
 * with empty storage and never observe each other's submissions.
 * `test.describe.configure({ mode: 'serial' })` keeps the steps in journey
 * order since later steps depend on earlier ones' localStorage state.
 *
 * ── Known simplifications this suite deliberately does NOT paper over ─────
 * - Checkpoint A (XROLE-07) is a pure number-consistency check, not proof
 *   of an access-control gate: `#publishDryRunBtn`'s click only mutates the
 *   clicking page's own in-memory `TASK_DATA`. A01Page's annotation-list
 *   visit re-derives its row count purely from the seeded/patched profile,
 *   independent of whether PL ever clicked publish.
 * - Checkpoint B (XROLE-08) reaches `waiting_iaa_confirmation` through the
 *   established `&status=` URL-override pattern
 *   (task-detail-dry-run-status-sync.spec.ts), not by asserting a true
 *   3-annotator aggregate: `syncStatusFromDryRunProgress()`
 *   (task-detail.html:4418-4439) reads a single global
 *   `DRY_RUN_PROGRESS_KEY` written by `getSubmittedSampleCount()`
 *   (annotation-workspace.data.js:314-330), which is scoped to whichever
 *   identity wrote it LAST -- not a genuine cross-annotator aggregate. This
 *   suite still performs all 6 real submissions (2 samples x 3 annotators)
 *   because that is the intended journey, but the status-flip assertion
 *   only proves the last writer's own quota, not a true aggregate gate.
 * - XROLE-04 documents a real gap (`test.fail()`, isolated from the shared
 *   context): `canPublish()` -> `validateSampling()` (task-detail.html:
 *   8809-8818) never cross-checks `TASK_MEMBERS` active-annotator headcount
 *   against `minAnnotators`. D3/min_annotators member-count blocking is not
 *   implemented in the prototype.
 * - Audit-log assertions are N/A throughout -- the prototype has no audit
 *   log data source to assert against.
 *
 * ── PR-B2 simplifications (each documented in detail at its test) ─────────
 * - Checkpoint C (XROLE-10) cannot be a strict equality: task-detail's
 *   official count is `datasetTotal - sampling-derived trial usage`
 *   (task-detail.html:4823-4830), decoupled from the fixture's run-scoped
 *   3-record official subset. Both numbers are asserted explicitly.
 * - There is no per-annotator official assignment concept in the prototype
 *   -- every annotator's official_run list shows all 3 run-scoped records.
 *   OFFICIAL_RUN_ASSIGNMENTS is a fixture convention for who submits what.
 * - Reviewer corrections go through the real UI (correction chip + ✕ +
 *   submit), which in official_run triggers the FR-014I rollback
 *   (annotation-workspace.config.js:2703-2705): the annotator's sample
 *   drops back to pending and the annotator must resubmit before the
 *   review unit derives again. XROLE-14/16 assert that loop instead of
 *   papering over it with data-layer seeding.
 * - The seeded profile pins minReviewers = 2 (FIXTURE_MIN_REVIEWERS),
 *   matching w4's "n=2=min" wording: units finalize only at the second
 *   agreeing review. (The profile originally carried no review settings and
 *   defaulted to 1; issue #308's finalized-unit lock made that untenable --
 *   the first approval would have locked the unit before XROLE-14/15's
 *   second-reviewer interactions.)
 * - The annotation-results panel and its export never read localStorage
 *   submissions: since issue #284, getAnnotationResultsData()
 *   (task-detail.html) returns an empty set for any task id without an
 *   ANNOTATION_RESULTS_BY_TASK entry (it used to fall back to the T001
 *   seed and show another task's data), so XROLE-19/22 assert the real
 *   cross-page sync at the reviewer list / data layer and the honest
 *   empty state on the panel.
 */
test.use({ screenshot: 'only-on-failure', video: 'retain-on-failure' });
test.describe.configure({ mode: 'serial' });

const SEED_FIXTURE_FILE = path.resolve(__dirname, 'fixtures/xrole-lifecycle-seed.json');
const PANEL_LOAD_TIMEOUT = 15000;
const SAMPLING_VALUE = String(DRY_RUN_RECORD_IDS.length); // '2' -- matches the seeded dry_run record count so checkpoint A's numbers line up by design.
const ACTIVE_ANNOTATOR_COUNT = '1'; // TASK_MEMBERS (task-detail.html:3388-3395) ships 2 active annotators by default
// (Alex Wang, Olivia Lin), but by the time this constant is used (XROLE-07,
// which runs after XROLE-06 in serial order) XROLE-06 has already disabled
// Alex Wang, leaving only Olivia Lin active -- '1' reflects the real
// headcount at that point, not the original seed value. The
// minAnnotatorsInput 'input' listener (task-detail.html:9152-9157) clamps
// state.samplingDraft.minAnnotators to a floor of 2 regardless of what is
// typed, so this still exercises a value at/below true active headcount
// (the same "happy path, not the D3 gap" intent as before) without
// asserting a headcount that no longer holds by this point in the journey.

/* PR-B2 role/value constants. R03 mirrors the fixture's internal
 * ARBITER_REVIEWER_ID (fixtures/build-xrole-patch.ts:137, not exported):
 * the patch pushes it onto REVIEWER_ROSTER with can_arbitrate: true. R01 and
 * R02 are plain reviewer identities -- isArbiterCandidate() only needs the
 * ARBITER id on the roster; ordinary reviewers are identified purely by the
 * reviewer_id in the bucket key. */
const REVIEWER_R01 = 'R01';
const REVIEWER_R02 = 'R02';
const ARBITER_R03 = 'R03';
/* Annotator-side official answers are the records' gold labels
 * (fixtures/xrole-lifecycle-seed.json): gold_label is mapped to the output
 * role, so the workspace prefills it and XROLE-10/11's submissions carry it
 * (same gold-prefill mechanism XROLE-08 relied on). */
const OFFICIAL_GOLD: Record<string, string> = {
  'xr-off-001': 'neutral',
  'xr-off-002': 'positive',
  'xr-off-003': 'negative',
};
/* R02's correction on the forced-divergence record (≠ its gold 'positive'),
 * and the value R01+R02 both correct xr-off-003 to (≠ its gold 'negative'). */
const DIVERGENCE_CORRECTION = 'negative';
const CONVERGENCE_CORRECTION = 'positive';

let context: BrowserContext;
let plPage: Page;
let a01Page: Page;
let a02Page: Page;
let a03Page: Page;
let r01Page: Page;
let r02Page: Page;
let r03Page: Page;
let fixtureTaskId: string;
let wizardTaskId: string | null = null;
/* XROLE-25: page-error tracking across the whole mainline. Attached in
 * beforeAll (before any navigation) so every step of the journey is
 * covered; the isolated gap tests (XROLE-04/20/21/24) run on their own
 * fresh pages and are out of this net's scope by design. */
let pageErrorsByRole: Record<string, Error[]> = {};

test.beforeAll(async ({ browser }, testInfo) => {
  context = await browser.newContext();
  plPage = await context.newPage();
  a01Page = await context.newPage();
  a02Page = await context.newPage();
  a03Page = await context.newPage();
  r01Page = await context.newPage();
  r02Page = await context.newPage();
  r03Page = await context.newPage();

  pageErrorsByRole = {
    PL: trackPageErrors(plPage),
    A01: trackPageErrors(a01Page),
    A02: trackPageErrors(a02Page),
    A03: trackPageErrors(a03Page),
    R01: trackPageErrors(r01Page),
    R02: trackPageErrors(r02Page),
    R03: trackPageErrors(r03Page),
  };

  fixtureTaskId = `XROLE-journey-${testInfo.workerIndex}-${Date.now()}`;

  /* patchDataFile registers a per-Page route interceptor
   * (_workspace-helpers.ts:66-75); each page needs its own registration
   * even though all four share one BrowserContext, and each visits a
   * different entry HTML file with a different script include order
   * (task-detail.html loads task-detail.data.js; annotation-workspace.html
   * / annotation-list.html load annotation-workspace.data.js) so the
   * patch must target whichever file each page actually fetches. */
  await patchDataFile(plPage, 'task-detail.data.js', buildXRoleSeedPatch(fixtureTaskId));

  /* XROLE-03 part B needs the annotator workspace to see a `guidelineFiles`
   * field on the seeded profile. `saveGuidelineEdit()` on the PL side
   * (task-detail.html:6055-6083) is purely in-memory and never writes back
   * into the seeded profile object annotation-workspace.data.js reads from
   * (annotation-workspace.data.js:52's `guidelineFiles: detail.guidelineFiles
   * || []`), so this suite seeds it directly instead of relying on PL's
   * edit to propagate -- it never would. */
  const seedPatchWithGuideline = `${buildXRoleSeedPatch(fixtureTaskId)}
    if (window.LabelSuiteTaskDetailData && window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(fixtureTaskId)}]) {
      window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(fixtureTaskId)}].guidelineFiles = [{ name: 'xrole-seeded-guide.md', type: 'md' }];
    }
  `;
  await patchDataFile(a01Page, 'annotation-workspace.data.js', seedPatchWithGuideline);
  await patchDataFile(a02Page, 'annotation-workspace.data.js', buildXRoleSeedPatch(fixtureTaskId));
  await patchDataFile(a03Page, 'annotation-workspace.data.js', buildXRoleSeedPatch(fixtureTaskId));
  await patchDataFile(r01Page, 'annotation-workspace.data.js', buildXRoleSeedPatch(fixtureTaskId));
  await patchDataFile(r02Page, 'annotation-workspace.data.js', buildXRoleSeedPatch(fixtureTaskId));
  await patchDataFile(r03Page, 'annotation-workspace.data.js', buildXRoleSeedPatch(fixtureTaskId));

  await skipGuidelineModal(a01Page);
  await skipGuidelineModal(a02Page);
  await skipGuidelineModal(a03Page);
  await skipGuidelineModal(r01Page);
  await skipGuidelineModal(r02Page);
  await skipGuidelineModal(r03Page);
});

test.afterAll(async () => {
  await context.close();
});

test('XROLE-01: project leader creates a task through the task-new wizard', async () => {
  await plPage.goto('/pages/task-management/task-new.html', { waitUntil: 'load' });
  await plPage.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 }
  );

  await plPage.fill('#taskNameInput', 'XROLE Canonical Journey');
  await plPage.locator('#taskCategoryChips [data-key="classification"]').click();
  // Input type must be selected before output type so the taxonomy can apply
  // any granularity constraints before rendering the output choices
  // (task-new-output-type-preview.spec.ts:83-90).
  await plPage.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await plPage.locator('#taskOutputTypeChips [data-key="single_label"]').click();
  await plPage.locator('#datasetFileInput').setInputFiles(SEED_FIXTURE_FILE);
  await expect(plPage.locator('.inline-dataset-preview-wrap')).toBeVisible();

  // XROLE-02 leg 1: the preview count is only reliable via the hint text --
  // renderInlineDatasetPreview() (task-config.engine.js:5276-5288) caps the
  // actual rendered `.inline-dataset-preview-wrap` rows to a preview subset,
  // it does not render one row per dataset record.
  await expect(plPage.locator('#inlinePreviewHint')).toContainText('5');

  await plPage.locator('.inline-preview-role-select[aria-label$="text"]').selectOption('input');
  await plPage.locator('.inline-preview-role-select[aria-label$="gold_label"]').selectOption('output');
  await expect(plPage.locator('#errInlineFieldCount')).not.toHaveClass(/show/);
  await expect(plPage.locator('#nextBtn')).toBeEnabled();
  await plPage.locator('#nextBtn').click();

  // XROLE-02 leg 2: single_label auto-derives label options from the
  // gold_label column's unique values once it is mapped to the `output`
  // role -- confirmed against task-new-output-type-preview.spec.ts:266-284
  // ("single_label -- gold_label pre-selected, labels from unique values").
  // No manual label entry is needed for the wizard to reach a valid config.
  await expect(plPage.locator('#step2Panel')).not.toHaveClass(/hidden/);
  const labels = await plPage.evaluate(() => {
    const win = window as unknown as { state?: { outputConfigs?: { single_label?: { label_options?: { name: string }[] } } } };
    return win.state?.outputConfigs?.single_label?.label_options?.map((option) => option.name) ?? [];
  });
  expect(labels).toEqual(expect.arrayContaining(['positive', 'negative', 'neutral']));

  await plPage.locator('#nextBtn').click();
  await expect(plPage.locator('#step3Panel')).not.toHaveClass(/hidden/);
  await plPage.fill('#samplingValueInput', SAMPLING_VALUE);
  await plPage.locator('#nextBtn').click();

  // Guideline step is explicitly optional in the wizard (s4NoticeText:
  // "此步驟為選填。不上傳說明，仍可完成任務建立。"); XROLE-03 covers
  // guideline upload against the fixture-seeded task instead, since the
  // persisted wizard profile carries no member/review/dry-run fixture state
  // (see file-level doc comment).
  await expect(plPage.locator('#step4Panel')).not.toHaveClass(/hidden/);
  await plPage.locator('#nextBtn').click();

  await expect(plPage).toHaveURL(/task-detail\.html\?task_id=task_xrole-canonical-journey_\d+/, {
    timeout: PANEL_LOAD_TIMEOUT,
  });
  wizardTaskId = new URL(plPage.url()).searchParams.get('task_id');
  expect(wizardTaskId).toBeTruthy();

  // XROLE-02 leg 3 (issue #285 fix): the wizard-created task now resolves
  // in task-detail.html instead of falling into TASK_NOT_FOUND --
  // resetTaskData() (task-detail.html:4303-4352) finds both a list entry
  // and a profile for wizardTaskId via the localStorage-merged seed.
  await expect(plPage.locator('#taskNotFound')).toHaveClass(/hidden/, { timeout: PANEL_LOAD_TIMEOUT });
  await plPage.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
});

test('XROLE-02b: fixture-seeded task dataset total reconciles with the 5 seeded records (w4 §2 step 2 three-way chain: upload=preview=list)', async () => {
  await plPage.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${fixtureTaskId}`);
  await plPage.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  // TASK_DATA.datasetTotal is auto-computed from datasetRecords.length
  // (resetTaskData(), task-detail.html:4303-4352) -- it is never read from
  // the seeded profile, so this is a genuine reconciliation between the
  // fixture's 5 records and what the PL page independently derives.
  await expect(plPage.locator('#valueDatasetSummary')).toHaveText('5 筆');

  // Third leg of the w4 three-way reconciliation (upload count = preview
  // count = list count, W3 coverage gap #1): XROLE-01 already covers the
  // first two legs against the wizard-created task (upload file content is
  // the 5-record SEED_FIXTURE_FILE; #inlinePreviewHint asserts '5' at
  // XROLE-02 leg 1 above). This leg checks annotation-list against the
  // fixture-seeded task instead of the wizard task, per this file's
  // documented two-task-id limitation (see file-level doc comment) --
  // navigating WITHOUT a run_type param is deliberate: buildXRoleSeedPatch
  // only run-scopes datasetRecords when run_type is dry_run/official_run
  // (fixtures/build-xrole-patch.ts:96-98), so an unscoped visit is the only
  // URL shape that resolves all 5 seeded records rather than the 2-record
  // dry_run subset.
  await a01Page.goto(`/pages/annotation/annotation-list.html?task_id=${fixtureTaskId}&role=annotator&annotator_id=A01`);
  await expect(a01Page.getByTestId('ws-sample-item')).toHaveCount(5);
});

test('XROLE-03: guideline uploaded by the project leader is readable in the annotator workspace', async () => {
  // Part A: same-page proof that the guideline edit UI mechanic works.
  // saveGuidelineEdit() (task-detail.html:6055-6083) is purely in-memory,
  // so this proves the UI only -- not cross-page persistence (see Part B).
  await plPage.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${fixtureTaskId}`);
  await plPage.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

  await plPage.evaluate(() => (document.getElementById('guidelineEditBtn') as HTMLButtonElement | null)?.click());
  await expect(plPage.locator('#guidelineEditForm')).not.toHaveClass(/hidden/);

  await plPage.locator('#editAnnotatorGuidelineFileInput').setInputFiles({
    name: 'xrole-annotator-guide.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('xrole guideline'),
  });
  await plPage.evaluate(() => {
    const win = window as typeof window & {
      handleGuidelineFileInputChange?: (role: string, input: HTMLInputElement) => void;
    };
    const input = document.getElementById('editAnnotatorGuidelineFileInput') as HTMLInputElement | null;
    if (input && win.handleGuidelineFileInputChange) win.handleGuidelineFileInputChange('annotator', input);
  });
  await plPage.locator('#guidelineSaveBtn').click();
  await expect(plPage.locator('#valueAnnotatorGuidelineFilesSummary')).toContainText('xrole-annotator-guide.pdf');

  // Part B: workspace-side accessibility, proven via a separately-seeded
  // `guidelineFiles` field (beforeAll's seedPatchWithGuideline for a01Page)
  // since Part A's edit never reaches the profile a01Page resolves from.
  await a01Page.goto(
    buildWorkspaceUrl({
      task_id: fixtureTaskId,
      sample_id: DRY_RUN_RECORD_IDS[0],
      role: 'annotator',
      run_type: 'dry_run',
      annotator_id: 'A01',
    })
  );
  await expect(a01Page.getByTestId('ws-root')).toBeVisible();
  await expect(a01Page.locator('#wsGuidelineFileList')).toContainText('xrole-seeded-guide.md');
});

test.describe('XROLE-04: min_annotators is not enforced against actual active membership (documents a known gap)', () => {
  test('publishing dry run with minAnnotators exceeding the active annotator headcount does not block status advance', async ({
    page,
  }) => {
    /* D3 gap: canPublish() -> validateSampling() -> validateSamplingData()
     * (task-detail.html:8809-8818, referenced from validateSampling())
     * checks only `1 <= samplingValue < datasetTotal` and
     * `minAnnotators >= 2` -- it never cross-checks TASK_MEMBERS' actual
     * active-annotator count. TASK_MEMBERS (task-detail.html:3388-3395)
     * ships exactly 2 active annotators by default; setting minAnnotators=3
     * should block publish but does not. This is a real, unimplemented
     * spec gap (not a test bug), reported per this task's scope and not
     * filed as a GitHub issue here. Runs isolated from the shared
     * BrowserContext / journey sequence: it needs its own single-use task
     * and must not affect fixtureTaskId's state for later XROLE-0N tests. */
    test.fail();

    const gapTaskId = `XROLE-gap-d3-${Date.now()}`;
    await patchDataFile(page, 'task-detail.data.js', buildXRoleSeedPatch(gapTaskId));
    await page.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${gapTaskId}`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#samplingEditBtn').click();
    await page.fill('#samplingValue', SAMPLING_VALUE);
    await page.fill('#minAnnotatorsInput', '3');
    await page.locator('#samplingSaveBtn').click();

    await expect(page.locator('#statusBadge')).toHaveText('草稿');
    await page.locator('#publishDryRunBtn').click();
    // Desired behavior: publish should be blocked (only 2 active annotators
    // exist for a minAnnotators=3 requirement). Actual behavior: no such
    // check exists, so the status advances anyway and this assertion fails.
    await expect(page.locator('#statusBadge')).toHaveText('草稿');
  });
});

test('XROLE-05: project leader adds a new member via email invite', async () => {
  await plPage.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${fixtureTaskId}`);
  await plPage.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await plPage.locator('#tabMemberManagement').click();
  await expect(plPage.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);

  await plPage.locator('#memberInviteEmailInput').fill('xrole.invitee@example.com');
  await plPage.locator('#memberInviteRoleSelect').selectOption('reviewer');
  await plPage.locator('#memberInviteSendBtn').click();

  await expect(plPage.locator('#memberTableBody')).toContainText('xrole.invitee@example.com');
  await expect(plPage.locator('#memberTableBody')).toContainText('邀請中');
});

test('XROLE-06: project leader disables an existing member (w4 §2 step 5 -- covers the W3 §1.4 gap: this is a status-flip test, not a removal test)', async () => {
  const memberRow = plPage.locator('#memberTableBody tr').filter({ hasText: 'Alex Wang' });
  // toggleBtn's label mirrors member.status: 'active' -> t('actionDisable')
  // ('停用', task-detail.html:6464-6468). openMemberActionModal({type:'disable',...})
  // (task-detail.html:6469-6479) queues the action; executeMemberAction()'s
  // 'disable' branch (task-detail.html:6702-6704) only flips
  // target.status = 'disabled' -- unlike 'remove' it never splices
  // TASK_MEMBERS, so the row must remain in the table.
  await memberRow.locator('button:has-text("停用")').click();
  await plPage.locator('#memberActionConfirmBtn').click();

  await expect(plPage.locator('#memberTableBody')).toContainText('Alex Wang');
  // Status badge text is t('memberStatusDisabled') ('停用',
  // task-detail.html:2592/6438) -- '.badge' is unambiguous within this row:
  // the role-badge span uses 'role-badge role-badge-annotator', not
  // '.badge' (getTaskRoleBadgeClass(), task-detail.html:6333-6335).
  await expect(memberRow.locator('.badge')).toHaveText('停用');
  // Known requirement gap (w4 §2 step 5, §7 item 2): disabling an annotator
  // has no defined effect on samples already assigned to them (unlike
  // reviewers, task-detail-review-assignment.spec.ts:134) -- this test
  // intentionally asserts UI/status only, not assignment behavior.
});

test('XROLE-07: project leader publishes the dry run round (checkpoint A: annotation-list count reconciles with sampling settings)', async () => {
  await plPage.locator('#tabOverview').click();
  await plPage.locator('#samplingEditBtn').click();
  await plPage.fill('#samplingValue', SAMPLING_VALUE);
  await plPage.fill('#minAnnotatorsInput', ACTIVE_ANNOTATOR_COUNT);
  await plPage.locator('#samplingSaveBtn').click();

  await expect(plPage.locator('#statusBadge')).toHaveText('草稿');
  await plPage.locator('#publishDryRunBtn').click();
  // Round 1 is deterministically 'failed' (getTrialRoundScenario(),
  // task-detail.html:4832-4869 scenarios array) -- status therefore moves
  // to dry_run_in_progress, not straight to waiting_iaa_confirmation.
  await expect(plPage.locator('#statusBadge')).toHaveText('試標進行中');

  // Checkpoint A: a01Page's annotation-list (dry_run) independently resolves
  // its row count from the seeded/patched profile -- it is NOT gated by
  // whether PL clicked publish. The two counts (PL's configured
  // samplingValue and a01Page's dry_run row count) match here because the
  // fixture was designed so they would, not because publishing enforces an
  // access-control gate across pages (see file-level doc comment).
  await a01Page.goto(buildListUrl({ task_id: fixtureTaskId, role: 'annotator', run_type: 'dry_run', annotator_id: 'A01' }));
  await expect(a01Page.getByTestId('ws-sample-item')).toHaveCount(DRY_RUN_RECORD_IDS.length);
});

test('XROLE-08: three annotators submit both dry-run samples (checkpoint B: status syncs to waiting IAA confirmation)', async () => {
  const annotators: { page: Page; id: string }[] = [
    { page: a01Page, id: 'A01' },
    { page: a02Page, id: 'A02' },
    { page: a03Page, id: 'A03' },
  ];

  for (const { page: annotatorPage, id } of annotators) {
    for (let i = 0; i < DRY_RUN_RECORD_IDS.length; i += 1) {
      await annotatorPage.goto(
        buildWorkspaceUrl({ task_id: fixtureTaskId, sample_id: DRY_RUN_RECORD_IDS[i], role: 'annotator', run_type: 'dry_run', annotator_id: id })
      );
      await annotatorPage.getByTestId('ws-submit-btn').click();
      // ws-sample-item is the sidebar's full sample list for this task/run,
      // in seed order -- nth(i) mirrors the confirmed reference pattern
      // (task-detail-dry-run-status-sync.spec.ts) rather than `.first()`,
      // which would always resolve to sample 0 regardless of which sample
      // was just submitted.
      if (i < DRY_RUN_RECORD_IDS.length - 1) {
        await expect(annotatorPage.getByTestId('ws-sample-item').nth(i)).toHaveAttribute('data-submitted', 'true');
      } else {
        /* issue #514: this annotator's last pending dry-run sample, so the
           submit now returns to annotation-list (FR-022C) instead of staying
           on the workspace. buildListReturnUrl() carries task_id / role /
           run_type plus the UXC-11 view state but NOT annotator_id, so that
           landing page renders the default identity -- a pre-existing
           property of the single writer the FR-081 breadcrumb also goes
           through, untouched here. The submission is therefore re-read on
           this annotator's own list URL, the way the rest of this fixture
           addresses identity, so the 已提交 badge still proves the same
           thing the sidebar attribute did. */
        await expect(annotatorPage).toHaveURL(/annotation-list\.html\?/);
        await annotatorPage.goto(
          buildListUrl({ task_id: fixtureTaskId, role: 'annotator', run_type: 'dry_run', annotator_id: id })
        );
        await expect(annotatorPage.getByTestId('ws-sample-item').nth(i).locator('.status-badge')).toHaveText('已提交');
      }
    }
  }

  /* Checkpoint B uses the established `&status=` URL-override pattern
   * (task-detail-dry-run-status-sync.spec.ts) rather than waiting for a
   * true 3-annotator aggregate: syncStatusFromDryRunProgress()
   * (task-detail.html:4418-4439) reads a single global
   * DRY_RUN_PROGRESS_KEY that getSubmittedSampleCount()
   * (annotation-workspace.data.js:314-330) computes per-identity, scoped
   * to whichever annotator wrote it LAST (A03 here, since the loop above
   * submits in A01 -> A02 -> A03 order). It genuinely is not a
   * cross-annotator aggregate gate, even though all 6 real submissions
   * above did happen. */
  await plPage.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${fixtureTaskId}&status=dry_run_in_progress`);
  await expect(plPage.locator('#statusBadge')).toHaveText('待 IAA 確認', { timeout: PANEL_LOAD_TIMEOUT });
});

test('XROLE-09: IAA gate banner is readable and the project leader can proceed or return', async () => {
  // getTrialRounds() (task-detail.html:4792-4811) synthesizes a 'passed'
  // round from status alone when trialRounds is empty and
  // status === 'waiting_iaa_confirmation' -- no numeric IAA validation is
  // asserted here, per this suite's minimal-gate scope.
  await expect(plPage.locator('.exec-stage-banner #trialDecisionTitle')).toBeVisible();
  await expect(plPage.locator('.exec-stage-banner #trialDecisionTitle')).not.toBeEmpty();
  await expect(plPage.locator('.exec-stage-banner #trialDecisionDesc')).not.toBeEmpty();

  // Proceed affordance (not clicked -- moving into official_run is PR-B2
  // scope) and return affordance both exist from this gate state.
  await expect(plPage.locator('#publishOfficialRunBtn')).toBeVisible();
  await expect(plPage.locator('#bcRoot')).toBeVisible();
});

/* ══════════════════════ PR-B2: XROLE-10 through XROLE-25 ══════════════════
 * Data-layer evaluate helpers. Every call passes fixtureTaskId from the
 * module scope and requires the target Page to have annotation-workspace.
 * data.js loaded (i.e. the page has visited annotation-list/-workspace at
 * least once); localStorage is context-shared, so ANY workspace page can
 * read ANY identity's buckets -- the identity is a bucket-key argument,
 * not an auth boundary (there is no auth in the prototype). */

type XRoleTrailEvent = { action: string; role: string; actorId: string | null; at: string; summary: string };
type XRoleDisputeItem = { outKey: string; key: string; annotatorValue: unknown; reviewerValues: Record<string, unknown> };
type XRoleArbitrationState = Record<
  string,
  { votes: Array<{ arbiter_id: string; choice: 'A' | 'B'; voted_at: string }>; finalized_value?: unknown; finalized_by?: string }
>;

function readSampleStatus(page: Page, runType: string, sampleId: string, annotatorId: string): Promise<string> {
  return page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a) => (window as any).LabelSuiteAnnotationWorkspaceData.getSampleStatus(
      a.taskId, 'annotator', a.runType, a.sampleId, { annotatorId: a.annotatorId }),
    { taskId: fixtureTaskId, runType, sampleId, annotatorId }
  );
}

/* getSampleHistory merges the annotator's own bucket with every reviewer
 * bucket on that annotator's work (annotation-workspace.data.js:298-312);
 * filtering role === 'reviewer' mirrors annotation-workspace-review-identity
 * .spec.ts and isolates what a peer can see of review activity. */
function readReviewerTrail(page: Page, runType: string, sampleId: string, annotatorId: string): Promise<XRoleTrailEvent[]> {
  return page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a) => (window as any).LabelSuiteAnnotationWorkspaceData.getSampleHistory(
      a.taskId, a.runType, a.sampleId, { annotatorId: a.annotatorId })
      .filter((event: { role: string }) => event.role === 'reviewer'),
    { taskId: fixtureTaskId, runType, sampleId, annotatorId }
  );
}

function readUnitStatus(page: Page, sampleId: string, annotatorId: string): Promise<string | null> {
  return page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a) => (window as any).LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(
      a.taskId, 'official_run', a.sampleId, { annotatorId: a.annotatorId }, ['single_label'],
      { minReviewers: a.minReviewers }),
    { taskId: fixtureTaskId, sampleId, annotatorId, minReviewers: FIXTURE_MIN_REVIEWERS }
  );
}

function readDisputeItems(page: Page, sampleId: string, annotatorId: string): Promise<XRoleDisputeItem[]> {
  return page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a) => (window as any).LabelSuiteAnnotationWorkspaceData.getDisputeItems(
      a.taskId, 'official_run', a.sampleId, { annotatorId: a.annotatorId }, ['single_label']),
    { taskId: fixtureTaskId, sampleId, annotatorId }
  );
}

function readArbitrationState(page: Page, sampleId: string, annotatorId: string): Promise<XRoleArbitrationState> {
  return page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a) => (window as any).LabelSuiteAnnotationWorkspaceData.getArbitrationState(
      a.taskId, 'official_run', a.sampleId, { annotatorId: a.annotatorId }),
    { taskId: fixtureTaskId, sampleId, annotatorId }
  );
}

function annotatorOfficialUrl(sampleId: string, annotatorId: string): string {
  return buildWorkspaceUrl({
    task_id: fixtureTaskId, sample_id: sampleId, role: 'annotator',
    run_type: 'official_run', annotator_id: annotatorId,
  });
}

function gotoReview(page: Page, sampleId: string, annotatorId: string, reviewerId: string, runType: 'dry_run' | 'official_run' = 'official_run') {
  return page.goto(buildWorkspaceUrl({
    task_id: fixtureTaskId, sample_id: sampleId, role: 'reviewer',
    run_type: runType, annotator_id: annotatorId, reviewer_id: reviewerId,
  }));
}

/* One review card row per (outKey, reviewed annotator) -- official_run
 * narrows to exactly one row (annotation-workspace.config.js:2646-2648),
 * so the single approve/reject button is unambiguous. */
async function submitApproval(page: Page, sampleId: string, annotatorId: string, reviewerId: string) {
  await gotoReview(page, sampleId, annotatorId, reviewerId);
  await page.getByTestId('ws-review-row-approve').click();
  await page.getByTestId('ws-review-submit-btn').click();
  await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
}

/* Real-UI correction: pick a different label in the correction panel (it is
 * seeded with the reviewed annotator's own answer), mark the row rejected
 * (✕ is the prototype's "修正" decision), submit. handleReviewSubmit()
 * stores collectAnswerPayload() -- the corrected value -- as the reviewer's
 * submission, then (official_run only) markSampleRejected() rolls the
 * ANNOTATOR's sample back to pending (FR-014I,
 * annotation-workspace.config.js:2690-2705). The review unit derives to
 * null until the annotator resubmits -- see resubmitAfterRollback(). */
async function submitCorrection(page: Page, sampleId: string, annotatorId: string, reviewerId: string, correctedLabel: string) {
  await gotoReview(page, sampleId, annotatorId, reviewerId);
  await page.getByTestId('ws-review-correct-single_label').getByTestId(`ws-single-label-chip-${correctedLabel}`).click();
  await page.getByTestId('ws-review-row-reject').click();
  // issue #552 (FR-016A): a reject needs a reason before submit goes through.
  await page.getByTestId('ws-review-reject-reason').fill('理由');
  await page.getByTestId('ws-review-submit-btn').click();
  await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
}

/* FR-014I second half: the rolled-back annotator reopens the sample (the
 * kept answers / gold prefill both restore the original label -- for this
 * fixture they are the same value) and resubmits it unchanged, restoring
 * the submission the review unit derives from. */
async function resubmitAfterRollback(page: Page, sampleId: string, annotatorId: string) {
  await page.goto(annotatorOfficialUrl(sampleId, annotatorId));
  await expect(page.getByTestId(`ws-single-label-chip-${OFFICIAL_GOLD[sampleId]}`)).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('ws-submit-btn').click();
  await expect.poll(() => readSampleStatus(page, 'official_run', sampleId, annotatorId)).toBe('submitted');
}

test('XROLE-10: project leader publishes the official run and the assigned annotators submit (checkpoint C)', async () => {
  // Serial continuation from XROLE-09's IAA-gate state: plPage still sits on
  // the task-detail load whose status synced to waiting_iaa_confirmation.
  await plPage.locator('#publishOfficialRunBtn').click();
  await expect(plPage.locator('#statusStepper .step-current .step-label-wrap')).toHaveText('正式標記中');

  /* Checkpoint C, task-detail side: the official count the banner shows is
   * datasetTotal(5) - sampling-derived trial usage, and this page load's
   * samplingValue was re-derived to 1 by applySamplingDefaultsToTaskData()
   * (task-detail.html:4766-4775: round(5 × 12%) clamped to 1 -- XROLE-07's
   * UI-set value of 2 lived in the previous page load's memory only). The
   * banner therefore reads 4, NOT the fixture's 3 run-scoped official
   * records: the two numbers come from unrelated sources (sampling math vs
   * the run_type-scoped seed) and the prototype has no bridge between them.
   * Asserting 4 pins that decoupling honestly instead of papering over it. */
  await expect(plPage.locator('.exec-stage-banner #trialDecisionTitle')).toHaveText('正式標記進行中，共 4 筆');

  /* Checkpoint C, annotator side: w4 assumed "3 筆剩餘資料已分配" as 1
   * record per annotator, but no per-annotator assignment concept exists in
   * the prototype -- every annotator's official_run list resolves all 3
   * run-scoped records (build-xrole-patch.ts run_type scoping). The fixture's
   * OFFICIAL_RUN_ASSIGNMENTS is purely a convention for who SUBMITS what. */
  await a01Page.goto(buildListUrl({ task_id: fixtureTaskId, role: 'annotator', run_type: 'official_run', annotator_id: 'A01' }));
  await expect(a01Page.getByTestId('ws-sample-item')).toHaveCount(OFFICIAL_RUN_RECORD_IDS.length);

  // A01 and A03 submit their assigned records (gold prefill supplies the
  // answer, as in XROLE-08). A02's submission is deferred to XROLE-11 so the
  // cross-annotator isolation check has a genuine before/after boundary.
  for (const [sampleId, page, nth] of [
    ['xr-off-001', a01Page, 0],
    ['xr-off-003', a03Page, 2],
  ] as const) {
    await page.goto(annotatorOfficialUrl(sampleId, OFFICIAL_RUN_ASSIGNMENTS[sampleId]));
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').nth(nth)).toHaveAttribute('data-submitted', 'true');
  }
});

test('XROLE-11: cross-annotator isolation -- peers read a bare status enum, never answer content', async () => {
  const divergenceAnnotator = OFFICIAL_RUN_ASSIGNMENTS[FORCED_DIVERGENCE_RECORD_ID]; // A02

  // Before A02 submits: A01's page reads A02's official sample as pending.
  expect(await readSampleStatus(a01Page, 'official_run', FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator)).toBe('pending');

  await a02Page.goto(annotatorOfficialUrl(FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator));
  await a02Page.getByTestId('ws-submit-btn').click();
  await expect(a02Page.getByTestId('ws-sample-item').nth(1)).toHaveAttribute('data-submitted', 'true');

  /* After: the same cross-identity read flips to 'submitted'. The explicit
   * safety assertion w4 asks for: getSampleStatus() returns entryStatus()
   * -- a bare status string (annotation-workspace.data.js:196-198) -- so a
   * peer polling another annotator's progress can never obtain the answer
   * payload through this API. (The prototype has no auth: getSampleAnswers
   * on a foreign identity WOULD return answers. The assertion documents the
   * status API's shape, not an access-control gate.) */
  const status = await readSampleStatus(a01Page, 'official_run', FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator);
  expect(status).toBe('submitted');
  expect(typeof status).toBe('string');
});

test('XROLE-12: blind review -- reviewer events are invisible to peers until the first reviewer submits', async () => {
  const divergenceAnnotator = OFFICIAL_RUN_ASSIGNMENTS[FORCED_DIVERGENCE_RECORD_ID];

  // r02Page's first navigation (list) also loads the data API for evaluates.
  await r02Page.goto(buildListUrl({ task_id: fixtureTaskId, role: 'reviewer', run_type: 'official_run', reviewer_id: REVIEWER_R02 }));
  expect(await readReviewerTrail(r02Page, 'official_run', FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator)).toEqual([]);

  // R01 approves A02's answer on the forced-divergence record (this is also
  // the first half of XROLE-14's divergence construction).
  await submitApproval(r01Page, FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator, REVIEWER_R01);

  const trail = await readReviewerTrail(r02Page, 'official_run', FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator);
  /* issue #578 (FR-086): an approval writes the wrapper `submitted` plus one
     `accepted` per output key. What this test pins is visibility -- before
     R01 submitted, the trail was empty; after, both events are R01's. */
  expect(trail.map((e) => e.action)).toEqual(['submitted', 'accepted']);
  expect(trail.every((e) => e.actorId === REVIEWER_R01)).toBe(true);
});

test('XROLE-13: dry_run reject never rolls the annotator sample back to pending (issue #192 regression, cross-role)', async () => {
  // A01 submitted both dry samples in XROLE-08. R01 rejects one in dry_run:
  // the FR-014I rollback is official_run-only (markSampleRejected() returns
  // early for other run types, annotation-workspace.data.js:363-364), so the
  // sample must stay submitted.
  expect(await readSampleStatus(r01Page, 'dry_run', DRY_RUN_RECORD_IDS[0], 'A01')).toBe('submitted');

  await gotoReview(r01Page, DRY_RUN_RECORD_IDS[0], 'A01', REVIEWER_R01, 'dry_run');
  await r01Page.getByTestId('ws-review-row-reject').click();
  // issue #552 (FR-016A): a reject needs a reason before submit goes through.
  await r01Page.getByTestId('ws-review-reject-reason').fill('理由');
  await r01Page.getByTestId('ws-review-submit-btn').click();
  await expect(r01Page.locator('#toastMsg')).toHaveText('審核已送出');

  expect(await readSampleStatus(r01Page, 'dry_run', DRY_RUN_RECORD_IDS[0], 'A01')).toBe('submitted');
});

test('XROLE-14: a reviewer correction produces a disputed unit with one dispute item (via the FR-014I rollback loop)', async () => {
  const divergenceAnnotator = OFFICIAL_RUN_ASSIGNMENTS[FORCED_DIVERGENCE_RECORD_ID];

  // R02 corrects A02's 'positive' to 'negative' through the real UI.
  await submitCorrection(r02Page, FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator, REVIEWER_R02, DIVERGENCE_CORRECTION);

  // FR-014I: the official_run reject decision rolled A02's sample back.
  expect(await readSampleStatus(r02Page, 'official_run', FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator)).toBe('pending');

  // A02 resubmits the same answer; only now does the unit derive again.
  await resubmitAfterRollback(a02Page, FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator);

  /* Derivation (annotation-workspace.data.js:1483-1519): R02's stored value
   * differs -> changed; 2 reviewer submissions >= min(2) -> enough; the one
   * dispute item is a 1-1 tie under N=2 (R01's approval is an implicit vote
   * for the annotator's value) -> resolveDisputeConvergence finds no strict
   * majority -> DISPUTED. */
  expect(await readUnitStatus(r02Page, FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator)).toBe('disputed');

  // Exactly one dispute item; R01 (agreeing) contributes no B value.
  const items = await readDisputeItems(r02Page, FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator);
  expect(items).toHaveLength(1);
  expect(items[0].annotatorValue).toBe(OFFICIAL_GOLD[FORCED_DIVERGENCE_RECORD_ID]);
  expect(items[0].reviewerValues).toEqual({ [REVIEWER_R02]: DIVERGENCE_CORRECTION });
});

test('XROLE-15: unanimous approvals finalize the unit', async () => {
  /* w4's "n=2=min" model, now backed by the fixture's minReviewers = 2:
   * R01's approval alone is an interim APPROVED (1 < min 2, still
   * interactive per issue #308's lock boundary); R02's second agreeing
   * review reaches the quorum and finalizes the unit. */
  await submitApproval(r01Page, 'xr-off-001', 'A01', REVIEWER_R01);
  expect(await readUnitStatus(r01Page, 'xr-off-001', 'A01')).toBe('approved');

  await submitApproval(r02Page, 'xr-off-001', 'A01', REVIEWER_R02);
  expect(await readUnitStatus(r02Page, 'xr-off-001', 'A01')).toBe('finalized');
});

test('XROLE-16: both reviewers correcting to the same value converges to finalized without arbitration', async () => {
  // R01 corrects A03's 'negative' to 'positive' -> rollback -> A03 resubmits.
  await submitCorrection(r01Page, 'xr-off-003', 'A03', REVIEWER_R01, CONVERGENCE_CORRECTION);
  await resubmitAfterRollback(a03Page, 'xr-off-003', 'A03');

  // R02 makes the same correction -> second rollback -> A03 resubmits again.
  await submitCorrection(r02Page, 'xr-off-003', 'A03', REVIEWER_R02, CONVERGENCE_CORRECTION);
  await resubmitAfterRollback(a03Page, 'xr-off-003', 'A03');

  /* Both reviewers voted 'positive' against the annotator's 'negative':
   * 2/2 is a strict majority under N=2, so resolveDisputeConvergence
   * converges the only dispute item and the unit finalizes WITHOUT entering
   * the arbitration pool (annotation-workspace.data.js:1502-1512). */
  expect(await readUnitStatus(r02Page, 'xr-off-003', 'A03')).toBe('finalized');
  // Convergence, not arbitration: no vote was ever stored for this unit.
  expect(await readArbitrationState(r02Page, 'xr-off-003', 'A03')).toEqual({});
});

test('XROLE-17: the arbitrate entry is offered only to the eligible non-participant arbiter on the disputed row', async () => {
  const divergenceAnnotator = OFFICIAL_RUN_ASSIGNMENTS[FORCED_DIVERGENCE_RECORD_ID];

  // R03 (can_arbitrate, no submission on the unit) sees 仲裁 on the disputed
  // row only; the two finalized rows keep the plain edit entry.
  await r03Page.goto(buildListUrl({ task_id: fixtureTaskId, role: 'reviewer', run_type: 'official_run', reviewer_id: ARBITER_R03 }));
  const disputedRow = r03Page.getByTestId('ws-sample-item').filter({ hasText: FORCED_DIVERGENCE_RECORD_ID });
  await expect(disputedRow.locator('.status-badge')).toHaveText('爭議中 · 未定稿');
  await expect(disputedRow.getByTestId('list-review-annotator')).toHaveText(divergenceAnnotator);
  await expect(disputedRow.getByTestId('list-arbitrate-entry')).toHaveText('仲裁');
  for (const finalizedId of ['xr-off-001', 'xr-off-003']) {
    const row = r03Page.getByTestId('ws-sample-item').filter({ hasText: finalizedId });
    await expect(row.locator('.status-badge')).toHaveText('已定稿 · 已鎖定');
    await expect(row.getByTestId('list-arbitrate-entry')).toHaveCount(0);
  }

  // R01 is a dispute participant (and holds no can_arbitrate flag): the same
  // disputed row keeps the ordinary 編輯 entry (FR-060).
  await r01Page.goto(buildListUrl({ task_id: fixtureTaskId, role: 'reviewer', run_type: 'official_run', reviewer_id: REVIEWER_R01 }));
  const participantRow = r01Page.getByTestId('ws-sample-item').filter({ hasText: FORCED_DIVERGENCE_RECORD_ID });
  await expect(participantRow.getByTestId('list-arbitrate-entry')).toHaveCount(0);
  await expect(participantRow.locator('.mini-btn-primary')).toHaveText('編輯');
});

test('XROLE-18: the arbiter votes B and the unit finalizes with the arbitrated value', async () => {
  const divergenceAnnotator = OFFICIAL_RUN_ASSIGNMENTS[FORCED_DIVERGENCE_RECORD_ID];

  // Entering through the list entry carries the full identity into the
  // workspace URL (annotation-list-dispute-entry.spec.ts pattern).
  await r03Page.getByTestId('ws-sample-item')
    .filter({ hasText: FORCED_DIVERGENCE_RECORD_ID })
    .getByTestId('list-arbitrate-entry')
    .click();
  await expect(r03Page).toHaveURL(new RegExp(`annotation-workspace\\.html.*sample_id=${FORCED_DIVERGENCE_RECORD_ID}`));
  await expect(r03Page).toHaveURL(new RegExp(`annotator_id=${divergenceAnnotator}`));
  await expect(r03Page).toHaveURL(new RegExp(`reviewer_id=${ARBITER_R03}`));

  // The review card renders in arbitration layout: one A/B item carrying the
  // annotator's value (A) and R02's correction (B).
  await expect(r03Page.getByTestId('ws-arbitration-card')).toBeVisible();
  const items = r03Page.getByTestId('ws-arbitration-item');
  await expect(items).toHaveCount(1);
  await expect(items.first().getByTestId('ws-arbitration-choose-a')).toContainText(OFFICIAL_GOLD[FORCED_DIVERGENCE_RECORD_ID]);
  await expect(items.first().getByTestId('ws-arbitration-choose-b')).toContainText(DIVERGENCE_CORRECTION);

  await r03Page.getByTestId('ws-arbitration-choose-b').click();
  await r03Page.getByTestId('ws-arbitration-submit').click();

  const state = await readArbitrationState(r03Page, FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator);
  const item = state['single_label::single_label'];
  expect(item).toBeTruthy();
  expect(item.votes).toHaveLength(1);
  expect(item.votes[0].arbiter_id).toBe(ARBITER_R03);
  expect(item.votes[0].choice).toBe('B');
  expect(item.finalized_value).toBe(DIVERGENCE_CORRECTION);
  expect(item.finalized_by).toBe(ARBITER_R03);

  expect(await readUnitStatus(r03Page, FORCED_DIVERGENCE_RECORD_ID, divergenceAnnotator)).toBe('finalized');
});

test('XROLE-19: checkpoint E -- the arbitrated unit reads as finalized across pages', async () => {
  // Real cross-page sync: a participant reviewer's list re-derives the same
  // unit as 已定稿 purely from the shared localStorage buckets.
  await r01Page.goto(buildListUrl({ task_id: fixtureTaskId, role: 'reviewer', run_type: 'official_run', reviewer_id: REVIEWER_R01 }));
  await expect(
    r01Page.getByTestId('ws-sample-item').filter({ hasText: FORCED_DIVERGENCE_RECORD_ID }).locator('.status-badge')
  ).toHaveText('已定稿 · 已鎖定');

  /* PL-side annotation-results panel: the journey's live arbitration
   * outcome still cannot reach this panel (the remaining prototype gap,
   * documented in the final report) -- but since issue #284
   * getAnnotationResultsData() returns an empty set for a task id without
   * an ANNOTATION_RESULTS_BY_TASK entry instead of falling back to the
   * T001 seed, so the checkpoint now asserts the honest empty state
   * rather than another task's leaked content. The seeded panel's
   * finalized badge + arbitration history affordance stays covered on
   * T001 by task-detail-review-history.spec.ts:54-70. */
  await plPage.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${fixtureTaskId}&tab=annotation-results`);
  await expect(plPage.locator('#arEmptyState')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
  await expect(plPage.locator('#arTableSection')).toBeHidden();
});

test.describe('XROLE-20: completion is not blocked by unresolved disputes (documents the D2 gap)', () => {
  test('publishing complete with an unresolved dispute should be blocked but is not', async ({ page }) => {
    /* D2 gap (w4 §5, "Spec-defined (pending revision)"): publishComplete()
     * (task-detail.html:8863-8869) sets status = 'completed' unconditionally
     * -- it consults no review-unit state, no dispute pool, no submission
     * progress. Seeding a real disputed unit here would be moot: the page
     * reads none of it, which is exactly the gap. Runs isolated from the
     * shared journey (fresh page + own task id) like XROLE-04. */
    test.fail();

    const gapTaskId = `XROLE-gap-d2-block-${Date.now()}`;
    await patchDataFile(page, 'task-detail.data.js', buildXRoleSeedPatch(gapTaskId));
    await page.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${gapTaskId}&status=official_run_in_progress`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await expect(page.locator('#publishCompleteBtn')).toBeVisible();
    await page.locator('#publishCompleteBtn').click();
    // Desired behavior: with an unresolved dispute the task must stay in
    // official marking and surface the blocking gap list. Actual behavior:
    // the stepper advances to 已完成 immediately, so this assertion fails.
    await expect(page.locator('#statusStepper .step-current .step-label-wrap')).toHaveText('正式標記中');
  });
});

test.describe('XROLE-21: completion has no confirmation modal (documents the D2 gap)', () => {
  test('publishing complete should require a second confirmation before advancing', async ({ page }) => {
    /* Same D2 family as XROLE-20 but a distinct missing affordance: w4
     * expects a 二次確認 modal equivalent to the existing riskModal mechanism
     * (openRiskModal(), task-detail.html:8796-8801) before the terminal,
     * irreversible completion -- publishComplete() advances without any
     * confirmation step. */
    test.fail();

    const gapTaskId = `XROLE-gap-d2-confirm-${Date.now()}`;
    await patchDataFile(page, 'task-detail.data.js', buildXRoleSeedPatch(gapTaskId));
    await page.goto(`/pages/task-management/task-detail.html?task_role=project_leader&task_id=${gapTaskId}&status=official_run_in_progress`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#publishCompleteBtn').click();
    // Desired behavior: a confirmation modal opens (riskModal gains .show)
    // and the status has not advanced yet. Actual behavior: no modal exists
    // on this path, so this assertion fails.
    await expect(page.locator('#riskModal')).toHaveClass(/show/);
  });
});

test('XROLE-22: official-stage export carries the official run_stage; the arbitrated value lives at the data layer', async () => {
  // plPage still sits on the annotation-results tab from XROLE-19.
  await plPage.locator('#arStageSelect').selectOption('official');

  const downloadPromise = plPage.waitForEvent('download');
  await plPage.locator('#arExportJsonBtn').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const payload = JSON.parse(await readFile(downloadPath as string, 'utf8'));

  expect(payload.manifest.applied_filters.run_stage).toBe('official');
  expect(Array.isArray(payload.items)).toBe(true);
  // Since issue #284 an unseeded task id exports an empty item set instead
  // of leaking the T001 seed's items.
  expect(payload.items).toHaveLength(0);

  /* Deviation from w4's "匯出 JSON 的 xrole-003 標註值為仲裁後 negative":
   * the export serializes getAnnotationResultsData(), which for this task
   * id is empty since issue #284 (it used to leak the T001 seed) -- the
   * journey's items/values still cannot appear in it (same gap as
   * XROLE-19, reported in the final report). The arbitrated-value truth w4
   * wants is therefore pinned at the data layer the export WOULD read from
   * once wired: the finalized value is R02's correction, not the
   * annotator's original gold answer. */
  const state = await readArbitrationState(r03Page, FORCED_DIVERGENCE_RECORD_ID, OFFICIAL_RUN_ASSIGNMENTS[FORCED_DIVERGENCE_RECORD_ID]);
  expect(state['single_label::single_label'].finalized_value).toBe(DIVERGENCE_CORRECTION);
  expect(state['single_label::single_label'].finalized_value).not.toBe(OFFICIAL_GOLD[FORCED_DIVERGENCE_RECORD_ID]);
});

test('XROLE-23: mid-work state survives a reload and never leaks across roles', async () => {
  /* w4 wrote this row against R01's un-submitted review decisions, but the
   * prototype has no reviewer draft channel at all: reviewRowDecisions is an
   * in-memory object reset on every render (annotation-workspace.config.js:
   * 1676/2568) and reviewer mode hides the save button
   * (annotation-workspace-save-draft.spec.ts:58-63). The reload-restore
   * guarantee only exists for the ANNOTATOR draft channel (FR-026), so this
   * test covers the row's two intents on the mechanisms that exist:
   * restore-after-reload via an annotator draft, and cross-role invisibility
   * of un-submitted work via the submitted-only getSubmission contract. */
  const sampleId = FORCED_DIVERGENCE_RECORD_ID;

  // A01 never submitted this record (it is A02's assignment): A01's own
  // bucket is untouched, so a draft can be created on the live journey task.
  await a01Page.goto(annotatorOfficialUrl(sampleId, 'A01'));
  // Pick a value different from the gold prefill ('positive') so the
  // restored chip below can only come from the draft, not the prefill.
  await a01Page.getByTestId('ws-single-label-chip-negative').click();
  await a01Page.getByTestId('ws-save-btn').click();
  await expect.poll(() => readSampleStatus(a01Page, 'official_run', sampleId, 'A01')).toBe('saved');

  await a01Page.goto(annotatorOfficialUrl(sampleId, 'A01'));
  await expect(a01Page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');

  // Cross-role invisibility: drafts are never a submission -- getSubmission
  // is submitted-only by contract (annotation-workspace.data.js:272-278,
  // "reviewers must never see drafts"), so the reviewer side reads null.
  const visibleToReviewer = await r01Page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a) => (window as any).LabelSuiteAnnotationWorkspaceData.getSubmission(
      a.taskId, 'annotator', 'official_run', a.sampleId, { annotatorId: 'A01' }),
    { taskId: fixtureTaskId, sampleId }
  );
  expect(visibleToReviewer).toBeNull();
});

test.describe('XROLE-24: double-clicking submit records exactly one history event (issue #201 regression, journey fixture)', () => {
  test('a rapid double submit on an XROLE official sample stays a single audit event', async ({ page }) => {
    /* Isolated from the shared journey (own task id, fresh page) because the
     * double-click must target a sample whose submission history this test
     * owns end-to-end -- replaying it on fixtureTaskId would append to
     * XROLE-10's audit trail. Mirrors issue-201-submit-busy-guard.spec.ts:
     * both clicks are dispatched before the busy flag can settle, and the
     * appendHistoryEvent() guard (annotation-workspace.data.js:210-224)
     * plus handleSubmit's busy flag must keep the trail at one event. */
    const dupTaskId = `XROLE-journey-dup-${Date.now()}`;
    await skipGuidelineModal(page);
    await patchDataFile(page, 'annotation-workspace.data.js', buildXRoleSeedPatch(dupTaskId));
    await page.goto(buildWorkspaceUrl({
      task_id: dupTaskId, sample_id: 'xr-off-001', role: 'annotator',
      run_type: 'official_run', annotator_id: 'A01',
    }));

    // Gold prefill supplies the answer; both clicks race the busy flag.
    const submitBtn = page.getByTestId('ws-submit-btn');
    await Promise.all([submitBtn.click(), submitBtn.click()]);

    const submittedEvents = await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (taskId) => (window as any).LabelSuiteAnnotationWorkspaceData.getSampleHistory(
        taskId, 'official_run', 'xr-off-001', { annotatorId: 'A01' })
        .filter((event: { action: string }) => event.action === 'submitted'),
      dupTaskId
    );
    expect(submittedEvents).toHaveLength(1);
  });
});

test('XROLE-25: no page ever raised an unexpected JS exception across the whole mainline', async () => {
  // trackPageErrors was attached to all seven shared pages in beforeAll,
  // before any navigation -- this net therefore spans every mainline step
  // (XROLE-01 through XROLE-23). The isolated gap tests run on their own
  // fresh pages outside this net by design.
  for (const errors of Object.values(pageErrorsByRole)) {
    assertNoPageErrors(errors);
  }
});

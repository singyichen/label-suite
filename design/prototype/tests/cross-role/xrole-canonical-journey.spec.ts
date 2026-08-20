import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import {
  buildListUrl,
  buildWorkspaceUrl,
  patchDataFile,
  skipGuidelineModal,
} from '../annotation/_workspace-helpers';
import {
  buildXRoleSeedPatch,
  DRY_RUN_RECORD_IDS,
} from './fixtures/build-xrole-patch';

/* Cross-role canonical journey, first half (issue #212, PR-B1).
 *
 * Covers XROLE-01 through XROLE-09 -- journey steps 1-7 (task creation ->
 * dataset upload -> guideline -> sampling/review settings -> member
 * management -> dry-run marking -> IAA gate) plus the two cross-page
 * reconciliation checkpoints (A: publish -> annotation-list count, B: 6
 * dry-run submissions -> status sync). PR-B2 extends this same file with
 * XROLE-10 onward (official run, review, dispute/arbitration).
 *
 * ── Two task ids, by design (not an oversight) ────────────────────────────
 * `task-new.html`'s `submitTask()` (task-new.html:1398-1414) never writes
 * the wizard's state into `window.LabelSuiteTaskListData` /
 * `window.LabelSuiteTaskDetailData` -- it only generates an id and redirects
 * to `task-detail.html?task_id=<id>`. `resetTaskData()`
 * (task-detail.html:4303-4352) sets `TASK_NOT_FOUND = true` for any id it
 * cannot resolve from those profiles, so the wizard-created task is a dead
 * end for every stage after creation. XROLE-01/02's wizard walkthrough
 * therefore runs against its own generated `wizardTaskId`, purely to prove
 * the creation UI works end-to-end; every later stage (guideline onward)
 * runs against a separate `fixtureTaskId` seeded via `buildXRoleSeedPatch`
 * (PR-A, already merged), matching the established pattern in
 * `xrole-fixture-smoke.spec.ts` and the single-page task-detail specs this
 * file's steps mirror.
 *
 * ── Shared BrowserContext (w4 plan §0.1, mandatory) ────────────────────────
 * One `browser.newContext()` + one `context.newPage()` per role (PL, A01,
 * A02, A03 -- reviewer pages are PR-B2 scope) instead of independent
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

let context: BrowserContext;
let plPage: Page;
let a01Page: Page;
let a02Page: Page;
let a03Page: Page;
let fixtureTaskId: string;
let wizardTaskId: string | null = null;

test.beforeAll(async ({ browser }, testInfo) => {
  context = await browser.newContext();
  plPage = await context.newPage();
  a01Page = await context.newPage();
  a02Page = await context.newPage();
  a03Page = await context.newPage();

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

  await skipGuidelineModal(a01Page);
  await skipGuidelineModal(a02Page);
  await skipGuidelineModal(a03Page);
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
  // wizard-created task can never be revisited (see file-level doc comment).
  await expect(plPage.locator('#step4Panel')).not.toHaveClass(/hidden/);
  await plPage.locator('#nextBtn').click();

  await expect(plPage).toHaveURL(/task-detail\.html\?task_id=task_xrole-canonical-journey_\d+/, {
    timeout: PANEL_LOAD_TIMEOUT,
  });
  wizardTaskId = new URL(plPage.url()).searchParams.get('task_id');
  expect(wizardTaskId).toBeTruthy();

  // XROLE-02 leg 3: the wizard-created task cannot be resolved by
  // task-detail.html (resetTaskData() sets TASK_NOT_FOUND for any id absent
  // from window.LabelSuiteTaskDetailData.profiles) -- the redirect landing
  // on a not-found state is itself proof that the wizard and the seeded
  // fixture are two genuinely separate tasks, not evidence of a bug.
  await expect(plPage.locator('#taskNotFoundTitle')).toHaveText('找不到任務', { timeout: PANEL_LOAD_TIMEOUT });
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
      await expect(annotatorPage.getByTestId('ws-sample-item').nth(i)).toHaveAttribute('data-submitted', 'true');
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

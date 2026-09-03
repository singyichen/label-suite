import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Review-flow demo state seeder (spec 015, review-flow demo Phase 2 slice C).
 *
 * T014-T017's mock rows (slice B) only give the reviewer list a roster; every
 * unit still derives 待審 because nothing is submitted. This file pins the
 * boot-time seeder that stages the full review-flow demo: annotator
 * submissions, reviewer decisions and one arbitration per script, T014-T017
 * ONLY, guarded by the marker key `labelsuite.reviewFlowDemoSeed.v1` so a
 * reload never duplicates history events or refreshes timestamps.
 *
 * Expected status matrix (derived, not stored -- see getReviewUnitStatus).
 * issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, FR-093)
 * changed the assignment model this matrix depends on: a review unit now
 * belongs to exactly ONE assigned reviewer, spread across the 4-member
 * roster by round robin (index % 4 over [wang, li, chen, lin], sorted by
 * sample_id). That reassignment changed WHO reviewed which annotator-unit
 * within each sample, which in turn changed some of issue #551's original
 * per-row outcomes -- the matrix below is read directly off today's
 * production seeder via a live-page probe (per-reviewer list, `.status-badge`
 * per row), not derived from the pre-#596 narrative:
 *   T014 dry_run: dry-01 finalized x3 · dry-02 finalized/disputed/pending ·
 *     dry-03 pending/disputed/pending · dry-04 finalized x3 (chen's seeded
 *     arbitration record is redundant but still present, see the second
 *     test below) · dry-05 disputed/pending/pending
 *   T015 official_run: ofs-01 finalized · ofs-02 disputed · ofs-03 finalized
 *     (arbitrated) · ofs-04 pending · (ofs-05 absent, no mock row)
 *
 * No single reviewer's list shows a whole task's unit set any more, and
 * FR-060 additionally puts a disputed unit on BOTH its assigned reviewer's
 * list and the eligible arbiter's (chen's) list -- so the T014/T015 tests
 * below merge all 4 reviewer views into one map keyed by
 * `${sampleId}::${annotator}`, asserting duplicate views agree rather than
 * assuming disjoint per-reviewer buckets. See
 * annotation-review-flow-demo-rows.spec.ts's `reviewUnitsAcrossRoster()` for
 * the same merge pattern applied to row COUNTS.
 *
 * T016 and T017's old min_reviewers/quorum seed rows (已同意/已修改 interim
 * states, majority convergence, N-way ties) are unsatisfiable under FR-093 --
 * one reviewer has nothing to converge or tie against. design.md's Migration
 * Plan retargets both at a single canonical relay path each (task 7.4a/7.4b):
 *   T016 (`ofm-01-reviewer-corrects-b`, index 0 -> reviewer_wang): annotator
 *     submits, wang MODIFIES the value, arbiter reviewer_chen (the roster's
 *     only can_arbitrate reviewer, not a participant -- FR-060) adopts B ->
 *     unit finalizes on wang's corrected value, decided by chen.
 *   T017 (`oft-01-final-exception`, index 0 -> reviewer_wang): same dispute
 *     shape, but chen's arbitration REJECTS both sides (兩者皆非, FR-061
 *     point 3) -> the item queues in the final exception pool (FR-095),
 *     unit stays disputed until a role=project_leader visit resolves it.
 * The other 4 samples per task are intentionally NOT pinned here (task
 * 7.4a's Red contract only mandates these two canonical paths); their COUNT
 * (5 per task) stays guarded by annotation-review-flow-demo-rows.spec.ts's
 * unmodified `reviewUnitsAcrossRoster` assertions.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-051, FR-059, FR-060, FR-061 (v4.54.0, issue #551);
 *   openspec/changes/2026-09-01-single-owner-review-relay/
 *   specs/annotation/015-annotation-workspace/spec.md
 *   FR-093, FR-060, FR-061 (v5.0.0), FR-094, FR-095
 */

const SEED_MARKER = 'labelsuite.reviewFlowDemoSeed.v1';

/* Issue #452 appended a finalize-threshold qualifier to every non-待審
   badge so colour is never the only signal. This suite pins the five-state
   SPREAD, so it names the base state and derives the qualifier; the literal
   rendered strings are pinned in issue-452-review-progress-subjects.spec.ts. */
function badgeText(state: string): string {
  if (state === '待審') return state;
  return state === '已定稿' ? '已定稿 · 已鎖定' : `${state} · 未定稿`;
}

async function expectBadges(page: Page, expected: string[]) {
  const rows = page.getByTestId('ws-sample-item');
  await expect(rows).toHaveCount(expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    await expect(rows.nth(i).locator('.status-badge')).toHaveText(badgeText(expected[i]));
  }
}

const ROSTER = ['reviewer_wang', 'reviewer_li', 'reviewer_chen', 'reviewer_lin'] as const;

/* issue #596 (FR-093): a review unit belongs to exactly one assigned
   reviewer, so no single reviewer page shows a whole task's unit set --
   and FR-060 additionally puts a disputed unit on BOTH its assigned
   reviewer's list and the eligible arbiter's (chen's) list. This merges
   all 4 reviewer views into one map keyed by `${sampleId}::${annotator}`,
   asserting duplicate sightings agree instead of assuming disjoint
   per-reviewer buckets. */
async function collectStatusMap(
  page: Page,
  taskId: string,
  runType: 'dry_run' | 'official_run',
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const reviewerId of ROSTER) {
    await page.goto(buildListUrl({ task_id: taskId, role: 'reviewer', run_type: runType, reviewer_id: reviewerId }));
    const rows = page.getByTestId('ws-sample-item');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const sampleId = (await rows.nth(i).getByTestId('list-review-id').innerText()).trim();
      const annotator = (await rows.nth(i).getByTestId('list-review-annotator').innerText()).trim();
      const badge = (await rows.nth(i).locator('.status-badge').innerText()).trim();
      const key = `${sampleId}::${annotator}`;
      if (map.has(key)) {
        expect(badge, `${key} disagreed between two reviewer views`).toBe(map.get(key));
      } else {
        map.set(key, badge);
      }
    }
  }
  return map;
}

test.describe('T014 dry_run staged states', () => {
  test('the 15 review units derive the scripted five-state spread, split across the round-robin roster (issue #596, FR-093)', async ({ page }) => {
    const map = await collectStatusMap(page, 'T014', 'dry_run');
    expect(map.size).toBe(15);
    const expected: Record<string, string> = {
      'dry-01-all-agree::kioleemg12': '已定稿',
      'dry-01-all-agree::113450022': '已定稿',
      'dry-01-all-agree::tony0950127': '已定稿',
      'dry-02-one-divergent::kioleemg12': '已定稿',
      'dry-02-one-divergent::113450022': '爭議中',
      'dry-02-one-divergent::tony0950127': '待審',
      'dry-03-dispute-open::kioleemg12': '待審',
      'dry-03-dispute-open::113450022': '爭議中',
      'dry-03-dispute-open::tony0950127': '待審',
      'dry-04-dispute-resolved::kioleemg12': '已定稿',
      'dry-04-dispute-resolved::113450022': '已定稿',
      'dry-04-dispute-resolved::tony0950127': '已定稿',
      'dry-05-pending-review::kioleemg12': '爭議中',
      'dry-05-pending-review::113450022': '待審',
      'dry-05-pending-review::tony0950127': '待審',
    };
    for (const [key, state] of Object.entries(expected)) {
      expect(map.get(key), key).toBe(badgeText(state));
    }
  });

  test("dry-04's middle unit already converges at N=1; chen's seeded arbitration record is redundant but still present", async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    // issue #551: min_reviewers = 1 now converges wang's sole correction
    // ('negative') on submit -- getReviewUnitStatus() checks convergence
    // BEFORE consulting the arbitration store, so this unit finalizes
    // without needing chen's vote at all. The seed still calls
    // submitArbitration() (matching the majority value), so the
    // arbitration record itself remains readable and unchanged.
    const arb = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getArbitrationState: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }
          ) => Record<string, { finalized_value?: unknown; finalized_by?: string }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data.getArbitrationState('T014', 'dry_run', 'dry-04-dispute-resolved', { annotatorId: '113450022' });
    });
    expect(arb['single_label::single_label']?.finalized_by).toBe('reviewer_chen');
    expect(arb['single_label::single_label']?.finalized_value).toBe('negative');
  });
});

test.describe('T015 official_run single-reviewer staged states', () => {
  test('the four submitted samples derive finalized/disputed/finalized/pending, one per round-robin reviewer (issue #596 FR-093)', async ({ page }) => {
    // ofs-05-not-submitted ships no mock row (rows.spec.ts), so only 4
    // units exist to distribute across index 0-3 -> wang/li/chen/lin.
    const map = await collectStatusMap(page, 'T015', 'official_run');
    expect(map.size).toBe(4);
    const expected: Record<string, string> = {
      'ofs-01-agree-gold::kioleemg12': '已定稿',
      'ofs-02-modified-dispute::kioleemg12': '爭議中',
      'ofs-03-arbitrated-gold::kioleemg12': '已定稿',
      'ofs-04-pending-review::kioleemg12': '待審',
    };
    for (const [key, state] of Object.entries(expected)) {
      expect(map.get(key), key).toBe(badgeText(state));
    }
  });
});

test.describe('T016 official_run: reviewer corrects, arbitration adopts B, unit finalizes (issue #596 FR-093/FR-061/FR-094)', () => {
  test("ofm-01-reviewer-corrects-b: wang's list shows the unit finalized", async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' })
    );
    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'ofm-01-reviewer-corrects-b' });
    await expect(row).toHaveCount(1);
    await expect(row.locator('.status-badge')).toHaveText(badgeText('已定稿'));
  });

  test('ofm-01-reviewer-corrects-b resolves via arbitration adopt_b, decided by reviewer_chen', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' })
    );

    const probe = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getReviewUnitStatus: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }, outKeys: string[]
          ) => string | null;
          getArbitrationState: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }
          ) => Record<string, { choice?: string; finalized_value?: unknown; finalized_by?: string }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      const identity = { annotatorId: 'kioleemg12' };
      return {
        status: data.getReviewUnitStatus('T016', 'official_run', 'ofm-01-reviewer-corrects-b', identity, ['single_label']),
        arbitration: data.getArbitrationState('T016', 'official_run', 'ofm-01-reviewer-corrects-b', identity),
      };
    });
    expect(probe.status).toBe('finalized');
    const item = probe.arbitration['single_label::single_label'];
    expect(item?.finalized_by).toBe('reviewer_chen');
    expect(item?.finalized_value).toBeTruthy();
    // FR-060: the assigned reviewer (wang) is the dispute's only
    // participant -- distinct from the arbiter who decided it.
    expect(item?.finalized_by).not.toBe('reviewer_wang');
  });

  test("ofm-01-reviewer-corrects-b's finalized card carries the FR-094 micro-trace: 標記 A ➔ 審核 B（修正）➔ 仲裁 B", async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T016', sample_id: 'ofm-01-reviewer-corrects-b', role: 'reviewer', run_type: 'official_run',
      annotator_id: 'kioleemg12', reviewer_id: 'reviewer_wang',
    }));

    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-finalized-trace')).toHaveText(
      '歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B'
    );
  });

  /* The other 4 samples per task are NOT part of 7.4a's canonical rewrite
     (design.md Migration Plan #3 and tasks.md 7.4a/7.4b only prescribe the
     two demo paths -- the canonical T016/T017 sample). They ARE, however,
     derivable today: FR-093's round-robin already reads a single assigned
     reviewer's decision per unit (confirmed live -- annotation-workspace.
     data.js's seedReviewFlowDemo() still stores each row's legacy
     multi-reviewer `rev` bag, but the current derivation engine only
     consults the assigned reviewer's key). Excluded by the `ofm-01` prefix
     so this stays correct whether the canonical slot is still named
     ofm-01-unanimous-gold or has been rewritten to
     ofm-01-reviewer-corrects-b. */
  test('the four non-canonical ofm samples keep deriving under FR-093 round robin, unaffected by the canonical rewrite', async ({ page }) => {
    const map = await collectStatusMap(page, 'T016', 'official_run');
    const nonCanonical = new Map([...map].filter(([key]) => !key.startsWith('ofm-01')));
    expect(nonCanonical.size).toBe(4);
    const expected: Record<string, string> = {
      'ofm-02-approved-interim::kioleemg12': '已定稿',
      'ofm-03-modified-interim::kioleemg12': '爭議中',
      'ofm-04-majority-converged::kioleemg12': '爭議中',
      'ofm-05-all-divergent::kioleemg12': '爭議中',
    };
    for (const [key, state] of Object.entries(expected)) {
      expect(nonCanonical.get(key), key).toBe(badgeText(state));
    }
  });

  /* Restores the old "arbitration entries on the staged disputes" block's
     breadth for T016's 3 disputed non-canonical samples (ofm-03/04/05,
     the modified/majority/divergent rows -- see the test above), enumerated
     per sample rather than summarized. ofm-01 and ofm-02 are excluded: the
     canonical slot is covered by its own describe block above and finalizes
     (no arbitrate entry), and ofm-02 finalizes too (see the map above). */
  test('reviewer_chen gets a 仲裁 entry on each of ofm-03/04/05 (the disputed non-canonical samples)', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen' })
    );
    for (const sampleId of ['ofm-03-modified-interim', 'ofm-04-majority-converged', 'ofm-05-all-divergent']) {
      const row = page.getByTestId('ws-sample-item').filter({ hasText: sampleId });
      await expect(row, sampleId).toHaveCount(1);
      await expect(row.getByTestId('list-arbitrate-entry'), sampleId).toHaveText('仲裁');
    }
  });
});

test.describe('T017 official_run: arbitration rejects both sides, final exception pool, project leader resolves (issue #596 FR-061/FR-095)', () => {
  test('oft-01-final-exception stays 爭議中 -- rejected by arbitration, not yet resolved', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' })
    );
    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'oft-01-final-exception' });
    await expect(row).toHaveCount(1);
    await expect(row.locator('.status-badge')).toHaveText(badgeText('爭議中'));
  });

  test('oft-01-final-exception: arbitration recorded a reject with no finalized value, and the exception pool has not resolved it yet', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' })
    );

    const probe = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getReviewUnitStatus: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }, outKeys: string[]
          ) => string | null;
          getArbitrationState: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }
          ) => Record<
            string,
            { votes?: Array<{ arbiter_id?: string; choice?: string }>; finalized_value?: unknown; finalized_by?: string }
          >;
          getExceptionPool: (
            taskId: string, runType: string, sampleId: string,
            identity: { annotatorId: string }
          ) => Record<string, unknown>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      const identity = { annotatorId: 'kioleemg12' };
      return {
        status: data.getReviewUnitStatus('T017', 'official_run', 'oft-01-final-exception', identity, ['single_label']),
        arbitration: data.getArbitrationState('T017', 'official_run', 'oft-01-final-exception', identity),
        pool: data.getExceptionPool('T017', 'official_run', 'oft-01-final-exception', identity),
      };
    });
    expect(probe.status).toBe('disputed');
    const item = probe.arbitration['single_label::single_label'];
    // A completed reject persists as a VOTE (D2: submitArbitration()
    // withholds finalized_value/finalized_by for `reject` by design -- the
    // absent field is the sentinel that keeps this unresolved, not a sign
    // arbitration never ran).
    expect(item?.votes?.some((v) => v.arbiter_id === 'reviewer_chen' && v.choice === 'reject')).toBe(true);
    expect(item?.finalized_by).toBeUndefined();
    expect(item?.finalized_value).toBeUndefined();
    expect(probe.pool['single_label']).toBeUndefined();
  });

  test('oft-01-final-exception surfaces on the project leader exception-pool screen, ready to resolve', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      `/pages/annotation/annotation-workspace.html?task_id=T017&sample_id=oft-01-final-exception` +
        `&role=project_leader&run_type=official_run&annotator_id=kioleemg12`
    );

    await expect(page.getByTestId('ws-exception-pool')).toBeVisible();
    await expect(page.getByTestId('ws-exception-pool-item')).toHaveCount(1);
  });

  /* FR-060: arbiterEntry is `爭議中 AND isArbiterCandidate` (annotation-list.
     html), neither of which depends on whether chen already cast her reject
     vote -- isArbiterCandidate only checks can_arbitrate + no REVIEWER
     submission of her own, and the unit stays 爭議中 until the pool
     resolves it. So the list row keeps offering chen the 仲裁 entry. */
  test("reviewer_chen still gets a 仲裁 entry on oft-01-final-exception's list row; wang (the participant) never does", async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen' })
    );
    const chenRow = page.getByTestId('ws-sample-item').filter({ hasText: 'oft-01-final-exception' });
    await expect(chenRow).toHaveCount(1);
    await expect(chenRow.getByTestId('list-arbitrate-entry')).toHaveText('仲裁');

    await page.goto(
      buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' })
    );
    const wangRow = page.getByTestId('ws-sample-item').filter({ hasText: 'oft-01-final-exception' });
    await expect(wangRow).toHaveCount(1);
    await expect(wangRow.getByTestId('list-arbitrate-entry')).toHaveCount(0);
  });

  /* Same rationale as T016's non-canonical test above: the other 4 oft-*
     samples aren't part of 7.4a's canonical rewrite, but they ARE derivable
     today under FR-093 round robin. Excluded by the `oft-01` prefix so this
     stays correct whether the canonical slot keeps its current name or has
     been rewritten to oft-01-final-exception. */
  test('the four non-canonical oft samples keep deriving under FR-093 round robin, unaffected by the canonical rewrite', async ({ page }) => {
    const map = await collectStatusMap(page, 'T017', 'official_run');
    const nonCanonical = new Map([...map].filter(([key]) => !key.startsWith('oft-01')));
    expect(nonCanonical.size).toBe(4);
    const expected: Record<string, string> = {
      'oft-02-approved-interim::kioleemg12': '已定稿',
      'oft-03-modified-interim::kioleemg12': '爭議中',
      'oft-04-unanimous-gold::kioleemg12': '已定稿',
      'oft-05-pending-review::kioleemg12': '待審',
    };
    for (const [key, state] of Object.entries(expected)) {
      expect(nonCanonical.get(key), key).toBe(badgeText(state));
    }
  });

  /* Restores the old "arbitration entries on the staged disputes" block's
     breadth for T017's disputed non-canonical sample. Only oft-03-modified-
     interim is disputed among the 4 non-canonical samples (see the map
     above) -- oft-02 and oft-04 finalize, oft-05 is still pending, so this
     is a one-sample enumeration, not a retirement. */
  test('reviewer_chen gets a 仲裁 entry on oft-03-modified-interim (the disputed non-canonical sample)', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T017', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen' })
    );
    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'oft-03-modified-interim' });
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('list-arbitrate-entry')).toHaveText('仲裁');
  });
});

test.describe('seeder idempotence', () => {
  test('a reload neither re-seeds nor mutates the stored demo state', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const readStores = () =>
      page.evaluate((marker) => ({
        marker: window.localStorage.getItem(marker),
        // Submission buckets each live under their own key (issue #283);
        // serialize them all, sorted, so the comparison stays order-stable.
        submissions: Object.keys(window.localStorage)
          .filter((key) => key.indexOf('labelsuite.wsSubmissions.') === 0)
          .sort()
          .map((key) => key + '=' + window.localStorage.getItem(key))
          .join('\n'),
        // Arbitration items each live under their own key too (issue #319);
        // serialize them all, sorted, so the comparison stays order-stable.
        arbitration: Object.keys(window.localStorage)
          .filter((key) => key.indexOf('labelsuite.wsArbitration.') === 0)
          .sort()
          .map((key) => key + '=' + window.localStorage.getItem(key))
          .join('\n'),
      }), SEED_MARKER);

    const first = await readStores();
    expect(first.marker).toBeTruthy();
    // Non-empty guard: with per-bucket/per-item keys, "seeder wrote nothing"
    // would serialize to '' and trivially equal itself across reloads.
    expect(first.submissions).not.toBe('');
    expect(first.arbitration).not.toBe('');

    await page.reload();
    // Timestamps come from `new Date()` at seed time: a second seeding pass
    // (or a duplicated history event) would change the serialized stores.
    const second = await readStores();
    expect(second).toEqual(first);
  });

  test('seeding never touches tasks outside T014-T017', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));

    const foreignKeys = await page.evaluate(() => {
      const submissionBucketKeys = Object.keys(window.localStorage)
        .filter((key) => key.indexOf('labelsuite.wsSubmissions.') === 0)
        .map((key) => key.slice('labelsuite.wsSubmissions.'.length));
      const arbitrationItemKeys = Object.keys(window.localStorage)
        .filter((key) => key.indexOf('labelsuite.wsArbitration.') === 0)
        .map((key) => key.slice('labelsuite.wsArbitration.'.length));
      return submissionBucketKeys
        .concat(arbitrationItemKeys)
        .filter((key) => !/^T01[4-7]::/.test(key));
    });
    expect(foreignKeys).toEqual([]);
  });
});

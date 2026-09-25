/* Shared helpers for the outputs[]-model Annotation Workspace test suite
 * (spec 015 v2.0.0). Not itself a *.spec.ts file, so Playwright does not run
 * it as a test file; it only exports helpers consumed by the specs below.
 *
 * URL contract (spec 015 v2.0.0, BREAKING): the workspace and the
 * annotation list both resolve everything from `task_id` -> TaskProfile.
 * `task_type` / `sub_type` query params no longer exist.
 */
import { expect, type Locator, type Page } from '@playwright/test';

export type Role = 'annotator' | 'reviewer';
export type RunType = 'dry_run' | 'official_run';

/* `annotator_id` / `reviewer_id` are the spec 015 v3.8.0 identity params
 * (issue #145): omitted, both pages fall back to the default roster identity,
 * which is what every pre-v3.8.0 spec here relies on. */
export type Identity = { annotator_id?: string; reviewer_id?: string };

function identityQuery({ annotator_id, reviewer_id }: Identity): string {
  return (
    (annotator_id ? `&annotator_id=${annotator_id}` : '') +
    (reviewer_id ? `&reviewer_id=${reviewer_id}` : '')
  );
}

export function buildWorkspaceUrl(
  params: {
    task_id: string;
    sample_id: string;
    role?: Role;
    run_type?: RunType;
  } & Identity
): string {
  const { task_id, sample_id, role = 'annotator', run_type = 'official_run' } = params;
  return `/pages/annotation/annotation-workspace.html?task_id=${task_id}&sample_id=${sample_id}&role=${role}&run_type=${run_type}${identityQuery(params)}`;
}

export function buildListUrl(params: { task_id: string; role?: Role; run_type?: RunType } & Identity): string {
  const { task_id, role = 'annotator', run_type = 'official_run' } = params;
  return `/pages/annotation/annotation-list.html?task_id=${task_id}&role=${role}&run_type=${run_type}${identityQuery(params)}`;
}

/* Every spec below skips the first-visit guideline modal so interaction
 * tests don't have to special-case it; kept as an explicit opt-in helper
 * (rather than a global beforeEach) so guideline-focused specs can still
 * exercise the modal itself. */
export async function skipGuidelineModal(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  });
}

export async function dismissGuidelineModal(page: Page) {
  const confirmBtn = page.getByTestId('ws-guideline-modal-confirm');
  await confirmBtn.click({ timeout: 2000 }).catch(() => {
    // The modal may not render for every sample/role transition.
  });
}

/* Intercepts a LabelSuite*.data.js host-global fixture file and appends a
 * runtime-only patch expression after it, so tests can cover configurations
 * absent from the 13 illustrative seeds (e.g. allow_bypass on a type that
 * doesn't set it, or a second dataset record) WITHOUT touching any file
 * under pages/. The patch runs after the IIFE has already attached its
 * global, so it can freely mutate `window.<Global>.profiles[...]`. */
export async function patchDataFile(page: Page, fileName: string, patchScript: string) {
  await page.route(`**/${fileName}`, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({
      response,
      body: `${body}\n;(function(){\n${patchScript}\n})();\n`,
    });
  });
}

export async function setRangeValue(locator: import('@playwright/test').Locator, value: string) {
  await locator.evaluate((node, nextValue) => {
    const input = node as HTMLInputElement;
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

/* Selects `text` (first occurrence) inside the element located by `target`
 * and fires the mouseup the engine's passage-selection handler listens for.
 * Walks text nodes so the target can live inside an entity highlight span
 * or a plain text segment between spans — mirrors how an annotator drags
 * over the passage in the relation builder flow (E1/Arg1 → Relation →
 * E2/Arg2).
 * `target` is a testid for the annotator's input card; reviewer panels render
 * the passage inside the engine's own element, whose mouseup listener the
 * dispatch must land on directly, so those callers pass a Locator. */
export async function selectWorkspaceText(page: Page, target: string | Locator, text: string) {
  const el = typeof target === 'string' ? page.getByTestId(target) : target;
  await el.evaluate((node, target) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const idx = textNode.textContent?.indexOf(target) ?? -1;
      if (idx < 0) continue;
      const range = document.createRange();
      range.setStart(textNode, idx);
      range.setEnd(textNode, idx + target.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    throw new Error(`selectWorkspaceText: "${target}" not found in any text node`);
  }, text);
  await el.dispatchEvent('mouseup');
}

/* Regression guard for the old workspace's `summarizeReviewerAspectCorrections`
 * ReferenceError (annotation-workspace.html:5029) that fired on review
 * submit. Attach before navigation; call assertNoPageErrors() after the
 * flow under test to fail loudly (with the real error message) instead of
 * silently swallowing a JS exception as a generic timeout. */
export function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

export function assertNoPageErrors(errors: Error[]) {
  expect(errors, `Unexpected page errors: ${errors.map((e) => e.message).join('; ')}`).toEqual([]);
}

/* FR-089 (spec 015 v4.61.0, issue #578): finalizing a dispute now requires a
 * reason per open item, so the arbitration submit stays blocked until every
 * ws-arbitration-reason field is answered. Specs whose subject is the
 * arbitration OUTCOME rather than the reason contract itself answer them all
 * in one call here; issue-578-reason-required.spec.ts owns the contract. */
export async function fillArbitrationReasons(page: Page, reason = '仲裁理由（測試）') {
  const fields = page.getByTestId('ws-arbitration-reason');
  const count = await fields.count();
  for (let i = 0; i < count; i += 1) {
    await fields.nth(i).fill(reason);
  }
}

/* issue #960: FR-093's assignment gate (issue #921) means a review unit is
 * only interactive for whichever reviewer_id the deterministic round-robin
 * actually dealt it -- a spec that opens the workspace with a hardcoded or
 * omitted reviewer_id and happens to land on the roster's first entry is
 * relying on a coincidence, not a contract. This resolves the REAL
 * assignee by calling the SAME production derivation the workspace and the
 * review list use (annotation-workspace.data.js `listReviewUnits()` /
 * `taskReviewAssignments()`, exposed on `window.LabelSuiteAnnotationWorkspaceData`)
 * from inside the page, instead of re-deriving the round-robin here --
 * spec 015 FR-093 forbids a second assignment derivation, and duplicating
 * the rule in test code would only be a second place for it to drift from.
 *
 * Must be called against a page that already has
 * annotation-workspace.data.js loaded (any annotation-workspace.html /
 * annotation-list.html navigation for this task_id) so a preceding
 * patchDataFile() seed is already in effect -- most callers resolve this
 * right after the in-test annotator submission, on the same page, before
 * navigating to the reviewer URL.
 *
 * `listReviewUnits()` enumerates one row per REVIEWER_MOCK_ROWS demo
 * annotator on every sample (issue #792), not one -- so resolving "the"
 * assignee for a bare sample_id is ambiguous by default. The workspace
 * itself resolves this the same way: `resolveIdentity()`
 * (annotation-workspace.data.js:228) reads `annotator_id` from the URL and
 * falls back to `DEFAULT_ANNOTATOR_ID` ('kioleemg12') when the caller (like
 * every affected spec here) never sets it. `annotator_id` therefore
 * defaults the same way here -- reusing `DEFAULT_ANNOTATOR_ID` from the same
 * exposed object rather than a second copy of the literal -- so this always
 * asks about the exact unit the workspace will actually render. Pass
 * `annotator_id` explicitly only for a spec that also sets a custom
 * `annotator_id` on its own reviewer URL. Throws rather than guessing when
 * the task has no matching assignment at all, or when more than one
 * candidate remains -- a silent fallback here would reintroduce exactly the
 * coincidental-default bug this helper exists to remove. */
export async function resolveAssignedReviewerId(
  page: Page,
  params: { task_id: string; sample_id: string; run_type?: RunType; annotator_id?: string }
): Promise<string> {
  const { task_id, sample_id, run_type = 'official_run', annotator_id } = params;
  const candidates = await page.evaluate(
    ({ taskId, sampleId, runType, annotatorId }) => {
      const data = (window as any).LabelSuiteAnnotationWorkspaceData;
      const resolvedAnnotatorId = annotatorId || data.DEFAULT_ANNOTATOR_ID;
      const units = data.listReviewUnits(taskId, runType).map((unit: any) => ({
        sample_id: unit.sampleId,
        annotator_id: unit.annotatorId,
      }));
      return data
        .taskReviewAssignments(taskId, runType, units)
        .filter(
          (assignment: any) => assignment.sample_id === sampleId && assignment.annotator_id === resolvedAnnotatorId
        );
    },
    { taskId: task_id, sampleId: sample_id, runType: run_type, annotatorId: annotator_id ?? null }
  );
  if (candidates.length === 0) {
    throw new Error(
      `resolveAssignedReviewerId: no FR-093 assignment found for task_id=${task_id} sample_id=${sample_id} run_type=${run_type}` +
        (annotator_id ? ` annotator_id=${annotator_id}` : ' annotator_id=<DEFAULT_ANNOTATOR_ID>')
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `resolveAssignedReviewerId: ${candidates.length} candidate units for task_id=${task_id} sample_id=${sample_id} run_type=${run_type} -- pass annotator_id to disambiguate (candidates: ${candidates
        .map((c: any) => c.annotator_id)
        .join(', ')})`
    );
  }
  return candidates[0].reviewer_id;
}

/* issue #960: resolves the FR-093 assignee via resolveAssignedReviewerId()
 * and returns the reviewer workspace URL built with it, WITHOUT navigating
 * -- for a caller that needs the URL string itself (e.g. to load it twice,
 * once per patchDataFile() variant, the way
 * annotation-workspace-review-seed-source.spec.ts does). A caller that has
 * not already loaded a page for this task_id (annotation-list.html /
 * annotation-workspace.html both attach
 * window.LabelSuiteAnnotationWorkspaceData) gets one here first, as the
 * annotator role, since that role needs no reviewer identity to resolve --
 * a plain read, no submission.
 *
 * ponytail: always takes this bootstrap hop, even when the caller's own
 * submitAsAnnotator()-style setup just loaded the very same task_id/
 * sample_id a moment ago; a page.url() check could skip the redundant
 * navigation if suite runtime ever makes that worth the extra branching. */
export async function buildReviewerWorkspaceUrl(
  page: Page,
  params: { task_id: string; sample_id: string; run_type?: RunType; annotator_id?: string }
): Promise<string> {
  const { task_id, sample_id, run_type, annotator_id } = params;
  await page.goto(buildWorkspaceUrl({ task_id, sample_id, role: 'annotator', run_type }));
  const reviewer_id = await resolveAssignedReviewerId(page, { task_id, sample_id, run_type, annotator_id });
  return buildWorkspaceUrl({ task_id, sample_id, role: 'reviewer', run_type, annotator_id, reviewer_id });
}

/* The one-line replacement for `page.goto(buildWorkspaceUrl({ ..., role:
 * 'reviewer' }))` that most affected specs needed -- resolves via
 * buildReviewerWorkspaceUrl() above and navigates straight there. */
export async function gotoReviewerWorkspace(
  page: Page,
  params: { task_id: string; sample_id: string; run_type?: RunType; annotator_id?: string }
): Promise<void> {
  await page.goto(await buildReviewerWorkspaceUrl(page, params));
}

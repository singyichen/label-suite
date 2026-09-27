/**
 * issue #1023: on `annotation-list.html`, the `mountSidebar()` call
 * (design/prototype/pages/annotation/annotation-list.html ~588) omits
 * `taskRole` entirely:
 *
 *   window.LabelSuiteSharedSidebar.mountSidebar({
 *     mountId: 'sharedSidebarMount',
 *     activeNav: 'annotation',
 *     annotationHref: annotationListHref,
 *     ...
 *   });
 *
 * The control group, `annotation-workspace.html` (1104-1111), resolves the
 * URL's `role` param into `taskRole` before calling `mountSidebar()`:
 *
 *   var urlTaskRole = (function () {
 *     var role = new URLSearchParams(window.location.search).get('role');
 *     return role === 'reviewer' ? 'reviewer'
 *       : role === 'project_leader' ? 'project_leader' : 'annotator';
 *   })();
 *   window.LabelSuiteSharedSidebar.mountSidebar({
 *     mountId: 'sharedSidebarMount',
 *     activeNav: 'annotation',
 *     taskRole: urlTaskRole,
 *     ...
 *   });
 *
 * Because `annotation-list.html` never computes or passes `taskRole`,
 * `renderSidebar()` (design/prototype/pages/shared/sidebar.js ~486-513)
 * always falls through to its `undefined` branch and renders '標記作業'
 * for `#navAnnotation`, no matter what `role` the list page's URL carries.
 * `sidebar.js` already has all three branches (issue #1018, merged as of
 * this file's Traceability baseline) -- reviewer -> 審核作業/Review,
 * project_leader -> 例外處置/Exception Disposition, else -> 標記作業 (no
 * English variant) -- so the fix is solely in annotation-list.html's
 * `mountSidebar()` call site, not in sidebar.js.
 *
 * This file asserts the RENDERED DOM text of `#navAnnotation` on
 * `annotation-list.html` for reviewer and project_leader (currently wrong:
 * both still read '標記作業'), plus a non-regression pin for annotator /
 * no-role (already correct today, must stay correct after the fix).
 *
 * Structural conventions (mirrors
 * issue-1018-sidebar-pl-exception-label.spec.ts):
 * - Each role/language scenario lives in its own `test.describe`
 *   (retries: 2).
 * - English assertions preset `localStorage.labelsuite.lang = 'en'` via
 *   `page.addInitScript` BEFORE `page.goto`, not a post-navigation
 *   `lang-toggle` click -- `mountSidebar()` bakes `#navAnnotation`'s text
 *   into static HTML once, at mount, from `taskRoleI18n[readStoredLang()]`
 *   (sidebar.js:486, 511-513); a later language toggle never re-invokes
 *   `mountSidebar()` for this element (confirmed in issue #1018's file
 *   header).
 * - All assertions use `expect(...).toHaveText(...)`, which polls/retries,
 *   never a one-shot `.textContent()` / `.evaluate()` read (issue #1040).
 * - `project_leader` is built as a literal query string, not via
 *   `buildListUrl()` (`_workspace-helpers.ts`'s `Role` type is intentionally
 *   `'annotator' | 'reviewer'` only) -- mirrors
 *   `buildProjectLeaderUrl()` in issue-1018-sidebar-pl-exception-label.spec.ts.
 * - No `skipGuidelineModal()` call: unlike annotation-workspace.html,
 *   annotation-list.html has no first-visit guideline modal (confirmed by
 *   its existing annotation-list-reviewer.spec.ts, which never calls it).
 *
 * NOTE on the issue #1018 precedent (see the annotator/en regression case
 * below for the full citation): before the Green fix, annotation-list.html
 * carried its OWN legacy `applyNavLabels()` / `I18N` dictionary
 * (annotation-list.html:726, 802, 2532-2536, invoked at :2574 and again on
 * every lang-toggle click at :2587) that overwrote `#navAnnotation` AFTER
 * `mountSidebar()` ran, from a plain zh/en pair with NO taskRole awareness
 * at all -- itself a violation of FR-020. The Green fix (70c8e7ba) removed
 * `navAnnotation` from both `applyNavLabels()`'s overwrite list and the
 * `I18N[lang]` dictionary entries, in addition to passing `taskRole` into
 * the `mountSidebar()` call site. As a result, `#navAnnotation` on
 * annotation-list.html is now governed exclusively by `sidebar.js`'s
 * `renderSidebar()`, the same as on annotation-workspace.html -- there is
 * no longer any per-page deviation from the #1018 precedent.
 *
 * Traceability: issue #1023; specs/shared/008-sidebar-navbar-shared/spec.md
 * FR-020.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from '../annotation/_workspace-helpers';

async function presetEnglish(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
}

function navAnnotation(page: Page) {
  return page.locator('#navAnnotation');
}

const TASK = 'T001';
const RUN_TYPE = 'dry_run';

/* `_workspace-helpers.ts`'s `Role` type is intentionally `'annotator' |
 * 'reviewer'` only, so the project_leader deep link is built locally here,
 * mirroring buildProjectLeaderUrl() in
 * issue-1018-sidebar-pl-exception-label.spec.ts. */
function buildProjectLeaderListUrl(): string {
  return `/pages/annotation/annotation-list.html?task_id=${TASK}&role=project_leader&run_type=${RUN_TYPE}`;
}

test.describe('issue #1023: reviewer #navAnnotation reads 審核作業 on annotation-list.html (zh)', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: #navAnnotation reads 審核作業', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }));

    // Red: today this renders "標記作業" because annotation-list.html's
    // mountSidebar() call never passes taskRole at all.
    await expect(navAnnotation(page)).toHaveText('審核作業');
  });
});

test.describe('issue #1023: reviewer #navAnnotation reads Review on annotation-list.html (en)', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: #navAnnotation reads Review with English preset before navigation', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('Review');
  });
});

test.describe('issue #1023: project_leader #navAnnotation reads 例外處置 on annotation-list.html (zh)', () => {
  test.describe.configure({ retries: 2 });

  test('project_leader: #navAnnotation reads 例外處置', async ({ page }) => {
    await page.goto(buildProjectLeaderListUrl());

    await expect(navAnnotation(page)).toHaveText('例外處置');
  });
});

test.describe('issue #1023: project_leader #navAnnotation reads Exception Disposition on annotation-list.html (en)', () => {
  test.describe.configure({ retries: 2 });

  test('project_leader: #navAnnotation reads Exception Disposition with English preset before navigation', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(buildProjectLeaderListUrl());

    await expect(navAnnotation(page)).toHaveText('Exception Disposition');
  });
});

test.describe('issue #1023: regression guard — annotator/no-role #navAnnotation stays 標記作業 on annotation-list.html (zh/en)', () => {
  test.describe.configure({ retries: 2 });

  /* Non-regression pin: annotator role must keep reading '標記作業', both
   * before and after the Green fix starts passing taskRole. Expected to
   * PASS already, since 'annotator' resolves to the same else-branch that
   * currently fires unconditionally. */
  test('annotator: #navAnnotation stays 標記作業 (zh)', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'annotator', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });

  /* Consistent with the issue-#1018 precedent this file otherwise mirrors:
   * on annotation-workspace.html, sidebar.js's else-branch defaultLabel is
   * the bare literal '標記作業' with no English variant, so #1018 pins
   * that branch as untranslated under an English preset (see
   * issue-1018-sidebar-pl-exception-label.spec.ts's "annotator:
   * #navAnnotation stays untranslated 標記作業" case). Before the Green fix
   * (70c8e7ba), annotation-list.html's own legacy `applyNavLabels()`
   * (design/prototype/pages/annotation/annotation-list.html:2532-2536)
   * overwrote `#navAnnotation` from its own `I18N[lang].navAnnotation`
   * dictionary entry after `mountSidebar()` ran, so this branch used to
   * render 'Annotation' (en) instead -- a page-specific deviation that was
   * itself the FR-020 violation Green removed. Now that `applyNavLabels()`
   * no longer touches `#navAnnotation` and its `I18N` entries are gone,
   * `#navAnnotation` is governed solely by `sidebar.js`, whose
   * `annotator`/else branch has no English variant -- so this case
   * correctly stays 標記作業, matching annotation-workspace.html exactly.
   * This is the expected, correct side effect of the Green fix, not a
   * regression. */
  test('annotator: #navAnnotation stays untranslated 標記作業 (en context, preset before navigation)', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(buildListUrl({ task_id: TASK, role: 'annotator', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });

  /* annotation-list.html's own default role (buildListUrl()'s `role`
   * param defaults to 'annotator'), so a URL with no `role` param at all
   * must behave identically. */
  test('no role param: #navAnnotation stays 標記作業 (zh)', async ({ page }) => {
    await page.goto(`/pages/annotation/annotation-list.html?task_id=${TASK}&run_type=${RUN_TYPE}`);

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });
});

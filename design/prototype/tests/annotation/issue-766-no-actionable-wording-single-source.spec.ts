/**
 * FR-100 §3, SC-004Z (spec 015, issue #766) -- the zero-state "nothing left
 * to review" wording (title + message, zh and en) MUST be defined exactly
 * ONCE in the prototype source tree and read by both consumers: the
 * annotation-list page's `list-no-actionable-notice` (FR-073 §5, unchanged
 * by this change) and the workspace's finalized-card remaining-count cue
 * (task 1.6, not yet implemented). Editing only one consumer must never be
 * able to make the wording diverge from the other.
 *
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *   FR-100 §3 -- "該組措辭 MUST 只有一份定義、由兩個消費端共讀，使兩處不可能
 *                因只改其中一處而分歧。"
 *   SC-004Z  -- "定稿卡歸零措辭與清單空狀態措辭不一致之語言數 MUST 為 0，該組
 *                措辭於原型原始碼中之定義 MUST 恰為 1 份。"
 *
 * design.md D2 -- the zero-state zh/en title+message moves into the data
 * layer (annotation-workspace.data.js's NO_ACTIONABLE_REVIEW_LABELS, added
 * by Green task 1.2 / commit 6e8cb406) and annotation-list.html's
 * renderNoActionableNotice() will be changed by Green task 1.4 to read that
 * single definition instead of its own page-local dictionary keys
 * (`noActionableReviewTitle` / `noActionableReviewMessage`).
 *
 * This is the Red contract for Green task 1.4. Today the four literals each
 * appear TWICE in design/prototype/pages/ -- once in
 * annotation-workspace.data.js's NO_ACTIONABLE_REVIEW_LABELS and once in
 * annotation-list.html's page-local zh/en dictionaries -- so Part A below is
 * expected to fail with an occurrence count of 2, not 1, until task 1.4
 * deletes the page-local duplicate.
 *
 * Part A does not hardcode the zh/en strings: it reads
 * NO_ACTIONABLE_REVIEW_LABELS from the live data layer via page.evaluate,
 * then scans every file under design/prototype/pages/ for that exact
 * literal, mirroring this project's existing source-level occurrence-count
 * precedent (shared/language-switch-consistency.spec.ts's
 * fs.readFileSync + path.resolve(__dirname, ...) pattern, and
 * annotation/issue-719-review-submit-auto-advance.spec.ts's
 * `text.split(needle).length - 1` occurrence-count idiom).
 *
 * Part B guards that Green task 1.4's refactor does not change any
 * user-visible behavior: `list-no-actionable-notice` keeps rendering the
 * shared wording (zh and, after the page's own language toggle, en) under
 * its existing trigger condition (`role=reviewer` + `notice=no_actionable_
 * review`), and stays hidden otherwise. This overlaps intentionally with
 * task 1.1's sibling spec (issue-766-actionable-units-single-source.spec.ts
 * Part B), which owns the "rendered text equals the data-layer definition"
 * assertion -- this file does not repeat that exact assertion pair, it adds
 * the negative trigger-condition cases (no notice param; annotator role)
 * that the sibling spec does not cover, using the same language-switch
 * approach (reading the shared definition from the data layer, then
 * switching via `#langToggle`, rather than hardcoding either language's
 * strings in this test).
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { buildListUrl } from './_workspace-helpers';

interface NoActionableReviewLabels {
  zh: { title: string; message: string };
  en: { title: string; message: string };
}

interface WorkspaceData {
  NO_ACTIONABLE_REVIEW_LABELS?: NoActionableReviewLabels;
}

interface DataWindow {
  LabelSuiteAnnotationWorkspaceData: WorkspaceData;
}

const PAGES_ROOT = path.resolve(__dirname, '../../pages');

function listFilesRecursively(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

// Occurrence count of an exact literal across every file under
// design/prototype/pages/, combined. Not scoped to a single file -- FR-100
// §3's "exactly one definition" claim is about the whole prototype source
// tree, not any one page.
function countOccurrencesAcrossPages(literal: string): number {
  let total = 0;
  for (const file of listFilesRecursively(PAGES_ROOT)) {
    const source = fs.readFileSync(file, 'utf8');
    total += source.split(literal).length - 1;
  }
  return total;
}

/* Parallel workers hitting the static server occasionally drop a
 * <script src> (issue #582 lineage); every test below does its own
 * page.goto, so this guards the same known flake the sibling review-unit
 * specs already carry. The source scan in Part A is deterministic (plain
 * fs reads), so a retry there is harmless -- it can only re-run the same
 * comparison against the same files on disk, never mask the count. */
test.describe.configure({ retries: 2 });

test.describe('Part A: the shared zero-state wording has exactly one definition across design/prototype/pages/', () => {
  test('each of NO_ACTIONABLE_REVIEW_LABELS zh/en title+message occurs exactly once in the prototype page sources', async ({
    page,
  }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const labels = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      return data.NO_ACTIONABLE_REVIEW_LABELS;
    });
    expect(labels, 'window.LabelSuiteAnnotationWorkspaceData.NO_ACTIONABLE_REVIEW_LABELS must be exported').toBeDefined();

    const literals: [string, string][] = [
      ['zh.title', labels!.zh.title],
      ['zh.message', labels!.zh.message],
      ['en.title', labels!.en.title],
      ['en.message', labels!.en.message],
    ];

    for (const [name, literal] of literals) {
      const count = countOccurrencesAcrossPages(literal);
      expect(
        count,
        `NO_ACTIONABLE_REVIEW_LABELS.${name} ("${literal}") must appear exactly once across ` +
          `design/prototype/pages/ -- found ${count}. FR-100 §3 requires this wording to have a ` +
          `single definition shared by both consumers, not a second page-local copy.`,
      ).toBe(1);
    }
  });
});

test.describe('Part B: list-no-actionable-notice keeps rendering the shared wording under its existing trigger condition', () => {
  test('reviewer + notice=no_actionable_review renders the shared zh wording, then the shared en wording after switching language', async ({
    page,
  }) => {
    await page.goto(
      buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }) + '&notice=no_actionable_review',
    );
    const notice = page.getByTestId('list-no-actionable-notice');
    await expect(notice).toBeVisible();

    const labels = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      return data.NO_ACTIONABLE_REVIEW_LABELS;
    });
    expect(labels, 'window.LabelSuiteAnnotationWorkspaceData.NO_ACTIONABLE_REVIEW_LABELS must be exported').toBeDefined();

    await expect(notice.locator('strong')).toHaveText(labels!.zh.title);
    await expect(notice.locator('span')).toHaveText(labels!.zh.message);

    await page.locator('#langToggle').click();

    await expect(notice.locator('strong')).toHaveText(labels!.en.title);
    await expect(notice.locator('span')).toHaveText(labels!.en.message);
  });

  test('reviewer without notice=no_actionable_review keeps the notice hidden', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));
    await expect(page.getByTestId('list-no-actionable-notice')).toBeHidden();
  });

  test('annotator with notice=no_actionable_review keeps the notice hidden', async ({ page }) => {
    await page.goto(
      buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'official_run' }) + '&notice=no_actionable_review',
    );
    await expect(page.getByTestId('list-no-actionable-notice')).toBeHidden();
  });
});

/*
 * Traceability: openspec/changes/1120-task-lifecycle-alignment/specs/task-management/014-task-detail/spec.md
 * DRY_RUN_COMPLETION_RULE, FR-008a, FR-013(1), FR-018(5). Issue #1120 G4a.
 *
 * Shared fixture for the review-aware dry-run completion gate. It drives T014 (and T001) through
 * the workspace module's own PUBLIC write paths -- the same functions the review screen, the
 * arbitration screen and the final exception pool call -- so no app hook is invented:
 * markSampleSubmitted (annotator / reviewer), submitArbitration, resolveExceptionPoolItem.
 * The dry-run progress flag is written last, exactly as the workspace page would, so the
 * page's init-time transition check is the thing under test.
 */
import { expect, type Page } from '@playwright/test';

export const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
export const DRY_RUN_PROGRESS_KEY = 'labelsuite.prototypeDryRunProgress';
export const TRIAL_RUN_STATE_KEY = 'labelsuite.trialRunState';
export const IN_PROGRESS_BADGE = '試標進行中';
export const WAITING_BADGE = '待 IAA 確認';

export type DryRunParts = {
  /** Reviewers submit an `approve` decision for every unit that has no review yet. */
  review?: boolean;
  /**
   * How open disputes are closed:
   *  - 'none'            leave every dispute open
   *  - 'all'             arbitrate every dispute (adopt the annotator value)
   *  - 'all-but-one-rejected'  as 'all', but the first dispute is rejected (兩者皆非 -> pending exception)
   *  - 'all-but-one-excluded'  as above, then close the pending exception with exclude_from_dataset
   */
  arbitrate?: 'none' | 'all' | 'all-but-one-rejected' | 'all-but-one-excluded';
};

export type DryRunFacts = {
  byStatus: Record<string, number>;
  awaitingArbitration: number;
  pendingExceptions: number;
};

/** Run the public write paths for `taskId` in dry_run scope and report the resulting facts. */
export async function applyDryRunState(page: Page, taskId: string, parts: DryRunParts): Promise<DryRunFacts> {
  return page.evaluate(
    ({ task, doReview, arbitrate }) => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      const outKeys = ['single_label'];
      const runType = 'dry_run';
      const reviewerId = 'reviewer_wang';
      const arbiterId = 'reviewer_chen';

      if (doReview) {
        ws.listReviewUnits(task, runType).forEach((unit: any) => {
          if (unit.status !== 'pending' && unit.status !== null) return;
          const identity = { annotatorId: unit.annotatorId };
          let annotatorAnswers = ws.getSubmission(task, 'annotator', runType, unit.sampleId, identity);
          if (!annotatorAnswers) {
            const row = ws
              .getReviewUnitRows(task, runType, unit.sampleId, outKeys)
              .filter((r: any) => r.annotator === unit.annotatorId)[0];
            annotatorAnswers = { previewState: { single_label: { selected: row.answers.single_label } } };
            ws.markSampleSubmitted(task, 'annotator', runType, unit.sampleId, annotatorAnswers, '', identity);
          }
          const selected = annotatorAnswers.previewState.single_label.selected;
          ws.markSampleSubmitted(
            task, 'reviewer', runType, unit.sampleId,
            { previewState: { single_label: { selected } }, decisions: { single_label: 'approve' } },
            '', { annotatorId: unit.annotatorId, reviewerId },
          );
        });
      }

      if (arbitrate !== 'none') {
        let first = true;
        ws.listReviewUnits(task, runType).forEach((unit: any) => {
          if (unit.status !== 'disputed') return;
          const identity = { annotatorId: unit.annotatorId };
          ws.getDisputeItems(task, runType, unit.sampleId, identity, outKeys).forEach((item: any) => {
            const itemId = `${item.outKey}::${item.key}`;
            const wantsReject = first && arbitrate !== 'all';
            first = false;
            ws.submitArbitration(task, runType, unit.sampleId, { annotatorId: unit.annotatorId, reviewerId: arbiterId }, [
              wantsReject
                ? { itemId, choice: 'reject', reason: 'QA fixture: neither value is supported' }
                : { itemId, choice: 'adopt_a', value: item.annotatorValue, reason: 'QA fixture: adopt the annotator value' },
            ]);
            if (wantsReject && arbitrate === 'all-but-one-excluded') {
              ws.resolveExceptionPoolItem(
                task, runType, unit.sampleId, identity, item.outKey,
                'exclude_from_dataset', undefined, 'QA fixture: excluded from dataset',
              );
            }
          });
        });
      }

      const byStatus: Record<string, number> = {};
      ws.listReviewUnits(task, runType).forEach((u: any) => {
        byStatus[String(u.status)] = (byStatus[String(u.status)] || 0) + 1;
      });
      const pool = ws.listReviewPoolItems(task, runType);
      return {
        byStatus,
        awaitingArbitration: pool.awaitingArbitration.length,
        pendingExceptions: pool.pendingExceptions.length,
      };
    },
    { task: taskId, doReview: !!parts.review, arbitrate: parts.arbitrate || 'none' },
  );
}

/** Stamp the dry-run progress flag the workspace page writes once every sample is submitted. */
export async function writeFullySubmittedFlag(page: Page, taskId: string, samples: number, round = 1) {
  await page.evaluate(
    ({ key, task, total, r }) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({ runType: 'dry_run', taskId: task, round: r, submittedSamples: total, totalSamples: total }),
      ),
    { key: DRY_RUN_PROGRESS_KEY, task: taskId, total: samples, r: round },
  );
}

/**
 * Open `taskId` once (this also runs the review-flow demo seed), apply `parts`, stamp the
 * fully-submitted flag and reload, so the page's init-time gate sees the final state.
 */
export async function openWithState(page: Page, taskId: string, samples: number, parts: DryRunParts = {}) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await expect(page.locator('#statusBadge')).toBeAttached();
  const facts = await applyDryRunState(page, taskId, parts);
  await writeFullySubmittedFlag(page, taskId, samples);
  await page.reload();
  await expect(page.locator('#statusBadge')).toBeAttached();
  return facts;
}

export async function reasonTexts(page: Page): Promise<string[]> {
  return page.locator('#publishActionRow li').allInnerTexts();
}

export function digit(n: number) {
  return new RegExp(`(^|\\D)${n}(\\D|$)`);
}

export function pick(texts: string[], accept: RegExp, reject?: RegExp) {
  return texts.filter((t) => accept.test(t) && !(reject && reject.test(t)));
}

/*
 * Reason categories are told apart by keyword only (structure pinned, WORDING is not):
 *   review   = /審核/ without 爭議/仲裁/例外池          (待審核, count + 單位)
 *   disputed = /爭議|仲裁/ without 例外池              (待仲裁 / 爭議中, count + 單位|項)
 *   pool     = /例外池/                               (count + 項)
 */
export const REVIEW = { accept: /審核/, reject: /爭議|仲裁|例外池/ };
export const DISPUTED = { accept: /爭議|仲裁/, reject: /例外池/ };
export const POOL = { accept: /例外池/ };

export async function persistedStatus(page: Page, taskId: string) {
  return page.evaluate(
    ([key, id]) => {
      const all = JSON.parse(window.localStorage.getItem(key as string) || '{}');
      return all[id as string] ? all[id as string].status : null;
    },
    [TRIAL_RUN_STATE_KEY, taskId],
  );
}

/** The gate stays closed: still in progress, nothing persisted as waiting_iaa_confirmation. */
export async function expectStillInProgress(page: Page, taskId: string) {
  await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  expect(await persistedStatus(page, taskId)).not.toBe('waiting_iaa_confirmation');
}

/** FR-008a / FR-010o-3: the new preconditions are never phrased as an IAA problem. */
export async function expectNoIaaPhrasing(page: Page) {
  for (const reason of await reasonTexts(page)) {
    expect(reason, `reason "${reason}" must not be phrased as an IAA problem`).not.toMatch(/IAA/i);
  }
}

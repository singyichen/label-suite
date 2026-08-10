/* annotation-workspace.data.js
 * Pure data helpers for the Annotation Workspace host page (spec 015
 * v2.0.0): TaskProfile resolution (task-list summary + task-detail
 * profile), Data Fairness row sanitization, and localStorage-backed
 * submission tracking. No DOM access -- this file only reads/writes
 * window.LabelSuiteTaskListData / window.LabelSuiteTaskDetailData /
 * window.localStorage and exposes window.LabelSuiteAnnotationWorkspaceData.
 *
 * Depends on (loaded before this file): task-list.data.js, task-detail.data.js.
 */
(function (global) {
  'use strict';

  var OUTPUT_ROLE = 'output';
  var SUBMISSION_STORAGE_KEY = 'labelsuite.wsSubmissions';
  /* Mirrors task-detail.html's own DRY_RUN_PROGRESS_KEY constant (that page
     owns the read side / status flip; this file owns the write side). */
  var DRY_RUN_PROGRESS_KEY = 'labelsuite.prototypeDryRunProgress';

  function findTaskListEntry(taskId) {
    var list = (global.LabelSuiteTaskListData && global.LabelSuiteTaskListData.tasks) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === taskId) return list[i];
    }
    return null;
  }

  function findTaskDetailProfile(taskId) {
    var profiles = (global.LabelSuiteTaskDetailData && global.LabelSuiteTaskDetailData.profiles) || {};
    return profiles[taskId] || null;
  }

  /* Resolve a full TaskProfile by task_id: merges the task-list summary
   * (display name) with the task-detail profile (outputs[], fieldRoleMap,
   * datasetRecords). Returns null when task_id doesn't exist in either
   * seed, so the host can redirect to the annotation list instead of
   * rendering a blank workspace (spec 015 v2.0.0 FR-004). */
  function resolveTaskProfile(taskId) {
    var listEntry = findTaskListEntry(taskId);
    var detail = findTaskDetailProfile(taskId);
    if (!listEntry || !detail) return null;
    return {
      id: taskId,
      nameZh: listEntry.nameZh,
      nameEn: listEntry.nameEn,
      outputs: detail.outputs || [],
      fieldRoleMap: detail.fieldRoleMap || {},
      datasetRecords: detail.datasetRecords || [],
      datasetFileName: detail.datasetFileName || '',
      taskInputTypes: detail.taskInputTypes || ['single_item'],
      itemPairLabels: detail.itemPairLabels || null,
      guidelineFiles: detail.guidelineFiles || [],
      materializedRuns: detail.materializedRuns || null,
    };
  }

  /* Data Fairness (constitution NON-NEGOTIABLE, FR-024M-1): before a
   * dataset record is assigned to the engine's state.datasetRawFirstRow
   * for annotator-facing rendering, keep ONLY fields explicitly mapped to
   * a non-output role in field_role_map. Unmapped fields are dropped too
   * (not just output-role ones) so engine readers that inspect literal
   * keys (initPreviewState's rawRow.entities/rawRow.triples) can never
   * pick up an unmapped answer column. Mapped output-role fields are
   * re-added by buildAnnotatorRecord (config.js) as creator-designated
   * annotator-visible preannotation per 013 FR-003g-5. Reviewer mode
   * reads the raw record separately for diff/comparison. */
  function sanitizeRecordForAnnotator(record, fieldRoleMap) {
    var sanitized = {};
    Object.keys(record || {}).forEach(function (key) {
      var role = fieldRoleMap ? fieldRoleMap[key] : undefined;
      if (!role || role === OUTPUT_ROLE) return;
      sanitized[key] = record[key];
    });
    return sanitized;
  }

  /*
   * Dataset record id-field names vary across seed profiles (id / ID /
   * article_id / ...). Resolve generically instead of assuming `record.id`
   * (mirrors annotation-list.html's own getRecordId).
   */
  function getRecordId(record, index) {
    if (!record) return String(index);
    if (record.id !== undefined && record.id !== null) return String(record.id);
    if (record.ID !== undefined && record.ID !== null) return String(record.ID);
    var idKey = Object.keys(record).filter(function (key) {
      return /_id$/i.test(key);
    })[0];
    if (idKey) return String(record[idKey]);
    return String(index);
  }

  /* First 'input'-role field's value, used as the sample-list snippet. */
  function getRecordPreviewText(record, fieldRoleMap) {
    var inputKey = Object.keys(fieldRoleMap || {}).find(function (key) {
      return fieldRoleMap[key] === 'input';
    });
    if (inputKey && record && record[inputKey] != null) return String(record[inputKey]);
    return record && record.id != null ? String(record.id) : '';
  }

  function readSubmissionStore() {
    try {
      var raw = global.localStorage.getItem(SUBMISSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeSubmissionStore(store) {
    try {
      global.localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      /* ignore quota/serialization errors in the prototype */
    }
  }

  /* Buckets are scoped per run_type as well: a dry_run submission must
   * never mark the same sample as done in official_run (and vice versa) --
   * mirrors annotation-list.html's completionStateKey(role, taskId,
   * runType). */
  function submissionBucketKey(taskId, role, runType) {
    return taskId + '::' + role + '::' + runType;
  }

  function readSampleEntry(taskId, role, runType, sampleId) {
    var store = readSubmissionStore();
    var bucket = store[submissionBucketKey(taskId, role, runType)];
    return (bucket && bucket[sampleId]) || null;
  }

  /* Entries written before the saved-draft feature carry no status field;
     they were only ever written by markSampleSubmitted, so a missing
     status means 'submitted'. */
  function entryStatus(entry) {
    if (!entry) return 'pending';
    return entry.status === 'saved' ? 'saved' : 'submitted';
  }

  function isSampleSubmitted(taskId, role, runType, sampleId) {
    return entryStatus(readSampleEntry(taskId, role, runType, sampleId)) === 'submitted';
  }

  /* Per-sample tri-state for annotation-list rows / filtering (FR-007B)
     and the quick-continue latest-unfinished rule (FR-004B). */
  function getSampleStatus(taskId, role, runType, sampleId) {
    return entryStatus(readSampleEntry(taskId, role, runType, sampleId));
  }

  function getSampleSubmittedAt(taskId, role, runType, sampleId) {
    var entry = readSampleEntry(taskId, role, runType, sampleId);
    return entryStatus(entry) === 'submitted' ? entry.submittedAt || null : null;
  }

  /* Per-sample history events (FR-016 / AC-3.8): every save/submit appends
     {action, role, at, summary} onto the entry, so the right-column 歷程
     tab can trace who did what and when. `summary` is the host-provided
     per-output description (對應輸出類型 + 修改內容). */
  function appendHistoryEvent(entry, action, role, summary) {
    if (!Array.isArray(entry.history)) entry.history = [];
    entry.history.push({
      action: action,
      role: role,
      at: new Date().toISOString(),
      summary: summary || '',
    });
  }

  function markSampleSubmitted(taskId, role, runType, sampleId, payload, historySummary) {
    var store = readSubmissionStore();
    var key = submissionBucketKey(taskId, role, runType);
    if (!store[key]) store[key] = {};
    var existing = store[key][sampleId];
    var entry = { status: 'submitted', submittedAt: new Date().toISOString(), answers: payload || {} };
    if (existing && Array.isArray(existing.history)) entry.history = existing.history;
    appendHistoryEvent(entry, 'submitted', role, historySummary);
    store[key][sampleId] = entry;
    writeSubmissionStore(store);
  }

  /* Draft save (AC-2.3 / FR-013). Saving never downgrades an
     already-submitted sample back to 'saved' -- the submission stands and
     only its answers are refreshed (spec 015 has no un-submit transition);
     pending samples become 'saved'. */
  function markSampleSaved(taskId, role, runType, sampleId, payload, historySummary) {
    var store = readSubmissionStore();
    var key = submissionBucketKey(taskId, role, runType);
    if (!store[key]) store[key] = {};
    var existing = store[key][sampleId];
    if (existing && entryStatus(existing) === 'submitted') {
      existing.answers = payload || {};
      existing.savedAt = new Date().toISOString();
      appendHistoryEvent(existing, 'saved', role, historySummary);
    } else {
      var entry = { status: 'saved', savedAt: new Date().toISOString(), answers: payload || {} };
      if (existing && Array.isArray(existing.history)) entry.history = existing.history;
      appendHistoryEvent(entry, 'saved', role, historySummary);
      store[key][sampleId] = entry;
    }
    writeSubmissionStore(store);
  }

  /* Reviewer mode (Phase 3, FR-024L-1) reads back the annotator's own
   * submitted OutputAnswer payload -- keyed the same task/sample/role/run
   * way markSampleSubmitted wrote it -- to seed the row-level correction
   * control. Returns null when no submission exists yet for that sample. */
  function getSubmission(taskId, role, runType, sampleId) {
    var entry = readSampleEntry(taskId, role, runType, sampleId);
    return entry && entryStatus(entry) === 'submitted' ? entry.answers : null;
  }

  /* Annotator revisit restore (FR-026): a saved draft's answers count too,
     unlike getSubmission which is submitted-only (reviewers must never see
     drafts). */
  function getSampleAnswers(taskId, role, runType, sampleId) {
    var entry = readSampleEntry(taskId, role, runType, sampleId);
    return entry ? entry.answers : null;
  }

  /* Full traceability view for one sample: merges the annotator's and the
     reviewer's history events (they live in separate role buckets) into a
     single chronological list, so the 歷程 tab shows the complete chain
     regardless of which role is looking at it (AC-3.8). */
  function getSampleHistory(taskId, runType, sampleId) {
    var merged = [];
    ['annotator', 'reviewer'].forEach(function (role) {
      var entry = readSampleEntry(taskId, role, runType, sampleId);
      if (entry && Array.isArray(entry.history)) merged = merged.concat(entry.history);
    });
    merged.sort(function (a, b) {
      return String(a.at).localeCompare(String(b.at));
    });
    return merged;
  }

  function getSubmittedSampleCount(taskId, role, runType) {
    var store = readSubmissionStore();
    var bucket = store[submissionBucketKey(taskId, role, runType)];
    if (!bucket) return 0;
    return Object.keys(bucket).filter(function (sampleId) {
      return entryStatus(bucket[sampleId]) === 'submitted';
    }).length;
  }

  /* Bridges the workspace's per-sample submission tracking to
   * task-detail.html's dry-run completion status sync (that page's
   * syncStatusFromDryRunProgress() reads DRY_RUN_PROGRESS_KEY and flips the
   * task status to 'waiting_iaa_confirmation' once every dataset record has
   * been submitted). Annotator-only, dry_run-only -- reviewer decisions and
   * official_run submissions never drive this status transition. */
  function syncDryRunProgress(taskId, role, runType, totalSamples) {
    if (runType !== 'dry_run' || role !== 'annotator') return;
    var submitted = getSubmittedSampleCount(taskId, role, runType);
    try {
      global.localStorage.setItem(
        DRY_RUN_PROGRESS_KEY,
        JSON.stringify({
          runType: 'dry_run',
          taskId: taskId,
          submittedSamples: submitted,
          totalSamples: totalSamples,
        })
      );
    } catch (e) {
      /* ignore quota/serialization errors in the prototype */
    }
  }

  global.LabelSuiteAnnotationWorkspaceData = {
    resolveTaskProfile: resolveTaskProfile,
    sanitizeRecordForAnnotator: sanitizeRecordForAnnotator,
    getRecordId: getRecordId,
    getRecordPreviewText: getRecordPreviewText,
    isSampleSubmitted: isSampleSubmitted,
    getSampleStatus: getSampleStatus,
    getSampleSubmittedAt: getSampleSubmittedAt,
    markSampleSubmitted: markSampleSubmitted,
    markSampleSaved: markSampleSaved,
    getSubmission: getSubmission,
    getSampleAnswers: getSampleAnswers,
    getSampleHistory: getSampleHistory,
    getSubmittedSampleCount: getSubmittedSampleCount,
    syncDryRunProgress: syncDryRunProgress,
  };
})(window);

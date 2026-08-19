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
      /* issue #184: task-detail overview's "開始標記前強制顯示" toggle
         (task-detail.panels/overview.html #editForceGuidelineToggle) --
         gates the workspace's first-visit guideline modal. Defaults to
         false so tasks that never set it keep today's no-gate behavior. */
      forceShowGuideline: detail.forceShowGuideline || false,
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

  /* ── Review identity (v3.8.0, FR-049) ─────────────────────────────────
   * Prototype demo roster, same standing as REVIEWER_MOCK_ROWS: the backend
   * replaces it with real accounts. The default annotator IS the first
   * annotator of every REVIEWER_MOCK_ROWS[taskId][sampleId] group, so a
   * visitor's own submission and the FR-044a demo fallback belong to the
   * same person and the review trail stays one continuous chain instead of
   * splitting across two ids. */
  var DEFAULT_ANNOTATOR_ID = 'kioleemg12';
  var REVIEWER_ROSTER = [
    { id: 'reviewer_wang', name: '王小明' },
    { id: 'reviewer_li', name: '李大華' },
    { id: 'reviewer_chen', name: '陳美玲', can_arbitrate: true },
  ];
  var DEFAULT_REVIEWER_ID = REVIEWER_ROSTER[0].id;
  /* Annotator buckets have no reviewer dimension; a literal placeholder keeps
   * every key the same arity so prefix matching in getSampleHistory is exact. */
  var NO_REVIEWER = '-';

  /* Both pages resolve identity from the same query params so a list row and
   * the workspace it opens always address the same bucket (FR-049). */
  function resolveIdentity(params) {
    return {
      annotatorId: (params && params.get('annotator_id')) || DEFAULT_ANNOTATOR_ID,
      reviewerId: (params && params.get('reviewer_id')) || DEFAULT_REVIEWER_ID,
    };
  }

  /* Who performed an action, as opposed to which bucket holds it: a reviewer
   * rejecting a sample writes into the ANNOTATOR's bucket (markSampleRejected)
   * while the event's actor is still the reviewer. */
  function actorIdFor(role, identity) {
    identity = identity || {};
    return role === 'reviewer'
      ? identity.reviewerId || DEFAULT_REVIEWER_ID
      : identity.annotatorId || DEFAULT_ANNOTATOR_ID;
  }

  /* Buckets are scoped per run_type as well: a dry_run submission must
   * never mark the same sample as done in official_run (and vice versa) --
   * mirrors annotation-list.html's completionStateKey(role, taskId,
   * runType). v3.8.0 adds the identity dimensions (FR-049): one sample × one
   * annotator × one reviewer is one bucket, so two reviewers auditing the
   * same annotator's answer can no longer overwrite each other. */
  function submissionBucketKey(taskId, role, runType, identity) {
    identity = identity || {};
    var annotatorId = identity.annotatorId || DEFAULT_ANNOTATOR_ID;
    var reviewerId = role === 'reviewer' ? identity.reviewerId || DEFAULT_REVIEWER_ID : NO_REVIEWER;
    return taskId + '::' + role + '::' + runType + '::' + annotatorId + '::' + reviewerId;
  }

  function readSampleEntry(taskId, role, runType, sampleId, identity) {
    var store = readSubmissionStore();
    var bucket = store[submissionBucketKey(taskId, role, runType, identity)];
    return (bucket && bucket[sampleId]) || null;
  }

  /* Entries written before the saved-draft feature carry no status field;
     they were only ever written by markSampleSubmitted, so a missing
     status means 'submitted'. Rejected entries are explicitly demoted to
     'pending' by markSampleRejected while keeping their answers. */
  function entryStatus(entry) {
    if (!entry) return 'pending';
    if (entry.status === 'pending' || entry.status === 'saved') return entry.status;
    return 'submitted';
  }

  function isSampleSubmitted(taskId, role, runType, sampleId, identity) {
    return entryStatus(readSampleEntry(taskId, role, runType, sampleId, identity)) === 'submitted';
  }

  /* Per-sample tri-state for annotation-list rows / filtering (FR-007B)
     and the quick-continue latest-unfinished rule (FR-004B). */
  function getSampleStatus(taskId, role, runType, sampleId, identity) {
    return entryStatus(readSampleEntry(taskId, role, runType, sampleId, identity));
  }

  function getSampleSubmittedAt(taskId, role, runType, sampleId, identity) {
    var entry = readSampleEntry(taskId, role, runType, sampleId, identity);
    return entryStatus(entry) === 'submitted' ? entry.submittedAt || null : null;
  }

  /* Per-sample history events (FR-016 / AC-3.8): every save/submit appends
     {action, role, actorId, at, summary} onto the entry, so the right-column
     歷程 tab can trace who did what and when. v3.8.0 adds `actorId` (FR-050):
     `role` alone answers "a reviewer did this", not "which reviewer".
     `summary` is the host-provided per-output description (對應輸出類型 +
     修改內容). */
  function appendHistoryEvent(entry, action, role, summary, actorId) {
    if (!Array.isArray(entry.history)) entry.history = [];
    entry.history.push({
      action: action,
      role: role,
      actorId: actorId || null,
      at: new Date().toISOString(),
      summary: summary || '',
    });
  }

  function markSampleSubmitted(taskId, role, runType, sampleId, payload, historySummary, identity) {
    var store = readSubmissionStore();
    var key = submissionBucketKey(taskId, role, runType, identity);
    if (!store[key]) store[key] = {};
    var existing = store[key][sampleId];
    var entry = { status: 'submitted', submittedAt: new Date().toISOString(), answers: payload || {} };
    if (existing && Array.isArray(existing.history)) entry.history = existing.history;
    appendHistoryEvent(entry, 'submitted', role, historySummary, actorIdFor(role, identity));
    store[key][sampleId] = entry;
    writeSubmissionStore(store);
  }

  /* Draft save (AC-2.3 / FR-013). Saving never downgrades an
     already-submitted sample back to 'saved' -- the submission stands and
     only its answers are refreshed (spec 015 has no un-submit transition);
     pending samples become 'saved'. */
  function markSampleSaved(taskId, role, runType, sampleId, payload, historySummary, identity) {
    var store = readSubmissionStore();
    var key = submissionBucketKey(taskId, role, runType, identity);
    if (!store[key]) store[key] = {};
    var existing = store[key][sampleId];
    var actorId = actorIdFor(role, identity);
    if (existing && entryStatus(existing) === 'submitted') {
      existing.answers = payload || {};
      existing.savedAt = new Date().toISOString();
      appendHistoryEvent(existing, 'saved', role, historySummary, actorId);
    } else {
      var entry = { status: 'saved', savedAt: new Date().toISOString(), answers: payload || {} };
      if (existing && Array.isArray(existing.history)) entry.history = existing.history;
      appendHistoryEvent(entry, 'saved', role, historySummary, actorId);
      store[key][sampleId] = entry;
    }
    writeSubmissionStore(store);
  }

  /* Reviewer mode (Phase 3, FR-024L-1) reads back the annotator's own
   * submitted OutputAnswer payload -- keyed the same task/sample/role/run
   * way markSampleSubmitted wrote it -- to seed the row-level correction
   * control. Returns null when no submission exists yet for that sample. */
  function getSubmission(taskId, role, runType, sampleId, identity) {
    var entry = readSampleEntry(taskId, role, runType, sampleId, identity);
    return entry && entryStatus(entry) === 'submitted' ? entry.answers : null;
  }

  /* Annotator revisit restore (FR-026): a saved draft's answers count too,
     unlike getSubmission which is submitted-only (reviewers must never see
     drafts). */
  function getSampleAnswers(taskId, role, runType, sampleId, identity) {
    var entry = readSampleEntry(taskId, role, runType, sampleId, identity);
    return entry ? entry.answers : null;
  }

  /* Full traceability view for one annotation: the annotator's own bucket
     plus EVERY reviewer bucket that audited that annotator, merged into one
     chronological list (AC-3.8, and v3.8.0's AC-4.8 標記員 → 審核員 →
     仲裁 trail). Scanning by prefix rather than reading one known reviewer
     bucket is what makes the trail complete under 一式 N 份 -- with the
     reviewer id now in the key, reading only the current reviewer's bucket
     would hide every peer's decision. `identity.reviewerId` is deliberately
     NOT part of the filter here. */
  function reviewerBucketPrefix(taskId, runType, identity) {
    var annotatorId = (identity && identity.annotatorId) || DEFAULT_ANNOTATOR_ID;
    return taskId + '::reviewer::' + runType + '::' + annotatorId + '::';
  }

  function getSampleHistory(taskId, runType, sampleId, identity) {
    var store = readSubmissionStore();
    var annotatorKey = submissionBucketKey(taskId, 'annotator', runType, identity);
    var reviewerPrefix = reviewerBucketPrefix(taskId, runType, identity);
    var merged = [];
    Object.keys(store).forEach(function (key) {
      if (key !== annotatorKey && key.indexOf(reviewerPrefix) !== 0) return;
      var entry = store[key][sampleId];
      if (entry && Array.isArray(entry.history)) merged = merged.concat(entry.history);
    });
    merged.sort(function (a, b) {
      return String(a.at).localeCompare(String(b.at));
    });
    return merged;
  }

  function getSubmittedSampleCount(taskId, role, runType, identity) {
    var store = readSubmissionStore();
    var bucket = store[submissionBucketKey(taskId, role, runType, identity)];
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
  function syncDryRunProgress(taskId, role, runType, totalSamples, identity) {
    if (runType !== 'dry_run' || role !== 'annotator') return;
    var submitted = getSubmittedSampleCount(taskId, role, runType, identity);
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

  /* Reviewer rejection: sends a sample back to the annotator for revision.
   * Unlike markSampleSubmitted, this never leaves the sample in a
   * 'submitted' state -- it flips status back to 'pending' while KEEPING
   * the existing answers (so the annotator revises rather than re-labels
   * from scratch), and appends a 'rejected' history event so the 歷程 tab
   * shows the reviewer's action. The bucket addressed by (taskId, role,
   * runType) is whichever bucket is being rejected (normally the
   * annotator's); the history event's `role` is always 'reviewer' per the
   * reviewer aggregate review card's actor, regardless of which bucket is
   * being modified. Mirrors markSampleSaved/markSampleSubmitted's
   * read-modify-write shape; when no entry exists yet, a fresh
   * pending-status entry is created so the rejection is still traceable.
   * spec 015 AC-3.15/AC-6.4/FR-014I (issue #192): this rollback-to-pending
   * mechanism applies only to `run_type = official_run` -- `dry_run` has no
   * "退回個人重標" channel, so a dry_run reject decision must not touch the
   * annotator's submission status. */
  function markSampleRejected(taskId, role, runType, sampleId, historySummary, identity) {
    if (runType !== 'official_run') return;
    var store = readSubmissionStore();
    var key = submissionBucketKey(taskId, role, runType, identity);
    if (!store[key]) store[key] = {};
    var existing = store[key][sampleId];
    var actorId = actorIdFor('reviewer', identity);
    if (existing) {
      existing.status = 'pending';
      appendHistoryEvent(existing, 'rejected', 'reviewer', historySummary, actorId);
    } else {
      var entry = { status: 'pending', answers: {} };
      appendHistoryEvent(entry, 'rejected', 'reviewer', historySummary, actorId);
      store[key][sampleId] = entry;
    }
    writeSubmissionStore(store);
  }

  /* Reviewer aggregate review mock data (restores the legacy per-output-type
   * review card: label-distribution stats + bulk 全部通過/全部退回 + one row
   * per annotator). Keyed taskId -> sampleId -> row[], three fixed
   * annotators per sample in a stable order. Each row's `answers` map uses
   * the CompactAnswer shape per output type -- this is a FIXED CONTRACT
   * relied on by other consumers of this file:
   *   single_label            -> string (label value)
   *   multi_label             -> string[] (leaf label names)
   *   single_dim               -> number
   *   multi_dim                -> { [dimName]: number }
   *   sequence_tagging          -> Array<{text, tag}> (non-O tokens only)
   *   entity_recognition        -> Array<{text, type}>
   *   relation_identification   -> Array<{subj, rel, obj}>
   *   free_text                 -> string
   * Values are derived from each TaskProfile's gold answer (task-detail.
   * data.js) with at least one disagreeing annotator per task, and one
   * bypassed output (T003 taxonomy-004, tony0950127 skips multi_label) to
   * exercise the bypass pill. PINNED FIXTURE: T001 sent-001's three answers
   * are relied on by a test -- do not change them. */
  var REVIEWER_MOCK_ROWS = {
    T001: {
      'sent-001': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } },
        { annotator: '113450022', answers: { single_label: 'negative' } },
        { annotator: 'tony0950127', answers: { single_label: 'positive' } }
      ],
      'sent-002': [
        { annotator: 'kioleemg12', answers: { single_label: 'negative' } },
        { annotator: '113450022', answers: { single_label: 'negative' } },
        { annotator: 'tony0950127', answers: { single_label: 'negative' } }
      ],
      'sent-003': [
        { annotator: 'kioleemg12', answers: { single_label: 'neutral' } },
        { annotator: '113450022', answers: { single_label: 'neutral' } },
        { annotator: 'tony0950127', answers: { single_label: 'neutral' } }
      ],
      'sent-004': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } },
        { annotator: '113450022', answers: { single_label: 'positive' } },
        { annotator: 'tony0950127', answers: { single_label: 'positive' } }
      ],
      'sent-005': [
        { annotator: 'kioleemg12', answers: { single_label: 'negative' } },
        { annotator: '113450022', answers: { single_label: 'negative' } },
        { annotator: 'tony0950127', answers: { single_label: 'negative' } }
      ]
    },

    T002: {
      'emo-001': [
        { annotator: 'kioleemg12', answers: { multi_label: ['sad', 'fear', 'surprise'] } },
        { annotator: '113450022', answers: { multi_label: ['sad', 'fear', 'surprise'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['sad', 'fear'] } }
      ],
      'emo-002': [
        { annotator: 'kioleemg12', answers: { multi_label: ['happy', 'surprise'] } },
        { annotator: '113450022', answers: { multi_label: ['happy', 'surprise'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['happy', 'surprise'] } }
      ],
      'emo-003': [
        { annotator: 'kioleemg12', answers: { multi_label: ['angry', 'sad'] } },
        { annotator: '113450022', answers: { multi_label: ['angry', 'sad'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['angry', 'sad'] } }
      ],
      'emo-004': [
        { annotator: 'kioleemg12', answers: { multi_label: ['sad'] } },
        { annotator: '113450022', answers: { multi_label: ['sad'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['sad'] } }
      ],
      'emo-005': [
        { annotator: 'kioleemg12', answers: { multi_label: ['fear'] } },
        { annotator: '113450022', answers: { multi_label: ['fear'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['fear'] } }
      ]
    },

    T003: {
      'taxonomy-001': [
        { annotator: 'kioleemg12', answers: { multi_label: ['sad', 'urgent'] } },
        { annotator: '113450022', answers: { multi_label: ['sad', 'urgent'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['sad', 'urgent'] } }
      ],
      'taxonomy-002': [
        { annotator: 'kioleemg12', answers: { multi_label: ['hopeful', 'follow_up'] } },
        { annotator: '113450022', answers: { multi_label: ['hopeful', 'follow_up'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['hopeful', 'follow_up'] } }
      ],
      'taxonomy-003': [
        { annotator: 'kioleemg12', answers: { multi_label: ['anxious', 'needs_explanation'] } },
        { annotator: '113450022', answers: { multi_label: ['anxious', 'needs_explanation'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['anxious'] } }
      ],
      'taxonomy-004': [
        { annotator: 'kioleemg12', answers: { multi_label: [] } },
        { annotator: '113450022', answers: { multi_label: [] } },
        { annotator: 'tony0950127', answers: {}, bypass: { multi_label: true } }
      ],
      'taxonomy-005': [
        { annotator: 'kioleemg12', answers: { multi_label: ['sad', 'needs_explanation'] } },
        { annotator: '113450022', answers: { multi_label: ['sad', 'needs_explanation'] } },
        { annotator: 'tony0950127', answers: { multi_label: ['sad', 'needs_explanation'] } }
      ]
    },

    T004: {
      'read-001': [
        { annotator: 'kioleemg12', answers: { single_dim: 4 } },
        { annotator: '113450022', answers: { single_dim: 4 } },
        { annotator: 'tony0950127', answers: { single_dim: 3 } }
      ],
      'read-002': [
        { annotator: 'kioleemg12', answers: { single_dim: 1 } },
        { annotator: '113450022', answers: { single_dim: 1 } },
        { annotator: 'tony0950127', answers: { single_dim: 1 } }
      ],
      'read-003': [
        { annotator: 'kioleemg12', answers: { single_dim: 5 } },
        { annotator: '113450022', answers: { single_dim: 5 } },
        { annotator: 'tony0950127', answers: { single_dim: 5 } }
      ],
      'read-004': [
        { annotator: 'kioleemg12', answers: { single_dim: 4 } },
        { annotator: '113450022', answers: { single_dim: 4 } },
        { annotator: 'tony0950127', answers: { single_dim: 4 } }
      ],
      'read-005': [
        { annotator: 'kioleemg12', answers: { single_dim: 1 } },
        { annotator: '113450022', answers: { single_dim: 1 } },
        { annotator: 'tony0950127', answers: { single_dim: 1 } }
      ]
    },

    T005: {
      'mt-001': [
        { annotator: 'kioleemg12', answers: { multi_dim: { fluency: 5, adequacy: 5, coherence: 5 } } },
        { annotator: '113450022', answers: { multi_dim: { fluency: 5, adequacy: 5, coherence: 5 } } },
        { annotator: 'tony0950127', answers: { multi_dim: { fluency: 5, adequacy: 5, coherence: 5 } } }
      ],
      'mt-002': [
        { annotator: 'kioleemg12', answers: { multi_dim: { fluency: 3, adequacy: 4, coherence: 3 } } },
        { annotator: '113450022', answers: { multi_dim: { fluency: 3, adequacy: 4, coherence: 3 } } },
        { annotator: 'tony0950127', answers: { multi_dim: { fluency: 4, adequacy: 4, coherence: 3 } } }
      ],
      'mt-003': [
        { annotator: 'kioleemg12', answers: { multi_dim: { fluency: 5, adequacy: 5, coherence: 5 } } },
        { annotator: '113450022', answers: { multi_dim: { fluency: 5, adequacy: 5, coherence: 5 } } },
        { annotator: 'tony0950127', answers: { multi_dim: { fluency: 5, adequacy: 5, coherence: 5 } } }
      ],
      'mt-004': [
        { annotator: 'kioleemg12', answers: { multi_dim: { fluency: 4, adequacy: 5, coherence: 4 } } },
        { annotator: '113450022', answers: { multi_dim: { fluency: 4, adequacy: 5, coherence: 4 } } },
        { annotator: 'tony0950127', answers: { multi_dim: { fluency: 4, adequacy: 5, coherence: 4 } } }
      ],
      'mt-005': [
        { annotator: 'kioleemg12', answers: { multi_dim: { fluency: 5, adequacy: 4, coherence: 5 } } },
        { annotator: '113450022', answers: { multi_dim: { fluency: 5, adequacy: 4, coherence: 5 } } },
        { annotator: 'tony0950127', answers: { multi_dim: { fluency: 5, adequacy: 4, coherence: 5 } } }
      ]
    },

    T006: {
      'sequence-tagging-001': [
        {
          annotator: 'kioleemg12',
          answers: {
            sequence_tagging: [
              { text: '台', tag: 'B-ORG' }, { text: '積', tag: 'I-ORG' }, { text: '電', tag: 'I-ORG' },
              { text: '魏', tag: 'B-PER' }, { text: '哲', tag: 'I-PER' }, { text: '家', tag: 'I-PER' },
              { text: '今', tag: 'B-TIME' }, { text: '天', tag: 'I-TIME' },
              { text: '台', tag: 'B-LOC' }, { text: '北', tag: 'I-LOC' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: '台', tag: 'B-ORG' }, { text: '積', tag: 'I-ORG' }, { text: '電', tag: 'I-ORG' },
              { text: '魏', tag: 'B-PER' }, { text: '哲', tag: 'I-PER' }, { text: '家', tag: 'I-PER' },
              { text: '今', tag: 'B-TIME' }, { text: '天', tag: 'I-TIME' },
              { text: '台', tag: 'B-LOC' }, { text: '北', tag: 'I-LOC' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            sequence_tagging: [
              { text: '台', tag: 'B-ORG' }, { text: '積', tag: 'I-ORG' }, { text: '電', tag: 'I-ORG' },
              { text: '魏', tag: 'B-PER' }, { text: '哲', tag: 'I-PER' }, { text: '家', tag: 'I-PER' },
              { text: '今', tag: 'B-TIME' }, { text: '天', tag: 'I-TIME' },
              { text: '台', tag: 'B-LOC' }, { text: '北', tag: 'I-LOC' }
            ]
          }
        }
      ],
      'sequence-tagging-002': [
        {
          annotator: 'kioleemg12',
          answers: {
            sequence_tagging: [
              { text: '衛', tag: 'B-ORG' }, { text: '福', tag: 'I-ORG' }, { text: '部', tag: 'I-ORG' },
              { text: '薛', tag: 'B-PER' }, { text: '瑞', tag: 'I-PER' }, { text: '元', tag: 'I-PER' },
              { text: '三', tag: 'B-TIME' }, { text: '月', tag: 'I-TIME' }, { text: '十', tag: 'I-TIME' },
              { text: '五', tag: 'I-TIME' }, { text: '日', tag: 'I-TIME' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: '衛', tag: 'B-ORG' }, { text: '福', tag: 'I-ORG' }, { text: '部', tag: 'I-ORG' },
              { text: '薛', tag: 'B-PER' }, { text: '瑞', tag: 'I-PER' }, { text: '元', tag: 'I-PER' },
              { text: '三', tag: 'B-TIME' }, { text: '月', tag: 'I-TIME' }, { text: '十', tag: 'I-TIME' },
              { text: '五', tag: 'I-TIME' }, { text: '日', tag: 'I-TIME' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            /* Disagreement: drops the trailing '日' token of the TIME span. */
            sequence_tagging: [
              { text: '衛', tag: 'B-ORG' }, { text: '福', tag: 'I-ORG' }, { text: '部', tag: 'I-ORG' },
              { text: '薛', tag: 'B-PER' }, { text: '瑞', tag: 'I-PER' }, { text: '元', tag: 'I-PER' },
              { text: '三', tag: 'B-TIME' }, { text: '月', tag: 'I-TIME' }, { text: '十', tag: 'I-TIME' },
              { text: '五', tag: 'I-TIME' }
            ]
          }
        }
      ],
      'sequence-tagging-003': [
        {
          annotator: 'kioleemg12',
          answers: {
            sequence_tagging: [
              { text: '長', tag: 'B-ORG' }, { text: '庚', tag: 'I-ORG' }, { text: '醫', tag: 'I-ORG' }, { text: '院', tag: 'I-ORG' },
              { text: '陳', tag: 'B-PER' }, { text: '日', tag: 'I-PER' }, { text: '昌', tag: 'I-PER' },
              { text: '桃', tag: 'B-LOC' }, { text: '園', tag: 'I-LOC' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: '長', tag: 'B-ORG' }, { text: '庚', tag: 'I-ORG' }, { text: '醫', tag: 'I-ORG' }, { text: '院', tag: 'I-ORG' },
              { text: '陳', tag: 'B-PER' }, { text: '日', tag: 'I-PER' }, { text: '昌', tag: 'I-PER' },
              { text: '桃', tag: 'B-LOC' }, { text: '園', tag: 'I-LOC' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            sequence_tagging: [
              { text: '長', tag: 'B-ORG' }, { text: '庚', tag: 'I-ORG' }, { text: '醫', tag: 'I-ORG' }, { text: '院', tag: 'I-ORG' },
              { text: '陳', tag: 'B-PER' }, { text: '日', tag: 'I-PER' }, { text: '昌', tag: 'I-PER' },
              { text: '桃', tag: 'B-LOC' }, { text: '園', tag: 'I-LOC' }
            ]
          }
        }
      ],
      'sequence-tagging-004': [
        {
          annotator: 'kioleemg12',
          answers: {
            sequence_tagging: [
              { text: 'T', tag: 'B-ORG' }, { text: 'S', tag: 'I-ORG' }, { text: 'M', tag: 'I-ORG' }, { text: 'C', tag: 'I-ORG' },
              { text: 'T', tag: 'B-LOC' }, { text: 'a', tag: 'I-LOC' }, { text: 'i', tag: 'I-LOC' }, { text: 'p', tag: 'I-LOC' },
              { text: 'e', tag: 'I-LOC' }, { text: 'i', tag: 'I-LOC' },
              { text: 't', tag: 'B-TIME' }, { text: 'o', tag: 'I-TIME' }, { text: 'd', tag: 'I-TIME' }, { text: 'a', tag: 'I-TIME' }, { text: 'y', tag: 'I-TIME' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: 'T', tag: 'B-ORG' }, { text: 'S', tag: 'I-ORG' }, { text: 'M', tag: 'I-ORG' }, { text: 'C', tag: 'I-ORG' },
              { text: 'T', tag: 'B-LOC' }, { text: 'a', tag: 'I-LOC' }, { text: 'i', tag: 'I-LOC' }, { text: 'p', tag: 'I-LOC' },
              { text: 'e', tag: 'I-LOC' }, { text: 'i', tag: 'I-LOC' },
              { text: 't', tag: 'B-TIME' }, { text: 'o', tag: 'I-TIME' }, { text: 'd', tag: 'I-TIME' }, { text: 'a', tag: 'I-TIME' }, { text: 'y', tag: 'I-TIME' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            sequence_tagging: [
              { text: 'T', tag: 'B-ORG' }, { text: 'S', tag: 'I-ORG' }, { text: 'M', tag: 'I-ORG' }, { text: 'C', tag: 'I-ORG' },
              { text: 'T', tag: 'B-LOC' }, { text: 'a', tag: 'I-LOC' }, { text: 'i', tag: 'I-LOC' }, { text: 'p', tag: 'I-LOC' },
              { text: 'e', tag: 'I-LOC' }, { text: 'i', tag: 'I-LOC' },
              { text: 't', tag: 'B-TIME' }, { text: 'o', tag: 'I-TIME' }, { text: 'd', tag: 'I-TIME' }, { text: 'a', tag: 'I-TIME' }, { text: 'y', tag: 'I-TIME' }
            ]
          }
        }
      ]
    },

    T007: {
      'entity-recognition-001': [
        {
          annotator: 'kioleemg12',
          answers: {
            entity_recognition: [
              { text: '筆電', type: 'target' }, { text: '螢幕解析度', type: 'aspect' }, { text: '非常高', type: 'opinion' },
              { text: '色彩還原度', type: 'aspect' }, { text: '很好', type: 'opinion' },
              { text: '鍵盤手感', type: 'aspect' }, { text: '偏硬', type: 'opinion' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            entity_recognition: [
              { text: '筆電', type: 'target' }, { text: '螢幕解析度', type: 'aspect' }, { text: '非常高', type: 'opinion' },
              { text: '色彩還原度', type: 'aspect' }, { text: '很好', type: 'opinion' },
              { text: '鍵盤手感', type: 'aspect' }, { text: '偏硬', type: 'opinion' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            entity_recognition: [
              { text: '筆電', type: 'target' }, { text: '螢幕解析度', type: 'aspect' }, { text: '非常高', type: 'opinion' },
              { text: '色彩還原度', type: 'aspect' }, { text: '很好', type: 'opinion' },
              { text: '鍵盤手感', type: 'aspect' }, { text: '偏硬', type: 'opinion' }
            ]
          }
        }
      ],
      'entity-recognition-002': [
        {
          annotator: 'kioleemg12',
          answers: {
            entity_recognition: [
              { text: '飯店', type: 'target' }, { text: '地理位置', type: 'aspect' }, { text: '絕佳', type: 'opinion' },
              { text: '房間', type: 'target' }, { text: '隔音效果', type: 'aspect' }, { text: '差', type: 'opinion' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            entity_recognition: [
              { text: '飯店', type: 'target' }, { text: '地理位置', type: 'aspect' }, { text: '絕佳', type: 'opinion' },
              { text: '房間', type: 'target' }, { text: '隔音效果', type: 'aspect' }, { text: '差', type: 'opinion' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            /* Disagreement: misses the trailing 差/opinion entity. */
            entity_recognition: [
              { text: '飯店', type: 'target' }, { text: '地理位置', type: 'aspect' }, { text: '絕佳', type: 'opinion' },
              { text: '房間', type: 'target' }, { text: '隔音效果', type: 'aspect' }
            ]
          }
        }
      ],
      'entity-recognition-003': [
        {
          annotator: 'kioleemg12',
          answers: {
            entity_recognition: [
              { text: '餐廳', type: 'target' }, { text: '牛排', type: 'aspect' }, { text: '恰到好處', type: 'opinion' },
              { text: '服務速度', type: 'aspect' }, { text: '太慢', type: 'opinion' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            entity_recognition: [
              { text: '餐廳', type: 'target' }, { text: '牛排', type: 'aspect' }, { text: '恰到好處', type: 'opinion' },
              { text: '服務速度', type: 'aspect' }, { text: '太慢', type: 'opinion' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            entity_recognition: [
              { text: '餐廳', type: 'target' }, { text: '牛排', type: 'aspect' }, { text: '恰到好處', type: 'opinion' },
              { text: '服務速度', type: 'aspect' }, { text: '太慢', type: 'opinion' }
            ]
          }
        }
      ]
    },

    T008: {
      'rel-001': [
        {
          annotator: 'kioleemg12',
          answers: {
            relation_identification: [
              { subj: '高血壓', rel: 'causes', obj: '動脈硬化' },
              { subj: '動脈硬化', rel: 'causes', obj: '冠狀動脈心臟病' },
              { subj: '動脈硬化', rel: 'causes', obj: '腦中風' },
              { subj: 'Amlodipine', rel: 'treats', obj: '高血壓' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            relation_identification: [
              { subj: '高血壓', rel: 'causes', obj: '動脈硬化' },
              { subj: '動脈硬化', rel: 'causes', obj: '冠狀動脈心臟病' },
              { subj: '動脈硬化', rel: 'causes', obj: '腦中風' },
              { subj: 'Amlodipine', rel: 'treats', obj: '高血壓' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            relation_identification: [
              { subj: '高血壓', rel: 'causes', obj: '動脈硬化' },
              { subj: '動脈硬化', rel: 'causes', obj: '冠狀動脈心臟病' },
              { subj: '動脈硬化', rel: 'causes', obj: '腦中風' },
              { subj: 'Amlodipine', rel: 'treats', obj: '高血壓' }
            ]
          }
        }
      ],
      'rel-002': [
        {
          annotator: 'kioleemg12',
          answers: {
            relation_identification: [
              { subj: '糖尿病', rel: 'causes', obj: '糖尿病視網膜病變' },
              { subj: '糖尿病視網膜病變', rel: 'located_in', obj: '視網膜微血管' },
              { subj: '眼底鏡檢查', rel: 'diagnoses', obj: '糖尿病視網膜病變' },
              { subj: '雷射光凝固術', rel: 'treats', obj: '糖尿病視網膜病變' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            relation_identification: [
              { subj: '糖尿病', rel: 'causes', obj: '糖尿病視網膜病變' },
              { subj: '糖尿病視網膜病變', rel: 'located_in', obj: '視網膜微血管' },
              { subj: '眼底鏡檢查', rel: 'diagnoses', obj: '糖尿病視網膜病變' },
              { subj: '雷射光凝固術', rel: 'treats', obj: '糖尿病視網膜病變' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            /* Disagreement: misses the treats triple. */
            relation_identification: [
              { subj: '糖尿病', rel: 'causes', obj: '糖尿病視網膜病變' },
              { subj: '糖尿病視網膜病變', rel: 'located_in', obj: '視網膜微血管' },
              { subj: '眼底鏡檢查', rel: 'diagnoses', obj: '糖尿病視網膜病變' }
            ]
          }
        }
      ],
      'rel-003': [
        {
          annotator: 'kioleemg12',
          answers: {
            relation_identification: [
              { subj: '氣喘', rel: 'causes', obj: '呼吸困難' },
              { subj: 'Budesonide', rel: 'treats', obj: '氣喘' },
              { subj: 'Budesonide', rel: 'prevents', obj: '氣喘' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            relation_identification: [
              { subj: '氣喘', rel: 'causes', obj: '呼吸困難' },
              { subj: 'Budesonide', rel: 'treats', obj: '氣喘' },
              { subj: 'Budesonide', rel: 'prevents', obj: '氣喘' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            relation_identification: [
              { subj: '氣喘', rel: 'causes', obj: '呼吸困難' },
              { subj: 'Budesonide', rel: 'treats', obj: '氣喘' },
              { subj: 'Budesonide', rel: 'prevents', obj: '氣喘' }
            ]
          }
        }
      ]
    },

    T009: {
      'sum-001': [
        { annotator: 'kioleemg12', answers: { free_text: '台灣癌症存活率逾六成，但近半患者有情緒困擾。癌症希望基金會於台北設立專屬諮商所，提供每人最多六次免費心理諮商。' } },
        { annotator: '113450022', answers: { free_text: '台灣癌症存活率逾六成，但近半患者有情緒困擾。癌症希望基金會於台北設立專屬諮商所，提供每人最多六次免費心理諮商。' } },
        { annotator: 'tony0950127', answers: { free_text: '台灣癌症存活率逾六成，近半患者有情緒困擾，基金會提供免費心理諮商。' } }
      ],
      'sum-002': [
        { annotator: 'kioleemg12', answers: { free_text: '糖尿病治療以飲食與運動為基礎，藥物首選 Metformin，若不耐受可改用 SGLT-2 抑制劑或 GLP-1 促效劑。' } },
        { annotator: '113450022', answers: { free_text: '糖尿病治療以飲食與運動為基礎，藥物首選 Metformin，若不耐受可改用 SGLT-2 抑制劑或 GLP-1 促效劑。' } },
        { annotator: 'tony0950127', answers: { free_text: '糖尿病治療以飲食與運動為基礎，藥物首選 Metformin，若不耐受可改用 SGLT-2 抑制劑或 GLP-1 促效劑。' } }
      ],
      'sum-003': [
        { annotator: 'kioleemg12', answers: { free_text: '居家血壓監測建議早晚各量一次，休息五分鐘後測量並連續記錄七天。飲食建議採用得舒飲食法，每日鈉攝取控制在 2,300 毫克以下。' } },
        { annotator: '113450022', answers: { free_text: '居家血壓監測建議早晚各量一次，休息五分鐘後測量並連續記錄七天。飲食建議採用得舒飲食法，每日鈉攝取控制在 2,300 毫克以下。' } },
        { annotator: 'tony0950127', answers: { free_text: '居家血壓監測建議早晚各量一次，休息五分鐘後測量並連續記錄七天。飲食建議採用得舒飲食法，每日鈉攝取控制在 2,300 毫克以下。' } }
      ]
    },

    T010: {
      'med-001': [
        {
          annotator: 'kioleemg12',
          answers: {
            entity_recognition: [
              { text: '左心耳', type: 'BODY' }, { text: '左心房', type: 'BODY' }, { text: '心房', type: 'BODY' }, { text: '左心耳', type: 'BODY' },
              { text: '淤滯', type: 'SYMP' }, { text: '血栓', type: 'SYMP' }, { text: '血栓', type: 'SYMP' },
              { text: '腦部', type: 'BODY' }, { text: '器官', type: 'BODY' }, { text: '腦中風', type: 'DISE' }, { text: '全身性栓塞', type: 'DISE' }
            ],
            relation_identification: [
              { subj: '左心耳', rel: 'bodyLocation', obj: '左心房' },
              { subj: '左心耳', rel: 'causes', obj: '淤滯' },
              { subj: '左心耳', rel: 'causes', obj: '血栓' },
              { subj: '淤滯', rel: 'causes', obj: '血栓' },
              { subj: '血栓', rel: 'bodyLocation', obj: '腦部' },
              { subj: '血栓', rel: 'bodyLocation', obj: '器官' },
              { subj: '血栓', rel: 'adverseOutcome', obj: '腦中風' },
              { subj: '血栓', rel: 'adverseOutcome', obj: '全身性栓塞' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            entity_recognition: [
              { text: '左心耳', type: 'BODY' }, { text: '左心房', type: 'BODY' }, { text: '心房', type: 'BODY' }, { text: '左心耳', type: 'BODY' },
              { text: '淤滯', type: 'SYMP' }, { text: '血栓', type: 'SYMP' }, { text: '血栓', type: 'SYMP' },
              { text: '腦部', type: 'BODY' }, { text: '器官', type: 'BODY' }, { text: '腦中風', type: 'DISE' }, { text: '全身性栓塞', type: 'DISE' }
            ],
            relation_identification: [
              { subj: '左心耳', rel: 'bodyLocation', obj: '左心房' },
              { subj: '左心耳', rel: 'causes', obj: '淤滯' },
              { subj: '左心耳', rel: 'causes', obj: '血栓' },
              { subj: '淤滯', rel: 'causes', obj: '血栓' },
              { subj: '血栓', rel: 'bodyLocation', obj: '腦部' },
              { subj: '血栓', rel: 'bodyLocation', obj: '器官' },
              { subj: '血栓', rel: 'adverseOutcome', obj: '腦中風' },
              { subj: '血栓', rel: 'adverseOutcome', obj: '全身性栓塞' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            entity_recognition: [
              { text: '左心耳', type: 'BODY' }, { text: '左心房', type: 'BODY' }, { text: '心房', type: 'BODY' }, { text: '左心耳', type: 'BODY' },
              { text: '淤滯', type: 'SYMP' }, { text: '血栓', type: 'SYMP' }, { text: '血栓', type: 'SYMP' },
              { text: '腦部', type: 'BODY' }, { text: '器官', type: 'BODY' }, { text: '腦中風', type: 'DISE' }, { text: '全身性栓塞', type: 'DISE' }
            ],
            /* Disagreement: misses the last adverseOutcome triple. */
            relation_identification: [
              { subj: '左心耳', rel: 'bodyLocation', obj: '左心房' },
              { subj: '左心耳', rel: 'causes', obj: '淤滯' },
              { subj: '左心耳', rel: 'causes', obj: '血栓' },
              { subj: '淤滯', rel: 'causes', obj: '血栓' },
              { subj: '血栓', rel: 'bodyLocation', obj: '腦部' },
              { subj: '血栓', rel: 'bodyLocation', obj: '器官' },
              { subj: '血栓', rel: 'adverseOutcome', obj: '腦中風' }
            ]
          }
        }
      ],
      'med-002': [
        {
          annotator: 'kioleemg12',
          answers: {
            entity_recognition: [
              { text: '胸痛', type: 'SYMP' }, { text: '急診', type: 'INST' }, { text: '心電圖', type: 'EXAM' }, { text: 'ST段上升', type: 'SYMP' },
              { text: '急性心肌梗塞', type: 'DISE' }, { text: '阿斯匹靈', type: 'DRUG' }, { text: '肝素', type: 'DRUG' }, { text: '心導管介入手術', type: 'TREAT' }
            ],
            relation_identification: [
              { subj: '心電圖', rel: 'typicalTest', obj: 'ST段上升' },
              { subj: 'ST段上升', rel: 'diagnosis', obj: '急性心肌梗塞' },
              { subj: '阿斯匹靈', rel: 'possibleTreatment', obj: '急性心肌梗塞' },
              { subj: '肝素', rel: 'possibleTreatment', obj: '急性心肌梗塞' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            entity_recognition: [
              { text: '胸痛', type: 'SYMP' }, { text: '急診', type: 'INST' }, { text: '心電圖', type: 'EXAM' }, { text: 'ST段上升', type: 'SYMP' },
              { text: '急性心肌梗塞', type: 'DISE' }, { text: '阿斯匹靈', type: 'DRUG' }, { text: '肝素', type: 'DRUG' }, { text: '心導管介入手術', type: 'TREAT' }
            ],
            relation_identification: [
              { subj: '心電圖', rel: 'typicalTest', obj: 'ST段上升' },
              { subj: 'ST段上升', rel: 'diagnosis', obj: '急性心肌梗塞' },
              { subj: '阿斯匹靈', rel: 'possibleTreatment', obj: '急性心肌梗塞' },
              { subj: '肝素', rel: 'possibleTreatment', obj: '急性心肌梗塞' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            entity_recognition: [
              { text: '胸痛', type: 'SYMP' }, { text: '急診', type: 'INST' }, { text: '心電圖', type: 'EXAM' }, { text: 'ST段上升', type: 'SYMP' },
              { text: '急性心肌梗塞', type: 'DISE' }, { text: '阿斯匹靈', type: 'DRUG' }, { text: '肝素', type: 'DRUG' }, { text: '心導管介入手術', type: 'TREAT' }
            ],
            relation_identification: [
              { subj: '心電圖', rel: 'typicalTest', obj: 'ST段上升' },
              { subj: 'ST段上升', rel: 'diagnosis', obj: '急性心肌梗塞' },
              { subj: '阿斯匹靈', rel: 'possibleTreatment', obj: '急性心肌梗塞' },
              { subj: '肝素', rel: 'possibleTreatment', obj: '急性心肌梗塞' }
            ]
          }
        }
      ],
      'med-003': [
        {
          annotator: 'kioleemg12',
          answers: {
            entity_recognition: [
              { text: '糖尿病', type: 'DISE' }, { text: '血糖控制不佳', type: 'SYMP' }, { text: '視網膜病變', type: 'DISE' }, { text: '腎病變', type: 'DISE' },
              { text: '眼科', type: 'INST' }, { text: '眼底檢查', type: 'EXAM' }, { text: 'Metformin', type: 'DRUG' }
            ],
            relation_identification: [
              { subj: '糖尿病', rel: 'causes', obj: '視網膜病變' },
              { subj: '糖尿病', rel: 'causes', obj: '腎病變' },
              { subj: '眼底檢查', rel: 'typicalTest', obj: '視網膜病變' },
              { subj: 'Metformin', rel: 'possibleTreatment', obj: '糖尿病' }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            entity_recognition: [
              { text: '糖尿病', type: 'DISE' }, { text: '血糖控制不佳', type: 'SYMP' }, { text: '視網膜病變', type: 'DISE' }, { text: '腎病變', type: 'DISE' },
              { text: '眼科', type: 'INST' }, { text: '眼底檢查', type: 'EXAM' }, { text: 'Metformin', type: 'DRUG' }
            ],
            relation_identification: [
              { subj: '糖尿病', rel: 'causes', obj: '視網膜病變' },
              { subj: '糖尿病', rel: 'causes', obj: '腎病變' },
              { subj: '眼底檢查', rel: 'typicalTest', obj: '視網膜病變' },
              { subj: 'Metformin', rel: 'possibleTreatment', obj: '糖尿病' }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            entity_recognition: [
              { text: '糖尿病', type: 'DISE' }, { text: '血糖控制不佳', type: 'SYMP' }, { text: '視網膜病變', type: 'DISE' }, { text: '腎病變', type: 'DISE' },
              { text: '眼科', type: 'INST' }, { text: '眼底檢查', type: 'EXAM' }, { text: 'Metformin', type: 'DRUG' }
            ],
            relation_identification: [
              { subj: '糖尿病', rel: 'causes', obj: '視網膜病變' },
              { subj: '糖尿病', rel: 'causes', obj: '腎病變' },
              { subj: '眼底檢查', rel: 'typicalTest', obj: '視網膜病變' },
              { subj: 'Metformin', rel: 'possibleTreatment', obj: '糖尿病' }
            ]
          }
        }
      ]
    },

    T011: {
      '00183': [
        { annotator: 'kioleemg12', answers: { single_label: 'contradiction' } },
        { annotator: '113450022', answers: { single_label: 'contradiction' } },
        { annotator: 'tony0950127', answers: { single_label: 'neutral' } }
      ],
      '00184': [
        { annotator: 'kioleemg12', answers: { single_label: 'contradiction' } },
        { annotator: '113450022', answers: { single_label: 'contradiction' } },
        { annotator: 'tony0950127', answers: { single_label: 'contradiction' } }
      ],
      '00185': [
        { annotator: 'kioleemg12', answers: { single_label: 'entailment' } },
        { annotator: '113450022', answers: { single_label: 'entailment' } },
        { annotator: 'tony0950127', answers: { single_label: 'entailment' } }
      ]
    },

    T012: {
      eac8d013: [
        { annotator: 'kioleemg12', answers: { free_text: '是的，這在癌友身上其實很常見，近半數癌症患者會出現明顯情緒困擾，大約 3 到 4 成會有焦慮或憂鬱反應，建議盡早尋求心理支持。' } },
        { annotator: '113450022', answers: { free_text: '是的，這在癌友身上其實很常見，近半數癌症患者會出現明顯情緒困擾，大約 3 到 4 成會有焦慮或憂鬱反應，建議盡早尋求心理支持。' } },
        { annotator: 'tony0950127', answers: { free_text: '是的，很常見，建議尋求心理支持。' } }
      ],
      b3f72c91: [
        { annotator: 'kioleemg12', answers: { free_text: '第二型糖尿病的第一線口服藥物通常是 Metformin，安全、便宜且不易造成低血糖，常見副作用是腸胃道不適。' } },
        { annotator: '113450022', answers: { free_text: '第二型糖尿病的第一線口服藥物通常是 Metformin，安全、便宜且不易造成低血糖，常見副作用是腸胃道不適。' } },
        { annotator: 'tony0950127', answers: { free_text: '第二型糖尿病的第一線口服藥物通常是 Metformin，安全、便宜且不易造成低血糖，常見副作用是腸胃道不適。' } }
      ],
      d9a14e57: [
        { annotator: 'kioleemg12', answers: { free_text: '建議每天早晚各量一次血壓，休息 5 分鐘後測量並連續記錄一週；飲食上採得舒飲食，鈉攝取每天不超過 2,300 毫克。' } },
        { annotator: '113450022', answers: { free_text: '建議每天早晚各量一次血壓，休息 5 分鐘後測量並連續記錄一週；飲食上採得舒飲食，鈉攝取每天不超過 2,300 毫克。' } },
        { annotator: 'tony0950127', answers: { free_text: '建議每天早晚各量一次血壓，休息 5 分鐘後測量並連續記錄一週；飲食上採得舒飲食，鈉攝取每天不超過 2,300 毫克。' } }
      ]
    },

    T013: {
      'absa-001': [
        {
          annotator: 'kioleemg12',
          answers: {
            entity_recognition: [
              { text: 'Note 10 plus', type: 'Target' }, { text: '過熱問題', type: 'Aspect' },
              { text: '嚴重', type: 'Opinion' }, { text: '沒有這個問題', type: 'Opinion' }
            ],
            relation_identification: [
              { subj: 'Note 10 plus', rel: 'has_aspect', obj: '過熱問題' },
              { subj: 'Note 10 plus', rel: 'has_opinion', obj: '嚴重' },
              { subj: 'Note 10 plus', rel: 'has_opinion', obj: '沒有這個問題' }
            ],
            multi_dim: { valence: 3, arousal: 6 }
          }
        },
        {
          annotator: '113450022',
          answers: {
            entity_recognition: [
              { text: 'Note 10 plus', type: 'Target' }, { text: '過熱問題', type: 'Aspect' },
              { text: '嚴重', type: 'Opinion' }, { text: '沒有這個問題', type: 'Opinion' }
            ],
            relation_identification: [
              { subj: 'Note 10 plus', rel: 'has_aspect', obj: '過熱問題' },
              { subj: 'Note 10 plus', rel: 'has_opinion', obj: '嚴重' },
              { subj: 'Note 10 plus', rel: 'has_opinion', obj: '沒有這個問題' }
            ],
            multi_dim: { valence: 3, arousal: 6 }
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            /* Disagreement (this task has only one sample, so all three
               output types diverge here): misses the cross-utterance
               '沒有這個問題' opinion entity/relation and rates the dims
               differently. */
            entity_recognition: [
              { text: 'Note 10 plus', type: 'Target' }, { text: '過熱問題', type: 'Aspect' }, { text: '嚴重', type: 'Opinion' }
            ],
            relation_identification: [
              { subj: 'Note 10 plus', rel: 'has_aspect', obj: '過熱問題' },
              { subj: 'Note 10 plus', rel: 'has_opinion', obj: '嚴重' }
            ],
            multi_dim: { valence: 4, arousal: 5 }
          }
        }
      ]
    }
  };

  function meanStd(values) {
    if (values.length === 0) return { mean: 0, std: 0 };
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    var variance = values.reduce(function (a, v) { return a + Math.pow(v - mean, 2); }, 0) / values.length;
    return { mean: mean, std: Math.sqrt(variance) };
  }
  function fmt2(n) {
    return Number(n).toFixed(2);
  }
  function countKeysForRow(outKey, answer) {
    switch (outKey) {
      case 'single_label':
        return answer ? [answer] : [];
      case 'multi_label':
        return Array.isArray(answer) ? answer : [];
      case 'sequence_tagging':
        return (Array.isArray(answer) ? answer : []).map(function (pair) { return pair.tag; });
      case 'entity_recognition':
        return (Array.isArray(answer) ? answer : []).map(function (ent) { return ent.type; });
      case 'relation_identification':
        /* a toggled-off (null) relation type is excluded from stats */
        return (Array.isArray(answer) ? answer : []).map(function (tr) { return tr.rel; }).filter(Boolean);
      default:
        return [];
    }
  }

  /* FR-014F: label-distribution stats summary shared by the workspace
   * aggregate review card AND the annotation list's reviewer stats column
   * -- one algorithm per output-type category (not per task_id), one
   * implementation for both consumers so their numbers can never drift.
   * Rows are {answer, bypass} views; bypassed rows are excluded from every
   * computation. free_text has no numeric stats: returns null so each
   * caller renders its own localized placeholder. */
  function computeReviewStats(outKey, rows) {
    var effectiveRows = rows.filter(function (row) { return !row.bypass; });
    switch (outKey) {
      case 'single_label':
      case 'multi_label':
      case 'sequence_tagging':
      case 'entity_recognition':
      case 'relation_identification': {
        var counts = {};
        var order = [];
        effectiveRows.forEach(function (row) {
          countKeysForRow(outKey, row.answer).forEach(function (key) {
            if (!(key in counts)) { counts[key] = 0; order.push(key); }
            counts[key] += 1;
          });
        });
        order.sort(function (a, b) { return counts[b] - counts[a]; });
        return order.map(function (key) { return key + '×' + counts[key]; }).join(' · ');
      }
      case 'single_dim': {
        var values = effectiveRows
          .map(function (row) { return Number(row.answer); })
          .filter(function (v) { return !isNaN(v); });
        if (values.length === 0) return '';
        var stats = meanStd(values);
        return 'mean : ' + fmt2(stats.mean) + ' , std : ' + fmt2(stats.std);
      }
      case 'multi_dim': {
        /* Legacy multi-line block: `mean [..]` / `std [..]` across dims in
         * first-seen order, then one `±1.5std {dim} : lo~hi` line per dim
         * (bounds at 3 decimals). Dim labels are the config dimension
         * names -- never a hardcoded per-task abbreviation. */
        var dimOrder = [];
        var dimSeen = {};
        effectiveRows.forEach(function (row) {
          Object.keys(row.answer || {}).forEach(function (name) {
            if (!dimSeen[name]) { dimSeen[name] = true; dimOrder.push(name); }
          });
        });
        if (dimOrder.length === 0) return '';
        var perDim = dimOrder.map(function (name) {
          var dimValues = effectiveRows
            .map(function (row) { return Number((row.answer || {})[name]); })
            .filter(function (v) { return !isNaN(v); });
          return { name: name, stats: meanStd(dimValues) };
        });
        var lines = [
          'mean [' + perDim.map(function (d) { return fmt2(d.stats.mean); }).join(', ') + ']',
          'std [' + perDim.map(function (d) { return fmt2(d.stats.std); }).join(', ') + ']'
        ];
        perDim.forEach(function (d) {
          var half = 1.5 * d.stats.std;
          lines.push('±1.5std ' + d.name + ' : ' + (d.stats.mean - half).toFixed(3) + '~' + (d.stats.mean + half).toFixed(3));
        });
        return lines.join('\n');
      }
      case 'free_text':
        return null;
      default:
        return '';
    }
  }

  /* FR-014A: deviation coloring for single_dim/multi_dim result tags,
   * shared by the workspace aggregate review card AND the annotation
   * list's expanded annotator rows -- same single-source rationale as
   * computeReviewStats. Rows are {answer, bypass} views; returns the CSS
   * class for rows[rowIdx] ('' for bypassed rows and non-dimension types).
   * Ratio = |value - mean| / std against the non-bypassed rows; the worst
   * dimension decides: >1.5 red, >1 blue, else green (std=0 counts green). */
  function dimDeviationClass(outKey, rows, rowIdx) {
    if (outKey !== 'single_dim' && outKey !== 'multi_dim') return '';
    if (rows[rowIdx].bypass) return '';
    var activeRows = rows.filter(function (row) { return !row.bypass; });
    var maxRatio = 0;
    if (outKey === 'single_dim') {
      var values = activeRows
        .map(function (row) { return Number(row.answer); })
        .filter(function (v) { return !isNaN(v); });
      var stats = meanStd(values);
      var value = Number(rows[rowIdx].answer);
      if (isNaN(value)) return '';
      maxRatio = stats.std === 0 ? 0 : Math.abs(value - stats.mean) / stats.std;
    } else {
      Object.keys(rows[rowIdx].answer || {}).forEach(function (name) {
        var dimValues = activeRows
          .map(function (row) { return Number((row.answer || {})[name]); })
          .filter(function (v) { return !isNaN(v); });
        var dimStats = meanStd(dimValues);
        var dimValue = Number((rows[rowIdx].answer || {})[name]);
        if (isNaN(dimValue) || dimStats.std === 0) return;
        maxRatio = Math.max(maxRatio, Math.abs(dimValue - dimStats.mean) / dimStats.std);
      });
    }
    if (maxRatio > 1.5) return 'result-tag-red';
    if (maxRatio > 1) return 'result-tag-blue';
    return 'result-tag-green';
  }

  /* Getter for REVIEWER_MOCK_ROWS -- reads through the exported namespace
   * (not the closured local var) on every call, so a Playwright test can
   * override window.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS
   * via script injection and have the override actually take effect. */
  function getReviewerMockRows(taskId, sampleId) {
    var all = (global.LabelSuiteAnnotationWorkspaceData && global.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS) || {};
    var bySample = all[taskId];
    return (bySample && bySample[sampleId]) || [];
  }

  /* Converts a submitted OutputAnswer (engine previewState/previewEntities/
   * previewTriples shape) into the SAME CompactAnswer shape
   * REVIEWER_MOCK_ROWS ships, shared by both the workspace's live
   * signed-in-annotator row and the official_run list's single
   * real-annotator row (FR-047; the row was keyed 'current' before v3.8.0).
   * sequence_tagging token text can only be reconstructed with the dataset's
   * real tokenization (only available inside the workspace's engine state);
   * callers without it may pass opts.sequenceTagsToPairs(tags) to supply the
   * real text, otherwise positional placeholders ('#'+index) are used. */
  function convertSubmissionAnswer(outKey, submission, opts) {
    opts = opts || {};
    var ps = (submission.previewState && submission.previewState[outKey]) || {};
    switch (outKey) {
      case 'single_label':
        return ps.selected || null;
      case 'multi_label':
        return (Array.isArray(ps.selected) ? ps.selected : []).map(function (path) {
          return Array.isArray(path) ? path[path.length - 1] : String(path);
        });
      case 'single_dim':
        return ps.value != null ? Number(ps.value) : null;
      case 'multi_dim': {
        var dims = {};
        Object.keys(ps.dims || {}).forEach(function (name) { dims[name] = ps.dims[name].value; });
        return dims;
      }
      case 'sequence_tagging':
        if (typeof opts.sequenceTagsToPairs === 'function') return opts.sequenceTagsToPairs(ps.tokens);
        return (Array.isArray(ps.tokens) ? ps.tokens : [])
          .map(function (tag, idx) { return { tag: tag, idx: idx }; })
          .filter(function (item) { return item.tag && item.tag !== 'O'; })
          .map(function (item) { return { text: '#' + item.idx, tag: item.tag }; });
      case 'entity_recognition':
        return (submission.previewEntities || []).map(function (e) { return { text: e.text, type: e.type }; });
      case 'relation_identification':
        return (submission.previewTriples || []).map(function (tr) { return { subj: tr.subj, rel: tr.rel, obj: tr.obj }; });
      case 'free_text':
        return ps.text || '';
      default:
        return null;
    }
  }

  function entityMergeKey(ent) { return (ent && ent.text) + '::' + (ent && ent.type); }
  function relationMergeKey(tr) { return (tr && tr.subj) + '::' + (tr && tr.rel) + '::' + (tr && tr.obj); }

  /* ---- Review unit (spec 015 v3.9.0, issue #146) -------------------------
   * A review unit is `sample_id x annotator_id x run_type`: the same sample
   * annotated by three people is three independently reviewable units, in
   * BOTH run types. This replaces the run_type-branched review model, where
   * dry_run reviewed a merged consensus and official_run reviewed a single
   * annotator.
   *
   * The five states advance linearly on one axis. `minReviewers` (P2 always
   * passes 1; the configurable min_reviewers arrives later) is what separates
   * each "decided" state from its "decided, but not by enough reviewers yet"
   * predecessor:
   *
   *   no annotator submission            -> null (not a review unit yet)
   *   submitted, no reviewer             -> pending
   *   every reviewer agrees, n < min     -> approved
   *   every reviewer agrees, n >= min    -> finalized   (terminal)
   *   some reviewer changed it, n < min  -> modified
   *   some reviewer changed it, n >= min -> disputed    (terminal, -> P4 pool)
   */
  var REVIEW_UNIT_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    MODIFIED: 'modified',
    DISPUTED: 'disputed',
    FINALIZED: 'finalized',
  };

  function normalizeScalar(value) {
    return value === undefined ? null : value;
  }

  /* Set-shaped types (multi_label / entity_recognition /
   * relation_identification) are order-independent: a diff is an item present
   * on exactly one side, keyed by entityMergeKey/relationMergeKey.
   * `identify` maps an item to its key. */
  function diffItemSets(annotatorItems, reviewerItems, identify) {
    var byKey = {};
    var order = [];
    function collect(items, side) {
      (Array.isArray(items) ? items : []).forEach(function (item) {
        var key = identify(item);
        if (!byKey[key]) {
          byKey[key] = { key: key, annotator: null, reviewer: null };
          order.push(key);
        }
        byKey[key][side] = item;
      });
    }
    collect(annotatorItems, 'annotator');
    collect(reviewerItems, 'reviewer');
    return order
      .map(function (key) { return byKey[key]; })
      .filter(function (entry) { return entry.annotator === null || entry.reviewer === null; });
  }

  /* "Did the reviewer change the annotator's answer", per output type, over
   * the CompactAnswer shape convertSubmissionAnswer() produces.
   *
   * single_dim / multi_dim compare with STRICT equality on purpose:
   * DIM_CONSENSUS_TOLERANCE answers "are two annotators close enough to
   * count as agreeing", a different question from "was this value edited".
   * A 0.1 nudge is still an edit. */
  function compareOutputAnswer(outKey, annotatorAnswer, reviewerAnswer) {
    var diffs;
    switch (outKey) {
      case 'multi_label':
        diffs = diffItemSets(annotatorAnswer, reviewerAnswer, function (label) { return String(label); });
        break;
      case 'entity_recognition':
        diffs = diffItemSets(annotatorAnswer, reviewerAnswer, entityMergeKey);
        break;
      case 'relation_identification':
        diffs = diffItemSets(annotatorAnswer, reviewerAnswer, relationMergeKey);
        break;
      case 'multi_dim': {
        var annotatorDims = annotatorAnswer || {};
        var reviewerDims = reviewerAnswer || {};
        var names = Object.keys(annotatorDims);
        Object.keys(reviewerDims).forEach(function (name) {
          if (names.indexOf(name) < 0) names.push(name);
        });
        diffs = names
          .map(function (name) {
            return {
              key: name,
              annotator: normalizeScalar(annotatorDims[name]),
              reviewer: normalizeScalar(reviewerDims[name]),
            };
          })
          .filter(function (entry) { return entry.annotator !== entry.reviewer; });
        break;
      }
      /* Positional over the CompactAnswer pair list (which already drops 'O'
         tokens), so a retag reads as one diff rather than an add plus a
         delete -- the merge-key treatment the set types get. */
      case 'sequence_tagging': {
        var annotatorPairs = Array.isArray(annotatorAnswer) ? annotatorAnswer : [];
        var reviewerPairs = Array.isArray(reviewerAnswer) ? reviewerAnswer : [];
        diffs = [];
        for (var i = 0; i < Math.max(annotatorPairs.length, reviewerPairs.length); i++) {
          var annotatorTag = annotatorPairs[i] ? annotatorPairs[i].tag : null;
          var reviewerTag = reviewerPairs[i] ? reviewerPairs[i].tag : null;
          var sameText =
            (annotatorPairs[i] ? annotatorPairs[i].text : null) ===
            (reviewerPairs[i] ? reviewerPairs[i].text : null);
          if (annotatorTag !== reviewerTag || !sameText) {
            diffs.push({ key: String(i), annotator: annotatorTag, reviewer: reviewerTag });
          }
        }
        break;
      }
      default: {
        var annotatorValue = normalizeScalar(annotatorAnswer);
        var reviewerValue = normalizeScalar(reviewerAnswer);
        diffs =
          annotatorValue === reviewerValue
            ? []
            : [{ key: outKey, annotator: annotatorValue, reviewer: reviewerValue }];
      }
    }
    return { equal: diffs.length === 0, diffs: diffs };
  }

  /* Every submitted reviewer decision on ONE annotator's work, prefix-scanned
   * the same way getSampleHistory() builds its trail: reading only the
   * signed-in reviewer's bucket would hide the peers whose disagreement is
   * exactly what makes a unit disputed. The reviewer id is the bucket key's
   * suffix (FR-049) -- dispute items need it to record WHOSE B value each
   * disagreement carries. */
  function readReviewerSubmissions(taskId, runType, sampleId, identity) {
    var store = readSubmissionStore();
    var prefix = reviewerBucketPrefix(taskId, runType, identity);
    return Object.keys(store)
      .filter(function (key) { return key.indexOf(prefix) === 0; })
      .map(function (key) {
        var entry = store[key][sampleId];
        if (!entry || entryStatus(entry) !== 'submitted') return null;
        return { reviewerId: key.slice(prefix.length), answers: entry.answers };
      })
      .filter(function (submission) { return submission !== null; });
  }

  /* Derives the review unit's state from the annotator's submission plus
   * every reviewer submission on it. `outKeys` is the task's composed output
   * type list; `opts.minReviewers` defaults to 1. Returns null when the
   * annotator has not submitted -- there is nothing to review yet. */
  function getReviewUnitStatus(taskId, runType, sampleId, identity, outKeys, opts) {
    var annotatorSubmission = getSubmission(taskId, 'annotator', runType, sampleId, identity);
    if (!annotatorSubmission) return null;

    var reviewerSubmissions = readReviewerSubmissions(taskId, runType, sampleId, identity);
    if (!reviewerSubmissions.length) return REVIEW_UNIT_STATUS.PENDING;

    var keys = Array.isArray(outKeys) ? outKeys : [];
    var changed = reviewerSubmissions.some(function (reviewerSubmission) {
      return keys.some(function (outKey) {
        return !compareOutputAnswer(
          outKey,
          convertSubmissionAnswer(outKey, annotatorSubmission),
          convertSubmissionAnswer(outKey, reviewerSubmission.answers)
        ).equal;
      });
    });
    var enoughReviewers = reviewerSubmissions.length >= ((opts && opts.minReviewers) || 1);

    if (changed) {
      if (!enoughReviewers) return REVIEW_UNIT_STATUS.MODIFIED;
      /* v4.8.0: a disputed unit leaves the pool once EVERY dispute item is
         resolved -- either the reviewers' per-item majority already converged
         (resolveDisputeConvergence) or an arbiter finalized it by vote. */
      var items = getDisputeItems(taskId, runType, sampleId, identity, keys);
      var arbState = getArbitrationState(taskId, runType, sampleId, identity);
      var allResolved = items.length > 0 && items.every(function (item) {
        if (resolveDisputeConvergence(item, reviewerSubmissions.length).converged) return true;
        var stored = arbState[item.outKey + '::' + item.key];
        return !!(stored && stored.finalized_by);
      });
      return allResolved ? REVIEW_UNIT_STATUS.FINALIZED : REVIEW_UNIT_STATUS.DISPUTED;
    }
    return enoughReviewers ? REVIEW_UNIT_STATUS.FINALIZED : REVIEW_UNIT_STATUS.APPROVED;
  }

  /* ---- Dispute items (spec 015 v4.6.0, issue #147 P3a) -------------------
   * A DisputeItem is ONE disagreed label/span/token inside a review unit,
   * not the whole unit: parts both sides agree on never enter the pool.
   * Derived at read time from the same FR-052 diffs getReviewUnitStatus()
   * consumes -- nothing is materialized, so the pool can never drift from
   * the status machine that says a unit is disputed. Items merge across
   * reviewers by `outKey + merge key`: the annotator's A value appears
   * once, and each disagreeing reviewer contributes a B value under their
   * id (agreeing reviewers stay out -- their consent is what the majority
   * convergence in P3c counts). Arbitration votes and the finalized value
   * are the only stored state, and they arrive in P3c. */
  /* Arbiter candidacy (FR-060): a reviewer may claim a dispute only when the
   * roster flags them can_arbitrate AND they did not participate in the review
   * that produced it. Whether the unit IS disputed stays the caller's concern
   * -- every consumer already derives the unit status for its own display. */
  function isArbiterCandidate(taskId, runType, sampleId, identity) {
    var entry = REVIEWER_ROSTER.filter(function (r) { return r.id === identity.reviewerId; })[0];
    if (!entry || !entry.can_arbitrate) return false;
    return !getSubmission(taskId, 'reviewer', runType, sampleId, identity);
  }

  function getDisputeItems(taskId, runType, sampleId, identity, outKeys) {
    var annotatorSubmission = getSubmission(taskId, 'annotator', runType, sampleId, identity);
    if (!annotatorSubmission) return [];

    var reviewerSubmissions = readReviewerSubmissions(taskId, runType, sampleId, identity);
    var byId = {};
    var order = [];
    (Array.isArray(outKeys) ? outKeys : []).forEach(function (outKey) {
      var annotatorAnswer = convertSubmissionAnswer(outKey, annotatorSubmission);
      reviewerSubmissions.forEach(function (submission) {
        var diffs = compareOutputAnswer(
          outKey,
          annotatorAnswer,
          convertSubmissionAnswer(outKey, submission.answers)
        ).diffs;
        diffs.forEach(function (diff) {
          var id = outKey + '::' + diff.key;
          if (!byId[id]) {
            byId[id] = { outKey: outKey, key: diff.key, annotatorValue: diff.annotator, reviewerValues: {} };
            order.push(id);
          }
          byId[id].reviewerValues[submission.reviewerId] = diff.reviewer;
        });
      });
    });
    return order.map(function (id) { return byId[id]; });
  }

  /* ---- Arbitration state (spec 015 v4.8.0, issue #147 P3c) ---------------
   * The ONLY stored dispute state: arbitration votes and the finalized value
   * (DisputeItem entity, FR-059). Everything else stays derived. Keyed by the
   * unit (task × run_type × annotator × sample), not by any reviewer bucket
   * -- a dispute belongs to the unit, and whichever arbiter resolves it must
   * be visible to every other viewer of that unit. */
  var ARBITRATION_STORAGE_KEY = 'labelsuite.wsArbitration';

  function readArbitrationStore() {
    try {
      var raw = global.localStorage.getItem(ARBITRATION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function arbitrationBucketKey(taskId, runType, identity) {
    identity = identity || {};
    return taskId + '::' + runType + '::' + (identity.annotatorId || DEFAULT_ANNOTATOR_ID);
  }

  /* Returns { [itemId]: { votes: [{arbiter_id, choice, voted_at}],
   * finalized_value?, finalized_by? } } for one review unit; itemId is the
   * getDisputeItems() identity `outKey::key`. */
  function getArbitrationState(taskId, runType, sampleId, identity) {
    var bucket = readArbitrationStore()[arbitrationBucketKey(taskId, runType, identity)];
    return (bucket && bucket[sampleId]) || {};
  }

  /* Writes one arbiter's complete pass over a unit's open dispute items:
   * `decisions` is [{itemId, choice: 'A'|'B', value}] where `value` is the
   * concrete winning value (A -> annotatorValue, B -> the chosen reviewer
   * value). The prototype has a single arbiter per claim, so each vote
   * finalizes its item immediately. */
  function submitArbitration(taskId, runType, sampleId, identity, decisions) {
    var store = readArbitrationStore();
    var key = arbitrationBucketKey(taskId, runType, identity);
    if (!store[key]) store[key] = {};
    if (!store[key][sampleId]) store[key][sampleId] = {};
    var arbiterId = (identity && identity.reviewerId) || DEFAULT_REVIEWER_ID;
    (decisions || []).forEach(function (decision) {
      var item = store[key][sampleId][decision.itemId] || { votes: [] };
      item.votes.push({ arbiter_id: arbiterId, choice: decision.choice, voted_at: new Date().toISOString() });
      item.finalized_value = decision.value;
      item.finalized_by = arbiterId;
      store[key][sampleId][decision.itemId] = item;
    });
    try {
      global.localStorage.setItem(ARBITRATION_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      /* storage unavailable: same silent-tolerant stance as writeSubmissionStore */
    }
  }

  /* Per-item majority convergence (issue #147 ⑥③): decides whether one
   * dispute item resolves WITHOUT arbitration. Among `reviewerCount` (N)
   * reviewers of the unit, the reviewers present in `item.reviewerValues`
   * voted for their own value; the remaining N - |reviewerValues| reviewers
   * agreed with `item.annotatorValue`. A value converges only with a strict
   * majority (> N/2); anything else -- N=1, an even-N tie, all divergent --
   * sends the item to the dispute pool.
   *
   * Compare values with valueKey() (deep equality via canonical JSON), not
   * ===: span/token values are objects.
   *
   * Returns { converged: true, value: <winning value> } or { converged: false }.
   */
  function valueKey(value) {
    return JSON.stringify(value);
  }

  function resolveDisputeConvergence(item, reviewerCount) {
    /* A single reviewer's dissent can never outvote the annotator, even
       though 1 > 1/2 is technically a strict majority. */
    if (reviewerCount < 2) return { converged: false };
    var tally = {};
    var values = {};
    function vote(value, count) {
      var key = valueKey(value);
      tally[key] = (tally[key] || 0) + count;
      values[key] = value;
    }
    var reviewerIds = Object.keys(item.reviewerValues);
    reviewerIds.forEach(function (reviewerId) {
      vote(item.reviewerValues[reviewerId], 1);
    });
    vote(item.annotatorValue, reviewerCount - reviewerIds.length);
    var winner = Object.keys(tally).filter(function (key) {
      return tally[key] > reviewerCount / 2;
    })[0];
    return winner ? { converged: true, value: values[winner] } : { converged: false };
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
    markSampleRejected: markSampleRejected,
    getSubmission: getSubmission,
    getSampleAnswers: getSampleAnswers,
    getSampleHistory: getSampleHistory,
    getSubmittedSampleCount: getSubmittedSampleCount,
    syncDryRunProgress: syncDryRunProgress,
    DEFAULT_ANNOTATOR_ID: DEFAULT_ANNOTATOR_ID,
    DEFAULT_REVIEWER_ID: DEFAULT_REVIEWER_ID,
    REVIEWER_ROSTER: REVIEWER_ROSTER,
    resolveIdentity: resolveIdentity,
    REVIEWER_MOCK_ROWS: REVIEWER_MOCK_ROWS,
    getReviewerMockRows: getReviewerMockRows,
    computeReviewStats: computeReviewStats,
    dimDeviationClass: dimDeviationClass,
    meanStd: meanStd,
    convertSubmissionAnswer: convertSubmissionAnswer,
    REVIEW_UNIT_STATUS: REVIEW_UNIT_STATUS,
    compareOutputAnswer: compareOutputAnswer,
    getReviewUnitStatus: getReviewUnitStatus,
    getDisputeItems: getDisputeItems,
    isArbiterCandidate: isArbiterCandidate,
    readReviewerSubmissions: readReviewerSubmissions,
    getArbitrationState: getArbitrationState,
    submitArbitration: submitArbitration,
    resolveDisputeConvergence: resolveDisputeConvergence,
  };
})(window);

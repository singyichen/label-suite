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
  /* Each submission bucket lives under its own localStorage key
   * (`labelsuite.wsSubmissions.<bucketKey>`), NOT one shared blob (issue
   * #283): a write committed by another page is invisible to a page whose
   * synchronous save block is already running (cross-process localStorage
   * propagation waits for the reader's event loop), so shared-blob writers
   * clobbered each other's buckets. Distinct keys make concurrent writers
   * to different buckets non-overlapping by construction. Caveat: writes to
   * the SAME bucket still race (e.g. a reviewer reject targets the
   * annotator's bucket while that annotator saves another sample) -- the
   * prototype accepts last-write-wins there; the real conflict policy is
   * the backend's (spec 015 CONFLICT_RESOLUTION_POLICY). The bare legacy
   * whole-blob key is fanned out once at boot by
   * migrateLegacySubmissionStore(). */
  var SUBMISSION_KEY_PREFIX = 'labelsuite.wsSubmissions.';
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

  /* Generic localStorage-backed JSON object store, factored out so the
     review-decision-draft store below (issue #196) can reuse the same
     read/write tolerance as the submission buckets without duplicating it. */
  function readJsonBucket(fullKey) {
    try {
      var raw = global.localStorage.getItem(fullKey);
      var parsed = raw ? JSON.parse(raw) : null;
      /* A key holding "null" (or any non-object) must degrade to an empty
         bucket, matching the old store's tolerance, not throw downstream. */
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeJsonBucket(fullKey, bucket) {
    try {
      global.localStorage.setItem(fullKey, JSON.stringify(bucket));
    } catch (e) {
      /* ignore quota/serialization errors in the prototype */
    }
  }

  function readSubmissionBucket(bucketKey) {
    return readJsonBucket(SUBMISSION_KEY_PREFIX + bucketKey);
  }

  function writeSubmissionBucket(bucketKey, bucket) {
    writeJsonBucket(SUBMISSION_KEY_PREFIX + bucketKey, bucket);
  }

  /* Bucket keys currently in storage, for the prefix-scanning readers
   * (getSampleHistory / readReviewerSubmissions). Sorted because
   * localStorage.key(i) order is implementation-defined: sorting keeps
   * merged history stable for equal timestamps (annotator buckets sort
   * before reviewer buckets) and dispute reviewer rows deterministic
   * across browsers and reloads. */
  function listSubmissionBucketKeys() {
    var keys = [];
    try {
      for (var i = 0; i < global.localStorage.length; i++) {
        var key = global.localStorage.key(i);
        if (key && key.indexOf(SUBMISSION_KEY_PREFIX) === 0) {
          keys.push(key.slice(SUBMISSION_KEY_PREFIX.length));
        }
      }
    } catch (e) {
      /* storage unavailable: nothing to list */
    }
    return keys.sort();
  }

  /* One-shot fan-out of the pre-issue-#283 whole-blob store into per-bucket
   * keys: a returning visitor holds their drafts AND the already-run demo
   * seed inside the bare legacy key (and the reviewFlowDemoSeed marker stops
   * the seeder from re-staging), so without this the prototype boots with
   * everything invisible and permanently pending. Existing per-bucket keys
   * win over the legacy copy; the legacy key is removed either way. */
  function migrateLegacySubmissionStore() {
    var LEGACY_KEY = 'labelsuite.wsSubmissions';
    try {
      var raw = global.localStorage.getItem(LEGACY_KEY);
      if (!raw) return;
      var store = JSON.parse(raw);
      if (store && typeof store === 'object') {
        Object.keys(store).forEach(function (bucketKey) {
          if (!global.localStorage.getItem(SUBMISSION_KEY_PREFIX + bucketKey)) {
            writeSubmissionBucket(bucketKey, store[bucketKey]);
          }
        });
      }
      global.localStorage.removeItem(LEGACY_KEY);
    } catch (e) {
      /* corrupt legacy blob or unavailable storage: drop it rather than
         blocking boot */
      try {
        global.localStorage.removeItem(LEGACY_KEY);
      } catch (e2) {
        /* storage unavailable: nothing to clean up */
      }
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
    /* Review-flow demo Phase 2: a third plain reviewer so T016's
       min_reviewers = 3 quorum (wang/li/lin) leaves chen -- the only
       can_arbitrate reviewer -- outside every dispute and thus eligible
       to arbitrate it (FR-060). */
    { id: 'reviewer_lin', name: '林佳蓉' },
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
    var bucket = readSubmissionBucket(submissionBucketKey(taskId, role, runType, identity));
    return bucket[sampleId] || null;
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

  /* issue #470: the bottom-bar autosave indicator's SAVED state reads the
     time of an actually persisted write, never a fabricated one. A 'saved'
     or 'submitted' entry both count as real persistence; savedAt wins when
     both are present (handleSave can re-save an already-submitted sample).
     'pending' (including a reviewer-rejected sample awaiting reannotation)
     deliberately returns null -- it has no persisted write that reflects
     the sample's current state. */
  function getSampleSavedAt(taskId, role, runType, sampleId, identity) {
    var entry = readSampleEntry(taskId, role, runType, sampleId, identity);
    var status = entryStatus(entry);
    if (status !== 'saved' && status !== 'submitted') return null;
    return (entry && (entry.savedAt || entry.submittedAt)) || null;
  }

  /* Per-sample history events (FR-016 / AC-3.8): every save/submit appends
     {action, role, actorId, at, summary} onto the entry, so the right-column
     歷程 tab can trace who did what and when. v3.8.0 adds `actorId` (FR-050):
     `role` alone answers "a reviewer did this", not "which reviewer".
     `summary` is the host-provided per-output description (對應輸出類型 +
     修改內容). */
  var REVIEW_DECISION_EVENT_ACTIONS = { accepted: true, modified: true, bypassed: true };

  /* issue #910 (FR-016B): the reviewer-decision dedup guard below needs each
     outKey's own decision value, not the whole per-submit result_snapshot
     (buildResultSnapshot covers every outKey the submit touched at once, so
     comparing snapshots wholesale would conflate outKeys). convertSubmissionAnswer()
     (below) is already this file's single source of truth for "outKey's
     answer out of a previewState/previewEntities/previewTriples-shaped
     object" -- it is already used the same way for answer-equality
     comparisons elsewhere (getDisputeItems/anyReviewerChanged) -- so the
     guard routes through it instead of re-deriving the per-output-type
     mapping. buildResultSnapshot() can return null (nothing matched its
     whitelist); convertSubmissionAnswer() does not tolerate a null
     `submission`, so this wrapper treats a null snapshot as no answer for
     any outKey, keeping two null snapshots equal. */
  function outKeyDecisionValue(outKey, resultSnapshot) {
    return resultSnapshot ? convertSubmissionAnswer(outKey, resultSnapshot) : null;
  }

  function appendHistoryEvent(entry, action, role, summary, actorId, extra) {
    if (!Array.isArray(entry.history)) entry.history = [];
    var normalizedActorId = actorId || null;
    var last = entry.history[entry.history.length - 1];
    /* Double-submit guard (issue #201 / w6 DUP-01): a double-click can run
       markSampleSubmitted twice for the same sample/annotator/run before
       handleSubmit's busy-flag registers -- drop an identical consecutive
       'submitted' event instead of appending a duplicate that would
       corrupt the audit trail. issue #583: this guard only ever compares
       consecutive 'submitted' events, and a reviewer submit's last-written
       event is always a decision event (accepted/modified/bypassed), never
       'submitted' -- so this guard never matches on the reviewer path.
       Reviewer double-submit protection is the UI busy flag instead
       (handleReviewSubmit, annotation-workspace.config.js). */
    if (action === 'submitted' && last && last.action === 'submitted' && last.role === role && last.actorId === normalizedActorId) {
      return false;
    }
    /* issue #910 (FR-016B): extend the same double-submit protection to
       reviewer decision events, scoped by outKey -- appendReviewDecisionEvents
       is the only caller that sets extra.outKey, since it is the only place
       that knows which outKey a given decision event belongs to. One submit
       can write several different outKeys' events at once, so the
       comparison MUST be against that outKey's own most recent event, never
       just entry.history's last element -- comparing the tail would wrongly
       drop a different outKey's legitimate event. Events written before this
       change carry no outKey field, so they never match here (correct: this
       guard only concerns decisions made under this rule). */
    if (REVIEW_DECISION_EVENT_ACTIONS[action] && extra && extra.outKey != null) {
      var lastForOutKey = null;
      for (var i = entry.history.length - 1; i >= 0; i--) {
        if (entry.history[i].outKey === extra.outKey) {
          lastForOutKey = entry.history[i];
          break;
        }
      }
      if (
        lastForOutKey &&
        lastForOutKey.action === action &&
        lastForOutKey.role === role &&
        lastForOutKey.actorId === normalizedActorId &&
        (lastForOutKey.reason || null) === (extra.reason || null) &&
        JSON.stringify(outKeyDecisionValue(extra.outKey, lastForOutKey.result_snapshot)) ===
          JSON.stringify(outKeyDecisionValue(extra.outKey, extra.result_snapshot))
      ) {
        return false;
      }
    }
    var event = {
      action: action,
      role: role,
      actorId: normalizedActorId,
      at: new Date().toISOString(),
      summary: summary || '',
    };
    /* v4.61.0 (FR-087/FR-089): result-bearing events carry the answer as it
       stood at that moment, and reason-bearing ones carry the typed reason.
       Absent keys stay absent rather than becoming null, so a pre-v4.61.0
       event and a new event without a snapshot read identically. */
    if (extra) {
      Object.keys(extra).forEach(function (field) {
        if (extra[field] != null) event[field] = extra[field];
      });
    }
    entry.history.push(event);
    return true;
  }

  /* FR-088: `started_at` / `lead_time` as measured by the page that owns the
     timer. Only the page can measure visible time, so the data layer lifts
     the numbers off the payload rather than computing them -- computing them
     here would leave only the wall clock, which is exactly the figure
     FR-088 rules out. Absent timing yields an empty object, so a caller with
     no timer writes no timing fields instead of a zero. */
  function timingFields(timing) {
    if (!timing) return {};
    return { started_at: timing.startedAt || null, lead_time: typeof timing.leadTime === 'number' ? timing.leadTime : null };
  }

  /* The answer as stored on a history event (FR-087). Deliberately a
     whitelist of the three answer collections: it must never carry the
     source text or dataset row fields, and it must not pick up the
     reviewer-internal `decisions` / `reasons` keys that travel in the same
     payload. Cloned so a later in-place edit of live state cannot rewrite
     an event that already happened. */
  function buildResultSnapshot(payload) {
    if (!payload) return null;
    var snapshot = {};
    ['previewState', 'previewEntities', 'previewTriples'].forEach(function (field) {
      if (payload[field] != null) snapshot[field] = JSON.parse(JSON.stringify(payload[field]));
    });
    return Object.keys(snapshot).length ? snapshot : null;
  }

  function markSampleSubmitted(taskId, role, runType, sampleId, payload, historySummary, identity) {
    /* FR-101 (issue #908): an annotator write on an already-finalized unit
       is rejected outright, before any bucket read/write -- reviewer and
       project_leader roles are never subject to this guard. */
    if (role === 'annotator' && isAnnotatorWriteLocked(taskId, runType, sampleId, identity)) return false;
    var key = submissionBucketKey(taskId, role, runType, identity);
    var bucket = readSubmissionBucket(key);
    var existing = bucket[sampleId];
    var entry = { status: 'submitted', submittedAt: new Date().toISOString(), answers: payload || {} };
    if (existing && Array.isArray(existing.history)) entry.history = existing.history;
    var actorId = actorIdFor(role, identity);
    var decisions = role === 'reviewer' ? (payload && payload.decisions) || null : null;
    /* issue #583 (FR-086 R1): a reviewer submit writes only its per-outKey
       decision events -- the wrapper `submitted` event carried no answer
       (result_snapshot lived on the decision events already) and no
       information a decision event doesn't already express, so it is no
       longer written at all. `submitted` stays annotator-only. */
    if (decisions) {
      appendReviewDecisionEvents(entry, taskId, runType, sampleId, payload, historySummary, actorId, identity, decisions);
    } else {
      appendHistoryEvent(entry, 'submitted', role, historySummary, actorId, Object.assign(
        { result_snapshot: buildResultSnapshot(payload) },
        timingFields(payload && payload.timing)
      ));
    }
    /* issue #834 (FR-096, design.md D1): a dry-run annotator submission
       records the trial round it belongs to, so feedback can be gated per
       round rather than per task status. */
    if (role === 'annotator' && runType === 'dry_run') {
      entry.trialRound = currentTrialRound(taskId);
    }
    bucket[sampleId] = entry;
    writeSubmissionBucket(key, bucket);
    return true;
  }

  /* FR-086 / FR-092 emission points for the three REVIEW_DECISIONS values.
     A reviewer submit carries one decision per output type (FR-051); each
     decision maps to exactly one history action, per FR-086's v5.0.0
     revision -- `approve` always writes `accepted` (FR-092 point 1: "無異議，直接定稿"), `modify` writes `modified` (FR-092 point 2: the correction
     does not take effect immediately, it only opens a dispute), and
     `bypass` writes `bypassed` (FR-092 point 3). This is a closed one-to-one
     table, not a value-diff comparison -- AC-2.21's v5.0.0 revision fixes
     `modified`'s trigger to the decision itself. `reject` is not in
     REVIEW_DECISIONS (FR-092) and has no emission point here. */
  var REVIEW_DECISION_EVENT_ACTION = { approve: 'accepted', modify: 'modified', bypass: 'bypassed' };

  function reviewSummaryWithoutReasons(summary, reasons) {
    var sanitized = summary || '';
    Object.keys(reasons).forEach(function (outKey) {
      if (reasons[outKey]) sanitized = sanitized.split(' — ' + reasons[outKey]).join('');
    });
    return sanitized.trim();
  }

  function appendReviewDecisionEvents(entry, taskId, runType, sampleId, payload, summary, actorId, identity, decisions) {
    var reasons = (payload && payload.reasons) || {};
    /* issue #881: FR-089 made `reason` the single structured source. Keep
       this boundary defensive so a caller using the old combined summary
       shape cannot create another duplicated history card. */
    var sanitizedSummary = reviewSummaryWithoutReasons(summary, reasons);
    /* issue #583 (FR-088 R2): one submit measures one span of visible time,
       so only the first decision event this submit writes carries it --
       attaching the same started_at/lead_time to every outKey's event would
       repeat the same measurement N times for a single occurrence. "First"
       follows Object.keys(decisions) order, i.e. append order -- but issue
       #910's outKey-scoped dedup guard in appendHistoryEvent() can silently
       no-op an outKey's event (exact repeat of its last recorded event), so
       "first" here means the first outKey whose event actually gets pushed,
       not just the first candidate in iteration order: timingWritten only
       flips once appendHistoryEvent() reports a real push, so a deduped
       first candidate leaves the flag unset for the next genuinely-new
       outKey to claim. */
    var timingWritten = false;
    Object.keys(decisions).forEach(function (outKey) {
      var action = REVIEW_DECISION_EVENT_ACTION[decisions[outKey]];
      if (!action) return;
      var extra = { result_snapshot: buildResultSnapshot(payload), reason: reasons[outKey] || null, outKey: outKey };
      var attachingTiming = !timingWritten;
      if (attachingTiming) {
        Object.assign(extra, timingFields(payload && payload.timing));
      }
      var pushed = appendHistoryEvent(entry, action, 'reviewer', sanitizedSummary, actorId, extra);
      if (pushed && attachingTiming) timingWritten = true;
    });
  }

  /* Draft save (AC-2.3 / FR-013). Saving never downgrades an
     already-submitted sample back to 'saved' -- the submission stands and
     only its answers are refreshed (spec 015 has no un-submit transition);
     pending samples become 'saved'. */
  function markSampleSaved(taskId, role, runType, sampleId, payload, historySummary, identity) {
    /* FR-101 (issue #908): same guard as markSampleSubmitted -- see its
       comment for the trigger's reasoning. */
    if (role === 'annotator' && isAnnotatorWriteLocked(taskId, runType, sampleId, identity)) return false;
    var key = submissionBucketKey(taskId, role, runType, identity);
    var bucket = readSubmissionBucket(key);
    var existing = bucket[sampleId];
    var actorId = actorIdFor(role, identity);
    if (existing && entryStatus(existing) === 'submitted') {
      existing.answers = payload || {};
      existing.savedAt = new Date().toISOString();
      appendHistoryEvent(existing, 'draft_saved', role, historySummary, actorId, Object.assign(
        { result_snapshot: buildResultSnapshot(payload) },
        timingFields(payload && payload.timing)
      ));
    } else {
      var entry = { status: 'saved', savedAt: new Date().toISOString(), answers: payload || {} };
      if (existing && Array.isArray(existing.history)) entry.history = existing.history;
      appendHistoryEvent(entry, 'draft_saved', role, historySummary, actorId, Object.assign(
        { result_snapshot: buildResultSnapshot(payload) },
        timingFields(payload && payload.timing)
      ));
      bucket[sampleId] = entry;
    }
    writeSubmissionBucket(key, bucket);
    return true;
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

  /* FR-090 layered masking, applied AFTER FR-062 has already decided which
     events exist at all. Rule 1: an annotator viewer never obtains a peer
     annotator's event -- not a masked version of it, the whole event. The
     event row carries the per-output answer summary (FR-016B), so masking
     only `result_snapshot` would still hand the peer's answer over, which
     is the Data Fairness leak XROLE-11 exists to prevent. Reviewer viewers
     see every event FR-062 admitted for the review unit they are on.
     `viewer` is optional: callers that predate it get the unmasked merge,
     matching the behavior they were written against. */
  function maskHistoryForViewer(events, viewer) {
    if (!viewer || viewer.role !== 'annotator') return events;
    return events.filter(function (event) {
      return event.role !== 'annotator' || event.actorId === viewer.actorId;
    });
  }

  function getSampleHistory(taskId, runType, sampleId, identity, viewer) {
    var annotatorKey = submissionBucketKey(taskId, 'annotator', runType, identity);
    var reviewerPrefix = reviewerBucketPrefix(taskId, runType, identity);
    var merged = [];
    listSubmissionBucketKeys().forEach(function (key) {
      if (key !== annotatorKey && key.indexOf(reviewerPrefix) !== 0) return;
      var entry = readSubmissionBucket(key)[sampleId];
      if (!entry || !Array.isArray(entry.history)) return;
      /* FR-062 blind-review isolation (issue #410): an unsubmitted reviewer
         draft's history must stay visible only to that reviewer, never to
         peers -- a reviewer bucket only contributes once it has actually
         been submitted. The annotator's own bucket is explicitly exempt
         (FR-062: annotator save/submit events are part of the reviewed
         content itself). */
      if (key !== annotatorKey && entryStatus(entry) !== 'submitted') return;
      merged = merged.concat(entry.history);
    });
    merged.sort(function (a, b) {
      return String(a.at).localeCompare(String(b.at));
    });
    return maskHistoryForViewer(merged, viewer);
  }

  function getSubmittedSampleCount(taskId, role, runType, identity) {
    var bucket = readSubmissionBucket(submissionBucketKey(taskId, role, runType, identity));
    return Object.keys(bucket).filter(function (sampleId) {
      return entryStatus(bucket[sampleId]) === 'submitted';
    }).length;
  }

  /* issue #850: counts only THIS round's submissions, unlike
   * getSubmittedSampleCount() above -- submissionBucketKey() carries no
   * round dimension, so a bucket keeps every prior round's stale entries
   * forever, and a fresh R{n+1} would otherwise read as already fully
   * submitted from R{n}'s leftovers alone. An entry with no trialRound
   * stamp predates FR-096 (issue #834) and can only be R1 work, matching
   * getDryRunFeedback()'s own fallback for the same field. */
  function getCurrentRoundSubmittedCount(taskId, role, runType, identity) {
    var bucket = readSubmissionBucket(submissionBucketKey(taskId, role, runType, identity));
    var round = currentTrialRound(taskId);
    return Object.keys(bucket).filter(function (sampleId) {
      var entry = bucket[sampleId];
      if (entryStatus(entry) !== 'submitted') return false;
      return (entry.trialRound >= 1 ? entry.trialRound : 1) === round;
    }).length;
  }

  /* Bridges the workspace's per-sample submission tracking to
   * task-detail.html's dry-run completion status sync (that page's
   * syncStatusFromDryRunProgress() reads DRY_RUN_PROGRESS_KEY and flips the
   * task status to 'waiting_iaa_confirmation' once every dataset record has
   * been submitted). Annotator-only, dry_run-only -- reviewer decisions and
   * official_run submissions never drive this status transition.
   * issue #850: stamps the round this progress snapshot was taken for, so a
   * stale flag left over from an earlier round (now that task-detail's round
   * is live rather than fixed by a static seed) can be told apart from a
   * fresh one instead of blindly flipping status backward -- see
   * syncStatusFromDryRunProgress()'s matching round check. */
  function syncDryRunProgress(taskId, role, runType, totalSamples, identity) {
    if (runType !== 'dry_run' || role !== 'annotator') return;
    var submitted = getCurrentRoundSubmittedCount(taskId, role, runType, identity);
    try {
      global.localStorage.setItem(
        DRY_RUN_PROGRESS_KEY,
        JSON.stringify({
          runType: 'dry_run',
          taskId: taskId,
          round: currentTrialRound(taskId),
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
  function markSampleRejected(taskId, role, runType, sampleId, historySummary, identity, timing) {
    if (runType !== 'official_run') return;
    var key = submissionBucketKey(taskId, role, runType, identity);
    var bucket = readSubmissionBucket(key);
    var existing = bucket[sampleId];
    var actorId = actorIdFor('reviewer', identity);
    if (existing) {
      existing.status = 'pending';
      appendHistoryEvent(existing, 'rejected', 'reviewer', historySummary, actorId, timingFields(timing));
    } else {
      var entry = { status: 'pending', answers: {} };
      appendHistoryEvent(entry, 'rejected', 'reviewer', historySummary, actorId, timingFields(timing));
      bucket[sampleId] = entry;
    }
    writeSubmissionBucket(key, bucket);
  }

  /* FR-089: record something that happened TO a sample without moving where
   * that sample stands. Both callers write into the ANNOTATOR bucket, for
   * two different reasons that happen to point the same way:
   *   - skip is the annotator's own timeline to begin with;
   *   - adjudication is a reviewer act, but getSampleHistory drops any
   *     non-annotator bucket whose entry is not `submitted` (FR-062), and an
   *     arbiter normally has no submitted reviewer submission of their own --
   *     an `adjudicated` event left in the arbiter's bucket would be
   *     invisible to every viewer, forever. Same resolution markSampleRejected
   *     already uses: annotator bucket, reviewer role on the event.
   *
   * Status is deliberately untouched. `skipped` and `adjudicated` are events,
   * not sample states, so entryStatus() keeps its three-value contract and
   * "I set this one aside" cannot overwrite "how far I got on it".
   *
   * `reason` is required by FR-089 rather than merely expected: without the
   * guard, appendHistoryEvent's null-key drop would quietly emit a
   * reason-less event, which is the exact outcome FR-089 forbids. Silent
   * return follows markSampleRejected's run_type guard.
   *
   * `resultSnapshot` (issue #754) is optional and appended last so every
   * pre-existing positional call site (markSampleSkipped below) keeps
   * passing undefined for it without being touched -- appendHistoryEvent's
   * `!= null` filter already drops undefined/null extras, so an event with
   * no result to show (skipped, or an arbitration `reject`/`兩者皆非`
   * outcome) ends up with no `result_snapshot` key at all, same as before
   * this parameter existed. */
  function appendSampleTimelineEvent(taskId, runType, sampleId, action, role, reason, historySummary, identity, timing, resultSnapshot) {
    if (!reason) return false;
    /* FR-101 (issue #908): same guard as markSampleSubmitted -- see its
       comment for the trigger's reasoning. submitArbitration()'s reviewer-
       role call and any other non-annotator caller are unaffected. */
    if (role === 'annotator' && isAnnotatorWriteLocked(taskId, runType, sampleId, identity)) return false;
    var key = submissionBucketKey(taskId, 'annotator', runType, identity);
    var bucket = readSubmissionBucket(key);
    var entry = bucket[sampleId];
    if (!entry) {
      entry = { status: 'pending', answers: {} };
      bucket[sampleId] = entry;
    }
    appendHistoryEvent(entry, action, role, historySummary, actorIdFor(role, identity), Object.assign(
      { reason: reason, result_snapshot: resultSnapshot || null },
      timingFields(timing)
    ));
    writeSubmissionBucket(key, bucket);
    return true;
  }

  /* FR-089 / AC-2.20: the annotator sets a sample aside, saying why. New in
     v4.61.0 -- there was no skip action before this version. */
  function markSampleSkipped(taskId, runType, sampleId, reason, historySummary, identity, timing) {
    return appendSampleTimelineEvent(taskId, runType, sampleId, 'skipped', 'annotator', reason, historySummary, identity, timing);
  }

  /* Reviewer per-row decision drafts (issue #196, CONT-03): approve/reject
   * choices made before 送出審核 have no home in the submission bucket --
   * that bucket represents a FINAL saved/submitted answer, and every entry
   * write there appends a history event (appendHistoryEvent), which would
   * spam the 歷程 tab with a 'saved' entry on every single row click. A
   * separate, history-free bucket keyed the same way as the submission
   * buckets (task/role=reviewer/run/identity) holds just the in-progress
   * decision map per sample so a reload can restore it before the row
   * buttons render, without disturbing the review unit's actual status or
   * audit trail. */
  var REVIEW_DECISION_DRAFT_KEY_PREFIX = 'labelsuite.wsReviewDecisionDrafts.';

  function reviewDecisionDraftKey(taskId, runType, identity) {
    return REVIEW_DECISION_DRAFT_KEY_PREFIX + submissionBucketKey(taskId, 'reviewer', runType, identity);
  }

  function saveReviewRowDecisionDraft(taskId, runType, sampleId, decisions, identity) {
    var key = reviewDecisionDraftKey(taskId, runType, identity);
    var bucket = readJsonBucket(key);
    bucket[sampleId] = decisions;
    writeJsonBucket(key, bucket);
  }

  function getReviewRowDecisionDraft(taskId, runType, sampleId, identity) {
    var bucket = readJsonBucket(reviewDecisionDraftKey(taskId, runType, identity));
    return bucket[sampleId] || null;
  }

  function clearReviewRowDecisionDraft(taskId, runType, sampleId, identity) {
    var key = reviewDecisionDraftKey(taskId, runType, identity);
    var bucket = readJsonBucket(key);
    delete bucket[sampleId];
    writeJsonBucket(key, bucket);
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
   *   sequence_tagging          -> Array<{text, label, start, end}> (one per span)
   *   entity_recognition        -> Array<{text, type}>
   *   relation_identification   -> Array<{subj, rel, obj, relType, subjStart, subjEnd, objStart, objEnd}>
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
              { text: '台積電', label: 'ORG', start: 0, end: 3 }, { text: '魏哲家', label: 'PER', start: 6, end: 9 },
              { text: '今天', label: 'TIME', start: 9, end: 11 }, { text: '台北', label: 'LOC', start: 13, end: 15 }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: '台積電', label: 'ORG', start: 0, end: 3 }, { text: '魏哲家', label: 'PER', start: 6, end: 9 },
              { text: '今天', label: 'TIME', start: 9, end: 11 }, { text: '台北', label: 'LOC', start: 13, end: 15 }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            sequence_tagging: [
              { text: '台積電', label: 'ORG', start: 0, end: 3 }, { text: '魏哲家', label: 'PER', start: 6, end: 9 },
              { text: '今天', label: 'TIME', start: 9, end: 11 }, { text: '台北', label: 'LOC', start: 13, end: 15 }
            ]
          }
        }
      ],
      'sequence-tagging-002': [
        {
          annotator: 'kioleemg12',
          answers: {
            sequence_tagging: [
              { text: '衛福部', label: 'ORG', start: 0, end: 3 }, { text: '薛瑞元', label: 'PER', start: 5, end: 8 },
              { text: '三月十五日', label: 'TIME', start: 9, end: 14 }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: '衛福部', label: 'ORG', start: 0, end: 3 }, { text: '薛瑞元', label: 'PER', start: 5, end: 8 },
              { text: '三月十五日', label: 'TIME', start: 9, end: 14 }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            /* Disagreement: ends the TIME span one character early. */
            sequence_tagging: [
              { text: '衛福部', label: 'ORG', start: 0, end: 3 }, { text: '薛瑞元', label: 'PER', start: 5, end: 8 },
              { text: '三月十五', label: 'TIME', start: 9, end: 13 }
            ]
          }
        }
      ],
      'sequence-tagging-003': [
        {
          annotator: 'kioleemg12',
          answers: {
            sequence_tagging: [
              { text: '長庚醫院', label: 'ORG', start: 0, end: 4 }, { text: '陳日昌', label: 'PER', start: 11, end: 14 },
              { text: '桃園', label: 'LOC', start: 16, end: 18 }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: '長庚醫院', label: 'ORG', start: 0, end: 4 }, { text: '陳日昌', label: 'PER', start: 11, end: 14 },
              { text: '桃園', label: 'LOC', start: 16, end: 18 }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            sequence_tagging: [
              { text: '長庚醫院', label: 'ORG', start: 0, end: 4 }, { text: '陳日昌', label: 'PER', start: 11, end: 14 },
              { text: '桃園', label: 'LOC', start: 16, end: 18 }
            ]
          }
        }
      ],
      'sequence-tagging-004': [
        {
          annotator: 'kioleemg12',
          answers: {
            sequence_tagging: [
              { text: 'TSMC', label: 'ORG', start: 16, end: 20 }, { text: 'Taipei', label: 'LOC', start: 43, end: 49 },
              { text: 'today', label: 'TIME', start: 50, end: 55 }
            ]
          }
        },
        {
          annotator: '113450022',
          answers: {
            sequence_tagging: [
              { text: 'TSMC', label: 'ORG', start: 16, end: 20 }, { text: 'Taipei', label: 'LOC', start: 43, end: 49 },
              { text: 'today', label: 'TIME', start: 50, end: 55 }
            ]
          }
        },
        {
          annotator: 'tony0950127',
          answers: {
            sequence_tagging: [
              { text: 'TSMC', label: 'ORG', start: 16, end: 20 }, { text: 'Taipei', label: 'LOC', start: 43, end: 49 },
              { text: 'today', label: 'TIME', start: 50, end: 55 }
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

    /* T014-T016: review-flow demo tasks (Phase 2). T014 keeps the dry_run
     * 3-annotator convention; T015-T016 are official_run tasks with a
     * single annotator per sample. T015 deliberately OMITS
     * ofs-05-not-submitted: a sample with no mock row renders no review
     * unit, which is exactly that sample's demo point. Answers align with
     * the submissions seedReviewFlowDemo() stages, so the list's answer
     * column and the derived unit status always describe the same value. */
    T014: {
      'dry-01-all-agree': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } },
        { annotator: '113450022', answers: { single_label: 'positive' } },
        { annotator: 'tony0950127', answers: { single_label: 'positive' } }
      ],
      'dry-02-one-divergent': [
        { annotator: 'kioleemg12', answers: { single_label: 'neutral' } },
        { annotator: '113450022', answers: { single_label: 'neutral' } },
        { annotator: 'tony0950127', answers: { single_label: 'positive' } }
      ],
      'dry-03-dispute-open': [
        { annotator: 'kioleemg12', answers: { single_label: 'neutral' } },
        { annotator: '113450022', answers: { single_label: 'neutral' } },
        { annotator: 'tony0950127', answers: { single_label: 'neutral' } }
      ],
      'dry-04-dispute-resolved': [
        { annotator: 'kioleemg12', answers: { single_label: 'negative' } },
        { annotator: '113450022', answers: { single_label: 'neutral' } },
        { annotator: 'tony0950127', answers: { single_label: 'negative' } }
      ],
      'dry-05-pending-review': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } },
        { annotator: '113450022', answers: { single_label: 'positive' } },
        { annotator: 'tony0950127', answers: { single_label: 'positive' } }
      ]
    },

    T015: {
      'ofs-01-agree-gold': [
        { annotator: 'kioleemg12', answers: { single_label: 'negative' } }
      ],
      'ofs-02-modified-dispute': [
        { annotator: 'kioleemg12', answers: { single_label: 'neutral' } }
      ],
      'ofs-03-arbitrated-gold': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } }
      ],
      'ofs-04-pending-review': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } }
      ]
    },

    T016: {
      'ofm-01-reviewer-corrects-b': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } }
      ],
      'ofm-02-reviewer-accepts-a': [
        { annotator: 'kioleemg12', answers: { single_label: 'negative' } }
      ],
      'ofm-03-awaiting-arbitration': [
        { annotator: 'kioleemg12', answers: { single_label: 'neutral' } }
      ],
      'ofm-04-reviewer-bypass': [
        { annotator: 'kioleemg12', answers: { single_label: 'positive' } }
      ],
      'ofm-05-final-exception': [
        { annotator: 'kioleemg12', answers: { single_label: 'neutral' } }
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
        return (Array.isArray(answer) ? answer : []).map(function (span) { return span.label; });
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

  /* ---- Review unit enumeration (issue #792, spec 015 FR-055) ------------
   * SINGLE SOURCE OF TRUTH for which sample x annotator rows are review
   * units: the union of this sample's REVIEWER_MOCK_ROWS demo rows and any
   * annotator who has a stored SUBMITTED answer for this run_type but no
   * mock row of their own. An annotator missing both seed sources (no mock
   * row, no stored submission) is still excluded -- v6.3.1's invariant is
   * unchanged. Consumed by listReviewUnits() below plus annotation-list.html
   * and annotation-workspace.config.js (design.md D1/D2), so the three
   * enumerations can never disagree again.
   *
   * Rows beyond the mock set are synthesized in the SAME shape mock rows
   * ship (`{ annotator, answers, bypass }`) via convertSubmissionAnswer(),
   * so every downstream consumer of a mock row (answer cells, stats) works
   * on either kind without a branch. Only submitted answers qualify --
   * getSubmission() already returns null for drafts. */
  function getReviewUnitRows(taskId, runType, sampleId, outKeys) {
    var mockRows = getReviewerMockRows(taskId, sampleId);
    var known = {};
    mockRows.forEach(function (row) { known[row.annotator] = true; });

    var prefix = taskId + '::annotator::' + runType + '::';
    var suffix = '::' + NO_REVIEWER;
    var extras = [];
    listSubmissionBucketKeys().forEach(function (key) {
      if (key.indexOf(prefix) !== 0 || key.slice(-suffix.length) !== suffix) return;
      var annotatorId = key.slice(prefix.length, key.length - suffix.length);
      if (known[annotatorId]) return;
      var submission = getSubmission(taskId, 'annotator', runType, sampleId, { annotatorId: annotatorId });
      if (!submission) return;
      known[annotatorId] = true;
      extras.push({ annotatorId: annotatorId, submission: submission });
    });
    extras.sort(function (a, b) {
      return a.annotatorId < b.annotatorId ? -1 : a.annotatorId > b.annotatorId ? 1 : 0;
    });

    var extraRows = extras.map(function (extra) {
      var answers = {};
      var bypass = {};
      (outKeys || []).forEach(function (outKey) {
        answers[outKey] = convertSubmissionAnswer(outKey, extra.submission);
        bypass[outKey] = !!(extra.submission.previewBypass && extra.submission.previewBypass[outKey]);
      });
      return { annotator: extra.annotatorId, answers: answers, bypass: bypass };
    });

    return mockRows.concat(extraRows);
  }

  /* Converts a submitted OutputAnswer (engine previewState/previewEntities/
   * previewTriples shape) into the SAME CompactAnswer shape
   * REVIEWER_MOCK_ROWS ships, shared by both the workspace's live
   * signed-in-annotator row and the official_run list's single
   * real-annotator row (FR-047; the row was keyed 'current' before v3.8.0). */
  function convertSubmissionAnswer(outKey, submission) {
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
      /* FR-052: `(start, end)` is authoritative and `text` is the
         denormalized slice at those offsets, carried because the review list
         and review card render it directly. The source text travels with the
         answer as `textKey` (stamped by the engine when the panel renders),
         so no caller has to supply a tokenization of its own any more. */
      case 'sequence_tagging': {
        var sourceText = typeof ps.textKey === 'string' ? ps.textKey : '';
        return (Array.isArray(ps.spans) ? ps.spans : []).map(function (span) {
          return {
            text: sourceText.substring(span.start, span.end),
            label: span.label,
            start: span.start,
            end: span.end,
          };
        });
      }
      case 'entity_recognition':
        return (submission.previewEntities || []).map(function (e) { return { text: e.text, type: e.type }; });
      case 'relation_identification':
        /* FR-098 §4: serialize the four offset fields plus relType
         * alongside the existing display strings, symmetric with the
         * rehydration side (tasks.md 2.3). `!= null` (not `||`) because
         * `start`/`end` legitimately land on 0, and a missing source key
         * (relType is absent, not null, on sources that never set it)
         * MUST still come out as an explicit `null`, not `undefined`. */
        return (submission.previewTriples || []).map(function (tr) {
          return {
            subj: tr.subj,
            rel: tr.rel,
            obj: tr.obj,
            relType: tr.relType != null ? tr.relType : null,
            subjStart: tr.subjStart != null ? tr.subjStart : null,
            subjEnd: tr.subjEnd != null ? tr.subjEnd : null,
            objStart: tr.objStart != null ? tr.objStart : null,
            objEnd: tr.objEnd != null ? tr.objEnd : null,
          };
        });
      case 'free_text':
        return ps.text || '';
      default:
        return null;
    }
  }

  function entityMergeKey(ent) { return (ent && ent.text) + '::' + (ent && ent.type); }
  function relationMergeKey(tr) { return (tr && tr.subj) + '::' + (tr && tr.rel) + '::' + (tr && tr.obj); }
  function spanMergeKey(sp) { return (sp && sp.start) + '::' + (sp && sp.end) + '::' + (sp && sp.label); }

  /* ---- Review unit (spec 015 v5.0.0, issue #596 design.md D1) ------------
   * A review unit is `sample_id x annotator_id x run_type`: the same sample
   * annotated by three people is three independently reviewable units, in
   * BOTH run types. This replaces the run_type-branched review model, where
   * dry_run reviewed a merged consensus and official_run reviewed a single
   * annotator.
   *
   * issue #596: the single-owner relay model has NO quorum concept -- FR-093
   * assigns exactly one reviewer per unit, so that reviewer's decision is
   * immediately decisive. The former five-state / min_reviewers model
   * (approved/modified as "decided but short of quorum" interim states,
   * majority-of-N convergence) is retired:
   *
   *   no annotator submission                          -> null
   *   submitted, reviewer has not submitted             -> pending
   *   reviewer decided `approve` on every outKey        -> finalized (terminal)
   *   reviewer decided `modify`/`bypass` on any outKey,
   *     dispute item(s) not fully resolved              -> disputed
   *   every dispute item resolved via arbitration
   *     (adopt_a/adopt_b) or the exception pool
   *     (adopt_annotator/adopt_reviewer/custom_answer)  -> finalized (terminal)
   *   any outKey resolved via the exception pool's
   *     `exclude_from_dataset`                          -> stays disputed
   *     (排除記號；MUST NOT read as finalized, FR-063 -- no gold value)
   */
  var REVIEW_UNIT_STATUS = {
    PENDING: 'pending',
    DISPUTED: 'disputed',
    FINALIZED: 'finalized',
  };

  /* issue #596 (design.md D2): three closed vocabularies the single-owner
   * relay model renders from -- MUST NOT be hardcoded as per-value branches
   * anywhere (Generalization-First). Declared here rather than
   * annotation-workspace.config.js, which is a page-script IIFE with no
   * export surface: cross-file consumers (config.js, list/detail pages) all
   * read them off window.LabelSuiteAnnotationWorkspaceData. */
  var REVIEW_DECISIONS = ['approve', 'modify', 'bypass'];
  var ARBITRATION_OUTCOMES = ['adopt_a', 'adopt_b', 'reject'];
  var EXCEPTION_POOL_ACTIONS = ['adopt_annotator', 'adopt_reviewer', 'custom_answer', 'exclude_from_dataset'];
  var REVIEW_ASSIGNMENT_GRANULARITY = { dry_run: 'per_sample', official_run: 'per_unit' };

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
      /* FR-052: spans are a set keyed by `(start, end, label)`, so array
         order carries no meaning and a retag reads as one removal plus one
         addition -- 2 items whatever the span's length, where the retired
         positional walk over per-token pairs produced one per character. */
      case 'sequence_tagging':
        diffs = diffItemSets(annotatorAnswer, reviewerAnswer, spanMergeKey);
        break;
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
    var prefix = reviewerBucketPrefix(taskId, runType, identity);
    return listSubmissionBucketKeys()
      .filter(function (key) { return key.indexOf(prefix) === 0; })
      .map(function (key) {
        var entry = readSubmissionBucket(key)[sampleId];
        if (!entry || entryStatus(entry) !== 'submitted') return null;
        return { reviewerId: key.slice(prefix.length), answers: entry.answers, submittedAt: entry.submittedAt || null };
      })
      .filter(function (submission) { return submission !== null; });
  }

  /* issue #552 (FR-084): what the official_run annotator sees on a rework
   * todo -- every reviewer reject on this sample, with the reason that
   * reviewer typed (handleReviewSubmit persists `reasons` beside
   * `decisions`, issue #551). "Rework todo" is read off the annotator's own
   * entry the same way entryStatus()/markSampleRejected() wrote it: status
   * 'pending' with a 'rejected' event as its latest history item. dry_run
   * has no rollback channel (FR-014I), so it never yields anything. */
  function getReworkReasons(taskId, runType, sampleId, identity) {
    if (runType !== 'official_run') return [];
    var entry = readSampleEntry(taskId, 'annotator', runType, sampleId, identity);
    if (!entry || entryStatus(entry) !== 'pending' || !Array.isArray(entry.history)) return [];
    var last = entry.history[entry.history.length - 1];
    if (!last || last.action !== 'rejected') return [];
    var rows = [];
    readReviewerSubmissions(taskId, runType, sampleId, identity).forEach(function (submission) {
      var decisions = (submission.answers && submission.answers.decisions) || {};
      var reasons = (submission.answers && submission.answers.reasons) || {};
      Object.keys(decisions).forEach(function (outKey) {
        if (decisions[outKey] !== 'reject') return;
        rows.push({ outKey: outKey, reason: reasons[outKey] || '', reviewerId: submission.reviewerId, at: submission.submittedAt });
      });
    });
    return rows;
  }

  /* FR-096 / AC-1.27 (design.md D5, Data Fairness NON-NEGOTIABLE): source
   * actions on the merged trail that count as "this sample's dry-run review
   * is settled" -- the same closed set annotation-history.js's
   * ACTION_LABEL/BADGE_CLASS render, minus the ones that never conclude a
   * unit (submitted/draft_saved/skipped/modified/bypassed/rejected). Reused
   * as-is rather than re-deriving it, so a new terminal action added there
   * is not silently invisible here.
   *
   * `modified` and `bypassed` are excluded together, because FR-092 gives
   * them the same standing: a reviewer's `modify` and `bypass` decisions do
   * not take effect, they only push the item into the dispute pool, and it
   * is the arbiter's `adjudicated` that settles it. Treating `modified` as
   * a settling action would feed the reviewer's proposed-but-not-effective
   * value back to the annotator as the "finalized result" (issue #804). */
  var DRY_RUN_FEEDBACK_SOURCE_ACTIONS = {
    accepted: true,
    adjudicated: true,
    exception_resolved: true,
    excluded: true,
  };

  /* One feedback row per FR-096 point 2-4: my answer, the finalized result,
   * the settling action/decider, and the reason (if any) that action
   * carried. `null` when the sample's merged trail has no settling action
   * yet (round genuinely not concluded for this sample, e.g. a straggler
   * still in dispute past IAA confirmation) -- callers drop those instead
   * of rendering a half row. */
  function buildDryRunFeedbackRow(taskId, runType, sampleId, entry, identity) {
    var decisive = getSampleHistory(taskId, runType, sampleId, identity).filter(function (event) {
      return DRY_RUN_FEEDBACK_SOURCE_ACTIONS[event.action];
    });
    if (!decisive.length) return null;
    var last = decisive[decisive.length - 1];
    return {
      sampleId: sampleId,
      myAnswer: entry.answers || {},
      finalizedAnswer: last.result_snapshot || entry.answers || {},
      /* Unchanged only when every settling action on this sample was a
       * plain approve. `decisive` is already filtered through
       * DRY_RUN_FEEDBACK_SOURCE_ACTIONS, so a reviewer's `modified` can
       * never appear here (issue #804) -- the non-approve settling actions
       * that do are 'adjudicated', 'exception_resolved' and 'excluded'. A
       * task with several output keys can carry one 'accepted' and one of
       * those for the same sample, and that sample is still a "被修改" row
       * for FR-096 point 1's count. */
      modified: decisive.some(function (event) { return event.action !== 'accepted'; }),
      action: last.action,
      actorId: last.actorId,
      reason: last.reason || null,
    };
  }

  /* The task's current trial round r, from the same field the annotation
   * pages read for "試標回合 R{n}"; defaults to 1 (issue #834, design.md D1). */
  function currentTrialRound(taskId) {
    var detail = findTaskDetailProfile(taskId);
    var runs = detail && detail.materializedRuns;
    var round = runs && runs.dry_run && runs.dry_run.round;
    return round >= 1 ? round : 1;
  }

  /* Highest disclosable trial round per task status (design.md D2): the
   * in-progress round R{r} is never disclosable; every ended round is,
   * including after official_run starts. 0 = nothing disclosable. */
  var DISCLOSED_ROUND_OFFSET = {
    dry_run_in_progress: -1,
    waiting_iaa_confirmation: 0,
    official_run_in_progress: 0,
    completed: 0,
  };

  /* FR-096 試標歷史回饋 (Data Fairness NON-NEGOTIABLE): the annotator's own
   * dry-run feedback, gated PER ROUND IN THE DATA LAYER (issue #834) -- rows
   * of the in-progress round are never returned, not merely hidden by the
   * UI (data that reaches the browser has already leaked). Includes every
   * submitted sample of each disclosed round, not only the modified ones,
   * so the caller can compute FR-096 point 1's per-round ratio over the
   * true denominator. Each row carries its `round`. An entry without a
   * round stamp (written before D1) is withheld while a round is in
   * progress (fail closed) and attributed to the current round otherwise
   * (design.md D4). Scoped to one annotatorId by construction (the bucket
   * key and getSampleHistory's reviewer-bucket prefix both key off it), so
   * another annotator's answers never enter the result. */
  function getDryRunFeedback(taskId, runType, identity) {
    if (runType !== 'dry_run') return [];
    var listEntry = findTaskListEntry(taskId);
    if (!listEntry || !Object.prototype.hasOwnProperty.call(DISCLOSED_ROUND_OFFSET, listEntry.status)) return [];
    var currentRound = currentTrialRound(taskId);
    var maxRound = currentRound + DISCLOSED_ROUND_OFFSET[listEntry.status];
    if (maxRound < 1) return [];
    var inProgress = listEntry.status === 'dry_run_in_progress';
    var scopedIdentity = { annotatorId: (identity && identity.annotatorId) || DEFAULT_ANNOTATOR_ID };
    var bucket = readSubmissionBucket(submissionBucketKey(taskId, 'annotator', runType, scopedIdentity));
    var rows = [];
    Object.keys(bucket).forEach(function (sampleId) {
      var entry = bucket[sampleId];
      if (entryStatus(entry) !== 'submitted') return;
      var round = entry.trialRound >= 1 ? entry.trialRound : inProgress ? null : currentRound;
      if (round === null || round > maxRound) return;
      var row = buildDryRunFeedbackRow(taskId, runType, sampleId, entry, scopedIdentity);
      if (!row) return;
      row.round = round;
      rows.push(row);
    });
    return rows;
  }

  /* issue #551: a reviewer's per-outKey approve/reject decision, persisted
   * alongside the answers payload (collectAnswerPayload adds `decisions`
   * for the reviewer role only). Absent on every pre-#551 submission and on
   * every annotator submission -- both read as undefined, which every call
   * site below treats as "not a reject". */
  function reviewerOutKeyDecision(reviewerSubmission, outKey) {
    var decisions = reviewerSubmission.answers && reviewerSubmission.answers.decisions;
    return decisions && decisions[outKey];
  }

  /* issue #551: sentinel dispute-item value for a reject decision that
   * carries no correction ("純退回"). Deliberately NOT the annotator's own
   * value or null -- both would let the item read as agreement or as "no
   * answer", when the actual fact is "this reviewer objected and proposed
   * nothing to replace it with". A dedicated marker keeps that fact
   * distinguishable through tallying, rendering and arbitration. */
  var PURE_REJECT_VALUE = ' __PURE_REJECT__';

  /* Decisions that must not read as agreement on an outKey just because
   * compareOutputAnswer() sees no diff: `modify`/`bypass` (FR-051, spec.md
   * line 740: "任一項決策為 `modify` 或 `bypass` → `disputed`" -- a same-value
   * `modify` or a `bypass` left on the pre-filled preview panel is still a
   * real decision, not agreement). `reject` has not been a selectable
   * REVIEW_DECISIONS value since issue #596, and issue #837 retired its last
   * demo-seed producer (T014 dry-05, rewritten to a `bypass`) -- no seed row
   * writes a reviewer-level `reject` decision anymore. `reject` stays listed
   * here anyway: a submission carrying one (pre-migration data, or a
   * directly-constructed submission such as
   * issue-804-group2-reject-emission-cleanup.spec.ts's pure-reject
   * arbitration fixture) must still force a dispute rather than silently
   * finalize. Shared by anyReviewerChanged() and getDisputeItems() so the
   * two stay a single source of truth for which decisions force a dispute. */
  var DISPUTE_FORCING_DECISIONS = { modify: true, bypass: true, reject: true };

  /* True when ANY reviewer's answer differs from the annotator's on ANY of
   * the task's output keys, OR any reviewer's decision on an outKey is in
   * DISPUTE_FORCING_DECISIONS. This single predicate picks the lane in
   * FR-051: false -> finalized (unanimous approve), true -> disputed until
   * resolved (design.md D1).
   *
   * issue #750: `modify`/`bypass` were missing from this check entirely --
   * only `reject` was checked, so a same-value `bypass` or `modify` was
   * silently read as agreement and the unit finalized instead of disputed. */
  function anyReviewerChanged(annotatorSubmission, reviewerSubmissions, keys) {
    return reviewerSubmissions.some(function (reviewerSubmission) {
      return keys.some(function (outKey) {
        var equal = compareOutputAnswer(
          outKey,
          convertSubmissionAnswer(outKey, annotatorSubmission),
          convertSubmissionAnswer(outKey, reviewerSubmission.answers)
        ).equal;
        if (!equal) return true;
        var decision = reviewerOutKeyDecision(reviewerSubmission, outKey);
        return !!DISPUTE_FORCING_DECISIONS[decision];
      });
    });
  }

  /* Which of FR-051's two lanes the unit is on: 'same' when every reviewer
   * agreed with the annotator, 'differing' when at least one did not, null
   * while no reviewer has submitted (the lane is not decided yet).
   *
   * getReviewUnitStatus alone cannot answer this, because FINALIZED is
   * reachable from BOTH lanes -- unanimous agreement past the quorum, and a
   * resolved dispute. Anything drawing the unit's route needs the lane too.
   */
  function getReviewUnitLane(taskId, runType, sampleId, identity, outKeys) {
    var annotatorSubmission = getSubmission(taskId, 'annotator', runType, sampleId, identity);
    if (!annotatorSubmission) return null;
    var reviewerSubmissions = readReviewerSubmissions(taskId, runType, sampleId, identity);
    if (!reviewerSubmissions.length) return null;
    return anyReviewerChanged(
      annotatorSubmission, reviewerSubmissions, Array.isArray(outKeys) ? outKeys : []
    ) ? 'differing' : 'same';
  }

  /* Derives the review unit's state from the annotator's submission plus the
   * assigned reviewer's decision (design.md D1, issue #596). `outKeys` is
   * the task's composed output type list. Returns null when the annotator
   * has not submitted -- there is nothing to review yet.
   *
   * There is no quorum left to check (FR-093: exactly one reviewer per
   * unit) -- a submitted reviewer decision is immediately decisive:
   * unchanged on every outKey -> finalized; changed on any outKey
   * (`modify`/`bypass`) -> disputed until every dispute item resolves via
   * arbitration or the final exception pool. An `exclude_from_dataset`
   * exception-pool marker on ANY outKey blocks finalization outright
   * (checked first, independent of whether that outKey's values ever
   * differed) -- FR-063 forbids a gold value for an excluded item, so the
   * unit MUST NOT read as finalized while one is pending.
   *
   * The former resolveDisputeConvergence() majority-of-N convergence check
   * is gone entirely (issue #903) -- it had no reviewer-count input left to
   * run on once FR-093 made every unit single-owner, and while it survived
   * as an export the annotation list still consulted it to pick a finalized
   * unit's displayed answer. There is no majority path left to fall back to.
   *
   * issue #627 item 5: this derivation does not check whether the
   * reviewer(s) readReviewerSubmissions() finds are on the task's roster
   * or were actually assigned this unit -- it reads any reviewer bucket
   * under reviewerBucketPrefix(), keyed by whatever reviewerId wrote it.
   * That is deliberate: deriving a unit's status from what was submitted
   * is not the same job as gating who may see or submit it, and this
   * function does the former. getAssignedReviewUnits() is what filters
   * which units a reviewer's list page shows. A fixture that submits
   * under a reviewerId absent from the roster still produces a status
   * here -- expected, not a bug, but it means a test can accidentally
   * assert against a submission no live reviewer could have produced. */
  function getReviewUnitStatus(taskId, runType, sampleId, identity, outKeys) {
    var annotatorSubmission = getSubmission(taskId, 'annotator', runType, sampleId, identity);
    if (!annotatorSubmission) return null;

    var reviewerSubmissions = readReviewerSubmissions(taskId, runType, sampleId, identity);
    if (!reviewerSubmissions.length) return REVIEW_UNIT_STATUS.PENDING;

    var keys = Array.isArray(outKeys) ? outKeys : [];
    var exceptionPool = getExceptionPool(taskId, runType, sampleId, identity);
    var hasExclusion = keys.some(function (outKey) {
      var record = exceptionPool[outKey];
      return !!record && record.action === 'exclude_from_dataset';
    });
    if (hasExclusion) return REVIEW_UNIT_STATUS.DISPUTED;

    if (!anyReviewerChanged(annotatorSubmission, reviewerSubmissions, keys)) {
      return REVIEW_UNIT_STATUS.FINALIZED;
    }

    var items = getDisputeItems(taskId, runType, sampleId, identity, keys);
    var arbState = getArbitrationState(taskId, runType, sampleId, identity);
    var allResolved = items.length > 0 && items.every(function (item) {
      var stored = arbState[item.outKey + '::' + item.key];
      if (stored && stored.finalized_by) return true;
      var poolRecord = exceptionPool[item.outKey];
      return !!poolRecord && poolRecord.action !== 'exclude_from_dataset';
    });
    return allResolved ? REVIEW_UNIT_STATUS.FINALIZED : REVIEW_UNIT_STATUS.DISPUTED;
  }

  /* FR-101 (issue #908): annotator write-lock trigger, reused verbatim from
   * getReviewUnitStatus() rather than a second "does a reviewer decision
   * exist" check -- that function's own first line already requires a real
   * stored annotator submission (getSubmission(...) truthy) before it can
   * derive anything but null, so a unit only ever seeded through an FR-044a
   * demo-row reviewer decision (no real annotator submission underneath)
   * reads back as null here too, never FINALIZED. That is what exempts the
   * demo-row case for free, with no separate judgment path to fall out of
   * sync with the status derivation. outKeys come from
   * resolveTaskProfile(taskId).outputs, the same source the workspace host
   * itself uses to build the task's output type list. */
  function isAnnotatorWriteLocked(taskId, runType, sampleId, identity) {
    if (runType !== 'official_run') return false;
    var profile = resolveTaskProfile(taskId);
    var outKeys = (profile && profile.outputs || []).map(function (o) { return o.type; });
    return getReviewUnitStatus(taskId, runType, sampleId, identity, outKeys) === REVIEW_UNIT_STATUS.FINALIZED;
  }

  /* issue #824 (FR-093 本版修訂 1): the key a sticky lookup is built on.
   * U+0000 appears in no sample or annotator id, so two different units
   * can never collide onto one entry the way a printable separator could
   * (an annotator id containing the separator would merge them). */
  function stickyUnitKey(sampleId, annotatorId) {
    return String(sampleId) + '\u0000' + String(annotatorId);
  }

  /* Deterministic tie-break for the shape FR-093 forbids -- two reviewers
   * holding a submitted review on ONE official_run unit. Earliest
   * submittedAt wins, a missing timestamp sorts last, and the reviewer id
   * breaks a remaining tie. Without a total order here the sticky owner
   * would follow listSubmissionBucketKeys()' scan order, and "恆為該提交者"
   * would silently depend on storage iteration. */
  function stickyPrecedes(candidate, held) {
    if (candidate.submittedAt !== held.submittedAt) {
      if (!candidate.submittedAt) return false;
      if (!held.submittedAt) return true;
      return candidate.submittedAt < held.submittedAt;
    }
    return String(candidate.reviewerId) < String(held.reviewerId);
  }

  /* issue #824 (design.md D1): which review units already carry a stored
   * reviewer submission, as `{ stickyUnitKey(): reviewerId }`. This is the
   * whole fact stickiness needs -- no second, persisted assignment table,
   * which could contradict the submissions it claims to describe.
   *
   * Scanned once over every `taskId::reviewer::runType::annotator::reviewer`
   * bucket rather than by calling readReviewerSubmissions() per unit: same
   * prefix, same submitted-only condition (FR-062 -- a draft never sticks),
   * but O(bucket keys) instead of O(units x bucket keys). */
  function getStickyReviewers(taskId, runType) {
    var prefix = taskId + '::reviewer::' + runType + '::';
    var best = {};
    listSubmissionBucketKeys().forEach(function (key) {
      if (key.indexOf(prefix) !== 0) return;
      var tail = key.slice(prefix.length);
      var separator = tail.indexOf('::');
      if (separator < 0) return;
      var annotatorId = tail.slice(0, separator);
      var reviewerId = tail.slice(separator + 2);
      var bucket = readSubmissionBucket(key);
      Object.keys(bucket).forEach(function (sampleId) {
        if (entryStatus(bucket[sampleId]) !== 'submitted') return;
        var unitKey = stickyUnitKey(sampleId, annotatorId);
        var candidate = { reviewerId: reviewerId, submittedAt: bucket[sampleId].submittedAt || null };
        if (!best[unitKey] || stickyPrecedes(candidate, best[unitKey])) best[unitKey] = candidate;
      });
    });
    var stickyByUnit = {};
    Object.keys(best).forEach(function (unitKey) {
      stickyByUnit[unitKey] = best[unitKey].reviewerId;
    });
    return stickyByUnit;
  }

  /* issue #913: the one unit's sticky owner, for callers that already have
   * a taskId/runType/sampleId/identity in hand (renderArbitrationCard's B
   * side, buildExceptionPoolItemRow's 採審核員答案) and need to pick the
   * right entry out of readReviewerSubmissions() instead of its [0] --
   * listSubmissionBucketKeys()' sort order, not FR-093's sticky owner. Goes
   * through getStickyReviewers()/stickyUnitKey() rather than a second
   * derivation, per FR-093's no-second-assignment-table rule. */
  function getStickyReviewerId(taskId, runType, sampleId, identity) {
    var annotatorId = (identity && identity.annotatorId) || DEFAULT_ANNOTATOR_ID;
    return getStickyReviewers(taskId, runType)[stickyUnitKey(sampleId, annotatorId)] || null;
  }

  /* issue #596 (FR-093): the ONLY flow difference between run_types is
   * assignment granularity -- there is no manual-assignment mode, so this
   * is the sole, deterministic derivation both the workspace and the
   * list view (group 4) must agree on. Round-robins over `reviewerIds` in
   * the order `units` is given:
   *
   *   official_run (per_unit): one unit = one sample, spread 1-for-1
   *     across the roster. Any two reviewers' counts differ by at most 1
   *     by construction (ceil vs floor of unitCount / rosterCount) --
   *     no post-hoc balancing pass is needed.
   *   dry_run (per_sample): round-robins over DISTINCT sample_ids
   *     instead of units, so every unit sharing a sample_id inherits
   *     that sample's reviewer and one reviewer sees every annotator's
   *     answer for that sample together.
   *
   * `unit.annotator_id` is never consulted for eligibility: FR-093 states
   * a reviewer is NOT excluded from assignment merely for being the
   * unit's own annotator (that non-participant restriction applies only
   * to arbiters, FR-060). Determinism follows from using only the input
   * arrays' order -- no randomness, no wall-clock read -- so the same
   * `(runType, units, reviewerIds)` always yields the same assignment.
   *
   * issue #824 (design.md D2) adds an OPTIONAL fourth argument, the
   * `getStickyReviewers()` lookup: a unit found in it keeps its submitter
   * whatever the roster now looks like, and the positional deal walks only
   * the units left over. Optional, and the function stays pure, because
   * that purity is what lets callers feed it synthetic units without first
   * staging storage; reading the lookup is taskReviewAssignments()' job.
   * Omit it and the behavior is the pre-#824 one, verbatim. */
  function getReviewAssignments(runType, units, reviewerIds, stickyByUnit) {
    /* Sorted before anything else because assignment is positional -- the
       dry_run branch keys on a sample's first appearance and official_run
       walks the array with a fixed stride. Left in caller order, the list
       page and the workspace would each derive their own assignment from
       whatever order they happened to build `units` in, and a reviewer
       would see one set of units in the list and another in the
       workspace. Sorting here makes the assignment a property of the
       units themselves, so every caller agrees without having to know
       it is under an ordering obligation. */
    var list = (Array.isArray(units) ? units : []).slice().sort(function (a, b) {
      return a.sample_id === b.sample_id
        ? String(a.annotator_id).localeCompare(String(b.annotator_id))
        : String(a.sample_id).localeCompare(String(b.sample_id));
    });
    var roster = Array.isArray(reviewerIds) ? reviewerIds : [];
    var sticky = stickyByUnit || {};
    /* No early return on an empty roster: a unit whose reviewer already
       submitted keeps that reviewer even when nobody is checked any more
       (#824 symptom 2 -- otherwise emptying the roster erases the record of
       who reviewed what). Units with nobody to deal to are simply dropped,
       which is the same [] the old early return produced. */
    if (runType === 'dry_run') {
      /* per_sample granularity outranks per-unit stickiness (FR-093 本版
         修訂 3): one stuck unit takes its whole sample with it, so a sample
         is never split between two reviewers. */
      var sampleOrder = [];
      var seenSample = Object.create(null);
      var stickyBySample = Object.create(null);
      list.forEach(function (unit) {
        if (!seenSample[unit.sample_id]) {
          seenSample[unit.sample_id] = true;
          sampleOrder.push(unit.sample_id);
        }
        if (stickyBySample[unit.sample_id]) return;
        var sampleStickyId = sticky[stickyUnitKey(unit.sample_id, unit.annotator_id)];
        if (sampleStickyId) stickyBySample[unit.sample_id] = sampleStickyId;
      });
      var reviewerBySample = Object.create(null);
      var dealtSamples = 0;
      sampleOrder.forEach(function (sampleId) {
        if (stickyBySample[sampleId]) {
          reviewerBySample[sampleId] = stickyBySample[sampleId];
          return;
        }
        if (!roster.length) return;
        reviewerBySample[sampleId] = roster[dealtSamples % roster.length];
        dealtSamples += 1;
      });
      return list
        .filter(function (unit) { return !!reviewerBySample[unit.sample_id]; })
        .map(function (unit) {
          return {
            sample_id: unit.sample_id,
            annotator_id: unit.annotator_id,
            reviewer_id: reviewerBySample[unit.sample_id],
          };
        });
    }
    var assignments = [];
    var dealtUnits = 0;
    list.forEach(function (unit) {
      var reviewerId = sticky[stickyUnitKey(unit.sample_id, unit.annotator_id)];
      if (!reviewerId) {
        if (!roster.length) return;
        /* The stride counts only units being dealt, so FR-093 本版修訂 2's
           "任兩位審核員的分派筆數差距 MUST NOT 超過 1" is measured over the
           待分配池 rather than over a list whose stuck members would
           otherwise push the rotation off by their own count. */
        reviewerId = roster[dealtUnits % roster.length];
        dealtUnits += 1;
      }
      assignments.push({
        sample_id: unit.sample_id,
        annotator_id: unit.annotator_id,
        reviewer_id: reviewerId,
      });
    });
    return assignments;
  }

  /* issue #596: the roster that decides assignment lives HERE, not at any
   * call site -- callers only ever need "which units is THIS reviewer
   * assigned", never the roster itself, so the source can change in one
   * place instead of every call site. issue #617 is that change: FR-093
   * distributes review work "在被勾選的審核員之間平均分配", and 014
   * FR-010s-1 names `reviewer_ids` as that checked list, so the task's own
   * field is the roster. The REVIEWER_ROSTER demo seed remains the fallback
   * for tasks that seed no reviewer_ids -- dropping it would leave every
   * such task with no assignable reviewer instead of today's demo cast. */
  function taskReviewerRoster(taskId) {
    var profile = findTaskDetailProfile(taskId);
    return (profile && profile.reviewerIds && profile.reviewerIds.length)
      ? profile.reviewerIds.slice()
      : REVIEWER_ROSTER.map(function (r) { return r.id; });
  }

  /* issue #868 (FR-060): arbiter eligibility belongs to the task's own
     `arbiter_ids`, not the global demo roster. An explicitly empty array is
     meaningful (the PL chose no arbiter), so only a missing legacy field
     falls back to REVIEWER_ROSTER.can_arbitrate. */
  function taskArbiterRoster(taskId) {
    var profile = findTaskDetailProfile(taskId);
    if (profile && Array.isArray(profile.arbiterIds)) return profile.arbiterIds.slice();
    return REVIEWER_ROSTER
      .filter(function (reviewer) { return reviewer.can_arbitrate; })
      .map(function (reviewer) { return reviewer.id; });
  }

  /* issue #868 (FR-093): every designated arbiter is reserved from NEW
     review assignment. Preserve reviewer order because the positional deal
     depends on it; do not silently keep one arbiter in the pool when more
     than one was designated. */
  function reviewAssignmentRoster(reviewerIds, arbiterIds) {
    var reserved = Array.isArray(arbiterIds) ? arbiterIds : [];
    return (Array.isArray(reviewerIds) ? reviewerIds : []).filter(function (reviewerId) {
      return reserved.indexOf(reviewerId) === -1;
    });
  }

  /* issue #824 (FR-093 本版修訂 4): the read-only gate's membership test.
     Lives here, beside the roster the assignment itself is dealt from, so
     the workspace cannot answer "is this reviewer on the roster" from a
     second derivation that could drift from the first. */
  function isRosterReviewer(taskId, reviewerId) {
    return taskReviewerRoster(taskId).indexOf(reviewerId) >= 0;
  }

  /* issue #824 (design.md D3): the one entry point that combines the task's
     roster with its sticky lookup. Callers that have a taskId go through
     here; getReviewAssignments() stays the pure rule underneath. */
  function taskReviewAssignments(taskId, runType, units) {
    var roster = reviewAssignmentRoster(taskReviewerRoster(taskId), taskArbiterRoster(taskId));
    return getReviewAssignments(runType, units, roster, getStickyReviewers(taskId, runType));
  }

  function getAssignedReviewUnits(taskId, runType, reviewerId, units) {
    return taskReviewAssignments(taskId, runType, units)
      .filter(function (assignment) { return assignment.reviewer_id === reviewerId; })
      .map(function (assignment) {
        return { sample_id: assignment.sample_id, annotator_id: assignment.annotator_id };
      });
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
    if (taskArbiterRoster(taskId).indexOf(identity.reviewerId) === -1) return false;
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
        /* issue #750 (extends issue #551's `reject` case): a `bypass` left on
           the annotator's own value, or a `modify` left at that same value,
           produces no FR-052 diff (the compared value is unchanged), so
           compareOutputAnswer() has nothing to report -- synthesize one
           whole-outKey diff so the decision still becomes an arbitrable
           dispute item instead of silently vanishing (anyReviewerChanged()
           already routes the unit to `disputed` for every
           DISPUTE_FORCING_DECISIONS member; without this, `bypass`/`modify`
           would have no item left to resolve that dispute with).
           Granularity is the outKey itself (there is no differing sub-key
           to point at), matching the single_label/free_text "no merge key"
           shape.
           `reviewer: null` for `bypass` -- design.md D2's "bypass 不存值"
           makes an absent value the reliable bypass signal, the same
           null/'' reading arbitrationBChoiceText() and formatDisputeValue()
           already use, so the B choice renders as 無法判定 without needing
           the PURE_REJECT_VALUE sentinel. `reviewer: annotatorAnswer` for
           `modify` -- the reviewer did submit a real replacement value, it
           merely equals the annotator's. The `reject` branch below no
           longer has a demo-seed producer: issue #837 retired T014 dry-05,
           the last seed row that wrote a reviewer-level `reject` decision,
           rewriting it to a `bypass`. The branch and PURE_REJECT_VALUE stay
           live for a directly-constructed `reject` submission
           (pre-migration data, or
           issue-804-group2-reject-emission-cleanup.spec.ts's pure-reject
           arbitration fixture), which DISPUTE_FORCING_DECISIONS still
           routes here. */
        /* issue #753: `bypass` is decided by the DECISION, never by the diff.
           FR-061 point 2 (spec.md:779) says B's rendering "必須依決策來源動態
           決定" and that adopting a bypassed B "定案值記為無法判定，不得回填
           標記員原答案" -- so the bypass branch must override whatever the
           FR-052 comparison produced, not merely fill in for an empty one.
           Gating it on `!diffs.length` assumed design.md D2's "bypass 不存值"
           kept a bypassed answer out of the comparison, but D2 only governs
           `values`, and convertSubmissionAnswer() compares `previewState` --
           which collectAnswerPayload() clones unconditionally, so a reviewer
           who edits the panel and then bypasses still produces a diff and
           leaks that edit into both the B label and finalized_value.
           `modify` and `reject` stay gated: their diff, when there is one,
           already holds the reviewer's real replacement value. */
        var decision = reviewerOutKeyDecision(submission, outKey);
        if (decision === 'bypass') {
          diffs = [{ key: outKey, annotator: annotatorAnswer, reviewer: null }];
        } else if (!diffs.length) {
          if (decision === 'modify') {
            diffs = [{ key: outKey, annotator: annotatorAnswer, reviewer: annotatorAnswer }];
          } else if (decision === 'reject') {
            diffs = [{ key: outKey, annotator: annotatorAnswer, reviewer: PURE_REJECT_VALUE }];
          }
        }
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
   * (DisputeItem entity, FR-059). Everything else stays derived. Each dispute
   * ITEM lives under its own localStorage key
   * (`labelsuite.wsArbitration.<bucketKey>::<sampleId>::<itemId>`), NOT one
   * shared blob (issue #319, same-shape fix as #283's wsSubmissions split):
   * the bucket key (task × run_type × annotator) deliberately excludes
   * reviewerId so multiple arbiters share a bucket, and one bucket also
   * spans every sample/item of that annotator's review units -- splitting
   * only at the #283 bucket granularity would still let two arbiters
   * finalizing DIFFERENT samples (or items) in the same bucket clobber each
   * other's whole-blob snapshot. Item-level keys make concurrent writes to
   * different items non-overlapping by construction; two arbiters racing the
   * SAME item still last-write-wins, the same accepted caveat as #283. The
   * bare legacy whole-blob key is fanned out once at boot by
   * migrateLegacyArbitrationStore(). */
  var ARBITRATION_STORAGE_KEY = 'labelsuite.wsArbitration';
  var ARBITRATION_KEY_PREFIX = 'labelsuite.wsArbitration.';

  function arbitrationBucketKey(taskId, runType, identity) {
    identity = identity || {};
    return taskId + '::' + runType + '::' + (identity.annotatorId || DEFAULT_ANNOTATOR_ID);
  }

  function arbitrationItemKey(bucketKey, sampleId, itemId) {
    return bucketKey + '::' + sampleId + '::' + itemId;
  }

  function readArbitrationItem(itemKey) {
    try {
      var raw = global.localStorage.getItem(ARBITRATION_KEY_PREFIX + itemKey);
      var parsed = raw ? JSON.parse(raw) : null;
      /* A key holding "null" (or any non-object) degrades to "no item"
         instead of throwing downstream, mirroring readSubmissionBucket's
         tolerance for corrupt content. */
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeArbitrationItem(itemKey, item) {
    try {
      global.localStorage.setItem(ARBITRATION_KEY_PREFIX + itemKey, JSON.stringify(item));
    } catch (e) {
      /* storage unavailable: same silent-tolerant stance as writeSubmissionBucket */
    }
  }

  /* Item keys currently in storage, for getArbitrationState's prefix scan.
   * Sorted for the same cross-browser determinism reason as
   * listSubmissionBucketKeys (localStorage.key(i) order is implementation-
   * defined). */
  function listArbitrationItemKeys() {
    var keys = [];
    try {
      for (var i = 0; i < global.localStorage.length; i++) {
        var key = global.localStorage.key(i);
        if (key && key.indexOf(ARBITRATION_KEY_PREFIX) === 0) {
          keys.push(key.slice(ARBITRATION_KEY_PREFIX.length));
        }
      }
    } catch (e) {
      /* storage unavailable: nothing to list */
    }
    return keys.sort();
  }

  /* One-shot fan-out of the pre-issue-#319 whole-blob arbitration store into
   * per-item keys, mirroring migrateLegacySubmissionStore(). Existing
   * per-item keys win over the legacy copy; the legacy key is removed either
   * way. */
  function migrateLegacyArbitrationStore() {
    try {
      var raw = global.localStorage.getItem(ARBITRATION_STORAGE_KEY);
      if (!raw) return;
      var store = JSON.parse(raw);
      if (store && typeof store === 'object') {
        Object.keys(store).forEach(function (bucketKey) {
          var bucket = store[bucketKey];
          if (!bucket || typeof bucket !== 'object') return;
          Object.keys(bucket).forEach(function (sampleId) {
            var items = bucket[sampleId];
            if (!items || typeof items !== 'object') return;
            Object.keys(items).forEach(function (itemId) {
              var itemKey = arbitrationItemKey(bucketKey, sampleId, itemId);
              if (!global.localStorage.getItem(ARBITRATION_KEY_PREFIX + itemKey)) {
                writeArbitrationItem(itemKey, items[itemId]);
              }
            });
          });
        });
      }
      global.localStorage.removeItem(ARBITRATION_STORAGE_KEY);
    } catch (e) {
      /* corrupt legacy blob or unavailable storage: drop it rather than
         blocking boot */
      try {
        global.localStorage.removeItem(ARBITRATION_STORAGE_KEY);
      } catch (e2) {
        /* storage unavailable: nothing to clean up */
      }
    }
  }

  /* Returns { [itemId]: { votes: [{arbiter_id, choice, voted_at}],
   * finalized_value?, finalized_by? } } for one review unit; itemId is the
   * getDisputeItems() identity `outKey::key`. */
  function getArbitrationState(taskId, runType, sampleId, identity) {
    var prefix = arbitrationBucketKey(taskId, runType, identity) + '::' + sampleId + '::';
    var result = {};
    listArbitrationItemKeys().forEach(function (key) {
      if (key.indexOf(prefix) !== 0) return;
      var item = readArbitrationItem(key);
      if (item) result[key.slice(prefix.length)] = item;
    });
    return result;
  }

  /* ---- Final exception pool (design.md D2, issue #596) -------------------
   * Read-only awareness for getReviewUnitStatus(): an outKey resolved via
   * `exclude_from_dataset` must count as "handled" for the dispute pool but
   * MUST NOT let the unit read as finalized (FR-063 -- an excluded item
   * produces no gold value). The write path (FR-095's project-leader
   * resolution screen) lands in group 6; this only reads whatever is
   * already stored, addressed the same `task_id x run_type x annotator_id x
   * sample_id` way every other review-unit bucket is (matching
   * arbitrationBucketKey()), as ONE blob per unit keyed by outKey:
   * `{ [outKey]: { resolver_id, action, finalized_value?, reason,
   * resolved_at } }`. */
  var EXCEPTION_POOL_KEY_PREFIX = 'labelsuite.wsExceptionPool.';

  function exceptionPoolKey(taskId, runType, sampleId, identity) {
    return arbitrationBucketKey(taskId, runType, identity) + '::' + sampleId;
  }

  function getExceptionPool(taskId, runType, sampleId, identity) {
    try {
      var raw = global.localStorage.getItem(
        EXCEPTION_POOL_KEY_PREFIX + exceptionPoolKey(taskId, runType, sampleId, identity)
      );
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  /* Demo identity for the one role this prototype never lets the visitor
   * pick via query params (task 6.2 does not extend resolveIdentity() --
   * no test or UI need names a second project leader): mirrors
   * task-detail.html's ROLE_SELF_EMAIL.project_leader convention so a
   * `resolver_id` reads as the same demo account across pages. */
  var DEFAULT_PROJECT_LEADER_ID = 'mandy@labelsuite.io';

  /* Final exception pool WRITE path (FR-095, issue #596, task 6.2). The read
   * side above (getExceptionPool) and getReviewUnitStatus() already existed
   * and are untouched -- this is the only function that ever writes a
   * poolRecord, one per outKey, merged into the same blob getExceptionPool
   * reads. Shape matches design.md D2 exactly: `finalized_value` is the
   * absent-field sentinel for `exclude_from_dataset` (FR-063 -- an excluded
   * item produces no gold value), never `null`.
   *
   * Also appends ONE history event (FR-086/FR-095 closing line) into the
   * ANNOTATOR's bucket -- same resolution markSampleRejected/
   * appendSampleTimelineEvent use for a reviewer/arbiter act on someone
   * else's unit (comment at markSampleSkipped above), and the same reason
   * getSampleHistory's FR-062 masking only admits a `submitted` reviewer
   * bucket. Unlike appendSampleTimelineEvent, `reason` is NOT required here:
   * FR-095's `adopt_annotator`/`adopt_reviewer` are one-click actions with no
   * reason field in the UI (design.md/Red test contract), so gating the
   * event on a non-empty reason would silently drop it for those two. */
  function resolveExceptionPoolItem(taskId, runType, sampleId, identity, outKey, action, value, reason) {
    var pool = getExceptionPool(taskId, runType, sampleId, identity);
    var record = {
      resolver_id: DEFAULT_PROJECT_LEADER_ID,
      action: action,
      reason: reason || '',
      resolved_at: new Date().toISOString(),
    };
    if (action !== 'exclude_from_dataset') record.finalized_value = value;
    pool[outKey] = record;
    try {
      global.localStorage.setItem(
        EXCEPTION_POOL_KEY_PREFIX + exceptionPoolKey(taskId, runType, sampleId, identity),
        JSON.stringify(pool)
      );
    } catch (e) {
      /* storage unavailable: same silent-tolerant stance as writeArbitrationItem */
    }

    var bucketKey = submissionBucketKey(taskId, 'annotator', runType, identity);
    var bucket = readSubmissionBucket(bucketKey);
    var entry = bucket[sampleId];
    if (!entry) {
      entry = { status: 'pending', answers: {} };
      bucket[sampleId] = entry;
    }
    appendHistoryEvent(
      entry,
      action === 'exclude_from_dataset' ? 'excluded' : 'exception_resolved',
      'project_leader',
      'exception pool resolved: ' + outKey,
      DEFAULT_PROJECT_LEADER_ID,
      { reason: reason || null }
    );
    writeSubmissionBucket(bucketKey, bucket);
  }

  /* Writes one arbiter's complete pass over a unit's open dispute items:
   * `decisions` is [{itemId, choice: ARBITRATION_OUTCOMES, value, reason}]
   * where `value` is the concrete winning value for adopt_a/adopt_b
   * (adopt_a -> annotatorValue, adopt_b -> the reviewer value) and null for
   * `reject`. The prototype has a single arbiter per claim, so each
   * adopt_a/adopt_b vote finalizes its item immediately.
   *
   * issue #596 (FR-061 point 3, design.md D2): `reject` (兩者皆非) is NOT a
   * finalization -- it records the arbiter's vote and reason like any other
   * choice, but deliberately leaves finalized_value/finalized_by unset. An
   * absent field is D2's chosen sentinel ("欄位不存在是天然的哨兵", the same
   * convention `bypass` uses for `values[outKey]`), not `null`: the pool
   * queue this feeds (task 6.2) and getReviewUnitStatus()'s allResolved
   * check both read "no finalized_by" as "still open", which is exactly
   * reject's status until a project leader resolves it (D2's exceptionPool
   * record, written only by task 6.2 -- never here).
   *
   * A resubmission by the same arbiter (issue #199: double-click /
   * re-trigger) overwrites that arbiter's existing votes[] entry in place
   * instead of appending a duplicate -- finalized_value/finalized_by are
   * already last-write-wins for the same item, so votes[] must stay one
   * entry per arbiter to match. */

  /* issue #754: the definitive result for the 'adjudicated' history event,
     reusing the SAME buildResultSnapshot(payload) shape (previewState /
     previewEntities / previewTriples) that every other settling action
     already writes -- FR-096's dry-run feedback (buildDryRunFeedbackRow())
     runs BOTH myAnswer and finalizedAnswer through convertSubmissionAnswer(),
     which reads that exact shape, so `adjudicated` must match it too instead
     of the lossy CompactAnswer shape `decision.value` carries.
     `adopt_a` finalizes to the annotator's own submitted payload,
     `adopt_b` to the unit's one assigned reviewer's submitted payload
     (FR-093: exactly one reviewer per unit, so reviewerSubmissions[0] is
     unambiguous -- the same lookup buildArbitrationCard() uses in
     annotation-workspace.config.js). `reject` ("兩者皆非") finalizes to
     nothing, matching design.md D2's "bypass 不存值" convention: returning
     null here means appendSampleTimelineEvent's `resultSnapshot || null`
     leaves `result_snapshot` off the event entirely (appendHistoryEvent's
     `!= null` filter), the same "absent, not a stored null" outcome bypass
     already gets. */
  function arbitrationFinalizedSnapshot(taskId, runType, sampleId, identity, choice) {
    if (choice === 'adopt_a') {
      var annotatorAnswers = getSubmission(taskId, 'annotator', runType, sampleId, identity);
      return annotatorAnswers ? buildResultSnapshot(annotatorAnswers) : null;
    }
    if (choice === 'adopt_b') {
      var reviewerSubmission = readReviewerSubmissions(taskId, runType, sampleId, identity)[0];
      return reviewerSubmission ? buildResultSnapshot(reviewerSubmission.answers) : null;
    }
    return null;
  }

  function submitArbitration(taskId, runType, sampleId, identity, decisions) {
    var bucketKey = arbitrationBucketKey(taskId, runType, identity);
    var arbiterId = (identity && identity.reviewerId) || DEFAULT_REVIEWER_ID;
    (decisions || []).forEach(function (decision) {
      var itemKey = arbitrationItemKey(bucketKey, sampleId, decision.itemId);
      var item = readArbitrationItem(itemKey) || { votes: [] };
      var vote = { arbiter_id: arbiterId, choice: decision.choice, voted_at: new Date().toISOString() };
      if (decision.reason) vote.reason = decision.reason;
      var existingIndex = -1;
      item.votes.forEach(function (v, i) {
        if (v.arbiter_id === arbiterId) existingIndex = i;
      });
      if (existingIndex === -1) {
        item.votes.push(vote);
      } else {
        item.votes[existingIndex] = vote;
      }
      if (decision.choice === 'reject') {
        delete item.finalized_value;
        delete item.finalized_by;
      } else {
        item.finalized_value = decision.value;
        item.finalized_by = arbiterId;
      }
      writeArbitrationItem(itemKey, item);
      /* FR-089 / AC-3.50 (new in v4.61.0): before this version arbitration
         was the only terminal action in the workspace that left no trace in
         history at all -- votes and finalized_value were written, and the
         歷程 tab showed nothing. One event per finalized item, because the
         reason is asked per item. */
      appendSampleTimelineEvent(
        taskId, runType, sampleId, 'adjudicated', 'reviewer',
        decision.reason, '', identity,
        undefined, arbitrationFinalizedSnapshot(taskId, runType, sampleId, identity, decision.choice)
      );
    });
  }

  /* issue #722: an arbiter's workspace progress counter must count
   * arbitration submissions too -- submitArbitration() is a write path
   * isSampleSubmitted() (keyed off markSampleSubmitted's own status field)
   * never sees. A unit counts as arbitrated once every one of its CURRENT
   * dispute items carries a vote from this identity, mirroring
   * isSampleSubmitted()'s per-unit completeness check. Deliberately checks
   * for a vote, not `finalized_by`: a `reject` vote (D2's sentinel) is a
   * real, complete submission that still leaves finalized_by unset. */
  function isArbitrationSubmitted(taskId, runType, sampleId, identity, outKeys) {
    var items = getDisputeItems(taskId, runType, sampleId, identity, outKeys);
    if (!items.length) return false;
    var arbState = getArbitrationState(taskId, runType, sampleId, identity);
    var arbiterId = (identity && identity.reviewerId) || DEFAULT_REVIEWER_ID;
    return items.every(function (item) {
      var stored = arbState[item.outKey + '::' + item.key];
      return !!stored && (stored.votes || []).some(function (vote) { return vote.arbiter_id === arbiterId; });
    });
  }

  /* ---- Reviewer task summary (spec 015 v4.27.0 FR-072, issue #450) ------
   * SINGLE SOURCE OF TRUTH for the reviewer counters shown on the dashboard
   * task card and the annotation-list task info card. Both used to print a
   * prebuilt display string from dashboard.assignments.js while the review
   * unit rows on the same screen derived their state from storage, so a
   * finished review flipped the row to 已定稿 while the summary above it
   * still promised 待審 1 筆.
   *
   * Review units are enumerated exactly the way annotation-list's
   * buildAllReviewUnitRows() enumerates its rows -- one unit per
   * datasetRecord x getReviewUnitRows() row (issue #792: the mock rows plus
   * any submitted-but-unlisted annotator, design.md D1) -- and each one's
   * state comes from getReviewUnitStatus(). A unit whose annotator has not
   * submitted derives null and is counted as 待審, matching the row's own
   * `|| PENDING` fallback. */
  function listReviewUnits(taskId, runType) {
    var listEntry = findTaskListEntry(taskId);
    var detail = findTaskDetailProfile(taskId);
    if (!listEntry || !detail) return [];
    var outKeys = listEntry.outputTypes || [];
    var units = [];
    (detail.datasetRecords || []).forEach(function (record, index) {
      var sampleId = getRecordId(record, index);
      getReviewUnitRows(taskId, runType, sampleId, outKeys).forEach(function (row) {
        units.push({
          sampleId: sampleId,
          annotatorId: row.annotator,
          status: getReviewUnitStatus(
            taskId, runType, sampleId, { annotatorId: row.annotator }, outKeys),
        });
      });
    });
    return units;
  }

  /* issue #891: live item-level queues shared by Task Detail's Member
   * Management and Annotation Progress surfaces. A review unit is the
   * Dashboard's status granularity, but arbitration and final-exception
   * work is one row per disputed output item, so exposing only the unit
   * summary cannot keep those two pool counts accurate.
   *
   * Both queues are derived from the same storage-backed primitives that
   * drive the workspace itself. An item already finalized by arbitration
   * or covered by a project-leader exception-pool record belongs to neither
   * live queue. Of the remaining items, a latest reject vote moves the item
   * to the final-exception queue; every other unresolved dispute is still
   * awaiting valid arbitration. */
  function listReviewPoolItems(taskId, runType) {
    var result = { awaitingArbitration: [], pendingExceptions: [] };
    var listEntry = findTaskListEntry(taskId);
    if (!listEntry) return result;
    var outKeys = listEntry.outputTypes || [];

    listReviewUnits(taskId, runType).forEach(function (unit) {
      if (unit.status !== REVIEW_UNIT_STATUS.DISPUTED) return;
      var identity = { annotatorId: unit.annotatorId };
      var exceptionPool = getExceptionPool(taskId, runType, unit.sampleId, identity);
      var arbitrationState = getArbitrationState(taskId, runType, unit.sampleId, identity);
      var reviewerIds = readReviewerSubmissions(taskId, runType, unit.sampleId, identity)
        .map(function (submission) { return submission.reviewerId; });

      getDisputeItems(taskId, runType, unit.sampleId, identity, outKeys)
        .forEach(function (item) {
          var stored = arbitrationState[item.outKey + '::' + item.key];
          if (exceptionPool[item.outKey] || (stored && stored.finalized_by)) return;
          var rejectVote = stored && (stored.votes || []).filter(function (vote) {
            return vote.choice === 'reject';
          }).pop();
          var poolItem = {
            taskId: taskId,
            runType: runType,
            sampleId: unit.sampleId,
            annotatorId: unit.annotatorId,
            outKey: item.outKey,
            key: item.key,
            outputType: item.outKey,
            reviewerIds: reviewerIds,
            arbiterId: rejectVote ? rejectVote.arbiter_id : '',
            reason: rejectVote ? (rejectVote.reason || '') : '',
            fellAt: rejectVote ? rejectVote.voted_at : '',
          };
          result[rejectVote ? 'pendingExceptions' : 'awaitingArbitration'].push(poolItem);
        });
    });
    return result;
  }

  /* issue #761: 014's 審核指派 table used to read a hand-seeded per-reviewer
     workload, so it could not satisfy 014 AC-1.6 ("Overview 調整
     `reviewer_ids` 勾選並儲存後，負荷分布即時反映") or SC-034 ("與成員清單
     「審核負荷」欄即時一致") -- a static seed cannot react to anything. The
     numbers live here, beside the assignment rule that produces them, for
     the same reason computeReviewSummary() does (issue #501): the table and
     the workspace must never disagree about who owns which unit.

     `reviewerIds` is the task's STORED `reviewer_ids`, deliberately NOT
     pre-filtered to active members. FR-005j requires that removing or
     disabling a reviewer who still holds 待審 work returns that `pending`
     to the unassigned pool while `done` stays as historical stats -- which
     only works if their units are still attributed to them first and then
     split by liveness. Pre-filtering would instead silently re-deal their
     work to whoever is left, and the unassigned pool would never move.

     A unit counts as `done` for its assigned reviewer once that reviewer's
     submission exists, which is exactly what takes the unit past `pending`
     -- `disputed` means reviewed-and-escalated, not unreviewed. */
  function computeReviewWorkload(taskId, runType, reviewerIds, activeReviewerIds) {
    var units = listReviewUnits(taskId, runType);
    var statusByUnit = {};
    units.forEach(function (unit) {
      statusByUnit[unit.sampleId + '::' + unit.annotatorId] = unit.status;
    });
    /* getReviewAssignments() sorts its input before dealing, so the result
       cannot be zipped back by index -- join on the unit identity instead. */
    /* issue #824: the sticky lookup is passed in, but `reviewerIds` stays
       the caller's STORED roster (see above) -- the two consumers share the
       fact of who already reviewed what, not a roster. Swapping in
       taskReviewerRoster() here would re-deal a departed reviewer's units
       before the liveness split below ever sees them, and the unassigned
       pool FR-005j requires would never move. */
    var assignmentRoster = reviewAssignmentRoster(reviewerIds, taskArbiterRoster(taskId));
    var assignments = getReviewAssignments(runType, units.map(function (unit) {
      return { sample_id: unit.sampleId, annotator_id: unit.annotatorId };
    }), assignmentRoster, getStickyReviewers(taskId, runType));
    var active = Array.isArray(activeReviewerIds) ? activeReviewerIds : [];
    var byReviewer = {};
    /* An empty roster leaves getReviewAssignments() with nothing to deal,
       so every unit it dropped is unassigned by definition. */
    var unassigned = units.length - assignments.length;
    assignments.forEach(function (assignment) {
      var status = statusByUnit[assignment.sample_id + '::' + assignment.annotator_id];
      var reviewed = status === REVIEW_UNIT_STATUS.DISPUTED
        || status === REVIEW_UNIT_STATUS.FINALIZED;
      if (!byReviewer[assignment.reviewer_id]) {
        byReviewer[assignment.reviewer_id] = { pending: 0, done: 0 };
      }
      if (reviewed) {
        byReviewer[assignment.reviewer_id].done += 1;
      } else if (active.indexOf(assignment.reviewer_id) < 0) {
        unassigned += 1;
      } else {
        byReviewer[assignment.reviewer_id].pending += 1;
      }
    });
    return { byReviewer: byReviewer, unassigned: unassigned };
  }

  /* Issue #449 keeps the enumeration in listReviewUnits() and leaves this
     the projection the counters need, so the summary and the quick-review
     target can never disagree about which units exist. */
  function listReviewUnitStatuses(taskId, runType) {
    return listReviewUnits(taskId, runType).map(function (unit) { return unit.status; });
  }

  /* The counting formulas, defined once:
   *   total       = review units
   *   pending     = units nobody has reviewed yet
   *   disputed    = units sitting in the dispute pool
   *   unfinalized = total - finalized (pending units included: not final)
   *   coveragePct = round((total - pending) / total * 100), 0 when total = 0
   * 審核覆蓋率 is the share of units past 待審, NOT a completion rate
   * (issue #310): a unit past MY review can still be approved-but-short-of-
   * quorum, modified or disputed, so 100% coverage must never be rendered
   * as a finished task -- read `unfinalized`/`disputed` for that.
   *
   * `derivable` is false when NO unit has stored review-unit state at all;
   * the task then has nothing to derive and its consumer keeps the seeded
   * illustrative summary. The condition is the presence of data, never a
   * task id (Generalization-First). */
  function computeReviewSummary(taskId, runType) {
    var statuses = listReviewUnitStatuses(taskId, runType);
    var counts = { pending: 0, approved: 0, modified: 0, disputed: 0, finalized: 0 };
    var derivable = false;
    statuses.forEach(function (status) {
      if (status === null) { counts.pending += 1; return; }
      derivable = true;
      if (counts[status] !== undefined) counts[status] += 1;
    });
    var total = statuses.length;
    return {
      total: total,
      pending: counts.pending,
      approved: counts.approved,
      modified: counts.modified,
      disputed: counts.disputed,
      finalized: counts.finalized,
      unfinalized: total - counts.finalized,
      coveragePct: total === 0 ? 0 : Math.round(((total - counts.pending) / total) * 100),
      derivable: derivable,
    };
  }

  /* Renders a computeReviewSummary() result as the localized summary text
   * both consumers display. One rule, no per-task branches: coverage is
   * always shown, every other counter appears only when non-zero, so a
   * vacuous "待審 0 個" never crowds out the 爭議中 breakdown that
   * actually needs the reviewer's attention. `iaa` is the seed's
   * structured inter-annotator agreement value (not derivable from review
   * units) and is omitted when absent.
   *
   * Issue #452: coverage leads the line and names both its subject (任務)
   * and its denominator unit (個審核單位) as a raw x / total count instead
   * of a bare percentage, because the same page also shows a per-reviewer
   * count and a per-unit threshold count -- three numbers that used to be
   * spelled 「已審 / 覆蓋」 alike. The counters that follow inherit that
   * unit, so 「任務覆蓋 5 / 5 個審核單位 · 爭議中 3 個」 reads as one
   * sentence and full coverage can no longer be misread as a finished
   * task.
   *
   * Issue #627 item 7: the 「未達定稿門檻 {n} 個」 clause is gone. AC-1.24
   * (015:167) removed it in v5.0.0 -- 「該計數隨 `approved`／`modified` 中間
   * 狀態移除而失效」 -- and FR-076 point 1 was missed in the same version;
   * this renderer had been following the stale FR. With REVIEW_UNIT_STATUS
   * down to three states, `unfinalized` is an identity with pending +
   * disputed, so the clause restated units the line already counted. The
   * FIELD stays: annotation-list.html :2009 reads it to decide whether a
   * task is finished for this reviewer, which FR-076 explicitly leaves
   * out of scope (「本條僅規範顯示文字」). */
  var REVIEW_SUMMARY_LABELS = {
    zh: {
      coverage: '任務覆蓋 {n} / {total} 個審核單位',
      pending: '待審 {n} 個',
      disputed: '爭議中 {n} 個',
      iaa: 'IAA {n}',
      iaaNotComputable: 'IAA 無法計算',
    },
    en: {
      coverage: 'Task coverage {n} / {total} review units',
      pending: '{n} pending',
      disputed: '{n} disputed',
      iaa: 'IAA {n}',
      iaaNotComputable: 'IAA Not computable',
    },
  };

  function formatReviewSummary(summary, iaa) {
    var result = {};
    Object.keys(REVIEW_SUMMARY_LABELS).forEach(function (lang) {
      var labels = REVIEW_SUMMARY_LABELS[lang];
      var parts = [];
      function push(key, value, total) {
        var text = labels[key].replace('{n}', String(value));
        parts.push(total === undefined ? text : text.replace('{total}', String(total)));
      }
      push('coverage', summary.total - summary.pending, summary.total);
      if (summary.pending > 0) push('pending', summary.pending);
      if (summary.disputed > 0) push('disputed', summary.disputed);
      /* IAA is tri-state (dataset-017 FR-039.4): a number renders at the
         2-decimal precision used everywhere else; `null` means the caller
         ran the derivation and it came back not computable, which must be
         stated rather than silently dropped; `undefined` means this task
         carries no IAA in its summary at all, so nothing is appended. */
      if (iaa === null) push('iaaNotComputable', '');
      else if (iaa !== undefined) push('iaa', Number(iaa).toFixed(2));
      result[lang] = parts.join(' · ');
    });
    return result;
  }

  /* ---- Next actionable review unit (spec 015 v4.28.0 FR-073, issue #449) --
   * Which unit a reviewer should be handed next, over the SAME enumeration
   * the summary counts (listReviewUnits). The dashboard quick-review CTA
   * used to open each task's first dataset record, so on most tasks it
   * landed on a finalized, read-only unit and the reviewer had to go find
   * their actual backlog.
   *
   * Rank 0 means "not actionable for this reviewer" and is the answer for
   * finalized units (terminal) and for units this reviewer has already
   * decided or may not decide. Lower rank wins; ties keep enumeration order,
   * so the earliest unit of the strongest category is the target.
   *
   *   1  pending    -- nobody has reviewed it yet AND the unit is THIS
   *                    reviewer's FR-093 assignment. A null status
   *                    (annotator has not submitted) ranks here too,
   *                    matching how computeReviewSummary counts it and how
   *                    the list row renders it, so the CTA can never
   *                    contradict the 待審 count shown next to it.
   *   2  disputed   -- only when FR-060 lets THIS reviewer arbitrate it:
   *                    can_arbitrate plus no submission of their own on the
   *                    unit. A reviewer who produced the dispute must never
   *                    be routed to decide it.
   *
   * Any other status (finalized) ranks 0 -- there is nothing left to do.
   *
   * Nothing here reads a task id: the rule is task state plus reviewer
   * identity only (Generalization-First). */
  /* issue #719 (FR-073 clause 2, spec 015 v6.2.0): `assignedKeys` is the set
   * of units FR-093 assigned to this reviewer, NUL-joined the same way
   * annotation-list.html's filterToAssignedUnits() keys them. Rank 1 now
   * requires membership -- without it a reviewer is handed a pending unit
   * that belongs to someone else, which is exactly the self-selection
   * FR-093 forbids. Rank 2 deliberately does NOT consult it: an eligible
   * arbiter holds no submission on the unit and the assignee is precisely
   * who does, so requiring assignment there would leave FR-060 arbitration
   * with no reachable target at all. */
  function reviewUnitActionRank(taskId, runType, unit, reviewerId, assignedKeys) {
    var identity = { annotatorId: unit.annotatorId, reviewerId: reviewerId };
    if (unit.status === null || unit.status === REVIEW_UNIT_STATUS.PENDING) {
      return assignedKeys[unit.sampleId + '\u0000' + unit.annotatorId] === true ? 1 : 0;
    }
    if (unit.status === REVIEW_UNIT_STATUS.DISPUTED) {
      return isArbiterCandidate(taskId, runType, unit.sampleId, identity) ? 2 : 0;
    }
    return 0;
  }

  /* issue #766 (FR-100 clause 1): every unit this reviewer can act on, as
     { unit, rank } in enumeration order. It is the ONLY place the per-unit
     actionable judgement runs: findNextActionableReviewUnit() picks from it
     and the finalized card counts it, so "0 left" and "no next unit" can
     never disagree. */
  function listActionableReviewUnits(taskId, runType, reviewerId) {
    var units = listReviewUnits(taskId, runType);
    /* The FULL enumeration goes in: getReviewAssignments() is positional --
       official_run walks the sorted list with a fixed stride and dry_run
       keys on a sample's first appearance -- so handing it a pre-filtered
       subset would shift every reviewer's share and make the workspace
       disagree with the list page about who owns what. */
    var assignedKeys = {};
    getAssignedReviewUnits(taskId, runType, reviewerId, units.map(function (unit) {
      return { sample_id: unit.sampleId, annotator_id: unit.annotatorId };
    })).forEach(function (assigned) {
      assignedKeys[assigned.sample_id + '\u0000' + assigned.annotator_id] = true;
    });
    var actionable = [];
    units.forEach(function (unit) {
      var rank = reviewUnitActionRank(taskId, runType, unit, reviewerId, assignedKeys);
      if (rank !== 0) actionable.push({ unit: unit, rank: rank });
    });
    return actionable;
  }

  /* Returns { sampleId, annotatorId, status } or null when this reviewer has
     nothing left to do on the task -- the caller must then say so rather
     than opening an arbitrary read-only unit. */
  function findNextActionableReviewUnit(taskId, runType, reviewerId) {
    var best = null;
    listActionableReviewUnits(taskId, runType, reviewerId).forEach(function (entry) {
      if (best === null || entry.rank < best.rank) best = entry;
    });
    return best ? best.unit : null;
  }

  /* issue #766 (FR-100 clause 3): the "nothing left" wording shared by the
     list page's no-actionable notice and the workspace finalized card.
     Defined once here, like REVIEW_SUMMARY_LABELS, so the two screens cannot
     drift into different phrasings. */
  var NO_ACTIONABLE_REVIEW_LABELS = {
    zh: {
      title: '目前沒有可處理項目',
      message: '這個任務的審核單位都已定稿，或不在你的可處理範圍內。',
    },
    en: {
      title: 'No actionable items right now',
      message: 'Every review unit on this task is finalized or outside what you can act on.',
    },
  };

  /* ---- Review-flow demo seeder (Phase 2 slice C) -------------------------
   * Stages the T014-T016 demo review states at boot so every review-flow
   * scenario (five unit states, quorum thresholds, majority convergence,
   * tie -> arbitration) is visible without clicking through 29 submissions.
   * Idempotent: the marker key short-circuits every later page load, so
   * timestamps and history events are written exactly once -- and any state
   * the demo visitor then changes (their own reviews, arbitrations) is
   * never overwritten. T014-T016 ONLY; other tasks' buckets stay untouched,
   * and dry-run progress (DRY_RUN_PROGRESS_KEY) is deliberately not synced
   * -- these are review-side fixtures, not the visitor's own annotation
   * progress. */
  var REVIEW_FLOW_DEMO_SEED_KEY_V1 = 'labelsuite.reviewFlowDemoSeed.v1';
  /* issue #856: v1 was never bumped while the T014-T016 table below kept
   * changing underneath it (#815, #843, #837), so a browser already holding
   * v1 short-circuited forever and never saw any later seed fix. Bump this
   * key whenever the T014-T016 rows change again; seedReviewFlowDemo() below
   * clears and re-derives those rows for anyone still on the OLD marker
   * before writing the new one, so the fix reaches existing browsers without
   * duplicating arbitration votes or history events (a naive marker bump
   * alone would re-run submitArbitration()/appendReviewDecisionEvents() on
   * top of the stale rows). */
  var REVIEW_FLOW_DEMO_SEED_KEY_V2 = 'labelsuite.reviewFlowDemoSeed.v2';
  /* issue #620: v3 adds guideline citations to review/arbitration reasons.
   * A browser holding v2 must clear and replay the T014-T016 buckets or it
   * would keep the old uncited reason strings forever. */
  var REVIEW_FLOW_DEMO_SEED_KEY_V3 = 'labelsuite.reviewFlowDemoSeed.v3';
  /* issue #923: v4's rows were seeded with same-millisecond `at` timestamps
   * (each markSampleSubmitted/submitArbitration call stamped
   * new Date().toISOString() back-to-back), so getSampleHistory()'s
   * timestamp sort fell back to bucket-key lexical order and rendered
   * causally later events before earlier ones. A browser holding v4 must
   * clear and replay the T014-T016 buckets to pick up v5's strictly
   * increasing per-event timestamps. */
  var REVIEW_FLOW_DEMO_SEED_KEY_V4 = 'labelsuite.reviewFlowDemoSeed.v4';
  var REVIEW_FLOW_DEMO_SEED_KEY = 'labelsuite.reviewFlowDemoSeed.v5';

  /* issues #856/#620: removes exactly the buckets seedReviewFlowDemo() itself
   * can have written for `taskIds` -- wsSubmissions (covers both annotator
   * and reviewer rows, since submissionBucketKey's first segment is always
   * the task id) and wsArbitration -- so a marker-upgrade reseed starts from
   * a clean slate without touching any task outside the seed table. */
  function clearReviewFlowDemoSeedBuckets(taskIds) {
    listSubmissionBucketKeys().forEach(function (bucketKey) {
      if (taskIds.indexOf(bucketKey.split('::')[0]) === -1) return;
      try {
        global.localStorage.removeItem(SUBMISSION_KEY_PREFIX + bucketKey);
      } catch (e) {
        /* storage unavailable: nothing to clear */
      }
    });
    listArbitrationItemKeys().forEach(function (itemKey) {
      if (taskIds.indexOf(itemKey.split('::')[0]) === -1) return;
      try {
        global.localStorage.removeItem(ARBITRATION_KEY_PREFIX + itemKey);
      } catch (e) {
        /* storage unavailable: nothing to clear */
      }
    });
  }

  /* A seed marker is a completion record, not an intent record. Verify the
     rows the current script promises before committing v4, so a quota or
     storage failure leaves the old marker in place and the next load retries
     the migration instead of treating a partial reseed as complete. */
  function verifyReviewFlowDemoSeedRows(scripts) {
    return scripts.every(function (row) {
      var annotatorBucket = readSubmissionBucket(submissionBucketKey(
        row.t, 'annotator', row.r, { annotatorId: row.a }
      ));
      var annotatorEntry = annotatorBucket[row.s];
      var annotatorSelected = annotatorEntry && annotatorEntry.answers &&
        annotatorEntry.answers.previewState && annotatorEntry.answers.previewState.single_label &&
        annotatorEntry.answers.previewState.single_label.selected;
      if (entryStatus(annotatorEntry) !== 'submitted' || annotatorSelected !== row.v) return false;

      var reviewersValid = Object.keys(row.rev || {}).every(function (reviewerId) {
        var reviewerBucket = readSubmissionBucket(submissionBucketKey(
          row.t, 'reviewer', row.r, { annotatorId: row.a, reviewerId: reviewerId }
        ));
        var reviewerEntry = reviewerBucket[row.s];
        var decisions = reviewerEntry && reviewerEntry.answers && reviewerEntry.answers.decisions;
        var expectedDecision = row.modifyBy === reviewerId
          ? 'modify'
          : (row.bypassBy === reviewerId ? 'bypass' : 'approve');
        return entryStatus(reviewerEntry) === 'submitted' &&
          decisions && decisions.single_label === expectedDecision;
      });
      if (!reviewersValid) return false;

      if (!row.arb && !row.arbReject) return true;
      var itemKey = arbitrationItemKey(
        arbitrationBucketKey(row.t, row.r, { annotatorId: row.a }),
        row.s,
        'single_label::single_label'
      );
      var arbitrationItem = readArbitrationItem(itemKey);
      var expectedChoice = row.arbReject ? 'reject' : 'adopt_b';
      return !!arbitrationItem && (arbitrationItem.votes || []).some(function (vote) {
        return vote.arbiter_id === 'reviewer_chen' && vote.choice === expectedChoice;
      });
    });
  }

  function seedReviewFlowDemo() {
    var upgradingFromPrevious = false;
    try {
      if (global.localStorage.getItem(REVIEW_FLOW_DEMO_SEED_KEY)) return;
      upgradingFromPrevious = !!(
        global.localStorage.getItem(REVIEW_FLOW_DEMO_SEED_KEY_V1) ||
        global.localStorage.getItem(REVIEW_FLOW_DEMO_SEED_KEY_V2) ||
        global.localStorage.getItem(REVIEW_FLOW_DEMO_SEED_KEY_V3) ||
        global.localStorage.getItem(REVIEW_FLOW_DEMO_SEED_KEY_V4)
      );
    } catch (e) {
      return; /* storage unavailable: nothing to stage into */
    }

    var A = 'kioleemg12';
    var B = '113450022';
    var C = 'tony0950127';
    /* One row per review unit: annotator `a` answered `v`; `rev` maps each
       reviewer to their decision (same value = agree, different = changed);
       `arb` is chen's arbitration adopting that reviewer value (choice
       adopt_b). `modifyBy` (issue #596, FR-094) names the one entry in
       `rev` whose decision was `modify` -- without it a value change would
       still derive `disputed`
       via anyReviewerChanged(), but the FR-094 micro-trace's `（修正）`
       segment reads unitReviewDecision()'s stored `decisions` map, which
       only a `modify` decision (not the default `approve`) populates.
       `arbReject` marks a row whose arbitration vote is FR-061 point 3's
       `reject` (兩者皆非) rather than an adopt_a/adopt_b pick -- it
       deliberately carries no `arb` value, matching design.md D2's
       absent-field sentinel.
       Annotator values MUST match REVIEWER_MOCK_ROWS above -- the list's
       answer column and the derived unit status describe the same
       submission. Derived states are noted per sample.

       issue #551 changed two derivation rules used throughout this table:
       (1) min_reviewers = 1 (T014, T015 here) now converges a SOLE
           reviewer's correction immediately -- what used to require
           arbitration at N = 1 now finalizes on submit, so several rows
           below moved from `disputed`/`arbitrated` to `finalized`; and
       (2) a decision that carries no correction (a pure reject, historically;
           `reject` was retired by issue #837, so T014 dry-05's A row below
           is now a `bypass` instead) blocks finalization instead of reading
           as agreement, so that row stays `disputed` rather than
           `finalized`.

       issue #596 (design.md D1): getReviewUnitStatus() no longer has any
       quorum/min_reviewers concept, so the inline `// finalized (N=1 quorum
       converges)` / `approved (1 < 3)` / `modified (1 < 3)` annotations
       throughout the T014-T017 rows below are STALE -- read them as
       historical (issue #551-era) commentary, not as what today's
       derivation actually returns. The multi-reviewer-per-unit shape of
       T016/ofm-* and T017/oft-* also no longer matches FR-093 (exactly one
       reviewer per unit) -- EXCEPT the two canonical rows below
       (ofm-01-reviewer-corrects-b, oft-01-final-exception), rewritten to a
       single assigned reviewer (this change's tasks.md group 7, design.md
       Migration Plan point 3). The remaining ofm-* / oft-* rows keep their
       pre-existing multi-reviewer shape untouched -- they exercise
       unaffected, non-canonical derivation paths, not the FR-093 model.

       issue #815 (retire-stale-review-demo-fixtures, tasks.md 1.2): T016's
       `ofm-04-majority-converged` / `ofm-05-all-divergent` rows above were
       the last two T016 rows still seeding a three-reviewer unit -- a shape
       FR-093 cannot produce. Both are now single-assigned-reviewer rows
       too: `ofm-04-reviewer-bypass` demos the `bypass` decision (FR-044,
       FR-092) that had zero seed coverage anywhere in this table, and
       `ofm-05-final-exception` absorbs T017's `oft-01-final-exception`
       content (FR-061 point 3's arbitration-reject -> final-exception-pool
       path), preserving that coverage ahead of T017's removal in this
       change's group 2.

       issue #824 (sticky-review-assignment): a stored submission now PINS
       its unit to whoever wrote it, so every `rev` key below MUST equal the
       reviewer FR-093's positional deal already hands that unit -- the
       task's `reviewerIds` order in task-detail.data.js, dealt per sample
       for dry_run and per unit for official_run. Until now every row named
       `reviewer_wang` regardless, which the pure derivation silently
       papered over; under stickiness it would have handed wang every
       reviewed unit and left li/chen/lin with none. When adding a row, read
       its position off that deal instead of copying a neighbour's key.

       issue #868: every task arbiter is now reserved from the NEW assignment
       pool. T014-T016 therefore deal over wang/li/lin; existing visitors are
       reseeded once through the v4 marker so the old sticky submissions by
       chen do not preserve the dead-end fixture this change removes. */
    var scripts = [
      /* T014 dry_run, min_reviewers = 1 */
      { t: 'T014', r: 'dry_run', s: 'dry-01-all-agree', a: A, v: 'positive', rev: { reviewer_wang: 'positive' } }, // finalized
      { t: 'T014', r: 'dry_run', s: 'dry-01-all-agree', a: B, v: 'positive', rev: { reviewer_wang: 'positive' } }, // finalized
      { t: 'T014', r: 'dry_run', s: 'dry-01-all-agree', a: C, v: 'positive', rev: { reviewer_wang: 'positive' } }, // finalized
      { t: 'T014', r: 'dry_run', s: 'dry-02-one-divergent', a: A, v: 'neutral', rev: { reviewer_li: 'neutral' } }, // finalized
      // issue #843 (FR-092): a changed value is a `modify`, never an approve.
      { t: 'T014', r: 'dry_run', s: 'dry-02-one-divergent', a: B, v: 'neutral', rev: { reviewer_li: 'positive' }, modifyBy: 'reviewer_li', reason: '依 [[正向（positive）的判準]]，整段以讚賞語氣收尾，應判讀為正面而非中性' }, // disputed (reviewer modifies)
      { t: 'T014', r: 'dry_run', s: 'dry-02-one-divergent', a: C, v: 'positive' }, // pending
      { t: 'T014', r: 'dry_run', s: 'dry-03-dispute-open', a: A, v: 'neutral' }, // pending
      // issue #843 (FR-092): a changed value is a `modify`, never an approve.
      { t: 'T014', r: 'dry_run', s: 'dry-03-dispute-open', a: B, v: 'neutral', rev: { reviewer_lin: 'negative' }, modifyBy: 'reviewer_lin', reason: '依 [[負向（negative）的判準]]，抱怨語氣明確，應判讀為負面而非中性' }, // disputed (reviewer modifies)
      { t: 'T014', r: 'dry_run', s: 'dry-03-dispute-open', a: C, v: 'neutral' }, // pending
      { t: 'T014', r: 'dry_run', s: 'dry-04-dispute-resolved', a: A, v: 'negative', rev: { reviewer_wang: 'negative' } }, // finalized
      /* issue #843 (FR-092/FR-060): lin's modify sends the item to
         dispute; chen's arbitration adopts the corrected value and
         finalizes it (finalized_by = reviewer_chen). */
      { t: 'T014', r: 'dry_run', s: 'dry-04-dispute-resolved', a: B, v: 'neutral', rev: { reviewer_wang: 'negative' }, modifyBy: 'reviewer_wang', reason: '依 [[負向（negative）的判準]]，文末表達失望，應判讀為負面而非中性', arb: 'negative', arbReason: '依 [[負向（negative）的判準]]，採用審核員提出的負向修正。' }, // finalized by arbitration
      { t: 'T014', r: 'dry_run', s: 'dry-04-dispute-resolved', a: C, v: 'negative', rev: { reviewer_wang: 'negative' } }, // finalized
      /* issue #837: this row used to seed a reviewer-level `reject`
         (rollback-free on dry_run anyway -- the annotator stayed
         'submitted'), but REVIEW_DECISIONS has been approve/modify/bypass
         only since issue #596, so it is now a `bypass` instead: design.md
         D2's "bypass 不存值" means `rev` carries the reviewer key with an
         undefined value, the same shape as T016's ofm-04-reviewer-bypass.
         `bypass` is a DISPUTE_FORCING_DECISIONS member, so the unit still
         blocks finalization and stays disputed -- only an arbiter (or a
         later correction) can resolve it. */
      { t: 'T014', r: 'dry_run', s: 'dry-05-pending-review', a: A, v: 'positive', rev: { reviewer_li: undefined }, bypassBy: 'reviewer_li', reason: '依 [[難以判定時的處理]]，正負面線索交雜，難以判定情緒傾向為何' }, // disputed (reviewer bypasses, no answer value recorded)
      { t: 'T014', r: 'dry_run', s: 'dry-05-pending-review', a: B, v: 'positive' }, // pending
      { t: 'T014', r: 'dry_run', s: 'dry-05-pending-review', a: C, v: 'positive' }, // pending
      /* T015 official_run, min_reviewers = 1 (ofs-05 stays unsubmitted) */
      { t: 'T015', r: 'official_run', s: 'ofs-01-agree-gold', a: A, v: 'negative', rev: { reviewer_wang: 'negative' } }, // finalized
      // issue #843 (FR-092): a changed value is a `modify`, never an approve.
      { t: 'T015', r: 'official_run', s: 'ofs-02-modified-dispute', a: A, v: 'neutral', rev: { reviewer_li: 'positive' }, modifyBy: 'reviewer_li', reason: '依 [[正向（positive）的判準]]，對產品表達肯定，應判讀為正面而非中性' }, // disputed (reviewer modifies)
      /* issue #843 (FR-093, AC-6.12): exactly one reviewer per unit -- the
         issue #551-era second reviewer (li) is gone. lin's modify forces
         the dispute and chen's arbitration adopts it, so this row still
         demos an arbitration-resolved finalize. */
      { t: 'T015', r: 'official_run', s: 'ofs-03-arbitrated-gold', a: A, v: 'positive', rev: { reviewer_lin: 'neutral' }, modifyBy: 'reviewer_lin', reason: '依 [[中立（neutral）的判準]]，褒貶並陳且未表態，應判讀為中性而非正面', arb: 'neutral', arbReason: '依 [[中立（neutral）的判準]]，採用審核員提出的中立修正。' }, // finalized by arbitration
      { t: 'T015', r: 'official_run', s: 'ofs-04-pending-review', a: A, v: 'positive' }, // pending
      /* T016 official_run, min_reviewers = 3 */
      /* issue #596 (FR-093/FR-060/FR-061/FR-094): the canonical single-owner
         relay path -- reviewer_wang (round robin index 0) corrects the
         annotator's value, reviewer_chen (the roster's only can_arbitrate
         reviewer who is not a participant, FR-060) adopts wang's corrected
         value, and the unit finalizes on that value. */
      { t: 'T016', r: 'official_run', s: 'ofm-01-reviewer-corrects-b', a: A, v: 'positive', rev: { reviewer_wang: 'negative' }, modifyBy: 'reviewer_wang', reason: '依 [[負向（negative）的判準]]，第二句語氣轉折應判讀為負面，而非正面', arb: 'negative', arbReason: '依 [[負向（negative）的判準]]，採用審核員提出的負向修正。' }, // finalized (reviewer modifies, arbitration adopts B)
      { t: 'T016', r: 'official_run', s: 'ofm-02-reviewer-accepts-a', a: A, v: 'negative', rev: { reviewer_li: 'negative' } }, // finalized (reviewer accepts A)
      { t: 'T016', r: 'official_run', s: 'ofm-03-awaiting-arbitration', a: A, v: 'neutral', rev: { reviewer_lin: 'negative' }, modifyBy: 'reviewer_lin', reason: '依 [[負向（negative）的判準]]，反諷語氣明顯，應判讀為負面而非中性' }, // disputed (reviewer modifies, awaiting arbitration)
      /* issue #815: bypass (無法判定) had zero seed rows anywhere -- a lone
         bypass, like a lone modify, forces the unit into dispute
         (DISPUTE_FORCING_DECISIONS). design.md D2: bypass stores no answer
         value, so `rev` carries the reviewer key with an undefined value. */
      { t: 'T016', r: 'official_run', s: 'ofm-04-reviewer-bypass', a: A, v: 'positive', rev: { reviewer_wang: undefined }, bypassBy: 'reviewer_wang', reason: '依 [[難以判定時的處理]]，文本正負面線索交雜且語氣曖昧，難以判定情緒傾向' }, // disputed (reviewer bypasses, no answer value recorded)
      /* issue #815: migrated verbatim from T017's oft-01-final-exception
         (removed in this change's group 2) so the sole arbitration-reject
         (兩者皆非) -> final-exception-pool seed (FR-061 point 3, FR-095)
         survives T017's removal. */
      { t: 'T016', r: 'official_run', s: 'ofm-05-final-exception', a: A, v: 'neutral', rev: { reviewer_li: 'positive' }, modifyBy: 'reviewer_li', reason: '依 [[難以判定時的處理]]，語境不足以判斷情緒傾向，正面與中性難以取捨', arbReject: true, arbReason: '依 [[難以判定時的處理]]，原標記與審核修正結果皆缺乏明確文本依據支持，需徵詢更明確判準。' }, // disputed (reviewer modifies, arbitration rejects both sides -> final exception pool)
    ];

    if (upgradingFromPrevious) {
      /* issue #856: derive the task ids to clear from `scripts` itself
         (single source of truth) rather than a second hardcoded T014-T016
         list, so this sweep can never drift from the rows it is supposed
         to cover. */
      var taskIdsToReseed = [];
      scripts.forEach(function (row) {
        if (taskIdsToReseed.indexOf(row.t) === -1) taskIdsToReseed.push(row.t);
      });
      clearReviewFlowDemoSeedBuckets(taskIdsToReseed);
    }

    function labelPayload(value, decision, reason) {
      /* issue #551: `decision` mirrors handleReviewSubmit's persisted
         `decisions` map (per outKey approve/modify/bypass) -- without it, a
         seeded `modify`/`bypass` that leaves the value unchanged (modifyBy/
         bypassBy, same value as `v`) is indistinguishable from a seeded
         approve, and getReviewUnitStatus()/getDisputeItems() would read it
         as agreement instead of a blocking decision.
         issue #552: `reason` mirrors the persisted `reasons` map the
         annotator's rework banner (FR-084) reads. */
      var payload = { previewState: { single_label: { selected: value } } };
      if (decision) payload.decisions = { single_label: decision };
      if (reason) payload.reasons = { single_label: reason };
      return payload;
    }

    /* issue #923: the loop below fires markSampleSubmitted/submitArbitration
     * back-to-back, so their own `new Date().toISOString()` stamps land in
     * the same millisecond and getSampleHistory()'s timestamp sort falls
     * back to bucket-key lexical order, misordering the rendered history.
     * These seed-only helpers overwrite each freshly written event's `at`
     * (and, where relevant, `submittedAt`) with a strictly increasing
     * timestamp reflecting true submit -> review -> arbitration causal
     * order. Never used outside this seeder: real user actions keep writing
     * their own real-time stamps via appendHistoryEvent/markSampleSubmitted. */
    var seedEventClockMs = Date.now();
    function nextSeedEventAt() {
      seedEventClockMs += 1000;
      return new Date(seedEventClockMs).toISOString();
    }
    /* ponytail: assumes the write this follows always appended a new event
       (true for every row in `scripts` today -- appendSampleTimelineEvent's
       `if (!reason) return;` and appendReviewDecisionEvents' `if (!action)
       return;` guards never fire for this table). If a future row could hit
       either guard, this would silently restamp an unrelated earlier event
       instead of a no-op; a length-before/after check would close that gap
       if it ever matters. */
    function restampLastSeedEvent(bucketKey, sampleId, alsoStampSubmittedAt) {
      var bucket = readSubmissionBucket(bucketKey);
      var entry = bucket[sampleId];
      if (!entry || !Array.isArray(entry.history) || !entry.history.length) return;
      var at = nextSeedEventAt();
      entry.history[entry.history.length - 1].at = at;
      if (alsoStampSubmittedAt) entry.submittedAt = at;
      writeSubmissionBucket(bucketKey, bucket);
    }

    scripts.forEach(function (row) {
      markSampleSubmitted(row.t, 'annotator', row.r, row.s, labelPayload(row.v), '', { annotatorId: row.a });
      restampLastSeedEvent(submissionBucketKey(row.t, 'annotator', row.r, { annotatorId: row.a }), row.s, true);
      Object.keys(row.rev || {}).forEach(function (reviewerId) {
        var isModify = row.modifyBy === reviewerId;
        /* issue #815: `bypassBy` mirrors `modifyBy` -- names the one entry
           in `rev` whose decision was `bypass` (無法判定) rather than
           approve/modify. */
        var isBypass = row.bypassBy === reviewerId;
        var decision = isModify ? 'modify' : (isBypass ? 'bypass' : 'approve');
        /* issue #502/#596/#815: mirrors handleReviewSubmit's per-row decision
           line (annotation-workspace.config.js's decisionLines, ~L4780) so
           a seeded modify/bypass reads the same way a live one would. */
        var reviewSummary = (isModify || isBypass)
          ? 'single_label · ' + row.a + ': ' + decision
          : '';
        markSampleSubmitted(
          row.t, 'reviewer', row.r, row.s,
          labelPayload(row.rev[reviewerId], decision, (isModify || isBypass) ? row.reason : null),
          reviewSummary,
          { annotatorId: row.a, reviewerId: reviewerId }
        );
        restampLastSeedEvent(
          submissionBucketKey(row.t, 'reviewer', row.r, { annotatorId: row.a, reviewerId: reviewerId }),
          row.s, true
        );
      });
      if (row.arb) {
        submitArbitration(row.t, row.r, row.s, { annotatorId: row.a, reviewerId: 'reviewer_chen' }, [
          { itemId: 'single_label::single_label', choice: 'adopt_b', value: row.arb, reason: row.arbReason },
        ]);
        restampLastSeedEvent(submissionBucketKey(row.t, 'annotator', row.r, { annotatorId: row.a }), row.s, false);
      } else if (row.arbReject) {
        /* issue #596 (FR-061 point 3, design.md D2): a reject vote carries
           no `value` -- submitArbitration() deletes finalized_value/
           finalized_by for this choice by design (the absent-field
           sentinel), so passing one here would be misleading dead data. */
        submitArbitration(row.t, row.r, row.s, { annotatorId: row.a, reviewerId: 'reviewer_chen' }, [
          { itemId: 'single_label::single_label', choice: 'reject', reason: row.arbReason },
        ]);
        restampLastSeedEvent(submissionBucketKey(row.t, 'annotator', row.r, { annotatorId: row.a }), row.s, false);
      }
    });

    if (!verifyReviewFlowDemoSeedRows(scripts)) return;
    try {
      global.localStorage.setItem(REVIEW_FLOW_DEMO_SEED_KEY, new Date().toISOString());
    } catch (e) {
      return; /* no completion marker means the next load retries */
    }
    try {
      global.localStorage.removeItem(REVIEW_FLOW_DEMO_SEED_KEY_V1);
      global.localStorage.removeItem(REVIEW_FLOW_DEMO_SEED_KEY_V2);
      global.localStorage.removeItem(REVIEW_FLOW_DEMO_SEED_KEY_V3);
      global.localStorage.removeItem(REVIEW_FLOW_DEMO_SEED_KEY_V4);
    } catch (e) {
      /* leftover old markers are harmless: v5 is checked first */
    }
  }

  migrateLegacySubmissionStore();
  /* ── IAA (Krippendorff's Alpha, nominal) ─────────────────────────
   *
   * THE single derivation of inter-annotator agreement in the prototype.
   * Before issue #489 the same T014 dry run reported 0.72 / 0.00 / 0.68 /
   * 0.85 in four places, none of them derived from the marks; every
   * consumer now reads this function instead of carrying its own constant.
   * dataset-017 FR-039 is the spec-side canon for the semantics below.
   *
   * Inputs are ANNOTATOR submissions only -- a reviewer is not a rater
   * (issue #488 decision D2), so their corrections never enter the sum.
   *
   *   Do = Σ_units  Σ_{c≠k} n_uc·n_uk / (m_u − 1)
   *   De = Σ_{c≠k} n_c·n_k / (n − 1)
   *   α  = 1 − Do/De
   *
   * Units rated by fewer than two annotators contribute nothing to Do and
   * are excluded from n as well -- a single mark cannot disagree with
   * itself, and counting it would inflate De against an empty Do.
   *
   * α is UNDEFINED when De = 0 (fewer than two effective units, or every
   * annotator picked the same category). We return computable:false rather
   * than a number, because 0.00 reads as "total disagreement" when it
   * actually means "not enough data" -- that conflation is issue #491.
   * Callers must render the reason, never coerce to a value.
   *
   * Nominal α only fits nominal categories, so single_label is the only
   * output type derived here; every other type reports
   * 'unsupported_output_type' instead of a fabricated figure. */
  var IAA_NOMINAL_OUTPUT_TYPES = ['single_label'];

  function iaaCategory(outKey, submission) {
    if (!submission) return null;
    /* Bypassed outputs are missing values, not answers -- but CompactAnswer
       does not carry the bypass flag yet (dataset-017 FR-040 records this
       as a separate data-layer item), so today only an absent selection is
       detectable. */
    var state = (submission.previewState && submission.previewState[outKey]) || {};
    var selected = state.selected;
    return (typeof selected === 'string' && selected) ? selected : null;
  }

  function computeIaaAlpha(taskId, runType, outKey) {
    if (IAA_NOMINAL_OUTPUT_TYPES.indexOf(outKey) === -1) {
      return { computable: false, reason: 'unsupported_output_type', outKey: outKey };
    }
    var detail = findTaskDetailProfile(taskId);
    if (!detail) return { computable: false, reason: 'unknown_task', outKey: outKey };

    var perUnit = [];
    (detail.datasetRecords || []).forEach(function (record, index) {
      var sampleId = getRecordId(record, index);
      var counts = {};
      var raters = 0;
      getReviewUnitRows(taskId, runType, sampleId, [outKey]).forEach(function (row) {
        var category = iaaCategory(
          outKey,
          getSubmission(taskId, 'annotator', runType, sampleId, { annotatorId: row.annotator }));
        if (category === null) return;
        counts[category] = (counts[category] || 0) + 1;
        raters += 1;
      });
      if (raters >= 2) perUnit.push({ counts: counts, raters: raters });
    });

    var observed = 0;
    var totals = {};
    var valueCount = 0;
    perUnit.forEach(function (unit) {
      observed += pairwiseDisagreement(unit.counts) / (unit.raters - 1);
      Object.keys(unit.counts).forEach(function (category) {
        totals[category] = (totals[category] || 0) + unit.counts[category];
      });
      valueCount += unit.raters;
    });

    if (valueCount < 2) {
      return {
        computable: false, reason: 'insufficient_samples', outKey: outKey,
        units: perUnit.length, values: valueCount,
      };
    }
    var expected = pairwiseDisagreement(totals) / (valueCount - 1);
    if (expected === 0) {
      return {
        computable: false, reason: 'no_variance', outKey: outKey,
        units: perUnit.length, values: valueCount,
      };
    }
    return {
      computable: true, outKey: outKey,
      alpha: 1 - observed / expected,
      observed: observed, expected: expected,
      units: perUnit.length, values: valueCount,
      raters: Object.keys(totals).length ? countDistinctRaters(taskId, runType, detail, outKey) : 0,
    };
  }

  /* Σ_{c≠k} n_c·n_k over a category-count map. */
  function pairwiseDisagreement(counts) {
    var categories = Object.keys(counts);
    var sum = 0;
    categories.forEach(function (a) {
      categories.forEach(function (b) {
        if (a !== b) sum += counts[a] * counts[b];
      });
    });
    return sum;
  }

  /* How many distinct annotators contributed at least one mark -- shown
     next to α ("N 位標記員"), which is why it counts people rather than
     marks. */
  function countDistinctRaters(taskId, runType, detail, outKey) {
    var seen = {};
    (detail.datasetRecords || []).forEach(function (record, index) {
      var sampleId = getRecordId(record, index);
      getReviewUnitRows(taskId, runType, sampleId, [outKey]).forEach(function (row) {
        if (iaaCategory(outKey, getSubmission(
          taskId, 'annotator', runType, sampleId, { annotatorId: row.annotator })) !== null) {
          seen[row.annotator] = true;
        }
      });
    });
    return Object.keys(seen).length;
  }

  migrateLegacyArbitrationStore();
  seedReviewFlowDemo();

  global.LabelSuiteAnnotationWorkspaceData = {
    resolveTaskProfile: resolveTaskProfile,
    sanitizeRecordForAnnotator: sanitizeRecordForAnnotator,
    getRecordId: getRecordId,
    getRecordPreviewText: getRecordPreviewText,
    isSampleSubmitted: isSampleSubmitted,
    getSampleStatus: getSampleStatus,
    getSampleSubmittedAt: getSampleSubmittedAt,
    getSampleSavedAt: getSampleSavedAt,
    markSampleSubmitted: markSampleSubmitted,
    markSampleSaved: markSampleSaved,
    markSampleSkipped: markSampleSkipped,
    appendSampleTimelineEvent: appendSampleTimelineEvent,
    markSampleRejected: markSampleRejected,
    saveReviewRowDecisionDraft: saveReviewRowDecisionDraft,
    getReviewRowDecisionDraft: getReviewRowDecisionDraft,
    clearReviewRowDecisionDraft: clearReviewRowDecisionDraft,
    getSubmission: getSubmission,
    getSampleAnswers: getSampleAnswers,
    getSampleHistory: getSampleHistory,
    getSubmittedSampleCount: getSubmittedSampleCount,
    getCurrentRoundSubmittedCount: getCurrentRoundSubmittedCount,
    syncDryRunProgress: syncDryRunProgress,
    DEFAULT_ANNOTATOR_ID: DEFAULT_ANNOTATOR_ID,
    DEFAULT_REVIEWER_ID: DEFAULT_REVIEWER_ID,
    REVIEWER_ROSTER: REVIEWER_ROSTER,
    resolveIdentity: resolveIdentity,
    REVIEWER_MOCK_ROWS: REVIEWER_MOCK_ROWS,
    getReviewerMockRows: getReviewerMockRows,
    getReviewUnitRows: getReviewUnitRows,
    computeReviewStats: computeReviewStats,
    dimDeviationClass: dimDeviationClass,
    meanStd: meanStd,
    convertSubmissionAnswer: convertSubmissionAnswer,
    REVIEW_UNIT_STATUS: REVIEW_UNIT_STATUS,
    REVIEW_DECISIONS: REVIEW_DECISIONS,
    ARBITRATION_OUTCOMES: ARBITRATION_OUTCOMES,
    EXCEPTION_POOL_ACTIONS: EXCEPTION_POOL_ACTIONS,
    REVIEW_ASSIGNMENT_GRANULARITY: REVIEW_ASSIGNMENT_GRANULARITY,
    compareOutputAnswer: compareOutputAnswer,
    getReviewUnitStatus: getReviewUnitStatus,
    getReviewUnitLane: getReviewUnitLane,
    getReviewAssignments: getReviewAssignments,
    getStickyReviewers: getStickyReviewers,
    getStickyReviewerId: getStickyReviewerId,
    taskReviewerRoster: taskReviewerRoster,
    taskArbiterRoster: taskArbiterRoster,
    reviewAssignmentRoster: reviewAssignmentRoster,
    taskReviewAssignments: taskReviewAssignments,
    isRosterReviewer: isRosterReviewer,
    getAssignedReviewUnits: getAssignedReviewUnits,
    computeReviewSummary: computeReviewSummary,
    computeReviewWorkload: computeReviewWorkload,
    formatReviewSummary: formatReviewSummary,
    listReviewUnits: listReviewUnits,
    listReviewPoolItems: listReviewPoolItems,
    listActionableReviewUnits: listActionableReviewUnits,
    findNextActionableReviewUnit: findNextActionableReviewUnit,
    NO_ACTIONABLE_REVIEW_LABELS: NO_ACTIONABLE_REVIEW_LABELS,
    getDisputeItems: getDisputeItems,
    isArbiterCandidate: isArbiterCandidate,
    readReviewerSubmissions: readReviewerSubmissions,
    getReworkReasons: getReworkReasons,
    getDryRunFeedback: getDryRunFeedback,
    getArbitrationState: getArbitrationState,
    getExceptionPool: getExceptionPool,
    resolveExceptionPoolItem: resolveExceptionPoolItem,
    DEFAULT_PROJECT_LEADER_ID: DEFAULT_PROJECT_LEADER_ID,
    submitArbitration: submitArbitration,
    isArbitrationSubmitted: isArbitrationSubmitted,
    PURE_REJECT_VALUE: PURE_REJECT_VALUE,
    computeIaaAlpha: computeIaaAlpha,
    IAA_NOMINAL_OUTPUT_TYPES: IAA_NOMINAL_OUTPUT_TYPES,
  };
})(window);

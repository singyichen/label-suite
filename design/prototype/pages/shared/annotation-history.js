/* Shared annotation-history event model (spec 015 v4.61.0, issue #578).
 *
 * The prototype grew three unconnected history mechanisms -- the workspace
 * 歷程 panel (spec 015 FR-016B), task-detail's per-annotator review timeline
 * (spec 014 FR-015d-4) and its dry-run round history -- each with its own
 * notion of what an event is. This module is the single place the shared
 * parts live, following the same window.LabelSuite* pattern as sidebar.js
 * and modal-focus.js, so a second consumer never has to restate them.
 *
 * Scope is the RENDER side only. Event construction, result_snapshot and
 * FR-090 masking belong to annotation-workspace.data.js: that module writes
 * history at load time (seedReviewFlowDemo) on all six pages that include
 * it, so a dependency in this direction would have to be wired into every
 * one of them, while it is already the data layer they all share.
 *
 * FR-086: `action` is a closed set. Every value owns exactly one badge
 * modifier class, and that mapping is data, not a render-site branch -- the
 * three-way ternary it replaces silently rendered `skipped` as `submitted`.
 * A value outside the set (an event written by an older build) keeps the
 * neutral base badge rather than borrowing another action's meaning.
 */
(function (global) {
  'use strict';

  var ACTIONS = {
    DRAFT_SAVED: 'draft_saved',
    SUBMITTED: 'submitted',
    SKIPPED: 'skipped',
    MODIFIED: 'modified',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    ADJUDICATED: 'adjudicated',
  };

  /* action -> badge modifier class. The colors themselves live in the page's
     .history-action-badge.<modifier> rules so both themes resolve through
     tokens; this table only decides which one applies. */
  var BADGE_CLASS = {
    draft_saved: 'draft-saved',
    submitted: 'submitted',
    skipped: 'skipped',
    modified: 'modified',
    accepted: 'accepted',
    rejected: 'rejected',
    adjudicated: 'adjudicated',
  };

  var ACTION_VALUES = Object.keys(BADGE_CLASS);

  function isKnownAction(action) {
    return Object.prototype.hasOwnProperty.call(BADGE_CLASS, action);
  }

  /* '' for anything outside the set, so the caller renders the neutral base
     badge without needing its own fallback branch. */
  function badgeClassFor(action) {
    return isKnownAction(action) ? BADGE_CLASS[action] : '';
  }

  /* FR-087 (position-bearing half): a span-aligned comparator, registered
     per OUTPUT_TYPE_REGISTRY output-type key rather than per task. The
     plain-value path compares one stringified answer per key, which for a
     span type reads "unchanged" whenever an entity keeps its text and moves
     its boundary -- the single most common review correction there is.

     Alignment rule: an entity is the same entity when its start point AND
     its label both match, so a changed `end` is a boundary change while a
     changed label is a delete plus an add. Pairing on the label too is
     deliberate: collapsing a relabel into a boundary change would hide the
     error the reviewer actually corrected. */
  var SPAN_EXTRACTORS = {
    entity_recognition: function (snapshot) {
      return (snapshot.previewEntities || []).map(function (entity) {
        return { start: entity.start, end: entity.end, label: entity.type, text: entity.text };
      });
    },
    /* Tags live one per token index, so the index IS the position; every
       non-O token is a one-unit span and a retag reads as delete + add. */
    sequence_tagging: function (snapshot) {
      var tags = ((snapshot.previewState || {}).sequence_tagging || {}).tokens;
      return (Array.isArray(tags) ? tags : []).reduce(function (spans, tag, idx) {
        if (tag && tag !== 'O') spans.push({ start: idx, end: idx, label: tag, text: tag });
        return spans;
      }, []);
    },
  };

  function isPositionalOutput(outKey) {
    return Object.prototype.hasOwnProperty.call(SPAN_EXTRACTORS, outKey);
  }

  function indexSpans(snapshot, outKey) {
    return SPAN_EXTRACTORS[outKey](snapshot || {}).reduce(function (byKey, span) {
      byKey[span.start + '\u0000' + span.label] = span;
      return byKey;
    }, {});
  }

  /* Returns per-entity changes for a position-bearing output type, or null
     when the type is not one. An empty array means genuinely no change --
     the caller must not read that as "nothing to compare". */
  function diffPositional(outKey, before, after) {
    if (!isPositionalOutput(outKey)) return null;
    var was = indexSpans(before, outKey);
    var now = indexSpans(after, outKey);
    var changes = [];
    Object.keys(now).forEach(function (key) {
      var current = now[key];
      var previous = was[key];
      if (!previous) changes.push({ kind: 'added', span: current });
      else if (previous.end !== current.end) changes.push({ kind: 'boundary', span: current, from: previous });
    });
    Object.keys(was).forEach(function (key) {
      if (!now[key]) changes.push({ kind: 'removed', span: was[key] });
    });
    return changes.sort(function (a, b) {
      return a.span.start - b.span.start;
    });
  }

  global.LabelSuiteAnnotationHistory = {
    ACTIONS: ACTIONS,
    ACTION_VALUES: ACTION_VALUES,
    isKnownAction: isKnownAction,
    badgeClassFor: badgeClassFor,
    isPositionalOutput: isPositionalOutput,
    diffPositional: diffPositional,
  };
})(window);

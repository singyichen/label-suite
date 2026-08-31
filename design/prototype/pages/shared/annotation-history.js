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

  global.LabelSuiteAnnotationHistory = {
    ACTIONS: ACTIONS,
    ACTION_VALUES: ACTION_VALUES,
    isKnownAction: isKnownAction,
    badgeClassFor: badgeClassFor,
  };
})(window);

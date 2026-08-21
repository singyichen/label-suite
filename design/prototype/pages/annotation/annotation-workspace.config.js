/* annotation-workspace.config.js
 * Host glue for the Annotation Workspace page (spec 015 v2.0.0). Mounts the
 * shared task-config engine (task-config.{data,yaml,dataset,engine}.js) the
 * same way task-detail.config.js does for the task-detail page: supplies
 * the required globals (state, t, el, setText, ...), seeds engine state
 * from a resolved TaskProfile, and renders the outputs[]-driven annotation
 * preview via updateAnnotationPreview()/renderOutputPreview().
 *
 * Every output-type panel the engine renders is registry-driven; this file
 * only *relabels* (data-testid/aria-pressed/data-value-set) the DOM the
 * engine already produced -- it never hardcodes per-task_id branches
 * (constitution: Generalization-First).
 */
(function () {
  'use strict';

  /* ── i18n ─────────────────────────────────────────────────────── */
  var I18N = {
    zh: {
      sampleListTitle: '標記清單',
      noteLabel: '備註（選填）',
      notePlaceholder: '若有特殊情況可在此說明…',
      submitLabel: '提交',
      saveLabel: '儲存草稿',
      wsSaveSuccess: '已儲存',
      wsPrevBtnLabel: '上一筆',
      wsNextBtnLabel: '下一筆',
      wsProgressText: '{done} / {total} 已提交',
      wsAutosaveSaved: '草稿已自動儲存',
      wsAutosaveSaving: '儲存中…',
      wsTabGuideline: '說明與檔案',
      wsTabHistory: '歷程',
      wsStatusSubmitted: '已提交',
      wsStatusSaved: '已儲存',
      wsStatusPending: '待標記',
      wsHistoryEmpty: '此筆樣本尚無歷程紀錄',
      wsHistoryRoleAnnotator: '標記員',
      wsHistoryRoleReviewer: '審核員',
      guidelineModalTitle: '請先閱讀任務說明',
      guidelineModalConfirm: '我已閱讀，開始標記',
      guidelineSummaryTitle: '任務說明',
      guidelineFileActionNewTab: '新分頁',
      guidelineFileActionPreview: '預覽',
      mobileDrawerTitle: '說明與檔案',
      guidelineImageModalCloseAria: '關閉圖片預覽',
      wsSubmitIncomplete: '請完成所有標記項目後再提交',
      wsSubmitSuccess: '已提交',
      reviewSubmitLabel: '送出審核',
      reviewApproveLabel: '通過',
      reviewRejectLabel: '退回',
      wsReviewSubmitSuccess: '審查已提交',
      reviewNoAnswer: '（無）',
      reviewNote: '通過：此筆標記有效。退回：該標記狀態會回到未標記，標記員需要重新標記。',
      reviewCorrectionTitle: '直接修正',
      toastSelectDecision: '請完成每位標記員的審核決策',
      toastResolveDivergent: '請先裁定所有分歧項目',
      arbitrationTitle: '爭議仲裁',
      arbitrationNote: '此審核單位已進入爭議池。請逐項裁定採用 A（標記員）或 B（審核員）的結果；仲裁不重新標記。',
      arbitrationAgreedTitle: '標記內容（唯讀）',
      arbitrationConvergedNote: '已依審核員多數決收斂',
      arbitrationSubmitLabel: '送出仲裁',
      toastArbitrationIncomplete: '請完成所有爭議項目的裁定',
      wsArbitrationSubmitSuccess: '仲裁已提交',
      arbitrationChoiceA: 'A・標記員',
      arbitrationChoiceB: 'B・審核員',
      historyActionOverridden: '已覆寫',
      historyActionGoldConfirmed: '已確認標準答案',
      historyActionGoldReopened: '重新開放標準答案',
    },
    en: {
      sampleListTitle: 'Samples',
      noteLabel: 'Notes (optional)',
      notePlaceholder: 'Describe special cases here...',
      submitLabel: 'Submit',
      saveLabel: 'Save draft',
      wsSaveSuccess: 'Saved',
      wsPrevBtnLabel: 'Previous',
      wsNextBtnLabel: 'Next',
      wsProgressText: '{done} / {total} submitted',
      wsAutosaveSaved: 'Draft auto-saved',
      wsAutosaveSaving: 'Saving…',
      wsTabGuideline: 'Guidelines & Files',
      wsTabHistory: 'History',
      wsStatusSubmitted: 'Submitted',
      wsStatusSaved: 'Saved',
      wsStatusPending: 'Pending',
      wsHistoryEmpty: 'No history for this sample yet',
      wsHistoryRoleAnnotator: 'Annotator',
      wsHistoryRoleReviewer: 'Reviewer',
      guidelineModalTitle: 'Please read the task guideline first',
      guidelineModalConfirm: "I've read it, start annotating",
      guidelineSummaryTitle: 'Task Guideline',
      guidelineFileActionNewTab: 'New tab',
      guidelineFileActionPreview: 'Preview',
      mobileDrawerTitle: 'Guidelines & Files',
      guidelineImageModalCloseAria: 'Close image preview',
      wsSubmitIncomplete: 'Please answer every output before submitting',
      wsSubmitSuccess: 'Submitted',
      reviewSubmitLabel: 'Submit review',
      reviewApproveLabel: 'Approve',
      reviewRejectLabel: 'Reject',
      wsReviewSubmitSuccess: 'Review submitted',
      reviewNoAnswer: '(none)',
      reviewNote: 'Approve: this annotation is valid. Reject: the sample returns to pending and the annotator must redo it.',
      reviewCorrectionTitle: 'Direct correction',
      toastSelectDecision: 'Please decide on every annotator before submitting',
      toastResolveDivergent: 'Please resolve every divergent item first',
      arbitrationTitle: 'Dispute arbitration',
      arbitrationNote: 'This review unit is in the dispute pool. Decide each item as A (annotator) or B (reviewer); arbitration does not re-annotate.',
      arbitrationAgreedTitle: 'Annotation (read-only)',
      arbitrationConvergedNote: 'Converged by reviewer majority',
      arbitrationSubmitLabel: 'Submit arbitration',
      toastArbitrationIncomplete: 'Please decide every dispute item first',
      wsArbitrationSubmitSuccess: 'Arbitration submitted',
      arbitrationChoiceA: 'A · Annotator',
      arbitrationChoiceB: 'B · Reviewer',
      historyActionOverridden: 'Overridden',
      historyActionGoldConfirmed: 'Gold confirmed',
      historyActionGoldReopened: 'Gold reopened',
    },
  };
  if (window.TASK_CONFIG_I18N) {
    Object.assign(I18N.zh, window.TASK_CONFIG_I18N.zh);
    Object.assign(I18N.en, window.TASK_CONFIG_I18N.en);
  }

  /* ── shared engine state (see task-config.engine.js header comment for
     the full list of fields the engine reads) ────────────────────── */
  var state = {
    lang: 'zh',
    selectedOutputTypes: [],
    outputConfigs: {},
    previewState: {},
    previewEntities: [],
    previewTriples: [],
    previewBypass: {},
    relDraft: { e1: null, rel: null, e2: null },
    activeEntityType: null,
    previewInited: false,
    datasetParsedColumns: [],
    datasetFieldProfile: {},
    datasetRawFirstRow: {},
    datasetPreviewRawRows: [],
    datasetParsedRows: [],
    datasetColumnUniqueValues: {},
    datasetTotalRecords: 0,
    fieldRoleMap: {},
    columnOutputTypeMap: {},
    itemPairLabels: null,
    taskInputTypes: ['single_item'],
    codeDraftDirty: false,
    _datasetRoots: [],
    datasetFiles: [],
    datasetRecordPath: '$',
  };

  /* ── required engine host globals ────────────────────────────────
     (task-config.engine.js header comment: state, t, el, setText,
     markDirty, revalidateCurrentStep, showFieldError, showToast, track,
     onChipSelectionChange, showTaxonomyDeleteModal/hideTaxonomyDeleteModal,
     getDatasetTotalEstimate).
     engine.js is a plain (non-module) top-level script: its functions close
     over the *true* global scope, not this IIFE's local scope, so every
     name on that contract must be attached to `window` explicitly -- a
     bare `var`/`function` declaration in here is invisible to it. */
  function t(key) {
    return (I18N[state.lang] || I18N.zh)[key] || key;
  }
  function el(id) {
    return document.getElementById(id);
  }
  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  function markDirty() {}
  function revalidateCurrentStep() {}
  function showFieldError() {}
  var toastTimer = null;
  /* Auto-dismiss per UXC-07: Error never auto-dismisses (manual close only). */
  var TOAST_DURATIONS = { success: 3000, info: 5000, warning: 8000, error: 0 };
  function showToast(msg, variant) {
    var toast = document.getElementById('toast');
    var toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    var v = TOAST_DURATIONS.hasOwnProperty(variant) ? variant : 'success';
    toast.className = 'toast toast-' + v + ' visible';
    toastMsg.textContent = msg || '';
    clearTimeout(toastTimer);
    if (TOAST_DURATIONS[v] > 0) {
      toastTimer = setTimeout(function () {
        toast.classList.remove('visible');
      }, TOAST_DURATIONS[v]);
    }
  }
  function hideToast() {
    var toast = document.getElementById('toast');
    if (toast) toast.classList.remove('visible');
    clearTimeout(toastTimer);
  }
  var toastCloseBtn = document.getElementById('toastClose');
  if (toastCloseBtn) toastCloseBtn.addEventListener('click', hideToast);
  function track() {}
  function onChipSelectionChange() {}
  function showTaxonomyDeleteModal(descendantCount, onConfirm) {
    if (typeof onConfirm === 'function') onConfirm();
  }
  function hideTaxonomyDeleteModal() {}
  function getDatasetTotalEstimate() {
    return currentProfile ? currentProfile.datasetRecords.length : 0;
  }

  window.state = state;
  window.t = t;
  window.el = el;
  window.setText = setText;
  window.markDirty = markDirty;
  window.revalidateCurrentStep = revalidateCurrentStep;
  window.showFieldError = showFieldError;
  window.showToast = showToast;
  window.track = track;
  window.onChipSelectionChange = onChipSelectionChange;
  window.showTaxonomyDeleteModal = showTaxonomyDeleteModal;
  window.hideTaxonomyDeleteModal = hideTaxonomyDeleteModal;
  window.getDatasetTotalEstimate = getDatasetTotalEstimate;

  /* ── testid-patch monkeypatch of renderOutputPreview ─────────────
     Captured BEFORE the override assignment below (var-hoisting of a
     later `function renderOutputPreview(){}` declaration in this same
     script would otherwise clobber the engine's original before this
     line runs -- using a plain assignment to a *new* name sidesteps
     that hoisting hazard entirely). */
  var originalRenderOutputPreview = renderOutputPreview;
  function patchedRenderOutputPreview(container, outKey) {
    container.setAttribute('data-testid', 'ws-output-panel-' + outKey);
    originalRenderOutputPreview(container, outKey);
    patchOutputPanel(outKey, container);
    /* relation_identification's bypass chip lives inside the unified
       entity+relation preview (patched separately by the
       renderAbsaUnifiedPreview monkeypatch below), not in this container. */
    if (outKey !== 'relation_identification') patchBypassChip(container, outKey);
  }
  renderOutputPreview = patchedRenderOutputPreview;

  /* ── card-regrouping monkeypatch of updateAnnotationPreview ──────
     The engine re-runs updateAnnotationPreview() from its own interaction
     handlers (chip clicks, taxonomy picks, ...), each time rebuilding
     #annotationPreview as flat siblings. The question-vs-annotation card
     split (spec 015 v2.3.0, 區塊 B) must therefore live on the patched
     function itself -- patching only renderWorkspace() would lose the
     cards on the first in-panel interaction. */
  var originalUpdateAnnotationPreview = updateAnnotationPreview;
  function patchedUpdateAnnotationPreview() {
    originalUpdateAnnotationPreview();
    if (!currentProfile || currentRole === 'reviewer') return;
    patchEvidenceAndInputContent();
    patchItemPairLayout();
    wrapAnnotatorCards();
  }
  updateAnnotationPreview = patchedUpdateAnnotationPreview;

  /* Regroup the engine's flat sibling output into two content-cards: the
     question block (evidence + input text) and the annotation block (all
     output-type panels). The boundary is found structurally -- the first
     .preview-unified wrap or ws-output-panel-* container, stepping back
     over the title/divider the engine renders immediately before it --
     never by task_id or output-type name (Generalization-First). */
  function wrapAnnotatorCards() {
    var preview = document.getElementById('annotationPreview');
    if (!preview || preview.children.length === 0) return;
    var first = preview.children[0];
    if (first.getAttribute && /^ws-(question|annotation)-card$/.test(first.getAttribute('data-testid') || '')) return;
    var children = Array.prototype.slice.call(preview.children);
    var boundary = children.length;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var testid = (child.getAttribute && child.getAttribute('data-testid')) || '';
      if ((child.classList && child.classList.contains('preview-unified')) || /^ws-output-panel-/.test(testid)) {
        boundary = i;
        break;
      }
    }
    while (boundary > 0) {
      var prev = children[boundary - 1];
      var isTitleOrDivider =
        prev.classList &&
        (prev.classList.contains('annotation-preview-task-title') ||
          prev.classList.contains('annotation-preview-divider'));
      if (!isTitleOrDivider) break;
      boundary--;
    }
    var questionEls = children.slice(0, boundary);
    var outputEls = children.slice(boundary);
    if (questionEls.length > 0) {
      var questionCard = document.createElement('div');
      questionCard.className = 'content-card';
      questionCard.setAttribute('data-testid', 'ws-question-card');
      questionEls.forEach(function (node) { questionCard.appendChild(node); });
      preview.appendChild(questionCard);
    }
    if (outputEls.length > 0) {
      var annotationCard = document.createElement('div');
      annotationCard.className = 'content-card';
      annotationCard.setAttribute('data-testid', 'ws-annotation-card');
      outputEls.forEach(function (node) { annotationCard.appendChild(node); });
      preview.appendChild(annotationCard);
    }
  }

  function patchOutputPanel(outKey, container) {
    if (outKey === 'single_label') patchSingleLabelPanel(container);
    else if (outKey === 'single_dim') patchSingleDimPanel(container);
    else if (outKey === 'free_text') patchFreeTextPanel(container);
    else if (outKey === 'multi_label') patchMultiLabelPanel(container);
    else if (outKey === 'multi_dim') patchMultiDimPanel(container);
    else if (outKey === 'sequence_tagging') patchSequenceTaggingPanel(container);
    else if (outKey === 'entity_recognition') patchSpanOnlyPanel(container);
    /* relation_identification routes entirely through
       renderAbsaUnifiedPreview -- patched by its own monkeypatch. */
  }

  /* ── shared bypass-chip patching (all output types) ──────────────
     makeBypassChip()/appendBypassControl() (task-config.engine.js) always
     emit the same fixed bilingual label text, so it's found the same way
     for every output type -- no per-type lookup needed. Playwright's
     .check()/.uncheck() require a native checkbox/radio input OR an ARIA
     checkbox/radio/switch role with aria-checked; the engine's chip is a
     plain <button aria-pressed>, so role+aria-checked are added here,
     mirroring aria-pressed on every render (the chip is recreated fresh
     each render, so this must re-run every time, not just once). */
  var BYPASS_LABEL_ZH = '無法判定 (Bypass)';
  var BYPASS_LABEL_EN = 'Unable to determine (Bypass)';
  function findBypassChip(container) {
    var buttons = container.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      /* Use substring match, not exact equality: makeBypassChip() prepends
         a "✓" glyph to the chip's own textContent once active/bypassed, so
         an exact-equality check would only match the chip on its very
         first (never-yet-bypassed) render and silently miss it afterward. */
      var text = buttons[i].textContent.trim();
      if (text.indexOf(BYPASS_LABEL_ZH) >= 0 || text.indexOf(BYPASS_LABEL_EN) >= 0) return buttons[i];
    }
    return null;
  }
  /* Native `.disabled` on every interactive descendant except the bypass
     chip itself (which must stay clickable so the annotator can un-bypass).
     The engine's own disableBypassedArea() only sets CSS opacity/
     pointerEvents, never the native `disabled` property Playwright's
     toBeDisabled() checks. */
  function applyBypassDisabledState(container, excludeEl) {
    var interactive = container.querySelectorAll('button, input, select, textarea');
    Array.prototype.forEach.call(interactive, function (node) {
      if (node === excludeEl) return;
      node.disabled = true;
    });
  }
  function patchBypassChip(container, outKey) {
    var chip = findBypassChip(container);
    if (!chip) return;
    chip.setAttribute('data-testid', 'ws-bypass-' + outKey);
    chip.setAttribute('role', 'checkbox');
    chip.setAttribute('aria-checked', chip.getAttribute('aria-pressed') === 'true' ? 'true' : 'false');
    /* The taxonomy selector dialog (multi_label) is absolutely positioned
       with z-index:40 and overlays whatever renders after it in the same
       container (the bypass control included) while open -- the same
       visual contract as task-new Step 2. Do NOT lift the bypass row above
       it: the engine's outside-click handler already closes the dialog on
       the first click outside the selector, so the control is reachable by
       simply dismissing the dialog first. */
    if (state.previewBypass[outKey]) applyBypassDisabledState(container, chip);
  }

  function patchSingleLabelPanel(container) {
    var ps = state.previewState.single_label || {};
    var buttons = container.querySelectorAll('button');
    Array.prototype.forEach.call(buttons, function (chip) {
      /* The bypass chip already sets its own aria-pressed (makeBypassChip);
         leave it alone here -- it gets its ws-bypass-{type} testid in
         Phase 2. */
      if (chip.hasAttribute('aria-pressed')) return;
      var label = chip.textContent.trim();
      if (!label) return;
      chip.setAttribute('data-testid', 'ws-single-label-chip-' + label);
      chip.setAttribute('aria-pressed', ps.selected === label ? 'true' : 'false');
    });
  }

  function patchSingleDimPanel(container) {
    var slider = container.querySelector('[data-testid="single-dim-slider"]');
    if (!slider) return;
    var valueEl = container.querySelector('[data-testid="single-dim-value-tooltip"]');
    var input = container.querySelector('[data-testid="single-dim-value-input"]');
    slider.setAttribute('data-testid', 'ws-single-dim-slider');
    if (valueEl) valueEl.setAttribute('data-testid', 'ws-single-dim-value');
    if (input) input.setAttribute('data-testid', 'ws-single-dim-input');

    var ps = state.previewState.single_dim || {};
    /* The value label always mirrors the slider's current number (prefill
       per FR-024M, or the engine's midpoint start position), matching the
       number input beside it -- the engine's own task-new Step 2 behavior.
       "Unanswered" is enforced at the submit gate (isOutputAnswered reads
       ps._touched/ps._seeded), not by dashing the display. The one state
       that dashes the label is bypass: the answer is explicitly cleared,
       so no number may show. */
    if (state.previewBypass.single_dim) {
      slider.dataset.valueSet = 'false';
      if (valueEl) valueEl.textContent = '—';
    } else {
      slider.dataset.valueSet = 'true';
    }

    slider.addEventListener('input', function () {
      ps._touched = true;
      slider.dataset.valueSet = 'true';
    });
    if (input) {
      input.addEventListener('input', function () {
        ps._touched = true;
        slider.dataset.valueSet = 'true';
      });
    }
  }

  function patchFreeTextPanel(container) {
    /* free_text is the only current output type with rendersInputPreview:true,
       so its container embeds the input-preview block ahead of the actual
       answer control. Tag it directly (engine.js ~3199-3201 always renders
       generation-input-preview inside this same container when free_text
       owns the input preview) instead of depending on the annotator-only
       patchEvidenceAndInputContent() -- buildReviewRow() reuses this same
       renderOutputPreview() dispatch for the reviewer's correction control,
       which never calls that annotator-only patch. Move the
       ws-output-panel-free_text testid off the container (which would
       otherwise start at the same y as the input preview it wraps) onto the
       response-area sub-tree, so it represents only the answer control --
       matching every other output type, whose container IS the answer
       control since they don't own an input preview. */
    var inputPreview = container.querySelector('[data-testid="generation-input-preview"]');
    if (inputPreview) inputPreview.setAttribute('data-testid', 'ws-input-content');
    var responseArea = container.querySelector('[data-testid="free-text-response-area"]');
    if (responseArea) {
      container.removeAttribute('data-testid');
      responseArea.setAttribute('data-testid', 'ws-output-panel-free_text');
    }
    var textarea = container.querySelector('[data-testid="generation-answer-input"]');
    if (!textarea) return;
    textarea.setAttribute('data-testid', 'ws-free-text-input');
    var counter = textarea.nextElementSibling;
    if (!counter) return;
    counter.setAttribute('data-testid', 'ws-free-text-counter');
    var cfg = state.outputConfigs.free_text || {};
    var maxLen = cfg.max_length || 512;
    function refreshCounter() {
      counter.textContent = textarea.value.length + '/' + maxLen;
    }
    refreshCounter();
    textarea.addEventListener('input', refreshCounter);
  }

  /* multi_label: the trigger+dialog UI is reused verbatim from task-new
     Step 2's preview (see claude-progress.md 裁決 2026-08-07) -- this only
     relabels testids on the engine-produced DOM, it never builds a custom
     chip bar. ws-multi-label-chip-{id} is the *selected-path* chip
     (taxonomy-selected-path), not a standalone toggle. */
  function patchMultiLabelPanel(container) {
    var ps = state.previewState.multi_label || {};
    var selected = Array.isArray(ps.selected) ? ps.selected : [];

    function tagOptions() {
      var options = container.querySelectorAll('[data-testid="taxonomy-preview-option"]');
      Array.prototype.forEach.call(options, function (option) {
        var nodeId = option.getAttribute('data-node-id');
        if (nodeId != null) option.setAttribute('data-testid', 'ws-multi-label-node-' + nodeId);
      });
    }
    tagOptions();

    var trigger = container.querySelector('[data-testid="taxonomy-selector-trigger"]');
    if (trigger) {
      trigger.setAttribute('data-testid', 'ws-multi-label-selector-toggle');
      /* Opening the dialog calls the engine's own renderChoices() directly
         (not refreshOutputPreview), rebuilding every option node without
         going through this monkeypatch -- re-tag after the engine's own
         (synchronously-registered-first) click handler has already run. */
      trigger.addEventListener('click', tagOptions);
    }

    /* Selected-path chips render in the same order as ps.selected; the leaf
       id (last entry of each idPath) is the chip's testid suffix. */
    var chips = container.querySelectorAll('[data-testid="taxonomy-selected-path"]');
    Array.prototype.forEach.call(chips, function (chip, idx) {
      var path = selected[idx];
      var leafId = Array.isArray(path) && path.length ? path[path.length - 1] : null;
      if (leafId != null) chip.setAttribute('data-testid', 'ws-multi-label-chip-' + leafId);
    });

    /* The engine proactively aria-disables options once max_selections is
       reached (no native "limit hit" hint) -- surface one here so the
       annotator gets the same feedback the disabled state implies. */
    var cfg = state.outputConfigs.multi_label || {};
    var maxSetting = Number(cfg.max_selections) || 0;
    if (maxSetting > 0 && selected.length >= maxSetting) {
      var hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.setAttribute('data-testid', 'ws-multi-label-limit-hint');
      hint.textContent =
        state.lang === 'zh'
          ? '已達最多可選數量（' + maxSetting + '）'
          : 'You can select at most ' + maxSetting + ' labels';
      container.appendChild(hint);
    }
  }

  /* renderMultiDimPreview() (engine.js ~1772-1821) gives every dimension's
     slider/value/numeric-input the SAME fixed testid ('multi-dim-slider' /
     'multi-dim-value-tooltip' / 'multi-dim-value-input') and re-seeds every
     slider from the gold output column (or the range midpoint) on every
     render -- it owns no per-dimension previewState of its own, unlike
     single_dim/single_label. Positional zip against state.outputConfigs
     .multi_dim's dims array (same order the engine iterated in) gives each
     control its per-dimension testid, and ps.dims{} (this host's own nested
     previewState, persisted/restored generically like any other output
     type's previewState) tracks which dimensions the annotator has actually
     touched -- the submit gate (isOutputAnswered) needs that distinction;
     the value label itself keeps the engine's always-numeric display
     (prefill or midpoint), dashing only while bypassed. */
  function patchMultiDimPanel(container) {
    var cfg = state.outputConfigs.multi_dim || {};
    var dims = Array.isArray(cfg.dimensions) ? cfg.dimensions : (Array.isArray(cfg.va_dimensions) ? cfg.va_dimensions : []);
    /* Unlike single_dim/single_label, the engine never calls its own
       ensurePreviewState('multi_dim', ...) -- `|| {}` here would otherwise
       build a throwaway object every render, silently discarding ps.dims
       on the very next re-render. Assign back explicitly so this host's
       own multi_dim state is the one persisted/restored by
       snapshotCurrentSample()/restoreSample() like every other output
       type's previewState entry. */
    if (!state.previewState.multi_dim) state.previewState.multi_dim = {};
    var ps = state.previewState.multi_dim;
    ps.dims = ps.dims || {};

    var controls = container.querySelectorAll('[data-testid="multi-dim-control"]');
    Array.prototype.forEach.call(controls, function (control, idx) {
      var dim = dims[idx];
      var name = dim && dim.name;
      if (!name) return;
      var slider = control.querySelector('[data-testid="multi-dim-slider"]');
      var valueEl = control.querySelector('[data-testid="multi-dim-value-tooltip"]');
      var input = control.querySelector('[data-testid="multi-dim-value-input"]');
      if (slider) slider.setAttribute('data-testid', 'ws-multi-dim-slider-' + name);
      if (valueEl) valueEl.setAttribute('data-testid', 'ws-multi-dim-value-' + name);
      if (input) input.setAttribute('data-testid', 'ws-multi-dim-value-input-' + name);

      var saved = ps.dims[name];
      if (saved && saved.touched) {
        if (slider) slider.value = saved.value;
        if (valueEl) valueEl.textContent = saved.value;
        if (input) input.value = saved.value;
      } else if (state.previewBypass.multi_dim && valueEl) {
        /* Bypass clears the answer (ps.dims included), so the label may not
           show a number; every other state keeps the engine's numeric
           display -- see the block comment above. */
        valueEl.textContent = '—';
      }

      function markTouched() {
        ps.dims[name] = { value: slider ? slider.value : null, touched: true };
      }
      if (slider) slider.addEventListener('input', markTouched);
      if (input) input.addEventListener('input', markTouched);
    });
  }

  /* renderTokenClassPreview() (engine.js ~2858-3021) always requires the
     annotator to pick an already-fully-prefixed tag chip (e.g. "B-PER" vs
     "I-PER") before clicking a token. Spec 015 AC-2A.5 instead wants the
     annotator to pick just the entity TYPE, with the B-/I- continuation
     prefix computed automatically from whether the immediately-preceding
     token already carries the same type (BIO/IOB2/BIOES) -- SINGLE has no
     prefix at all, the bare type name IS the tag. This is genuinely
     different interaction semantics from the engine's literal per-tag
     chip bar (not a testid-only relabel), so this host builds its own
     type-level selector and re-binds token clicks; getSequenceBaseLabel()
     is an existing shared global (task-config.dataset.js), reused
     read-only here, not modified. */
  function patchSequenceTaggingPanel(container) {
    /* sequence_tagging (registry: rendersInputPreview:true, same as
       entity_recognition) also suppresses updateAnnotationPreview()'s
       generic top-level input block -- but renderTokenClassPreview()
       (engine.js, distinct from renderSpanOnlyPreview used by
       entity_recognition) already tags its own raw-text element with
       data-testid="sequence-source-text" (unlike renderSpanOnlyPreview,
       whose equivalent element patchSpanOnlyPanel relabels positionally).
       Relabel that existing testid'd element instead of guessing position. */
    var textEl = container.querySelector('[data-testid="sequence-source-text"]');
    if (textEl) textEl.setAttribute('data-testid', 'ws-input-content');

    var cfg = state.outputConfigs.sequence_tagging || {};
    var labels = Array.isArray(cfg.entities) ? cfg.entities.filter(function (e) { return e && e.name; }) : [];
    var scheme = cfg.tagging_scheme || 'BIO';
    var ps = state.previewState.sequence_tagging;
    if (!ps || !Array.isArray(ps.tokens)) return;

    var engineChipOption = container.querySelector('[data-testid="sequence-tag-option"]');
    var engineChipBar = engineChipOption ? engineChipOption.parentElement : null;
    if (engineChipBar) engineChipBar.style.display = 'none';

    var typeBar = document.createElement('div');
    typeBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;';
    labels.forEach(function (label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-testid', 'ws-seq-tag-btn-' + label.name);
      var isActive = ps.activeEntityType === label.name;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      var color = label.color || 'var(--color-primary)';
      btn.style.cssText = 'padding:4px 10px;border-radius:var(--radius-md);font-size:12px;font-weight:700;cursor:pointer;border:2px solid ' + color + ';color:' + (isActive ? 'var(--color-white)' : color) + ';background:' + (isActive ? color : 'transparent') + ';';
      btn.textContent = label.name;
      btn.addEventListener('click', function () {
        ps.activeEntityType = label.name;
        refreshOutputPreview(container, 'sequence_tagging');
      });
      typeBar.appendChild(btn);
    });
    if (engineChipBar && engineChipBar.parentNode) {
      engineChipBar.parentNode.insertBefore(typeBar, engineChipBar);
    } else {
      container.appendChild(typeBar);
    }

    var tokenButtons = container.querySelectorAll('[data-testid="sequence-token"]');
    Array.prototype.forEach.call(tokenButtons, function (tokEl, idx) {
      /* Strip the engine's own click listener (bound to its own
         ps.activeTag chip-selection model, which this host UI doesn't
         use) by cloning -- cloneNode never copies listeners. */
      var fresh = tokEl.cloneNode(true);
      tokEl.parentNode.replaceChild(fresh, tokEl);
      var textSpan = fresh.querySelector('[data-testid="sequence-token-text"]');
      if (textSpan) {
        textSpan.setAttribute('data-testid', 'ws-seq-token');
        textSpan.setAttribute('data-tag', ps.tokens[idx] || 'O');
      }
      fresh.addEventListener('click', function () {
        if (!ps.activeEntityType) return;
        var tag;
        if (scheme === 'SINGLE') {
          tag = ps.activeEntityType;
        } else {
          var prevBase = idx > 0 ? getSequenceBaseLabel(ps.tokens[idx - 1], labels) : null;
          tag = (prevBase === ps.activeEntityType ? 'I-' : 'B-') + ps.activeEntityType;
        }
        ps.tokens[idx] = tag;
        refreshOutputPreview(container, 'sequence_tagging');
      });
    });
  }

  /* entity_recognition (registry: rendersInputPreview:true, task-config.data.js)
     already suppresses updateAnnotationPreview()'s generic top-level input
     block, but renderSpanOnlyPreview() (engine.js) never tags its own
     equivalent text element with a testid the way renderFreeTextPreview()
     does for free_text -- so patchEvidenceAndInputContent()'s lookup finds
     nothing and ws-input-content would never exist. Relabel the panel's own
     text element directly instead; its native mouseup->entity-creation
     handler is reused completely untouched (span selection, entity type
     legend, entity list all stay engine-driven). Buttons are told apart by
     textContent against the configured entity type names, not DOM position,
     since the entity list (and its own delete buttons) only renders once at
     least one entity exists. */
  function patchSpanOnlyPanel(container) {
    var cfg = state.outputConfigs.entity_recognition || {};
    var typeNames = {};
    (Array.isArray(cfg.entities) ? cfg.entities : []).forEach(function (e) {
      if (e && e.name) typeNames[e.name] = true;
    });

    /* In reviewer mode buildReviewRow() renders one independent row per
       selected output type, so when relation_identification is ALSO
       selected, renderOutputPreview('relation_identification') separately
       renders the full integrated absa-unified preview (patchAbsaUnifiedPreview
       already tags its own ws-input-content there) -- skip the duplicate
       tag here so only one ws-input-content locator exists on the page.
       (In annotator mode this branch never runs for the composed case at
       all -- updateAnnotationPreview() bypasses renderSpanOnlyPreview
       entirely and calls the unified preview directly -- so this check is a
       no-op there.) */
    var relAlsoSelected = state.selectedOutputTypes.indexOf('relation_identification') >= 0;
    var textEl = container.firstElementChild;
    if (textEl && !relAlsoSelected) textEl.setAttribute('data-testid', 'ws-input-content');

    /* The engine's own bypass-chip append (originalRenderOutputPreview's
       tail, part of the untouched engine render) already ran by this point
       -- exclude it from the button classification below, or it gets
       misread as a stray entity-list delete button. */
    var bypassChip = findBypassChip(container);

    var buttons = container.querySelectorAll('button');
    Array.prototype.forEach.call(buttons, function (btn) {
      if (btn === bypassChip) return;
      var text = btn.textContent.trim();
      if (typeNames[text]) {
        btn.setAttribute('data-testid', 'ws-er-type-btn-' + text);
        return;
      }
      /* Not a type chip -> the per-entity delete button inside an entity
         list row; tag the row itself and the button. */
      var row = btn.parentElement;
      if (row) row.setAttribute('data-testid', 'ws-er-entity-item');
      btn.setAttribute('data-testid', 'ws-er-entity-delete');
    });
  }

  /* ── relation_identification (pure & integrated-with-entity_recognition
     modes) ──────────────────────────────────────────────────────────
     Both modes render through the SAME shared renderAbsaUnifiedPreview()
     (task-config.engine.js): pure mode reaches it via renderOutputPreview's
     per-type dispatch (patched above), integrated mode is called DIRECTLY
     from updateAnnotationPreview()'s dependency-chain branch, bypassing that
     dispatch entirely. A second, separate monkeypatch is required for that
     reason -- captured the same way as originalRenderOutputPreview above,
     and for the same reason (top-level script global closure). */
  var originalRenderAbsaUnifiedPreview = renderAbsaUnifiedPreview;
  function patchedRenderAbsaUnifiedPreview(container) {
    originalRenderAbsaUnifiedPreview(container);
    patchAbsaUnifiedPreview(container);
  }
  renderAbsaUnifiedPreview = patchedRenderAbsaUnifiedPreview;

  function fmtEntityForTriple(ent) {
    var entityLabel = ent.text || '?';
    if (ent.start != null && ent.end != null) entityLabel += ' (' + ent.start + ',' + ent.end + ')';
    return entityLabel;
  }
  function tripleReferencesEntity(triple, ent) {
    var label = fmtEntityForTriple(ent);
    return triple.subj === label || triple.obj === label;
  }

  /* Entity type legend chips + entity list rows only render when
     entity_recognition is also selected (allowEntityEditing, i.e. this IS
     the integrated mode) -- pure relation_identification never groups an
     entity region at all. Cascade-deletes any triple that referenced the
     removed entity, since the engine's own delete handler only removes the
     entity itself -- replacing (not stacking onto) its click listener keeps
     entity-splice + triple-cascade + refresh as a single atomic step. */
  function patchAbsaEntityRegion(container, entityWrap) {
    var tc = getPreviewTypeColorMap();
    var typeNames = {};
    (tc.order || []).forEach(function (name) {
      typeNames[name] = true;
    });
    var buttons = entityWrap.querySelectorAll('button');
    Array.prototype.forEach.call(buttons, function (btn) {
      var text = btn.textContent.trim();
      if (typeNames[text]) {
        btn.setAttribute('data-testid', 'ws-er-type-btn-' + text);
        return;
      }
      var row = btn.parentElement;
      if (!row || !row.parentElement) return;
      row.setAttribute('data-testid', 'ws-er-entity-item');
      var idx = Array.prototype.indexOf.call(row.parentElement.children, row);
      var deletedEntity = state.previewEntities[idx];
      var newBtn = btn.cloneNode(true);
      newBtn.setAttribute('data-testid', 'ws-er-entity-delete');
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', function () {
        var i = state.previewEntities.indexOf(deletedEntity);
        if (i < 0) return;
        state.previewEntities.splice(i, 1);
        state.previewTriples = state.previewTriples.filter(function (tr) {
          return !tripleReferencesEntity(tr, deletedEntity);
        });
        renderAbsaUnifiedPreview_refresh(container);
      });
    });
  }

  /* The relation builder itself is the engine's own sequential state
     machine (buildRelationStateMachine: passage selection → E1/Arg1 →
     Relation → E2/Arg2 → 退回/新增, plus the per-row 類型/刪除 controls on
     the triple list) — the exact control task-new Step 2 and task-detail
     標記設定 render. The workspace only relabels it with the ws-ri-*
     testid contract; it must not swap in a different builder UI.
     state.previewEntities/previewTriples/relDraft stay the single source
     of truth, so cross-sample persistence keeps working via the existing
     snapshotCurrentSample()/restoreSample() deep-clone mechanism. */
  function patchRelationSection(relSection) {
    var relList = relSection.querySelector('.absa-relation-list');

    /* Draft status chips render in fixed order E1 / Rel / E2 ahead of the
       button row (buildRelationStateMachine's status div) -- located by the
       'E1：' chip text rather than child position. */
    var statusEl = Array.prototype.find.call(relSection.children, function (child) {
      var first = child.firstElementChild;
      return first && first.tagName === 'SPAN' && first.textContent.indexOf('E1') === 0;
    });
    if (statusEl && statusEl.children.length >= 3) {
      ['e1', 'rel', 'e2'].forEach(function (key, i) {
        statusEl.children[i].setAttribute('data-testid', 'ws-ri-slot-' + key);
      });
    }

    var builderBtnIds = {};
    builderBtnIds['E1/Arg1'] = 'ws-ri-e1-btn';
    builderBtnIds['Relation'] = 'ws-ri-relation-btn';
    builderBtnIds['E2/Arg2'] = 'ws-ri-e2-btn';
    builderBtnIds[state.lang === 'zh' ? '退回' : 'Undo'] = 'ws-ri-undo-btn';
    builderBtnIds[state.lang === 'zh' ? '新增' : 'Add'] = 'ws-ri-add-btn';
    Array.prototype.forEach.call(relSection.querySelectorAll('button'), function (btn) {
      if (relList && relList.contains(btn)) return;
      var id = builderBtnIds[btn.textContent.trim()];
      if (!id) return;
      btn.setAttribute('data-testid', id);
      if (id === 'ws-ri-undo-btn') {
        btn.setAttribute('aria-label', state.lang === 'zh' ? '撤銷' : 'Undo');
      }
    });

    if (relList) {
      Array.prototype.forEach.call(relList.children, function (row) {
        if (!row.classList || !row.classList.contains('absa-relation-row')) return;
        row.setAttribute('data-testid', 'ws-ri-triple-item');
        Array.prototype.forEach.call(row.querySelectorAll('button'), function (btn) {
          var text = btn.textContent.trim();
          if (text === '類型' || text === 'type') {
            btn.setAttribute('data-testid', 'ws-ri-triple-type-btn');
          } else if (text === '刪除' || text === 'Del') {
            btn.setAttribute('data-testid', 'ws-ri-triple-delete');
          }
        });
      });
    }
  }

  /* Bypass chips for this unified view are appended last, one per selected
     output type sharing it, in push order entity_recognition then
     relation_identification (renderAbsaUnifiedPreview's own bypassChips
     array) -- reused here to assign testids positionally rather than by
     text match, since both chips can share the exact same label text when
     only one output type is present. */
  function patchAbsaBypassChips(container, entityWrap, relSection, hasSpanOut, hasRelOut) {
    var last = container.lastElementChild;
    if (!last || last === entityWrap || last === relSection) return;
    var buttons = last.querySelectorAll('button');
    if (buttons.length === 0) return;
    var isBypassWrap = Array.prototype.some.call(buttons, function (b) {
      var text = b.textContent.trim();
      return text.indexOf(BYPASS_LABEL_ZH) >= 0 || text.indexOf(BYPASS_LABEL_EN) >= 0;
    });
    if (!isBypassWrap) return;
    var order = [];
    if (hasSpanOut) order.push('entity_recognition');
    if (hasRelOut) order.push('relation_identification');
    Array.prototype.forEach.call(buttons, function (btn, i) {
      var outKey = order[i];
      if (!outKey) return;
      btn.setAttribute('data-testid', 'ws-bypass-' + outKey);
      btn.setAttribute('role', 'checkbox');
      btn.setAttribute('aria-checked', btn.getAttribute('aria-pressed') === 'true' ? 'true' : 'false');
    });
  }

  function patchAbsaUnifiedPreview(container) {
    /* renderAbsaUnifiedPreview() (engine.js ~2076) never tags its own raw-text
       node with a testid at all (unlike free_text's generation-input-preview
       or sequence_tagging's sequence-source-text) -- relabel it directly by
       its fixed CSS class, the same shape it renders in both pure
       relation_identification and integrated entity_recognition+
       relation_identification modes. */
    var textEl = container.querySelector('.absa-preview-text');
    if (textEl) textEl.setAttribute('data-testid', 'ws-input-content');

    var hasSpanOut = state.selectedOutputTypes.indexOf('entity_recognition') >= 0;
    var hasRelOut = state.selectedOutputTypes.indexOf('relation_identification') >= 0;

    var relListEl = container.querySelector('.absa-relation-list');
    var relSection = relListEl ? relListEl.parentElement : null;

    /* Group the shared text + (when present) entity legend/list into their
       own ws-output-panel-entity_recognition region -- only meaningful when
       entity_recognition is actually composed alongside relation_identification
       (i.e. this IS the integrated mode); pure relation_identification never
       renders that region at all, and its own ws-output-panel-* testid
       already comes from the outer renderOutputPreview dispatch instead. */
    var entityWrap = null;
    if (hasSpanOut) {
      var divider = container.querySelector('.annotation-preview-divider');
      if (divider) {
        entityWrap = document.createElement('div');
        entityWrap.setAttribute('data-testid', 'ws-output-panel-entity_recognition');
        var node = container.firstChild;
        while (node && node !== divider) {
          var next = node.nextSibling;
          entityWrap.appendChild(node);
          node = next;
        }
        container.insertBefore(entityWrap, divider);
      }
      patchAbsaEntityRegion(container, entityWrap || container);
      if (relSection) relSection.setAttribute('data-testid', 'ws-output-panel-relation_identification');
    }

    if (relSection && hasRelOut) patchRelationSection(relSection);

    patchAbsaBypassChips(container, entityWrap, relSection, hasSpanOut, hasRelOut);
  }

  /* Rename the evidence-card / generic input-content wraps that
     updateAnnotationPreview() builds directly (i.e. outside of the
     per-output-type renderOutputPreview dispatch patched above). */
  function patchEvidenceAndInputContent() {
    var preview = document.getElementById('annotationPreview');
    if (!preview) return;

    var evidence = preview.querySelector('[data-testid="generation-evidence-preview"]');
    if (evidence) evidence.setAttribute('data-testid', 'ws-evidence-card');

    var inputPreview = preview.querySelector('[data-testid="generation-input-preview"]');
    if (inputPreview) {
      inputPreview.setAttribute('data-testid', 'ws-input-content');
      return;
    }
    /* No output type owns rendersInputPreview/rendersEvidencePreview (e.g.
       plain single_label): updateAnnotationPreview()'s generic input block
       renders without a testid in that configuration. Tag its direct-child
       .annotation-preview-sample structurally instead of hardcoding a
       task_id branch. */
    var fallback = Array.prototype.find.call(preview.children, function (child) {
      return (
        child.classList &&
        child.classList.contains('annotation-preview-sample') &&
        !child.hasAttribute('data-testid')
      );
    });
    if (fallback) fallback.setAttribute('data-testid', 'ws-input-content');
  }

  /* ── item_pair input layout (FR-024K / US2B) ─────────────────────
     taskInputTypes:['item_pair'] tasks (e.g. NLI: Premise/Hypothesis) show
     the two 'input'-role columns side by side instead of the single joined
     text block updateAnnotationPreview() renders generically. The two
     columns are picked by fieldRoleMap declaration order (not by hardcoded
     column names), and their display labels come from the task-creator's
     itemPairLabels when set, else fall back to the raw column names. */
  function buildItemPairColumn(label, value, testidPrefix) {
    var wrap = document.createElement('div');
    wrap.className = 'item-pair-column';
    var labelEl = document.createElement('div');
    labelEl.className = 'item-pair-label';
    labelEl.setAttribute('data-testid', testidPrefix + '-label');
    labelEl.textContent = label;
    wrap.appendChild(labelEl);
    var contentEl = document.createElement('div');
    contentEl.className = 'item-pair-content';
    contentEl.setAttribute('data-testid', testidPrefix);
    contentEl.textContent = value != null ? String(value) : '';
    wrap.appendChild(contentEl);
    return wrap;
  }
  function patchItemPairLayout() {
    if (state.taskInputTypes.indexOf('item_pair') < 0) return;
    /* updateAnnotationPreview() renders item_pair input as its own
       .annotation-preview-pair wrapper (a sibling structure to the generic
       single-field block patchEvidenceAndInputContent()'s fallback looks
       for), so it's located directly rather than through ws-input-content. */
    var container = document.querySelector('#annotationPreview .annotation-preview-pair');
    if (!container) return;
    var inputCols = Object.keys(state.fieldRoleMap).filter(function (col) {
      return state.fieldRoleMap[col] === 'input';
    });
    var leftCol = inputCols[0];
    var rightCol = inputCols[1];
    if (!leftCol || !rightCol) return;
    var labels =
      Array.isArray(state.itemPairLabels) && state.itemPairLabels.length >= 2
        ? state.itemPairLabels
        : [leftCol, rightCol];
    while (container.firstChild) container.removeChild(container.firstChild);
    var leftColumn = buildItemPairColumn(labels[0], state.datasetRawFirstRow[leftCol], 'ws-item-pair-left');
    /* The generic dashboard sweep (dashboard-output-types.spec.ts) looks up
       a single ws-input-content locator for every task regardless of input
       layout -- tag the wrap (not the inner ws-item-pair-left content node,
       which the item_pair-specific spec already owns) so both testids
       resolve to distinct elements without a data-testid collision. */
    leftColumn.setAttribute('data-testid', 'ws-input-content');
    container.appendChild(leftColumn);
    container.appendChild(
      buildItemPairColumn(labels[1], state.datasetRawFirstRow[rightCol], 'ws-item-pair-right')
    );
  }

  /* ── Data Fairness exception: output-role prefill (013 FR-003g-5) ────
     sanitizeRecordForAnnotator() (data.js) is the actual enforcement
     boundary: it strips every field that is NOT declared in
     profile.fieldRoleMap at all, hiding any undeclared ground truth from
     the annotator/reviewer. That stays unconditional.
     Fields that ARE explicitly declared 'output' role are, by definition,
     annotator-visible preannotation scaffolding, not held-out ground
     truth -- 013 FR-003g-5 requires this to prefill the corresponding
     input UI for every output type ("single_label 預選匹配的標籤；
     single_dim 滑桿設於實際分數值"), mirroring task-new Step 2's own
     preview via the shared engine's initPreviewState()
     (task-config.engine.js:1824). This applies uniformly across all 8
     output types -- entity_recognition/relation_identification's
     list-of-object columns, free_text/single_label's scalar columns, and
     single_dim/multi_label/multi_dim/sequence_tagging alike -- keyed
     purely off fieldRoleMap, never off task_id or output-type name.
     ANNOTATOR ONLY (issue #161). The reviewer reviews one annotator's
     submitted answer, and FR-044a's seed precedence has no dataset-column
     term at all -- but every engine renderer default-merges from
     getOutputFieldValue(), which reads these very columns off
     datasetRawFirstRow. Re-injecting them for a reviewer therefore let the
     creator's gold value win wherever the annotator's own answer did not
     fill the slot: on T001/sent-001 the panel showed `positive` while the
     reviewed annotator had submitted `negative`, so the reviewer approved
     an answer nobody gave and FR-051/FR-052's review-unit status was
     computed off that wrong comparison (AC-3.35). Withholding the columns
     at the record boundary fixes every output type at once, because all
     nine prefill readers funnel through getOutputFieldValue(); a per-type
     guard would have to be re-added for each new type. */
  function looksLikeEntityList(value) {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value[0] &&
      typeof value[0] === 'object' &&
      value[0].text != null &&
      (value[0].start != null || value[0].type != null)
    );
  }
  function looksLikeTripleList(value) {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value[0] &&
      typeof value[0] === 'object' &&
      !!(value[0].entity1 || value[0].subj || value[0].target_text)
    );
  }
  function buildAnnotatorRecord(record, profile) {
    var sanitized = window.LabelSuiteAnnotationWorkspaceData.sanitizeRecordForAnnotator(
      record,
      profile.fieldRoleMap
    );
    if (currentRole !== 'reviewer') {
      Object.keys(profile.fieldRoleMap || {}).forEach(function (col) {
        if (profile.fieldRoleMap[col] !== 'output') return;
        if (record[col] === undefined) return;
        sanitized[col] = deepClone(record[col]);
      });
    }
    return sanitized;
  }

  /* ── TaskProfile / sample state ──────────────────────────────────── */
  var currentProfile = null;
  var currentRole = 'annotator';
  var currentRunType = 'dry_run';
  /* {annotatorId, reviewerId} resolved from the query params in boot();
     every submission-store call carries it so the workspace and the list it
     came from address the same bucket (spec 015 v3.8.0, FR-049). */
  var currentIdentity = null;
  var currentSampleId = null;
  var sampleAnswers = {};

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* The in-memory answer snapshot is keyed by REVIEW UNIT, not by sample
     (spec 015 v4.3.0, FR-056): a reviewer moving from sent-001 × kioleemg12
     to sent-001 × 113450022 stays on the same sample_id, so a sample-keyed
     map handed the second annotator the corrections made to the first --
     the reviewer would see their own edit attributed to someone who never
     gave it. For annotators the two keys are identical by construction
     (one unit per record), so their behaviour is unchanged. */
  function unitKey(sampleId, annotatorId) {
    if (currentRole !== 'reviewer') return String(sampleId);
    return String(sampleId) + '::' + (annotatorId || currentAnnotatorId());
  }

  function snapshotCurrentSample() {
    if (!currentSampleId) return;
    sampleAnswers[unitKey(currentSampleId)] = {
      previewState: deepClone(state.previewState),
      previewEntities: deepClone(state.previewEntities),
      previewTriples: deepClone(state.previewTriples),
      previewBypass: deepClone(state.previewBypass),
      relDraft: deepClone(state.relDraft),
      activeEntityType: state.activeEntityType,
      previewInited: state.previewInited,
    };
  }

  function restoreSample(sampleId) {
    var snap = sampleAnswers[unitKey(sampleId)];
    /* FR-026 cross-visit restore: with no in-memory snapshot (fresh page
       load), an annotator's persisted answers -- saved draft or earlier
       submission -- seed the controls instead of a blank state.
       Annotator-only: reviewer mode seeds from the annotator's submission
       via seedReviewState(), never from the reviewer's own bucket. */
    if (!snap && currentRole === 'annotator') {
      var stored = window.LabelSuiteAnnotationWorkspaceData.getSampleAnswers(
        currentProfile.id,
        currentRole,
        currentRunType,
        sampleId,
        currentIdentity
      );
      if (stored && stored.previewState) {
        snap = {
          previewState: stored.previewState,
          previewEntities: stored.previewEntities || [],
          previewTriples: stored.previewTriples || [],
          previewBypass: stored.previewBypass || {},
          relDraft: { e1: null, rel: null, e2: null },
          activeEntityType: null,
          /* Restored answers must not be overwritten by the engine's
             prefill re-seed on first render. */
          previewInited: true,
        };
      }
    }
    if (snap) {
      state.previewState = deepClone(snap.previewState);
      state.previewEntities = deepClone(snap.previewEntities);
      state.previewTriples = deepClone(snap.previewTriples);
      state.previewBypass = deepClone(snap.previewBypass);
      state.relDraft = deepClone(snap.relDraft);
      state.activeEntityType = snap.activeEntityType;
      state.previewInited = snap.previewInited;
    } else {
      state.previewState = {};
      state.previewEntities = [];
      state.previewTriples = [];
      state.previewBypass = {};
      state.relDraft = { e1: null, rel: null, e2: null };
      state.activeEntityType = null;
      state.previewInited = false;
    }
  }

  function seedEngineState(profile) {
    state.lang = state.lang || 'zh';
    state.selectedOutputTypes = profile.outputs.map(function (out) {
      return out.type;
    });
    state.outputConfigs = {};
    profile.outputs.forEach(function (out) {
      state.outputConfigs[out.type] = normalizeOutputConfig(out.type, out.config || {}, state.lang);
    });
    state.taskInputTypes = profile.taskInputTypes || ['single_item'];
    state.itemPairLabels = profile.itemPairLabels || null;
    state.columnOutputTypeMap = {};
    state.datasetFiles = [{ name: profile.datasetFileName || 'dataset.json' }];

    var sanitizedRecords = profile.datasetRecords.map(function (record) {
      return buildAnnotatorRecord(record, profile);
    });
    state._datasetRoots = [sanitizedRecords];
    state.datasetRecordPath = '$';
    state.fieldRoleMap = {};
    analyzeDataset();
    /* Wholesale-assign the profile's declared roles; getFieldsByRole()
       only ever consults roles for columns present in
       datasetParsedColumns, so a role entry pointing at a column that was
       stripped out during sanitization (i.e. any 'output'-role column) is
       simply never visited -- see task-config.engine.js:getFieldsByRole. */
    state.fieldRoleMap = Object.assign({}, profile.fieldRoleMap);
    /* getDatasetPreviewText() (engine.js) joins every 'input'-role column's
       String(value) into one preview-text blob. That's only meaningful for
       scalar (string-able) columns; an 'input'-role column whose value is
       an array or object (e.g. sequence_tagging's sibling pre-tokenized
       `tokens` column, kept alongside `text`) gets Array#toString()'d into
       comma-joined garbage and silently corrupts the token count. Demote
       any 'input' role whose first record's value isn't a scalar so it's
       excluded from that join -- this is a generic guard (any non-scalar
       input-role column, not just `tokens`), and it only affects
       getFieldsByRole('input')/preview-text joining; datasetRawFirstRow and
       datasetParsedColumns are unaffected, so getSequencePreviewTokens()'s
       rawRow.tokens fallback still works untouched. */
    var firstRawRow = state.datasetRawFirstRow || {};
    Object.keys(state.fieldRoleMap).forEach(function (col) {
      if (state.fieldRoleMap[col] !== 'input') return;
      var v = firstRawRow[col];
      if (v !== null && typeof v === 'object') delete state.fieldRoleMap[col];
    });
  }

  function renderWorkspace() {
    if (currentRole === 'reviewer') {
      renderReviewerWorkspace();
    } else {
      /* patched: original render + testid patches + question/annotation
         card regrouping (patchedUpdateAnnotationPreview above) */
      updateAnnotationPreview();
    }
    renderSampleList();
    renderSampleNav();
    renderHistoryPanel();
  }

  /* The unit the left column, the nav and the review card all address
     (spec 015 v4.3.0, FR-056). For a reviewer it is sample × annotator --
     the same flattening annotation-list.html applies, off the same
     getReviewerMockRows() roster, so the two pages can never disagree on
     how many units a task holds. For an annotator the record IS the unit,
     which is why every annotator-facing behaviour below is unchanged. */
  function buildUnits() {
    var data = window.LabelSuiteAnnotationWorkspaceData;
    var units = [];
    currentProfile.datasetRecords.forEach(function (record, idx) {
      var recordId = data.getRecordId(record, idx);
      if (currentRole !== 'reviewer') {
        units.push({ record: record, recordId: recordId, annotatorId: currentAnnotatorId() });
        return;
      }
      data.getReviewerMockRows(currentProfile.id, recordId).forEach(function (row) {
        units.push({ record: record, recordId: recordId, annotatorId: row.annotator });
      });
    });
    return units;
  }

  function unitIdentity(unit) {
    if (currentRole !== 'reviewer') return currentIdentity;
    return { annotatorId: unit.annotatorId, reviewerId: currentIdentity.reviewerId };
  }

  function isCurrentUnit(unit) {
    if (unit.recordId !== String(currentSampleId)) return false;
    return currentRole !== 'reviewer' || unit.annotatorId === currentAnnotatorId();
  }

  function currentUnitIndex(units) {
    for (var i = 0; i < units.length; i++) {
      if (isCurrentUnit(units[i])) return i;
    }
    return 0;
  }

  /* Submissions live in per-identity buckets, so a reviewer walking three
     annotators of one sample has three buckets to consult -- the single
     getSubmittedSampleCount() call the annotator path uses would only ever
     see the annotator the URL happened to open on. */
  function countSubmittedUnits(units) {
    var data = window.LabelSuiteAnnotationWorkspaceData;
    if (currentRole !== 'reviewer') {
      return data.getSubmittedSampleCount(currentProfile.id, currentRole, currentRunType, currentIdentity);
    }
    return units.filter(function (unit) {
      return data.isSampleSubmitted(currentProfile.id, 'reviewer', currentRunType, unit.recordId, unitIdentity(unit));
    }).length;
  }

  /* Top-of-column sample nav (區塊 B 上方導覽列): prev/next + submitted
     progress. Progress counts THIS role+run's submissions over the seeded
     unit list, matching what the prev/next buttons can actually reach. */
  function renderSampleNav() {
    var units = buildUnits();
    var total = units.length;
    var done = countSubmittedUnits(units);
    if (done > total) done = total;
    setText(
      'wsProgressText',
      t('wsProgressText').replace('{done}', String(done)).replace('{total}', String(total))
    );
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    var fill = document.getElementById('wsProgressFill');
    if (fill) fill.style.width = pct + '%';
    var track = document.getElementById('wsProgressTrack');
    if (track) track.setAttribute('aria-valuenow', String(pct));
    var idx = currentUnitIndex(units);
    var prevBtn = document.getElementById('wsPrevBtn');
    var nextBtn = document.getElementById('wsNextBtn');
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= total - 1;
  }

  /* Bottom-bar autosave indicator (AC-2.6 / SC-007): a transient 儲存中…
     flash that settles back to 草稿已自動儲存. Purely visual in the
     prototype -- actual draft persistence stays on 儲存草稿 (handleSave). */
  var autosaveTimer = null;
  function triggerAutosave() {
    var dot = document.getElementById('wsAutosaveDot');
    if (!dot) return;
    dot.className = 'autosave-dot saving';
    setText('wsAutosaveLabel', t('wsAutosaveSaving'));
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      dot.className = 'autosave-dot saved';
      setText('wsAutosaveLabel', t('wsAutosaveSaved'));
    }, 700);
  }

  /* UXC-03: browser-navigation guard while the work column holds edits
     that 儲存草稿/提交 has not persisted (the autosave indicator is
     visual-only in the prototype — see triggerAutosave). Any interaction
     inside .col-content counts as an edit signal; the three persistence
     paths clear it. */
  var hasUnsavedChanges = false;
  function markUnsaved() { hasUnsavedChanges = true; }
  function clearUnsaved() { hasUnsavedChanges = false; }
  var workColumn = document.querySelector('.col-content');
  if (workColumn) {
    workColumn.addEventListener('input', markUnsaved, true);
    workColumn.addEventListener('change', markUnsaved, true);
    workColumn.addEventListener('click', markUnsaved, true);
  }
  window.addEventListener('beforeunload', function (event) {
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = '';
  });

  /* Right-column 歷程 tab (FR-016 / AC-3.8): renders the merged
     annotator+reviewer event chain for the current sample. */
  function formatHistoryTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function renderHistoryPanel() {
    var container = document.getElementById('wsHistoryContainer');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    var events = window.LabelSuiteAnnotationWorkspaceData.getSampleHistory(
      currentProfile.id,
      currentRunType,
      currentSampleId,
      currentIdentity
    );
    if (events.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = t('wsHistoryEmpty');
      container.appendChild(empty);
      return;
    }
    var list = document.createElement('div');
    list.className = 'history-list';
    events.slice().reverse().forEach(function (event) {
      var card = document.createElement('div');
      card.className = 'history-item';
      var header = document.createElement('div');
      header.className = 'history-item-header';
      var actor = document.createElement('span');
      actor.className = 'history-actor';
      /* FR-050: the role alone never answered "who did this" -- an official_run
         trail read 標記員 / 審核員 with no way to tell two reviewers apart.
         Events written before v3.8.0 carry no actorId, so the role stands alone. */
      var roleLabel = event.role === 'reviewer' ? t('wsHistoryRoleReviewer') : t('wsHistoryRoleAnnotator');
      actor.textContent = event.actorId ? roleLabel + ' · ' + event.actorId : roleLabel;
      var meta = document.createElement('div');
      meta.className = 'history-meta';
      var time = document.createElement('span');
      time.className = 'history-time';
      time.textContent = formatHistoryTime(event.at);
      var badge = document.createElement('span');
      badge.className =
        'history-action-badge ' + (event.action === 'saved' ? 'saved' : event.action === 'rejected' ? 'rejected' : 'submitted');
      badge.textContent = event.action;
      meta.appendChild(time);
      meta.appendChild(badge);
      header.appendChild(actor);
      header.appendChild(meta);
      card.appendChild(header);
      if (event.summary) {
        var summary = document.createElement('div');
        summary.className = 'history-summary';
        summary.textContent = event.summary;
        card.appendChild(summary);
      }
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  function findRecordById(sampleId) {
    return currentProfile.datasetRecords.find(function (record, idx) {
      return window.LabelSuiteAnnotationWorkspaceData.getRecordId(record, idx) === String(sampleId);
    });
  }

  /* `annotatorId` is the second half of the review unit (FR-056); omitted,
     the currently reviewed annotator is kept, which is what every annotator
     call site and the boot call rely on. Snapshotting happens BEFORE the
     identity moves so the outgoing unit's answers are filed under it. */
  function selectSample(sampleId, annotatorId) {
    var record = findRecordById(sampleId) || currentProfile.datasetRecords[0];
    if (!record) return;
    var recordIdx = currentProfile.datasetRecords.indexOf(record);
    /* SC-007: sample switch is an autosave trigger; skip the very first
       (boot) call so the page doesn't open on a 儲存中… flash. */
    if (currentSampleId) triggerAutosave();
    snapshotCurrentSample();
    currentSampleId = window.LabelSuiteAnnotationWorkspaceData.getRecordId(record, recordIdx);
    if (annotatorId && currentRole === 'reviewer') currentIdentity.annotatorId = annotatorId;
    reviewRowSeeded = {};
    state.datasetRawFirstRow = buildAnnotatorRecord(record, currentProfile);
    /* The engine only rebuilds columnOutputTypeMap inside its own
       renderSchemaFields() (a task-new Step 2 path this host never runs);
       without it getOutputFieldValue(outKey) falls back to the first
       output column whenever a task maps several, mis-seeding prefill on
       multi-output tasks. */
    rebuildColumnOutputTypeMap();
    restoreSample(currentSampleId);
    syncUrlToUnit();
    renderWorkspace();
  }

  /* A workspace URL addresses one REVIEW UNIT, so every switch writes the
     displayed unit back into the address bar (issue #151); the page read
     `sample_id` at boot and never wrote it, leaving reload / bookmark /
     shared link pinned to whichever record the visitor entered on.

     `replaceState`, not `pushState`: stepping through T001's 15 reviewer
     units would otherwise bury the list page under 15 Backs.

     The query string is mutated in place rather than rebuilt from known
     keys, so any param this page does not read survives the rewrite. */
  function syncUrlToUnit() {
    var params = new URLSearchParams(window.location.search);
    params.set('sample_id', currentSampleId);
    /* Only a reviewer's annotator moves while stepping (FR-056). Writing it
       for an annotator would add a param their entry link never carried. */
    if (currentRole === 'reviewer') params.set('annotator_id', currentAnnotatorId());
    window.history.replaceState(null, '', window.location.pathname + '?' + params.toString());
  }

  function renderSampleList() {
    var listEl = document.getElementById('sampleList');
    var countEl = document.getElementById('sampleListCount');
    if (!listEl) return;
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    var units = buildUnits();
    /* Spec 015 line "筆數仍需依 materialized run context 顯示": the count
       reflects the run's materialized list size when the profile declares
       one for the current run_type; the rendered rows stay the seed
       records (prototype subset). Title stays a fixed 標記清單 -- run
       labels in the column title are forbidden by the same clause.
       Reviewers are the exception (FR-056): a materialized run counts
       SAMPLES, which is the annotator's workload, while the reviewer's is
       one unit per annotator per sample -- so their count is the rendered
       unit count, matching annotation-list's 共 N 筆. */
    var runCtx = currentProfile.materializedRuns && currentProfile.materializedRuns[currentRunType];
    var totalCount =
      currentRole === 'reviewer' || !runCtx || typeof runCtx.total !== 'number' ? units.length : runCtx.total;
    if (countEl) countEl.textContent = totalCount + (state.lang === 'zh' ? ' 筆' : ' items');

    units.forEach(function (unit, idx) {
      var record = unit.record;
      var recordId = unit.recordId;
      /* Tri-state per sample (submitted / saved / pending) drives both the
         index-badge tint and the text status label under the snippet. */
      var status = window.LabelSuiteAnnotationWorkspaceData.getSampleStatus(
        currentProfile.id,
        currentRole,
        currentRunType,
        recordId,
        unitIdentity(unit)
      );
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'sample-item' + (isCurrentUnit(unit) ? ' active' : '');
      if (status === 'submitted') item.classList.add('status-submitted');
      else if (status === 'saved') item.classList.add('status-saved');
      item.setAttribute('data-testid', 'ws-sample-item');
      item.setAttribute('data-submitted', status === 'submitted' ? 'true' : 'false');

      var indexBadge = document.createElement('span');
      indexBadge.className = 'sample-index';
      indexBadge.textContent = String(idx + 1);
      item.appendChild(indexBadge);

      var meta = document.createElement('div');
      meta.className = 'sample-meta';
      var snippet = document.createElement('div');
      snippet.className = 'sample-snippet';
      snippet.textContent = window.LabelSuiteAnnotationWorkspaceData.getRecordPreviewText(
        record,
        currentProfile.fieldRoleMap
      );
      meta.appendChild(snippet);
      /* Three consecutive reviewer entries share one snippet, so the entry
         has to name the unit it stands for (FR-056). */
      if (currentRole === 'reviewer') {
        var unitLine = document.createElement('div');
        unitLine.className = 'sample-unit-line';
        var unitId = document.createElement('span');
        unitId.className = 'sample-unit-id';
        unitId.textContent = recordId;
        var unitSep = document.createElement('span');
        unitSep.className = 'sample-unit-sep';
        unitSep.textContent = '·';
        var unitAnnotator = document.createElement('span');
        unitAnnotator.className = 'sample-unit-annotator';
        unitAnnotator.setAttribute('data-testid', 'ws-sample-annotator');
        unitAnnotator.textContent = unit.annotatorId;
        unitLine.appendChild(unitId);
        unitLine.appendChild(unitSep);
        unitLine.appendChild(unitAnnotator);
        meta.appendChild(unitLine);
      }
      var statusLabel = document.createElement('span');
      statusLabel.className = 'sample-status-label status-color-' + status;
      statusLabel.setAttribute('data-testid', 'ws-sample-status');
      statusLabel.textContent =
        status === 'submitted' ? t('wsStatusSubmitted') : status === 'saved' ? t('wsStatusSaved') : t('wsStatusPending');
      meta.appendChild(statusLabel);
      item.appendChild(meta);

      item.addEventListener('click', function () {
        selectSample(recordId, unit.annotatorId);
      });
      listEl.appendChild(item);
    });
  }

  /* ── submit ───────────────────────────────────────────────────────── */
  /* Spec 015 AC-2A.10: every outputs[] entry must be answered or bypassed
     before submit. FR-024M output-role prefill counts as answered for
     every type -- most types carry the prefill in previewState/
     previewEntities/previewTriples already, but multi_dim's engine-seeded
     sliders are DOM-only (ps.dims never sees the prefill), so it checks
     the raw output column instead. */
  function isOutputAnswered(outKey) {
    if (state.previewBypass[outKey]) return true;
    var ps = state.previewState[outKey];
    switch (outKey) {
      case 'single_label':
        return !!(ps && ps.selected);
      case 'multi_label':
        return !!(ps && Array.isArray(ps.selected) && ps.selected.length > 0);
      case 'single_dim':
        return !!(ps && (ps._touched || ps._seeded));
      case 'multi_dim': {
        var cfg = state.outputConfigs.multi_dim || {};
        var dims = Array.isArray(cfg.dimensions)
          ? cfg.dimensions
          : Array.isArray(cfg.va_dimensions) ? cfg.va_dimensions : [];
        if (dims.length === 0) return true;
        var dimState = (ps && ps.dims) || {};
        var allTouched = dims.every(function (dim) {
          return dimState[dim.name] && dimState[dim.name].touched;
        });
        if (allTouched) return true;
        var record = findRecordById(currentSampleId);
        var prefill = record ? findRawOutputValue('multi_dim', record) : null;
        return !!(prefill && typeof prefill === 'object');
      }
      case 'sequence_tagging':
        /* Engine seeds ps.tokens all-'O' for pending samples; any non-O
           tag (annotator's own or FR-024M prefill) counts as answered. */
        return !!(ps && Array.isArray(ps.tokens) && ps.tokens.some(function (tag) {
          return tag && tag !== 'O';
        }));
      case 'entity_recognition':
        return state.previewEntities.length > 0;
      case 'relation_identification':
        return state.previewTriples.length > 0;
      case 'free_text':
        return !!(ps && ps.text && ps.text.trim().length > 0);
      default:
        return true;
    }
  }

  function clearAllPanelErrors() {
    state.selectedOutputTypes.forEach(function (outKey) {
      var panel = document.querySelector('[data-testid="ws-output-panel-' + outKey + '"]');
      if (panel) panel.removeAttribute('data-error');
    });
  }

  /* The persisted OutputAnswer payload -- same shape for submit, draft
     save (AC-2.3), and the reviewer decision write, and the same fields
     snapshotCurrentSample()/restoreSample() round-trip in memory. */
  function collectAnswerPayload() {
    return {
      previewState: deepClone(state.previewState),
      previewEntities: deepClone(state.previewEntities),
      previewTriples: deepClone(state.previewTriples),
      previewBypass: deepClone(state.previewBypass),
    };
  }

  /* Per-output textual answer summary attached to every history event
     (FR-016 對應輸出類型 + 修改內容), reusing the reviewer diff's own
     describeOutputAnswer() rather than a second formatter. */
  function buildHistorySummary() {
    return state.selectedOutputTypes
      .map(function (outKey) {
        var described = describeOutputAnswer(outKey, {
          previewState: state.previewState,
          previewEntities: state.previewEntities,
          previewTriples: state.previewTriples,
        });
        return outKey + ': ' + (described || t('reviewNoAnswer'));
      })
      .join('\n');
  }

  function handleSave() {
    window.LabelSuiteAnnotationWorkspaceData.markSampleSaved(
      currentProfile.id,
      currentRole,
      currentRunType,
      currentSampleId,
      collectAnswerPayload(),
      buildHistorySummary(),
      currentIdentity
    );
    clearUnsaved();
    triggerAutosave();
    renderSampleList();
    renderHistoryPanel();
    showToast(t('wsSaveSuccess'));
  }

  function handleSubmit() {
    /* Double-click guard (issue #201 / w6 DUP-01): a busy flag plus a
       temporary native disable so a rapid second click is inert instead of
       re-running the submit flow (backed by the appendHistoryEvent dedupe
       in annotation-workspace.data.js, which catches any click that still
       slips through). */
    if (state.submitBusy) return;
    state.submitBusy = true;
    var submitBtnEl = document.getElementById('wsSubmitBtn');
    if (submitBtnEl) submitBtnEl.disabled = true;

    clearAllPanelErrors();
    var allAnswered = true;
    state.selectedOutputTypes.forEach(function (outKey) {
      if (!isOutputAnswered(outKey)) {
        allAnswered = false;
        var panel = document.querySelector('[data-testid="ws-output-panel-' + outKey + '"]');
        if (panel) panel.setAttribute('data-error', 'true');
      }
    });
    if (!allAnswered) {
      showToast(t('wsSubmitIncomplete'), 'warning');
      state.submitBusy = false;
      if (submitBtnEl) submitBtnEl.disabled = false;
      return;
    }
    window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(currentProfile.id, currentRole, currentRunType, currentSampleId, collectAnswerPayload(), buildHistorySummary(), currentIdentity);
    clearUnsaved();
    /* task-detail.html's dry-run status sync (waiting_iaa_confirmation once
       every sample is submitted) reads this key -- see
       annotation-workspace.data.js's syncDryRunProgress() doc comment. */
    window.LabelSuiteAnnotationWorkspaceData.syncDryRunProgress(
      currentProfile.id,
      currentRole,
      currentRunType,
      currentProfile.datasetRecords.length,
      currentIdentity
    );
    renderSampleList();
    renderSampleNav();
    renderHistoryPanel();
    showToast(t('wsSubmitSuccess'));
    state.submitBusy = false;
    if (submitBtnEl) submitBtnEl.disabled = false;
  }

  /* ── reviewer mode (Phase 3, FR-024L / FR-024L-1 / FR-014A-C) ────────
     Registry-driven, one row per state.selectedOutputTypes entry -- no
     per-task_id branching. Each row's correction control is the EXACT
     annotator control (renderOutputPreview(container, outKey), the same
     dispatcher/testid-patch chain every annotator panel already goes
     through), seeded from the annotator's own submitted OutputAnswer
     instead of the dataset row, satisfying FR-024L-1's "reuse the
     annotator control, do not build a dedicated correction UI" mandate. */
  var reviewRowDecisions = {};
  var reviewRowOriginals = {};
  /* Every decision pair currently on screen, so the A/R shortcuts below can
     redraw them all after deciding the unit in one go. Rebuilt alongside
     reviewRowDecisions on each renderReviewerWorkspace(). */
  var reviewDecisionRefreshers = [];
  /* Per-outKey guard, sample-scoped (reset in selectSample only, NOT on
     every renderReviewerWorkspace() re-render): seedReviewState() must only
     run once per sample per outKey. buildReviewRow's decision handlers
     trigger a full renderReviewerWorkspace() re-render of every row;
     without this guard, that rebuild would call
     seedReviewState() again on EVERY row (not just the one interacted
     with), silently discarding any live correction the reviewer already
     made on other output types. */
  var reviewRowSeeded = {};

  function describeOutputAnswer(outKey, src) {
    src = src || {};
    var ps = (src.previewState && src.previewState[outKey]) || {};
    switch (outKey) {
      case 'single_label':
        return ps.selected || '';
      case 'multi_label':
        return (Array.isArray(ps.selected) ? ps.selected : [])
          .map(function (path) {
            return Array.isArray(path) ? path[path.length - 1] : String(path);
          })
          .join(', ');
      case 'single_dim':
        return ps.value != null && (ps._touched || ps._seeded) ? String(ps.value) : '';
      case 'multi_dim':
        return Object.keys(ps.dims || {})
          .map(function (name) {
            return name + '=' + ps.dims[name].value;
          })
          .join(', ');
      case 'sequence_tagging':
        return Array.isArray(ps.tokens) ? ps.tokens.join(' ') : '';
      case 'entity_recognition':
        return (src.previewEntities || []).map(function (e) { return e.text; }).join(', ');
      case 'relation_identification':
        return (src.previewTriples || [])
          .map(function (tr) { return tr.subj + ' -> ' + tr.rel + ' -> ' + tr.obj; })
          .join('\n');
      case 'free_text':
        return ps.text || '';
      default:
        return '';
    }
  }

  /* Same stringification as describeOutputAnswer, but reading directly off
     a CompactAnswer value instead of engine state -- used to snapshot the
     reviewed annotator's seed for the review history diff. */
  function describeCompactAnswer(outKey, answer) {
    switch (outKey) {
      case 'single_label':
        return answer || '';
      case 'multi_label':
        return (Array.isArray(answer) ? answer : []).join(', ');
      case 'single_dim':
        return answer != null ? String(answer) : '';
      case 'multi_dim':
        return Object.keys(answer || {}).map(function (name) { return name + '=' + answer[name]; }).join(', ');
      case 'sequence_tagging':
        return (Array.isArray(answer) ? answer : []).map(function (p) { return p.text + '/' + p.tag; }).join(' ');
      case 'entity_recognition':
        return (Array.isArray(answer) ? answer : []).map(function (e) { return e.text; }).join(', ');
      case 'relation_identification':
        return (Array.isArray(answer) ? answer : []).map(function (tr) { return tr.subj + ' -> ' + tr.rel + ' -> ' + tr.obj; }).join('\n');
      case 'free_text':
        return answer || '';
      default:
        return '';
    }
  }

  /* Locates the raw (un-sanitized, Data-Fairness-exempt for reviewers)
     dataset output-role field matching outKey's answer shape -- reused
     from the same shape-detection (looksLikeEntityList/looksLikeTripleList)
     buildAnnotatorRecord() already relies on, not a hardcoded field name. */
  function findRawOutputValue(outKey, rawRecord) {
    var roleMap = currentProfile.fieldRoleMap || {};
    var outputCols = Object.keys(roleMap).filter(function (col) {
      return roleMap[col] === 'output';
    });
    if (outKey === 'entity_recognition') {
      var entCol = outputCols.filter(function (col) { return looksLikeEntityList(rawRecord[col]); })[0];
      return entCol ? rawRecord[entCol] : null;
    }
    if (outKey === 'relation_identification') {
      var triCol = outputCols.filter(function (col) { return looksLikeTripleList(rawRecord[col]); })[0];
      return triCol ? rawRecord[triCol] : null;
    }
    var scalarCol = outputCols.filter(function (col) {
      var v = rawRecord[col];
      return !looksLikeEntityList(v) && !looksLikeTripleList(v);
    })[0];
    return scalarCol ? rawRecord[scalarCol] : null;
  }

  /* ── FR-014 aggregate review card (spec 015 v2.5.0) ──────────────────
     Replaces the old per-outKey approve/reject pair with a legacy-parity
     multi-annotator comparison: a stats box, a bulk approve/reject bar,
     and one decision row per annotator. reviewRowDecisions is now keyed
     `${outKey}::${annotatorName}` (annotatorName is the real annotator id
     since v3.8.0 -- it was the literal 'current') instead of just outKey. */
  function decisionKey(outKey, rowName) {
    return outKey + '::' + rowName;
  }

  /* Shared token-list reconstruction for sequence_tagging's compact-answer
     conversion (both directions). getDatasetPreviewText() (task-config.
     engine.js) always returns null in this workspace -- it reads
     state.datasetParsedColumns, which is only ever populated by the
     task-builder's CSV-upload flow, never by annotation-workspace.config.js.
     Mirror engine.js's own renderTokenClassPreview() fallback sentence here
     (line ~2867) so this reconstructed token list stays aligned with the
     token positions the correction control right below is already showing. */
  function getSequenceTokenTexts() {
    var cfg = state.outputConfigs.sequence_tagging || {};
    var tokenization = cfg.tokenization && typeof cfg.tokenization === 'object' ? cfg.tokenization : {};
    var unit = tokenization.unit === 'word' ? 'word' : 'character';
    var rawRow = findRecordById(currentSampleId) || {};
    var realText = getDatasetPreviewText();
    var fallbackText =
      state.lang === 'zh' ? '台積電董事長魏哲家今天出席台北產業論壇' : 'The chairman of TSMC attended the forum in Taipei today.';
    return getSequencePreviewTokens(realText || fallbackText, rawRow, unit);
  }

  /* Converts the live annotator's engine-shape submission (previewState /
     previewEntities / previewTriples) into the SAME CompactAnswer shape
     annotation-workspace.data.js's REVIEWER_MOCK_ROWS ships, so the mock
     rows and the prepended "current" row can share one answer renderer. */
  function buildSequencePairsFromTags(tags) {
    if (!Array.isArray(tags)) return [];
    var tokenTexts = getSequenceTokenTexts();
    var pairs = [];
    for (var i = 0; i < tags.length && i < tokenTexts.length; i++) {
      if (tags[i] && tags[i] !== 'O') pairs.push({ text: tokenTexts[i], tag: tags[i] });
    }
    return pairs;
  }

  /* Reverse of buildSequencePairsFromTags (FR-035): converts a CompactAnswer
     pairs array (non-O tokens only, in positional order) back into a full
     per-token tags array aligned to the current token list, so a merge's
     unanimous per-token majority can prefill the live Token grid state.
     pairs is a genuine positional subsequence of the token list (each pair
     was produced by walking the tokens left-to-right and keeping the
     non-'O' ones), so a single left-to-right consume-in-order pass -- the
     same "consume spans in order" approach already used for duplicate
     entity spans elsewhere in this file -- reconstructs the original
     alignment even when a token text repeats (e.g. '台' at both index 0 and
     13 of T006's fallback sentence). */
  function buildSequenceTagsFromPairs(pairs) {
    var tokenTexts = getSequenceTokenTexts();
    var tags = tokenTexts.map(function () { return 'O'; });
    var cursor = 0;
    for (var i = 0; i < tokenTexts.length && cursor < pairs.length; i++) {
      if (tokenTexts[i] === pairs[cursor].text) {
        tags[i] = pairs[cursor].tag;
        cursor++;
      }
    }
    return tags;
  }
  /* Shared with annotation-list.html's official_run single-row rendering
     (annotation-workspace.data.js); sequence_tagging token text needs the
     workspace's own dataset-derived token reconstruction. */
  function convertSubmissionAnswer(outKey, submission) {
    return window.LabelSuiteAnnotationWorkspaceData.convertSubmissionAnswer(outKey, submission, {
      sequenceTagsToPairs: buildSequencePairsFromTags,
    });
  }

  /* A review reads the annotator's own submission, which only ever exists in
     this browser's localStorage -- so a prototype visitor arriving from the
     dashboard's 快速審核 without having annotated anything first got an empty
     review panel on every output type, while the list beside it promised
     待審 N 筆. Fall back to the REVIEWER_MOCK_ROWS entry for THAT annotator
     (v4.0.0: the review unit is sample × annotator, so the stand-in must name
     the same person the card claims to review), or the group's first row when
     the roster has no entry for them. No dataset gold column is read. A real
     submission always wins over it. */
  function demoAnnotatorRow() {
    var rows = window.LabelSuiteAnnotationWorkspaceData.getReviewerMockRows(
      currentProfile.id,
      currentSampleId
    ) || [];
    var annotatorId = currentAnnotatorId();
    var own = rows.filter(function (row) { return row.annotator === annotatorId; });
    if (own.length) return own[0];
    return rows.length ? rows[0] : null;
  }

  function getAnnotatorSubmission() {
    return window.LabelSuiteAnnotationWorkspaceData.getSubmission(
      currentProfile.id,
      'annotator',
      currentRunType,
      currentSampleId,
      currentIdentity
    );
  }

  /* The one annotator a review row belongs to (FR-049). Both branches below
     name the SAME person on purpose: DEFAULT_ANNOTATOR_ID is the first
     annotator of each REVIEWER_MOCK_ROWS group, so a real submission and the
     FR-044a demo fallback that stands in for it produce one continuous review
     trail rather than splitting across two ids. */
  function currentAnnotatorId() {
    return (
      (currentIdentity && currentIdentity.annotatorId) ||
      window.LabelSuiteAnnotationWorkspaceData.DEFAULT_ANNOTATOR_ID
    );
  }

  /* spec 015 v4.0.0 (FR-051, BREAKING): exactly ONE row -- the reviewed
     annotator's -- for BOTH run types. dry_run no longer merges the whole
     roster into a consensus the reviewer adjudicates; it reviews one person's
     answer at a time, identically to official_run. */
  function getReviewerRows(outKey) {
    var annotatorId = currentAnnotatorId();
    var submission = getAnnotatorSubmission();
    if (submission) {
      return [{
        name: annotatorId,
        displayName: annotatorId,
        answer: convertSubmissionAnswer(outKey, submission),
        bypass: !!(submission.previewBypass && submission.previewBypass[outKey]),
      }];
    }
    var demoRow = demoAnnotatorRow();
    if (!demoRow) return [];
    return [{
      name: annotatorId,
      displayName: annotatorId,
      answer: demoRow.answers ? demoRow.answers[outKey] : undefined,
      bypass: !!(demoRow.bypass && demoRow.bypass[outKey]),
    }];
  }

  /* Applies a CompactAnswer into the live engine state, mirroring
     convertSubmissionAnswer's shape in reverse -- the seed path for a review
     row whose source is the demo annotator row rather than a real submission
     (which carries full engine state and seeds directly). free_text is
     excluded entirely: its correction entry is the draft text itself, so
     there is nothing to pre-apply. */
  /* A CompactAnswer entity carries only {text, type}: the mock annotator rows
     model what an annotator answered, not the character offsets the marking
     flow records alongside it. The engine highlights an entity in the passage
     only when it has a start offset, so resolve one here -- first occurrence
     not yet taken by an earlier entity, `end` inclusive to match the engine's
     own span convention. Offsets come from the passage the panel already
     renders, never from the record's entity column (Constitution: Data
     Fairness); an entity whose text no longer occurs stays position-less and
     simply does not highlight, exactly as before. */
  function placeCompactEntities(entities) {
    var text = getDatasetPreviewText() || '';
    var placed = [];
    entities.forEach(function (entity) {
      var out = { text: entity.text, type: entity.type };
      for (var from = 0; text && entity.text; ) {
        var start = text.indexOf(entity.text, from);
        if (start < 0) break;
        var end = start + entity.text.length - 1;
        var taken = placed.some(function (p) { return p.start != null && start <= p.end && end >= p.start; });
        if (!taken) { out.start = start; out.end = end; break; }
        from = start + 1;
      }
      placed.push(out);
    });
    return placed;
  }

  function applyCompactAnswerToState(outKey, mergedValue) {
    switch (outKey) {
      case 'single_label':
        state.previewState[outKey] = state.previewState[outKey] || {};
        state.previewState[outKey].selected = mergedValue;
        break;
      case 'multi_label':
        state.previewState[outKey] = state.previewState[outKey] || {};
        state.previewState[outKey].selected = (mergedValue || []).map(function (label) { return [label]; });
        break;
      case 'single_dim':
        state.previewState[outKey] = state.previewState[outKey] || {};
        state.previewState[outKey].value = mergedValue;
        state.previewState[outKey]._touched = true;
        break;
      case 'multi_dim': {
        state.previewState[outKey] = state.previewState[outKey] || {};
        var dims = state.previewState[outKey].dims || {};
        Object.keys(mergedValue || {}).forEach(function (name) {
          dims[name] = { value: mergedValue[name], touched: true };
        });
        state.previewState[outKey].dims = dims;
        break;
      }
      case 'entity_recognition':
        state.previewEntities = placeCompactEntities(mergedValue || []);
        state.previewInited = true;
        break;
      case 'relation_identification':
        state.previewTriples = (mergedValue || []).map(function (tr) { return { subj: tr.subj, rel: tr.rel, obj: tr.obj }; });
        state.previewInited = true;
        break;
      case 'sequence_tagging': {
        var cfg = state.outputConfigs.sequence_tagging || {};
        var tokenization = cfg.tokenization && typeof cfg.tokenization === 'object' ? cfg.tokenization : {};
        var unit = tokenization.unit === 'word' ? 'word' : 'character';
        var tokenTexts = getSequenceTokenTexts();
        state.previewState[outKey] = state.previewState[outKey] || {};
        state.previewState[outKey].tokens = buildSequenceTagsFromPairs(mergedValue || []);
        state.previewState[outKey].tokenKey = unit + '␟' + tokenTexts.join('␞');
        state.previewState[outKey].scheme = cfg.tagging_scheme || 'BIO';
        state.previewState[outKey]._seeded = true;
        break;
      }
      default:
        break;
    }
  }

  /* Builds a small icon-only span via safe DOM methods (no innerHTML) so
     mini-buttons never parse untrusted markup. */
  function buildIconSpan(icon) {
    var span = document.createElement('span');
    span.className = 'rv-btn-icon';
    span.textContent = icon;
    return span;
  }

  /* FR-014B: pass/reject toggle -- clicking the already-active decision
     cancels it back to undecided. Returns {el, refresh} so the bulk bar
     can force every row's buttons to redraw after a bulk decision. */
  function buildRowDecisionButtons(outKey, rowName, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'rv-choice-group';

    var rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'mini-btn mini-btn-reject';
    rejectBtn.setAttribute('data-testid', 'ws-review-row-reject');
    rejectBtn.appendChild(buildIconSpan('✕'));

    var approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'mini-btn mini-btn-approve';
    approveBtn.setAttribute('data-testid', 'ws-review-row-approve');
    approveBtn.appendChild(buildIconSpan('✓'));

    function refresh() {
      var decision = reviewRowDecisions[decisionKey(outKey, rowName)];
      approveBtn.setAttribute('aria-pressed', decision === 'approve' ? 'true' : 'false');
      approveBtn.classList.toggle('mini-btn-active-approve', decision === 'approve');
      rejectBtn.setAttribute('aria-pressed', decision === 'reject' ? 'true' : 'false');
      rejectBtn.classList.toggle('mini-btn-active-reject', decision === 'reject');
    }
    approveBtn.addEventListener('click', function () {
      var key = decisionKey(outKey, rowName);
      reviewRowDecisions[key] = reviewRowDecisions[key] === 'approve' ? null : 'approve';
      refresh();
      if (onChange) onChange();
    });
    rejectBtn.addEventListener('click', function () {
      var key = decisionKey(outKey, rowName);
      reviewRowDecisions[key] = reviewRowDecisions[key] === 'reject' ? null : 'reject';
      refresh();
      if (onChange) onChange();
    });
    refresh();
    reviewDecisionRefreshers.push(refresh);

    wrap.appendChild(rejectBtn);
    wrap.appendChild(approveBtn);
    return { el: wrap, refresh: refresh };
  }

  /* FR-054: the shared sidebar has advertised A / R since spec 008 without
     either ever being wired up. v4.0.0 made a review unit one annotator, so
     the two batch shortcuts it also advertised (Shift+A / Shift+R) have no
     set left to act on and are retired; what survives applies to the whole
     unit. A unit can carry several output types -- handleReviewSubmit()
     requires every one of them decided and nothing marks one as focused --
     so a keystroke decides them all, and repeating it cancels back to
     undecided exactly like clicking an already-active button does. */
  function setReviewUnitDecision(decision) {
    var rowName = currentAnnotatorId();
    var keys = state.selectedOutputTypes.map(function (outKey) {
      return decisionKey(outKey, rowName);
    });
    if (!keys.length) return;
    var cancels = keys.every(function (key) {
      return reviewRowDecisions[key] === decision;
    });
    keys.forEach(function (key) {
      reviewRowDecisions[key] = cancels ? null : decision;
    });
    reviewDecisionRefreshers.forEach(function (refresh) {
      refresh();
    });
  }

  /* free_text corrections are typed, so `a` and `r` are ordinary input the
     moment a field holds focus; a <select> consumes them as type-ahead. */
  function isTypingTarget(target) {
    var element = target && target.nodeType === 1 ? target : null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    var tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function setupReviewShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      var key = String(e.key).toLowerCase();
      if (key !== 'a' && key !== 'r') return;
      e.preventDefault();
      setReviewUnitDecision(key === 'a' ? 'approve' : 'reject');
    });
  }

  /* The four action shortcuts the sidebar panel advertises (issue #152).
     Each one dispatches the click of the button it duplicates instead of
     calling the handler directly: the button already carries the role wiring
     (a reviewer's 儲存草稿 is hidden and has no listener) and the
     first/last-unit disabled state, and re-deriving either here would be a
     second source of truth that drifts.

     These stay live while typing, unlike the bare `a`/`r` review keys above:
     a modifier combo produces no text, and 儲存草稿 is wanted most in the
     middle of a free_text answer.

     preventDefault is load-bearing, not tidiness -- Ctrl/Cmd+S opens the
     browser's own save dialog and Alt+← is Back, so an unhandled combo would
     leave the workspace. It fires before the availability check so a hidden
     or disabled target still swallows the browser default. */
  function setupActionShortcuts() {
    document.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      var id = null;
      if (mod && String(e.key).toLowerCase() === 's') id = 'wsSaveBtn';
      else if (mod && e.key === 'Enter') id = currentRole === 'reviewer' ? 'wsReviewSubmitBtn' : 'wsSubmitBtn';
      else if (e.altKey && e.key === 'ArrowLeft') id = 'wsPrevBtn';
      else if (e.altKey && e.key === 'ArrowRight') id = 'wsNextBtn';
      if (!id) return;
      e.preventDefault();
      var btn = document.getElementById(id);
      if (btn && !btn.disabled && !btn.classList.contains('hidden')) btn.click();
    });
  }

  /* Seeds the shared engine state so renderOutputPreview(container, outKey)
     -- the exact same dispatcher every annotator panel already goes through
     -- renders the correction control pre-filled with `value` instead of
     the dataset's default/prefilled value. `value` is either a real
     OutputAnswer submission (FR-044) or the CompactAnswer of the demo
     annotator row standing in for one (FR-044a); both paths go through the
     SAME assignment logic below. */
  /* A task whose outputs[] carries no entity_recognition treats the dataset's
     entity spans as scaffolding (evidence role, T008): the annotator picks
     relations out of them but never marks or submits an entity list, so a
     review panel seeded purely from the submission starts with none -- and the
     engine's relation builder then rejects every passage pick, because
     findEntitySlot() only accepts spans present in state.previewEntities.
     Re-seed from the dataset record, exactly as initPreviewState() does for
     the annotator.
     Conditioned on composition, not on emptiness alone: when
     entity_recognition IS an output type those spans are the answer under
     review, and injecting the dataset's own column would hand the reviewer a
     gold answer nobody submitted (Constitution: Data Fairness). */
  function scaffoldingEntities() {
    if (state.selectedOutputTypes.indexOf('entity_recognition') >= 0) return [];
    var raw = state.datasetRawFirstRow || {};
    return Array.isArray(raw.entities) ? deepClone(raw.entities) : [];
  }

  function seedReviewState(outKey, value, isCompactAnswer) {
    if (isCompactAnswer) {
      delete state.previewState[outKey];
      /* Reset ONLY the slice this output type owns. previewEntities and
         previewTriples are shared engine state, not per-type slots like
         previewState[outKey], and the reviewer workspace seeds them once per
         output type: the merged span card seeds entity_recognition and then
         relation_identification (T010/T013), and T013 seeds a third card
         afterwards. Clearing both arrays on every seed therefore wiped the
         sibling that had just been seeded -- the correction panel lost its
         entity highlights, and in T013 its relations too. */
      if (outKey === 'entity_recognition') state.previewEntities = [];
      if (outKey === 'relation_identification') {
        state.previewTriples = [];
        /* Empty unless the task has no entity_recognition output, in which
           case this is the only seed the panel's entities ever get. */
        var scaffolding = scaffoldingEntities();
        if (scaffolding.length) state.previewEntities = scaffolding;
      }
      state.previewBypass[outKey] = false;
      if (value != null) applyCompactAnswerToState(outKey, value);
      state.previewInited = true;
      return;
    }
    var submission = value;
    var savedPs = (submission.previewState && submission.previewState[outKey]) || null;
    /* Only assign when a real saved value exists -- ensurePreviewState()
       (task-config.engine.js) only merges in its own per-type defaults when
       state.previewState[outKey] is still falsy (undefined/null); pre-setting
       a truthy {} placeholder here (e.g. when the annotator never submitted
       an answer for this type) would silently defeat that default-merge and
       crash renderers that assume a fully-defaulted shape (e.g.
       renderFreeTextPreview's ps.text.length). */
    if (savedPs) {
      state.previewState[outKey] = deepClone(savedPs);
    } else {
      delete state.previewState[outKey];
    }
    if (outKey === 'multi_label' && state.previewState[outKey]) {
      /* selectorOpen is transient annotator UI state (whether the taxonomy
         dialog happened to be open at submit time), not part of the actual
         answer -- carrying it over would silently reopen the floating
         dialog on top of the review row's decision buttons (position:
         absolute, .taxonomy-selector-dialog in task-config.css:217). Each
         review row starts with the dialog closed, same as a fresh render. */
      state.previewState[outKey].selectorOpen = false;
    }
    state.previewBypass[outKey] = !!(submission.previewBypass && submission.previewBypass[outKey]);
    if (outKey === 'entity_recognition' || outKey === 'relation_identification') {
      var submitted = deepClone(submission.previewEntities || []);
      state.previewEntities = submitted.length ? submitted : scaffoldingEntities();
      state.previewTriples = deepClone(submission.previewTriples || []);
      state.previewInited = true;
    }
  }

  /* title is null for every review row (FR-014P): that card carries nothing
     but the correction panel, which already shows what is under review, so a
     header repeating the output-type key is noise -- the whole header row
     goes away with it. */
  function buildReviewRowShell(title) {
    var row = document.createElement('div');
    row.className = 'content-card';
    row.setAttribute('data-testid', 'ws-review-row');
    if (!title) return row;

    var header = document.createElement('div');
    header.className = 'review-row-header';
    var titleEl = document.createElement('div');
    titleEl.className = 'content-card-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);
    row.appendChild(header);
    return row;
  }

  /* testidSuffix defaults to outKey; the merged span card passes 'span'
     because its single panel stands in for both of its output types. */
  function appendCorrectionControl(row, outKey, testidSuffix) {
    var correctionTitle = document.createElement('div');
    correctionTitle.className = 'rv-correction-title';
    correctionTitle.textContent = t('reviewCorrectionTitle');
    row.appendChild(correctionTitle);

    var correction = document.createElement('div');
    correction.setAttribute('data-testid', 'ws-review-correct-' + (testidSuffix || outKey));
    var panelMount = document.createElement('div');
    correction.appendChild(panelMount);
    renderOutputPreview(panelMount, outKey);
    row.appendChild(correction);
    return correction;
  }

  /* FR-014P: a review card must end with exactly ONE decision line,
     the same shape for every output type. The engine's Bypass row already is
     that line ("無法判定 (Bypass)"), so the approve/reject pair is docked into
     it instead of floating in a card header far above the answer it judges.
     Two things make this more than an appendChild: the engine rebuilds the
     whole panel on every Bypass toggle and every entity/relation edit, which
     detaches whatever we put inside it, and a task configured with
     allow_bypass:false renders no such row at all. So docking is idempotent,
     re-runs from a MutationObserver, and always re-attaches the SAME element
     -- a rebuilt copy would drop the reviewer's pending decision. */
  function dockDecisionsOnBypassRow(correction, decisionEls) {
    var fallbackRow = null;
    function place() {
      var bypassRow = correction.querySelector('.' + BYPASS_ROW_CLASS + ':not(.rv-decision-row)');
      if (!bypassRow) {
        if (!fallbackRow) {
          fallbackRow = document.createElement('div');
          fallbackRow.className = BYPASS_ROW_CLASS + ' rv-decision-row';
        }
        if (fallbackRow.parentNode !== correction) correction.appendChild(fallbackRow);
        bypassRow = fallbackRow;
      } else if (fallbackRow && fallbackRow.parentNode) {
        fallbackRow.parentNode.removeChild(fallbackRow);
      }
      decisionEls.forEach(function (decisionEl) {
        /* Guard the append: without it, each re-dock would itself be a
           mutation and the observer would never settle. */
        if (decisionEl.parentNode !== bypassRow) bypassRow.appendChild(decisionEl);
      });
    }
    place();
    new MutationObserver(place).observe(correction, { childList: true, subtree: true });
  }

  /* spec 015 v4.0.0 (US3/US6, FR-044/FR-014P, BREAKING): ONE review card
     shape for both run types -- no title row, no stats box, no consensus
     badge, no apply-majority, no annotator list, no deviation coloring; just
     the reviewed annotator's answer in the correction panel, closing on one
     decision pair. dry_run's consensus/gold adjudication model (FR-030/
     FR-039~FR-042) is gone with the merge it read from. */
  /* A real submission carries the annotator's own engine state (exact spans
     included), so it seeds through the OutputAnswer path. The demo fallback
     only has a CompactAnswer and takes the compact path -- entity offsets get
     resolved against the passage there (placeCompactEntities). */
  function seedReviewRow(outKey, submission) {
    if (submission) {
      reviewRowOriginals[outKey] = describeOutputAnswer(outKey, submission);
      if (!reviewRowSeeded[outKey]) {
        seedReviewState(outKey, submission, false);
        reviewRowSeeded[outKey] = true;
      }
      return;
    }
    var demoRow = demoAnnotatorRow();
    var answer = demoRow && demoRow.answers ? demoRow.answers[outKey] : null;
    reviewRowOriginals[outKey] = answer != null ? describeCompactAnswer(outKey, answer) : '';
    if (!reviewRowSeeded[outKey]) {
      seedReviewState(outKey, answer, true);
      reviewRowSeeded[outKey] = true;
    }
  }

  function buildReviewRow(outKey, submission) {
    var row = buildReviewRowShell(null);

    seedReviewRow(outKey, submission);
    var correction = appendCorrectionControl(row, outKey);
    dockDecisionsOnBypassRow(correction, [buildRowDecisionButtons(outKey, currentAnnotatorId(), null).el]);
    return row;
  }

  /* FR-014N: entity_recognition and relation_identification are two stages
     of ONE annotation action (mark the spans, then link them), and the
     engine already models them that way -- the relation panel it mounts is
     a superset that renders the raw text, the entity type selector, both
     bypass toggles and the relation builder. Giving each output type its
     own correction control therefore painted the same sample text twice on
     one screen (three times with the 原始文本 card on top), all copies
     visually identical, so nothing told the reviewer which one was
     interactive. A task shipping both collapses them into a single card:
     exactly one 直接修正 panel mounted from relation_identification, closing
     on one labeled decision pair per output type. Decisions stay keyed by
     output type, so the submit gate is unaffected. */
  var SPAN_OUTPUT_KEYS = ['entity_recognition', 'relation_identification'];

  function mergedSpanKeys() {
    var keys = SPAN_OUTPUT_KEYS.filter(function (outKey) {
      return state.selectedOutputTypes.indexOf(outKey) >= 0;
    });
    return keys.length === SPAN_OUTPUT_KEYS.length ? keys : null;
  }

  function buildSectionLabel(outKey) {
    var label = document.createElement('div');
    label.className = 'rv-section-label';
    label.setAttribute('data-testid', 'ws-review-section-label');
    label.textContent = outKey;
    return label;
  }

  function buildMergedSpanReviewRow(outKeys, submission) {
    /* One panel stands in for both output types, so each decision pair keeps
       its type label -- unlike a single-type card, where the pair is
       unambiguous on its own (FR-014P). */
    var decisionEls = outKeys.map(function (outKey) {
      var group = document.createElement('div');
      group.className = 'rv-merged-decision';
      group.appendChild(buildSectionLabel(outKey));
      group.appendChild(buildRowDecisionButtons(outKey, currentAnnotatorId(), null).el);
      return group;
    });
    var row = buildReviewRowShell(null);

    outKeys.forEach(function (outKey) {
      seedReviewRow(outKey, submission);
    });

    var correction = appendCorrectionControl(row, 'relation_identification', 'span');
    dockDecisionsOnBypassRow(correction, decisionEls);
    return row;
  }

  /* Reviewer and annotator share the same sample-source contract (spec 015
     v2.0.0 US3 行為規則: "Reviewer 與 Annotator 共用相同樣本來源契約與導覽
     骨架，避免視圖不一致") -- the reviewer must also see the original
     source text, not only the review rows. Data Fairness still applies:
     only fieldRoleMap 'input' fields are ever surfaced here (mirrors
     annotation-list.html's getRecordSnippet()); non-string input-role
     fields (e.g. absa_va's structured `utterances` column) are skipped in
     favor of their scalar sibling ('text'), same generalized rule 裁決6
     applied to the dashboard test helper. */
  function buildReviewerInputText(record, fieldRoleMap) {
    var inputKeys = Object.keys(fieldRoleMap || {}).filter(function (key) {
      return fieldRoleMap[key] === 'input';
    });
    return inputKeys
      .map(function (key) {
        var value = record[key];
        return typeof value === 'string' ? value : null;
      })
      .filter(Boolean)
      .join('\n\n');
  }
  /* ---- Arbitration layout (spec 015 v4.8.0, issue #147 P3c) --------------
     A DISPUTED unit opened by an arbiter candidate (FR-060) swaps the whole
     review card for this layout: the annotator's answers stay read-only for
     context, items the reviewers' per-item majority already resolved
     (resolveDisputeConvergence) render as converged notes, and only the
     genuinely unresolvable items get an A/B choice. Correction controls and
     the ✕/✓ row decisions never render — an arbiter picks a side, they do
     not re-annotate. */
  var arbitrationChoices = {};

  function formatDisputeValue(value) {
    if (value == null || value === '') return t('reviewNoAnswer');
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  function disputeItemId(item) {
    return item.outKey + '::' + item.key;
  }

  function buildArbitrationChoiceButton(testid, label, value, onSelect) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini-btn';
    btn.setAttribute('data-testid', testid);
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = label + '：' + formatDisputeValue(value);
    btn.addEventListener('click', onSelect);
    return btn;
  }

  function buildArbitrationItemRow(item) {
    var itemId = disputeItemId(item);
    var row = document.createElement('div');
    row.setAttribute('data-testid', 'ws-arbitration-item');
    row.style.cssText = 'padding:10px 0;border-top:1px solid var(--color-border);';

    var label = document.createElement('div');
    label.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:6px;';
    label.textContent = item.outKey + ' · ' + item.key;
    row.appendChild(label);

    var group = document.createElement('div');
    group.className = 'rv-choice-group';
    var buttons = [];
    function select(choice, value, btn) {
      arbitrationChoices[itemId] = { itemId: itemId, choice: choice, value: value };
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        b.classList.toggle('mini-btn-active-approve', b === btn);
      });
    }
    var aBtn = buildArbitrationChoiceButton(
      'ws-arbitration-choose-a', t('arbitrationChoiceA'), item.annotatorValue,
      function () { select('A', item.annotatorValue, aBtn); }
    );
    buttons.push(aBtn);
    group.appendChild(aBtn);
    /* One B button per DISTINCT reviewer value: reviewers who disagreed the
       same way collapse into one choice, reviewers who disagreed differently
       each offer their own. */
    var seenValues = {};
    Object.keys(item.reviewerValues).forEach(function (reviewerId) {
      var value = item.reviewerValues[reviewerId];
      var dedupKey = JSON.stringify(value === undefined ? null : value);
      if (seenValues[dedupKey]) return;
      seenValues[dedupKey] = true;
      var bBtn = buildArbitrationChoiceButton(
        'ws-arbitration-choose-b', t('arbitrationChoiceB'), value,
        function () { select('B', value, bBtn); }
      );
      buttons.push(bBtn);
      group.appendChild(bBtn);
    });
    row.appendChild(group);
    return row;
  }

  function buildArbitrationResolvedRow(item, value, note, testid) {
    var row = document.createElement('div');
    row.setAttribute('data-testid', testid);
    row.style.cssText = 'padding:10px 0;border-top:1px solid var(--color-border);font-size:12px;';
    row.textContent = item.outKey + ' · ' + item.key + '：' + formatDisputeValue(value) + '（' + note + '）';
    return row;
  }

  function renderArbitrationCard(preview, submission) {
    var data = window.LabelSuiteAnnotationWorkspaceData;
    arbitrationChoices = {};

    var card = document.createElement('div');
    card.className = 'content-card';
    card.setAttribute('data-testid', 'ws-arbitration-card');

    var title = document.createElement('h3');
    title.style.cssText = 'font-size:14px;margin:0 0 4px;';
    title.textContent = t('arbitrationTitle');
    card.appendChild(title);

    var note = document.createElement('p');
    note.style.cssText = 'font-size:12px;color:var(--color-text-soft);margin:0 0 10px;';
    note.textContent = t('arbitrationNote');
    card.appendChild(note);

    /* Read-only context: the annotator's full answers, so the arbiter sees
       the agreed parts around each disputed value. */
    var agreedTitle = document.createElement('div');
    agreedTitle.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:4px;';
    agreedTitle.textContent = t('arbitrationAgreedTitle');
    card.appendChild(agreedTitle);
    state.selectedOutputTypes.forEach(function (outKey) {
      var line = document.createElement('div');
      line.style.cssText = 'font-size:12px;white-space:pre-line;margin-bottom:2px;';
      line.textContent = outKey + '：'
        + (describeCompactAnswer(outKey, data.convertSubmissionAnswer(outKey, submission)) || t('reviewNoAnswer'));
      card.appendChild(line);
    });

    var items = data.getDisputeItems(
      currentProfile.id, currentRunType, currentSampleId, currentIdentity, state.selectedOutputTypes
    );
    var reviewerCount = data.readReviewerSubmissions(
      currentProfile.id, currentRunType, currentSampleId, currentIdentity
    ).length;
    var arbState = data.getArbitrationState(currentProfile.id, currentRunType, currentSampleId, currentIdentity);
    var openItemIds = [];
    items.forEach(function (item) {
      var convergence = data.resolveDisputeConvergence(item, reviewerCount);
      if (convergence.converged) {
        card.appendChild(buildArbitrationResolvedRow(
          item, convergence.value, t('arbitrationConvergedNote'), 'ws-arbitration-converged'
        ));
        return;
      }
      var stored = arbState[disputeItemId(item)];
      if (stored && stored.finalized_by) {
        card.appendChild(buildArbitrationResolvedRow(
          item, stored.finalized_value, stored.finalized_by, 'ws-arbitration-finalized'
        ));
        return;
      }
      openItemIds.push(disputeItemId(item));
      card.appendChild(buildArbitrationItemRow(item));
    });

    if (openItemIds.length) {
      var submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'btn btn-cta';
      submitBtn.style.cssText = 'margin-top:12px;';
      submitBtn.setAttribute('data-testid', 'ws-arbitration-submit');
      submitBtn.textContent = t('arbitrationSubmitLabel');
      submitBtn.addEventListener('click', function () {
        var decisions = openItemIds.map(function (id) { return arbitrationChoices[id]; });
        if (decisions.some(function (decision) { return !decision; })) {
          showToast(t('toastArbitrationIncomplete'), 'warning');
          return;
        }
        data.submitArbitration(
          currentProfile.id, currentRunType, currentSampleId, currentIdentity, decisions
        );
        clearUnsaved();
        showToast(t('wsArbitrationSubmitSuccess'));
        renderSampleList();
        renderReviewerWorkspace();
      });
      card.appendChild(submitBtn);
    }

    preview.appendChild(card);
  }

  function renderReviewerWorkspace() {
    var preview = document.getElementById('annotationPreview');
    if (!preview) return;
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    reviewRowDecisions = {};
    reviewRowOriginals = {};
    reviewDecisionRefreshers = [];

    /* null, not {}: seedReviewRow() branches on whether a real submission
       exists at all. */
    var submission = getAnnotatorSubmission();
    var rawRecord = findRecordById(currentSampleId) || {};

    var workspaceData = window.LabelSuiteAnnotationWorkspaceData;
    var reviewSubmitBtn = document.getElementById('wsReviewSubmitBtn');
    var unitStatus = workspaceData.getReviewUnitStatus(
      currentProfile.id, currentRunType, currentSampleId, currentIdentity, state.selectedOutputTypes,
      { minReviewers: currentProfile.minReviewers || 1 }
    );
    if (
      unitStatus === workspaceData.REVIEW_UNIT_STATUS.DISPUTED &&
      workspaceData.isArbiterCandidate(currentProfile.id, currentRunType, currentSampleId, currentIdentity)
    ) {
      /* The fixed footer submit drives handleReviewSubmit(); arbitration has
         its own in-card submit instead. */
      if (reviewSubmitBtn) reviewSubmitBtn.classList.add('hidden');
      var inputCard = document.createElement('div');
      inputCard.className = 'content-card';
      inputCard.setAttribute('data-testid', 'ws-input-content');
      inputCard.textContent = buildReviewerInputText(rawRecord, currentProfile.fieldRoleMap);
      preview.appendChild(inputCard);
      renderArbitrationCard(preview, submission);
      return;
    }
    if (reviewSubmitBtn) reviewSubmitBtn.classList.remove('hidden');

    /* Output types whose registry entry declares rendersInputPreview:true
       (free_text/entity_recognition/relation_identification/sequence_tagging)
       already embed their own ws-input-content-taggable element inside the
       reused annotator control buildReviewRow() below renders -- same
       registry check updateAnnotationPreview() itself uses
       (task-config.engine.js), reused here rather than a hardcoded type
       list. Only add this standalone source-text card when nothing else on
       the page already owns that testid. */
    var hasOutputOwnedInputPreview = state.selectedOutputTypes.some(function (outKey) {
      var outReg = window.OUTPUT_TYPE_REGISTRY && window.OUTPUT_TYPE_REGISTRY[outKey];
      return outReg && outReg.rendersInputPreview === true;
    });
    if (!hasOutputOwnedInputPreview) {
      var inputCard = document.createElement('div');
      inputCard.className = 'content-card';
      inputCard.setAttribute('data-testid', 'ws-input-content');
      inputCard.textContent = buildReviewerInputText(rawRecord, currentProfile.fieldRoleMap);
      preview.appendChild(inputCard);
    }

    /* The legacy 原始文本 card (FR-014L/FR-014O) is gone with the consensus
       model that justified it: it earned its place by showing the UNION of
       entity spans ACROSS annotators, which the merge-seeded correction panel
       below could not. A card reviewing ONE annotator has no union to show --
       that panel already renders exactly this annotator's spans, so the card
       would be a pixel-identical second copy of the sample text. */
    var spanKeys = mergedSpanKeys();
    var spanRowRendered = false;
    state.selectedOutputTypes.forEach(function (outKey) {
      if (spanKeys && spanKeys.indexOf(outKey) >= 0) {
        if (spanRowRendered) return;
        spanRowRendered = true;
        preview.appendChild(buildMergedSpanReviewRow(spanKeys, submission));
        return;
      }
      preview.appendChild(buildReviewRow(outKey, submission));
    });
  }

  function appendReviewHistoryEntry(history, text) {
    var entry = document.createElement('div');
    entry.style.cssText = 'font-size:12px;white-space:pre-line;padding:6px 0;border-top:1px solid var(--color-border);';
    entry.textContent = text;
    history.appendChild(entry);
    history.classList.remove('hidden');
  }

  /* FR-044/AC-6.3: one decision per outKey, for both run types --
     getReviewerRows() narrows to exactly one row, the reviewed annotator's
     (v4.0.0: the review unit is sample × annotator). */
  function handleReviewSubmit() {
    var history = document.getElementById('wsReviewHistory');
    if (!history) return;
    var rowsByOutKey = {};
    var allDecided = true;
    var annotatorId = currentAnnotatorId();
    var currentRejectedSomewhere = false;
    state.selectedOutputTypes.forEach(function (outKey) {
      var rows = getReviewerRows(outKey);
      rowsByOutKey[outKey] = rows;
      rows.forEach(function (row) {
        var decision = reviewRowDecisions[decisionKey(outKey, row.name)];
        if (!decision) allDecided = false;
        if (row.name === annotatorId && decision === 'reject') currentRejectedSomewhere = true;
      });
    });
    if (!allDecided) {
      showToast(t('toastSelectDecision'), 'warning');
      return;
    }

    var decisionLines = [];
    state.selectedOutputTypes.forEach(function (outKey) {
      rowsByOutKey[outKey].forEach(function (row) {
        var decision = reviewRowDecisions[decisionKey(outKey, row.name)];
        decisionLines.push(outKey + ' · ' + row.name + ': ' + decision);
      });
    });
    var correctionLines = state.selectedOutputTypes.map(function (outKey) {
      var corrected = describeOutputAnswer(outKey, {
        previewState: state.previewState,
        previewEntities: state.previewEntities,
        previewTriples: state.previewTriples,
      });
      var original = reviewRowOriginals[outKey] || '';
      return outKey + ': ' + original + ' -> ' + corrected;
    });
    appendReviewHistoryEntry(history, decisionLines.concat(correctionLines).join('\n'));

    var summary = buildHistorySummary() + '\n' + decisionLines.join('\n');
    window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      currentProfile.id,
      currentRole,
      currentRunType,
      currentSampleId,
      collectAnswerPayload(),
      summary,
      currentIdentity
    );
    clearUnsaved();
    /* spec 015 AC-3.15/AC-6.4/FR-014I (issue #192): the reject -> pending
       rollback only applies to official_run -- dry_run has no "退回個人重標"
       channel, so a dry_run reject decision must not roll the sample back. */
    if (currentRejectedSomewhere && currentRunType === 'official_run') {
      window.LabelSuiteAnnotationWorkspaceData.markSampleRejected(currentProfile.id, 'annotator', currentRunType, currentSampleId, summary, currentIdentity);
    }

    renderSampleList();
    renderSampleNav();
    renderHistoryPanel();
    showToast(t('wsReviewSubmitSuccess'));
  }


  /* ── guideline panel (spec 015 v2.0.0 AC-5.1-5.3, 區塊 C) ────────────
     Rendered exactly once per task load (called from boot(), never from
     selectSample()/renderWorkspace()) because guidelineFiles is task-level
     data, not sample-level -- this is what makes AC-5.1 ("切換下一筆，右
     欄說明不收起且內容不重置") and AC-5.2 ("切換下一筆，抽屜維持目前開合
     狀態") hold for free: nothing here ever re-runs on sample switch. */
  function openGuidelineImageModal(src, altText) {
    var modal = document.getElementById('wsGuidelineImageModal');
    var image = document.getElementById('wsGuidelineImageModalPreview');
    if (!modal || !image) return;
    image.src = src;
    image.alt = altText || '';
    modal.classList.remove('hidden');
  }
  function closeGuidelineImageModal() {
    var modal = document.getElementById('wsGuidelineImageModal');
    if (modal) modal.classList.add('hidden');
  }
  function showGuidelineMarkdownPreview(content) {
    var preview = document.getElementById('wsGuidelineMdPreview');
    if (!preview) return;
    preview.textContent = content || '';
    preview.classList.remove('hidden');
  }
  var GUIDELINE_FILE_ICON_SVG = {
    pdf: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    image: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    markdown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
  };
  var GUIDELINE_FILE_ICON_CLASS = { pdf: 'pdf', image: 'img', markdown: 'md' };
  function renderGuidelineFileList(container, files, taggedForTest) {
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    files.forEach(function (file) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'guideline-file-item';
      if (taggedForTest) item.setAttribute('data-testid', 'ws-guideline-file-item');
      var icon = document.createElement('div');
      icon.className = 'guideline-file-icon ' + (GUIDELINE_FILE_ICON_CLASS[file.type] || 'md');
      icon.setAttribute('aria-hidden', 'true');
      /* innerHTML must only ever receive the static GUIDELINE_FILE_ICON_SVG
         constants above -- file-derived strings (name, url) stay on
         textContent paths */
      icon.innerHTML = GUIDELINE_FILE_ICON_SVG[file.type] || GUIDELINE_FILE_ICON_SVG.markdown;
      item.appendChild(icon);
      var name = document.createElement('span');
      name.className = 'guideline-file-name';
      name.textContent = file.name;
      item.appendChild(name);
      var action = document.createElement('span');
      action.className = 'guideline-file-action';
      action.textContent = file.type === 'pdf' ? t('guidelineFileActionNewTab') : t('guidelineFileActionPreview');
      item.appendChild(action);
      item.addEventListener('click', function () {
        if (file.type === 'pdf') {
          window.open(file.url, '_blank');
        } else if (file.type === 'image') {
          openGuidelineImageModal(file.url, file.name);
        } else if (file.type === 'markdown') {
          showGuidelineMarkdownPreview(file.content);
        }
      });
      container.appendChild(item);
    });
  }
  function renderGuidelinePanel() {
    var files = (currentProfile && currentProfile.guidelineFiles) || [];
    renderGuidelineFileList(document.getElementById('wsGuidelineFileList'), files, true);
    renderGuidelineFileList(document.getElementById('wsGuidelineFileListMobile'), files, false);
  }
  function setupGuidelineImageModal() {
    var modal = document.getElementById('wsGuidelineImageModal');
    var closeBtn = document.getElementById('wsGuidelineImageModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeGuidelineImageModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeGuidelineImageModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeGuidelineImageModal();
    });
  }
  function setupGuidelineCollapse() {
    var btn = document.getElementById('wsGuidelineCollapseBtn');
    var body = document.getElementById('workspaceBody');
    if (!btn || !body) return;
    btn.addEventListener('click', function () {
      var collapsed = body.classList.toggle('guideline-collapsed');
      btn.setAttribute('aria-expanded', String(!collapsed));
    });
  }
  /* 說明與檔案 / 歷程 tab switching (區塊 C): tab state is page-level and
     never re-rendered on sample switch, so the active tab survives
     navigation (AC-5.1); only the history CONTENT re-renders per sample. */
  function setupGuidelineTabs() {
    var tabGuideline = document.getElementById('wsTabGuideline');
    var tabHistory = document.getElementById('wsTabHistory');
    var guidelinePanel = document.getElementById('wsGuidelinePanel');
    var historyPanel = document.getElementById('wsHistoryPanel');
    if (!tabGuideline || !tabHistory || !guidelinePanel || !historyPanel) return;
    tabGuideline.addEventListener('click', function () {
      tabGuideline.classList.add('active');
      tabHistory.classList.remove('active');
      guidelinePanel.classList.remove('hidden');
      historyPanel.classList.add('hidden');
    });
    tabHistory.addEventListener('click', function () {
      tabHistory.classList.add('active');
      tabGuideline.classList.remove('active');
      historyPanel.classList.remove('hidden');
      guidelinePanel.classList.add('hidden');
      renderHistoryPanel();
    });
  }

  function setupSampleNav() {
    var prevBtn = document.getElementById('wsPrevBtn');
    var nextBtn = document.getElementById('wsNextBtn');
    /* Steps one REVIEW UNIT at a time (FR-056), so a reviewer reaches every
       annotator of a sample before the sample changes. */
    function step(delta) {
      var units = buildUnits();
      var next = units[currentUnitIndex(units) + delta];
      if (!next) return;
      selectSample(next.recordId, next.annotatorId);
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        step(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        step(1);
      });
    }
  }

  function setupMobileDrawer() {
    var drawer = document.getElementById('wsMobileDrawer');
    var handle = document.getElementById('wsMobileDrawerHandle');
    if (!drawer || !handle) return;
    function toggle() {
      var open = drawer.classList.toggle('open');
      handle.setAttribute('aria-expanded', String(open));
    }
    /* Native <button>: Enter/Space activation comes for free, no keydown shim. */
    handle.addEventListener('click', toggle);
  }

  /* ── guideline modal ──────────────────────────────────────────────── */
  /* Gate depends on the task's own "開始標記前強制顯示" setting
     (currentProfile.forceShowGuideline, task-detail.panels/overview.html
     #editForceGuidelineToggle) -- tasks that don't enable it never show
     the modal (issue #184). The seen-flag is keyed per taskId so
     confirming it for one task never suppresses it for another, and
     switching tasks (a fresh page load with a different task_id)
     re-evaluates against that task's own setting from scratch. */
  function guidelineModalStorageKey(taskId) {
    return 'labelsuite.guidelineModalSeen.' + taskId;
  }
  function setupGuidelineModal() {
    var modal = document.getElementById('wsGuidelineModal');
    var confirmBtn = document.getElementById('wsGuidelineModalConfirm');
    var body = document.getElementById('wsGuidelineModalBody');
    if (!modal || !confirmBtn) return;
    if (!currentProfile || !currentProfile.forceShowGuideline) {
      modal.classList.add('hidden');
      return;
    }
    if (body) {
      /* Same data source as the right-side 說明 tab (renderGuidelinePanel):
         guidelineFiles[]. The markdown entry's `content` is the only
         actual prose text in that data -- pdf/image entries are links,
         not text -- so it's what "guideline text" means here. */
      var files = currentProfile.guidelineFiles || [];
      var mdFile = files.filter(function (file) {
        return file.type === 'markdown';
      })[0];
      body.textContent = mdFile
        ? mdFile.content
        : files
            .map(function (file) {
              return file.name;
            })
            .join('\n');
    }
    var storageKey = guidelineModalStorageKey(currentProfile.id);
    var seen = null;
    try {
      seen = window.localStorage.getItem(storageKey);
    } catch (e) {
      /* treat blocked storage as not-seen: showing the modal again is safe */
    }
    if (!seen) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
    confirmBtn.addEventListener('click', function () {
      try {
        window.localStorage.setItem(storageKey, '1');
      } catch (e) {
        /* ignore quota/serialization errors in the prototype */
      }
      modal.classList.add('hidden');
    });
  }

  /* ── Language toggle (spec 015 v2.2.0): the workspace no longer renders
     its own task-title card / in-card toggle -- language switching binds to
     the shared sidebar's lang-toggle buttons, same as every other page.
     Reuses the SAME localStorage key the shared sidebar already writes
     (pages/shared/sidebar.js LANG_STORAGE_KEY) so a language choice made
     anywhere in the app is honored on the next workspace load. */
  var LANG_STORAGE_KEY = 'labelsuite.lang';
  function readStoredLang() {
    try {
      var value = window.localStorage.getItem(LANG_STORAGE_KEY);
      return value === 'en' ? 'en' : 'zh';
    } catch (e) {
      return 'zh';
    }
  }
  function persistLang(lang) {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      /* ignore quota/serialization errors in the prototype */
    }
  }
  function applyDocumentLang() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-TW' : 'en';
  }
  function applyStaticI18nText() {
    setText('sampleListTitle', t('sampleListTitle'));
    var submitBtn = document.getElementById('wsSubmitBtn');
    var reviewSubmitBtn = document.getElementById('wsReviewSubmitBtn');
    if (currentRole === 'reviewer') {
      if (reviewSubmitBtn) setText('wsReviewSubmitLabel', t('reviewSubmitLabel'));
    } else if (submitBtn) {
      setText('wsSubmitLabel', t('submitLabel'));
      setText('wsSaveLabel', t('saveLabel'));
    }
    setText('wsPrevBtnLabel', t('wsPrevBtnLabel'));
    setText('wsNextBtnLabel', t('wsNextBtnLabel'));
    setText('wsAutosaveLabel', t('wsAutosaveSaved'));
    setText('wsTabGuidelineLabel', t('wsTabGuideline'));
    setText('wsTabHistoryLabel', t('wsTabHistory'));
    var noteLabel = document.getElementById('wsNoteLabel');
    if (noteLabel) noteLabel.textContent = t('noteLabel');
    var noteInput = document.getElementById('wsNoteInput');
    if (noteInput) noteInput.placeholder = t('notePlaceholder');
    setText('wsGuidelineModalTitleText', t('guidelineModalTitle'));
    setText('wsGuidelineModalConfirm', t('guidelineModalConfirm'));
    setText('guidelineSummaryTitle', t('guidelineSummaryTitle'));
    setText('wsGuidelineImageModalTitleText', t('guidelineSummaryTitle'));
    setText('wsMobileDrawerTitle', t('mobileDrawerTitle'));
    var closeBtn = document.getElementById('wsGuidelineImageModalClose');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('guidelineImageModalCloseAria'));
    var taskName = currentProfile ? (state.lang === 'zh' ? currentProfile.nameZh : currentProfile.nameEn) : '';
    setText('guidelineSummaryText', taskName);
    setText('wsMobileGuidelineSummaryText', taskName);
    ['langLabel', 'mobileLangLabel'].forEach(function (id) {
      var langLabel = document.getElementById(id);
      if (langLabel) langLabel.textContent = state.lang === 'zh' ? 'ZH' : 'EN';
    });
  }
  function setupLangToggle() {
    ['langToggle', 'mobileLangToggle'].forEach(function (id) {
      var toggle = document.getElementById(id);
      if (!toggle) return;
      toggle.addEventListener('click', function () {
        state.lang = state.lang === 'zh' ? 'en' : 'zh';
        persistLang(state.lang);
        applyDocumentLang();
        applyStaticI18nText();
        /* file-action labels (新分頁/預覽) are i18n text rendered into the
           list items, so the list must re-render on language switch; this
           is not a sample switch, so AC-5.1/5.2 persistence is unaffected */
        renderGuidelinePanel();
        renderWorkspace();
      });
    });
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function boot() {
    var params = new URLSearchParams(window.location.search);
    var taskId = params.get('task_id');
    var sampleId = params.get('sample_id');
    /* FR-006: missing/unsupported role or run_type fall back to the
       defaults (annotator / dry_run) -- same normalization annotation-list's
       parseContext() applies, so both pages resolve an identical context. */
    currentRole = params.get('role') === 'reviewer' ? 'reviewer' : 'annotator';
    currentRunType = params.get('run_type') === 'official_run' ? 'official_run' : 'dry_run';
    currentIdentity = window.LabelSuiteAnnotationWorkspaceData.resolveIdentity(params);

    currentProfile = window.LabelSuiteAnnotationWorkspaceData.resolveTaskProfile(taskId);
    if (!currentProfile) {
      window.location.href = 'annotation-list.html' + window.location.search;
      return;
    }

    state.lang = readStoredLang();
    applyDocumentLang();
    applyStaticI18nText();

    var submitBtn = document.getElementById('wsSubmitBtn');
    var saveBtn = document.getElementById('wsSaveBtn');
    var reviewSubmitBtn = document.getElementById('wsReviewSubmitBtn');
    if (currentRole === 'reviewer') {
      if (submitBtn) submitBtn.classList.add('hidden');
      if (saveBtn) saveBtn.classList.add('hidden');
      if (reviewSubmitBtn) {
        reviewSubmitBtn.classList.remove('hidden');
        reviewSubmitBtn.addEventListener('click', handleReviewSubmit);
      }
      setupReviewShortcuts();
    } else {
      if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
      if (saveBtn) saveBtn.addEventListener('click', handleSave);
    }
    setupActionShortcuts();

    seedEngineState(currentProfile);
    selectSample(
      sampleId ||
        (currentProfile.datasetRecords[0] &&
          window.LabelSuiteAnnotationWorkspaceData.getRecordId(currentProfile.datasetRecords[0], 0))
    );
    renderGuidelinePanel();
    setupGuidelineImageModal();
    setupGuidelineCollapse();
    setupGuidelineTabs();
    setupSampleNav();
    setupMobileDrawer();
    setupGuidelineModal();
    setupLangToggle();
    /* SC-007 15s autosave heartbeat (visual, matches the pre-outputs[]
       design's cadence). */
    setInterval(triggerAutosave, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

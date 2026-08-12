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
      reviewStatsChip: '標記分布統計',
      reviewFreeTextStats: '自由文本任務 — 請並列比對各標記員結果',
      reviewNote: '通過：此筆標記有效。退回：該標記狀態會回到未標記，標記員需要重新標記。',
      reviewBulkRejectLabel: '全部退回',
      reviewBulkApproveLabel: '全部通過',
      reviewCurrentAnnotatorLabel: '目前標記員',
      reviewCorrectionTitle: '直接修正',
      reviewBypassPill: '無法判定 (Bypass)',
      reviewSourceTextTitle: '原始文本',
      toastSelectDecision: '請完成每位標記員的審核決策',
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
      reviewStatsChip: 'Label distribution',
      reviewFreeTextStats: 'Free-text task — compare annotator answers side by side',
      reviewNote: 'Approve: this annotation is valid. Reject: the sample returns to pending and the annotator must redo it.',
      reviewBulkRejectLabel: 'Reject all',
      reviewBulkApproveLabel: 'Approve all',
      reviewCurrentAnnotatorLabel: 'Current annotator',
      reviewCorrectionTitle: 'Direct correction',
      reviewBypassPill: 'Bypassed (cannot determine)',
      reviewSourceTextTitle: 'Source text',
      toastSelectDecision: 'Please decide on every annotator before submitting',
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
  function showToast(msg) {
    var toast = document.getElementById('toast');
    var toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg || '';
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('visible');
    }, 2200);
  }
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
      btn.style.cssText = 'padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:2px solid ' + color + ';color:' + (isActive ? '#fff' : color) + ';background:' + (isActive ? color : 'transparent') + ';';
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
     purely off fieldRoleMap, never off task_id or output-type name. */
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
    Object.keys(profile.fieldRoleMap || {}).forEach(function (col) {
      if (profile.fieldRoleMap[col] !== 'output') return;
      if (record[col] === undefined) return;
      sanitized[col] = deepClone(record[col]);
    });
    return sanitized;
  }

  /* ── TaskProfile / sample state ──────────────────────────────────── */
  var currentProfile = null;
  var currentRole = 'annotator';
  var currentRunType = 'dry_run';
  var currentSampleId = null;
  var sampleAnswers = {};

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function snapshotCurrentSample() {
    if (!currentSampleId) return;
    sampleAnswers[currentSampleId] = {
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
    var snap = sampleAnswers[sampleId];
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
        sampleId
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

  function currentSampleIndex() {
    var records = currentProfile.datasetRecords;
    for (var i = 0; i < records.length; i++) {
      if (window.LabelSuiteAnnotationWorkspaceData.getRecordId(records[i], i) === String(currentSampleId)) return i;
    }
    return 0;
  }

  /* Top-of-column sample nav (區塊 B 上方導覽列): prev/next + submitted
     progress. Progress counts THIS role+run's submissions over the seeded
     record list, matching what the prev/next buttons can actually reach. */
  function renderSampleNav() {
    var total = currentProfile.datasetRecords.length;
    var done = window.LabelSuiteAnnotationWorkspaceData.getSubmittedSampleCount(
      currentProfile.id,
      currentRole,
      currentRunType
    );
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
    var idx = currentSampleIndex();
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
      currentSampleId
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
      actor.textContent = event.role === 'reviewer' ? t('wsHistoryRoleReviewer') : t('wsHistoryRoleAnnotator');
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

  function selectSample(sampleId) {
    var record = findRecordById(sampleId) || currentProfile.datasetRecords[0];
    if (!record) return;
    var recordIdx = currentProfile.datasetRecords.indexOf(record);
    /* SC-007: sample switch is an autosave trigger; skip the very first
       (boot) call so the page doesn't open on a 儲存中… flash. */
    if (currentSampleId) triggerAutosave();
    snapshotCurrentSample();
    currentSampleId = window.LabelSuiteAnnotationWorkspaceData.getRecordId(record, recordIdx);
    state.datasetRawFirstRow = buildAnnotatorRecord(record, currentProfile);
    /* The engine only rebuilds columnOutputTypeMap inside its own
       renderSchemaFields() (a task-new Step 2 path this host never runs);
       without it getOutputFieldValue(outKey) falls back to the first
       output column whenever a task maps several, mis-seeding prefill on
       multi-output tasks. */
    rebuildColumnOutputTypeMap();
    restoreSample(currentSampleId);
    renderWorkspace();
  }

  function renderSampleList() {
    var listEl = document.getElementById('sampleList');
    var countEl = document.getElementById('sampleListCount');
    if (!listEl) return;
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    var records = currentProfile.datasetRecords;
    /* Spec 015 line "筆數仍需依 materialized run context 顯示": the count
       reflects the run's materialized list size when the profile declares
       one for the current run_type; the rendered rows stay the seed
       records (prototype subset). Title stays a fixed 標記清單 -- run
       labels in the column title are forbidden by the same clause. */
    var runCtx = currentProfile.materializedRuns && currentProfile.materializedRuns[currentRunType];
    var totalCount = runCtx && typeof runCtx.total === 'number' ? runCtx.total : records.length;
    if (countEl) countEl.textContent = totalCount + (state.lang === 'zh' ? ' 筆' : ' items');

    records.forEach(function (record, idx) {
      var recordId = window.LabelSuiteAnnotationWorkspaceData.getRecordId(record, idx);
      /* Tri-state per sample (submitted / saved / pending) drives both the
         index-badge tint and the text status label under the snippet. */
      var status = window.LabelSuiteAnnotationWorkspaceData.getSampleStatus(
        currentProfile.id,
        currentRole,
        currentRunType,
        recordId
      );
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'sample-item' + (recordId === String(currentSampleId) ? ' active' : '');
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
      var statusLabel = document.createElement('span');
      statusLabel.className = 'sample-status-label status-color-' + status;
      statusLabel.setAttribute('data-testid', 'ws-sample-status');
      statusLabel.textContent =
        status === 'submitted' ? t('wsStatusSubmitted') : status === 'saved' ? t('wsStatusSaved') : t('wsStatusPending');
      meta.appendChild(statusLabel);
      item.appendChild(meta);

      item.addEventListener('click', function () {
        selectSample(recordId);
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
      buildHistorySummary()
    );
    triggerAutosave();
    renderSampleList();
    renderHistoryPanel();
    showToast(t('wsSaveSuccess'));
  }

  function handleSubmit() {
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
      showToast(t('wsSubmitIncomplete'));
      return;
    }
    window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(currentProfile.id, currentRole, currentRunType, currentSampleId, collectAnswerPayload(), buildHistorySummary());
    /* task-detail.html's dry-run status sync (waiting_iaa_confirmation once
       every sample is submitted) reads this key -- see
       annotation-workspace.data.js's syncDryRunProgress() doc comment. */
    window.LabelSuiteAnnotationWorkspaceData.syncDryRunProgress(
      currentProfile.id,
      currentRole,
      currentRunType,
      currentProfile.datasetRecords.length
    );
    renderSampleList();
    renderSampleNav();
    renderHistoryPanel();
    showToast(t('wsSubmitSuccess'));
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

  /* FR-014A: single_dim/multi_dim result tag, ±1.5std colored (priority
     red > blue > green). Computed from every touched dimension's submitted
     value against their own mean/std (a single-annotator submission
     degenerates to std=0 -> always green, which is the correct result of
     the same formula, not a special case). */
  function buildResultTag(outKey, submission) {
    if (outKey !== 'single_dim' && outKey !== 'multi_dim') return null;
    var ps = (submission.previewState && submission.previewState[outKey]) || {};
    var values =
      outKey === 'single_dim'
        ? ps.value != null ? [Number(ps.value)] : []
        : Object.keys(ps.dims || {}).map(function (name) { return Number(ps.dims[name].value); });
    if (values.length === 0) return null;
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    var maxDeviation = values.reduce(function (max, v) { return Math.max(max, Math.abs(v - mean)); }, 0);
    var variance = values.reduce(function (a, v) { return a + Math.pow(v - mean, 2); }, 0) / values.length;
    var std = Math.sqrt(variance);
    var color = 'green';
    if (std > 0 && maxDeviation > 1.5 * std) color = 'red';
    else if (std > 0 && maxDeviation > std) color = 'blue';
    var colorToken = color === 'red' ? 'var(--color-error)'
      : color === 'blue' ? 'var(--color-info)' : 'var(--color-success)';
    var tag = document.createElement('span');
    tag.setAttribute('data-testid', 'ws-review-result-tag-' + outKey);
    tag.textContent = color;
    tag.style.cssText =
      'display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;color:#fff;background:' +
      colorToken +
      ';';
    return tag;
  }

  /* ── FR-014 aggregate review card (spec 015 v2.5.0) ──────────────────
     Replaces the old per-outKey approve/reject pair with a legacy-parity
     multi-annotator comparison: a stats box, a bulk approve/reject bar,
     and one decision row per annotator. reviewRowDecisions is now keyed
     `${outKey}::${annotatorName}` (annotatorName is 'current' for the
     live annotator's own submission) instead of just outKey. */
  function decisionKey(outKey, rowName) {
    return outKey + '::' + rowName;
  }

  /* Converts the live annotator's engine-shape submission (previewState /
     previewEntities / previewTriples) into the SAME CompactAnswer shape
     annotation-workspace.data.js's REVIEWER_MOCK_ROWS ships, so the mock
     rows and the prepended "current" row can share one answer renderer. */
  function buildSequencePairsFromTags(tags) {
    if (!Array.isArray(tags)) return [];
    var cfg = state.outputConfigs.sequence_tagging || {};
    var tokenization = cfg.tokenization && typeof cfg.tokenization === 'object' ? cfg.tokenization : {};
    var unit = tokenization.unit === 'word' ? 'word' : 'character';
    var rawRow = findRecordById(currentSampleId) || {};
    /* getDatasetPreviewText() (task-config.engine.js) always returns null
       in this workspace -- it reads state.datasetParsedColumns, which is
       only ever populated by the task-builder's CSV-upload flow, never by
       annotation-workspace.config.js. Mirror engine.js's own
       renderTokenClassPreview() fallback sentence here (line ~2867) so
       this reconstructed token list stays aligned with the token
       positions the correction control right below is already showing. */
    var realText = getDatasetPreviewText();
    var fallbackText =
      state.lang === 'zh' ? '台積電董事長魏哲家今天出席台北產業論壇' : 'The chairman of TSMC attended the forum in Taipei today.';
    var tokenTexts = getSequencePreviewTokens(realText || fallbackText, rawRow, unit);
    var pairs = [];
    for (var i = 0; i < tags.length && i < tokenTexts.length; i++) {
      if (tags[i] && tags[i] !== 'O') pairs.push({ text: tokenTexts[i], tag: tags[i] });
    }
    return pairs;
  }
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
      case 'sequence_tagging':
        return buildSequencePairsFromTags(ps.tokens);
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

  /* One row per mock annotator (fixed order, annotation-workspace.data.js's
     getReviewerMockRows), with the live annotator's own submitted answer
     PREPENDED as a 'current' row when one exists (AC-3.2/AC-3.9). */
  function getReviewerRows(outKey) {
    var mockRows = window.LabelSuiteAnnotationWorkspaceData.getReviewerMockRows(currentProfile.id, currentSampleId) || [];
    var rows = mockRows.map(function (mockRow) {
      return {
        name: mockRow.annotator,
        displayName: mockRow.annotator,
        answer: mockRow.answers ? mockRow.answers[outKey] : undefined,
        bypass: !!(mockRow.bypass && mockRow.bypass[outKey]),
      };
    });
    var liveSubmission = window.LabelSuiteAnnotationWorkspaceData.getSubmission(
      currentProfile.id,
      'annotator',
      currentRunType,
      currentSampleId
    );
    if (liveSubmission) {
      rows.unshift({
        name: 'current',
        displayName: t('reviewCurrentAnnotatorLabel'),
        answer: convertSubmissionAnswer(outKey, liveSubmission),
        bypass: !!(liveSubmission.previewBypass && liveSubmission.previewBypass[outKey]),
      });
    }
    return rows;
  }

  /* FR-014F: stats algorithm lives in annotation-workspace.data.js
     (shared with the annotation list's reviewer stats column). free_text
     comes back as null -- render the localized placeholder here. */
  function computeReviewStats(outKey, rows) {
    var stats = window.LabelSuiteAnnotationWorkspaceData.computeReviewStats(outKey, rows);
    return stats === null ? t('reviewFreeTextStats') : stats;
  }

  function buildStatsBox(outKey, rows) {
    var box = document.createElement('div');
    box.className = 'rv-summary-card';

    var head = document.createElement('div');
    head.className = 'rv-summary-head';
    var chip = document.createElement('span');
    chip.className = 'rv-summary-chip';
    chip.textContent = t('reviewStatsChip');
    head.appendChild(chip);
    box.appendChild(head);

    var summaryText = document.createElement('div');
    summaryText.className = 'rv-summary-text';
    summaryText.setAttribute('data-testid', 'ws-review-stats');
    summaryText.textContent = computeReviewStats(outKey, rows);
    box.appendChild(summaryText);

    return box;
  }

  /* free_text/entity_recognition/relation_identification/sequence_tagging
     get the two-column long-content row layout -- the same registry flag
     (rendersInputPreview) renderReviewerWorkspace() already reuses for the
     input-preview-card skip decision, not a hardcoded type list. */
  function isLongContentOutput(outKey) {
    var outReg = window.OUTPUT_TYPE_REGISTRY && window.OUTPUT_TYPE_REGISTRY[outKey];
    return !!(outReg && outReg.rendersInputPreview === true);
  }

  /* Reviewer relation rows must mirror the annotator's own 關係識別 list
     (FR-014L): token positions + trigger word resolve at render time from the
     record's ner-shape triples (single data source -- mock answers stay
     type-level {subj, rel, obj}). Records without ner triples (e.g. absa
     gold_triplets) fall back to positionless rows, matching what the
     annotator view shows for those records. */
  function findRecordNerTriples(record) {
    if (!record) return [];
    var cands = [record.triples, record.gold_triples];
    for (var i = 0; i < cands.length; i++) {
      var cand = cands[i];
      if (Array.isArray(cand) && cand.length > 0 && cand[0] && cand[0].entity1) return cand;
    }
    return [];
  }

  function fmtRelationSpan(span) {
    var s = (span && span.text) || '?';
    if (span && span.start != null && span.end != null) s += ' (' + span.start + ',' + span.end + ')';
    return s;
  }

  /* Match on the subj+obj entity pair (exact relation_type match preferred)
     so a reviewer 類型 change keeps the row anchored to the same span pair. */
  function toReviewDisplayTriple(tr, nerTrips) {
    var exact = null, pair = null;
    nerTrips.forEach(function (rt) {
      if (!rt.entity1 || !rt.entity2) return;
      if (rt.entity1.text !== tr.subj || rt.entity2.text !== tr.obj) return;
      if (!pair) pair = rt;
      if (!exact && rt.relation_type === tr.rel) exact = rt;
    });
    var match = exact || pair;
    if (match) {
      return {
        subj: fmtRelationSpan(match.entity1),
        rel: fmtRelationSpan(match.relation),
        obj: fmtRelationSpan(match.entity2),
        relType: tr.rel
      };
    }
    return { subj: tr.subj, rel: tr.rel, obj: tr.obj, relType: null };
  }

  /* Reviewer entity rows must mirror the annotator's own 實體列表 (FR-014M):
     token positions resolve at render time from the record's entity spans
     (single data source -- mock answers stay {text, type}). Duplicate texts
     (e.g. 左心耳 twice in T010 med-001) consume record spans in answer order
     so each row shows a distinct position. Records without an entity span
     field fall back to positionless rows. */
  function findRecordEntitySpans(record) {
    if (!record) return [];
    var cands = [record.entities, record.gold_entities];
    for (var i = 0; i < cands.length; i++) {
      var cand = cands[i];
      if (Array.isArray(cand) && cand.length > 0 && cand[0] && cand[0].text != null && cand[0].start != null) return cand;
    }
    return [];
  }

  function buildAnswerCell(outKey, answer, bypass, colorClass) {
    var cell = document.createElement('div');
    cell.className = 'rv-answer-cell';
    cell.setAttribute('data-testid', 'ws-review-annotator-answer');
    if (bypass) {
      var bypassPill = document.createElement('span');
      bypassPill.className = 'rv-bypass-pill';
      bypassPill.textContent = t('reviewBypassPill');
      cell.appendChild(bypassPill);
      return cell;
    }
    switch (outKey) {
      case 'single_label': {
        var labelPill = document.createElement('span');
        labelPill.className = 'rv-answer-chip';
        labelPill.textContent = answer || t('reviewNoAnswer');
        cell.appendChild(labelPill);
        break;
      }
      case 'multi_label': {
        var labels = Array.isArray(answer) ? answer : [];
        if (labels.length === 0) { cell.textContent = t('reviewNoAnswer'); break; }
        var chipsWrap = document.createElement('div');
        chipsWrap.className = 'rv-answer-chips';
        labels.forEach(function (label) {
          var chip = document.createElement('span');
          chip.className = 'rv-answer-chip';
          chip.textContent = label;
          chipsWrap.appendChild(chip);
        });
        cell.appendChild(chipsWrap);
        break;
      }
      case 'single_dim': {
        var scorePill = document.createElement('span');
        scorePill.className = 'annotator-result-tag' + (colorClass ? ' ' + colorClass : '');
        scorePill.textContent = answer != null ? String(answer) : t('reviewNoAnswer');
        cell.appendChild(scorePill);
        break;
      }
      case 'multi_dim': {
        var dims = answer || {};
        var dimNames = Object.keys(dims);
        if (dimNames.length === 0) { cell.textContent = t('reviewNoAnswer'); break; }
        var dimPill = document.createElement('span');
        dimPill.className = 'annotator-result-tag' + (colorClass ? ' ' + colorClass : '');
        dimPill.textContent = '[' + dimNames.map(function (name) { return dims[name]; }).join(', ') + ']';
        cell.appendChild(dimPill);
        break;
      }
      case 'sequence_tagging': {
        var pairs = Array.isArray(answer) ? answer : [];
        if (pairs.length === 0) { cell.textContent = t('reviewNoAnswer'); break; }
        var seqWrap = document.createElement('div');
        seqWrap.className = 'rv-answer-chips';
        pairs.forEach(function (pair) {
          var chip = document.createElement('span');
          chip.className = 'rv-answer-chip';
          chip.textContent = pair.text + ' (' + pair.tag + ')';
          seqWrap.appendChild(chip);
        });
        cell.appendChild(seqWrap);
        break;
      }
      case 'entity_recognition': {
        var entities = Array.isArray(answer) ? answer : [];
        if (entities.length === 0) { cell.textContent = t('reviewNoAnswer'); break; }
        var colorMap = getPreviewTypeColorMap().map || {};
        var recordSpans = findRecordEntitySpans(findRecordById(currentSampleId));
        var spanUsed = recordSpans.map(function () { return false; });
        var entWrap = document.createElement('div');
        entWrap.className = 'rv-answer-entities';
        entities.forEach(function (ent, idx) {
          var display = ent;
          for (var si = 0; si < recordSpans.length; si++) {
            if (!spanUsed[si] && recordSpans[si].text === ent.text && recordSpans[si].type === ent.type) {
              spanUsed[si] = true;
              display = { text: ent.text, type: ent.type, start: recordSpans[si].start, end: recordSpans[si].end };
              break;
            }
          }
          entWrap.appendChild(buildEntityListRow(display, safeCssColor(colorMap[ent.type], '#6366F1'), {
            lang: state.lang,
            onDelete: function () { entities.splice(idx, 1); renderReviewerWorkspace(); }
          }));
        });
        cell.appendChild(entWrap);
        break;
      }
      case 'relation_identification': {
        var triples = Array.isArray(answer) ? answer : [];
        if (triples.length === 0) { cell.textContent = t('reviewNoAnswer'); break; }
        var relCfg = state.outputConfigs.relation_identification || {};
        var relTypeOpts = getRelationTypeOptions(
          Array.isArray(relCfg.relation_types) ? relCfg.relation_types.filter(Boolean) : []
        );
        var nerTrips = findRecordNerTriples(findRecordById(currentSampleId));
        var relWrap = document.createElement('div');
        relWrap.className = 'rv-answer-relations';
        triples.forEach(function (tr, idx) {
          var display = toReviewDisplayTriple(tr, nerTrips);
          relWrap.appendChild(buildRelationTripleRow(display, relTypeOpts, {
            lang: state.lang,
            onSetType: function (v) { tr.rel = v; renderReviewerWorkspace(); },
            onDelete: function () { triples.splice(idx, 1); renderReviewerWorkspace(); }
          }));
        });
        cell.appendChild(relWrap);
        break;
      }
      case 'free_text': {
        var block = document.createElement('div');
        block.className = 'rv-answer-freetext';
        block.textContent = answer || t('reviewNoAnswer');
        cell.appendChild(block);
        break;
      }
      default:
        cell.textContent = t('reviewNoAnswer');
    }
    return cell;
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

    wrap.appendChild(rejectBtn);
    wrap.appendChild(approveBtn);
    return { el: wrap, refresh: refresh };
  }

  function buildAnnotatorRow(outKey, row, onDecisionChange, colorClass) {
    var longContent = isLongContentOutput(outKey);
    var rowEl = document.createElement('div');
    rowEl.className = 'rv-annotator-review-row' + (longContent ? ' rv-annotator-review-row-sequence' : '');
    rowEl.setAttribute('data-testid', 'ws-review-annotator-row');
    rowEl.setAttribute('data-annotator', row.name);

    var content = document.createElement('div');
    content.className = longContent ? 'rv-sequence-review-content' : 'rv-annotator-meta';

    var nameEl = document.createElement('span');
    nameEl.className = 'rv-annotator-name';
    nameEl.setAttribute('data-testid', 'ws-review-annotator-name');
    nameEl.textContent = row.displayName || row.name;
    content.appendChild(nameEl);
    content.appendChild(buildAnswerCell(outKey, row.answer, row.bypass, colorClass));
    rowEl.appendChild(content);

    var buttons = buildRowDecisionButtons(outKey, row.name, onDecisionChange);
    rowEl.appendChild(buttons.el);

    return { el: rowEl, refresh: buttons.refresh };
  }

  /* FR-014C: bulk approve-all/reject-all shortcuts. A bulk button is only
     shown "active" (aria-pressed) once every row already shares that same
     decision; clicking it again clears every row back to undecided. */
  function buildDecisionSection(outKey, rows) {
    var list = document.createElement('div');
    list.className = 'rv-annotator-list';
    list.setAttribute('data-testid', 'ws-review-annotator-list');

    var rowRefreshers = [];
    rows.forEach(function (row, idx) {
      /* FR-014A: same deviation-coloring source as the annotation list. */
      var colorClass = window.LabelSuiteAnnotationWorkspaceData.dimDeviationClass(outKey, rows, idx);
      var built = buildAnnotatorRow(outKey, row, function () { refreshBulk(); }, colorClass);
      rowRefreshers.push(built.refresh);
      list.appendChild(built.el);
    });

    var bulkBar = document.createElement('div');
    bulkBar.className = 'rv-bulk-bar';

    var note = document.createElement('div');
    note.className = 'rv-review-note';
    note.setAttribute('data-testid', 'ws-review-note');
    note.textContent = t('reviewNote');

    var actions = document.createElement('div');
    actions.className = 'rv-bulk-actions';

    var bulkReject = document.createElement('button');
    bulkReject.type = 'button';
    bulkReject.className = 'mini-btn mini-btn-reject';
    bulkReject.setAttribute('data-testid', 'ws-review-bulk-reject');
    bulkReject.appendChild(buildIconSpan('✕'));
    bulkReject.appendChild(document.createTextNode(' ' + t('reviewBulkRejectLabel')));

    var bulkApprove = document.createElement('button');
    bulkApprove.type = 'button';
    bulkApprove.className = 'mini-btn mini-btn-approve';
    bulkApprove.setAttribute('data-testid', 'ws-review-bulk-approve');
    bulkApprove.appendChild(buildIconSpan('✓'));
    bulkApprove.appendChild(document.createTextNode(' ' + t('reviewBulkApproveLabel')));

    function refreshBulk() {
      var allApprove = rows.length > 0 && rows.every(function (row) {
        return reviewRowDecisions[decisionKey(outKey, row.name)] === 'approve';
      });
      var allReject = rows.length > 0 && rows.every(function (row) {
        return reviewRowDecisions[decisionKey(outKey, row.name)] === 'reject';
      });
      bulkApprove.setAttribute('aria-pressed', allApprove ? 'true' : 'false');
      bulkApprove.classList.toggle('mini-btn-active-approve', allApprove);
      bulkReject.setAttribute('aria-pressed', allReject ? 'true' : 'false');
      bulkReject.classList.toggle('mini-btn-active-reject', allReject);
    }
    bulkApprove.addEventListener('click', function () {
      var allApprove = rows.every(function (row) { return reviewRowDecisions[decisionKey(outKey, row.name)] === 'approve'; });
      var nextValue = allApprove ? null : 'approve';
      rows.forEach(function (row) { reviewRowDecisions[decisionKey(outKey, row.name)] = nextValue; });
      rowRefreshers.forEach(function (fn) { fn(); });
      refreshBulk();
    });
    bulkReject.addEventListener('click', function () {
      var allReject = rows.every(function (row) { return reviewRowDecisions[decisionKey(outKey, row.name)] === 'reject'; });
      var nextValue = allReject ? null : 'reject';
      rows.forEach(function (row) { reviewRowDecisions[decisionKey(outKey, row.name)] = nextValue; });
      rowRefreshers.forEach(function (fn) { fn(); });
      refreshBulk();
    });
    refreshBulk();

    actions.appendChild(bulkReject);
    actions.appendChild(bulkApprove);
    bulkBar.appendChild(note);
    bulkBar.appendChild(actions);

    return { bulkBar: bulkBar, list: list };
  }

  /* Seeds the shared engine state with the annotator's submitted answer for
     one output type, so renderOutputPreview(container, outKey) -- the exact
     same dispatcher every annotator panel already goes through -- renders
     the correction control pre-filled with that answer instead of the
     dataset's default/prefilled value. */
  function seedReviewState(outKey, submission) {
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
      state.previewEntities = deepClone(submission.previewEntities || []);
      state.previewTriples = deepClone(submission.previewTriples || []);
      state.previewInited = true;
    }
  }

  function buildReviewRow(outKey, submission) {
    var row = document.createElement('div');
    row.className = 'content-card';
    row.setAttribute('data-testid', 'ws-review-row');

    var header = document.createElement('div');
    header.className = 'review-row-header';
    var title = document.createElement('div');
    title.className = 'content-card-title';
    title.textContent = outKey;
    header.appendChild(title);
    var tag = buildResultTag(outKey, submission);
    if (tag) header.appendChild(tag);
    row.appendChild(header);

    /* FR-014 aggregate review card: stats box, then the bulk bar + one
       decision row per annotator (mock rows + the live 'current' row). */
    var rows = getReviewerRows(outKey);
    row.appendChild(buildStatsBox(outKey, rows));
    var decisionSection = buildDecisionSection(outKey, rows);
    row.appendChild(decisionSection.bulkBar);
    row.appendChild(decisionSection.list);

    reviewRowOriginals[outKey] = describeOutputAnswer(outKey, submission);
    seedReviewState(outKey, submission);

    /* FR-024L: direct correction control, reusing the same per-type
       annotator control the annotator role uses, seeded above. */
    var correctionTitle = document.createElement('div');
    correctionTitle.className = 'rv-correction-title';
    correctionTitle.textContent = t('reviewCorrectionTitle');
    row.appendChild(correctionTitle);

    var correction = document.createElement('div');
    correction.setAttribute('data-testid', 'ws-review-correct-' + outKey);
    var panelMount = document.createElement('div');
    correction.appendChild(panelMount);
    renderOutputPreview(panelMount, outKey);
    row.appendChild(correction);

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
  /* Legacy-parity 原始文本 card for entity/relation tasks (reviewer view):
     the raw input text with ONE inline highlight per distinct annotated
     entity across ALL annotator rows (union, not a single annotator's view
     -- e.g. an entity two annotators tagged and one missed still shows);
     relation-only tasks highlight the record's evidence entities instead.
     Highlight visuals mirror the engine's own absa-span-highlight rule
     (tinted background + colored bottom border) plus a solid type badge,
     colored from the task's entity config via getPreviewTypeColorMap().
     Entities are placed at their first occurrence in the text; entities
     whose text no longer matches (or overlaps an earlier placement) are
     skipped here but still listed in the per-annotator rows below. */
  function buildReviewerSourceTextCard(rawRecord) {
    var card = document.createElement('div');
    card.className = 'content-card';
    card.setAttribute('data-testid', 'ws-review-source-text');

    var title = document.createElement('div');
    title.className = 'rv-source-title';
    title.textContent = t('reviewSourceTextTitle');
    card.appendChild(title);

    var body = document.createElement('div');
    body.className = 'rv-source-body';
    var rawText = buildReviewerInputText(rawRecord, currentProfile.fieldRoleMap);

    var seen = {};
    var placed = [];
    function placeSpan(ent) {
      if (!ent || !ent.text) return;
      var key = ent.text + ' ' + ent.type;
      if (seen[key]) return;
      seen[key] = true;
      var idx = rawText.indexOf(ent.text);
      if (idx < 0) return;
      var overlaps = placed.some(function (span) {
        return idx < span.end && idx + ent.text.length > span.start;
      });
      if (!overlaps) placed.push({ start: idx, end: idx + ent.text.length, text: ent.text, type: ent.type });
    }
    if (state.selectedOutputTypes.indexOf('entity_recognition') >= 0) {
      getReviewerRows('entity_recognition').forEach(function (row) {
        if (row.bypass) return;
        (Array.isArray(row.answer) ? row.answer : []).forEach(placeSpan);
      });
    } else {
      /* Relation-only tasks (entity_recognition is not an output): highlight
         the record's evidence entities instead -- the same spans the
         annotator's own relation view opens with. Records without an
         evidence entities field (e.g. absa) show the plain text. */
      (Array.isArray(rawRecord.entities) ? rawRecord.entities : []).forEach(placeSpan);
    }
    placed.sort(function (a, b) { return a.start - b.start; });

    var colorInfo = getPreviewTypeColorMap();
    var colorMap = colorInfo.map || {};
    /* Evidence-entity types are absent from the entity config's color map --
       assign palette colors by first appearance, mirroring the engine rule. */
    placed.forEach(function (span) {
      if (span.type && !colorMap[span.type]) {
        colorMap[span.type] = ENTITY_COLORS[colorInfo.order.length % ENTITY_COLORS.length];
        colorInfo.order.push(span.type);
      }
    });
    var pos = 0;
    placed.forEach(function (span) {
      if (span.start > pos) body.appendChild(document.createTextNode(rawText.substring(pos, span.start)));
      var mark = document.createElement('span');
      mark.className = 'rv-source-mark';
      mark.setAttribute('data-testid', 'ws-review-source-mark');
      var color = safeCssColor(colorMap[span.type], '#6366F1');
      mark.style.background = color + '33';
      mark.style.borderBottom = '2px solid ' + color;
      mark.style.color = color;
      mark.appendChild(document.createTextNode(span.text));
      var badge = document.createElement('span');
      badge.className = 'rv-source-badge';
      badge.textContent = span.type;
      badge.style.background = color;
      mark.appendChild(badge);
      body.appendChild(mark);
      pos = span.end;
    });
    if (pos < rawText.length) body.appendChild(document.createTextNode(rawText.substring(pos)));

    card.appendChild(body);
    return card;
  }
  function renderReviewerWorkspace() {
    var preview = document.getElementById('annotationPreview');
    if (!preview) return;
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    reviewRowDecisions = {};
    reviewRowOriginals = {};

    var submission =
      window.LabelSuiteAnnotationWorkspaceData.getSubmission(currentProfile.id, 'annotator', currentRunType, currentSampleId) || {};
    var rawRecord = findRecordById(currentSampleId) || {};

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

    /* Entity and relation tasks additionally restore the legacy 原始文本
       card on top: entity tasks show every annotated result inline (union
       across annotators), relation-only tasks show the record's evidence-
       entity highlights instead (FR-014L). */
    if (state.selectedOutputTypes.indexOf('entity_recognition') >= 0 ||
        state.selectedOutputTypes.indexOf('relation_identification') >= 0) {
      preview.appendChild(buildReviewerSourceTextCard(rawRecord));
    }

    state.selectedOutputTypes.forEach(function (outKey) {
      preview.appendChild(buildReviewRow(outKey, submission));
    });
  }

  /* FR-014D: submit is blocked until every annotator row of every output
     type has an explicit approve/reject decision -- validation runs
     BEFORE any history/state mutation so a failed submit leaves
     #wsReviewHistory untouched (still hidden if it was hidden before). */
  function handleReviewSubmit() {
    var history = document.getElementById('wsReviewHistory');
    if (!history) return;

    var rowsByOutKey = {};
    var allDecided = true;
    var currentRejectedSomewhere = false;
    state.selectedOutputTypes.forEach(function (outKey) {
      var rows = getReviewerRows(outKey);
      rowsByOutKey[outKey] = rows;
      rows.forEach(function (row) {
        var decision = reviewRowDecisions[decisionKey(outKey, row.name)];
        if (!decision) allDecided = false;
        if (row.name === 'current' && decision === 'reject') currentRejectedSomewhere = true;
      });
    });
    if (!allDecided) {
      showToast(t('toastSelectDecision'));
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

    var entry = document.createElement('div');
    entry.style.cssText = 'font-size:12px;white-space:pre-line;padding:6px 0;border-top:1px solid var(--color-border);';
    entry.textContent = decisionLines.concat(correctionLines).join('\n');
    history.appendChild(entry);
    history.classList.remove('hidden');

    var summary = buildHistorySummary() + '\n' + decisionLines.join('\n');
    window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      currentProfile.id,
      currentRole,
      currentRunType,
      currentSampleId,
      collectAnswerPayload(),
      summary
    );
    if (currentRejectedSomewhere) {
      window.LabelSuiteAnnotationWorkspaceData.markSampleRejected(currentProfile.id, 'annotator', currentRunType, currentSampleId, summary);
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
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        var idx = currentSampleIndex();
        if (idx <= 0) return;
        var record = currentProfile.datasetRecords[idx - 1];
        selectSample(window.LabelSuiteAnnotationWorkspaceData.getRecordId(record, idx - 1));
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        var idx = currentSampleIndex();
        if (idx >= currentProfile.datasetRecords.length - 1) return;
        var record = currentProfile.datasetRecords[idx + 1];
        selectSample(window.LabelSuiteAnnotationWorkspaceData.getRecordId(record, idx + 1));
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
  function setupGuidelineModal() {
    var modal = document.getElementById('wsGuidelineModal');
    var confirmBtn = document.getElementById('wsGuidelineModalConfirm');
    if (!modal || !confirmBtn) return;
    var seen = null;
    try {
      seen = window.localStorage.getItem('labelsuite.guidelineModalSeen');
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
        window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
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
    } else {
      if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
      if (saveBtn) saveBtn.addEventListener('click', handleSave);
    }

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

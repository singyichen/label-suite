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
      guidelineModalTitle: '請先閱讀任務說明',
      guidelineModalConfirm: '我已閱讀，開始標記',
      guidelineSummaryTitle: '任務說明',
      mobileDrawerTitle: '說明與檔案',
      guidelineImageModalCloseAria: '關閉圖片預覽',
      wsSubmitIncomplete: '請完成所有標記項目後再提交',
      wsSubmitSuccess: '已提交',
      reviewSubmitLabel: '提交審查',
      reviewApproveLabel: '通過',
      reviewRejectLabel: '退回',
      wsReviewSubmitSuccess: '審查已提交',
      reviewLabelDistribution: '標籤分布',
      reviewMeanStd: '平均值／標準差',
      reviewEntityDiff: '實體差異（提交／資料集）',
      reviewTripleList: '關係清單',
      reviewTextComparison: '文字比對（提交／資料集）',
      reviewNoAnswer: '（無）',
    },
    en: {
      sampleListTitle: 'Samples',
      noteLabel: 'Notes (optional)',
      notePlaceholder: 'Describe special cases here...',
      submitLabel: 'Submit',
      guidelineModalTitle: 'Please read the task guideline first',
      guidelineModalConfirm: "I've read it, start annotating",
      guidelineSummaryTitle: 'Task Guideline',
      mobileDrawerTitle: 'Guidelines & Files',
      guidelineImageModalCloseAria: 'Close image preview',
      wsSubmitIncomplete: 'Please answer every output before submitting',
      wsSubmitSuccess: 'Submitted',
      reviewSubmitLabel: 'Submit Review',
      reviewApproveLabel: 'Approve',
      reviewRejectLabel: 'Reject',
      wsReviewSubmitSuccess: 'Review submitted',
      reviewLabelDistribution: 'Label distribution',
      reviewMeanStd: 'Mean / Std',
      reviewEntityDiff: 'Entity diff (submitted / dataset)',
      reviewTripleList: 'Relation list',
      reviewTextComparison: 'Text comparison (submitted / dataset)',
      reviewNoAnswer: '(none)',
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
       with z-index:40 and can overlay whatever renders after it in the
       same container (the bypass control included), since the engine
       deliberately keeps the dialog open across node picks. Lift the
       bypass control's own stacking context above it so it always stays
       clickable regardless of dialog open/closed state. */
    var wrap = chip.parentElement;
    if (wrap) {
      wrap.style.position = 'relative';
      wrap.style.zIndex = '41';
    }
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
    /* A dataset-seeded value (013 FR-003g-5, engine's own renderSingleDimPreview
       ps._seeded) is a valid, already-touched preannotation -- editable and
       directly submittable -- not the untouched/dash placeholder state.
       Exception: clearOutputPreviewState() (task-config.engine.js) also
       stamps _seeded:true on the bypass-cleared midpoint placeholder as a
       seed-proof marker (so re-seeding from the dataset stays blocked while
       bypassed) -- that is NOT a real value, so bypass wins over _seeded. */
    if (!state.previewBypass.single_dim && (ps._touched || ps._seeded)) {
      slider.dataset.valueSet = 'true';
    } else {
      slider.dataset.valueSet = 'false';
      if (valueEl) valueEl.textContent = '—';
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
     touched so untouched ones can display '—' instead of the engine's
     always-numeric default. */
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
      } else if (valueEl) {
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
      var color = label.color || '#6366F1';
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
    var s = ent.text || '?';
    if (ent.start != null && ent.end != null) s += ' (' + ent.start + ',' + ent.end + ')';
    return s;
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

  /* Replaces buildRelationStateMachine()'s own click/passage-selection flow
     with a <select>-driven E1/relation/E2 builder (annotator-facing target
     UI, spec 015 v2.0.0). state.previewEntities/previewTriples stay the
     single source of truth either way, so cross-sample persistence keeps
     working for free via the existing snapshotCurrentSample()/restoreSample()
     deep-clone mechanism. */
  function buildRiSelectBuilder(container, relationTypes, disabled) {
    var wrap = document.createElement('div');
    wrap.className = 'ri-builder';
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;';

    function fillEntityOptions(select) {
      var blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '';
      select.appendChild(blank);
      state.previewEntities.forEach(function (ent, i) {
        var opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = ent.text;
        select.appendChild(opt);
      });
      select.disabled = disabled;
    }
    var e1Select = document.createElement('select');
    e1Select.setAttribute('data-testid', 'ws-ri-e1-select');
    fillEntityOptions(e1Select);
    var relSelect = document.createElement('select');
    relSelect.setAttribute('data-testid', 'ws-ri-relation-select');
    var relBlank = document.createElement('option');
    relBlank.value = '';
    relBlank.textContent = '';
    relSelect.appendChild(relBlank);
    getRelationTypeOptions(relationTypes).forEach(function (rt) {
      var opt = document.createElement('option');
      opt.value = rt;
      opt.textContent = rt;
      relSelect.appendChild(opt);
    });
    relSelect.disabled = disabled;
    var e2Select = document.createElement('select');
    e2Select.setAttribute('data-testid', 'ws-ri-e2-select');
    fillEntityOptions(e2Select);

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.setAttribute('data-testid', 'ws-ri-add-btn');
    addBtn.textContent = state.lang === 'zh' ? '新增' : 'Add';
    addBtn.disabled = disabled;
    addBtn.addEventListener('click', function () {
      var e1 = state.previewEntities[Number(e1Select.value)];
      var e2 = state.previewEntities[Number(e2Select.value)];
      var relType = relSelect.value;
      if (!e1 || !e2 || !relType) return;
      state.previewTriples.push({ subj: e1.text, rel: relType, obj: e2.text, relType: relType });
      renderAbsaUnifiedPreview_refresh(container);
    });

    var undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.setAttribute('data-testid', 'ws-ri-undo-btn');
    undoBtn.textContent = state.lang === 'zh' ? '復原' : 'Undo';
    undoBtn.setAttribute('aria-label', state.lang === 'zh' ? '撤銷' : 'Undo');
    undoBtn.disabled = disabled;
    undoBtn.addEventListener('click', function () {
      state.previewTriples.pop();
      renderAbsaUnifiedPreview_refresh(container);
    });

    wrap.appendChild(e1Select);
    wrap.appendChild(relSelect);
    wrap.appendChild(e2Select);
    wrap.appendChild(addBtn);
    wrap.appendChild(undoBtn);
    return wrap;
  }

  /* Replaces buildRelationStateMachine()'s native builder DOM (everything in
     relSection ahead of its own triple-list title) with the select-based
     builder above; tags each rendered triple row for the annotator-facing
     testid contract. */
  function patchRelationSection(container, relSection, relationTypes, disabled) {
    var relList = relSection.querySelector('.absa-relation-list');
    var tlTitle = relList ? relList.previousElementSibling : null;
    if (tlTitle) {
      var node = relSection.firstChild;
      while (node && node !== tlTitle) {
        var next = node.nextSibling;
        relSection.removeChild(node);
        node = next;
      }
      relSection.insertBefore(buildRiSelectBuilder(container, relationTypes, disabled), tlTitle);
    }
    if (relList) {
      Array.prototype.forEach.call(relList.children, function (row) {
        if (row.classList && row.classList.contains('absa-relation-row')) {
          row.setAttribute('data-testid', 'ws-ri-triple-item');
        }
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
    var relCfg = state.outputConfigs.relation_identification || {};
    var relationTypes = Array.isArray(relCfg.relation_types) ? relCfg.relation_types.filter(Boolean) : [];
    var disabled = !!(
      (hasSpanOut && state.previewBypass.entity_recognition) ||
      (hasRelOut && state.previewBypass.relation_identification)
    );

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

    if (relSection && hasRelOut) patchRelationSection(container, relSection, relationTypes, disabled);

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
  var currentRunType = 'official_run';
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
    /* FR-014C: the review card title uses the actual task name, same as the
       annotator workspace -- both roles share this single call. */
    setText('wsCardTitle', state.lang === 'zh' ? currentProfile.nameZh : currentProfile.nameEn);
    if (currentRole === 'reviewer') {
      renderReviewerWorkspace();
    } else {
      updateAnnotationPreview();
      patchEvidenceAndInputContent();
      patchItemPairLayout();
    }
    renderSampleList();
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
    snapshotCurrentSample();
    currentSampleId = window.LabelSuiteAnnotationWorkspaceData.getRecordId(record, recordIdx);
    state.datasetRawFirstRow = buildAnnotatorRecord(record, currentProfile);
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
      var submitted = window.LabelSuiteAnnotationWorkspaceData.isSampleSubmitted(
        currentProfile.id,
        currentRole,
        currentRunType,
        recordId
      );
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'sample-item' + (recordId === String(currentSampleId) ? ' active' : '');
      if (submitted) item.classList.add('status-submitted');
      item.setAttribute('data-testid', 'ws-sample-item');
      item.setAttribute('data-submitted', submitted ? 'true' : 'false');

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
      item.appendChild(meta);

      item.addEventListener('click', function () {
        selectSample(recordId);
      });
      listEl.appendChild(item);
    });
  }

  /* ── submit ───────────────────────────────────────────────────────── */
  function isOutputAnswered(outKey) {
    if (state.previewBypass[outKey]) return true;
    var ps = state.previewState[outKey];
    switch (outKey) {
      case 'single_label':
        return !!(ps && ps.selected);
      case 'single_dim':
        return !!(ps && (ps._touched || ps._seeded));
      case 'free_text':
        return !!(ps && ps.text && ps.text.trim().length > 0);
      default:
        /* Phase 2 output types: treated as answered until their own
           validation lands, so Phase 1 submit-blocking stays scoped to
           the output types Phase 1 actually renders. */
        return true;
    }
  }

  function clearAllPanelErrors() {
    state.selectedOutputTypes.forEach(function (outKey) {
      var panel = document.querySelector('[data-testid="ws-output-panel-' + outKey + '"]');
      if (panel) panel.removeAttribute('data-error');
    });
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
    window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(currentProfile.id, currentRole, currentRunType, currentSampleId, {
      previewState: deepClone(state.previewState),
      previewEntities: deepClone(state.previewEntities),
      previewTriples: deepClone(state.previewTriples),
      previewBypass: deepClone(state.previewBypass),
    });
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

  /* FR-024L: registry-driven review presentation per output-type category
     (not per task_id) -- label distribution / mean-std / entity diff /
     triple list / text comparison. */
  function buildReviewSummaryText(outKey, submission, rawRecord) {
    var submittedText = describeOutputAnswer(outKey, submission);
    var na = t('reviewNoAnswer');
    switch (outKey) {
      case 'single_label':
      case 'multi_label':
      case 'sequence_tagging':
        return t('reviewLabelDistribution') + '：' + (submittedText || na);
      case 'single_dim':
      case 'multi_dim':
        return t('reviewMeanStd') + '：' + (submittedText || na) + ' / 0';
      case 'entity_recognition': {
        var goldEntities = findRawOutputValue(outKey, rawRecord) || [];
        var goldText = goldEntities.map(function (e) { return e.text; }).join(', ');
        return t('reviewEntityDiff') + '：' + (submittedText || na) + ' / ' + (goldText || na);
      }
      case 'relation_identification':
        return t('reviewTripleList') + '：\n' + (submittedText || na);
      case 'free_text': {
        var goldValue = findRawOutputValue(outKey, rawRecord);
        return t('reviewTextComparison') + '：' + (submittedText || na) + ' / ' + (goldValue || na);
      }
      default:
        return '';
    }
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
    var colorHex = color === 'red' ? '#ef4444' : color === 'blue' ? '#3b82f6' : '#22c55e';
    var tag = document.createElement('span');
    tag.setAttribute('data-testid', 'ws-review-result-tag-' + outKey);
    tag.textContent = color;
    tag.style.cssText =
      'display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;color:#fff;background:' +
      colorHex +
      ';';
    return tag;
  }

  /* FR-014B: pass/reject toggle -- clicking the already-active decision
     cancels it back to undecided. */
  function buildDecisionButtons(outKey) {
    var wrap = document.createElement('div');
    wrap.className = 'review-row-decisions';

    var approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'btn btn-outline';
    approveBtn.setAttribute('data-testid', 'ws-review-decision-approve');
    approveBtn.textContent = t('reviewApproveLabel');

    var rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'btn btn-outline';
    rejectBtn.setAttribute('data-testid', 'ws-review-decision-reject');
    rejectBtn.textContent = t('reviewRejectLabel');

    function refresh() {
      var decision = reviewRowDecisions[outKey];
      approveBtn.setAttribute('aria-pressed', decision === 'approve' ? 'true' : 'false');
      rejectBtn.setAttribute('aria-pressed', decision === 'reject' ? 'true' : 'false');
    }
    approveBtn.addEventListener('click', function () {
      reviewRowDecisions[outKey] = reviewRowDecisions[outKey] === 'approve' ? null : 'approve';
      refresh();
    });
    rejectBtn.addEventListener('click', function () {
      reviewRowDecisions[outKey] = reviewRowDecisions[outKey] === 'reject' ? null : 'reject';
      refresh();
    });
    refresh();

    wrap.appendChild(approveBtn);
    wrap.appendChild(rejectBtn);
    return wrap;
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

  function buildReviewRow(outKey, submission, rawRecord) {
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

    var summary = document.createElement('div');
    summary.style.cssText = 'font-size:13px;color:var(--color-ink-muted);margin-bottom:10px;white-space:pre-line;';
    if (outKey === 'relation_identification') summary.style.fontFamily = 'var(--font-mono, monospace)';
    summary.textContent = buildReviewSummaryText(outKey, submission, rawRecord);
    row.appendChild(summary);

    reviewRowOriginals[outKey] = describeOutputAnswer(outKey, submission);
    seedReviewState(outKey, submission);

    var correction = document.createElement('div');
    correction.setAttribute('data-testid', 'ws-review-correct-' + outKey);
    var panelMount = document.createElement('div');
    correction.appendChild(panelMount);
    renderOutputPreview(panelMount, outKey);
    row.appendChild(correction);

    row.appendChild(buildDecisionButtons(outKey));

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

    state.selectedOutputTypes.forEach(function (outKey) {
      preview.appendChild(buildReviewRow(outKey, submission, rawRecord));
    });
  }

  function handleReviewSubmit() {
    var history = document.getElementById('wsReviewHistory');
    if (!history) return;
    var lines = state.selectedOutputTypes.map(function (outKey) {
      var corrected = describeOutputAnswer(outKey, {
        previewState: state.previewState,
        previewEntities: state.previewEntities,
        previewTriples: state.previewTriples,
      });
      var original = reviewRowOriginals[outKey] || '';
      var decision = reviewRowDecisions[outKey] || 'pending';
      return outKey + ' [' + decision + ']: ' + original + ' -> ' + corrected;
    });
    var entry = document.createElement('div');
    entry.style.cssText = 'font-size:12px;white-space:pre-line;padding:6px 0;border-top:1px solid var(--color-border);';
    entry.textContent = lines.join('\n');
    history.appendChild(entry);
    history.classList.remove('hidden');

    window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(currentProfile.id, currentRole, currentRunType, currentSampleId, {
      previewState: deepClone(state.previewState),
      previewEntities: deepClone(state.previewEntities),
      previewTriples: deepClone(state.previewTriples),
      previewBypass: deepClone(state.previewBypass),
    });
    renderSampleList();
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
  function renderGuidelineFileList(container, files, taggedForTest) {
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    files.forEach(function (file) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'guideline-file-item';
      if (taggedForTest) item.setAttribute('data-testid', 'ws-guideline-file-item');
      item.textContent = file.name;
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
  function setupMobileDrawer() {
    var drawer = document.getElementById('wsMobileDrawer');
    var handle = document.getElementById('wsMobileDrawerHandle');
    if (!drawer || !handle) return;
    function toggle() {
      var open = drawer.classList.toggle('open');
      handle.setAttribute('aria-expanded', String(open));
    }
    handle.addEventListener('click', toggle);
    handle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  }

  /* ── guideline modal ──────────────────────────────────────────────── */
  function setupGuidelineModal() {
    var modal = document.getElementById('wsGuidelineModal');
    var confirmBtn = document.getElementById('wsGuidelineModalConfirm');
    if (!modal || !confirmBtn) return;
    var seen = window.localStorage.getItem('labelsuite.guidelineModalSeen');
    if (!seen) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
    confirmBtn.addEventListener('click', function () {
      window.localStorage.setItem('labelsuite.guidelineModalSeen', '1');
      modal.classList.add('hidden');
    });
  }

  /* ── UI-chrome language toggle (spec 015 v2.0.0 -- workspace-local,
     separate from the shared sidebar's own lang-toggle: the sidebar chrome
     and this workspace's translated labels/aria-labels are two independent
     concerns). Reuses the SAME localStorage key the shared sidebar already
     writes (pages/shared/sidebar.js LANG_STORAGE_KEY) so a language choice
     made anywhere in the app is honored on the next workspace load, without
     requiring a live cross-page sync mechanism this prototype doesn't have. */
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
    }
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
    var langLabel = document.getElementById('wsLangLabel');
    if (langLabel) langLabel.textContent = state.lang === 'zh' ? 'ZH' : 'EN';
  }
  function setupLangToggle() {
    var toggle = document.getElementById('wsLangToggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      state.lang = state.lang === 'zh' ? 'en' : 'zh';
      persistLang(state.lang);
      applyDocumentLang();
      applyStaticI18nText();
      renderWorkspace();
    });
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function boot() {
    var params = new URLSearchParams(window.location.search);
    var taskId = params.get('task_id');
    var sampleId = params.get('sample_id');
    currentRole = params.get('role') || 'annotator';
    currentRunType = params.get('run_type') || 'official_run';

    currentProfile = window.LabelSuiteAnnotationWorkspaceData.resolveTaskProfile(taskId);
    if (!currentProfile) {
      window.location.href = 'annotation-list.html' + window.location.search;
      return;
    }

    state.lang = readStoredLang();
    applyDocumentLang();
    applyStaticI18nText();

    var submitBtn = document.getElementById('wsSubmitBtn');
    var reviewSubmitBtn = document.getElementById('wsReviewSubmitBtn');
    if (currentRole === 'reviewer') {
      if (submitBtn) submitBtn.classList.add('hidden');
      if (reviewSubmitBtn) {
        reviewSubmitBtn.classList.remove('hidden');
        reviewSubmitBtn.addEventListener('click', handleReviewSubmit);
      }
    } else if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
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
    setupMobileDrawer();
    setupGuidelineModal();
    setupLangToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

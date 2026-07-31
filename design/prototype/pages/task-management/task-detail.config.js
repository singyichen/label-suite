/* task-detail.config.js
 * Host-page glue between task-detail.html and the shared task-config engine
 * (task-config.data.js / .yaml.js / .dataset.js / .engine.js). Implements the
 * engine's required-globals contract and seeds the engine's Step 1/Step 2
 * state from the current task's profile (LabelSuiteTaskDetailData) whenever
 * the 基本資料 / 標記設定 edit surfaces are opened.
 *
 * Loaded after task-config.engine.js and before task-detail.html's own
 * inline <script>. That inline script defines `state`, `TASK_DATA`,
 * `showToast`, `trackEvent`, `isOverviewEditable`, `isSettingsEditable`,
 * `renderOverview`, etc. All cross-references below only run inside event
 * handlers / init(), i.e. after every script has finished loading, so the
 * load order between this file and the inline script does not matter — only
 * invocation order does.
 */

/* ── Legacy task-type key resolution (DOM-free) ────────────────
   Replicates task-config.engine.js's deriveTaskType() registryKey lookup
   without touching global `state` or the DOM, so TASK_DATA.taskTypeKey can
   be computed at resetTaskData() time — before the overview panel partial
   (and its chip containers) has been fetched into the page. Legacy,
   out-of-scope machinery (SAMPLING_DEFAULTS_BY_TYPE, export/results
   labeling) still keys off this single-registryKey value. */
function resolveLegacyTaskTypeKey(taskCategories, taskInputTypes, taskOutputTypes) {
  var cats = taskCategories || [];
  var inputs = taskInputTypes || [];
  var outputs = taskOutputTypes || [];
  if (!cats.length || !outputs.length) return '';
  var keys = {};
  Object.keys(TASK_TAXONOMY).forEach(function(catKey) {
    if (cats.indexOf(catKey) < 0) return;
    var catDef = TASK_TAXONOMY[catKey];
    Object.keys(catDef.granularities).forEach(function(granKey) {
      if (inputs.length && inputs.indexOf(granKey) < 0) return;
      var granDef = catDef.granularities[granKey];
      Object.keys(granDef.subtypes).forEach(function(subKey) {
        if (outputs.length && outputs.indexOf(subKey) < 0) return;
        var rk = granDef.subtypes[subKey].registryKey;
        if (rk) keys[rk] = true;
      });
    });
  });
  var resolved = Object.keys(keys);
  return resolved.length ? resolved[0] : '';
}

/* ── Required-globals shims for task-config.engine.js ─────────── */
function el(id) { return document.getElementById(id); }

function showFieldError(errId, show, msg) {
  var node = el(errId);
  if (!node) return;
  if (show) {
    node.textContent = msg || '';
    node.classList.add('show');
  } else {
    node.classList.remove('show');
  }
}

function markDirty() {
  if (state.overviewEditMode) state.overviewDirty = true;
  if (state.settingsEditMode) state.settingsDirty = true;
}

/* task-detail has no step wizard; the engine still calls this after every
   field change to refresh a "next" button's disabled state. No-op here. */
function revalidateCurrentStep() {}

function track(event, extra) {
  trackEvent(event, extra);
}

/* Mirrors task-new's own mock estimate (no live sampling wizard on this page). */
function getDatasetTotalEstimate() {
  return 10000;
}

/* ── Flat chip: called after any chip toggle (interactive edits only) ── */
function onChipSelectionChange() {
  state.codeDraftDirty = false;
  rebuildOutputChips();
  deriveTaskType();
  /* ADR-029: initialize outputConfigs for each selected output type */
  state.selectedOutputTypes.forEach(function(outKey) {
    if (!state.outputConfigs[outKey]) {
      state.outputConfigs[outKey] = getOutputTypeDefaultConfig(outKey, state.lang);
    }
  });
  /* Remove outputConfigs entries for deselected output types */
  Object.keys(state.outputConfigs).forEach(function(k) {
    if (state.selectedOutputTypes.indexOf(k) < 0) delete state.outputConfigs[k];
  });
  /* Drop bypass flags of deselected output types so a later reselect
     does not come back pre-bypassed with a cleared preview */
  Object.keys(state.previewBypass).forEach(function(k) {
    if (state.selectedOutputTypes.indexOf(k) < 0) {
      delete state.previewBypass[k];
      resetOutputPreviewState(k);
    }
  });
  state.relSel = null;
  state.relMsg = '';
  Object.keys(state.previewState).forEach(function(k) {
    if (state.previewState[k] && state.previewState[k].pendingSelection) state.previewState[k].pendingSelection = null;
  });
  renderTemplateBtns();
  renderSchemaFields();
  markDirty();
  revalidateCurrentStep();
}

/* ── Dataset seeding: synchronously replay processFileQueue()'s single-file
   success branch against a profile's already-parsed datasetRecords, so the
   Step 1 dataset + field-role table render pre-filled without a real upload. */
function seedDatasetFromProfile(profile) {
  var records = Array.isArray(profile.datasetRecords) ? profile.datasetRecords : [];
  state._datasetRoots = [records];
  state.datasetFiles = [];
  state.fieldRoleMap = {};
  state._roleMapBySource = {};
  var candidates = collectRecordCandidates(records);
  state.datasetCandidates = candidates;
  state.datasetRecordPath = candidates.length ? candidates[0].path : '$';
  analyzeDataset();
  /* Apply the profile's known field-role mapping after analysis, since
     analyzeDataset() only prunes stale roles — it never assigns new ones. */
  state.fieldRoleMap = Object.assign({}, profile.fieldRoleMap || {});
  state.datasetFiles.push({
    name: profile.datasetFileName || 'dataset.json',
    size: JSON.stringify(records).length,
  });
  state._datasetVersion = (state._datasetVersion || 0) + 1;
  state.previewInited = false;
  state.previewEntities = [];
  state.previewTriples = [];
  state.activeEntityType = null;
}

/* Replace whatever dataset is currently loaded (seeded or previously
   uploaded) with a freshly selected/dropped file list. Editing the dataset
   in 基本資料 always starts a new upload session rather than merging with
   the previous one, since a differently-shaped dataset is expected. */
function replaceDatasetFiles(fileList) {
  state._datasetRoots = [];
  state.datasetFiles = [];
  state.datasetCandidates = [];
  state.fieldRoleMap = {};
  state._roleMapBySource = {};
  addDatasetFiles(fileList);
}

/* ── Profile seeding orchestrator ──────────────────────────────
   Seeds the engine's chip/output-config/dataset state from TASK_DATA (the
   mutable, currently-active task record — see resetTaskData() in
   task-detail.html). Idempotent per taskId so switching between the
   basic-info and settings edit forms without saving does not clobber
   in-progress chip/config edits; startOverviewEdit()/startSettingsEdit()
   call this unconditionally, and cancelOverviewEdit()/cancelSettingsEdit()
   clear the guard so the next edit-open reseeds from the saved TASK_DATA. */
function ensureTaskConfigSeeded() {
  if (state._configSeededForTaskId === TASK_DATA.taskId) return;
  state.taskCategories = (TASK_DATA.taskCategories || []).slice();
  state.taskInputTypes = (TASK_DATA.taskInputTypes || []).slice();
  state.taskOutputTypes = (TASK_DATA.outputs || []).map(function(o) { return o.type; });
  initTaskTypeChips();
  /* buildChips() renders every chip unchecked (task-new starts blank);
     reflect the seeded selection into the chip DOM. */
  syncChipsFromState();
  deriveTaskType();
  state.outputConfigs = {};
  (TASK_DATA.outputs || []).forEach(function(out) {
    state.outputConfigs[out.type] = normalizeOutputConfig(out.type, out.config || {}, state.lang);
  });
  seedDatasetFromProfile({
    datasetRecords: TASK_DATA.datasetRecords,
    datasetFileName: TASK_DATA.datasetFileName,
    fieldRoleMap: TASK_DATA.fieldRoleMap,
  });
  state._configSeededForTaskId = TASK_DATA.taskId;
}

function resetTaskConfigSeedGuard() {
  state._configSeededForTaskId = null;
}

/* ── Generic (config-driven) output-config summary for the 標記設定 view ──
   Reads OUTPUT_TYPE_REGISTRY field definitions instead of any per-type
   branch, so a newly registered output type needs no changes here
   (constitution: Generalization-First). */
function getOutputTypeDisplayLabel(outKey) {
  var outReg = OUTPUT_TYPE_REGISTRY[outKey];
  if (!outReg) return outKey;
  return state.lang === 'en' ? outReg.en : outReg.zh;
}

function summarizeOutputConfigForDisplay(outKey, config) {
  var outReg = OUTPUT_TYPE_REGISTRY[outKey];
  if (!outReg || !Array.isArray(outReg.fields)) return '';
  var parts = [];
  outReg.fields.forEach(function(field) {
    if (field.key === 'allow_bypass') return;
    var value = getOutputConfigFieldValue(config, field);
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (!value.length) return;
      parts.push(value.map(function(item) {
        if (item && typeof item === 'object') return item.name || item.label || JSON.stringify(item);
        return String(item);
      }).join(', '));
    } else if (typeof value === 'object') {
      parts.push(JSON.stringify(value));
    } else {
      parts.push(String(value));
    }
  });
  return parts.join(' · ');
}

/* ── Event bindings for the Step 1 / Step 2 parity surfaces ────
   Called once from task-detail.html's init(), after the overview panel
   partial has been fetched into the DOM (see loadAllTabPanels()). */
function bindTaskConfigEvents() {
  el('datasetUploadZone').addEventListener('click', function() { el('datasetFileInput').click(); });
  el('datasetUploadZone').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el('datasetFileInput').click(); }
  });
  el('datasetUploadZone').addEventListener('dragover', function(e) { e.preventDefault(); el('datasetUploadZone').classList.add('dragover'); });
  el('datasetUploadZone').addEventListener('dragleave', function() { el('datasetUploadZone').classList.remove('dragover'); });
  el('datasetUploadZone').addEventListener('drop', function(e) {
    e.preventDefault();
    el('datasetUploadZone').classList.remove('dragover');
    if (e.dataTransfer.files.length) replaceDatasetFiles(e.dataTransfer.files);
  });
  el('datasetFileInput').addEventListener('change', function() {
    if (this.files.length) replaceDatasetFiles(this.files);
    this.value = '';
  });
  /* #datasetPreviewCloseBtn / #datasetPreviewModal close-on-backdrop-click
     bindings are already wired in task-detail.html's own init(). */

  el('taxonomyDeleteCancelBtn').addEventListener('click', hideTaxonomyDeleteModal);
  el('taxonomyDeleteConfirmBtn').addEventListener('click', function() {
    var cb = state.taxonomyDeleteCallback;
    hideTaxonomyDeleteModal();
    if (cb) cb();
  });
  el('taxonomyDeleteModal').addEventListener('click', function(e) {
    if (e.target === el('taxonomyDeleteModal')) hideTaxonomyDeleteModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && el('taxonomyDeleteModal').classList.contains('show')) hideTaxonomyDeleteModal();
  });

  el('uploadConfigBtn').addEventListener('click', function() { el('configFileInput').click(); });
  el('configFileInput').addEventListener('change', function() {
    if (this.files && this.files[0]) loadConfigFile(this.files[0]);
    this.value = '';
  });
  /* #formatYamlBtn / #formatJsonBtn call setCodeFormat() via inline onclick
     in overview.html's markup, matching task-new.html's pattern. */
  el('codeEditor').addEventListener('input', function() {
    state.codeDraftDirty = true;
    el('saveCodeBtn').disabled = false;
    el('codeErrorBar').classList.add('hidden');
  });
  el('saveCodeBtn').addEventListener('click', function() { saveCodeToVisual(true); });
}

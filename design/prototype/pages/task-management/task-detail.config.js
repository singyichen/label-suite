(function (global) {
  'use strict';

  var catalog = global.LabelSuiteTaskConfigCatalog;
  var detailData = global.LabelSuiteTaskDetailData;
  var basicDraft = null;
  var settingsDraft = null;
  var settingsFormat = 'yaml';

  if (!catalog || !detailData) {
    throw new Error('Task detail config runtime requires catalog and detail data.');
  }

  var COPY = {
    zh: {
      categories: '大分類',
      inputType: '輸入類型',
      outputTypes: '輸出類型',
      taskType: '任務類型',
      categoryGroup: '大分類（可多選）',
      inputGroup: '輸入類型（單選）',
      outputGroup: '輸出類型（可多選）',
      fieldRoles: '欄位角色',
      dataset: '資料集',
      notAssigned: '未指定',
      noOutputs: '尚未選擇輸出類型',
      settings: '標記設定',
      annotationPreview: '標記預覽',
      categoryHint: '選擇一或多個任務大分類。',
      inputHint: '輸入類型為單選。',
      outputHint: '輸出選項由大分類、輸入類型與 taxonomy metadata 產生。',
      roleNone: '不使用',
      roleEvidence: 'Evidence（背景）',
      roleInput: 'Input（輸入）',
      roleOutput: 'Output（輸出）',
      previewSourceTextTitle: '原始文本',
      previewSample: '這是一段範例文本，請依目前設定完成標記。',
      previewChoose: '請選擇標記',
      previewResponse: '請輸入回答',
      previewEntity: '請選擇實體類型',
      previewRelation: '請選擇關係類型',
      addItem: '新增項目',
      configError: '設定檔必須包含合法的 input_type 與非空 outputs[]。',
      requiredError: '請完成任務名稱、大分類、輸入類型、輸出類型與 JSON 資料集。',
      settingsRequiredError: '請完成所有必填的輸出設定。',
      inputRoleError: 'Input 欄位數量不符合目前輸入類型。',
      jsonOnlyError: '資料集僅支援 JSON 檔案。',
      removeOutputConfirm: '移除此輸出類型會刪除其設定，是否繼續？',
    },
    en: {
      categories: 'Categories',
      inputType: 'Input type',
      outputTypes: 'Output types',
      taskType: 'Task type',
      categoryGroup: 'Categories (multiple)',
      inputGroup: 'Input type (single)',
      outputGroup: 'Output types (multiple)',
      fieldRoles: 'Field roles',
      dataset: 'Dataset',
      notAssigned: 'Not assigned',
      noOutputs: 'No output type selected',
      settings: 'Label settings',
      annotationPreview: 'Annotation preview',
      categoryHint: 'Select one or more task categories.',
      inputHint: 'The input type is single-select.',
      outputHint: 'Output options come from category, input type, and taxonomy metadata.',
      roleNone: 'Not used',
      roleEvidence: 'Evidence',
      roleInput: 'Input',
      roleOutput: 'Output',
      previewSourceTextTitle: 'Text',
      previewSample: 'This is a sample text. Apply annotations with the current settings.',
      previewChoose: 'Choose labels',
      previewResponse: 'Enter your response',
      previewEntity: 'Choose entity types',
      previewRelation: 'Choose relation types',
      addItem: 'Add item',
      configError: 'The config must contain a valid input_type and a non-empty outputs array.',
      requiredError: 'Complete the task name, categories, input type, output types, and JSON dataset.',
      settingsRequiredError: 'Complete all required output settings.',
      inputRoleError: 'The number of Input fields does not match the selected input type.',
      jsonOnlyError: 'Only JSON dataset files are supported.',
      removeOutputConfirm: 'Removing this output type also removes its config. Continue?',
    },
  };

  function langKey(lang) {
    return lang === 'en' ? 'en' : 'zh';
  }

  function copy(lang, key) {
    return COPY[langKey(lang)][key] || COPY.zh[key] || key;
  }

  function detailOutputLabel(outputKey, lang) {
    var listData = global.LabelSuiteTaskListData;
    var definition = listData && Array.isArray(listData.outputTypes)
      ? listData.outputTypes.find(function (item) {
        return item.key === outputKey;
      })
      : null;
    return definition
      ? (langKey(lang) === 'en' ? definition.en : definition.zh)
      : catalog.getOutputLabel(outputKey, lang);
  }

  function clear(node) {
    if (node) node.innerHTML = '';
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value == null ? '' : String(value);
  }

  function setRequiredText(id, value) {
    var node = document.getElementById(id);
    if (!node) return;
    node.textContent = (value == null ? '' : String(value)) + ' ';
    var required = document.createElement('span');
    required.className = 'required';
    required.textContent = '*';
    node.appendChild(required);
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle('hidden', Boolean(hidden));
  }

  function setInlineError(id, message) {
    var node = document.getElementById(id);
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('show', Boolean(message));
  }

  function roleLabel(role, lang) {
    if (role === 'evidence') return copy(lang, 'roleEvidence');
    if (role === 'input') return copy(lang, 'roleInput');
    if (role === 'output') return copy(lang, 'roleOutput');
    return copy(lang, 'roleNone');
  }

  function compatibilityTaskType(outputs) {
    var keys = (outputs || []).map(function (item) {
      return item.type;
    });
    if (keys.indexOf('relation_identification') >= 0) return 'relation_extraction';
    if (keys.indexOf('sequence_tagging') >= 0 || keys.indexOf('entity_recognition') >= 0) {
      return 'sequence_labeling';
    }
    if (keys.indexOf('single_dim') >= 0 || keys.indexOf('multi_dim') >= 0) {
      return 'single_sentence_va_scoring';
    }
    if (keys.indexOf('single_label') >= 0 || keys.indexOf('multi_label') >= 0) {
      return 'single_sentence_classification';
    }
    return 'sentence_pairs';
  }

  function canonicalConfig(taskConfig) {
    return {
      selected_categories: catalog.clone(taskConfig.selected_categories || []),
      input_type: taskConfig.input_type,
      field_role_map: catalog.clone(taskConfig.field_role_map || {}),
      outputs: catalog.clone(taskConfig.outputs || []),
    };
  }

  function taskConfigFromSeed(seed) {
    return {
      selected_categories: catalog.clone(seed.selectedCategories || []),
      input_type: seed.inputType || 'single_item',
      field_role_map: catalog.clone(seed.fieldRoleMap || {}),
      outputs: catalog.clone(seed.outputs || []),
    };
  }

  function buildRoundState(status) {
    if (status === 'draft') {
      return {
        trialRound: 0,
        currentAgreement: 0,
        currentAnnotators: 0,
        currentStd: 0,
        trialRounds: [],
      };
    }
    var passed = status !== 'dry_run_in_progress';
    return {
      trialRound: 1,
      currentAgreement: passed ? 0.84 : 0.62,
      currentAnnotators: 3,
      currentStd: passed ? 0.06 : 0.18,
      trialRounds: [
        {
          round: 1,
          sampleCount: 3,
          agreement: passed ? 0.84 : 0.62,
          annotators: 3,
          std: passed ? 0.06 : 0.18,
          result: passed ? 'passed' : 'failed',
          usedSamples: 3,
          date: '2026-07-29',
          noteZh: passed ? '示例回合已達標。' : '示例回合仍需調整。',
          noteEn: passed ? 'The illustrative round passed.' : 'The illustrative round needs refinement.',
        },
      ],
    };
  }

  function applyTaskSeed(taskData, taskId) {
    var seed = detailData.getTask(taskId);
    if (!seed) return false;

    var taskConfig = taskConfigFromSeed(seed);
    var roundState = buildRoundState(seed.status);
    taskData.taskId = seed.id;
    taskData.taskNameZh = seed.nameZh;
    taskData.taskNameEn = seed.nameEn;
    taskData.taskTypeKey = compatibilityTaskType(taskConfig.outputs);
    taskData.taskConfig = taskConfig;
    taskData.datasetTotal = Number(seed.dataset.total) || 0;
    taskData.datasetSourceZh = (seed.dataset.files || []).map(function (file) {
      return file.name;
    }).join(' + ');
    taskData.datasetSourceEn = taskData.datasetSourceZh;
    taskData.datasetSizeBytes = (seed.dataset.files || []).reduce(function (sum, file) {
      return sum + (Number(file.size) || 0);
    }, 0);
    taskData.datasetFiles = (seed.dataset.files || []).map(function (file) {
      return { name: file.name, sizeBytes: Number(file.size) || 0 };
    });
    taskData.datasetColumns = catalog.clone(seed.dataset.columns || []);
    taskData.sourceFile = seed.sourceFile;
    taskData.status = seed.status;
    taskData.updatedAt = seed.updatedAt;
    taskData.configFileName = seed.sourceFile.replace(/\.json$/i, '') + '.config.json';
    taskData.configVersion = '';
    taskData.configContent = JSON.stringify({
      input_type: taskConfig.input_type,
      outputs: taskConfig.outputs,
    }, null, 2);
    taskData.guidelineUploaded = false;
    taskData.guidelineTextZh = '';
    taskData.guidelineTextEn = '';
    taskData.guidelineText = '';
    taskData.guidelineFiles = [];
    taskData.forceGuideline = false;
    Object.keys(roundState).forEach(function (key) {
      taskData[key] = roundState[key];
    });
    return true;
  }

  function isManaged(taskData) {
    return Boolean(
      taskData
      && taskData.taskConfig
      && Array.isArray(taskData.taskConfig.outputs),
    );
  }

  function createTag(label, testId, dataName, dataValue) {
    var tag = document.createElement('span');
    tag.className = 'task-config-tag';
    tag.textContent = label;
    if (testId) tag.setAttribute('data-testid', testId);
    if (dataName) tag.setAttribute(dataName, dataValue);
    return tag;
  }

  function renderTagList(containerId, items) {
    var container = document.getElementById(containerId);
    if (!container) return;
    clear(container);
    items.forEach(function (item) {
      container.appendChild(createTag(
        item.label,
        item.testId,
        item.dataName,
        item.dataValue,
      ));
    });
  }

  function renderFieldRoleSummary(taskConfig, lang) {
    var container = document.getElementById('fieldRoleSummaryRows');
    if (!container) return;
    clear(container);

    Object.keys(taskConfig.field_role_map || {}).forEach(function (field) {
      var wrapper = document.createElement('div');
      wrapper.className = 'kv-dl-row';
      wrapper.setAttribute('data-testid', 'field-role-summary-row');

      var row = document.createElement('div');
      row.className = 'task-config-field-role-row';
      row.setAttribute('data-field-key', field);
      row.setAttribute('data-field-role', taskConfig.field_role_map[field]);

      var name = document.createElement('span');
      name.className = 'task-config-field-name';
      name.textContent = field;
      var badge = document.createElement('span');
      badge.className = 'task-config-field-role-badge';
      badge.textContent = roleLabel(taskConfig.field_role_map[field], lang);
      row.appendChild(name);
      row.appendChild(badge);
      wrapper.appendChild(row);
      container.appendChild(wrapper);
    });
  }

  function fieldValue(config, field) {
    var value = config[field.key];
    if (field.valueKey) {
      return value && typeof value === 'object' ? value[field.valueKey] : undefined;
    }
    return value;
  }

  function flattenTaxonomy(nodes, result) {
    (nodes || []).forEach(function (node) {
      if (!node || typeof node !== 'object') return;
      if (node.name) result.push(String(node.name));
      flattenTaxonomy(node.children, result);
    });
  }

  function summarizeValue(value, field, lang) {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'boolean') {
      return langKey(lang) === 'en' ? (value ? 'Yes' : 'No') : (value ? '是' : '否');
    }
    if (field && field.type === 'taxonomy-tree') {
      var labels = [];
      flattenTaxonomy(value, labels);
      return labels.length ? labels.join(', ') : '—';
    }
    if (Array.isArray(value)) {
      if (!value.length) return '—';
      if (value.every(function (item) {
        return item && typeof item === 'object' && item.name;
      })) {
        return value.map(function (item) {
          if (
            Object.prototype.hasOwnProperty.call(item, 'min')
            && Object.prototype.hasOwnProperty.call(item, 'max')
          ) {
            return item.name + ' ' + item.min + '–' + item.max + ' / ' + item.step;
          }
          return item.name;
        }).join(', ');
      }
      return value.map(function (item) {
        return typeof item === 'object' ? JSON.stringify(item) : String(item);
      }).join(', ');
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderOutputSections(taskConfig, lang) {
    var container = document.getElementById('settingsConfigDynamicRows');
    if (!container) return;
    clear(container);

    (taskConfig.outputs || []).forEach(function (outputItem, index) {
      var definition = catalog.getOutputDefinition(outputItem.type);
      var section = document.createElement('section');
      section.className = 'task-config-output-section';
      section.setAttribute('data-testid', 'task-config-output-section');
      section.setAttribute('data-output-key', outputItem.type);

      var heading = document.createElement('div');
      heading.className = 'task-config-output-heading';
      var title = document.createElement('h3');
      title.className = 'task-config-output-title';
      title.textContent = (index + 1) + '. ' + catalog.getOutputLabel(outputItem.type, lang);
      var key = document.createElement('span');
      key.className = 'task-config-output-key';
      key.textContent = outputItem.type;
      heading.appendChild(title);
      heading.appendChild(key);
      section.appendChild(heading);

      var body = document.createElement('div');
      body.className = 'task-config-output-body';
      var fields = definition && Array.isArray(definition.fields)
        ? definition.fields
        : Object.keys(outputItem.config || {}).map(function (configKey) {
          return { key: configKey, type: 'text', zh: configKey, en: configKey };
        });
      fields.forEach(function (field) {
        var row = document.createElement('div');
        row.className = 'task-config-setting-row';
        var label = document.createElement('span');
        label.className = 'task-config-setting-label';
        label.textContent = field[langKey(lang)] || field.zh || field.en || field.key;
        if (field.required) {
          var required = document.createElement('span');
          required.className = 'required';
          required.textContent = '*';
          label.appendChild(required);
        }
        var value = document.createElement('span');
        value.className = 'task-config-setting-value';
        value.textContent = summarizeValue(fieldValue(outputItem.config || {}, field), field, lang);
        row.appendChild(label);
        row.appendChild(value);
        body.appendChild(row);
      });
      section.appendChild(body);
      container.appendChild(section);
    });
  }

  function renderSummary(taskData, state, lang) {
    if (!isManaged(taskData)) return false;
    var taskConfig = taskData.taskConfig;
    var languageToggle = document.getElementById('mobileLangToggle')
      || document.getElementById('langToggle');
    if (languageToggle) languageToggle.setAttribute('data-testid', 'language-toggle');

    setRequiredText('labelTaskCategories', copy(lang, 'categories'));
    setRequiredText('labelTaskInputType', copy(lang, 'inputType'));
    setRequiredText('labelTaskType', copy(lang, 'outputTypes'));
    setRequiredText('editTaskTypeLabel', copy(lang, 'taskType'));
    setText('editTaskCategoryLabel', copy(lang, 'categoryGroup'));
    setText('editTaskInputTypeLabel', copy(lang, 'inputGroup'));
    setText('editTaskOutputTypeLabel', copy(lang, 'outputGroup'));
    setText('settingsSummaryTitle', copy(lang, 'settings'));
    setText('settingsAnnotationPreviewLabel', copy(lang, 'annotationPreview'));
    setText('valueTaskName', langKey(lang) === 'en' ? taskData.taskNameEn : taskData.taskNameZh);

    renderTagList('valueTaskCategories', (taskConfig.selected_categories || []).map(function (category) {
      return {
        label: catalog.getCategoryLabel(category, lang),
        testId: 'task-selected-category',
        dataName: 'data-category-key',
        dataValue: category,
      };
    }));

    var inputNode = document.getElementById('valueTaskInputType');
    if (inputNode) {
      inputNode.textContent = catalog.getInputTypeLabel(taskConfig.input_type, lang);
      inputNode.setAttribute('data-input-type', taskConfig.input_type || '');
    }

    renderTagList('valueTaskType', (taskConfig.outputs || []).map(function (item) {
      return {
        label: detailOutputLabel(item.type, lang),
        testId: 'task-output-type-tag',
        dataName: 'data-output-key',
        dataValue: item.type,
      };
    }));

    renderFieldRoleSummary(taskConfig, lang);
    renderOutputSections(taskConfig, lang);
    setText(
      'valueConfigTaskType',
      (taskConfig.outputs || []).map(function (item) {
        return catalog.getOutputLabel(item.type, lang);
      }).join(', '),
    );
    setText('valueConfigVersion', taskData.configFileName || '');
    return true;
  }

  function createChip(label, key, checked, mode, outputKey) {
    var chip = document.createElement('button');
    chip.className = 'task-type-chip task-config-chip' + (checked ? ' selected' : '');
    chip.type = 'button';
    chip.setAttribute('aria-checked', checked ? 'true' : 'false');
    chip.setAttribute('role', mode === 'radio' ? 'radio' : 'checkbox');
    chip.setAttribute('data-key', key);
    if (outputKey) chip.setAttribute('data-output-key', outputKey);
    var indicator = document.createElement('span');
    indicator.className = 'task-type-chip-check';
    indicator.setAttribute('aria-hidden', 'true');
    var text = document.createElement('span');
    text.textContent = label;
    chip.appendChild(indicator);
    chip.appendChild(text);
    return chip;
  }

  function taxonomyInputTypes() {
    var seen = {};
    var result = [];
    Object.keys(catalog.taxonomy).forEach(function (category) {
      Object.keys(catalog.taxonomy[category].granularities || {}).forEach(function (inputType) {
        if (!seen[inputType]) {
          seen[inputType] = true;
          result.push(inputType);
        }
      });
    });
    return result;
  }

  function outputKeysForDraft() {
    var seen = {};
    var result = [];
    (basicDraft.selected_categories || []).forEach(function (category) {
      catalog.getCategoryOutputKeys(category, basicDraft.input_type).forEach(function (outputKey) {
        if (!seen[outputKey]) {
          seen[outputKey] = true;
          result.push(outputKey);
        }
      });
    });
    return result;
  }

  function categoryForOutput(outputKey) {
    var found = '';
    Object.keys(catalog.taxonomy).some(function (category) {
      if (catalog.getCategoryOutputKeys(category, basicDraft.input_type).indexOf(outputKey) >= 0) {
        found = category;
        return true;
      }
      return false;
    });
    return found;
  }

  function ensureOutputDrafts() {
    var selected = basicDraft.outputs || [];
    var selectedKeys = selected.map(function (item) {
      return item.type;
    });
    (basicDraft.selected_output_types || []).forEach(function (outputKey) {
      if (selectedKeys.indexOf(outputKey) >= 0) return;
      selected.push({
        type: outputKey,
        config: catalog.getDefaultOutputConfig(outputKey, 'zh'),
      });
    });
    basicDraft.outputs = selected.filter(function (item) {
      return basicDraft.selected_output_types.indexOf(item.type) >= 0;
    });
  }

  function confirmOutputRemoval(removedKeys, lang) {
    if (!removedKeys.length) return true;
    var labels = removedKeys.map(function (outputKey) {
      return catalog.getOutputLabel(outputKey, lang);
    });
    var separator = lang === 'en' ? ', ' : '、';
    return global.confirm(labels.join(separator) + '\n' + copy(lang, 'removeOutputConfirm'));
  }

  function renderCategoryChips(lang, state) {
    var container = document.getElementById('editTaskCategoryChips');
    if (!container || !basicDraft) return;
    clear(container);
    Object.keys(catalog.taxonomy).forEach(function (category) {
      var checked = basicDraft.selected_categories.indexOf(category) >= 0;
      var chip = createChip(catalog.getCategoryLabel(category, lang), category, checked, 'checkbox');
      chip.setAttribute('data-testid', 'task-category-chip');
      chip.addEventListener('click', function () {
        var index = basicDraft.selected_categories.indexOf(category);
        if (index >= 0) {
          var categoryOutputKeys = catalog.getCategoryOutputKeys(category, basicDraft.input_type);
          var removedKeys = basicDraft.selected_output_types.filter(function (outputKey) {
            return categoryOutputKeys.indexOf(outputKey) >= 0;
          });
          if (!confirmOutputRemoval(removedKeys, lang)) return;
          basicDraft.selected_categories.splice(index, 1);
          basicDraft.selected_output_types = basicDraft.selected_output_types.filter(function (outputKey) {
            return categoryOutputKeys.indexOf(outputKey) === -1;
          });
        } else {
          basicDraft.selected_categories.push(category);
        }
        ensureOutputDrafts();
        state.overviewDirty = true;
        renderBasicEditor(lang, state);
      });
      container.appendChild(chip);
    });
  }

  function renderInputTypeChips(lang, state) {
    var container = document.getElementById('editTaskInputTypeChips');
    if (!container || !basicDraft) return;
    clear(container);
    taxonomyInputTypes().forEach(function (inputType) {
      var chip = createChip(
        catalog.getInputTypeLabel(inputType, lang),
        inputType,
        basicDraft.input_type === inputType,
        'radio',
      );
      chip.setAttribute('data-testid', 'task-input-type-chip');
      chip.addEventListener('click', function () {
        var previousInputType = basicDraft.input_type;
        basicDraft.input_type = inputType;
        var allowed = outputKeysForDraft();
        var removedKeys = basicDraft.selected_output_types.filter(function (outputKey) {
          return allowed.indexOf(outputKey) === -1;
        });
        if (!confirmOutputRemoval(removedKeys, lang)) {
          basicDraft.input_type = previousInputType;
          return;
        }
        basicDraft.selected_output_types = basicDraft.selected_output_types.filter(function (outputKey) {
          return allowed.indexOf(outputKey) >= 0;
        });
        ensureOutputDrafts();
        state.overviewDirty = true;
        renderBasicEditor(lang, state);
      });
      container.appendChild(chip);
    });
  }

  function renderOutputTypeChips(lang, state) {
    var container = document.getElementById('editTaskOutputTypeChips');
    if (!container || !basicDraft) return;
    clear(container);
    var outputKeys = outputKeysForDraft();
    if (!outputKeys.length) {
      var empty = document.createElement('p');
      empty.className = 'task-config-empty';
      empty.textContent = copy(lang, 'noOutputs');
      container.appendChild(empty);
      return;
    }

    outputKeys.forEach(function (outputKey) {
      var category = categoryForOutput(outputKey);
      var mode = catalog.taxonomy[category] && catalog.taxonomy[category].outputSelection === 'single'
        ? 'radio'
        : 'checkbox';
      var selected = basicDraft.selected_output_types.indexOf(outputKey) >= 0;
      var chip = createChip(
        catalog.getOutputLabel(outputKey, lang),
        outputKey,
        selected,
        mode,
        outputKey,
      );
      chip.setAttribute('data-testid', 'task-output-type-chip');
      chip.addEventListener('click', function () {
        var index = basicDraft.selected_output_types.indexOf(outputKey);
        if (index >= 0) {
          if (mode === 'radio') return;
          if (!confirmOutputRemoval([outputKey], lang)) return;
          basicDraft.selected_output_types.splice(index, 1);
        } else {
          if (mode === 'radio') {
            var categoryOutputs = catalog.getCategoryOutputKeys(category, basicDraft.input_type);
            var replacedKeys = basicDraft.selected_output_types.filter(function (key) {
              return categoryOutputs.indexOf(key) >= 0;
            });
            if (!confirmOutputRemoval(replacedKeys, lang)) return;
            basicDraft.selected_output_types = basicDraft.selected_output_types.filter(function (key) {
              return categoryOutputs.indexOf(key) === -1;
            });
          }
          basicDraft.selected_output_types.push(outputKey);
        }
        ensureOutputDrafts();
        state.overviewDirty = true;
        renderBasicEditor(lang, state);
      });
      container.appendChild(chip);
    });
  }

  function renderFieldRoleEditor(lang, state) {
    var container = document.getElementById('editDatasetFieldMapperTable');
    if (!container || !basicDraft) return;
    clear(container);
    var columns = basicDraft.dataset_columns.length
      ? basicDraft.dataset_columns
      : Object.keys(basicDraft.field_role_map);

    var table = document.createElement('table');
    table.className = 'inline-preview-table';
    var head = document.createElement('thead');
    var headRow = document.createElement('tr');
    columns.forEach(function (field) {
      var cell = document.createElement('th');
      cell.scope = 'col';
      var header = document.createElement('div');
      header.className = 'inline-preview-col-header';
      var name = document.createElement('span');
      name.className = 'inline-preview-col-label';
      name.textContent = field;
      var type = document.createElement('span');
      type.className = 'inline-preview-type-badge';
      type.textContent = langKey(lang) === 'en' ? 'String' : '字串';
      var select = document.createElement('select');
      select.className = 'inline-preview-role-select task-config-field-role-select';
      select.setAttribute('data-testid', 'field-role-select');
      select.setAttribute('data-field-key', field);
      select.setAttribute('aria-label', (langKey(lang) === 'en' ? 'Role: ' : '角色：') + field);
      [
        ['', copy(lang, 'roleNone')],
        ['evidence', copy(lang, 'roleEvidence')],
        ['input', copy(lang, 'roleInput')],
        ['output', copy(lang, 'roleOutput')],
      ].forEach(function (entry) {
        var option = document.createElement('option');
        option.value = entry[0];
        option.textContent = entry[1];
        select.appendChild(option);
      });
      select.value = basicDraft.field_role_map[field] || '';
      select.addEventListener('change', function () {
        if (select.value) basicDraft.field_role_map[field] = select.value;
        else delete basicDraft.field_role_map[field];
        state.overviewDirty = true;
      });
      header.appendChild(name);
      header.appendChild(type);
      header.appendChild(select);
      cell.appendChild(header);
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    var body = document.createElement('tbody');
    var placeholderRow = document.createElement('tr');
    columns.forEach(function () {
      var cell = document.createElement('td');
      cell.textContent = '—';
      placeholderRow.appendChild(cell);
    });
    body.appendChild(placeholderRow);
    table.appendChild(body);
    container.appendChild(table);
  }

  function renderBasicEditor(lang, state) {
    if (!basicDraft) return;
    var input = document.getElementById('editTaskNameInput');
    if (input && document.activeElement !== input) {
      input.value = langKey(lang) === 'en' ? basicDraft.taskNameEn : basicDraft.taskNameZh;
    }
    setText('editTaskNameCount', input ? input.value.length : 0);
    renderCategoryChips(lang, state);
    renderInputTypeChips(lang, state);
    renderOutputTypeChips(lang, state);
    renderFieldRoleEditor(lang, state);
  }

  function renderBasicEditState(taskData, state, lang) {
    if (!isManaged(taskData)) return false;
    var editable = taskData.status === 'draft' && state.taskRole === 'project_leader';
    var editBtn = document.getElementById('overviewEditBtn');
    var saveBtn = document.getElementById('overviewSaveBtn');
    var cancelBtn = document.getElementById('overviewCancelBtn');
    var form = document.getElementById('overviewEditForm');
    var view = document.getElementById('basicInfoView');
    var hint = document.getElementById('overviewReadonlyHint');
    if (!editBtn || !saveBtn || !cancelBtn || !form || !view || !hint) return true;

    editBtn.disabled = !editable;
    setHidden(editBtn, state.overviewEditMode);
    setHidden(saveBtn, !state.overviewEditMode);
    setHidden(cancelBtn, !state.overviewEditMode);
    setHidden(form, !state.overviewEditMode);
    setHidden(view, state.overviewEditMode);
    setHidden(hint, editable || state.overviewEditMode);

    if (state.overviewEditMode) renderBasicEditor(lang, state);
    return true;
  }

  function startBasic(taskData, state, lang) {
    if (!isManaged(taskData) || taskData.status !== 'draft' || state.taskRole !== 'project_leader') {
      return false;
    }
    basicDraft = {
      taskNameZh: taskData.taskNameZh,
      taskNameEn: taskData.taskNameEn,
      selected_categories: catalog.clone(taskData.taskConfig.selected_categories || []),
      input_type: taskData.taskConfig.input_type,
      selected_output_types: taskData.taskConfig.outputs.map(function (item) {
        return item.type;
      }),
      outputs: catalog.clone(taskData.taskConfig.outputs),
      field_role_map: catalog.clone(taskData.taskConfig.field_role_map || {}),
      dataset_columns: catalog.clone(taskData.datasetColumns || []),
      datasetFiles: catalog.clone(taskData.datasetFiles || []),
    };
    state.overviewDraft = basicDraft;
    state.overviewEditMode = true;
    state.overviewDirty = false;
    var taskNameInput = document.getElementById('editTaskNameInput');
    if (taskNameInput && taskNameInput.getAttribute('data-config-count-bound') !== 'true') {
      taskNameInput.setAttribute('data-config-count-bound', 'true');
      taskNameInput.addEventListener('input', function () {
        setText('editTaskNameCount', taskNameInput.value.length);
      });
    }
    renderBasicEditState(taskData, state, lang);
    return true;
  }

  function validateBasic(lang) {
    if (!basicDraft) return { ok: false, message: copy(lang, 'requiredError') };
    var currentName = langKey(lang) === 'en' ? basicDraft.taskNameEn : basicDraft.taskNameZh;
    if (
      !String(currentName || '').trim()
      || !basicDraft.selected_categories.length
      || !basicDraft.input_type
      || !basicDraft.selected_output_types.length
      || !basicDraft.datasetFiles.length
      || basicDraft.datasetFiles.some(function (file) {
        return !/\.json$/i.test(file.name);
      })
    ) {
      var hasNonJson = basicDraft.datasetFiles.some(function (file) {
        return !/\.json$/i.test(file.name);
      });
      return {
        ok: false,
        message: hasNonJson ? copy(lang, 'jsonOnlyError') : copy(lang, 'requiredError'),
      };
    }
    var inputCount = Object.keys(basicDraft.field_role_map).filter(function (field) {
      return basicDraft.field_role_map[field] === 'input';
    }).length;
    var expectedInputs = basicDraft.input_type === 'item_pair' ? 2 : 1;
    if (inputCount !== expectedInputs) {
      return { ok: false, message: copy(lang, 'inputRoleError') };
    }
    return { ok: true, message: '' };
  }

  function saveBasic(taskData, state, lang) {
    if (!basicDraft) return false;
    var validation = validateBasic(lang);
    if (!validation.ok) {
      setInlineError('overviewEditError', validation.message);
      return false;
    }

    setInlineError('overviewEditError', '');
    ensureOutputDrafts();
    if (langKey(lang) === 'en') taskData.taskNameEn = basicDraft.taskNameEn.trim();
    else taskData.taskNameZh = basicDraft.taskNameZh.trim();
    taskData.taskConfig = {
      selected_categories: catalog.clone(basicDraft.selected_categories),
      input_type: basicDraft.input_type,
      field_role_map: catalog.clone(basicDraft.field_role_map),
      outputs: catalog.clone(basicDraft.outputs),
    };
    taskData.taskTypeKey = compatibilityTaskType(taskData.taskConfig.outputs);
    taskData.datasetFiles = catalog.clone(basicDraft.datasetFiles);
    taskData.datasetColumns = catalog.clone(basicDraft.dataset_columns);
    taskData.datasetSourceZh = taskData.datasetFiles.map(function (file) {
      return file.name;
    }).join(' + ');
    taskData.datasetSourceEn = taskData.datasetSourceZh;
    taskData.datasetSizeBytes = taskData.datasetFiles.reduce(function (sum, file) {
      return sum + (Number(file.sizeBytes) || 0);
    }, 0);
    taskData.configContent = JSON.stringify({
      input_type: taskData.taskConfig.input_type,
      outputs: taskData.taskConfig.outputs,
    }, null, 2);
    taskData.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    state.overviewEditMode = false;
    state.overviewDirty = false;
    state.overviewDraft = null;
    basicDraft = null;
    return true;
  }

  function cancelBasic(state) {
    state.overviewEditMode = false;
    state.overviewDirty = false;
    state.overviewDraft = null;
    basicDraft = null;
    return true;
  }

  function configPayload(taskConfig) {
    return {
      input_type: taskConfig.input_type,
      outputs: catalog.clone(taskConfig.outputs),
    };
  }

  function settingsCode() {
    var payload = configPayload(settingsDraft);
    if (settingsFormat === 'json' || typeof catalog.toYaml !== 'function') {
      return JSON.stringify(payload, null, 2);
    }
    return catalog.toYaml(payload);
  }

  function updateCodeEditor() {
    var editor = document.getElementById('settingsCodeEditor');
    if (editor) editor.value = settingsCode();
    var yamlBtn = document.getElementById('settingsFormatYamlBtn');
    var jsonBtn = document.getElementById('settingsFormatJsonBtn');
    if (yamlBtn) yamlBtn.style.fontWeight = settingsFormat === 'yaml' ? '700' : '400';
    if (jsonBtn) jsonBtn.style.fontWeight = settingsFormat === 'json' ? '700' : '400';
  }

  function updateNestedField(config, field, value) {
    if (field.valueKey) {
      if (!config[field.key] || typeof config[field.key] !== 'object') {
        config[field.key] = {};
      }
      config[field.key][field.valueKey] = value;
      return;
    }
    config[field.key] = value;
  }

  function parseComplexField(raw) {
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) && (parsed === null || typeof parsed !== 'object')) {
      throw new Error('Expected an array or object.');
    }
    return parsed;
  }

  function markSettingsChanged(state, lang) {
    state.settingsDirty = true;
    updateCodeEditor();
    renderPreview(settingsDraft, lang);
  }

  function removeButton(label, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'schema-list-remove';
    button.setAttribute('aria-label', label);
    button.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    button.addEventListener('click', onClick);
    return button;
  }

  function renderEntityListControl(outputItem, field, value, lang, state) {
    var items = Array.isArray(value) ? value : [];
    var wrapper = document.createElement('div');
    wrapper.className = 'schema-list-editor';
    items.forEach(function (item, index) {
      var record = item && typeof item === 'object' ? item : { name: String(item || '') };
      var row = document.createElement('div');
      row.className = 'schema-list-row';
      var color = document.createElement('input');
      color.type = 'color';
      color.className = 'schema-color-input';
      color.value = /^#[0-9A-F]{6}$/i.test(record.color || '') ? record.color : '#6366F1';
      color.setAttribute('aria-label', (langKey(lang) === 'en' ? 'Color ' : '顏色 ') + (index + 1));
      color.addEventListener('input', function () {
        record.color = color.value;
        items[index] = record;
        updateNestedField(outputItem.config, field, items);
        markSettingsChanged(state, lang);
      });
      var name = document.createElement('input');
      name.type = 'text';
      name.className = 'input-text';
      name.value = record.name || '';
      name.addEventListener('input', function () {
        record.name = name.value;
        items[index] = record;
        updateNestedField(outputItem.config, field, items);
        markSettingsChanged(state, lang);
      });
      row.appendChild(color);
      row.appendChild(name);
      row.appendChild(removeButton(
        (langKey(lang) === 'en' ? 'Remove item ' : '移除項目 ') + (index + 1),
        function () {
          items.splice(index, 1);
          updateNestedField(outputItem.config, field, items);
          markSettingsChanged(state, lang);
          renderSettingsEditor(lang, state);
        },
      ));
      wrapper.appendChild(row);
    });
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'template-btn schema-list-add';
    add.textContent = field[langKey(lang) === 'en' ? 'addLabel_en' : 'addLabel_zh'] || copy(lang, 'addItem');
    add.addEventListener('click', function () {
      items.push({ name: 'label_' + (items.length + 1), color: '#6366F1' });
      updateNestedField(outputItem.config, field, items);
      markSettingsChanged(state, lang);
      renderSettingsEditor(lang, state);
    });
    wrapper.appendChild(add);
    return wrapper;
  }

  function renderTagListControl(outputItem, field, value, lang, state) {
    var items = Array.isArray(value) ? value : [];
    var wrapper = document.createElement('div');
    wrapper.className = 'tag-input-wrap';
    items.forEach(function (item, index) {
      var pill = document.createElement('span');
      pill.className = 'tag-pill';
      var text = document.createElement('span');
      text.textContent = String(item);
      pill.appendChild(text);
      var remove = removeButton(
        (langKey(lang) === 'en' ? 'Remove ' : '移除 ') + String(item),
        function () {
          items.splice(index, 1);
          updateNestedField(outputItem.config, field, items);
          markSettingsChanged(state, lang);
          renderSettingsEditor(lang, state);
        },
      );
      remove.className = 'tag-pill-remove';
      pill.appendChild(remove);
      wrapper.appendChild(pill);
    });
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-input-text';
    input.placeholder = field[langKey(lang) === 'en' ? 'placeholder_en' : 'placeholder_zh'] || '';
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' || !input.value.trim()) return;
      event.preventDefault();
      items.push(input.value.trim());
      updateNestedField(outputItem.config, field, items);
      markSettingsChanged(state, lang);
      renderSettingsEditor(lang, state);
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function renderTaxonomyControl(outputItem, field, value, lang, state) {
    var roots = Array.isArray(value) ? value : [];
    var wrapper = document.createElement('div');
    wrapper.className = 'taxonomy-editor-list';

    function appendNode(node, depth) {
      var row = document.createElement('div');
      row.className = 'taxonomy-editor-row';
      row.style.setProperty('--taxonomy-depth', String(depth));
      var marker = document.createElement('span');
      marker.className = 'taxonomy-editor-marker';
      marker.setAttribute('aria-hidden', 'true');
      var name = document.createElement('input');
      name.type = 'text';
      name.className = 'input-text';
      name.value = node.name || '';
      name.addEventListener('input', function () {
        node.name = name.value;
        updateNestedField(outputItem.config, field, roots);
        markSettingsChanged(state, lang);
      });
      row.appendChild(marker);
      row.appendChild(name);
      if (!Array.isArray(node.children) || !node.children.length) {
        var color = document.createElement('input');
        color.type = 'color';
        color.className = 'schema-color-input';
        color.value = /^#[0-9A-F]{6}$/i.test(node.color || '') ? node.color : '#6366F1';
        color.addEventListener('input', function () {
          node.color = color.value;
          updateNestedField(outputItem.config, field, roots);
          markSettingsChanged(state, lang);
        });
        row.appendChild(color);
      }
      wrapper.appendChild(row);
      (node.children || []).forEach(function (child) {
        appendNode(child, depth + 1);
      });
    }

    roots.forEach(function (root) {
      appendNode(root, 0);
    });
    return wrapper;
  }

  function renderDimensionsControl(outputItem, field, value, lang, state) {
    var dimensions = Array.isArray(value) ? value : [];
    var wrapper = document.createElement('div');
    wrapper.className = 'dimension-editor-list';
    dimensions.forEach(function (dimension, index) {
      var row = document.createElement('div');
      row.className = 'dimension-editor-row';
      [
        ['name', 'text'],
        ['min', 'number'],
        ['max', 'number'],
        ['step', 'number'],
      ].forEach(function (entry) {
        var input = document.createElement('input');
        input.type = entry[1];
        input.className = 'input-text';
        input.value = dimension[entry[0]] == null ? '' : String(dimension[entry[0]]);
        input.setAttribute('aria-label', entry[0] + ' ' + (index + 1));
        input.addEventListener('input', function () {
          dimension[entry[0]] = entry[1] === 'number'
            ? (input.value === '' ? null : Number(input.value))
            : input.value;
          updateNestedField(outputItem.config, field, dimensions);
          markSettingsChanged(state, lang);
        });
        row.appendChild(input);
      });
      wrapper.appendChild(row);
    });
    return wrapper;
  }

  function renderPrimitiveControl(outputItem, field, lang, state) {
    var value = fieldValue(outputItem.config, field);
    var control;
    if (field.type === 'boolean') {
      control = document.createElement('label');
      control.className = 'schema-toggle-card' + (value ? ' is-on' : '');
      var toggleCopy = document.createElement('span');
      toggleCopy.className = 'schema-toggle-copy';
      var toggleLabel = document.createElement('span');
      toggleLabel.className = 'schema-toggle-label';
      toggleLabel.textContent = field[langKey(lang)] || field.zh || field.key;
      toggleCopy.appendChild(toggleLabel);
      var status = document.createElement('span');
      status.className = 'schema-toggle-status';
      status.textContent = value
        ? (langKey(lang) === 'en' ? 'Enabled' : '已啟用')
        : (langKey(lang) === 'en' ? 'Disabled' : '已停用');
      toggleCopy.appendChild(status);
      var toggle = document.createElement('span');
      toggle.className = 'toggle-switch';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(value);
      var slider = document.createElement('span');
      slider.className = 'toggle-slider';
      checkbox.addEventListener('change', function () {
        updateNestedField(outputItem.config, field, checkbox.checked);
        control.classList.toggle('is-on', checkbox.checked);
        status.textContent = checkbox.checked
          ? (langKey(lang) === 'en' ? 'Enabled' : '已啟用')
          : (langKey(lang) === 'en' ? 'Disabled' : '已停用');
        markSettingsChanged(state, lang);
      });
      toggle.appendChild(checkbox);
      toggle.appendChild(slider);
      control.appendChild(toggleCopy);
      control.appendChild(toggle);
    } else if (field.type === 'select') {
      control = document.createElement('select');
      control.className = 'input-select task-config-field-control';
      (field.options || []).forEach(function (optionValue) {
        var option = document.createElement('option');
        option.value = optionValue;
        option.textContent = field.optionLabels && field.optionLabels[langKey(lang)]
          ? field.optionLabels[langKey(lang)][optionValue]
          : optionValue;
        control.appendChild(option);
      });
      control.value = value == null ? '' : String(value);
      control.addEventListener('change', function () {
        updateNestedField(outputItem.config, field, control.value);
        markSettingsChanged(state, lang);
      });
    } else if (field.type === 'entity-list') {
      control = renderEntityListControl(outputItem, field, value, lang, state);
    } else if (field.type === 'tag-list') {
      control = renderTagListControl(outputItem, field, value, lang, state);
    } else if (field.type === 'taxonomy-tree') {
      control = renderTaxonomyControl(outputItem, field, value, lang, state);
    } else if (field.type === 'va-dimensions') {
      control = renderDimensionsControl(outputItem, field, value, lang, state);
    } else {
      control = document.createElement('input');
      control.type = field.type === 'number' ? 'number' : 'text';
      control.className = 'input-text task-config-field-control';
      if (field.min !== undefined) control.min = String(field.min);
      if (field.maxLength !== undefined) control.maxLength = Number(field.maxLength);
      control.value = value == null ? '' : String(value);
      control.addEventListener('input', function () {
        var nextValue = field.type === 'number'
          ? (control.value === '' ? null : Number(control.value))
          : control.value;
        updateNestedField(outputItem.config, field, nextValue);
        markSettingsChanged(state, lang);
      });
    }
    if (!control.classList.contains('task-config-field-control')) {
      control.classList.add('task-config-field-control');
    }
    control.setAttribute('data-field-key', field.key);
    return control;
  }

  function renderSettingsFields(lang, state) {
    var container = document.getElementById('settingsSchemaFields');
    if (!container || !settingsDraft) return;
    clear(container);
    container.className = 'task-config-output-editor-list';

    settingsDraft.outputs.forEach(function (outputItem, index) {
      var definition = catalog.getOutputDefinition(outputItem.type);
      var section = document.createElement('section');
      section.className = 'task-config-output-editor output-accordion';
      section.setAttribute('data-testid', 'task-config-output-editor');
      section.setAttribute('data-output-key', outputItem.type);

      var bodyId = 'task-config-output-editor-body-' + index;
      var heading = document.createElement('button');
      heading.type = 'button';
      heading.className = 'output-accordion-header task-config-output-heading';
      heading.setAttribute('aria-expanded', 'true');
      heading.setAttribute('aria-controls', bodyId);
      var title = document.createElement('span');
      title.className = 'output-accordion-title task-config-output-title';
      var titleBadge = document.createElement('span');
      titleBadge.className = 'output-type-index-badge';
      titleBadge.textContent = String(index + 1);
      title.appendChild(titleBadge);
      title.appendChild(document.createTextNode(catalog.getOutputLabel(outputItem.type, lang)));
      var chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevron.setAttribute('class', 'output-accordion-chevron');
      chevron.setAttribute('viewBox', '0 0 24 24');
      chevron.setAttribute('fill', 'none');
      chevron.setAttribute('stroke', 'currentColor');
      chevron.setAttribute('stroke-width', '2');
      chevron.setAttribute('stroke-linecap', 'round');
      chevron.setAttribute('stroke-linejoin', 'round');
      chevron.setAttribute('aria-hidden', 'true');
      var chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      chevronPath.setAttribute('points', '6 9 12 15 18 9');
      chevron.appendChild(chevronPath);
      heading.appendChild(title);
      heading.appendChild(chevron);
      section.appendChild(heading);

      var body = document.createElement('div');
      body.className = 'output-accordion-body task-config-output-body';
      body.id = bodyId;
      body.setAttribute('role', 'region');
      (definition.fields || []).forEach(function (field) {
        var row = document.createElement('div');
        row.className = 'form-field task-config-setting-row';
        if (field.type !== 'boolean') {
          var label = document.createElement('label');
          label.className = 'field-label task-config-setting-label';
          label.textContent = field[langKey(lang)] || field.zh || field.key;
          if (field.required) {
            var required = document.createElement('span');
            required.className = 'required';
            required.textContent = '*';
            label.appendChild(required);
          }
          row.appendChild(label);
        }
        row.appendChild(renderPrimitiveControl(outputItem, field, lang, state));
        var hintText = field[langKey(lang) === 'en' ? 'hint_en' : 'hint_zh'];
        if (hintText) {
          var hint = document.createElement('p');
          hint.className = 'field-hint';
          hint.textContent = hintText;
          row.appendChild(hint);
        }
        body.appendChild(row);
      });
      section.appendChild(body);
      heading.addEventListener('click', function () {
        var collapsed = section.classList.toggle('collapsed');
        heading.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
      container.appendChild(section);
    });
  }

  function optionName(option) {
    return option && typeof option === 'object' ? option.name : String(option || '');
  }

  function optionColor(option, fallback) {
    return option && typeof option === 'object' && option.color ? option.color : fallback;
  }

  function flattenTaxonomyLeaves(nodes, result) {
    (nodes || []).forEach(function (node) {
      if (node.children && node.children.length) flattenTaxonomyLeaves(node.children, result);
      else result.push(node);
    });
    return result;
  }

  function appendPreviewOptions(container, options, multiple) {
    var optionList = document.createElement('div');
    optionList.className = 'annotation-preview-pill-list';
    (options || []).forEach(function (option, index) {
      var pill = document.createElement('label');
      pill.className = 'annotation-preview-option-pill';
      var color = optionColor(option, ['#6366F1', '#10B981', '#F59E0B'][index % 3]);
      pill.style.setProperty('--pill-color', color);
      var input = document.createElement('input');
      input.type = multiple ? 'checkbox' : 'radio';
      input.name = 'task-detail-preview-' + (multiple ? 'multiple' : 'single');
      input.disabled = true;
      var indicator = document.createElement('span');
      indicator.className = multiple ? 'annotation-preview-option-check' : 'annotation-preview-option-radio';
      var text = document.createElement('span');
      text.textContent = optionName(option);
      pill.appendChild(input);
      pill.appendChild(indicator);
      pill.appendChild(text);
      optionList.appendChild(pill);
    });
    container.appendChild(optionList);
  }

  function appendRangePreview(container, dimension) {
    var row = document.createElement('div');
    row.className = 'preview-range-row';
    var label = document.createElement('label');
    label.className = 'preview-range-label';
    label.textContent = dimension.name || 'score';
    var input = document.createElement('input');
    input.type = 'range';
    input.min = String(dimension.min == null ? 1 : dimension.min);
    input.max = String(dimension.max == null ? 5 : dimension.max);
    input.step = String(dimension.step == null ? 1 : dimension.step);
    input.value = String(dimension.min == null ? 1 : dimension.min);
    input.disabled = true;
    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  }

  function renderOutputPreview(card, outputItem, lang) {
    var config = outputItem.config || {};

    if (outputItem.type === 'single_label') {
      appendPreviewOptions(card, config.label_options || [], false);
    } else if (outputItem.type === 'multi_label') {
      appendPreviewOptions(card, flattenTaxonomyLeaves(config.label_options || [], []), true);
    } else if (outputItem.type === 'sequence_tagging' || outputItem.type === 'entity_recognition') {
      var entityLabel = document.createElement('div');
      entityLabel.className = 'yaml-preview-label preview-section-label';
      entityLabel.textContent = copy(lang, 'previewEntity');
      card.appendChild(entityLabel);
      appendPreviewOptions(card, config.entities || [], true);
    } else if (outputItem.type === 'relation_identification') {
      var relationLabel = document.createElement('div');
      relationLabel.className = 'yaml-preview-label preview-section-label';
      relationLabel.textContent = copy(lang, 'previewRelation');
      card.appendChild(relationLabel);
      appendPreviewOptions(card, config.relation_types || [], false);
    } else if (outputItem.type === 'single_dim') {
      appendRangePreview(card, {
        name: config.dimension_name,
        min: config.min,
        max: config.max,
        step: config.step,
      });
    } else if (outputItem.type === 'multi_dim') {
      (config.dimensions || []).forEach(function (dimension) {
        appendRangePreview(card, dimension);
      });
    } else if (outputItem.type === 'free_text') {
      var instruction = document.createElement('label');
      instruction.className = 'field-label preview-response-label';
      instruction.textContent = config.output_instruction || copy(lang, 'previewResponse');
      var textarea = document.createElement('textarea');
      textarea.className = 'input-textarea';
      textarea.disabled = true;
      textarea.placeholder = copy(lang, 'previewResponse');
      card.appendChild(instruction);
      card.appendChild(textarea);
    }

    if (config.allow_bypass) {
      var bypassWrap = document.createElement('div');
      bypassWrap.className = 'annotation-preview-bypass-wrap';
      var bypass = document.createElement('label');
      bypass.className = 'annotation-preview-bypass-chip';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.disabled = true;
      var box = document.createElement('span');
      box.className = 'annotation-preview-bypass-box';
      var bypassText = document.createElement('span');
      bypassText.textContent = langKey(lang) === 'en' ? 'Unable to determine (Bypass)' : '無法判定 (Bypass)';
      bypass.appendChild(checkbox);
      bypass.appendChild(box);
      bypass.appendChild(bypassText);
      bypassWrap.appendChild(bypass);
      card.appendChild(bypassWrap);
    }
  }

  function renderPreview(taskConfig, lang) {
    var preview = document.getElementById('settingsAnnotationPreview');
    if (!preview) return;
    clear(preview);

    var sourceTitle = document.createElement('div');
    sourceTitle.className = 'annotation-preview-task-title';
    sourceTitle.style.marginBottom = '6px';
    sourceTitle.textContent = copy(lang, 'previewSourceTextTitle');
    preview.appendChild(sourceTitle);

    var sample = document.createElement('div');
    sample.className = 'annotation-preview-sample';
    sample.textContent = copy(lang, 'previewSample');
    preview.appendChild(sample);

    var grid = document.createElement('div');
    grid.className = taskConfig.outputs.length > 1 ? 'preview-multi task-config-preview-grid' : 'preview-unified';
    taskConfig.outputs.forEach(function (outputItem) {
      var card = document.createElement('article');
      card.className = 'preview-card task-config-preview-card';
      card.setAttribute('data-output-key', outputItem.type);
      var cardTitle = document.createElement('div');
      cardTitle.className = 'annotation-preview-task-title';
      cardTitle.style.marginBottom = '8px';
      cardTitle.textContent = catalog.getOutputLabel(outputItem.type, lang);
      card.appendChild(cardTitle);
      renderOutputPreview(card, outputItem, lang);
      grid.appendChild(card);
    });
    preview.appendChild(grid);
  }

  function renderSettingsEditor(lang, state) {
    if (!settingsDraft) return;
    renderSettingsFields(lang, state);
    renderPreview(settingsDraft, lang);
    updateCodeEditor();
    var saveCodeBtn = document.getElementById('settingsSaveCodeBtn');
    if (saveCodeBtn) saveCodeBtn.disabled = !state.settingsCodeDraftDirty;
  }

  function renderSettingsEditState(taskData, state, lang) {
    if (!isManaged(taskData)) return false;
    var editable = taskData.status === 'draft' && state.taskRole === 'project_leader';
    var editBtn = document.getElementById('settingsEditBtn');
    var saveBtn = document.getElementById('settingsSaveBtn');
    var cancelBtn = document.getElementById('settingsCancelBtn');
    var form = document.getElementById('settingsEditForm');
    var view = document.getElementById('settingsConfigView');
    var hint = document.getElementById('settingsReadonlyHint');
    if (!editBtn || !saveBtn || !cancelBtn || !form || !view || !hint) return true;

    editBtn.disabled = !editable;
    setHidden(editBtn, state.settingsEditMode);
    setHidden(saveBtn, !state.settingsEditMode);
    setHidden(cancelBtn, !state.settingsEditMode);
    setHidden(form, !state.settingsEditMode);
    setHidden(view, state.settingsEditMode);
    setHidden(hint, editable || state.settingsEditMode);
    if (state.settingsEditMode) renderSettingsEditor(lang, state);
    return true;
  }

  function startSettings(taskData, state, lang) {
    if (!isManaged(taskData) || taskData.status !== 'draft' || state.taskRole !== 'project_leader') {
      return false;
    }
    settingsDraft = {
      input_type: taskData.taskConfig.input_type,
      outputs: catalog.clone(taskData.taskConfig.outputs),
    };
    state.settingsDraft = settingsDraft;
    state.settingsEditMode = true;
    state.settingsDirty = false;
    state.settingsCodeDraftDirty = false;
    settingsFormat = 'yaml';
    renderSettingsEditState(taskData, state, lang);
    return true;
  }

  function validateSettingsPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    if (payload.input_type !== 'single_item' && payload.input_type !== 'item_pair') return false;
    if (!Array.isArray(payload.outputs) || !payload.outputs.length) return false;
    return payload.outputs.every(function (item) {
      return (
        item
        && typeof item === 'object'
        && catalog.getOutputDefinition(item.type)
        && item.config
        && typeof item.config === 'object'
        && !Array.isArray(item.config)
      );
    });
  }

  function setCodeError(message) {
    var bar = document.getElementById('settingsCodeErrorBar');
    var target = document.getElementById('settingsCodeErrorMsg');
    if (target) target.textContent = message || '';
    setHidden(bar, !message);
  }

  function parseCode(raw) {
    if (settingsFormat === 'json') return JSON.parse(raw);
    if (typeof catalog.parseYaml !== 'function') return JSON.parse(raw);
    return catalog.parseYaml(raw);
  }

  function saveCode(state, lang) {
    if (!settingsDraft) return false;
    var editor = document.getElementById('settingsCodeEditor');
    try {
      var parsed = parseCode(editor ? editor.value : '');
      if (!validateSettingsPayload(parsed)) {
        setCodeError(copy(lang, 'configError'));
        return false;
      }
      settingsDraft.input_type = parsed.input_type;
      settingsDraft.outputs = catalog.clone(parsed.outputs);
      state.settingsDraft = settingsDraft;
      state.settingsCodeDraftDirty = false;
      state.settingsDirty = true;
      setCodeError('');
      renderSettingsEditor(lang, state);
      return true;
    } catch (error) {
      setCodeError(error && error.message ? error.message : copy(lang, 'configError'));
      return false;
    }
  }

  function setFormat(format, state) {
    if (!settingsDraft || state.settingsCodeDraftDirty) return false;
    settingsFormat = format === 'json' ? 'json' : 'yaml';
    updateCodeEditor();
    return true;
  }

  function markCodeDirty(state) {
    if (!settingsDraft) return false;
    state.settingsCodeDraftDirty = true;
    state.settingsDirty = true;
    var saveCodeBtn = document.getElementById('settingsSaveCodeBtn');
    if (saveCodeBtn) saveCodeBtn.disabled = false;
    return true;
  }

  function loadConfigFile(file, state, lang) {
    if (!file || !/\.(json|ya?ml)$/i.test(file.name || '')) {
      setCodeError(copy(lang, 'configError'));
      return false;
    }
    var reader = new FileReader();
    reader.onload = function () {
      settingsFormat = /\.json$/i.test(file.name) ? 'json' : 'yaml';
      var editor = document.getElementById('settingsCodeEditor');
      if (editor) editor.value = String(reader.result || '');
      markCodeDirty(state);
      setCodeError('');
    };
    reader.onerror = function () {
      setCodeError(copy(lang, 'configError'));
    };
    reader.readAsText(file);
    return true;
  }

  function validateSettingsDraft() {
    if (!settingsDraft || !settingsDraft.outputs.length) return false;
    return settingsDraft.outputs.every(function (outputItem) {
      var definition = catalog.getOutputDefinition(outputItem.type);
      if (!definition) return false;
      return (definition.fields || []).every(function (field) {
        if (!field.required) return true;
        var value = fieldValue(outputItem.config || {}, field);
        if (typeof value === 'string') return Boolean(value.trim());
        if (typeof value === 'number') return Number.isFinite(value);
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null;
      });
    });
  }

  function saveSettings(taskData, state, lang) {
    if (!settingsDraft || state.settingsCodeDraftDirty) return false;
    if (!validateSettingsDraft()) {
      setInlineError('settingsEditError', copy(lang, 'settingsRequiredError'));
      return false;
    }
    setInlineError('settingsEditError', '');
    taskData.taskConfig.input_type = settingsDraft.input_type;
    taskData.taskConfig.outputs = catalog.clone(settingsDraft.outputs);
    taskData.taskTypeKey = compatibilityTaskType(taskData.taskConfig.outputs);
    taskData.configContent = JSON.stringify(configPayload(taskData.taskConfig), null, 2);
    taskData.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    state.settingsEditMode = false;
    state.settingsDirty = false;
    state.settingsCodeDraftDirty = false;
    state.settingsDraft = null;
    settingsDraft = null;
    return true;
  }

  function cancelSettings(state) {
    state.settingsEditMode = false;
    state.settingsDirty = false;
    state.settingsCodeDraftDirty = false;
    state.settingsDraft = null;
    settingsDraft = null;
    return true;
  }

  global.LabelSuiteTaskDetailConfig = {
    applyTaskSeed: applyTaskSeed,
    isManaged: isManaged,
    renderSummary: renderSummary,
    renderBasicEditState: renderBasicEditState,
    startBasic: startBasic,
    saveBasic: saveBasic,
    cancelBasic: cancelBasic,
    renderSettingsEditState: renderSettingsEditState,
    startSettings: startSettings,
    saveSettings: saveSettings,
    cancelSettings: cancelSettings,
    saveCode: saveCode,
    setFormat: setFormat,
    markCodeDirty: markCodeDirty,
    loadConfigFile: loadConfigFile,
    canonicalConfig: canonicalConfig,
  };
}(window));

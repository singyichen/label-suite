(function (global) {
  'use strict';

  var catalog = global.LabelSuiteTaskConfigCatalog;
  var listData = global.LabelSuiteTaskListData;

  if (!catalog || !listData) {
    throw new Error('Task detail data requires the task config catalog and task list data.');
  }

  function mergeObject(base, override) {
    var result = catalog.clone(base || {});
    Object.keys(override || {}).forEach(function (key) {
      var next = override[key];
      if (
        next
        && typeof next === 'object'
        && !Array.isArray(next)
        && result[key]
        && typeof result[key] === 'object'
        && !Array.isArray(result[key])
      ) {
        result[key] = mergeObject(result[key], next);
        return;
      }
      result[key] = catalog.clone(next);
    });
    return result;
  }

  function output(type, config) {
    return {
      type: type,
      config: mergeObject(catalog.getDefaultOutputConfig(type, 'zh'), config || {}),
    };
  }

  /*
   * These safe seeds contain configuration metadata only. They intentionally do
   * not embed example rows, pre-annotations, hidden answers, or scoring keys.
   * The 13 entries mirror the current prototype list and are not a whitelist.
   */
  var configByTaskId = {
    T001: {
      selectedCategories: ['classification'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', gold_label: 'output' },
      outputs: [
        output('single_label', {
          label_options: [
            { name: 'positive', color: '#2ECC71' },
            { name: 'neutral', color: '#F39C12' },
            { name: 'negative', color: '#E74C3C' },
          ],
          allow_bypass: true,
        }),
      ],
    },
    T002: {
      selectedCategories: ['classification'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', gold_labels: 'output' },
      outputs: [
        output('multi_label', {
          label_options: [
            { id: 'happy', name: 'happy', color: '#2ECC71' },
            { id: 'sad', name: 'sad', color: '#3498DB' },
            { id: 'angry', name: 'angry', color: '#E74C3C' },
            { id: 'surprise', name: 'surprise', color: '#F39C12' },
            { id: 'fear', name: 'fear', color: '#9B59B6' },
            { id: 'disgust', name: 'disgust', color: '#1ABC9C' },
          ],
          max_selections: 3,
          allow_bypass: true,
        }),
      ],
    },
    T003: {
      selectedCategories: ['classification'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', gold_labels: 'output' },
      outputs: [
        output('multi_label', {
          label_options: [
            {
              id: 'emotion',
              name: '情緒',
              children: [
                {
                  id: 'negative',
                  name: '負向',
                  children: [
                    { id: 'sad', name: '悲傷', color: '#6366F1' },
                    { id: 'anxious', name: '焦慮', color: '#10B981' },
                  ],
                },
                {
                  id: 'positive',
                  name: '正向',
                  children: [
                    { id: 'hopeful', name: '有盼望', color: '#F59E0B' },
                  ],
                },
              ],
            },
            {
              id: 'care_context',
              name: '照護情境',
              children: [
                {
                  id: 'clinical',
                  name: '臨床處置',
                  children: [
                    { id: 'urgent', name: '緊急', color: '#EC4899' },
                  ],
                },
                {
                  id: 'communication',
                  name: '溝通',
                  children: [
                    { id: 'needs_explanation', name: '需要說明', color: '#0EA5E9' },
                  ],
                },
              ],
            },
          ],
          max_selections: 0,
          allow_bypass: true,
        }),
      ],
    },
    T004: {
      selectedCategories: ['regression'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', gold_score: 'output' },
      outputs: [
        output('single_dim', {
          dimension_name: 'readability',
          min: 1,
          max: 5,
          step: 1,
          allow_bypass: true,
        }),
      ],
    },
    T005: {
      selectedCategories: ['regression'],
      inputType: 'single_item',
      fieldRoleMap: { source: 'input', gold_scores: 'output' },
      outputs: [
        output('multi_dim', {
          dimensions: [
            { name: 'fluency', min: 1, max: 5, step: 1 },
            { name: 'adequacy', min: 1, max: 5, step: 1 },
            { name: 'coherence', min: 1, max: 5, step: 1 },
          ],
          allow_bypass: true,
        }),
      ],
    },
    T006: {
      selectedCategories: ['sequence'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', pre_tags: 'output' },
      outputs: [
        output('sequence_tagging', {
          entities: [
            { name: 'PER', color: '#E74C3C' },
            { name: 'ORG', color: '#3498DB' },
            { name: 'LOC', color: '#2ECC71' },
            { name: 'TIME', color: '#F39C12' },
          ],
          tagging_scheme: 'BIO',
          tokenization: {
            unit: 'character',
            mode: 'unit_based',
            punctuation: 'separate',
            version: 2,
          },
          allow_bypass: true,
        }),
      ],
    },
    T007: {
      selectedCategories: ['sequence'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', gold_entities: 'output' },
      outputs: [
        output('entity_recognition', {
          entities: [
            { name: 'target', color: '#3498DB' },
            { name: 'aspect', color: '#2ECC71' },
            { name: 'opinion', color: '#E74C3C' },
          ],
          allow_overlapping: false,
          allow_bypass: true,
        }),
      ],
    },
    T008: {
      selectedCategories: ['sequence'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', triples: 'output' },
      outputs: [
        output('relation_identification', {
          relation_types: ['causes', 'treats', 'prevents', 'diagnoses', 'located_in'],
          allow_bypass: true,
        }),
      ],
    },
    T009: {
      selectedCategories: ['generation'],
      inputType: 'single_item',
      fieldRoleMap: { reference: 'evidence', text: 'input', gold_answer: 'output' },
      outputs: [
        output('free_text', {
          input_instruction: '請閱讀以下文章',
          output_instruction: '請用一句話摘要文章重點',
          max_length: 256,
          allow_bypass: true,
        }),
      ],
    },
    T010: {
      selectedCategories: ['sequence'],
      inputType: 'single_item',
      fieldRoleMap: { text: 'input', entities: 'output', triples: 'output' },
      outputs: [
        output('entity_recognition', {
          entities: [
            { name: 'BODY', color: '#4A90D9' },
            { name: 'DISE', color: '#E74C3C' },
            { name: 'SYMP', color: '#F39C12' },
            { name: 'DRUG', color: '#2ECC71' },
            { name: 'EXAM', color: '#E67E22' },
            { name: 'TREAT', color: '#3498DB' },
          ],
          allow_overlapping: false,
          allow_bypass: true,
        }),
        output('relation_identification', {
          relation_types: [
            'bodyLocation',
            'causes',
            'adverseOutcome',
            'typicalTest',
            'diagnosis',
            'possibleTreatment',
          ],
          source_output: 'entity_recognition',
          allow_bypass: true,
        }),
      ],
    },
    T011: {
      selectedCategories: ['classification'],
      inputType: 'item_pair',
      fieldRoleMap: {
        Evidence: 'evidence',
        Premise: 'input',
        Hypothesis: 'input',
        Label: 'output',
      },
      outputs: [
        output('single_label', {
          label_options: [
            { name: 'entailment', color: '#2ECC71' },
            { name: 'neutral', color: '#F39C12' },
            { name: 'contradiction', color: '#E74C3C' },
          ],
          allow_bypass: true,
        }),
      ],
    },
    T012: {
      selectedCategories: ['generation'],
      inputType: 'single_item',
      fieldRoleMap: {
        background: 'evidence',
        question: 'input',
        answer: 'output',
      },
      outputs: [
        output('free_text', {
          input_instruction: '請閱讀背景知識與問題',
          output_instruction: '請根據背景知識回答問題',
          max_length: 512,
          allow_bypass: true,
        }),
      ],
    },
    T013: {
      selectedCategories: ['sequence', 'regression'],
      inputType: 'single_item',
      fieldRoleMap: {
        utterances: 'evidence',
        text: 'input',
        gold_triplets: 'output',
        incomplete_annotations: 'output',
      },
      outputs: catalog.clone(catalog.canonicalAbsaTemplate.outputs),
    },
  };

  var datasetTotals = {
    T001: 5,
    T002: 5,
    T003: 5,
    T004: 5,
    T005: 5,
    T006: 4,
    T007: 3,
    T008: 3,
    T009: 3,
    T010: 3,
    T011: 3,
    T012: 3,
    T013: 1,
  };

  function normalizeExtensionTask(seed) {
    var rawOutputs = Array.isArray(seed.outputs) ? seed.outputs : [];
    return {
      id: seed.id,
      nameZh: seed.nameZh,
      nameEn: seed.nameEn,
      sourceFile: seed.sourceFile,
      status: seed.status || 'draft',
      updatedAt: seed.updatedAt || '2026-07-29',
      selectedCategories: catalog.clone(seed.selectedCategories || []),
      inputType: seed.inputType || 'single_item',
      fieldRoleMap: catalog.clone(seed.fieldRoleMap || {}),
      outputs: rawOutputs.map(function (item) {
        return output(item.type, item.config || {});
      }),
      dataset: catalog.clone(seed.dataset || {
        total: 0,
        files: [],
        columns: Object.keys(seed.fieldRoleMap || {}),
      }),
    };
  }

  var tasks = listData.tasks.map(function (listTask) {
    var config = configByTaskId[listTask.id];
    if (!config) return null;
    return normalizeExtensionTask({
      id: listTask.id,
      nameZh: listTask.nameZh,
      nameEn: listTask.nameEn,
      sourceFile: listTask.sourceFile,
      status: listTask.status,
      updatedAt: listTask.updatedAt,
      selectedCategories: config.selectedCategories,
      inputType: config.inputType,
      fieldRoleMap: config.fieldRoleMap,
      outputs: config.outputs,
      dataset: {
        total: datasetTotals[listTask.id] || 0,
        files: [
          {
            name: listTask.sourceFile,
            size: 256 + (datasetTotals[listTask.id] || 0) * 64,
          },
        ],
        columns: Object.keys(config.fieldRoleMap),
      },
    });
  }).filter(function (task) {
    return Boolean(task);
  });

  (global.LabelSuiteTaskDetailDataExtensions || []).forEach(function (seed) {
    tasks.push(normalizeExtensionTask(seed));
  });

  function getTask(taskId) {
    var found = tasks.find(function (task) {
      return task.id === taskId;
    });
    return found ? catalog.clone(found) : null;
  }

  global.LabelSuiteTaskDetailData = {
    tasks: tasks,
    getTask: getTask,
    normalizeExtensionTask: normalizeExtensionTask,
  };
}(window));

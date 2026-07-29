(function (global) {
  'use strict';

  /* Output-type registry (ADR-029 composition model). */
  var outputTypes = {
    /* Sequence */
    sequence_tagging: {
      zh: '序列標註', en: 'Sequence Tagging',
      source_output: null,
      rendersInputPreview: true,
      fields: [
        {
          key: 'tokenization',
          valueKey: 'unit',
          type: 'select',
          zh: '標記單位',
          en: 'Token unit',
          testId: 'sequence-token-unit-select',
          required: true,
          options: ['character', 'word'],
          optionLabels: {
            zh: { character: '字（Character）', word: '詞（Word）' },
            en: { character: 'Character', word: 'Word' },
          },
        },
        { key: 'entities', type: 'entity-list', zh: '標籤類型', en: 'Label types', required: true, addLabel_zh: '新增標籤類型', addLabel_en: 'Add label type' },
        {
          key: 'tagging_scheme',
          type: 'select',
          zh: '標記方案',
          en: 'Tagging scheme',
          testId: 'sequence-tagging-scheme-select',
          required: true,
          options: ['BIO', 'BIOES', 'IOB2', 'SINGLE'],
          optionLabels: {
            zh: { BIO: 'BIO', BIOES: 'BIOES', IOB2: 'IOB2', SINGLE: '單一標籤' },
            en: { BIO: 'BIO', BIOES: 'BIOES', IOB2: 'IOB2', SINGLE: 'Single label' },
          },
          defaultValue: 'BIO',
        },
      ],
      defaultConfig: {
        entities: [
          { name: 'PER', color: '#FF6B6B' },
          { name: 'ORG', color: '#4ECDC4' },
          { name: 'LOC', color: '#45B7D1' },
        ],
        tagging_scheme: 'BIO',
        tokenization: {
          unit: 'character',
          mode: 'unit_based',
          punctuation: 'separate',
          version: 2,
        },
      },
      normalizeConfig: function (config) {
        var tokenization = config.tokenization && typeof config.tokenization === 'object' && !Array.isArray(config.tokenization)
          ? config.tokenization
          : {};
        config.tokenization = {
          unit: tokenization.unit === 'word' ? 'word' : 'character',
          mode: 'unit_based',
          punctuation: 'separate',
          version: 2,
        };
        return config;
      },
    },
    entity_recognition: {
      zh: '實體辨識', en: 'Entity Recognition',
      source_output: null,
      rendersInputPreview: true,
      fields: [
        { key: 'entities', type: 'entity-list', zh: '實體類型', en: 'Entity types', required: true, addLabel_zh: '新增實體類型', addLabel_en: 'Add entity type' },
        { key: 'allow_overlapping', type: 'boolean', zh: '允許重疊標記', en: 'Allow overlapping spans', required: false, defaultValue: false },
      ],
      defaultConfig: {
        entities: [
          { name: 'target', color: '#FF6B6B' },
          { name: 'aspect', color: '#4ECDC4' },
          { name: 'opinion', color: '#45B7D1' },
        ],
        allow_overlapping: true,
      },
    },
    relation_identification: {
      zh: '關係識別', en: 'Relation Identification',
      source_output: 'entity_recognition',
      rendersInputPreview: true,
      fields: [
        { key: 'relation_types', type: 'tag-list', zh: '語意類型標籤', en: 'Semantic relation types', required: false, hint_zh: '輸入語意類型（如 causes、bodyLocation）後按 Enter', hint_en: 'Type semantic relation type (e.g. causes, bodyLocation) and press Enter', placeholder_zh: '', placeholder_en: '' },
      ],
      defaultConfig: {
        relation_types: [],
      },
    },
    /* Classification */
    single_label: {
      zh: '單一標籤', en: 'Single label',
      source_output: null,
      fields: [
        { key: 'label_options', type: 'entity-list', zh: '標籤選項', en: 'Label options', required: true, addLabel_zh: '新增標籤', addLabel_en: 'Add label' },
      ],
      defaultConfig: {
        label_options: [
          { name: 'positive', color: '#2ECC71' },
          { name: 'neutral', color: '#F39C12' },
          { name: 'negative', color: '#E74C3C' },
        ],
      },
    },
    multi_label: {
      zh: '多標籤', en: 'Multi-label',
      source_output: null,
      fields: [
        { key: 'label_options', type: 'taxonomy-tree', zh: '標籤選項', en: 'Label options', required: true, addLabel_zh: '新增根標籤', addLabel_en: 'Add root label' },
        { key: 'max_selections', type: 'number', zh: '最多可選數量（0 = 不限）', en: 'Max selections (0 = unlimited)', required: false, defaultValue: 0, min: 0 },
      ],
      defaultConfig: {
        label_options: [
          {
            id: 'emotion', name: 'emotion', children: [
              {
                id: 'positive', name: 'positive', children: [
                  { id: 'happy', name: 'happy', color: '#10B981' },
                ],
              },
              {
                id: 'negative', name: 'negative', children: [
                  { id: 'sad', name: 'sad', color: '#6366F1' },
                  { id: 'angry', name: 'angry', color: '#E74C3C' },
                ],
              },
            ],
          },
          { id: 'surprise', name: 'surprise', color: '#F39C12' },
        ],
        max_selections: 0,
      },
    },
    /* Regression */
    single_dim: {
      zh: '單維度回歸', en: 'Single-dimensional regression',
      source_output: null,
      dimensionSettings: {
        mode: 'single',
        nameKey: 'dimension_name',
        minKey: 'min',
        maxKey: 'max',
        stepKey: 'step',
      },
      fields: [
        { key: 'dimension_name', type: 'text', zh: '維度名稱', en: 'Dimension name', required: true, defaultValue: 'score' },
        { key: 'min', type: 'number', zh: '最小值', en: 'Min value', required: true, defaultValue: 1, min: -100 },
        { key: 'max', type: 'number', zh: '最大值', en: 'Max value', required: true, defaultValue: 5, min: -100 },
        { key: 'step', type: 'number', zh: '間距', en: 'Step', required: true, defaultValue: 1, min: 0.01 },
      ],
      defaultConfig: {
        dimension_name: 'score',
        min: 1, max: 5, step: 1,
      },
    },
    multi_dim: {
      zh: '多維度回歸', en: 'Multi-dimensional regression',
      source_output: null,
      dimensionSettings: {
        mode: 'multiple',
        collectionKey: 'dimensions',
      },
      fields: [
        { key: 'dimensions', type: 'va-dimensions', zh: '維度設定', en: 'Dimension settings', required: true },
      ],
      defaultConfig: {
        dimensions: [
          { name: 'valence', min: 1, max: 9, step: 1 },
          { name: 'arousal', min: 1, max: 9, step: 1 },
        ],
      },
    },
    /* Generation */
    free_text: {
      zh: '自由文字', en: 'Free text',
      source_output: null,
      rendersEvidencePreview: true,
      rendersInputPreview: true,
      fields: [
        {
          key: 'input_instruction',
          type: 'text',
          zh: '輸入區說明',
          en: 'Input section instruction',
          required: true,
          defaultValue: '請閱讀以下內容',
          defaultValue_zh: '請閱讀以下內容',
          defaultValue_en: 'Read the following content',
          maxLength: 100,
          hint_zh: '顯示在輸入內容上方，告訴標記員要閱讀或處理什麼。例：請閱讀以下文章',
          hint_en: 'Shown above the input content to explain what annotators should read or process. Example: Read the following article',
        },
        {
          key: 'output_instruction',
          type: 'text',
          zh: '作答區說明',
          en: 'Response section instruction',
          required: true,
          defaultValue: '請輸入回答',
          defaultValue_zh: '請輸入回答',
          defaultValue_en: 'Enter your response',
          maxLength: 100,
          hint_zh: '顯示在自由文字欄位上方，告訴標記員要輸入什麼。例：請用一句話摘要文章重點',
          hint_en: 'Shown above the free-text field to explain what annotators should enter. Example: Summarize the article in one sentence',
        },
        { key: 'max_length', type: 'number', zh: '最大字數', en: 'Max length', required: false, defaultValue: 512, min: 1 },
      ],
      retiredConfigKeys: ['show_reference', 'show_reference_to_annotator'],
      defaultConfig: {
        input_instruction: '請閱讀以下內容',
        output_instruction: '請輸入回答',
        max_length: 512,
      },
    },
  };

  /*
   * Every output type supports an optional unable-to-determine response.
   * Apply this once here so all consumers receive the same augmented schema.
   */
  var bypassField = {
    key: 'allow_bypass',
    type: 'boolean',
    zh: '允許無法判定 (Bypass)',
    en: 'Allow bypass (unable to determine)',
    required: false,
    defaultValue: true,
  };
  Object.keys(outputTypes).forEach(function (outputKey) {
    outputTypes[outputKey].fields.push(Object.assign({}, bypassField));
    outputTypes[outputKey].defaultConfig.allow_bypass = true;
  });

  var outputDependencies = {
    relation_identification: 'entity_recognition',
  };

  /* Canonical ABSA multi-output template (ADR-029 example). */
  var canonicalAbsaTemplate = {
    input_type: 'single_item',
    outputs: [
      {
        type: 'entity_recognition',
        config: {
          entities: [
            { name: 'target', color: '#FF6B6B' },
            { name: 'aspect', color: '#4ECDC4' },
            { name: 'opinion', color: '#45B7D1' },
          ],
          allow_overlapping: true,
        },
      },
      {
        type: 'relation_identification',
        config: {
          relation_types: ['has_aspect', 'has_opinion', 'sentiment_of'],
          source_output: 'entity_recognition',
        },
      },
      {
        type: 'multi_dim',
        config: {
          dimensions: [
            { name: 'valence', min: 1, max: 9, step: 1 },
            { name: 'arousal', min: 1, max: 9, step: 1 },
          ],
        },
      },
    ],
  };

  var taxonomy = {
    classification: {
      zh: '分類（Classification）', en: 'Classification',
      outputSelection: 'single',
      granularities: {
        single_item: {
          zh: '單一項目', en: 'Single item',
          subtypes: {
            single_label: { registryKey: 'single_sentence_classification', zh: '單一標籤', en: 'Single label' },
            multi_label: { registryKey: 'single_sentence_classification', zh: '多標籤', en: 'Multi-label' },
          },
        },
        item_pair: {
          zh: '項目對', en: 'Item pair',
          subtypes: {
            single_label: { registryKey: 'sentence_pairs', zh: '單一標籤', en: 'Single label' },
            multi_label: { registryKey: 'sentence_pairs', zh: '多標籤', en: 'Multi-label' },
          },
        },
      },
    },
    regression: {
      zh: '回歸（Regression）', en: 'Regression',
      outputSelection: 'single',
      granularities: {
        single_item: {
          zh: '單一項目', en: 'Single item',
          subtypes: {
            single_dim: { registryKey: 'single_sentence_va_scoring', zh: '單維度', en: 'Single dimension' },
            multi_dim: { registryKey: 'single_sentence_va_scoring', zh: '多維度', en: 'Multi-dimension' },
          },
        },
        item_pair: {
          zh: '項目對', en: 'Item pair',
          subtypes: {
            single_dim: { registryKey: 'single_sentence_va_scoring', zh: '單維度', en: 'Single dimension' },
            multi_dim: { registryKey: 'single_sentence_va_scoring', zh: '多維度', en: 'Multi-dimension' },
          },
        },
      },
    },
    sequence: {
      zh: '序列（Sequence）', en: 'Sequence',
      outputSelection: 'multiple',
      granularities: {
        single_item: {
          zh: '單一項目', en: 'Single item',
          subtypes: {
            sequence_tagging: { registryKey: 'sequence_labeling', zh: '序列標註', en: 'Sequence Tagging' },
            entity_recognition: { registryKey: 'sequence_labeling', zh: '實體辨識', en: 'Entity Recognition' },
            relation_identification: { registryKey: 'relation_extraction', zh: '關係識別', en: 'Relation Identification' },
          },
        },
      },
    },
    generation: {
      zh: '生成（Generation）', en: 'Generation',
      outputSelection: 'multiple',
      granularities: {
        single_item: {
          zh: '單一項目', en: 'Single item',
          subtypes: {
            free_text: { registryKey: 'generation_single_item_free_text', zh: '自由文字', en: 'Free text' },
          },
        },
      },
    },
  };

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function localizedValue(definition, lang, fallback) {
    if (!definition) return fallback;
    var language = lang === 'en' ? 'en' : 'zh';
    return definition[language] || definition.zh || definition.en || fallback;
  }

  function ownValue(record, key) {
    if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return null;
    return record[key];
  }

  function getOutputDefinition(key) {
    return ownValue(outputTypes, key);
  }

  function setConfigFieldValue(config, field, value) {
    if (!field.valueKey) {
      config[field.key] = value;
      return;
    }
    if (!config[field.key] || typeof config[field.key] !== 'object' || Array.isArray(config[field.key])) {
      config[field.key] = {};
    }
    config[field.key][field.valueKey] = value;
  }

  function getDefaultOutputConfig(key, lang) {
    var outputDefinition = getOutputDefinition(key);
    if (!outputDefinition) return {};
    var language = lang === 'en' ? 'en' : 'zh';
    var defaults = clone(outputDefinition.defaultConfig || {});
    outputDefinition.fields.forEach(function (field) {
      var localizedDefaultKey = 'defaultValue_' + language;
      var value = Object.prototype.hasOwnProperty.call(field, localizedDefaultKey)
        ? field[localizedDefaultKey]
        : field.defaultValue;
      if (value !== undefined) {
        setConfigFieldValue(defaults, field, clone(value));
      }
    });
    return defaults;
  }

  function getOutputLabel(key, lang) {
    return localizedValue(getOutputDefinition(key), lang, key);
  }

  function getCategoryLabel(key, lang) {
    return localizedValue(ownValue(taxonomy, key), lang, key);
  }

  function getInputTypeLabel(key, lang) {
    var categoryKeys = Object.keys(taxonomy);
    for (var i = 0; i < categoryKeys.length; i += 1) {
      var granularity = ownValue(taxonomy[categoryKeys[i]].granularities, key);
      if (granularity) return localizedValue(granularity, lang, key);
    }
    return key;
  }

  function getCategoryOutputKeys(categoryKey, inputType) {
    var category = ownValue(taxonomy, categoryKey);
    var granularity = category && ownValue(category.granularities, inputType);
    return granularity ? Object.keys(granularity.subtypes || {}) : [];
  }

  function yamlScalar(value) {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      if (
        value === '' ||
        /^\s|\s$/.test(value) ||
        /[:#\[\]{},|>&*!'"@`\n]/.test(value) ||
        /^(?:true|false|null|~|[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)$/i.test(value)
      ) return JSON.stringify(value);
      return value;
    }
    return String(value);
  }

  function toYaml(value) {
    var lines = [];
    function plainObject(item) {
      return !!item && typeof item === 'object' && !Array.isArray(item);
    }
    function writeComplex(label, child, childIndent) {
      if (Array.isArray(child)) {
        if (child.length === 0) lines.push(label + ' []');
        else {
          lines.push(label);
          writeArray(child, childIndent);
        }
      } else if (plainObject(child)) {
        if (Object.keys(child).length === 0) lines.push(label + ' {}');
        else {
          lines.push(label);
          writeMap(child, childIndent);
        }
      } else {
        lines.push(label + ' ' + yamlScalar(child));
      }
    }
    function writeMap(obj, indent) {
      Object.keys(obj).forEach(function (key) {
        if (obj[key] === undefined || key.charAt(0) === '_') return;
        writeComplex(indent + key + ':', obj[key], indent + '  ');
      });
    }
    function writeArray(array, indent) {
      array.forEach(function (item) {
        if (plainObject(item)) {
          var keys = Object.keys(item).filter(function (key) {
            return item[key] !== undefined && key.charAt(0) !== '_';
          });
          if (keys.length === 0) {
            lines.push(indent + '- {}');
            return;
          }
          keys.forEach(function (key, index) {
            writeComplex((index === 0 ? indent + '- ' : indent + '  ') + key + ':', item[key], indent + '    ');
          });
        } else if (Array.isArray(item)) {
          if (item.length === 0) lines.push(indent + '- []');
          else {
            lines.push(indent + '-');
            writeArray(item, indent + '  ');
          }
        } else {
          lines.push(indent + '- ' + yamlScalar(item));
        }
      });
    }
    if (Array.isArray(value)) writeArray(value, '');
    else writeMap(value, '');
    return lines.join('\n');
  }

  function yamlParseScalar(raw) {
    var value = String(raw || '').trim();
    if (value === '') return '';
    if (value === '[]') return [];
    if (value === '{}') return {};
    if (value === 'null' || value === '~') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(value)) return Number(value);
    if (
      (value[0] === '"' && value[value.length - 1] === '"') ||
      (value[0] === "'" && value[value.length - 1] === "'")
    ) {
      if (value[0] === "'") return value.slice(1, -1).replace(/''/g, "'");
      return JSON.parse(value);
    }
    return value;
  }

  function yamlIndentOf(line) {
    return line.length - line.replace(/^\s+/, '').length;
  }

  function yamlSplitKeyVal(text) {
    var single = false;
    var double = false;
    var escaped = false;
    for (var index = 0; index < text.length; index += 1) {
      var character = text.charAt(index);
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\' && double) {
        escaped = true;
        continue;
      }
      if (character === "'" && !double) single = !single;
      else if (character === '"' && !single) double = !double;
      else if (
        character === ':' &&
        !single &&
        !double &&
        (index === text.length - 1 || /\s/.test(text.charAt(index + 1)))
      ) {
        return {
          key: text.slice(0, index).trim(),
          value: text.slice(index + 1).trim(),
        };
      }
    }
    return null;
  }

  function parseYaml(text) {
    var rows = [];
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (line, lineIndex) {
      if (!line.trim() || /^\s*#/.test(line)) return;
      if (line.indexOf('\t') >= 0) {
        throw new Error('YAML tabs are not supported (line ' + (lineIndex + 1) + ')');
      }
      var indent = yamlIndentOf(line);
      if (indent % 2 !== 0) {
        throw new Error('YAML indentation must use two spaces (line ' + (lineIndex + 1) + ')');
      }
      rows.push({ indent: indent, text: line.trim(), line: lineIndex + 1 });
    });
    if (rows.length === 0) return {};
    var cursor = 0;

    function assignEntry(target, keyValue, mapIndent) {
      if (!keyValue || !keyValue.key) {
        throw new Error('Invalid YAML mapping on line ' + rows[cursor - 1].line);
      }
      if (keyValue.value !== '') {
        target[keyValue.key] = yamlParseScalar(keyValue.value);
        return;
      }
      if (cursor < rows.length && rows[cursor].indent > mapIndent) {
        if (rows[cursor].indent !== mapIndent + 2) {
          throw new Error('Invalid YAML nesting on line ' + rows[cursor].line);
        }
        target[keyValue.key] = parseNode(mapIndent + 2);
      } else {
        target[keyValue.key] = '';
      }
    }

    function parseMap(indent, target) {
      var map = target || {};
      while (
        cursor < rows.length &&
        rows[cursor].indent === indent &&
        rows[cursor].text.charAt(0) !== '-'
      ) {
        var row = rows[cursor];
        var keyValue = yamlSplitKeyVal(row.text);
        cursor += 1;
        assignEntry(map, keyValue, indent);
      }
      return map;
    }

    function parseSequence(indent) {
      var array = [];
      while (
        cursor < rows.length &&
        rows[cursor].indent === indent &&
        rows[cursor].text.charAt(0) === '-'
      ) {
        var row = rows[cursor];
        var rest = row.text.slice(1).trim();
        cursor += 1;
        if (!rest) {
          if (cursor >= rows.length || rows[cursor].indent !== indent + 2) {
            throw new Error('Invalid YAML sequence on line ' + row.line);
          }
          array.push(parseNode(indent + 2));
          continue;
        }
        var keyValue = yamlSplitKeyVal(rest);
        if (!keyValue) {
          array.push(yamlParseScalar(rest));
          continue;
        }
        var item = {};
        assignEntry(item, keyValue, indent + 2);
        if (
          cursor < rows.length &&
          rows[cursor].indent === indent + 2 &&
          rows[cursor].text.charAt(0) !== '-'
        ) {
          parseMap(indent + 2, item);
        }
        array.push(item);
      }
      return array;
    }

    function parseNode(indent) {
      if (cursor >= rows.length || rows[cursor].indent !== indent) {
        throw new Error('Invalid YAML nesting');
      }
      return rows[cursor].text.charAt(0) === '-'
        ? parseSequence(indent)
        : parseMap(indent);
    }

    var result = parseNode(rows[0].indent);
    if (rows[0].indent !== 0 || cursor !== rows.length) {
      var invalidRow = rows[cursor] || rows[0];
      throw new Error('Invalid YAML indentation on line ' + invalidRow.line);
    }
    return result;
  }

  global.LabelSuiteTaskConfigCatalog = {
    taxonomy: taxonomy,
    outputTypes: outputTypes,
    outputDependencies: outputDependencies,
    canonicalAbsaTemplate: canonicalAbsaTemplate,
    bypassField: bypassField,
    clone: clone,
    getOutputDefinition: getOutputDefinition,
    getDefaultOutputConfig: getDefaultOutputConfig,
    getOutputLabel: getOutputLabel,
    getCategoryLabel: getCategoryLabel,
    getInputTypeLabel: getInputTypeLabel,
    getCategoryOutputKeys: getCategoryOutputKeys,
    toYaml: toYaml,
    parseYaml: parseYaml,
  };
})(window);

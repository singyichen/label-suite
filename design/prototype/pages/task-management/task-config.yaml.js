/* task-config.yaml.js
 * YAML subset serializer/parser for the shared task-config engine's code
 * editor (Step 2's YAML <-> JSON tabs). No DOM access.
 * Depends on: state, REGISTRY, OUTPUT_TYPE_REGISTRY, getOutputConfigFieldValue
 * (from task-config.data.js). Loaded after task-config.data.js.
 */

/* ── YAML serialiser (no user data injected via innerHTML) ────── */
function yamlScalar(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (
      v === '' ||
      /^\s|\s$/.test(v) ||
      /[:#\[\]{},|>&*!'"@`\n]/.test(v) ||
      /^(?:true|false|null|~|[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)$/i.test(v)
    ) return JSON.stringify(v);
    return v;
  }
  return String(v);
}
function toYaml(value) {
  var lines = [];
  function plainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function writeComplex(label, child, childIndent) {
    if (Array.isArray(child)) {
      if (child.length === 0) lines.push(label + ' []');
      else { lines.push(label); writeArray(child, childIndent); }
    } else if (plainObject(child)) {
      if (Object.keys(child).length === 0) lines.push(label + ' {}');
      else { lines.push(label); writeMap(child, childIndent); }
    } else {
      lines.push(label + ' ' + yamlScalar(child));
    }
  }
  function writeMap(obj, indent) {
    Object.keys(obj).forEach(function(key) {
      if (obj[key] === undefined || key.charAt(0) === '_') return;
      writeComplex(indent + key + ':', obj[key], indent + '  ');
    });
  }
  function writeArray(arr, indent) {
    arr.forEach(function(item) {
      if (plainObject(item)) {
        var keys = Object.keys(item).filter(function(key) { return item[key] !== undefined && key.charAt(0) !== '_'; });
        if (keys.length === 0) { lines.push(indent + '- {}'); return; }
        keys.forEach(function(key, index) {
          writeComplex((index === 0 ? indent + '- ' : indent + '  ') + key + ':', item[key], indent + '    ');
        });
      } else if (Array.isArray(item)) {
        if (item.length === 0) lines.push(indent + '- []');
        else { lines.push(indent + '-'); writeArray(item, indent + '  '); }
      } else {
        lines.push(indent + '- ' + yamlScalar(item));
      }
    });
  }
  if (Array.isArray(value)) writeArray(value, '');
  else writeMap(value, '');
  return lines.join('\n');
}
function configToCode() {
  /* ADR-029: output-type composition — always produce unified outputs[] config */
  if (state.selectedOutputTypes.length >= 1) {
    var unifiedConfig = {
      input_type: (state.taskInputTypes && state.taskInputTypes[0]) || 'single_item',
      outputs: state.selectedOutputTypes.map(function(outKey) {
        var cfg = state.outputConfigs[outKey] || {};
        var outReg = OUTPUT_TYPE_REGISTRY[outKey];
        var finalCfg = {};
        var defaultCfg = getOutputTypeDefaultConfig(outKey, state.lang);
        if (outReg) {
          Object.keys(defaultCfg).forEach(function(k) {
            finalCfg[k] = cfg[k] !== undefined ? cfg[k] : defaultCfg[k];
          });
        }
        Object.keys(cfg).forEach(function(k) { if (k[0] !== '_') finalCfg[k] = cfg[k]; });
        if (outReg && Array.isArray(outReg.retiredConfigKeys)) {
          outReg.retiredConfigKeys.forEach(function(k) { delete finalCfg[k]; });
        }
        if (outReg && outReg.source_output) {
          if (state.selectedOutputTypes.indexOf(outReg.source_output) >= 0) {
            finalCfg.source_output = outReg.source_output;
          } else {
            delete finalCfg.source_output;
          }
        }
        return { type: outKey, config: finalCfg };
      }),
    };
    if (state.codeFormat === 'json') return JSON.stringify(unifiedConfig, null, 2);
    return toYaml(unifiedConfig);
  }
  /* Single-output: backward compatible */
  if (state.codeFormat === 'json') return JSON.stringify(state.configData, null, 2);
  return toYaml(state.configData);
}

/* ── YAML parser (subset for prototype) ───────────────────────── */
function yamlParseScalar(raw) {
  var val = String(raw || '').trim();
  if (val === '') return '';
  if (val === '[]') return [];
  if (val === '{}') return {};
  if (val === 'null' || val === '~') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(val)) return Number(val);
  if ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'")) {
    if (val[0] === "'") return val.slice(1, -1).replace(/''/g, "'");
    return JSON.parse(val);
  }
  return val;
}
function yamlIndentOf(line) { return line.length - line.replace(/^\s+/, '').length; }
function yamlSplitKeyVal(text) {
  var single = false, double = false, escaped = false;
  for (var idx = 0; idx < text.length; idx++) {
    var char = text.charAt(idx);
    if (escaped) { escaped = false; continue; }
    if (char === '\\' && double) { escaped = true; continue; }
    if (char === "'" && !double) single = !single;
    else if (char === '"' && !single) double = !double;
    else if (char === ':' && !single && !double && (idx === text.length - 1 || /\s/.test(text.charAt(idx + 1)))) {
      return { key: text.slice(0, idx).trim(), value: text.slice(idx + 1).trim() };
    }
  }
  return null;
}
function parseYamlSubset(text) {
  var rows = [];
  String(text || '').replace(/\r/g, '').split('\n').forEach(function(line, lineIndex) {
    if (!line.trim() || /^\s*#/.test(line)) return;
    if (line.indexOf('\t') >= 0) throw new Error('YAML tabs are not supported (line ' + (lineIndex + 1) + ')');
    var indent = yamlIndentOf(line);
    if (indent % 2 !== 0) throw new Error('YAML indentation must use two spaces (line ' + (lineIndex + 1) + ')');
    rows.push({ indent: indent, text: line.trim(), line: lineIndex + 1 });
  });
  if (rows.length === 0) return {};
  var cursor = 0;

  function assignEntry(target, kv, mapIndent) {
    if (!kv || !kv.key) throw new Error('Invalid YAML mapping on line ' + rows[cursor - 1].line);
    if (kv.value !== '') { target[kv.key] = yamlParseScalar(kv.value); return; }
    if (cursor < rows.length && rows[cursor].indent > mapIndent) {
      if (rows[cursor].indent !== mapIndent + 2) throw new Error('Invalid YAML nesting on line ' + rows[cursor].line);
      target[kv.key] = parseNode(mapIndent + 2);
    } else {
      target[kv.key] = '';
    }
  }
  function parseMap(indent, target) {
    var map = target || {};
    while (cursor < rows.length && rows[cursor].indent === indent && rows[cursor].text.charAt(0) !== '-') {
      var row = rows[cursor];
      var kv = yamlSplitKeyVal(row.text);
      cursor += 1;
      assignEntry(map, kv, indent);
    }
    return map;
  }
  function parseSequence(indent) {
    var array = [];
    while (cursor < rows.length && rows[cursor].indent === indent && rows[cursor].text.charAt(0) === '-') {
      var row = rows[cursor];
      var rest = row.text.slice(1).trim();
      cursor += 1;
      if (!rest) {
        if (cursor >= rows.length || rows[cursor].indent !== indent + 2) throw new Error('Invalid YAML sequence on line ' + row.line);
        array.push(parseNode(indent + 2));
        continue;
      }
      var kv = yamlSplitKeyVal(rest);
      if (!kv) { array.push(yamlParseScalar(rest)); continue; }
      var item = {};
      assignEntry(item, kv, indent + 2);
      if (cursor < rows.length && rows[cursor].indent === indent + 2 && rows[cursor].text.charAt(0) !== '-') {
        parseMap(indent + 2, item);
      }
      array.push(item);
    }
    return array;
  }
  function parseNode(indent) {
    if (cursor >= rows.length || rows[cursor].indent !== indent) throw new Error('Invalid YAML nesting');
    return rows[cursor].text.charAt(0) === '-' ? parseSequence(indent) : parseMap(indent);
  }

  var result = parseNode(rows[0].indent);
  if (rows[0].indent !== 0 || cursor !== rows.length) {
    var bad = rows[cursor] || rows[0];
    throw new Error('Invalid YAML indentation on line ' + bad.line);
  }
  return result;
}

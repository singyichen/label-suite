/* task-config.dataset.js
 * Dataset ingestion pipeline for the shared task-config engine: JSON/JSONL
 * parsing, record-source detection, per-column field profiling, cell
 * type/label formatting.
 * No DOM access.
 * Depends on: state, t (from task-config.data.js / host page). Loaded after
 * task-config.data.js and task-config.yaml.js.
 */

/* ── Dataset upload ──────────────────────────────────────────── */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

var DATASET_ALLOWED = ['.json'];

function previewCellValue(val) {
  if (val === undefined || val === null) return '';
  if (Array.isArray(val)) {
    return (state.lang === 'en' ? 'Array · ' : '陣列 · ') + val.length + (state.lang === 'en' ? ' items' : ' 筆');
  }
  if (typeof val === 'object') {
    var keys = Object.keys(val);
    return '{' + keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '') + '}';
  }
  return String(val);
}

/* Normalize a cell value to a label string: short strings pass through and
   scalar numbers/booleans (e.g. 0/1 class labels) are stringified; otherwise null */
function scalarLabelValue(v) {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return (typeof v === 'string' && v.length <= 100) ? v : null;
}

function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

/* Parse file text as JSON; fall back to JSON Lines (one object per line) */
function parseDatasetText(text) {
  try { return JSON.parse(text); } catch (ex) {}
  var lines = text.split(/\r?\n/).filter(function(l) { return l.trim() !== ''; });
  if (lines.length > 1) {
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      try { rows.push(JSON.parse(lines[i])); } catch (ex2) { return null; }
    }
    return rows;
  }
  return null;
}

/* Record detection: walk the tree (depth ≤ 3) collecting arrays whose elements
   are ≥80% plain objects. Score = count × key consistency ÷ (depth+1) — favors
   large, homogeneous, shallow arrays. Candidate arrays are not descended into,
   except short wrapper arrays (≤3 items) which may hide the real records. */
function collectRecordCandidates(root) {
  var out = [];
  function keyConsistency(arr) {
    var sample = arr.slice(0, 50).filter(isPlainObject);
    if (sample.length < 2) return 1;
    var base = Object.keys(sample[0]);
    var sum = 0;
    sample.forEach(function(o) {
      var keys = Object.keys(o);
      var inter = keys.filter(function(k) { return base.indexOf(k) !== -1; }).length;
      var union = base.length + keys.length - inter;
      sum += union === 0 ? 1 : inter / union;
    });
    return sum / sample.length;
  }
  function walk(node, path, depth) {
    if (depth > 3) return;
    if (Array.isArray(node)) {
      if (node.length > 0 && node.filter(isPlainObject).length / node.length >= 0.8) {
        /* log-damped count so a large nested array (e.g. per-record utterances)
           cannot outscore a small root record array purely on element count */
        out.push({ path: path, count: node.length, score: Math.log2(node.length + 1) * keyConsistency(node) / (depth + 1) });
        if (node.length <= 3) walk(node[0], path + '[0]', depth + 1);
      }
    } else if (isPlainObject(node)) {
      Object.keys(node).forEach(function(k) { walk(node[k], path + '.' + k, depth + 1); });
    }
  }
  walk(root, '$', 0);
  if (out.length === 0 && isPlainObject(root)) {
    out.push({ path: '$', count: 1, score: 0 });
  }
  out.sort(function(a, b) { return b.score - a.score; });
  return out;
}

function extractRecordsAtPath(root, path) {
  var node = root;
  var tokens = path.replace(/^\$/, '').match(/\.[^.\[]+|\[\d+\]/g) || [];
  for (var i = 0; i < tokens.length; i++) {
    if (node === undefined || node === null) return null;
    var tk = tokens[i];
    node = tk.charAt(0) === '.' ? node[tk.slice(1)] : node[parseInt(tk.slice(1, -1), 10)];
  }
  if (Array.isArray(node)) return node.filter(isPlainObject);
  if (isPlainObject(node)) return [node];
  return null;
}

/* Empty = missing key, null, blank string, empty array/object; 0/false count as present */
function isEmptyCellValue(v) {
  return v === undefined || v === null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0) ||
    (isPlainObject(v) && Object.keys(v).length === 0);
}

function cellTypeKey(v) {
  if (Array.isArray(v)) return 'typeArray';
  if (isPlainObject(v)) return 'typeObject';
  if (typeof v === 'number') return 'typeNumber';
  if (typeof v === 'boolean') return 'typeBoolean';
  return 'typeString';
}

/* One-pass field profile over ALL records: columns = union of top-level keys;
   per column count present/missing, capture up to 50 missing-record refs
   (record id when the dataset has one, else row number) and a type summary */
function buildFieldProfile(records) {
  /* Object.create(null): plain {} would treat columns named after
     Object.prototype members (constructor, toString, …) as already seen
     and silently drop them from the profile. */
  var cols = [], seen = Object.create(null);
  records.forEach(function(r) {
    Object.keys(r).forEach(function(k) { if (!seen[k]) { seen[k] = true; cols.push(k); } });
  });
  var profile = Object.create(null);
  cols.forEach(function(c) { profile[c] = { present: 0, missing: 0, missingRefs: [], types: {} }; });
  records.forEach(function(r, i) {
    cols.forEach(function(c) {
      var p = profile[c], v = r[c];
      if (isEmptyCellValue(v)) {
        p.missing++;
        if (p.missingRefs.length < 50) {
          p.missingRefs.push(seen['id'] && !isEmptyCellValue(r.id) ? String(r.id) : '#' + (i + 1));
        }
      } else {
        p.present++;
        p.types[cellTypeKey(v)] = true;
      }
    });
  });
  return { columns: cols, profile: profile };
}

function fieldTypeLabel(col) {
  var p = state.datasetFieldProfile[col];
  if (!p) return '';
  var keys = Object.keys(p.types);
  if (keys.length === 0) return t('typeEmpty');
  return keys.length > 1 ? t('typeMixed') : t(keys[0]);
}



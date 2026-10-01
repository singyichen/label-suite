/* OpenAPI Renderer —— 資料推導
 *
 * 從 spec 推出畫面要的一切：operations、tags、schema 參照圖、usage index、深連結、欄位樹的展開。
 * 真實世界的 spec 常不規矩（$ref 斷掉、operationId 重複、型別缺漏）：一律容錯並記進 warnings，不 throw。
 *
 * 本檔無 JSX、只有 `import type`：scripts/checks/oar-derive.mjs 以 Node strip-types 直接載入。
 */

import type {
  Derived,
  Method,
  OpEntry,
  OpenApiDoc,
  Operation,
  Parameter,
  RequestBody,
  Response,
  Route,
  Schema,
  TagEntry,
  UsageEntry,
  VersionInfo,
} from './types'

export const METHODS: Method[] = ['get', 'post', 'put', 'patch', 'delete', 'query', 'head', 'options', 'trace']
/** 不改資料的方法：外框標記；其餘填色 */
export const READ_METHODS = new Set<string>(['get', 'head', 'options', 'query', 'trace'])
/** 有專屬色的五個；其餘（QUERY HEAD OPTIONS TRACE）用中性色 */
export const KNOWN_METHODS = new Set<string>(['get', 'post', 'put', 'patch', 'delete'])

export const NO_TAG = '__none'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/* ── $ref ─────────────────────────────────────────────── */

/** 只解文件內的 `#/...`；外部 ref 回 undefined（v1 不解析） */
export function ptr(doc: unknown, ref: string | undefined): unknown {
  if (!ref || !ref.startsWith('#/')) return undefined
  let cur: unknown = doc
  for (const raw of ref.slice(2).split('/')) {
    const k = raw.replace(/~1/g, '/').replace(/~0/g, '~')
    if (!isObj(cur) || !Object.prototype.hasOwnProperty.call(cur, k)) return undefined
    cur = cur[k]
  }
  return cur
}

export const refName = (ref: string): string => ref.split('/').pop() ?? ref
export const isSchemaRef = (ref: unknown): ref is string => typeof ref === 'string' && ref.startsWith('#/components/schemas/')
export const isLocalRef = (ref: unknown): ref is string => typeof ref === 'string' && ref.startsWith('#/')

/** 一路解開 $ref，最多 10 層；解不開回 null。3.1 允許 $ref 旁有 description，保留在結果上 */
export function deref<T extends { $ref?: string; description?: string }>(doc: unknown, x: T | undefined | null, max = 10): T | null {
  let cur: unknown = x
  let desc: string | undefined
  let n = 0
  while (isObj(cur) && typeof cur.$ref === 'string') {
    if (n++ >= max) return null
    if (desc === undefined && typeof cur.description === 'string') desc = cur.description
    cur = ptr(doc, cur.$ref)
  }
  if (!isObj(cur)) return null
  const out = cur as T
  return desc !== undefined && out.description !== desc ? { ...out, description: desc } : out
}

/* ── schema 小工具 ───────────────────────────────────── */

export function schemaType(s: Schema | undefined | null): string | null {
  if (!s) return null
  let t = s.type
  if (Array.isArray(t)) t = t.find((x) => x !== 'null') ?? t[0]
  if (!t) {
    if (s.properties || isObj(s.additionalProperties)) t = 'object'
    else if (s.items) t = 'array'
  }
  return typeof t === 'string' ? t : null
}

export const isNullable = (s: Schema | undefined | null): boolean =>
  !!s && (s.nullable === true || (Array.isArray(s.type) && s.type.includes('null')))

/** 節點內直接出現的 `#/components/schemas/*`（不追 ref、略過 example(s)） */
export function collectRefs(node: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(node)) {
    for (const x of node) collectRefs(x, out)
    return out
  }
  if (!isObj(node)) return out
  if (isSchemaRef(node.$ref)) out.add(refName(node.$ref))
  for (const k of Object.keys(node)) {
    if (k !== '$ref' && k !== 'example' && k !== 'examples') collectRefs(node[k], out)
  }
  return out
}

export function versionOf(doc: OpenApiDoc): VersionInfo {
  if (typeof doc.swagger === 'string' && !doc.openapi) return { raw: doc.swagger, kind: 'swagger', supported: false }
  const raw = typeof doc.openapi === 'string' ? doc.openapi : ''
  if (/^3\.0\./.test(raw) || raw === '3.0') return { raw, kind: '3.0', supported: true }
  if (/^3\.1\./.test(raw) || raw === '3.1') return { raw, kind: '3.1', supported: true }
  if (/^3\./.test(raw)) return { raw, kind: '3.x', supported: false }
  return { raw, kind: 'unknown', supported: false }
}

/* ── 推導 ─────────────────────────────────────────────── */

/** tag 內所有 path 的共同前綴；至少 2 段、且每支 path 在前綴之後還有東西才抽出 */
export function tagBase(paths: string[]): string {
  if (paths.length < 2) return ''
  const segs = paths.map((p) => p.split('/').filter(Boolean))
  const out: string[] = []
  for (let i = 0; ; i++) {
    const s = segs[0][i]
    if (s == null || !segs.every((x) => x[i] === s && x.length > i + 1)) break
    out.push(s)
  }
  return out.length >= 2 ? `/${out.join('/')}` : ''
}

function tagsOf(op: Operation): string[] {
  const t = Array.isArray(op.tags) ? op.tags.filter((x): x is string => typeof x === 'string' && x !== '') : []
  return t.length ? t : [NO_TAG]
}

export function derive(doc: OpenApiDoc): Derived {
  const warnings: string[] = []
  const ops: OpEntry[] = []
  const usedKeys = new Set<string>()

  const resolveParams = (list: unknown, where: string): Parameter[] => {
    if (!Array.isArray(list)) return []
    const out: Parameter[] = []
    for (const p of list) {
      const r = deref<Parameter>(doc, p as Parameter)
      if (r && typeof r.name === 'string' && typeof r.in === 'string') out.push(r)
      else warnings.push(`${where} 有一個參數無法解析（${isObj(p) && typeof p.$ref === 'string' ? p.$ref : '缺 name／in'}），已略過`)
    }
    return out
  }

  for (const [path, rawItem] of Object.entries(doc.paths ?? {})) {
    if (!isObj(rawItem)) continue
    const item = rawItem as Record<string, unknown>
    const shared = resolveParams(item.parameters, `paths["${path}"]`)
    for (const m of METHODS) {
      const o = item[m]
      if (!isObj(o)) continue
      const op = o as Operation
      const where = `paths["${path}"].${m}`
      const own = resolveParams(op.parameters, where)
      const params = [...shared.filter((s) => !own.some((p) => p.name === s.name && p.in === s.in)), ...own]

      let requestBody: RequestBody | null = null
      if (op.requestBody) {
        requestBody = deref<RequestBody>(doc, op.requestBody)
        if (!requestBody) warnings.push(`${where}.requestBody 無法解析（${op.requestBody.$ref ?? '格式不對'}）`)
      }
      const responses: Record<string, Response> = {}
      for (const [code, r] of Object.entries(op.responses ?? {})) {
        const rr = deref<Response>(doc, r)
        if (rr) responses[code] = rr
        else {
          responses[code] = { description: `無法解析 ${isObj(r) && typeof r.$ref === 'string' ? r.$ref : '這個回應'}` }
          warnings.push(`${where}.responses.${code} 無法解析`)
        }
      }

      const fallbackKey = `${m}${path}`
      let key = op.operationId || fallbackKey
      if (usedKeys.has(key)) {
        warnings.push(`operationId "${key}" 重複（${where}），這支改用 ${fallbackKey} 當連結`)
        key = fallbackKey
      }
      usedKeys.add(key)

      ops.push({
        key,
        method: m,
        path,
        operationId: op.operationId,
        summary: op.summary,
        description: op.description,
        deprecated: op.deprecated === true,
        params,
        requestBody,
        responses,
        security: Array.isArray(op.security) ? op.security : Array.isArray(doc.security) ? doc.security : [],
        tags: tagsOf(op),
        refs: [],
      })
    }
  }

  /* tags：宣告順序 → 出現但未宣告 → 未分類；只留有 op 的 */
  const declared = Array.isArray(doc.tags) ? doc.tags.filter((t) => isObj(t) && typeof t.name === 'string') : []
  const names = declared.map((t) => t.name)
  for (const o of ops) for (const t of o.tags) if (t !== NO_TAG && !names.includes(t)) names.push(t)
  if (ops.some((o) => o.tags.includes(NO_TAG))) names.push(NO_TAG)
  const tags: TagEntry[] = names
    .map((name) => {
      const d = declared.find((t) => t.name === name)
      const tops = ops.filter((o) => o.tags.includes(name))
      return {
        name,
        label: name === NO_TAG ? '未分類' : name,
        summary: d?.summary,
        description: d?.description,
        ops: tops,
        base: tagBase(tops.map((o) => o.path)),
      }
    })
    .filter((t) => t.ops.length > 0)

  /* schema 參照圖與 usage */
  const schemas: Record<string, Schema> = isObj(doc.components?.schemas) ? (doc.components?.schemas as Record<string, Schema>) : {}
  const schemaNames = Object.keys(schemas)
  const deps: Record<string, Set<string>> = {}
  for (const n of schemaNames) deps[n] = collectRefs(schemas[n])

  const closureCache = new Map<string, Set<string>>()
  const closure = (start: string): Set<string> => {
    const hit = closureCache.get(start)
    if (hit) return hit
    const seen = new Set<string>()
    const q = [start]
    while (q.length) {
      const n = q.shift() as string
      if (seen.has(n)) continue
      seen.add(n)
      for (const x of deps[n] ?? []) q.push(x)
    }
    closureCache.set(start, seen)
    return seen
  }

  for (const o of ops) {
    const where: [string, string][] = []
    for (const p of o.params) for (const n of collectRefs(p.schema)) where.push([n, `參數 ${p.name}`])
    if (o.requestBody) for (const n of collectRefs(o.requestBody.content)) where.push([n, 'Request body'])
    for (const [c, r] of Object.entries(o.responses)) for (const n of collectRefs(r.content)) where.push([n, `回應 ${c}`])
    o.refs = where
  }

  const usage: Record<string, UsageEntry[]> = {}
  for (const n of schemaNames) usage[n] = []
  for (const o of ops) {
    const direct = new Map<string, string[]>()
    for (const [n, w] of o.refs) {
      const list = direct.get(n) ?? []
      if (!list.includes(w)) list.push(w)
      direct.set(n, list)
    }
    for (const n of schemaNames) {
      const w = direct.get(n)
      if (w) usage[n].push({ op: o, where: w })
      else {
        const via = [...direct.keys()].find((d) => d !== n && closure(d).has(n))
        if (via) usage[n].push({ op: o, via })
      }
    }
  }
  const refBy: Record<string, string[]> = {}
  for (const n of schemaNames) refBy[n] = schemaNames.filter((m) => m !== n && deps[m].has(n))

  const securitySchemes = isObj(doc.components?.securitySchemes) ? (doc.components?.securitySchemes ?? {}) : {}
  const servers = Array.isArray(doc.servers) ? doc.servers.filter((s) => isObj(s) && typeof s.url === 'string') : []

  return {
    doc,
    ops,
    opByKey: new Map(ops.map((o) => [o.key, o])),
    tags,
    schemas,
    schemaNames,
    deps,
    refBy,
    usage,
    servers,
    securitySchemes,
    version: versionOf(doc),
    tiny: ops.length <= 4 && ops.every((o) => o.tags.length === 1 && o.tags[0] === NO_TAG),
    warnings,
  }
}

/* ── 顯示用 ───────────────────────────────────────────── */

/** 長 path：保留第一段與盡量多的尾段，中間以 `…` 取代 */
export function shortPath(path: string, max: number): string {
  if (path.length <= max) return path
  const seg = path.split('/').filter(Boolean)
  if (seg.length < 3) return path
  const tail: string[] = []
  for (let i = seg.length - 1; i > 0; i--) {
    const cand = ['', seg[0], '…', seg[i], ...tail].join('/')
    if (cand.length > max && tail.length) break
    tail.unshift(seg[i])
  }
  if (tail.length >= seg.length - 1) return path
  return ['', seg[0], '…', ...tail].join('/')
}

export function opMatch(o: OpEntry, q: string, methods: Set<string>): boolean {
  if (methods.size && !methods.has(o.method)) return false
  if (!q) return true
  return `${o.path} ${o.summary ?? ''} ${o.operationId ?? ''}`.toLowerCase().includes(q)
}

export function opSections(o: OpEntry | undefined): { id: string; label: string }[] {
  if (!o) return []
  const out = []
  if (o.params.length) out.push({ id: 'params', label: '參數' })
  if (o.requestBody && Object.keys(o.requestBody.content ?? {}).length) out.push({ id: 'body', label: 'Request Body' })
  out.push({ id: 'responses', label: 'Responses' }, { id: 'example', label: '範例請求' })
  return out
}

export type StatusTone = 'ok' | 'info' | 'warn' | 'danger' | 'neutral'
export function statusTone(code: string): StatusTone {
  const c = code[0]
  if (c === '2') return 'ok'
  if (c === '3') return 'info'
  if (c === '4') return 'warn'
  if (c === '5') return 'danger'
  return 'neutral'
}

/** 2xx 優先，否則第一個 */
export function primaryStatus(codes: string[]): string | undefined {
  return codes.find((c) => c[0] === '2') ?? codes[0]
}

export function constraints(f: Schema | undefined): string[] {
  if (!f) return []
  const out: string[] = []
  if (f.const !== undefined) out.push(`固定值 ${JSON.stringify(f.const)}`)
  if (f.default !== undefined) out.push(`預設 ${JSON.stringify(f.default)}`)
  if (f.minimum != null) out.push(`≥ ${f.minimum}`)
  if (f.maximum != null) out.push(`≤ ${f.maximum}`)
  if (f.minLength != null || f.maxLength != null) out.push(`長度 ${f.minLength ?? 0}–${f.maxLength ?? '∞'}`)
  if (f.minItems != null || f.maxItems != null) out.push(`${f.minItems ?? 0}–${f.maxItems ?? '∞'} 項`)
  if (f.pattern) out.push(`pattern ${f.pattern}`)
  return out
}

/** 參數的範例值：example → examples 第一個 → schema.example → schema.examples[0] → enum[0] → default */
export function paramExample(p: Parameter): unknown {
  if (p.example !== undefined) return p.example
  if (isObj(p.examples)) {
    const first = Object.values(p.examples)[0]
    if (isObj(first) && first.value !== undefined) return first.value
  }
  const s = p.schema
  if (!s) return undefined
  if (s.example !== undefined) return s.example
  if (Array.isArray(s.examples) && s.examples.length) return s.examples[0]
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0]
  if (s.default !== undefined) return s.default
  return undefined
}

/** 空狀態文案裡的 spec 欄位路徑 */
export const opPointer = (o: OpEntry): string => `paths["${o.path}"].${o.method}.description`

/* ── 深連結 ───────────────────────────────────────────── */

/* 只跳脫 hash 裡真的會出事的字元；{}、中文、/ 保持可讀（瀏覽器會自行處理非 ASCII） */
const encHash = (s: string): string => s.replace(/%/g, '%25').replace(/#/g, '%23').replace(/\s/g, (c) => encodeURIComponent(c))

function decHash(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export function routeToHash(r: Route): string {
  if (r.kind === 'overview') return ''
  const sub = 'sub' in r && r.sub ? `/${r.sub}` : ''
  return `#${r.kind}/${encHash(r.key)}${encHash(sub)}`
}

/** 解析 hash；無效回 null（呼叫端落回總覽） */
export function hashToRoute(hash: string, D: Pick<Derived, 'opByKey' | 'schemas' | 'tags'>): Route | null {
  const s = decHash(hash.replace(/^#/, ''))
  if (!s) return null
  const slash = s.indexOf('/')
  if (slash < 0) return null
  const kind = s.slice(0, slash)
  const rest = s.slice(slash + 1)
  if (kind === 'op') {
    if (D.opByKey.has(rest)) return { kind: 'op', key: rest }
    /* 帶子路徑（responses/409）：取最長的相符 key */
    let best = ''
    for (const k of D.opByKey.keys()) if (rest.startsWith(`${k}/`) && k.length > best.length) best = k
    return best ? { kind: 'op', key: best, sub: rest.slice(best.length + 1) } : null
  }
  if (kind === 'schema') {
    const [name, ...sub] = rest.split('/')
    if (!Object.prototype.hasOwnProperty.call(D.schemas, name)) return null
    return sub.length ? { kind: 'schema', key: name, sub: sub.join('/') } : { kind: 'schema', key: name }
  }
  if (kind === 'tag') return D.tags.some((t) => t.name === rest) ? { kind: 'tag', key: rest } : null
  return null
}

/** 由 app 的資料檔路徑推 /view 路由：只去掉 .json（與 app 的 routePath 規則一致） */
export const viewPath = (filePath: string): string => `/view/${filePath.replace(/\.json$/i, '')}`

/* ── 欄位樹的展開 ─────────────────────────────────────── */

export type Expansion =
  | { kind: 'cycle'; refName: string }
  | { kind: 'props'; props: [string, Schema, string | null][]; required: Set<string>; allOf?: string[]; chain: string[]; free?: boolean }
  | { kind: 'combo'; mode: 'oneOf' | 'anyOf'; discriminator?: string; chain: string[]; variants: { label: string; title?: string; schema: Schema }[] }
  | { kind: 'array'; items: Schema | undefined; chain: string[] }
  | { kind: 'map'; value: Schema; chain: string[] }

/** 把一個 schema 展開一層。chain 是祖先 ref 名，遇到已在鏈上的 ref → cycle */
export function expand(doc: unknown, s0: Schema | undefined | null, chain0: string[]): Expansion | null {
  if (!s0) return null
  let s: Schema = s0
  let chain = chain0
  if (isLocalRef(s.$ref)) {
    const n = refName(s.$ref)
    if (chain.includes(n)) return { kind: 'cycle', refName: n }
    chain = [...chain, n]
    s = (ptr(doc, s.$ref) as Schema | undefined) ?? {}
  }
  if (Array.isArray(s.allOf)) {
    const props: [string, Schema, string | null][] = []
    const req = new Set<string>()
    const parts: string[] = []
    for (let p of s.allOf) {
      let lbl = '內嵌'
      if (isLocalRef(p.$ref)) {
        lbl = refName(p.$ref)
        if (chain.includes(lbl)) continue
        p = (ptr(doc, p.$ref) as Schema | undefined) ?? {}
      }
      parts.push(lbl)
      for (const [k, v] of Object.entries(p.properties ?? {})) props.push([k, v, lbl])
      for (const r of p.required ?? []) req.add(r)
    }
    for (const [k, v] of Object.entries(s.properties ?? {})) props.push([k, v, '內嵌'])
    for (const r of s.required ?? []) req.add(r)
    return { kind: 'props', props, required: req, allOf: parts, chain }
  }
  const list = s.oneOf ?? s.anyOf
  if (Array.isArray(list)) {
    return {
      kind: 'combo',
      mode: s.oneOf ? 'oneOf' : 'anyOf',
      discriminator: s.discriminator?.propertyName,
      chain,
      variants: list.map((v, i) => {
        const target = isLocalRef(v.$ref) ? (ptr(doc, v.$ref) as Schema | undefined) : undefined
        return {
          label: isLocalRef(v.$ref) ? refName(v.$ref) : v.title ?? (v.type === 'null' ? 'null' : `選項 ${i + 1}`),
          title: target?.title,
          schema: v,
        }
      }),
    }
  }
  const t = schemaType(s)
  if (t === 'array') return { kind: 'array', items: s.items, chain }
  if (t === 'object') {
    if (s.properties) return { kind: 'props', props: Object.entries(s.properties).map(([k, v]) => [k, v, null]), required: new Set(s.required ?? []), chain }
    if (isObj(s.additionalProperties)) return { kind: 'map', value: s.additionalProperties as Schema, chain }
    return { kind: 'props', props: [], required: new Set(), chain, free: true }
  }
  return null
}

/** 欄位的子層：陣列一路拆到元素（最多 3 層巢狀陣列） */
export function children(doc: unknown, s: Schema | undefined | null, chain: string[]): Expansion | null {
  let e = expand(doc, s, chain)
  let n = 0
  while (e && e.kind === 'array' && n++ < 3) e = expand(doc, e.items, e.chain)
  return e && e.kind === 'array' ? null : e
}

export function kidCount(e: Expansion | null): number {
  if (!e) return 0
  if (e.kind === 'props') return e.props.length
  if (e.kind === 'combo') return e.variants.length
  if (e.kind === 'map') return 1
  return 0
}

/** 欄位指向的 schema 名（$ref、陣列元素 $ref、單一 allOf $ref） */
export function refOf(f: Schema): string | null {
  if (isLocalRef(f.$ref)) return refName(f.$ref)
  if (f.items && isLocalRef(f.items.$ref)) return refName(f.items.$ref)
  if (f.allOf && f.allOf.length === 1 && isLocalRef(f.allOf[0].$ref)) return refName(f.allOf[0].$ref)
  return null
}

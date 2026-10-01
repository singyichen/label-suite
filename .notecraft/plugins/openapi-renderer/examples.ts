/* OpenAPI Renderer —— 範例 JSON 與 cURL／fetch
 *
 * 範例優先序：media examples 第一個 > media example > 由 schema 產生。
 * 產生器的「固定值」寫死、不取今天 —— SSR 與瀏覽器必須產生同一份字串，否則 hydration 對不上。
 *
 * 本檔無 JSX、只有 `import type` 與相對 import 的純函式：scripts/checks/oar-examples.mjs 直接載入。
 */

import type { Derived, ExampleObject, MediaType, OpEntry, Schema, Server } from './types'
import { deref, isLocalRef, paramExample, ptr, refName, schemaType } from './derive.ts'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export const FORMAT_SAMPLES: Record<string, string> = {
  'date-time': '2026-10-01T09:00:00Z',
  date: '2026-10-01',
  email: 'user@example.com',
  uuid: '3f2c8a10-5b7e-4c1d-9a2e-6d0f4b8c7e21',
  uri: 'https://example.com',
  binary: '<binary>',
  password: '********',
}

const MAX_DEPTH = 8

/** 由 schema 產生範例。request 略過 readOnly；response 保留。deprecated 一律略過。循環 ref 回 {} */
export function exampleFromSchema(doc: unknown, s: Schema | undefined | null, mode: 'request' | 'response' = 'request', seen: string[] = [], depth = 0): unknown {
  if (!s || depth > MAX_DEPTH) return null
  if (isLocalRef(s.$ref)) {
    const n = refName(s.$ref)
    if (seen.includes(n)) return {}
    return exampleFromSchema(doc, ptr(doc, s.$ref) as Schema | undefined, mode, [...seen, n], depth + 1)
  }
  if (s.example !== undefined) return s.example
  if (Array.isArray(s.examples) && s.examples.length) return s.examples[0]
  if (s.const !== undefined) return s.const
  if (s.default !== undefined) return s.default
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0]
  if (Array.isArray(s.allOf)) {
    const parts = s.allOf.map((x) => exampleFromSchema(doc, x, mode, seen, depth + 1)).filter(isObj)
    const own = s.properties ? exampleFromSchema(doc, { type: 'object', properties: s.properties }, mode, seen, depth + 1) : null
    return Object.assign({}, ...parts, isObj(own) ? own : {})
  }
  const list = s.oneOf ?? s.anyOf
  if (Array.isArray(list)) {
    const first = list.find((x) => x.type !== 'null')
    return first ? exampleFromSchema(doc, first, mode, seen, depth + 1) : null
  }
  const t = schemaType(s)
  if (t === 'object') {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(s.properties ?? {})) {
      if (v.deprecated || (mode === 'request' && v.readOnly)) continue
      o[k] = exampleFromSchema(doc, v, mode, seen, depth + 1)
    }
    if (!s.properties && isObj(s.additionalProperties)) {
      o.key = exampleFromSchema(doc, s.additionalProperties as Schema, mode, seen, depth + 1)
    }
    return o
  }
  if (t === 'array') return [exampleFromSchema(doc, s.items, mode, seen, depth + 1)]
  if (t === 'integer' || t === 'number') return s.minimum ?? 0
  if (t === 'boolean') return true
  if (t === 'string') return (s.format && FORMAT_SAMPLES[s.format]) || 'string'
  return null
}

export interface MediaExample {
  value: unknown
  /** 由 schema 產生（標題要標註） */
  generated: boolean
  /** media.examples 的鍵（可切換）；只有一個或沒有時為空陣列 */
  names: string[]
  labels: Record<string, string>
}

export function mediaExample(doc: unknown, media: MediaType | undefined, mode: 'request' | 'response', pick?: string): MediaExample {
  if (!media) return { value: null, generated: false, names: [], labels: {} }
  if (isObj(media.examples) && Object.keys(media.examples).length) {
    const names = Object.keys(media.examples)
    const labels: Record<string, string> = {}
    for (const k of names) labels[k] = deref<ExampleObject>(doc, media.examples[k])?.summary || k
    const key = pick && names.includes(pick) ? pick : names[0]
    const ex = deref<ExampleObject>(doc, media.examples[key])
    return { value: ex?.value ?? null, generated: false, names, labels }
  }
  if (media.example !== undefined) return { value: media.example, generated: false, names: [], labels: {} }
  return { value: exampleFromSchema(doc, media.schema, mode), generated: true, names: [], labels: {} }
}

/* ── cURL／fetch ──────────────────────────────────────── */

type Pair = [string, string]

function authHeaders(D: Pick<Derived, 'securitySchemes'>, op: OpEntry): Pair[] {
  const req = op.security[0]
  if (!req) return []
  const out: Pair[] = []
  for (const k of Object.keys(req)) {
    const s = D.securitySchemes[k]
    if (!s) continue
    if (s.type === 'apiKey') {
      if (s.in === 'header' && s.name) out.push([s.name, '<API_KEY>'])
      continue
    }
    if (s.type === 'http' && (s.scheme ?? '').toLowerCase() === 'basic') out.push(['Authorization', 'Basic <BASE64_CREDENTIALS>'])
    else out.push(['Authorization', 'Bearer <ACCESS_TOKEN>'])
  }
  return out
}

const scalar = (v: unknown): string => (Array.isArray(v) ? v.map(String).join(',') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))

export interface RequestParts {
  url: string
  headers: Pair[]
  cookies: string[]
  body: unknown
  mediaType: string | undefined
  hasBody: boolean
}

export function requestParts(D: Pick<Derived, 'doc' | 'securitySchemes'>, op: OpEntry, server: Server | undefined, ct?: string): RequestParts {
  const base = (server?.url ?? '').replace(/\/$/, '')
  const path = op.path.replace(/\{([^}]+)\}/g, (_m, n: string) => {
    const p = op.params.find((x) => x.in === 'path' && x.name === n)
    const ex = p ? paramExample(p) : undefined
    return ex != null && typeof ex !== 'object' ? encodeURIComponent(String(ex)) : `<${n}>`
  })
  const qs = op.params
    .filter((p) => p.in === 'query' && !p.deprecated && (p.required || paramExample(p) !== undefined))
    .map((p) => {
      const ex = paramExample(p)
      return `${p.name}=${ex === undefined ? `<${p.name}>` : scalar(ex)}`
    })
  const headers: Pair[] = [
    ...authHeaders(D, op),
    ...op.params
      .filter((p) => p.in === 'header' && !p.deprecated && (p.required || paramExample(p) !== undefined))
      .map((p): Pair => {
        const ex = paramExample(p)
        return [p.name, ex === undefined ? `<${p.name}>` : scalar(ex)]
      }),
  ]
  const cookies = op.params.filter((p) => p.in === 'cookie' && p.required && !p.deprecated).map((p) => `${p.name}=<${p.name}>`)
  const content = op.requestBody?.content ?? {}
  const mediaType = ct && content[ct] ? ct : Object.keys(content)[0]
  const media = mediaType ? content[mediaType] : undefined
  let body: unknown = null
  const hasBody = !!media
  if (media && mediaType) {
    body = mediaExample(D.doc, media, 'request').value
    headers.push(['Content-Type', mediaType])
  }
  return { url: base + path + (qs.length ? `?${qs.join('&')}` : ''), headers, cookies, body, mediaType, hasBody }
}

/** 單引號字串內的 ' → '\'' */
const sq = (s: string): string => s.replace(/'/g, `'\\''`)

const isJson = (ct: string | undefined): boolean => !!ct && /json/i.test(ct)

export function curlSnippet(D: Pick<Derived, 'doc' | 'securitySchemes'>, op: OpEntry, server: Server | undefined, ct?: string): string {
  const r = requestParts(D, op, server, ct)
  const L = [`curl -X ${op.method.toUpperCase()} '${sq(r.url)}'`]
  for (const [k, v] of r.headers) L.push(`-H '${sq(`${k}: ${v}`)}'`)
  if (r.cookies.length) L.push(`--cookie '${sq(r.cookies.join('; '))}'`)
  if (r.hasBody) {
    const mt = r.mediaType ?? ''
    if (isJson(mt)) L.push(`-d '${sq(JSON.stringify(r.body, null, 2))}'`)
    else if (mt === 'application/x-www-form-urlencoded') {
      if (isObj(r.body)) for (const [k, v] of Object.entries(r.body)) if (typeof v !== 'object' || v === null) L.push(`--data-urlencode '${sq(`${k}=${v}`)}'`)
    } else if (mt === 'multipart/form-data') {
      if (isObj(r.body)) {
        for (const [k, v] of Object.entries(r.body)) {
          L.push(v === '<binary>' ? `-F '${sq(k)}=@./file.pdf'` : `-F '${sq(`${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)}'`)
        }
      }
    } else L.push(`--data-binary '@./file.bin'`)
  }
  return L.join(' \\\n  ')
}

export function fetchSnippet(D: Pick<Derived, 'doc' | 'securitySchemes'>, op: OpEntry, server: Server | undefined, ct?: string): string {
  const r = requestParts(D, op, server, ct)
  const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  const lines = [`const res = await fetch(${q(r.url)}, {`, `  method: '${op.method.toUpperCase()}',`]
  if (r.cookies.length) r.headers.push(['Cookie', r.cookies.join('; ')])
  if (r.headers.length) {
    lines.push('  headers: {')
    for (const [k, v] of r.headers) lines.push(`    ${q(k)}: ${q(v)},`)
    lines.push('  },')
  }
  if (r.hasBody) {
    if (isJson(r.mediaType)) lines.push(`  body: JSON.stringify(${JSON.stringify(r.body, null, 2).split('\n').join('\n  ')}),`)
    else lines.push(`  body, // ${r.mediaType}`)
  }
  lines.push('})', 'const data = await res.json()')
  return lines.join('\n')
}

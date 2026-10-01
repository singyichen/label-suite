/* OpenAPI Renderer —— 四種頁面：總覽、Tag、Operation、Schema
 *
 * 頁首結構（eyebrow → h1 → meta → Markdown）、h2、Operations 清單、空狀態格式與 ER 的 Wiki 頁同一套。
 * 空狀態一律寫出「缺什麼 + spec 欄位路徑」，讓作者知道去哪裡補。
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Braces, ChevronRight, Link as LinkIcon, Lock, LockOpen, TriangleAlert } from 'lucide-react'
import { CodeBox, CopyButton, Enum, H2, JsonView, Method, MethodCounts, Missing, PathText, Required, Seg, SnippetView, Status, TypeLabel, useLink } from './atoms'
import { NO_TAG, constraints, deref, opPointer, paramExample, primaryStatus, schemaType } from './derive'
import { curlSnippet, fetchSnippet, mediaExample } from './examples'
import { Md, MdInline } from './markdown'
import { SchemaTree } from './schema-tree'
import type { Derived, Header, MediaType, OpEntry, Route, SecurityScheme, TagEntry } from './types'

/** 複製連結時才算完整網址（SSR 沒有 location） */
export type HashFor = (r: Route) => string

const IN_ORDER: [string, string][] = [
  ['path', 'Path 參數'],
  ['query', 'Query 參數'],
  ['header', 'Header'],
  ['cookie', 'Cookie'],
]

/* ── 共用 ─────────────────────────────────────────────── */

function OpRow({ o, first, via, third }: { o: OpEntry; first?: boolean; via?: boolean; third?: ReactNode }) {
  const link = useLink()
  return (
    <a className={`oar-oplist-r${first ? ' oar-first' : ''}${o.deprecated ? ' oar-dep' : ''}${via ? ' oar-via' : ''}`} {...link({ kind: 'op', key: o.key })}>
      <Method m={o.method} />
      <span className="oar-oplist-p">
        <PathText path={o.path} />
      </span>
      <span className="oar-oplist-s">{third ?? (o.summary || <i>沒有 summary</i>)}</span>
      {o.deprecated ? <span className="oar-flag oar-dep">已棄用</span> : <span />}
    </a>
  )
}

export function OpList({ ops }: { ops: OpEntry[] }) {
  return (
    <div className="oar-oplist">
      {ops.map((o, i) => (
        <OpRow key={o.key} o={o} first={i === 0} />
      ))}
    </div>
  )
}

function VersionNotice({ D }: { D: Derived }) {
  if (D.version.supported) return null
  return (
    <div className="oar-notice">
      <TriangleAlert size={14} aria-hidden />
      <div>
        這份文件宣告 <code>openapi: {D.version.raw || '（空白）'}</code>，plugin 只保證 3.0 / 3.1。目前以 3.1 規則渲染：3.2 新增的 <code>query</code> method
        以中性色標記，其他 3.2 專屬欄位會略過。
      </div>
    </div>
  )
}

function secDetail(s: SecurityScheme): ReactNode {
  if (s.type === 'apiKey') {
    return (
      <>
        放在 {s.in} 的 <code>{s.name}</code>
      </>
    )
  }
  if (s.type === 'http') return `HTTP ${s.scheme ?? ''}${s.bearerFormat ? `（${s.bearerFormat}）` : ''}`
  if (s.type === 'oauth2') {
    const [flow, f] = Object.entries(s.flows ?? {})[0] ?? []
    const scopes = Object.keys(f?.scopes ?? {})
    return (
      <>
        OAuth2 {flow}
        {scopes.length ? (
          <>
            {' '}
            · scopes{' '}
            {scopes.map((x) => (
              <code key={x} className="oar-scope">
                {x}
              </code>
            ))}
          </>
        ) : null}
      </>
    )
  }
  return s.type ?? '—'
}

export function Security({ D, op }: { D: Derived; op: OpEntry }) {
  if (!op.security.length) {
    return (
      <span className="oar-sec oar-nosec">
        <LockOpen size={12} aria-hidden />
        不需驗證
      </span>
    )
  }
  return (
    <span className="oar-secs">
      {op.security.map((req, i) => (
        <Fragment key={i}>
          {i ? <em>或</em> : null}
          {Object.keys(req).length ? (
            Object.entries(req).map(([k, scopes]) => (
              <span key={k} className="oar-sec" title={D.securitySchemes[k]?.type ?? '未宣告的 scheme'}>
                <Lock size={11} aria-hidden />
                {k}
                {Array.isArray(scopes) && scopes.length ? <span className="oar-sec-sc">{scopes.join(' ')}</span> : null}
              </span>
            ))
          ) : (
            <span className="oar-sec oar-nosec">匿名</span>
          )}
        </Fragment>
      ))}
    </span>
  )
}

/* ── 總覽 ─────────────────────────────────────────────── */

export function Overview({ D, filePath }: { D: Derived; filePath: string }) {
  const link = useLink()
  const info = D.doc.info ?? {}
  const dep = D.ops.filter((o) => o.deprecated).length
  const max = Math.max(1, ...D.tags.map((t) => t.ops.length))
  const schemes = Object.entries(D.securitySchemes)
  return (
    <article className="oar-page">
      <VersionNotice D={D} />
      <div className="oar-eyebrow">OPENAPI {D.version.raw}</div>
      <h1 className="oar-h1">
        {info.title || <span className="oar-muted">未命名 API</span>}
        {info.version ? <span className="oar-ver">v{info.version}</span> : null}
      </h1>
      <div className="oar-meta">
        <span>
          <b>{D.ops.length}</b> 支 operation
        </span>
        {!D.tiny ? (
          <span>
            <b>{D.tags.filter((t) => t.name !== NO_TAG).length}</b> 個 tag
          </span>
        ) : null}
        <span>
          <b>{D.schemaNames.length}</b> 個 schema
        </span>
        {dep ? (
          <span>
            <b>{dep}</b> 支已棄用
          </span>
        ) : null}
        <span className="oar-meta-src">
          來源：<code>{filePath}</code>
        </span>
      </div>
      {info.description ? <Md src={info.description} /> : <Missing field="info.description" what="這份 API 還沒有總覽說明" />}

      {D.tiny ? (
        <>
          <H2 count={D.ops.length}>Operations</H2>
          <p className="oar-lede">這份文件沒有分 tag，operation 不多，直接全部列在這裡；點一列看參數與回應。</p>
          <OpList ops={D.ops} />
          {D.schemaNames.length ? (
            <>
              <H2 count={D.schemaNames.length}>Schemas</H2>
              <div className="oar-schemachips">
                {D.schemaNames.map((n) => (
                  <a key={n} className="oar-schemachip" {...link({ kind: 'schema', key: n })}>
                    <Braces size={12} aria-hidden />
                    <code>{n}</code>
                    <span>{Object.keys(D.schemas[n]?.properties ?? {}).length} 欄位</span>
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <H2 count={D.tags.length} extra={<MethodCounts ops={D.ops} />}>
            API 結構
          </H2>
          <div className="oar-sizebar" role="list" aria-label="各 tag 的 operation 數">
            {D.tags.map((t) => (
              <button type="button" role="listitem" key={t.name} style={{ flexGrow: t.ops.length }} title={`${t.label} · ${t.ops.length} 支`} onClick={(e) => link({ kind: 'tag', key: t.name }).onClick(e)}>
                <span>{t.label}</span>
                <b className="oar-tnum">{t.ops.length}</b>
              </button>
            ))}
          </div>
          <div className="oar-tagt">
            <div className="oar-tagt-h">
              <span>Tag</span>
              <span>說明</span>
              <span>數量</span>
              <span>Method 分布</span>
            </div>
            {D.tags.map((t) => (
              <a key={t.name} className="oar-tagt-r" {...link({ kind: 'tag', key: t.name })}>
                <span className={t.name === NO_TAG ? 'oar-none' : ''}>
                  <code>{t.label}</code>
                </span>
                <span className="oar-tagt-d">{t.description || t.summary || <i>尚無說明</i>}</span>
                <span className="oar-tagt-n">
                  <b className="oar-tnum">{t.ops.length}</b>
                  <i style={{ width: `${(t.ops.length / max) * 100}%` }} />
                </span>
                <span>
                  <MethodCounts ops={t.ops} />
                </span>
              </a>
            ))}
          </div>
        </>
      )}

      <H2 count={D.servers.length}>伺服器</H2>
      {D.servers.length ? (
        <div className="oar-kv">
          {D.servers.map((s) => (
            <div key={s.url} className="oar-kv-r oar-kv3">
              <code className="oar-url">{s.url}</code>
              <span>{s.description || <span className="oar-muted">—</span>}</span>
              <CopyButton text={s.url} />
            </div>
          ))}
        </div>
      ) : (
        <Missing field="servers" what="沒有列出伺服器，範例請求會用相對路徑" />
      )}

      <H2 count={schemes.length}>驗證方式</H2>
      {schemes.length ? (
        <div className="oar-kv">
          {schemes.map(([k, s]) => (
            <div key={k} className="oar-kv-r oar-kv-sec">
              <code className="oar-cname">{k}</code>
              <span className="oar-type">
                {s.type}
                {s.scheme ? ` · ${s.scheme}` : ''}
              </span>
              <span>
                {secDetail(s)}
                {s.description ? <span className="oar-muted">　{s.description}</span> : null}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="oar-empty">
          這份文件沒有宣告驗證方式（<code>components.securitySchemes</code>）。
        </p>
      )}
    </article>
  )
}

/* ── Tag ──────────────────────────────────────────────── */

export function TagPage({ t }: { t: TagEntry }) {
  return (
    <article className="oar-page">
      <div className="oar-eyebrow">TAG</div>
      <h1 className="oar-h1">
        <code>{t.label}</code>
      </h1>
      <div className="oar-meta">
        <span>
          <b>{t.ops.length}</b> 支 operation
        </span>
        <MethodCounts ops={t.ops} />
      </div>
      {t.description ? (
        <Md src={t.description} />
      ) : t.name === NO_TAG ? (
        <p className="oar-empty">
          這些 operation 沒有設定 <code>tags</code>，統一歸在這裡。
        </p>
      ) : (
        <Missing field={`tags[name="${t.name}"].description`} what="這個 tag 還沒有說明" />
      )}
      <H2 count={t.ops.length}>Operations</H2>
      <OpList ops={t.ops} />
    </article>
  )
}

/* ── Operation ────────────────────────────────────────── */

function Params({ op }: { op: OpEntry }) {
  return (
    <>
      {IN_ORDER.map(([k, label]) => {
        const ps = op.params.filter((p) => p.in === k)
        if (!ps.length) return null
        return (
          <div key={k} className="oar-pgroup">
            <div className="oar-pgroup-h">
              {label}
              <span className="oar-h2-n">{ps.length}</span>
            </div>
            <div className="oar-colt-wrap">
              <table className="oar-colt oar-ptable">
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: 64 }} />
                  <col />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>名稱</th>
                    <th>型別</th>
                    <th>必填</th>
                    <th>說明</th>
                    <th>範例</th>
                  </tr>
                </thead>
                <tbody>
                  {ps.map((p) => {
                    const s = p.schema ?? {}
                    const ex = paramExample(p)
                    const cons = constraints(s)
                    const enumV = s.enum ?? s.items?.enum
                    const fmt = s.format ?? s.items?.format
                    const style = p.style || p.explode === false ? `${p.style ?? 'form'}${p.explode === false ? ', 逗號分隔' : ''}` : null
                    return (
                      <tr key={p.name} data-param={`${k}:${p.name}`} className={p.deprecated ? 'oar-dep' : ''}>
                        <td>
                          <code className="oar-cname">{p.name}</code>
                          {p.deprecated ? <span className="oar-flag oar-dep">已棄用</span> : null}
                        </td>
                        <td>
                          <span className="oar-tcell">
                            <TypeLabel f={s} />
                            {fmt ? <span className="oar-fmt">{fmt}</span> : null}
                          </span>
                        </td>
                        <td>
                          <Required on={!!p.required} />
                        </td>
                        <td className="oar-cnote oar-td-desc">
                          {p.description ? <MdInline text={p.description} /> : <span className="oar-na">—</span>}
                          {enumV || cons.length || style ? (
                            <div className="oar-pdesc">
                              <Enum values={enumV} />
                              {cons.map((c) => (
                                <span key={c} className="oar-con">
                                  {c}
                                </span>
                              ))}
                              {style ? <span className="oar-con">{style}</span> : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="oar-td-ex">
                          {ex !== undefined ? (
                            <code className="oar-ex">{Array.isArray(ex) ? ex.map(String).join(',') : typeof ex === 'object' ? JSON.stringify(ex) : String(ex)}</code>
                          ) : (
                            <span className="oar-na">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </>
  )
}

/** 欄位樹｜範例 並排（窄寬度上下排） */
export function MediaSplit({ D, media, ct, mode, resetSig, rootLabel }: { D: Derived; media: MediaType | undefined; ct?: string; mode: 'request' | 'response'; resetSig: number; rootLabel: string }) {
  const [pick, setPick] = useState<string | undefined>(undefined)
  const ex = useMemo(() => mediaExample(D.doc, media, mode, pick), [D, media, mode, pick])
  const schema = media?.schema
  const isBin = schema?.format === 'binary' || (!!ct && /octet-stream/.test(ct) && !media?.example)
  const copy = isBin ? null : typeof ex.value === 'string' ? ex.value : JSON.stringify(ex.value, null, 2)
  const foot = /xml/.test(ct ?? '')
    ? 'XML 依 schema 序列化，這裡以 JSON 呈現結構。'
    : /form-urlencoded|multipart/.test(ct ?? '')
      ? '以表單欄位送出，這裡以 JSON 呈現結構。'
      : ct && !/json/.test(ct) && !isBin
        ? `${ct} 依 schema 序列化，這裡以 JSON 呈現結構。`
        : null
  return (
    <div className="oar-split">
      <div className="oar-main-col">
        {schema ? <SchemaTree doc={D.doc} schema={schema} resetSig={resetSig} rootLabel={rootLabel} /> : <p className="oar-empty">沒有 schema。</p>}
      </div>
      <div className="oar-split-r">
        <CodeBox
          title={
            <>
              <Braces size={12} aria-hidden />
              {ex.generated ? '範例（由 schema 產生）' : '範例'}
            </>
          }
          tools={
            ex.names.length > 1 ? (
              <select className="oar-sel" value={pick ?? ex.names[0]} onChange={(e) => setPick(e.target.value)} aria-label="選擇範例">
                {ex.names.map((k) => (
                  <option key={k} value={k}>
                    {ex.labels[k]}
                  </option>
                ))}
              </select>
            ) : null
          }
          copy={copy}
          foot={foot}
        >
          {isBin ? <p className="oar-code-empty">二進位內容，沒有文字範例。</p> : <JsonView value={ex.value} maxH={360} />}
        </CodeBox>
      </div>
    </div>
  )
}

function Body({ D, op, ct, setCt, resetSig }: { D: Derived; op: OpEntry; ct: string; setCt: (c: string) => void; resetSig: number }) {
  const rb = op.requestBody
  const cts = Object.keys(rb?.content ?? {})
  if (!rb || !cts.length) return null
  return (
    <section>
      <H2 sec="body" extra={<Required on={!!rb.required} />}>
        Request Body
      </H2>
      {rb.description ? (
        <p className="oar-lede">
          <MdInline text={rb.description} />
        </p>
      ) : null}
      <div className="oar-media-bar">
        <span className="oar-media-l">content-type</span>
        <Seg mono label="content-type" value={ct} options={cts.map((c) => ({ value: c, label: c }))} onChange={setCt} />
      </div>
      <MediaSplit key={ct} D={D} media={rb.content?.[ct]} ct={ct} mode="request" resetSig={resetSig} rootLabel="body" />
    </section>
  )
}

function Responses({ D, op, resetSig, sub }: { D: Derived; op: OpEntry; resetSig: number; sub?: string }) {
  const codes = Object.keys(op.responses)
  const fromSub = (s?: string) => (s && s.startsWith('responses/') && codes.includes(s.slice(10)) ? s.slice(10) : undefined)
  const [code, setCode] = useState<string | undefined>(() => fromSub(sub) ?? primaryStatus(codes))
  const secRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const c = fromSub(sub)
    if (!c) return
    setCode(c)
    /* 捲標題（帶 scroll-margin-top，讓出 sticky bar），不是整個 section */
    secRef.current?.querySelector<HTMLElement>('[data-sec]')?.scrollIntoView({ block: 'start' })
    // 只在深連結的子路徑變動時跟著切
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub])
  const r = code ? op.responses[code] : undefined
  const cts = Object.keys(r?.content ?? {})
  const [ct, setCt] = useState<string | undefined>(cts[0])
  useEffect(() => setCt(Object.keys((code ? op.responses[code] : undefined)?.content ?? {})[0]), [code, op])
  if (!codes.length) {
    return (
      <section ref={secRef}>
        <H2 sec="responses" count={0}>
          Responses
        </H2>
        <p className="oar-empty">
          這支 operation 沒有宣告任何回應（<code>responses</code>）。
        </p>
      </section>
    )
  }
  const cur = ct && cts.includes(ct) ? ct : cts[0]
  return (
    <section ref={secRef}>
      <H2 sec="responses" count={codes.length}>
        Responses
      </H2>
      <div className="oar-st-tabs" role="tablist" aria-label="回應狀態碼">
        {codes.map((c) => (
          <Status key={c} code={c} on={c === code} onClick={() => setCode(c)} />
        ))}
      </div>
      {code && r ? (
        <div className="oar-resp" role="tabpanel">
          <div className="oar-resp-h">
            <Status code={code} />
            <span className="oar-resp-d">{r.description ? <MdInline text={r.description} /> : <span className="oar-muted">沒有說明</span>}</span>
            {cts.length ? (
              <span className="oar-resp-ct">
                {cts.length > 1 ? <span className="oar-media-n">{cts.length} 種格式</span> : null}
                <Seg mono label="回應格式" value={cur ?? ''} options={cts.map((c) => ({ value: c, label: c }))} onChange={setCt} />
              </span>
            ) : null}
          </div>
          {r.headers && Object.keys(r.headers).length ? (
            <div className="oar-rh">
              <div className="oar-rh-t">回應標頭</div>
              {Object.entries(r.headers).map(([k, h0]) => {
                const h = deref<Header>(D.doc, h0) ?? {}
                return (
                  <div key={k} className="oar-rh-r">
                    <code className="oar-cname">{k}</code>
                    <TypeLabel f={h.schema} />
                    <span>
                      <MdInline text={h.description} />
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
          {cur ? (
            <MediaSplit key={`${code}|${cur}`} D={D} media={r.content?.[cur]} ct={cur} mode="response" resetSig={resetSig} rootLabel={code} />
          ) : (
            <p className="oar-nobody">這個回應沒有 body。</p>
          )}
        </div>
      ) : null}
    </section>
  )
}

const LANG_KEY = 'oar:v1:lang'

function ExampleRequest({ D, op, ct, defaultServer }: { D: Derived; op: OpEntry; ct?: string; defaultServer: number }) {
  /* SSR 與首次 render 一律 cURL，掛載後才讀偏好 —— 否則 hydration 對不上 */
  const [lang, setLang] = useState<'curl' | 'fetch'>('curl')
  useEffect(() => {
    try {
      if (window.localStorage.getItem(LANG_KEY) === 'fetch') setLang('fetch')
    } catch {
      /* 隱私模式、配額滿：當作沒有 */
    }
  }, [])
  const choose = (v: 'curl' | 'fetch') => {
    setLang(v)
    try {
      window.localStorage.setItem(LANG_KEY, v)
    } catch {
      /* 同上 */
    }
  }
  const [si, setSi] = useState(() => Math.min(Math.max(0, defaultServer), Math.max(0, D.servers.length - 1)))
  const server = D.servers[si]
  const text = lang === 'curl' ? curlSnippet(D, op, server, ct) : fetchSnippet(D, op, server, ct)
  return (
    <section>
      <H2 sec="example">範例請求</H2>
      <CodeBox
        title={
          <Seg
            label="範例語言"
            value={lang}
            options={[
              { value: 'curl', label: 'cURL' },
              { value: 'fetch', label: 'fetch' },
            ]}
            onChange={choose}
          />
        }
        tools={
          D.servers.length > 1 ? (
            <select className="oar-sel" value={si} onChange={(e) => setSi(Number(e.target.value))} aria-label="伺服器">
              {D.servers.map((s, i) => (
                <option key={`${s.url}-${i}`} value={i}>
                  {s.description || s.url}
                </option>
              ))}
            </select>
          ) : null
        }
        copy={text}
        foot={
          <>
            <span className="oar-ph">&lt;…&gt;</span> 為佔位，換成實際值再執行。這是純靜態文件，不會替你送出請求。
          </>
        }
      >
        <SnippetView text={text} />
      </CodeBox>
    </section>
  )
}

export function OpPage({ D, op, sub, resetSig, hashFor, defaultServer }: { D: Derived; op: OpEntry; sub?: string; resetSig: number; hashFor: HashFor; defaultServer: number }) {
  const link = useLink()
  const cts = Object.keys(op.requestBody?.content ?? {})
  const [ct, setCt] = useState<string>(cts[0] ?? '')
  const pageRef = useRef<HTMLElement | null>(null)
  const tag = D.tags.find((t) => t.name === op.tags[0])

  const jumpParam = (name: string) => {
    const el = pageRef.current?.querySelector<HTMLElement>(`tr[data-param="path:${CSS.escape(name)}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.classList.remove('oar-flash')
    void el.offsetWidth
    el.classList.add('oar-flash')
  }

  return (
    <article className="oar-page" ref={pageRef}>
      <div className="oar-crumbs">
        {tag ? (
          <a {...link({ kind: 'tag', key: tag.name })}>
            <code>{tag.label}</code>
          </a>
        ) : null}
        <ChevronRight size={11} aria-hidden />
        <span>operation</span>
      </div>
      <div className="oar-op-hd">
        <Method m={op.method} size="lg" />
        <h1 className="oar-op-path">
          <PathText path={op.path} wrap onParam={jumpParam} />
        </h1>
      </div>
      <div className="oar-op-sum">
        {op.summary || <span className="oar-muted">沒有 summary</span>}
        {op.deprecated ? <span className="oar-flag oar-dep oar-lg">已棄用</span> : null}
      </div>
      <div className="oar-meta oar-op-meta">
        <span className="oar-opid">
          operationId {op.operationId ? <code>{op.operationId}</code> : <span className="oar-muted">未設定，連結改用 method + path</span>}
        </span>
        <Security D={D} op={op} />
        <span className="oar-op-tools">
          <CopyButton text={op.path} label="複製 path" className="oar-pill" />
          <CopyButton text={() => hashFor({ kind: 'op', key: op.key })} label="複製連結" icon={LinkIcon} className="oar-pill" />
        </span>
      </div>
      {op.deprecated ? (
        <div className="oar-dep-note">
          <TriangleAlert size={13} aria-hidden />
          <span>
            這支 operation 已標記為 <code>deprecated</code>，新的串接請不要再使用。
          </span>
        </div>
      ) : null}
      {op.description ? <Md src={op.description} /> : <Missing field={opPointer(op)} what="這支 operation 還沒有說明" />}

      {op.params.length ? (
        <section>
          <H2 sec="params" count={op.params.length}>
            參數
          </H2>
          <Params op={op} />
        </section>
      ) : null}
      {ct ? <Body D={D} op={op} ct={ct} setCt={setCt} resetSig={resetSig} /> : null}
      <Responses D={D} op={op} resetSig={resetSig} sub={sub} />
      <ExampleRequest D={D} op={op} ct={ct || undefined} defaultServer={defaultServer} />
    </article>
  )
}

/* ── Schema ───────────────────────────────────────────── */

export function SchemaPage({ D, name, resetSig, hashFor }: { D: Derived; name: string; resetSig: number; hashFor: HashFor }) {
  const link = useLink()
  const s = D.schemas[name] ?? {}
  const props = Object.keys(s.properties ?? {})
  const used = D.usage[name] ?? []
  const direct = used.filter((u) => u.where)
  const via = used.filter((u) => u.via)
  const deps = [...(D.deps[name] ?? [])]
  const media = useMemo<MediaType>(() => ({ schema: { $ref: `#/components/schemas/${name.replace(/~/g, '~0').replace(/\//g, '~1')}` } }), [name])
  const typeName = schemaType(s) ?? (s.oneOf ? 'oneOf' : s.anyOf ? 'anyOf' : s.allOf ? 'allOf' : 'any')
  return (
    <article className="oar-page">
      <div className="oar-crumbs">
        <span>components.schemas</span>
      </div>
      <div className="oar-h1-row">
        <h1 className="oar-h1">
          <code>{name}</code>
          {s.title ?? null}
        </h1>
        <span className="oar-op-tools">
          <CopyButton text={() => JSON.stringify(s, null, 2)} label="複製 schema JSON" icon={Braces} className="oar-pill" />
          <CopyButton text={() => hashFor({ kind: 'schema', key: name })} label="複製連結" icon={LinkIcon} className="oar-pill" />
        </span>
      </div>
      <div className="oar-meta">
        <span className="oar-type">{typeName}</span>
        {props.length ? (
          <span>
            <b>{props.length}</b> 個欄位
          </span>
        ) : null}
        {s.required?.length ? (
          <span>
            <b>{s.required.length}</b> 個必填
          </span>
        ) : null}
        <span>
          被 <b>{used.length}</b> 支 operation 使用
        </span>
        {deps.includes(name) ? <span className="oar-flag oar-cyc">↻ 自我參照</span> : null}
      </div>
      {s.description ? <Md src={s.description} /> : <Missing field={`components.schemas.${name}.description`} what="這個 schema 還沒有說明" />}

      <H2 count={props.length || null}>欄位</H2>
      <MediaSplit key={name} D={D} media={media} mode="response" resetSig={resetSig} rootLabel={name} />

      <H2 count={used.length}>被哪些 operation 使用</H2>
      {used.length ? (
        <div className="oar-oplist">
          {direct.map((u, i) => (
            <OpRow key={u.op.key} o={u.op} first={i === 0} third={u.where?.join('、')} />
          ))}
          {via.length ? <div className={`oar-oplist-sub${direct.length ? '' : ' oar-first'}`}>間接使用（經由其他 schema）</div> : null}
          {via.map((u) => (
            <OpRow
              key={u.op.key}
              o={u.op}
              via
              third={
                <>
                  經由 <code>{u.via}</code>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <p className="oar-empty">沒有 operation 參照這個 schema。可能是預留或已不再使用。</p>
      )}

      <div className="oar-rel">
        <div>
          <h4>參照（本 schema → 其他）</h4>
          {deps.length ? (
            deps.map((d) => (
              <a key={d} className="oar-rel-r" {...link({ kind: 'schema', key: d })}>
                <code>{name}</code>
                <ChevronRight size={12} aria-hidden />
                <code className="oar-to">{d}</code>
                {d === name ? <em>自我參照</em> : D.deps[d]?.has(name) ? <em>互相參照</em> : null}
              </a>
            ))
          ) : (
            <p className="oar-empty">沒有參照其他 schema。</p>
          )}
        </div>
        <div>
          <h4>被參照（其他 → 本 schema）</h4>
          {D.refBy[name]?.length ? (
            D.refBy[name].map((d) => (
              <a key={d} className="oar-rel-r" {...link({ kind: 'schema', key: d })}>
                <code className="oar-to">{d}</code>
                <ChevronRight size={12} aria-hidden />
                <code>{name}</code>
              </a>
            ))
          ) : (
            <p className="oar-empty">沒有其他 schema 參照這裡。</p>
          )}
        </div>
      </div>
    </article>
  )
}

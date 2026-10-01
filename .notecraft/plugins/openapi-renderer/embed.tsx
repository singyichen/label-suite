/* OpenAPI Renderer —— 內嵌（MDX 的 <PluginView>，筆記版心 760px）
 *
 * 外框（「資料檔 · API 文件」膠囊、檔名、「開啟完整檢視頁」）由 app 的 GeneratedFrame 提供，這裡不畫第二層。
 * handoff figcaption 上的 `· operationId` 改放在卡片頁首下方；開啟連結的 hash 由 <PluginView anchor> 帶。
 *
 * - options.operation 有給且找得到 → 單一 operation 卡
 * - 沒給 → 總覽縮影（tag 清單，連到文件頁該 tag）
 * - 給了找不到 → 卡內錯誤，不 throw
 * 卡片隨內容長高、不自己捲；不掛 keydown、不碰網址 hash（同一篇筆記可能有好幾張）。
 */

import { TriangleAlert } from 'lucide-react'
import { Method, MethodCounts, PathText, Required, Status, TypeLabel, useLink } from './atoms'
import { primaryStatus } from './derive'
import { MdInline } from './markdown'
import { Security } from './pages'
import { SchemaTree } from './schema-tree'
import type { Derived, OpEntry } from './types'

function OpCard({ D, op }: { D: Derived; op: OpEntry }) {
  const codes = Object.keys(op.responses)
  const main = primaryStatus(codes)
  const r = main ? op.responses[main] : undefined
  const rct = Object.keys(r?.content ?? {})[0]
  const bcts = Object.keys(op.requestBody?.content ?? {})
  const bct = bcts[0]
  return (
    <div className="oar-card">
      <div className="oar-card-hd">
        <Method m={op.method} size="lg" />
        <span className="oar-card-path">
          <PathText path={op.path} wrap />
        </span>
      </div>
      <div className="oar-card-sum">
        {op.summary || <span className="oar-muted">沒有 summary</span>}
        {op.deprecated ? <span className="oar-flag oar-dep">已棄用</span> : null}
        <span className="oar-card-sec">
          <Security D={D} op={op} />
        </span>
      </div>
      <div className="oar-card-id">
        operationId{op.operationId ? <code>{op.operationId}</code> : <span className="oar-muted">　未設定</span>}
      </div>
      {op.params.length ? (
        <div className="oar-card-b">
          <div className="oar-card-t">
            參數<span className="oar-h2-n">{op.params.length}</span>
          </div>
          <div className="oar-card-params">
            {op.params.map((p) => (
              <div key={`${p.in}:${p.name}`} className="oar-card-pr">
                <code className="oar-cname">{p.name}</code>
                <span className="oar-in">{p.in}</span>
                <TypeLabel f={p.schema} />
                {p.required ? <Required on /> : <span />}
                <span className="oar-card-pd">
                  <MdInline text={p.description} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {bct ? (
        <div className="oar-card-b">
          <div className="oar-card-t">
            Request Body<code className="oar-ct">{bct}</code>
            {bcts.length > 1 ? <span className="oar-muted">另有 {bcts.length - 1} 種格式</span> : null}
          </div>
          <SchemaTree doc={D.doc} schema={op.requestBody?.content?.[bct]?.schema} maxDepth={1} flat />
        </div>
      ) : null}
      <div className="oar-card-b">
        <div className="oar-card-t">
          主要回應
          {main ? <Status code={main} /> : null}
          {r?.description ? (
            <span className="oar-card-rd">
              <MdInline text={r.description} />
            </span>
          ) : null}
          {rct ? <code className="oar-ct">{rct}</code> : null}
        </div>
        {rct ? <SchemaTree doc={D.doc} schema={r?.content?.[rct]?.schema} rootLabel={main} maxDepth={1} flat /> : <p className="oar-nobody">沒有 body。</p>}
        {codes.length > 1 ? (
          <div className="oar-card-others">
            <span>其他回應</span>
            {codes
              .filter((c) => c !== main)
              .map((c) => (
                <Status key={c} code={c} />
              ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MiniOverview({ D }: { D: Derived }) {
  const link = useLink()
  const info = D.doc.info ?? {}
  const max = Math.max(1, ...D.tags.map((t) => t.ops.length))
  const many = D.tags.length > 8
  const shown = many ? [...D.tags].sort((a, b) => b.ops.length - a.ops.length).slice(0, 6) : D.tags
  const rest = D.ops.length - new Set(shown.flatMap((t) => t.ops.map((o) => o.key))).size
  return (
    <div className="oar-mini">
      <div className="oar-mini-hd">
        <b>{info.title || '未命名 API'}</b>
        {info.version ? <span className="oar-ver">v{info.version}</span> : null}
        <span className="oar-muted">OAS {D.version.raw}</span>
      </div>
      <div className="oar-mini-meta">
        <span>
          <b className="oar-tnum">{D.ops.length}</b> 支 operation
        </span>
        <span>
          <b className="oar-tnum">{D.tags.length}</b> 個 tag
        </span>
        <span>
          <b className="oar-tnum">{D.schemaNames.length}</b> 個 schema
        </span>
        <MethodCounts ops={D.ops} />
      </div>
      <div className="oar-mini-tags">
        {shown.map((t, i) => (
          <a key={t.name} className={`oar-mini-tag${i === 0 ? ' oar-first' : ''}`} {...link({ kind: 'tag', key: t.name })}>
            <code>{t.label}</code>
            <span className="oar-mini-d">{t.description || t.summary || ''}</span>
            <span className="oar-mini-bar">
              <i style={{ width: `${(t.ops.length / max) * 100}%` }} />
            </span>
            <b className="oar-tnum">{t.ops.length}</b>
          </a>
        ))}
      </div>
      {many ? (
        <div className="oar-mini-more">
          另有 {D.tags.length - shown.length} 個 tag，共 {rest} 支 operation，請在文件頁查看。
        </div>
      ) : null}
    </div>
  )
}

export function EmbedRoot({ D, operation }: { D: Derived; operation: string | undefined }) {
  const op = operation ? (D.opByKey.get(operation) ?? D.ops.find((o) => o.operationId === operation)) : undefined
  return (
    <div className="oar-embed">
      {operation && !op ? (
        <div className="oar-embed-err" role="alert">
          <TriangleAlert size={14} aria-hidden />
          <span>
            找不到 <code>operationId: &quot;{operation}&quot;</code>。檢查 <code>options.operation</code> 是否和 spec 一致。
          </span>
        </div>
      ) : op ? (
        <OpCard D={D} op={op} />
      ) : (
        <MiniOverview D={D} />
      )}
    </div>
  )
}

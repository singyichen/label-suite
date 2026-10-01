/* OpenAPI Renderer —— 欄位樹
 *
 * - $ref 欄位一律收合、型別 chip 可點到 Schema 頁（不無限展開）
 * - 最多內縮 3 層；第 3 層還有子項時改「深入 N 個欄位」，以該欄位為新的根，頂端出麵包屑
 * - 循環參照（欄位的 ref 已在祖先鏈上）不可展開，標「循環參照 · 同上層 X」
 * - oneOf／anyOf 以分段切換選項；allOf 攤平並標「來自 X」
 *
 * 展開狀態以欄位路徑字串為 key；換 schema 或 resetSig 變動（Esc 第三層）時全部重設。
 */

import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ChevronRight, CornerDownRight, GitMerge, Repeat } from 'lucide-react'
import { Enum, Required, Seg, TypeLabel } from './atoms'
import { children, constraints, isLocalRef, isNullable, kidCount, ptr, refName, refOf, schemaType } from './derive'
import type { Expansion } from './derive'
import { MdInline } from './markdown'
import type { Schema } from './types'

interface FocusFrame {
  label: string
  schema: Schema
  chain: string[]
  path: string
}

export function SchemaTree({
  doc,
  schema,
  resetSig = 0,
  rootLabel = 'body',
  maxDepth = 3,
  flat,
}: {
  doc: unknown
  schema: Schema | undefined
  resetSig?: number
  rootLabel?: string
  maxDepth?: number
  flat?: boolean
}) {
  const [opened, setOpened] = useState<Set<string>>(() => new Set())
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const [focus, setFocus] = useState<FocusFrame[]>([])
  const [variant, setVariant] = useState<Record<string, number>>({})
  useEffect(() => {
    setOpened(new Set())
    setClosed(new Set())
    setFocus([])
    setVariant({})
  }, [resetSig, schema])

  /* 預設：第 0 層的內嵌 object 展開，$ref 欄位收合 */
  const isOpen = (p: string, depth: number, isRef: boolean) => opened.has(p) || (!closed.has(p) && !isRef && depth < 1)
  const toggle = (p: string, cur: boolean) => {
    setOpened((s) => {
      const n = new Set(s)
      if (cur) n.delete(p)
      else n.add(p)
      return n
    })
    setClosed((s) => {
      const n = new Set(s)
      if (cur) n.add(p)
      else n.delete(p)
      return n
    })
  }

  function field(name: string, f0: Schema | undefined, req: boolean, path: string, depth: number, chain: string[], via: string | null): ReactNode {
    const f = f0 ?? {}
    const refN = refOf(f)
    const cyc = !!refN && chain.includes(refN)
    const kids = cyc ? null : children(doc, f, chain)
    const cnt = kidCount(kids)
    const hasKids = cnt > 0
    const seg = name + (schemaType(f) === 'array' ? '[]' : '')
    const p = path ? `${path}.${seg}` : seg
    const tooDeep = hasKids && depth >= maxDepth - 1
    const open = hasKids && !tooDeep && isOpen(p, depth, !!refN)
    const target = isLocalRef(f.$ref) ? (ptr(doc, f.$ref) as Schema | undefined) : undefined
    const desc = f.description ?? target?.description
    const enumV = f.enum ?? f.items?.enum
    const cons = constraints(f)
    const fmt = f.format ?? f.items?.format
    return (
      <div className={`oar-f${f.deprecated ? ' oar-dep' : ''}`} key={name}>
        <div className="oar-f-l">
          {hasKids && !tooDeep ? (
            <button type="button" className={`oar-fcaret${open ? ' oar-open' : ''}`} aria-expanded={open} aria-label={open ? `收合 ${name}` : `展開 ${name}`} onClick={() => toggle(p, open)}>
              <ChevronRight size={12} aria-hidden />
            </button>
          ) : (
            <span className="oar-fcaret-sp" />
          )}
          <code className="oar-f-n oar-f-own">{name}</code>
          <TypeLabel f={f} />
          {fmt ? <span className="oar-fmt">{fmt}</span> : null}
          {req ? <Required on /> : null}
          {isNullable(f) ? <span className="oar-flag">nullable</span> : null}
          {f.readOnly ? <span className="oar-flag">readOnly</span> : null}
          {f.writeOnly ? <span className="oar-flag">writeOnly</span> : null}
          {f.deprecated ? <span className="oar-flag oar-dep">已棄用</span> : null}
          {via ? <span className="oar-f-via">來自 {via}</span> : null}
          {cyc ? (
            <span className="oar-flag oar-cyc" title={`${refN} 已在上層展開過，為避免無限展開停在這裡`}>
              <Repeat size={11} aria-hidden />
              循環參照 · 同上層 {refN}
            </span>
          ) : null}
          {tooDeep && kids ? (
            <button type="button" className="oar-dive" onClick={() => setFocus([...focus, { label: p, schema: f, chain, path: p }])}>
              <CornerDownRight size={12} aria-hidden />
              深入 {cnt} 個{kids.kind === 'combo' ? '選項' : '欄位'}
            </button>
          ) : null}
        </div>
        {desc || enumV || cons.length ? (
          <div className="oar-f-d oar-f-own">
            {desc ? <MdInline text={desc} /> : null}
            {enumV ? <Enum values={enumV} /> : null}
            {cons.map((c) => (
              <span key={c} className="oar-con">
                {c}
              </span>
            ))}
          </div>
        ) : null}
        {open && kids ? <div className="oar-f-kids">{renderExp(kids, p, depth + 1)}</div> : null}
      </div>
    )
  }

  function renderExp(e: Expansion, path: string, depth: number): ReactNode {
    if (e.kind === 'cycle') {
      return (
        <div className="oar-f-note">
          <Repeat size={12} aria-hidden />
          循環參照 {e.refName}，停在這裡
        </div>
      )
    }
    if (e.kind === 'map') return field('{key}', e.value, false, path, depth, e.chain, null)
    if (e.kind === 'array') return null
    if (e.kind === 'combo') {
      const vk = path || '$'
      const vi = Math.min(variant[vk] ?? 0, e.variants.length - 1)
      const v = e.variants[vi]
      const inner = children(doc, v.schema, e.chain)
      const vRef = isLocalRef(v.schema.$ref) ? refName(v.schema.$ref) : null
      return (
        <div className="oar-combo">
          <div className="oar-combo-h">
            <span className="oar-combo-m">
              <GitMerge size={12} aria-hidden />
              {e.mode}
            </span>
            <span>
              {e.mode === 'oneOf' ? '擇一' : '一個或多個'}
              {e.discriminator ? (
                <>
                  ，依 <code>{e.discriminator}</code> 判斷
                </>
              ) : null}
            </span>
            <Seg
              mono
              label={`${e.mode} 選項`}
              value={vi}
              options={e.variants.map((x, i) => ({ value: i, label: x.title ? `${x.label} · ${x.title}` : x.label }))}
              onChange={(i) => setVariant({ ...variant, [vk]: i })}
            />
          </div>
          <div className="oar-combo-b">
            {vRef ? (
              <div className="oar-combo-ref">
                選項 <TypeLabel f={v.schema} />
                {e.chain.includes(vRef) ? (
                  <span className="oar-flag oar-cyc">
                    <Repeat size={11} aria-hidden />
                    循環參照
                  </span>
                ) : null}
              </div>
            ) : null}
            {inner ? (
              renderExp(inner, `${path}<${vi}>`, depth)
            ) : (
              <div className="oar-f-note">
                {v.schema.type === 'null' ? (
                  '值為 null'
                ) : (
                  <>
                    型別 <code className="oar-type">{schemaType(v.schema) ?? 'any'}</code>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }
    if (!e.props.length) return <div className="oar-f-note">{e.free ? '任意 object，spec 沒有列出欄位' : '沒有欄位'}</div>
    const merged = !!e.allOf && e.allOf.length > 1
    return (
      <>
        {merged && depth === 0 ? (
          <div className="oar-allof">
            <GitMerge size={12} aria-hidden />
            <b>allOf</b> 合併自{' '}
            {e.allOf?.map((x, i) => (
              <Fragment key={i}>
                {i ? ' + ' : ''}
                {x === '內嵌' ? '內嵌欄位' : <code>{x}</code>}
              </Fragment>
            ))}
          </div>
        ) : null}
        {e.props.map(([n, f, via], i) => (
          <Fragment key={`${n}-${i}`}>{field(n, f, e.required.has(n), path, depth, e.chain, merged && via !== '內嵌' ? via : null)}</Fragment>
        ))}
      </>
    )
  }

  const base = focus.length ? focus[focus.length - 1] : null
  const rootExp = base ? children(doc, base.schema, base.chain) : children(doc, schema, [])
  const isArr = schemaType(schema) === 'array'
  const rootRef = !base && !!schema && (!!schema.$ref || !!schema.items?.$ref)

  return (
    <div className={`oar-tree${flat ? ' oar-flat' : ''}`}>
      {base ? (
        <div className="oar-tree-crumb">
          <button type="button" className="oar-tree-back" onClick={() => setFocus(focus.slice(0, -1))} title="回上層" aria-label="回上層">
            <ArrowLeft size={12} aria-hidden />
          </button>
          <button type="button" onClick={() => setFocus([])}>
            {rootLabel}
          </button>
          {focus.map((x, i) => (
            <Fragment key={i}>
              <ChevronRight size={11} aria-hidden />
              {i === focus.length - 1 ? (
                <b>{x.label}</b>
              ) : (
                <button type="button" onClick={() => setFocus(focus.slice(0, i + 1))}>
                  {x.label}
                </button>
              )}
            </Fragment>
          ))}
        </div>
      ) : rootRef || isArr ? (
        <div className="oar-tree-root">
          <span>{isArr ? '陣列，每個元素為' : '型別'}</span>
          <TypeLabel f={isArr ? (schema?.items ?? {}) : schema} />
          {rootRef ? <span className="oar-tree-root-n">{kidCount(rootExp)} 個欄位</span> : null}
        </div>
      ) : null}
      {rootExp ? (
        renderExp(rootExp, base ? base.path : '', 0)
      ) : (
        <div className="oar-tree-prim">
          <TypeLabel f={schema} />
          {schema?.format ? <span className="oar-fmt">{schema.format}</span> : null}
          {schema?.description ? <MdInline text={schema.description} /> : null}
        </div>
      )}
    </div>
  )
}

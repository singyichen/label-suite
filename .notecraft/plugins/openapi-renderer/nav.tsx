/* OpenAPI Renderer —— 導覽
 *
 * 篩選（path／summary／operationId 文字 + method 複選）→ 總覽 → OPERATIONS（tag → op）→ SCHEMAS。
 * - tag ≤ 6 個全部展開；> 6 只展開目前所在的 tag；篩選中命中的 tag 強制展開、caret 停用、沒命中的隱藏
 * - 收合的 tag 不 render 子列（極大文件首次 render 的成本）
 * - tag 內共同前綴顯示一次，列上只顯示剩餘部分；超長 path 以 `/…/` 截斷，完整的在 title 與 hover 卡
 * - 選中的 op 下方展開區段錨點，捲動時同步高亮
 */

import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Braces, ChevronRight, House, Search, Tag as TagIcon } from 'lucide-react'
import { Method, PathText } from './atoms'
import { METHODS, NO_TAG, opMatch, opSections, shortPath } from './derive'
import type { Derived, OpEntry, Route } from './types'

export interface Tip {
  op: OpEntry
  x: number
  y: number
}

export function Nav({
  D,
  route,
  go,
  q,
  setQ,
  methods,
  setMethods,
  openTags,
  toggleTag,
  activeSec,
  onSec,
  inputRef,
  navSummary,
  setTip,
}: {
  D: Derived
  route: Route
  go: (r: Route) => void
  q: string
  setQ: (q: string) => void
  methods: Set<string>
  setMethods: (s: Set<string>) => void
  openTags: Set<string>
  toggleTag: (name: string) => void
  activeSec: string | null
  onSec: (id: string) => void
  inputRef: RefObject<HTMLInputElement>
  navSummary: 'hover' | 'line'
  setTip: (t: Tip | null) => void
}) {
  const ql = q.trim().toLowerCase()
  const filtering = !!ql || methods.size > 0
  const shown = useMemo(() => D.ops.filter((o) => opMatch(o, ql, methods)).length, [D, ql, methods])
  const present = useMemo(() => METHODS.filter((m) => D.ops.some((o) => o.method === m)), [D])
  const schemaHits = D.schemaNames.filter((n) => !ql || n.toLowerCase().includes(ql))
  const secs = route.kind === 'op' ? opSections(D.opByKey.get(route.key)) : []
  const scrollRef = useRef<HTMLDivElement | null>(null)

  /* 選中項不在可視範圍 → 只捲導覽自己（不用 scrollIntoView，那會連外層的捲動容器一起捲） */
  useEffect(() => {
    const sc = scrollRef.current
    if (!sc) return undefined
    const id = requestAnimationFrame(() => {
      const el = sc.querySelector<HTMLElement>('.oar-nav-op.oar-on, .oar-nav-item.oar-on')
      if (!el) return
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop
      if (top < sc.scrollTop + 8 || top > sc.scrollTop + sc.clientHeight - 60) sc.scrollTop = top - sc.clientHeight / 3
    })
    return () => cancelAnimationFrame(id)
  }, [route])

  return (
    <nav className="oar-nav" aria-label="API 導覽">
      <div className="oar-nav-search">
        <Search size={13} aria-hidden />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="篩選 path、summary" aria-label="篩選 operation" />
        {filtering ? (
          <span className={`oar-hits ${shown ? 'oar-hits-ok' : 'oar-hits-none'}`}>
            {shown}/{D.ops.length}
          </span>
        ) : (
          <kbd className="oar-kbd" aria-hidden>
            /
          </kbd>
        )}
      </div>
      <div className="oar-nav-methods" role="group" aria-label="依 method 篩選">
        {present.map((m) => {
          const n = D.ops.filter((o) => o.method === m).length
          const on = methods.has(m)
          return (
            <button
              type="button"
              key={m}
              aria-pressed={on}
              className={`oar-mchip${on ? ' oar-on' : ''}`}
              onClick={() => {
                const s = new Set(methods)
                if (on) s.delete(m)
                else s.add(m)
                setMethods(s)
              }}
            >
              <Method m={m} />
              <span className="oar-tnum">{n}</span>
            </button>
          )
        })}
      </div>
      <div className="oar-nav-scroll" ref={scrollRef} onScroll={() => setTip(null)}>
        <button
          type="button"
          className={`oar-nav-item${route.kind === 'overview' ? ' oar-on' : ''}`}
          aria-current={route.kind === 'overview' ? 'page' : undefined}
          onClick={() => go({ kind: 'overview' })}
        >
          <House size={13} aria-hidden />
          <span className="oar-nav-l">總覽</span>
        </button>
        <div className="oar-nav-sec">
          OPERATIONS
          <span>{filtering ? `${shown}/${D.ops.length}` : D.ops.length}</span>
        </div>
        {D.tags.map((t) => {
          const vis = filtering ? t.ops.filter((o) => opMatch(o, ql, methods)) : t.ops
          if (filtering && !vis.length) return null
          const open = filtering || openTags.has(t.name)
          const tagOn = route.kind === 'tag' && route.key === t.name
          return (
            <div key={t.name}>
              <div className={`oar-nav-item oar-nav-item--node${tagOn ? ' oar-on' : ''}`}>
                <button
                  type="button"
                  className={`oar-caret${open ? ' oar-open' : ''}`}
                  aria-expanded={open}
                  aria-label={open ? `收合 ${t.label}` : `展開 ${t.label}`}
                  onClick={() => toggleTag(t.name)}
                  disabled={filtering}
                >
                  <ChevronRight size={12} aria-hidden />
                </button>
                <button type="button" className="oar-nav-main" aria-current={tagOn ? 'page' : undefined} onClick={() => go({ kind: 'tag', key: t.name })}>
                  <TagIcon size={12} aria-hidden />
                  <span className={`oar-nav-l${t.name === NO_TAG ? ' oar-none' : ''}`}>{t.label}</span>
                  <span className="oar-nav-n">{filtering ? `${vis.length}/${t.ops.length}` : t.ops.length}</span>
                </button>
              </div>
              {open ? (
                <div className="oar-nav-group">
                  {t.base ? (
                    <div className="oar-nav-base" title="這個 tag 內所有 path 的共同前綴">
                      {t.base}
                    </div>
                  ) : null}
                  {vis.map((o) => {
                    const on = route.kind === 'op' && route.key === o.key
                    const rest = t.base ? o.path.slice(t.base.length) || '/' : o.path
                    return (
                      <div key={o.key}>
                        <button
                          type="button"
                          className={`oar-nav-op${on ? ' oar-on' : ''}${o.deprecated ? ' oar-dep' : ''}${navSummary === 'line' ? ' oar-two' : ''}`}
                          aria-current={on ? 'page' : undefined}
                          aria-label={`${o.method.toUpperCase()} ${o.path}${o.summary ? `，${o.summary}` : ''}${o.deprecated ? '（已棄用）' : ''}`}
                          onClick={() => go({ kind: 'op', key: o.key })}
                          onMouseEnter={(e) => {
                            if (navSummary !== 'hover') return
                            const r = e.currentTarget.getBoundingClientRect()
                            setTip({ op: o, x: r.right + 8, y: r.top })
                          }}
                          onMouseLeave={() => setTip(null)}
                        >
                          <Method m={o.method} />
                          <span className="oar-nav-pw">
                            <span className="oar-nav-p">
                              <PathText path={rest} display={shortPath(rest, t.base ? 19 : 21)} />
                            </span>
                            {navSummary === 'line' ? <span className="oar-nav-s">{o.summary || <i>沒有 summary</i>}</span> : null}
                          </span>
                          {o.deprecated ? <span className="oar-nav-dep">棄用</span> : null}
                        </button>
                        {on && secs.length ? (
                          <div className="oar-nav-secs">
                            {secs.map((s) => (
                              <button type="button" key={s.id} className={activeSec === s.id ? 'oar-on' : ''} onClick={() => onSec(s.id)}>
                                {s.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
        {filtering && !shown ? (
          <p className="oar-nav-empty">
            沒有符合的 operation。按 <kbd className="oar-kbd">Esc</kbd> 清除篩選。
          </p>
        ) : null}
        {D.schemaNames.length && schemaHits.length ? (
          <>
            <div className="oar-nav-sec">
              SCHEMAS
              <span>{ql ? `${schemaHits.length}/${D.schemaNames.length}` : D.schemaNames.length}</span>
            </div>
            {schemaHits.map((n) => {
              const on = route.kind === 'schema' && route.key === n
              return (
                <button
                  type="button"
                  key={n}
                  className={`oar-nav-item oar-nav-item--leaf${on ? ' oar-on' : ''}`}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => go({ kind: 'schema', key: n })}
                >
                  <Braces size={12} aria-hidden />
                  <span className="oar-nav-l">
                    <code>{n}</code>
                  </span>
                  <span className="oar-nav-n" title="被幾支 operation 使用">
                    {D.usage[n].length || ''}
                  </span>
                </button>
              )
            })}
          </>
        ) : null}
      </div>
      <div className="oar-nav-foot">
        <kbd className="oar-kbd">/</kbd>篩選<kbd className="oar-kbd oar-kbd-gap">Esc</kbd>逐層退出
      </div>
    </nav>
  )
}

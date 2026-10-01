/* ER Diagram Renderer —— 導覽樹（Schema → 分群 → Table）
 *
 * 沒有 schemas 時（v1.1 資料檔）省略 Schema 那一層、直接從分群開始 ——
 * 只有一個節點的層級沒有意義，還會多一個「全部」讓人以為有得選。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight, Database, Home, Search, Table, X } from 'lucide-react'
import { matchTable } from './derive'
import type { ErDerived, ErTreeGroup } from './derive'
import type { ErTable, Route } from './types'

export interface ErNavProps {
  D: ErDerived
  route: Route
  go: (r: Route) => void
  /** embed：只展開 route 所在的節點；page：全展開 */
  compact: boolean
  /** 開啟時是否把焦點移到篩選框（覆蓋式導覽） */
  autoFocus: boolean
}

interface Hit {
  table: ErTable
  /** 僅因欄位命中時的欄名 */
  columns: string[]
}

export function ErNav({ D, route, go, compact, autoFocus }: ErNavProps) {
  const [filter, setFilter] = useState('')
  const f = filter.trim()

  /* 目前 route 所在的節點 key（schema 或 group），compact 時只展開它 */
  const routeNode = useMemo(() => {
    if (route.kind === 'schema') return route.key
    if (route.kind === 'table') {
      const t = D.byName.get(route.key)
      if (!t) return null
      return D.implicit ? t.group : D.schemaOfTable(t.name)
    }
    return null
  }, [route, D])

  const allNodes = useMemo(
    () => (D.implicit ? D.tree[0].groups.map((g) => g.key) : D.tree.map((s) => s.key)),
    [D],
  )
  const [closed, setClosed] = useState<Set<string>>(
    () => new Set(compact ? allNodes.filter((k) => k !== routeNode) : []),
  )
  /* 換頁到收合中的節點時自動展開它 —— 導覽要看得到自己在哪 */
  useEffect(() => {
    if (!routeNode) return
    setClosed((c) => {
      if (!c.has(routeNode)) return c
      const n = new Set(c)
      n.delete(routeNode)
      return n
    })
  }, [routeNode])

  const toggle = (k: string) =>
    setClosed((c) => {
      const n = new Set(c)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const hits = useMemo(() => {
    const m = new Map<string, Hit>()
    for (const s of D.tree) {
      for (const g of s.groups) {
        for (const t of g.tables) {
          const r = matchTable(t, f)
          if (r.hit) m.set(t.name, { table: t, columns: r.byName ? [] : r.columns })
        }
      }
    }
    return m
  }, [D, f])
  const total = useMemo(() => D.tree.reduce((a, s) => a + s.groups.reduce((b, g) => b + g.tables.length, 0), 0), [D])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  /* 目前節點捲進視野（載入與換頁時） */
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[aria-current="page"]')
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [route])

  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const isOn = (r: Route) =>
    route.kind === r.kind && (r.kind === 'overview' || ('key' in route && 'key' in r && route.key === r.key))

  const tableRow = (t: ErTable) => {
    const hit = hits.get(t.name)
    if (!hit) return null
    const on = isOn({ kind: 'table', key: t.name })
    return (
      <button
        type="button"
        key={t.name}
        className={`erd-root erd-nav-item erd-nav-item--table${on ? ' erd-on' : ''}`}
        aria-current={on ? 'page' : undefined}
        onClick={() => go({ kind: 'table', key: t.name })}
        title={hit.columns.length ? `命中欄位：${hit.columns.join('、')}` : undefined}
      >
        <Table size={12} aria-hidden />
        <span className="erd-root erd-nav-l">
          <code>{t.name}</code>
          {hit.columns.length ? (
            <span className="erd-root erd-nav-colhit">
              <code>{hit.columns[0]}</code>
              {hit.columns.length > 1 ? ' …' : ''}
            </span>
          ) : (
            <span className="erd-root erd-nav-sub">{t.label}</span>
          )}
        </span>
      </button>
    )
  }

  const groupBlock = (g: ErTreeGroup) => {
    const shown = g.tables.filter((t) => hits.has(t.name))
    if (f && !shown.length) return null
    return (
      <div className="erd-root erd-nav-group" key={g.key}>
        <div className="erd-root erd-nav-glabel">{g.label}</div>
        {g.tables.map(tableRow)}
      </div>
    )
  }

  /* 可收合的一列：schema（有 schemas 時）或分群（隱含模式時） */
  const collapsible = (
    key: string,
    count: number,
    open: boolean,
    main: ReactNode,
    children: ReactNode,
    onMain?: () => void,
    on?: boolean,
  ) => (
    <div className="erd-root erd-nav-node" key={key}>
      <div className={`erd-root erd-nav-item erd-nav-item--node${on ? ' erd-on' : ''}`}>
        <button
          type="button"
          className={`erd-root erd-caret${open ? ' erd-caret--open' : ''}`}
          aria-expanded={open}
          aria-label={open ? '收合' : '展開'}
          onClick={() => toggle(key)}
        >
          <ChevronRight size={12} aria-hidden />
        </button>
        <button
          type="button"
          className="erd-root erd-nav-main"
          aria-current={on ? 'page' : undefined}
          onClick={onMain ?? (() => toggle(key))}
        >
          {main}
          <span className="erd-root erd-nav-n">{count}</span>
        </button>
      </div>
      {open ? children : null}
    </div>
  )

  const shownCount = hits.size

  return (
    <nav className="erd-root erd-nav" aria-label="Schema 與資料表">
      <div className="erd-root erd-nav-search">
        <Search size={13} aria-hidden />
        <input
          ref={inputRef}
          value={filter}
          onChange={(ev) => setFilter(ev.target.value)}
          placeholder="篩選資料表或欄位"
          aria-label="篩選資料表或欄位"
        />
        {f ? (
          <>
            <span
              className={`erd-root erd-hits ${shownCount ? 'erd-hits-ok' : 'erd-hits-none'}`}
              role="status"
              aria-live="polite"
            >
              {shownCount}/{total}
            </span>
            <button type="button" className="erd-root erd-clear" aria-label="清除篩選" onClick={() => setFilter('')}>
              <X size={12} aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      <div className="erd-root erd-nav-scroll" ref={scrollRef}>
        <button
          type="button"
          className={`erd-root erd-nav-item erd-nav-item--top${isOn({ kind: 'overview' }) ? ' erd-on' : ''}`}
          aria-current={isOn({ kind: 'overview' }) ? 'page' : undefined}
          onClick={() => go({ kind: 'overview' })}
        >
          <Home size={13} aria-hidden />
          <span className="erd-root erd-nav-l">總覽</span>
        </button>

        {D.implicit ? (
          <>
            <div className="erd-root erd-nav-sec">
              分群<span>{D.tree[0].groups.length}</span>
            </div>
            {D.tree[0].groups.map((g) => {
              const shown = g.tables.filter((t) => hits.has(t.name))
              if (f && !shown.length) return null
              const open = f ? true : !closed.has(g.key)
              return collapsible(
                g.key,
                g.tables.length,
                open,
                <span className="erd-root erd-nav-l erd-nav-l--group">{g.label}</span>,
                <div className="erd-root erd-nav-group erd-nav-group--flat">{g.tables.map(tableRow)}</div>,
              )
            })}
          </>
        ) : (
          <>
            <div className="erd-root erd-nav-sec">
              SCHEMAS<span>{D.tree.length}</span>
            </div>
            {D.tree.map((s) => {
              const tables = s.groups.flatMap((g) => g.tables)
              if (f && !tables.some((t) => hits.has(t.name))) return null
              const open = f ? true : !closed.has(s.key)
              return collapsible(
                s.key,
                tables.length,
                open,
                <>
                  <Database size={13} aria-hidden />
                  <span className="erd-root erd-nav-l">
                    <code>{s.key}</code>
                    {s.label}
                  </span>
                </>,
                <>{s.groups.map(groupBlock)}</>,
                () => go({ kind: 'schema', key: s.key }),
                isOn({ kind: 'schema', key: s.key }),
              )
            })}
          </>
        )}
      </div>
    </nav>
  )
}

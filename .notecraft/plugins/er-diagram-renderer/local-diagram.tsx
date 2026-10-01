/* ER Diagram Renderer —— Table 頁的局部關聯圖
 *
 * 三欄：父表 ← 本表 ← 子表。箭頭一律指向父表（與 FK 方向相同：子 → 父）。
 * 固定版面、不縮放；連線量測 DOM 後以 SVG 直角折線（圓角轉折）繪製，容器尺寸變動（含字型晚到）時重算。
 *
 * 父／子表各最多畫 8 張：hub 表（例：選項主檔）的子表可能上百張，全畫會把頁面拉到數千 px。
 * 超過的以「另有 N 張」chip 帶到下方清單 —— 清單永遠列全部。
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ErDerived } from './derive'

/** 每欄最多畫幾張 */
const LOCAL_MAX = 8
/** 容器寬度小於此值時改為上下三列 */
const VERTICAL_BELOW = 560

export interface ErLocalDiagramProps {
  D: ErDerived
  name: string
  onOpen: (name: string) => void
}

interface Line {
  id: string
  d: string
}

/** 折線轉角的圓角半徑上限 */
const CORNER = 8

/** 水平走向的直角折線：(x1,y1) 橫向到主幹 midX、沿主幹縱向、再橫向到 (x2,y2)。高度相同時就是一條橫線 */
function elbowH(x1: number, y1: number, x2: number, y2: number, midX: number): string {
  const dy = y2 - y1
  if (Math.abs(dy) < 1) return `M ${x1} ${y1} L ${x2} ${y2}`
  const sx1 = Math.sign(midX - x1) || 1
  const sx2 = Math.sign(x2 - midX) || 1
  const sy = Math.sign(dy)
  const r = Math.min(CORNER, Math.abs(dy) / 2, Math.abs(midX - x1), Math.abs(x2 - midX))
  return [
    `M ${x1} ${y1}`,
    `H ${midX - sx1 * r}`,
    `Q ${midX} ${y1} ${midX} ${y1 + sy * r}`,
    `V ${y2 - sy * r}`,
    `Q ${midX} ${y2} ${midX + sx2 * r} ${y2}`,
    `H ${x2}`,
  ].join(' ')
}

export function ErLocalDiagram({ D, name, onOpen }: ErLocalDiagramProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const nodes = useRef<Map<string, HTMLElement>>(new Map())
  const [lines, setLines] = useState<Line[]>([])
  const [vertical, setVertical] = useState(false)

  const parents = D.parentTables(name)
  const children = D.childTables(name)
  const self = D.edges.some((e) => e.self && e.child === name)
  const shownP = parents.slice(0, LOCAL_MAX)
  const shownC = children.slice(0, LOCAL_MAX)
  const t = D.byName.get(name)

  const measure = useCallback(() => {
    const box = boxRef.current
    const me = nodes.current.get('@')
    if (!box || !me) return
    setVertical(box.clientWidth > 0 && box.clientWidth < VERTICAL_BELOW)
    const b = box.getBoundingClientRect()
    const m = me.getBoundingClientRect()
    const out: Line[] = []
    const rel = (r: DOMRect) => ({
      l: r.left - b.left,
      r: r.right - b.left,
      t: r.top - b.top,
      b: r.bottom - b.top,
      cx: r.left - b.left + r.width / 2,
      cy: r.top - b.top + r.height / 2,
    })
    const M = rel(m)
    const isVertical = box.clientWidth < VERTICAL_BELOW
    const P = shownP.map((p) => [p, nodes.current.get(`p:${p}`)] as const).filter((x): x is readonly [string, HTMLElement] => !!x[1])
      .map(([p, el]) => [p, rel(el.getBoundingClientRect())] as const)
    const C = shownC.map((c) => [c, nodes.current.get(`c:${c}`)] as const).filter((x): x is readonly [string, HTMLElement] => !!x[1])
      .map(([c, el]) => [c, rel(el.getBoundingClientRect())] as const)

    /* 直角折線：同一側的表共用一條主幹，主幹放在欄距正中間 —— 各自取中點的話，
       節點寬度不一，主幹會散成好幾條錯開的豎線。父表箭頭落在父表、子表箭頭落在本表（同 FK 方向）。 */
    if (isVertical) {
      /* 上下三列（窄寬度）：父表、子表各自換行成好幾列，逐一連線會穿過前一列的節點。
         改為整列一條主幹：本表 → 父表那一列、子表那一列 → 本表 */
      if (P.length) out.push({ id: 'p', d: `M ${M.cx} ${M.t} V ${Math.max(...P.map(([, r]) => r.b))}` })
      if (C.length) out.push({ id: 'c', d: `M ${M.cx} ${Math.min(...C.map(([, r]) => r.t))} V ${M.b}` })
    } else {
      const pMid = P.length ? (M.l + Math.max(...P.map(([, r]) => r.r))) / 2 : 0
      const cMid = C.length ? (M.r + Math.min(...C.map(([, r]) => r.l))) / 2 : 0
      for (const [p, r] of P) out.push({ id: `p:${p}`, d: elbowH(M.l, M.cy, r.r, r.cy, pMid) })
      for (const [c, r] of C) out.push({ id: `c:${c}`, d: elbowH(r.l, r.cy, M.r, M.cy, cMid) })
    }
    setLines(out)
    // shownP／shownC 由 name 與 D 決定
  }, [name, D])

  useLayoutEffect(() => {
    measure()
  }, [measure, vertical])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return undefined
    const ro = new ResizeObserver(() => measure())
    ro.observe(box)
    /* Noto Sans TC 較晚到，首次量測的節點寬度會偏 */
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) measure()
    })
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [measure])

  const jumpTo = (which: 'parents' | 'children') => {
    const page = boxRef.current?.closest('.erd-page')
    page?.querySelector(`[data-erd-rel="${which}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const node = (n: string, key: string) => (
    <button
      type="button"
      key={key}
      ref={(el) => {
        if (el) nodes.current.set(key, el)
        else nodes.current.delete(key)
      }}
      className="erd-root erd-ln"
      onClick={() => onOpen(n)}
    >
      <span className="erd-root erd-ln-n">{n}</span>
      <span className="erd-root erd-ln-l">{D.byName.get(n)?.label}</span>
    </button>
  )

  const more = (total: number, which: 'parents' | 'children') =>
    total > LOCAL_MAX ? (
      <button type="button" className="erd-root erd-ln-more" onClick={() => jumpTo(which)}>
        另有 {total - LOCAL_MAX} 張
      </button>
    ) : null

  return (
    <div className={`erd-root erd-local${vertical ? ' erd-local--v' : ''}`} ref={boxRef}>
      <svg className="erd-root erd-local-svg" aria-hidden>
        <defs>
          <marker id="erd-la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 z" className="erd-root erd-local-head" />
          </marker>
        </defs>
        {lines.map((l) => (
          <path key={l.id} d={l.d} markerEnd="url(#erd-la)" />
        ))}
      </svg>
      <div className="erd-root erd-local-col erd-local-col--p">
        <div className="erd-root erd-local-h">父表 {parents.length}</div>
        {shownP.length ? shownP.map((p) => node(p, `p:${p}`)) : <div className="erd-root erd-local-empty">無</div>}
        {more(parents.length, 'parents')}
      </div>
      <div className="erd-root erd-local-col erd-local-col--me">
        <div className="erd-root erd-local-h">本表</div>
        <div
          className="erd-root erd-ln erd-ln--me"
          ref={(el) => {
            if (el) nodes.current.set('@', el)
            else nodes.current.delete('@')
          }}
        >
          <span className="erd-root erd-ln-n">{name}</span>
          <span className="erd-root erd-ln-l">{t?.label}</span>
          {self ? <span className="erd-root erd-ln-self">自我參照</span> : null}
        </div>
      </div>
      <div className="erd-root erd-local-col erd-local-col--c">
        <div className="erd-root erd-local-h">子表 {children.length}</div>
        {shownC.length ? shownC.map((c) => node(c, `c:${c}`)) : <div className="erd-root erd-local-empty">無</div>}
        {more(children.length, 'children')}
      </div>
    </div>
  )
}

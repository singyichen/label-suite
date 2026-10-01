/* ER Diagram Renderer —— Diagram 分頁（無限畫布）
 *
 * 版面是固定欄數的無限畫布（可拖曳平移、⌘/Ctrl 加滾輪縮放）。早期版本改用橫向捲軸，
 * 但捲軸只能左右看、看不到全貌；要「先縮小看整體、再放大看局部」就得是畫布。
 *
 * 關聯（edges）由欄位的 fk 推導，不存進資料檔 —— 存了就會有兩份真相。
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MutableRefObject } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Info, Maximize2, Minus, Plus, Search, X } from 'lucide-react'
import type {
  Edge,
  ErColumn,
  ErDiagramData,
  ErOptions,
  ErTable,
  TipState,
  ViewState,
} from './types'
import { matchTable } from './derive'
import { FIT_PAD, MAX_ZOOM, MIN_ZOOM, TIP_HALF, ZOOM_STEP, clampZoom } from './types'

export interface ErDiagramProps {
  data: ErDiagramData
  /** 已合併三層來源的設定（見 renderer.tsx） */
  opts: ErOptions
  /** 範圍內的表名；null = 全部 */
  scope: Set<string> | null
  onOpenWiki: (name: string) => void
  /** 搜尋字串與 hub 開關的狀態在外殼：切到 Wiki 再切回來時要還在 */
  query: string
  onQueryChange: (q: string) => void
  showHubEdges: boolean
  onShowHubEdgesChange: (v: boolean) => void
  /** true：畫布填滿外殼剩餘高度（目前三種情境都是）；false：依視窗算固定高度（v1.1 的 page 行為，保留給 options 以外的用途） */
  fill: boolean
  /** 是否在全寬檢視中。只用來觸發重新 fit 與量測 —— 畫布搬進覆蓋層後尺寸會變 */
  wide: boolean
  /** 聚焦的表。狀態在外殼：聚焦要與 Wiki 的路由同步 */
  focus: string | null
  onFocusChange: (name: string | null) => void
  /** 外殼按 Esc 時先問畫布：有聚焦或 tooltip 可退就退並回 true */
  escapeRef: MutableRefObject<(() => boolean) | null>
}

export function ErDiagram({
  data,
  opts,
  fill,
  wide,
  scope,
  focus,
  onFocusChange,
  onOpenWiki,
  query,
  onQueryChange,
  showHubEdges,
  onShowHubEdgesChange,
  escapeRef,
}: ErDiagramProps) {
  /* 範圍（schema）：只畫範圍內的表。沒有範圍時完全沿用 v1.1 —— 連空的分群框也照畫 */
  const allTables = data.tables
  const tables = useMemo(
    () => (scope ? allTables.filter((t) => scope.has(t.name)) : allTables),
    [allTables, scope],
  )
  const layoutColumns = useMemo(
    () =>
      scope
        ? data.layout.columns
            .map((c) => ({ ...c, groups: c.groups.filter((g) => tables.some((t) => t.group === g)) }))
            .filter((c) => c.groups.length > 0)
        : data.layout.columns,
    [data.layout.columns, scope, tables],
  )
  /** 一端在範圍內、一端在範圍外的外鍵：不畫，但要說有幾條，免得讀者以為沒有關聯 */
  const crossEdges = useMemo(() => {
    if (!scope) return 0
    const all = new Set(allTables.map((t) => t.name))
    return allTables.reduce(
      (n, t) => n + t.columns.filter((c) => c.fk && all.has(c.fk) && scope.has(t.name) !== scope.has(c.fk)).length,
      0,
    )
  }, [allTables, scope])

  const groupLabel = useMemo(
    () => Object.fromEntries(data.groups.map((g) => [g.key, g.label])),
    [data.groups],
  )
  const byName = useMemo(() => new Map(tables.map((t) => [t.name, t])), [tables])

  /* 關聯由欄位的 fk 推導，不存進資料檔 —— 存了就會有兩份真相，改一邊忘另一邊。 */
  const edges = useMemo<Edge[]>(
    () =>
      tables.flatMap((t) =>
        t.columns
          .filter((c) => c.fk && tables.some((x) => x.name === c.fk))
          .map((c) => ({
            id: `${t.name}.${c.name}`,
            child: t.name,
            parent: c.fk as string,
            col: c.name,
            self: c.fk === t.name,
          })),
      ),
    [tables],
  )

  /* hub 表：被極多張表指向的共用表（例：選項主檔）。它的連線預設收起來，
     否則整張圖會被這一張表的放射狀線條蓋滿。取代原本寫死的 option_item。 */
  const hubTables = useMemo(
    () => new Set(opts.hubTables.filter((h) => !scope || scope.has(h))),
    [opts, scope],
  )

  const requirementOf = useCallback(
    (key: string) => data.requirement.find((r) => r.key === key),
    [data.requirement],
  )
  const derivationOf = useCallback(
    (key: string | undefined) => (key ? data.derivations.find((d) => d.key === key) : undefined),
    [data.derivations],
  )

  /* 預設顯示：主鍵、全部外鍵，再補一般欄位到 defaultRows 為止 */
  const defaultColumns = useCallback(
    (t: ErTable): ErColumn[] => {
      const keyCols = t.columns.filter((c) => c.pk || c.fk)
      const rest = t.columns.filter((c) => !c.pk && !c.fk)
      const out = [...keyCols]
      for (const c of rest) {
        if (out.length >= opts.defaultRows) break
        out.push(c)
      }
      return t.columns.filter((c) => out.includes(c))
    },
    [opts.defaultRows],
  )

  const [hover, setHover] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tip, setTip] = useState<TipState | null>(null)
  const [paths, setPaths] = useState<
    { id: string; d: string; child: string; parent: string; col: string; mx: number; my: number }[]
  >([])

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  /* ── 無限畫布 ─────────────────────────────────────────────
     取代原本的橫向捲軸。五欄版面在內文欄寬下必然溢出，捲軸只能左右看、
     看不到全貌；改成可縮放平移的畫布後，「先縮小看整體、再放大看局部」
     這件事才做得到。

     座標：stage 套 translate(x, y) scale(z)，transform-origin 左上。
     連線的量測（measure）本來就會除以當下倍率換回版面座標，不必改。 */
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, z: 1 })
  const viewRef = useRef(view)
  viewRef.current = view
  /* 使用者動過之後就不再自動 fit —— 否則字體載入完、或展開一張表，
     視角會被硬拉回原點，正在看的地方就不見了。 */
  const touchedRef = useRef(false)
  /* 換範圍等於換一張圖：放掉「使用者動過視角」的旗標，讓量測完的新尺寸重新 fit */
  useLayoutEffect(() => {
    touchedRef.current = false
  }, [scope])
  const [animate, setAnimate] = useState(false)
  const [panning, setPanning] = useState(false)
  const panRef = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null)
  /** 剛剛那次 pointer 互動是拖曳還是點擊 —— 拖完的 click 不該取消聚焦 */
  const draggedRef = useRef(false)

  const applyFit = useCallback(
    (smooth: boolean) => {
      const vp = viewportRef.current
      if (!vp || canvasSize.w <= 0 || canvasSize.h <= 0) return
      const vw = vp.clientWidth
      const vh = vp.clientHeight
      if (vw <= 0 || vh <= 0) return
      /* fit 的是**寬度**，不是整張圖。
         這種版面是固定欄數、往下長的形狀，用寬高都塞得下的倍率去 fit，
         高度會成為瓶頸、把倍率壓到 20% 出頭 —— 一眼看得到輪廓，但一個字都讀不到。
         改成填滿寬度，欄位名至少看得清楚；要看全貌就往下捲或縮小，那是一個手勢的事。

         不放大超過 100%：小圖攤在大畫布上放大只會糊，維持原寸比較好讀。 */
      const z = clampZoom(Math.min((vw - FIT_PAD * 2) / canvasSize.w, 1))
      const scaledH = canvasSize.h * z
      setAnimate(smooth)
      setView({
        x: (vw - canvasSize.w * z) / 2,
        /* 塞得下就垂直置中；塞不下就對齊上緣 —— 從頭開始看才是對的起點 */
        y: scaledH <= vh - FIT_PAD * 2 ? (vh - scaledH) / 2 : FIT_PAD,
        z,
      })
    },
    [canvasSize.w, canvasSize.h],
  )

  const resetView = useCallback(() => {
    touchedRef.current = false
    applyFit(true)
  }, [applyFit])

  /* 內容尺寸變動（首次量測、展開欄位、搜尋）→ 只在使用者還沒動過視角時自動 fit */
  useEffect(() => {
    if (touchedRef.current) return
    applyFit(false)
  }, [applyFit, wide])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return undefined
    const ro = new ResizeObserver(() => {
      if (!touchedRef.current) applyFit(false)
    })
    ro.observe(vp)
    return () => ro.disconnect()
  }, [applyFit])

  /** 以指標為錨點縮放：滑鼠底下的那張表不會跑掉 */
  const zoomAt = useCallback((factor: number, px: number, py: number, smooth = false) => {
    const cur = viewRef.current
    const next = clampZoom(cur.z * factor)
    if (Math.abs(next - cur.z) < 0.0001) return
    touchedRef.current = true
    setAnimate(smooth)
    setView({
      x: px - (px - cur.x) * (next / cur.z),
      y: py - (py - cur.y) * (next / cur.z),
      z: next,
    })
  }, [])

  const zoomByButton = useCallback(
    (factor: number) => {
      const vp = viewportRef.current
      if (!vp) return
      zoomAt(factor, vp.clientWidth / 2, vp.clientHeight / 2, true)
    },
    [zoomAt],
  )

  /* 滾輪：⌘/Ctrl（或觸控板捏合）才縮放，單純滾輪一律放行給頁面捲動。
     這頁底下還有系列導覽，畫布把滾輪全吃掉的話人就出不去了。
     ⚠ React 的 onWheel 是 passive listener、preventDefault 無效 —— 必須原生 non-passive 掛。 */
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return undefined
    const onWheel = (ev: WheelEvent) => {
      if (!(ev.ctrlKey || ev.metaKey)) return // 放行，不 preventDefault
      ev.preventDefault()
      const rect = vp.getBoundingClientRect()
      zoomAt(Math.exp(-ev.deltaY * 0.0015), ev.clientX - rect.left, ev.clientY - rect.top)
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  /* 拖曳平移。指標落在卡片 / 按鈕 / 輸入框上時交給它們自己處理
     （任何倍率下表都要點得到），按住 Alt 才能從卡片上起手平移。 */
  const onPanStart = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0) return
    const el = ev.target as HTMLElement
    if (!ev.altKey && el.closest('.erd-card, button, a, input, label')) return
    const cur = viewRef.current
    panRef.current = { px: ev.clientX, py: ev.clientY, ox: cur.x, oy: cur.y, moved: false }
    setPanning(true)
    setAnimate(false)
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  }, [])

  const onPanMove = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    const p = panRef.current
    if (!p) return
    const dx = ev.clientX - p.px
    const dy = ev.clientY - p.py
    if (!p.moved && Math.abs(dx) + Math.abs(dy) < 3) return
    p.moved = true
    touchedRef.current = true
    setView((v) => ({ ...v, x: p.ox + dx, y: p.oy + dy }))
  }, [])

  const onPanEnd = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return
    const moved = panRef.current.moved
    panRef.current = null
    setPanning(false)
    /* 拖曳結束後緊接著的 click 不該被當成「點空白處取消聚焦」 */
    if (moved) ev.preventDefault()
    draggedRef.current = moved
    ;(ev.currentTarget as HTMLElement).releasePointerCapture?.(ev.pointerId)
  }, [])

  const q = query.trim().toLowerCase()

  /* 搜尋命中的表；命中欄位的表自動展開 */
  const { hitTables, hitCols } = useMemo(() => {
    const hitTableSet = new Set<string>()
    const hitColSet = new Set<string>()
    if (!q) return { hitTables: hitTableSet, hitCols: hitColSet }
    for (const t of tables) {
      /* 與導覽篩選共用同一個比對函式：兩處查同一個字，結果必須一樣 */
      const m = matchTable(t, q)
      if (m.hit) hitTableSet.add(t.name)
      for (const c of m.columns) hitColSet.add(`${t.name}.${c}`)
    }
    return { hitTables: hitTableSet, hitCols: hitColSet }
  }, [q, tables])

  /* 搜尋結果數：沒有這個數字，「查不到」與「沒在查」在畫面上長得一樣 */
  const hitLabel = useMemo(() => {
    if (!q) return null
    if (hitTables.size === 0) return '查無符合'
    if (hitCols.size === 0) return `${hitTables.size} 張表`
    return `${hitTables.size} 張表・${hitCols.size} 個欄位`
  }, [q, hitTables, hitCols])

  const related = useMemo(() => {
    if (!focus) return null
    const parents = new Set<string>()
    const children = new Set<string>()
    for (const e of edges) {
      if (e.self) continue
      if (e.child === focus) parents.add(e.parent)
      if (e.parent === focus) children.add(e.child)
    }
    return { parents, children, all: new Set([...parents, ...children, focus]) }
  }, [focus, edges])

  const isHubEdge = useCallback(
    (e: { parent: string }) => hubTables.has(e.parent),
    [hubTables],
  )

  /* 量測卡片位置後畫線。展開、搜尋、容器寬度變動都會重算。
     放大檢視（VizZoom 的畫布）對祖先套 transform: scale，getBoundingClientRect 會連帶被放大，
     但 SVG 的座標系來自 scrollWidth（版面 px、不受 transform 影響）。兩者不同調線就會歪，
     因此一律除以當下倍率換回版面座標。 */
  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const base = canvas.getBoundingClientRect()
    const scale = canvas.offsetWidth > 0 ? base.width / canvas.offsetWidth : 1
    const k = scale > 0.01 ? scale : 1
    /* 尺寸取自格線而非畫布：SVG 是畫布的絕對定位子元素，若拿畫布的 scrollWidth
       會把 SVG 自己的寬度算進去，變成「越量越寬」的回饋迴圈，欄數會一路縮到 1。 */
    const grid = gridRef.current
    setCanvasSize({
      w: grid ? grid.scrollWidth : canvas.clientWidth,
      h: grid ? grid.scrollHeight : canvas.clientHeight,
    })
    const next: typeof paths = []
    for (const e of edges) {
      const a = cardRefs.current.get(e.child)
      const b = cardRefs.current.get(e.parent)
      if (!a || !b) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const ax0 = (ra.left - base.left) / k
      const bx0 = (rb.left - base.left) / k
      const aw = ra.width / k
      const bw = rb.width / k
      const ay = (ra.top - base.top) / k + Math.min(ra.height / k / 2, 26)
      const by = (rb.top - base.top) / k + Math.min(rb.height / k / 2, 26)
      let x1: number
      let x2: number
      let c1: number
      let c2: number
      if (e.self) {
        x1 = ax0 + aw
        x2 = x1
        const d = 26
        next.push({
          id: e.id,
          d: `M ${x1} ${ay - 8} C ${x1 + d} ${ay - 22}, ${x1 + d} ${ay + 22}, ${x2} ${ay + 8}`,
          child: e.child,
          parent: e.parent,
          col: e.col,
          mx: x1 + d,
          my: ay,
        })
        continue
      }
      const aRight = ax0 + aw
      const bRight = bx0 + bw
      if (ax0 + aw / 2 <= bx0 + bw / 2) {
        x1 = aRight
        x2 = bx0
      } else {
        x1 = ax0
        x2 = bRight
      }
      const dx = Math.max(28, Math.min(110, Math.abs(x2 - x1) / 2))
      c1 = x1 + (x2 >= x1 ? dx : -dx)
      c2 = x2 + (x2 >= x1 ? -dx : dx)
      next.push({
        id: e.id,
        d: `M ${x1} ${ay} C ${c1} ${ay}, ${c2} ${by}, ${x2} ${by}`,
        child: e.child,
        parent: e.parent,
        col: e.col,
        mx: (x1 + x2) / 2,
        my: (ay + by) / 2,
      })
    }
    setPaths(next)
  }, [edges])

  useLayoutEffect(() => {
    measure()
  }, [measure, expanded, q, canvasSize.w, wide])

  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => measure())
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
    }
    /* wide 進 deps 是為了重掛 ResizeObserver：切換全寬會把畫布整棵搬到另一個容器，
       掛回來的是新的一顆 DOM 節點，沿用舊的 observer 等於在觀察一個已脫離文件的節點。 */
  }, [measure, wide])

  /* Esc 逐層退的第一層：先解聚焦與 tooltip。監聽在外殼（renderer.tsx）統一掛，
     這裡只回報「有沒有東西可退」—— 有才吃掉這次 Esc，沒有就交給外殼收導覽或全寬。 */
  useEffect(() => {
    escapeRef.current = () => {
      if (!focus && !tip) return false
      onFocusChange(null)
      setTip(null)
      return true
    }
    return () => {
      escapeRef.current = null
    }
  }, [focus, tip, onFocusChange, escapeRef])

  /* 指標位於畫布上時 + − 0 生效。不綁全域，免得在搜尋框裡打「-」也被吃掉。 */
  const onViewportKey = useCallback(
    (ev: React.KeyboardEvent<HTMLDivElement>) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return
      if (ev.key === '+' || ev.key === '=') {
        ev.preventDefault()
        zoomByButton(ZOOM_STEP)
      } else if (ev.key === '-' || ev.key === '_') {
        ev.preventDefault()
        zoomByButton(1 / ZOOM_STEP)
      } else if (ev.key === '0') {
        ev.preventDefault()
        resetView()
      }
    },
    [zoomByButton, resetView],
  )

  const toggleExpand = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const showTip = useCallback((el: HTMLElement, title: string, body: string) => {
    const wrap = wrapRef.current
    if (!wrap) return
    /* 座標相對於 .erd-wrap（position: relative，即 tooltip 的 offset parent）。
       圖示位在會橫向捲動的 .erd-scroll 裡，其 rect 已含捲動位移，相減即為正確位置。
       水平用「夾在容器內」處理溢出，不看視窗尺寸——巢狀捲動與隱藏分頁下視窗尺寸可能為 0。 */
    const base = wrap.getBoundingClientRect()
    const scale = wrap.offsetWidth > 0 ? base.width / wrap.offsetWidth : 1
    const k = scale > 0.01 ? scale : 1
    const r = el.getBoundingClientRect()
    const raw = (r.left - base.left) / k + r.width / k / 2
    const x = Math.max(
      TIP_HALF + 6,
      Math.min(raw, Math.max(TIP_HALF + 6, base.width - TIP_HALF - 6)),
    )
    const vh = window.innerHeight || document.documentElement.clientHeight || 0
    const up = vh > 0 && r.bottom > vh - 170
    const y = up
      ? (r.top - base.top) / k - 8
      : (r.bottom - base.top) / k + 8
    setTip({ x, rawX: raw, y, up, adjusted: false, title, body })
  }, [])

  const tipRef = useRef<HTMLDivElement | null>(null)

  /* 用估計半寬先放，量到實際寬度後再校正一次——窄的 tooltip 才不會被推離圖示 */
  useLayoutEffect(() => {
    const el = tipRef.current
    const wrap = wrapRef.current
    if (!el || !wrap || !tip || tip.adjusted) return
    const base = wrap.getBoundingClientRect()
    const scale = wrap.offsetWidth > 0 ? base.width / wrap.offsetWidth : 1
    const k = scale > 0.01 ? scale : 1
    const r = el.getBoundingClientRect()
    const half = r.width / k / 2
    const min = half + 6
    const max = Math.max(min, base.width / k - half - 6)
    /* 從未夾過的 rawX 重新計算——用 tip.x 會回不到圖示旁邊，它已被估計半寬夾過一次 */
    const nextX = Math.max(min, Math.min(tip.rawX, max))
    setTip((prev) => (prev ? { ...prev, x: nextX, adjusted: true } : prev))
  }, [tip])

  const dimmed = useCallback(
    (name: string) => {
      if (focus) return !related?.all.has(name)
      if (q) return !hitTables.has(name)
      return false
    },
    [focus, related, q, hitTables],
  )

  const edgeState = useCallback(
    (p: { child: string; parent: string }) => {
      if (focus) {
        if (p.child === focus || p.parent === focus) return 'on'
        return 'off'
      }
      if (hover) {
        if (p.child === hover || p.parent === hover) return 'on'
        return 'dim'
      }
      if (q) return hitTables.has(p.child) && hitTables.has(p.parent) ? 'on' : 'dim'
      return 'base'
    },
    [focus, hover, q, hitTables],
  )

  const focusTable = focus ? byName.get(focus) : null

  /* 全寬檢視時外層（renderer.tsx）只換掉包在外面的容器、不換這個元件在樹上的位置，聚焦、搜尋、展開欄位的狀態因此不會因為切換而重置 */
  const diagram = (
    <div className="erd-root erd-wrap" ref={wrapRef}>
      <div className="erd-root erd-toolbar">
        <div className="erd-root erd-search">
          <Search size={15} aria-hidden />
          <input
            className="erd-root erd-input"
            type="search"
            value={query}
            placeholder={opts.searchPlaceholder}
            onChange={(ev) => onQueryChange(ev.target.value)}
            aria-label="搜尋表名或欄位名"
          />
          {hitLabel ? (
            <span
              className={`erd-root erd-hits ${
                hitTables.size === 0 ? 'erd-hits-none' : 'erd-hits-ok'
              }`}
              role="status"
              aria-live="polite"
            >
              {hitLabel}
            </span>
          ) : null}
          {query ? (
            <button
              type="button"
              className="erd-root erd-clear"
              onClick={() => onQueryChange('')}
              aria-label="清除搜尋"
            >
              <X size={13} aria-hidden />
            </button>
          ) : null}
        </div>

        {hubTables.size > 0 ? (
          <label className="erd-root erd-toggle">
            <input
              type="checkbox"
              checked={showHubEdges}
              onChange={(ev) => onShowHubEdgesChange(ev.target.checked)}
            />
            顯示 {[...hubTables].join('、')} 的 {edges.filter(isHubEdge).length} 條連線
          </label>
        ) : null}

        <div className="erd-root erd-legend">
          {data.requirement.map((r) => (
            <span className="erd-root erd-lg" key={r.key} title={r.title}>
              <i className={`erd-root erd-dot erd-dot--${r.marker}`} />
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {focusTable ? (
        <div className="erd-root erd-focusbar">
          <div>
            <strong>{focusTable.name}</strong>
            <span className="erd-root erd-muted">　{focusTable.label}　{opts.sectionPrefix}{focusTable.section}</span>
          </div>
          <div className="erd-root erd-muted">
            指向 {related ? related.parents.size : 0} 張父表
            {related && related.parents.size
              ? `（${[...related.parents].join('、')}）`
              : ''}
            ；被 {related ? related.children.size : 0} 張子表指向
            {related && related.children.size
              ? `（${[...related.children].join('、')}）`
              : ''}
          </div>
          <div className="erd-root erd-focusbar-act">
            <button type="button" className="erd-root erd-pill erd-pill--blue" onClick={() => onOpenWiki(focusTable.name)}>
              <BookOpen size={12} aria-hidden />
              開啟 Wiki
            </button>
            <button type="button" className="erd-root erd-reset" onClick={() => onFocusChange(null)}>
              取消聚焦（Esc）
            </button>
          </div>
        </div>
      ) : (
        <p className="erd-root erd-hint">
          {opts.hint}
          {/* 畫布的操作方式由渲染器自己講 —— 資料檔不該知道它被畫成什麼形式 */}
          <span className="erd-root erd-hint-canvas">
            畫布可拖曳平移，⌘/Ctrl＋滾輪縮放，雙擊空白處還原。
          </span>
          {crossEdges ? (
            <span className="erd-root erd-hint-cross">另有 {crossEdges} 條跨 schema 連線未顯示。</span>
          ) : null}
        </p>
      )}

      <div
        className={`erd-root erd-viewport erd-viewport--${fill ? 'fill' : 'page'}${panning ? ' erd-viewport--panning' : ''}`}
        ref={viewportRef}
        style={opts.canvasHeight ? { height: opts.canvasHeight } : undefined}
        tabIndex={0}
        role="application"
        aria-label="關聯圖畫布，可拖曳平移，⌘/Ctrl 加滾輪縮放"
        onPointerDown={onPanStart}
        onPointerMove={onPanMove}
        onPointerUp={onPanEnd}
        onPointerCancel={onPanEnd}
        onKeyDown={onViewportKey}
        onDoubleClick={(ev) => {
          if ((ev.target as HTMLElement).closest('.erd-card, button, a, input, label')) return
          resetView()
        }}
      >
        <div
          className={`erd-root erd-stage${animate ? ' erd-stage--animated' : ''}`}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
        >
        <div
          className="erd-root erd-canvas"
          ref={canvasRef}
          onClick={(ev) => {
            /* 拖曳結束後緊接著的 click 不算「點空白處取消聚焦」 */
            if (draggedRef.current) {
              draggedRef.current = false
              return
            }
            if (ev.target === ev.currentTarget) onFocusChange(null)
          }}
        >
          <svg
            className="erd-root erd-svg"
            width={canvasSize.w}
            height={canvasSize.h}
            viewBox={`0 0 ${canvasSize.w || 1} ${canvasSize.h || 1}`}
            aria-hidden
          >
            <defs>
              <marker id="erd-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 z" />
              </marker>
              <marker id="erd-arrow-on" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 z" className="erd-root erd-head--on" />
              </marker>
            </defs>
            {paths.map((p) => {
              const hubEdge = hubTables.has(p.parent)
              const state = edgeState(p)
              if (hubEdge && !showHubEdges && state !== 'on') return null
              return (
                <g key={p.id} className={`erd-root erd-edge erd-edge--${state}${hubEdge ? ' erd-edge--opt' : ''}`}>
                  <path d={p.d} markerEnd={state === 'on' ? 'url(#erd-arrow-on)' : 'url(#erd-arrow)'} />
                  {state === 'on' ? (
                    <text x={p.mx} y={p.my - 5} textAnchor="middle">
                      {p.col}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>

          <div
            className="erd-root erd-cols"
            ref={gridRef}
            style={{ gridTemplateColumns: `repeat(${layoutColumns.length}, max-content)` }}
          >
            {layoutColumns.map((col) => (
              <div className="erd-root erd-col" key={col.key}>
                {col.groups.map((g) => (
                  <section className={`erd-root erd-group erd-group--${g}`} key={g}>
                    <h4 className="erd-root erd-grouphead">{groupLabel[g]}</h4>
                    {tables.filter((t) => t.group === g).map((t) => {
                      const isOpen = expanded.has(t.name)
                      const shown = isOpen ? t.columns : defaultColumns(t)
                      const hiddenCount = t.columns.length - shown.length
                      const cls = [
                        'erd-root erd-card',
                        dimmed(t.name) ? 'erd-card--dim' : '',
                        focus === t.name ? 'erd-card--focus' : '',
                        focus && related?.all.has(t.name) && focus !== t.name ? 'erd-card--rel' : '',
                        q && hitTables.has(t.name) ? 'erd-card--hit' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <div
                          key={t.name}
                          className={cls}
                          ref={(el) => {
                            if (el) cardRefs.current.set(t.name, el)
                            else cardRefs.current.delete(t.name)
                          }}
                          onMouseEnter={() => setHover(t.name)}
                          onMouseLeave={() => setHover((h) => (h === t.name ? null : h))}
                        >
                          <button
                            type="button"
                            className="erd-root erd-cardhead"
                            aria-pressed={focus === t.name}
                            onClick={() => onFocusChange(focus === t.name ? null : t.name)}
                          >
                            <span className="erd-root erd-tname">{t.name}</span>
                            <span className="erd-root erd-tlabel">{t.label}</span>
                            <span className="erd-root erd-tsec">{opts.sectionPrefix}{t.section}</span>
                          </button>

                          <ul className="erd-root erd-cols-list">
                            {shown.map((c) => {
                              const hit = hitCols.has(`${t.name}.${c.name}`)
                              return (
                                <li
                                  className={`erd-root erd-field${hit ? ' erd-field--hit' : ''}`}
                                  key={c.name}
                                >
                                  <i
                                    className={`erd-root erd-dot erd-dot--${
                                      requirementOf(c.required)?.marker ?? 'hollow'
                                    }`}
                                    title={
                                      requirementOf(c.required)?.title ??
                                      requirementOf(c.required)?.label ??
                                      c.required
                                    }
                                  />
                                  <span className="erd-root erd-fname">{c.name}</span>
                                  <span className="erd-root erd-ftype">{c.type}</span>
                                  <span className="erd-root erd-keys">
                                    {data.flags.map((f) =>
                                      c[f.key] ? (
                                        <b
                                          className={`erd-root erd-k erd-k--${f.tone ?? 'neutral'}`}
                                          key={f.key}
                                          title={f.label}
                                        >
                                          {f.badge}
                                        </b>
                                      ) : null,
                                    )}
                                    {derivationOf(c.derivation) ? (
                                      <b
                                        className="erd-root erd-k erd-k--warning"
                                        title={derivationOf(c.derivation)?.label}
                                      >
                                        {derivationOf(c.derivation)?.badge}
                                      </b>
                                    ) : null}
                                  </span>
                                  <button
                                    type="button"
                                    className="erd-root erd-info"
                                    aria-label={`${c.name} 的說明`}
                                    onMouseEnter={(ev) =>
                                      showTip(
                                        ev.currentTarget,
                                        `${c.name}　${c.type}${c.default ? `　預設 ${c.default}` : ''}`,
                                        c.note ?? '',
                                      )
                                    }
                                    onFocus={(ev) =>
                                      showTip(
                                        ev.currentTarget,
                                        `${c.name}　${c.type}${c.default ? `　預設 ${c.default}` : ''}`,
                                        c.note ?? '',
                                      )
                                    }
                                    onMouseLeave={() => setTip(null)}
                                    onBlur={() => setTip(null)}
                                  >
                                    <Info size={12} aria-hidden />
                                  </button>
                                </li>
                              )
                            })}
                          </ul>

                          {hiddenCount > 0 || isOpen ? (
                            <button
                              type="button"
                              className="erd-root erd-more"
                              onClick={() => toggleExpand(t.name)}
                            >
                              {isOpen ? (
                                <>
                                  收合 <ChevronUp size={12} aria-hidden />
                                </>
                              ) : (
                                <>
                                  展開全部 {t.columns.length} 欄 <ChevronDown size={12} aria-hidden />
                                </>
                              )}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </section>
                ))}
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="erd-root erd-zoombar">
          <button
            type="button"
            className="erd-root erd-zbtn"
            aria-label="縮小"
            onClick={() => zoomByButton(1 / ZOOM_STEP)}
            disabled={view.z <= MIN_ZOOM + 0.001}
          >
            <Minus size={14} aria-hidden />
          </button>
          <span className="erd-root erd-zval" aria-live="off">
            {Math.round(view.z * 100)}%
          </span>
          <button
            type="button"
            className="erd-root erd-zbtn"
            aria-label="放大"
            onClick={() => zoomByButton(ZOOM_STEP)}
            disabled={view.z >= MAX_ZOOM - 0.001}
          >
            <Plus size={14} aria-hidden />
          </button>
          <span className="erd-root erd-zsep" aria-hidden />
          <button type="button" className="erd-root erd-zbtn" aria-label="還原並置中" onClick={resetView}>
            <Maximize2 size={13} aria-hidden />
          </button>
        </div>
      </div>

      {tip ? (
        <div
          ref={tipRef}
          className={`erd-root erd-tip${tip.up ? ' erd-tip--up' : ''}`}
          style={{ left: tip.x, top: tip.y }}
          role="tooltip"
        >
          <div className="erd-root erd-tiphead">{tip.title}</div>
          <div className="erd-root erd-tipbody">{tip.body}</div>
        </div>
      ) : null}
    </div>
  )

  return diagram
}

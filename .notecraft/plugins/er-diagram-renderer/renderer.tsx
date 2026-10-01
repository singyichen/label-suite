/* ER Diagram Renderer —— NoteCraft plugin
 *
 * 把一份資料庫 schema JSON 渲染成 DBdocs 式的資料庫文件：
 * 導覽樹（Schema → 分群 → Table）、Wiki（總覽／Schema／Table）、Diagram（可聚焦、可搜尋的關聯圖）。
 *
 * 前身是 TrendMile 專案裡一支 751 行的 tsx，其中 68 KB 是寫死的表定義。
 * 本檔把資料全部移出去，同時把幾個「只對那個專案成立」的常數也一併外部化 ——
 * 五欄版面、必填性語彙、徽章叫法、hub 表、預設顯示欄數、提示文案。
 * 只抽表定義是不夠的：那些常數留著，換一個專案還是得改程式。
 *
 * 檔案分工：renderer.tsx 是入口（外殼、路由與同步、持久化、全寬、Esc）；
 * nav.tsx 導覽；wiki.tsx 三種 Wiki 頁；diagram.tsx 畫布；derive.ts 資料推導；
 * markdown*.ts(x) 迷你 Markdown；types.ts 型別；styles.ts 樣式。
 * 入口檔名固定為 renderer.tsx（NoteCraft 的 glob 只認它），其餘檔案由相對 import 帶進打包 ——
 * 新增檔案時記得登記到 plugins/registry.json 的 files。
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { BookOpen, Expand, PanelLeft, Workflow } from 'lucide-react'
import { erDerive } from './derive'
import type { ErDerived } from './derive'
import { ErDiagram } from './diagram'
import { ErNav } from './nav'
import { ErWiki } from './wiki'
import { CSS } from './styles'
import type { ErDiagramData, ErOptions, PluginRendererProps, Route } from './types'
import { DEFAULT_OPTIONS } from './types'

export type { ErColumn, ErDiagramData, ErGroup, ErOptions, ErSchema, ErTable } from './types'

type Tab = 'wiki' | 'diagram'

/** 已印過 dev 警告的資料檔（file.path） */
const warned = new Set<string>()

/** 外殼寬度 ≤ 此值時導覽改為覆蓋在內容上（與 styles.ts 的 container query 同值） */
const NARROW = 760

const OVERVIEW: Route = { kind: 'overview' }

/** localStorage 殘留的路由可能指向已改名、已刪除的表 —— 驗不過就回總覽，不白屏 */
function validRoute(r: unknown, D: ErDerived): Route {
  if (!r || typeof r !== 'object') return OVERVIEW
  const x = r as { kind?: unknown; key?: unknown }
  if (x.kind === 'table' && typeof x.key === 'string' && D.byName.has(x.key)) return { kind: 'table', key: x.key }
  if (x.kind === 'schema' && typeof x.key === 'string' && !D.implicit && D.schemas.some((s) => s.key === x.key)) {
    return { kind: 'schema', key: x.key }
  }
  return OVERVIEW
}

export default function ErDiagramRenderer({
  data,
  file,
  options,
  mode,
}: PluginRendererProps<ErDiagramData>) {
  /* 設定的三層來源：內建預設 < 資料檔自帶的 options < plugins.json 傳進來的 options。
     後者最優先 —— 同一份資料被不同專案引用時，覆寫權在引用的人手上。 */
  const opts = useMemo<ErOptions>(
    () => ({
      ...DEFAULT_OPTIONS,
      ...(data.options ?? {}),
      ...(options as Partial<ErOptions>),
    }),
    [data.options, options],
  )

  const D = useMemo(() => erDerive(data), [data])

  /* 資料有瑕疵時不 throw（整頁白掉比少一個分群糟），但 dev 下要讓作者知道。
     SSR 期不印，免得 build log 與瀏覽器各一次；同一個檔只印一次（多個內嵌、HMR 重掛）。 */
  useEffect(() => {
    if (!import.meta.env?.DEV || warned.has(file.path)) return
    warned.add(file.path)
    if (D.orphanGroups.length) {
      console.warn(
        `[er-diagram-renderer] ${file.path}：${D.orphanGroups.length} 個 group 的 schema 缺漏或無效，已歸入 "${D.schemas[0].key}"：${D.orphanGroups.join(', ')}`,
      )
    }
    if (D.ungroupedTables.length) {
      console.warn(
        `[er-diagram-renderer] ${file.path}：${D.ungroupedTables.length} 張表的 group 不存在，已歸入「未分群」：${D.ungroupedTables.join(', ')}`,
      )
    }
  }, [D, file.path])

  /* ── 狀態 ───────────────────────────────────────────────
     Wiki 的 route 是唯一真相；Diagram 的 scope／focus 由它投影而來。
     唯一例外是「取消聚焦」：只清 focus、route 不動（回到 Wiki 仍是最後看的那張表）。 */
  const [route, setRoute] = useState<Route>(OVERVIEW)
  const [tab, setTab] = useState<Tab>('wiki')
  const [scope, setScope] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(mode === 'page')
  const [wide, setWide] = useState(false)
  const [narrow, setNarrow] = useState(false)
  /* Diagram 的搜尋字串與 hub 開關放在外殼：Diagram 切走時會卸載，這兩個要跨分頁保留（不持久化） */
  const [dgQuery, setDgQuery] = useState('')
  const [showHubEdges, setShowHubEdges] = useState(false)

  const scopeSet = useMemo(
    () => (scope ? new Set(data.tables.filter((t) => D.schemaOfTable(t.name) === scope).map((t) => t.name)) : null),
    [scope, data.tables, D],
  )

  /* ── 持久化 ─────────────────────────────────────────────
     SSR 與首次 client render 一律用預設值，掛載後才讀 —— 否則 hydration 對不上。
     代價是 reload 時先閃一下總覽（page 約一幀；embed 捲到才掛載，通常看不到），已定案接受。 */
  const storeKey = `erd:v1:${file.path}:${mode}`
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storeKey)
      const saved = raw ? (JSON.parse(raw) as { route?: unknown; tab?: unknown; scope?: unknown }) : null
      if (saved) {
        const r = validRoute(saved.route, D)
        setRoute(r)
        if (saved.tab === 'wiki' || saved.tab === 'diagram') setTab(saved.tab)
        const sc =
          typeof saved.scope === 'string' && !D.implicit && D.schemas.some((s) => s.key === saved.scope)
            ? saved.scope
            : null
        setScope(sc)
        if (saved.tab === 'diagram' && r.kind === 'table') setFocus(r.key)
      }
    } catch {
      /* 隱私模式、配額滿、JSON 壞掉：當作沒有 */
    }
    setHydrated(true)
    // 只在掛載時讀一次
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storeKey, JSON.stringify({ route, tab, scope }))
    } catch {
      /* 同上 */
    }
  }, [hydrated, storeKey, route, tab, scope])

  /* ── 寬度與捲動 ─────────────────────────────────────── */
  const shellRef = useRef<HTMLDivElement | null>(null)
  const mainRef = useRef<HTMLDivElement | null>(null)
  const firstNarrow = useRef(true)
  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => {
      const n = el.clientWidth > 0 && el.clientWidth <= NARROW
      setNarrow(n)
      /* 窄版一開始就收起導覽，否則手機上 page 模式一進來內容全被蓋住 */
      if (n && firstNarrow.current) setNavOpen(false)
      if (el.clientWidth > 0) firstNarrow.current = false
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* page 模式外殼隨內容長高、由頁面的捲動容器捲。導覽要 sticky 且自己捲，
     它的高度上限取「最近的捲動祖先」的可視高度 —— 不寫死工作台頁首幾 px，也不以 id 找容器。 */
  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el || mode !== 'page') return undefined
    let p: HTMLElement | null = el.parentElement
    while (p && p !== document.body) {
      const oy = getComputedStyle(p).overflowY
      if (oy === 'auto' || oy === 'scroll') break
      p = p.parentElement
    }
    const scroller = p && p !== document.body ? p : null
    const apply = () => {
      const h = scroller ? scroller.clientHeight : window.innerHeight
      el.style.setProperty('--erd-scroll-h', `${h}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    if (scroller) ro.observe(scroller)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [mode])

  const scrollToTop = useCallback(() => {
    if (mode === 'page' && !wide) {
      /* 外殼頂端已捲出視野才捲回來；還看得到就別動，免得畫面跳 */
      const el = shellRef.current
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
    } else if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [mode, wide])

  const navBtnRef = useRef<HTMLButtonElement | null>(null)
  /** 收起導覽；焦點原本在導覽裡的話還給導覽開關，免得焦點掉到 body */
  const closeNav = useCallback(() => {
    const nav = shellRef.current?.querySelector('.erd-nav')
    const hadFocus = !!nav && nav.contains(document.activeElement)
    setNavOpen(false)
    if (hadFocus) navBtnRef.current?.focus()
  }, [])

  const autoCloseNav = useCallback(() => {
    if ((mode === 'embed' && !wide) || narrow) closeNav()
  }, [mode, wide, narrow, closeNav])

  /* ── 路由與同步 ─────────────────────────────────────── */
  const go = useCallback(
    (r: Route) => {
      setRoute(r)
      if (tab === 'diagram') {
        if (r.kind === 'overview') {
          setScope(null)
          setFocus(null)
        } else if (r.kind === 'schema') {
          setScope(r.key)
          setFocus(null)
        } else {
          const sk = D.schemaOfTable(r.key)
          if (scope && scope !== sk) setScope(sk)
          setFocus(r.key)
        }
      } else {
        scrollToTop()
      }
      autoCloseNav()
    },
    [tab, scope, D, scrollToTop, autoCloseNav],
  )

  /** 切到 Diagram：依目前的 Wiki 頁決定範圍與聚焦 */
  const toDiagram = useCallback(() => {
    if (route.kind === 'schema') {
      setScope(route.key)
      setFocus(null)
    } else if (route.kind === 'table') {
      setScope(D.implicit ? null : D.schemaOfTable(route.key))
      setFocus(route.key)
    } else {
      setScope(null)
      setFocus(null)
    }
    setTab('diagram')
  }, [route, D])

  const toWiki = useCallback(() => {
    setTab('wiki')
    scrollToTop()
  }, [scrollToTop])

  /** 範圍 pill：全部 → 總覽；某 schema → 該 schema 頁。範圍換了，聚焦一律清掉 */
  const pickScope = useCallback((key: string | null) => {
    setScope(key)
    setRoute(key ? { kind: 'schema', key } : OVERVIEW)
    setFocus(null)
  }, [])

  /** Diagram 聚焦列的「開啟 Wiki」 */
  const openWiki = useCallback(
    (name: string) => {
      setRoute({ kind: 'table', key: name })
      setTab('wiki')
      scrollToTop()
    },
    [scrollToTop],
  )

  /** Diagram 裡點卡片：聚焦並同步 Wiki 路由；取消聚焦只清 focus */
  const onFocusChange = useCallback((name: string | null) => {
    setFocus(name)
    if (name) setRoute({ kind: 'table', key: name })
  }, [])

  /* ── 全寬（僅 embed）──────────────────────────────────── */
  const wideBtnRef = useRef<HTMLButtonElement | null>(null)
  /* 進出全寬時焦點都落在同一顆按鈕（外殼沒有重掛，它就是同一個節點）：
     進去時焦點在覆蓋層內，出來時回到觸發的地方 */
  const wideMounted = useRef(false)
  useEffect(() => {
    if (!wideMounted.current) {
      wideMounted.current = true
      return
    }
    wideBtnRef.current?.focus()
  }, [wide])
  useEffect(() => {
    if (!wide) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [wide])

  /* ── Esc 逐層退：畫布的聚焦／tooltip → 覆蓋式導覽 → 全寬 ──
     掛在 capture 階段：放大檢視（VizZoom）也在 capture 階段攔 Esc 並 stopPropagation，
     plugin 的監聽比它早註冊、先執行 —— 有東西可退才攔下（stopImmediatePropagation），
     沒有就放行，讓 VizZoom 或工作台的 Escape 堆疊照常關自己那一層。一次 Esc 只退一層。 */
  const dgEscape = useRef<(() => boolean) | null>(null)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || ev.defaultPrevented) return
      const el = shellRef.current
      /* 同一篇筆記有兩張圖時，只有焦點所在的那張反應；全寬是模態，不看焦點 */
      if (!wide && !(el && el.contains(document.activeElement))) return
      let handled = false
      if (tab === 'diagram' && dgEscape.current?.()) handled = true
      else if (narrow && navOpen) {
        closeNav()
        handled = true
      } else if (wide) {
        setWide(false)
        handled = true
      }
      if (handled) {
        ev.preventDefault()
        ev.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [wide, tab, narrow, navOpen, closeNav])

  /* ── 鍵盤：分頁與範圍的方向鍵（roving） ──────────────── */
  const uid = useId()
  const mainId = `${uid}-main`
  const onTabsKey = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return
    ev.preventDefault()
    if (tab === 'wiki') toDiagram()
    else toWiki()
    const next = ev.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[tab === 'wiki' ? 1 : 0]
    next?.focus()
  }
  const onScopeKey = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return
    ev.preventDefault()
    const keys: (string | null)[] = [null, ...D.schemas.map((x) => x.key)]
    const i = keys.indexOf(scope)
    const j = (i + (ev.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length
    pickScope(keys[j])
    ev.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[j]?.focus()
  }

  /* ── 畫面 ───────────────────────────────────────────── */
  const isEmbed = mode === 'embed' && !wide
  const shellCls = [
    'erd-root erd-shell',
    wide ? 'erd-shell--wide' : mode === 'page' ? 'erd-shell--page' : 'erd-shell--embed',
    navOpen ? '' : 'erd-shell--navclosed',
    tab === 'diagram' ? 'erd-shell--dg' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const crumb =
    route.kind === 'overview' ? (
      '總覽'
    ) : route.kind === 'schema' ? (
      <>
        schema · <code>{route.key}</code>
      </>
    ) : D.implicit ? (
      <code>{route.key}</code>
    ) : (
      <>
        {D.schemaOfTable(route.key)} · <code>{route.key}</code>
      </>
    )

  const shell = (
    <div className={shellCls} ref={shellRef}>
      <div className="erd-root erd-bar">
        <button
          type="button"
          ref={navBtnRef}
          className={`erd-root erd-iconbtn${navOpen ? ' erd-on' : ''}`}
          onClick={() => {
            /* 窄版 page 的覆蓋式導覽貼在外殼頂端，打開前先把外殼捲進視野 */
            if (!navOpen && narrow && mode === 'page') {
              const el = shellRef.current
              if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
            }
            setNavOpen((o) => !o)
          }}
          aria-label={navOpen ? '收起導覽' : '展開導覽'}
          aria-expanded={navOpen}
          title="切換導覽"
        >
          <PanelLeft size={15} aria-hidden />
        </button>
        <div className="erd-root erd-tabs" role="tablist" aria-label="檢視" onKeyDown={onTabsKey}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'wiki'}
            aria-controls={mainId}
            aria-label="Wiki"
            tabIndex={tab === 'wiki' ? 0 : -1}
            className={tab === 'wiki' ? 'erd-on' : ''}
            onClick={toWiki}
          >
            <BookOpen size={13} aria-hidden />
            <span className="erd-root erd-tab-l">Wiki</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'diagram'}
            aria-controls={mainId}
            aria-label="Diagram"
            tabIndex={tab === 'diagram' ? 0 : -1}
            className={tab === 'diagram' ? 'erd-on' : ''}
            onClick={toDiagram}
          >
            <Workflow size={13} aria-hidden />
            <span className="erd-root erd-tab-l">Diagram</span>
          </button>
        </div>
        {tab === 'wiki' ? (
          <div className="erd-root erd-bar-crumb">{crumb}</div>
        ) : D.implicit ? (
          <div className="erd-root erd-bar-fill" />
        ) : (
          <div className="erd-root erd-scope" role="radiogroup" aria-label="Diagram 範圍" onKeyDown={onScopeKey}>
            <span className="erd-root erd-scope-l">範圍</span>
            {[null, ...D.schemas.map((x) => x.key)].map((k) => (
              <button
                type="button"
                key={k ?? '*'}
                role="radio"
                aria-checked={scope === k}
                tabIndex={scope === k ? 0 : -1}
                className={scope === k ? 'erd-on' : ''}
                onClick={() => pickScope(k)}
              >
                {k ? <code>{k}</code> : '全部'}
              </button>
            ))}
          </div>
        )}
        {mode === 'embed' ? (
          <button
            type="button"
            ref={wideBtnRef}
            className={`erd-root erd-pill${wide ? '' : ' erd-pill--gold'}`}
            onClick={() => setWide((w) => !w)}
          >
            <Expand size={12} aria-hidden />
            {wide ? '回到本文' : '展開全寬'}
          </button>
        ) : null}
      </div>
      <div className="erd-root erd-body">
        {navOpen && narrow ? (
          /* 覆蓋式導覽的背板：點內容區任何地方就收起 */
          <div className="erd-root erd-nav-backdrop" aria-hidden onClick={closeNav} />
        ) : null}
        {navOpen ? (
          <ErNav D={D} route={route} go={go} compact={mode === 'embed'} autoFocus={narrow} />
        ) : null}
        <div
          className={`erd-root erd-main${tab === 'diagram' ? ' erd-main--dg' : ''}`}
          ref={mainRef}
          id={mainId}
          role="tabpanel"
        >
          {tab === 'wiki' ? (
            <ErWiki data={data} D={D} opts={opts} route={route} go={go} toDiagram={toDiagram} />
          ) : (
            <ErDiagram
              data={data}
              opts={opts}
              fill
              wide={wide}
              scope={scopeSet}
              focus={focus}
              onFocusChange={onFocusChange}
              onOpenWiki={openWiki}
              query={dgQuery}
              onQueryChange={setDgQuery}
              showHubEdges={showHubEdges}
              onShowHubEdgesChange={setShowHubEdges}
              escapeRef={dgEscape}
            />
          )}
        </div>
      </div>
    </div>
  )

  /* 全寬時只換掉包在外殼外面的容器，外殼在樹上的位置不變 ——
     換位置 React 會重掛，路由以外的狀態（捲動、展開的欄位）就全部歸零。 */
  return (
    <div className="erd-root erd-host">
      <style>{CSS}</style>
      {wide ? (
        <div className="erd-root erd-hold">
          <span>{data.meta?.title ?? '資料庫文件'}已在全寬檢視開啟。</span>
          <button type="button" className="erd-root erd-pill erd-pill--gold" onClick={() => setWide(false)}>
            回到本文
          </button>
        </div>
      ) : null}
      <div
        className={`erd-root ${wide ? 'erd-overlay' : 'erd-inline'}${isEmbed ? ' erd-inline--embed' : ''}`}
        role={wide ? 'dialog' : undefined}
        aria-modal={wide ? true : undefined}
        aria-label={wide ? `${data.meta?.title ?? '資料庫文件'}（全寬檢視）` : undefined}
      >
        {shell}
      </div>
    </div>
  )
}

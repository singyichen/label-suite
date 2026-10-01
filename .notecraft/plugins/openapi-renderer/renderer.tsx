/* OpenAPI Renderer —— NoteCraft plugin
 *
 * 把筆記資料夾裡的 OpenAPI 文件（JSON，OAS 3.0／3.1）渲染成 API 文件。
 * page（/view/<路徑>）：導覽 + 總覽／Tag／Operation／Schema 四種頁面，位置與網址 hash 雙向同步。
 * embed（<PluginView>）：單一 operation 卡或總覽縮影，外框由 app 的 GeneratedFrame 提供。
 *
 * 檔案分工：renderer.tsx 是入口（外殼、路由與 hash、鍵盤、捲動同步、page／embed 分流）；
 * nav.tsx 導覽；pages.tsx 四種頁面；embed.tsx 內嵌；schema-tree.tsx 欄位樹；atoms.tsx 原子元件；
 * derive.ts／examples.ts／markdown-text.ts 純函式；styles.ts 樣式；types.ts 型別。
 * 入口檔名固定為 renderer.tsx（NoteCraft 的 glob 只認它）—— 新增檔案時記得登記到 plugins/registry.json 的 files。
 *
 * 設計文件：docs/notecraft-openapi-renderer.md；像素級規格：docs/prototype/design_handoff_openapi_renderer/
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, PanelLeft, TriangleAlert } from 'lucide-react'
import { LinkCtx, Method, PathText } from './atoms'
import type { LinkApi } from './atoms'
import { derive, hashToRoute, routeToHash, viewPath } from './derive'
import { EmbedRoot } from './embed'
import { Nav } from './nav'
import type { Tip } from './nav'
import { OpPage, Overview, SchemaPage, TagPage } from './pages'
import { CSS } from './styles'
import { DEFAULT_OPTIONS } from './types'
import type { Derived, OarOptions, OpenApiDoc, PluginRendererProps, Route } from './types'

export type { OpenApiDoc, OarOptions } from './types'

/** 外殼寬度 ≤ 此值時導覽改為覆蓋在內容上（與 styles.ts 的 container query 同值） */
const NARROW = 760
const OVERVIEW: Route = { kind: 'overview' }

/** 已印過警告的資料檔（file.path）：SSR 一次、瀏覽器一次 */
const warnedServer = new Set<string>()
const warnedClient = new Set<string>()

function readOptions(raw: Record<string, unknown>, filePath: string): OarOptions {
  const o: OarOptions = { ...DEFAULT_OPTIONS }
  const bad: string[] = []
  if (raw.operation !== undefined) {
    if (typeof raw.operation === 'string' && raw.operation) o.operation = raw.operation
    else bad.push('operation')
  }
  if (raw.navSummary !== undefined) {
    if (raw.navSummary === 'hover' || raw.navSummary === 'line') o.navSummary = raw.navSummary
    else bad.push('navSummary')
  }
  if (raw.server !== undefined) {
    if (typeof raw.server === 'number' && Number.isInteger(raw.server) && raw.server >= 0) o.server = raw.server
    else bad.push('server')
  }
  if (bad.length && import.meta.env?.DEV && typeof window !== 'undefined') {
    console.warn(`[openapi-renderer] ${filePath}：options 的 ${bad.join('、')} 型別不對，已改用預設值`)
  }
  return o
}

function tagOf(D: Derived, r: Route): string | null {
  if (r.kind === 'tag') return r.key
  if (r.kind === 'op') return D.opByKey.get(r.key)?.tags[0] ?? null
  return null
}

/** 是否正在輸入（/ 與 Esc 都要讓給輸入框） */
function typingIn(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable
}

export default function OpenApiRenderer({ data, file, options, mode }: PluginRendererProps<OpenApiDoc>) {
  const opts = useMemo(() => readOptions(options ?? {}, file.path), [options, file.path])
  const D = useMemo(() => derive(data), [data])

  /* 資料有瑕疵不 throw，但 dev 下讓作者知道。同一個檔只印一次（多個內嵌、HMR 重掛） */
  useEffect(() => {
    if (!import.meta.env?.DEV || warnedClient.has(file.path) || !D.warnings.length) return
    warnedClient.add(file.path)
    console.warn(`[openapi-renderer] ${file.path}：\n- ${D.warnings.join('\n- ')}`)
  }, [D, file.path])

  let body
  if (D.version.kind === 'swagger') {
    /* SSR 在 build 期執行：build log 看得到這一行 */
    if (typeof window === 'undefined' && !warnedServer.has(file.path)) {
      warnedServer.add(file.path)
      console.warn(`[openapi-renderer] ${file.path} 是 Swagger ${D.version.raw}，只顯示轉檔指引（plugin 只支援 OpenAPI 3.0／3.1）`)
    }
    body = (
      <div className="oar-unsupported" role="alert">
        <TriangleAlert size={14} aria-hidden />
        <span>
          這份文件是 Swagger {D.version.raw}，plugin 只支援 OpenAPI 3.0 / 3.1。請先轉檔（例如 <code>swagger2openapi</code>）再放進筆記資料夾。
        </span>
      </div>
    )
  } else if (mode === 'embed') {
    body = (
      <LinkCtx.Provider value={{ href: (r) => `${viewPath(file.path)}${routeToHash(r)}` }}>
        <EmbedRoot D={D} operation={opts.operation} />
      </LinkCtx.Provider>
    )
  } else {
    body = <Docs D={D} filePath={file.path} opts={opts} />
  }

  return (
    <div className="oar-root oar-host">
      <style>{CSS}</style>
      {body}
    </div>
  )
}

/* ── page 模式 ────────────────────────────────────────── */

function Docs({ D, filePath, opts }: { D: Derived; filePath: string; opts: OarOptions }) {
  /* SSR 與首次 render 一律總覽；掛載後才讀 hash —— 否則 hydration 對不上 */
  const [route, setRoute] = useState<Route>(OVERVIEW)
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState('')
  const [methods, setMethods] = useState<Set<string>>(() => new Set())
  const [openTags, setOpenTags] = useState<Set<string>>(() => new Set(D.tags.length > 6 ? [] : D.tags.map((t) => t.name)))
  const [resetSig, setResetSig] = useState(0)
  const [navOpen, setNavOpen] = useState(true)
  const [narrow, setNarrow] = useState(false)
  const [activeSec, setActiveSec] = useState<string | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const shellRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  const mainRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navBtnRef = useRef<HTMLButtonElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flash = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1400)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const openTagOf = useCallback(
    (r: Route) => {
      const t = tagOf(D, r)
      if (t) setOpenTags((s) => (s.has(t) ? s : new Set([...s, t])))
    },
    [D],
  )

  /* ── 寬度與捲動容器 ────────────────────────────────── */
  const firstNarrow = useRef(true)
  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      if (w <= 0) return
      const n = w <= NARROW
      setNarrow(n)
      /* 窄版一進來就收起導覽，否則手機上內容整個被蓋住 */
      if (n && firstNarrow.current) setNavOpen(false)
      firstNarrow.current = false
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* 外殼隨內容長高、由頁面的捲動容器捲；導覽 sticky 且自己捲，高度上限取最近捲動祖先的可視高度
     （不寫死工作台頁首幾 px，也不以 id 找容器 —— 同 ER plugin） */
  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return undefined
    let p: HTMLElement | null = el.parentElement
    while (p && p !== document.body) {
      const oy = getComputedStyle(p).overflowY
      if (oy === 'auto' || oy === 'scroll') break
      p = p.parentElement
    }
    const scroller = p && p !== document.body ? p : null
    scrollerRef.current = scroller
    const apply = () => el.style.setProperty('--oar-scroll-h', `${scroller ? scroller.clientHeight : window.innerHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    if (scroller) ro.observe(scroller)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  const scrollShellTop = useCallback(() => {
    const el = shellRef.current
    /* 外殼頂端已捲出視野才捲回來；還看得到就別動，免得畫面跳 */
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
  }, [])

  const closeNav = useCallback(() => {
    const nav = shellRef.current?.querySelector('.oar-nav')
    const hadFocus = !!nav && nav.contains(document.activeElement)
    setNavOpen(false)
    if (hadFocus) navBtnRef.current?.focus()
  }, [])

  /* ── 路由 ──────────────────────────────────────────── */
  const go = useCallback(
    (r: Route) => {
      setRoute(r)
      setTip(null)
      openTagOf(r)
      if (narrow) closeNav()
      if (!(r.kind === 'op' && r.sub)) scrollShellTop()
    },
    [openTagOf, narrow, closeNav, scrollShellTop],
  )

  useEffect(() => {
    const r = hashToRoute(window.location.hash, D)
    if (r) {
      setRoute(r)
      openTagOf(r)
    }
    setReady(true)
    const onHash = () => {
      const h = hashToRoute(window.location.hash, D)
      setRoute(h ?? OVERVIEW)
      if (h) openTagOf(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [D, openTagOf])

  /* route → hash：replaceState，不堆疊瀏覽紀錄；篩選不進 hash */
  useEffect(() => {
    if (!ready) return
    const h = routeToHash(route)
    if (h !== window.location.hash && !(h === '' && window.location.hash === '')) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${h}`)
    }
  }, [route, ready])

  const hashFor = useCallback((r: Route) => `${window.location.origin}${window.location.pathname}${routeToHash(r)}`, [])
  const link = useMemo<LinkApi>(() => ({ href: (r) => routeToHash(r) || '#', go }), [go])

  /* ── 捲動同步：Operation 頁的區段 → 導覽錨點 ─────────── */
  useEffect(() => {
    setActiveSec(null)
    if (route.kind !== 'op') return undefined
    const target: HTMLElement | Window = scrollerRef.current ?? window
    let raf = 0
    const sync = () => {
      raf = 0
      const main = mainRef.current
      if (!main) return
      const secs = [...main.querySelectorAll<HTMLElement>('[data-sec]')]
      if (!secs.length) return
      const base = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 96
      let cur: string | null = null
      for (const s of secs) if (s.getBoundingClientRect().top <= base) cur = s.dataset.sec ?? null
      const sc = scrollerRef.current
      if (sc ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4 : window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        cur = secs[secs.length - 1].dataset.sec ?? cur
      }
      setActiveSec(cur)
    }
    const onScroll = () => {
      setTip(null)
      if (!raf) raf = requestAnimationFrame(sync)
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    sync()
    return () => {
      target.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [route])

  useEffect(() => {
    if (!tip) return undefined
    const close = () => setTip(null)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [tip])

  const onSec = useCallback(
    (id: string) => {
      mainRef.current?.querySelector<HTMLElement>(`[data-sec="${id}"]`)?.scrollIntoView({ block: 'start' })
      if (narrow) closeNav()
    },
    [narrow, closeNav],
  )

  /* ── 鍵盤：/ 聚焦篩選；Esc 一層一層退 ────────────────
     Esc 晚一拍處理：工作台的 Escape 堆疊（Palette／Drawer）也掛在 window，誰先註冊誰先跑。
     等這次事件派送完再看 defaultPrevented —— 別人處理過就不動，順序怎樣都不會搶走。 */
  const escState = useRef({ q, methods, narrow, navOpen })
  escState.current = { q, methods, narrow, navOpen }
  useEffect(() => {
    if (D.tiny) return undefined
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === '/' && !ev.metaKey && !ev.ctrlKey && !ev.altKey && !ev.defaultPrevented && !typingIn(document.activeElement)) {
        ev.preventDefault()
        setNavOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
      if (ev.key !== 'Escape') return
      setTimeout(() => {
        if (ev.defaultPrevented) return
        const active = document.activeElement
        const inShell = !!active && !!shellRef.current?.contains(active)
        /* 在 plugin 外打字（例如其他輸入框）的 Esc 不是給我們的 */
        if (typingIn(active) && !inShell) return
        const s = escState.current
        if (s.narrow && s.navOpen) closeNav()
        else if (s.q) {
          setQ('')
          flash('已清除文字篩選')
        } else if (s.methods.size) {
          setMethods(new Set())
          flash('已清除 method 篩選')
        } else if (typingIn(active)) (active as HTMLElement).blur()
        else {
          setResetSig((n) => n + 1)
          flash('已收起所有展開項')
        }
      }, 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [D.tiny, closeNav, flash])

  /* ── 畫面 ──────────────────────────────────────────── */
  const curOp = route.kind === 'op' ? D.opByKey.get(route.key) : undefined
  const curTag = route.kind === 'tag' ? D.tags.find((t) => t.name === route.key) : undefined
  const curSchema = route.kind === 'schema' && Object.prototype.hasOwnProperty.call(D.schemas, route.key) ? route.key : undefined

  let page
  if (curOp) page = <OpPage key={curOp.key} D={D} op={curOp} sub={route.kind === 'op' ? route.sub : undefined} resetSig={resetSig} hashFor={hashFor} defaultServer={opts.server} />
  else if (curSchema) page = <SchemaPage key={curSchema} D={D} name={curSchema} resetSig={resetSig} hashFor={hashFor} />
  else if (curTag) page = <TagPage t={curTag} />
  else page = <Overview D={D} filePath={filePath} />

  const crumb = curOp ? (
    <>
      {D.tags.find((t) => t.name === curOp.tags[0])?.label} · <code>{curOp.key}</code>
    </>
  ) : curSchema ? (
    <>
      schema · <code>{curSchema}</code>
    </>
  ) : curTag ? (
    <>
      tag · <code>{curTag.label}</code>
    </>
  ) : (
    '總覽'
  )

  const showNav = !D.tiny && navOpen
  const navSummary = opts.navSummary

  return (
    <LinkCtx.Provider value={link}>
      <div className={`oar-shell oar-shell--page${showNav ? ' oar-shell--nav' : ''}`} ref={shellRef}>
        <div className="oar-bar" ref={barRef}>
          {!D.tiny ? (
            <button
              type="button"
              ref={navBtnRef}
              className={`oar-iconbtn${navOpen ? ' oar-on' : ''}`}
              onClick={() => {
                if (!navOpen && narrow) {
                  /* 覆蓋式導覽：先把外殼捲進視野，焦點移進篩選框（關閉時 closeNav 會還給這顆按鈕） */
                  scrollShellTop()
                  setTimeout(() => inputRef.current?.focus(), 0)
                }
                if (navOpen && narrow) closeNav()
                else setNavOpen((o) => !o)
              }}
              aria-label={navOpen ? '收起導覽' : '展開導覽'}
              aria-expanded={navOpen}
              title="切換導覽"
            >
              <PanelLeft size={15} aria-hidden />
            </button>
          ) : route.kind !== 'overview' ? (
            <button type="button" className="oar-pill" onClick={() => go(OVERVIEW)}>
              <ArrowLeft size={12} aria-hidden />
              總覽
            </button>
          ) : null}
          <div className="oar-bar-crumb">{crumb}</div>
          {toast ? (
            <span className="oar-toast" role="status">
              <Check size={12} aria-hidden />
              {toast}
            </span>
          ) : null}
          {D.version.supported ? (
            <span className="oar-bar-v">OAS {D.version.raw}</span>
          ) : (
            <span className="oar-bar-warn" title="超出 plugin 支援範圍">
              <TriangleAlert size={12} aria-hidden />
              OAS {D.version.raw || '?'}
            </span>
          )}
        </div>
        <div className="oar-body">
          {showNav && narrow ? <div className="oar-nav-backdrop" aria-hidden onClick={closeNav} /> : null}
          {showNav ? (
            <Nav
              D={D}
              route={route}
              go={go}
              q={q}
              setQ={setQ}
              methods={methods}
              setMethods={setMethods}
              openTags={openTags}
              toggleTag={(t) =>
                setOpenTags((s) => {
                  const n = new Set(s)
                  if (n.has(t)) n.delete(t)
                  else n.add(t)
                  return n
                })
              }
              activeSec={activeSec}
              onSec={onSec}
              inputRef={inputRef}
              navSummary={navSummary}
              setTip={setTip}
            />
          ) : null}
          <div className="oar-main" ref={mainRef}>
            <div className={D.tiny ? 'oar-narrow' : 'oar-main-col'}>{page}</div>
          </div>
        </div>
        {tip ? (
          <div className="oar-tip" style={{ left: tip.x, top: tip.y }} aria-hidden>
            <div className="oar-tip-p">
              <Method m={tip.op.method} />
              <PathText path={tip.op.path} />
            </div>
            <div>{tip.op.summary || <i>沒有 summary</i>}</div>
          </div>
        ) : null}
      </div>
    </LinkCtx.Provider>
  )
}

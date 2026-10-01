/* ER Diagram Renderer —— 樣式
 *
 * 以字串注入 <style>，不另開 .css：plugin 自帶樣式、不碰 app 的 Tailwind 掃描。
 * 所有規則以 .erd-root 起頭，避免漏到筆記內文。
 */

export const CSS = `
/* DS 沒有的色值只有這一個：衍生欄徽章的字色（warning-50 底上的深金，與工作台一致）。
   集中在這裡，規則只引用它。 */
.erd-root.erd-host { --erd-warn-ink: #8a6412; font-family: var(--font-sans); color: var(--text-body); }
.erd-root.erd-wrap { position: relative; font-family: var(--font-sans); color: var(--text-body); }
.erd-root .erd-cardhead, .erd-root .erd-cardhead .erd-tname, .erd-root .erd-cardhead .erd-tlabel, .erd-root .erd-cardhead .erd-tsec { color: var(--neutral-0); }
.erd-root .erd-card--focus .erd-cardhead, .erd-root .erd-card--focus .erd-cardhead .erd-tname, .erd-root .erd-card--focus .erd-cardhead .erd-tlabel, .erd-root .erd-card--focus .erd-cardhead .erd-tsec { color: var(--blue-950); }
.erd-root .erd-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin: 0 0 10px; }
.erd-root .erd-search { position: relative; display: flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-pill); background: var(--surface-card); color: var(--text-muted); min-width: 280px; }
.erd-root .erd-input { border: 0; outline: none; background: transparent; font-size: 13px; color: var(--text-strong); width: 100%; font-family: inherit; }
.erd-root .erd-clear { border: 0; background: transparent; cursor: pointer; color: var(--text-muted); display: flex; padding: 2px; }
.erd-root .erd-hits { flex: none; font-size: 11.5px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.erd-root .erd-hits-ok { color: var(--blue-700, #1b4f9c); }
.erd-root .erd-hits-none { color: var(--danger-500, #d64545); }
.erd-root .erd-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); cursor: pointer; }
.erd-root .erd-legend { display: flex; gap: 12px; margin-left: auto; font-size: 12px; color: var(--text-muted); }
.erd-root .erd-lg { display: inline-flex; align-items: center; gap: 5px; }
.erd-root .erd-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 10px; line-height: 1.6; }
.erd-root .erd-hint-canvas { color: var(--blue-700); }
.erd-root .erd-focusbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin: 0 0 10px; padding: 8px 12px; border-radius: var(--radius-md); background: var(--surface-accent-soft); border: 1px solid var(--orange-200); font-size: 12px; line-height: 1.6; }
.erd-root .erd-focusbar strong { font-family: var(--font-mono); color: var(--blue-800); font-size: 13px; }
.erd-root .erd-muted { color: var(--text-muted); }
.erd-root .erd-reset { margin-left: auto; border: 1px solid var(--orange-300); background: var(--surface-card); color: var(--orange-700); border-radius: var(--radius-pill); padding: 3px 12px; font-size: 12px; cursor: pointer; font-family: inherit; }
.erd-root .erd-viewport { position: relative; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background-color: var(--surface-page); background-image: radial-gradient(circle, color-mix(in srgb, var(--text-muted) 22%, transparent) 1px, transparent 1px); background-size: 22px 22px; cursor: grab; touch-action: none; outline: none; }
.erd-root .erd-viewport:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
.erd-root .erd-viewport--panning { cursor: grabbing; }
.erd-root .erd-viewport--page { height: clamp(420px, calc(100vh - 250px), 1200px); }
.erd-root .erd-viewport--fill { flex: 1; min-height: 240px; }
.erd-root .erd-stage { position: absolute; top: 0; left: 0; transform-origin: 0 0; width: max-content; }
.erd-root .erd-stage--animated { transition: transform var(--duration-normal) var(--ease-out); }
.erd-root .erd-canvas { position: relative; width: max-content; }
.erd-root .erd-zoombar { position: absolute; right: 12px; bottom: 12px; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: var(--radius-pill); background: var(--surface-card); border: 1px solid var(--border-default); box-shadow: var(--shadow-sm); }
.erd-root .erd-zbtn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: 0; border-radius: var(--radius-circle); background: transparent; color: var(--text-muted); cursor: pointer; }
.erd-root .erd-zbtn:hover:not(:disabled) { background: var(--blue-50); color: var(--blue-700); }
.erd-root .erd-zbtn:disabled { opacity: .35; cursor: default; }
.erd-root .erd-zbtn:focus-visible { outline: var(--focus-ring); outline-offset: 1px; }
.erd-root .erd-zval { min-width: 42px; text-align: center; font-family: var(--font-mono); font-size: 11.5px; font-weight: var(--weight-bold); color: var(--text-muted); font-variant-numeric: tabular-nums; }
.erd-root .erd-zsep { width: 1px; height: 16px; margin: 0 3px; background: var(--border-subtle); }
.erd-root .erd-svg { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
.erd-root .erd-cols { position: relative; display: grid; gap: 34px; align-items: start; }
.erd-root .erd-col { display: flex; flex-direction: column; gap: 26px; }
.erd-root .erd-group { border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg); padding: 10px 10px 12px; background: color-mix(in srgb, var(--blue-50) 45%, transparent); }
.erd-root .erd-grouphead { margin: 0 0 8px; font-size: 11px; font-weight: var(--weight-bold); letter-spacing: var(--tracking-wide); color: var(--blue-700); text-transform: none; }
.erd-root .erd-card { position: relative; z-index: 2; background: var(--surface-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); box-shadow: var(--shadow-xs); margin-bottom: 18px; min-width: 218px; max-width: 380px; width: max-content; transition: opacity var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out); }
.erd-root .erd-card:last-child { margin-bottom: 0; }
.erd-root .erd-card:hover { box-shadow: var(--shadow-sm); border-color: var(--blue-300); }
.erd-root .erd-card--dim { opacity: .25; }
.erd-root .erd-card--focus { border-color: var(--orange-400); box-shadow: var(--shadow-accent); z-index: 4; }
.erd-root .erd-card--rel { border-color: var(--blue-500); box-shadow: var(--shadow-sm); z-index: 3; }
.erd-root .erd-card--hit { border-color: var(--orange-300); }
.erd-root .erd-cardhead { display: flex; flex-wrap: nowrap; align-items: baseline; gap: 4px 10px; width: 100%; white-space: nowrap; text-align: left; border: 0; border-radius: var(--radius-md) var(--radius-md) 0 0; background: var(--blue-700); color: var(--neutral-0); padding: 6px 9px; cursor: pointer; font-family: inherit; }
.erd-root .erd-card--focus .erd-cardhead { background: var(--gradient-accent); color: var(--blue-950); }
.erd-root .erd-cardhead:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
.erd-root .erd-tname { font-family: var(--font-mono); font-size: 12.5px; font-weight: var(--weight-bold); }
.erd-root .erd-tlabel { font-size: 11px; opacity: .88; }
.erd-root .erd-tsec { margin-left: auto; font-size: 10px; opacity: .75; }
.erd-root .erd-cols-list { list-style: none; margin: 0; padding: 4px 0; }
.erd-root .erd-field { display: flex; flex-wrap: nowrap; align-items: center; gap: 5px; margin: 0; padding: 2px 9px; font-size: 11px; line-height: 1.5; white-space: nowrap; }
.erd-root .erd-field--hit { background: var(--orange-50); }
.erd-root .erd-fname { font-family: var(--font-mono); color: var(--text-strong); }
.erd-root .erd-ftype { font-family: var(--font-mono); color: var(--text-muted); font-size: 10px; }
.erd-root .erd-keys { display: inline-flex; gap: 3px; margin-left: auto; padding-left: 6px; flex: 0 0 auto; }
.erd-root .erd-k { font-size: 8.5px; font-weight: var(--weight-bold); line-height: 1; padding: 2px 4px; border-radius: var(--radius-xs); font-style: normal; }
.erd-root .erd-k--danger { background: var(--danger-50); color: var(--danger-500); }
.erd-root .erd-k--info { background: var(--blue-50); color: var(--blue-600); }
.erd-root .erd-k--success { background: var(--success-50); color: var(--success-500); }
.erd-root .erd-k--neutral { background: var(--neutral-100); color: var(--neutral-600); }
.erd-root .erd-k--warning { background: var(--warning-50); color: var(--erd-warn-ink); }
.erd-root .erd-dot { width: 7px; height: 7px; border-radius: var(--radius-circle); border: 1.5px solid var(--blue-500); flex: 0 0 auto; display: inline-block; }
.erd-root .erd-dot--solid { background: var(--blue-500); }
.erd-root .erd-dot--half { background: linear-gradient(90deg, var(--blue-500) 50%, transparent 50%); }
.erd-root .erd-dot--hollow { background: transparent; }
.erd-root .erd-dot--muted { background: var(--neutral-300); border-color: var(--neutral-400); }
.erd-root .erd-info { border: 0; background: transparent; padding: 0; margin-left: 2px; flex: 0 0 auto; cursor: help; color: var(--neutral-400); display: inline-flex; }
.erd-root .erd-info:hover, .erd-root .erd-info:focus-visible { color: var(--blue-600); }
.erd-root .erd-more { width: 100%; border: 0; border-top: 1px solid var(--border-subtle); background: transparent; color: var(--blue-600); font-size: 10.5px; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 3px; border-radius: 0 0 var(--radius-md) var(--radius-md); font-family: inherit; }
.erd-root .erd-more:hover { background: var(--blue-50); }
.erd-root .erd-edge path { fill: none; stroke: var(--blue-300); stroke-width: 1.1; transition: opacity var(--duration-fast) var(--ease-out), stroke-width var(--duration-fast) var(--ease-out); }
.erd-root .erd-edge text { font-family: var(--font-mono); font-size: 9.5px; fill: var(--orange-700); paint-order: stroke; stroke: var(--neutral-0); stroke-width: 3px; }
.erd-root marker path { fill: var(--blue-300); }
.erd-root .erd-head--on { fill: var(--orange-500); }
.erd-root .erd-edge--base path { opacity: .55; }
.erd-root .erd-edge--opt path { stroke: var(--neutral-300); }
.erd-root .erd-edge--dim path { opacity: .18; }
.erd-root .erd-edge--off path { opacity: .08; }
.erd-root .erd-edge--on path { stroke: var(--orange-500); stroke-width: 2; opacity: 1; }
.erd-root .erd-tip { position: absolute; z-index: 20; width: max-content; max-width: 320px; transform: translateX(-50%); background: var(--blue-950); color: var(--neutral-0); border-radius: var(--radius-sm); padding: 7px 10px; box-shadow: var(--shadow-lg); pointer-events: none; }
.erd-root .erd-tip--up { transform: translate(-50%, -100%); }
.erd-root .erd-tiphead { font-family: var(--font-mono); font-size: 11px; color: var(--orange-300); margin-bottom: 3px; }
.erd-root .erd-tipbody { font-size: 11.5px; line-height: 1.65; }
.erd-root .erd-hold { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 18px 16px; border: 1px dashed var(--border-default); border-radius: var(--radius-lg); background: var(--surface-sunken); font-size: 13px; color: var(--text-muted); }
@media (max-width: 900px) {
  .erd-root .erd-legend { margin-left: 0; }
}

/* ── 外殼（v1.2）─────────────────────────────────────────
   斷點看的是外殼自己的寬度（container query），不是視窗：筆記內文欄就是 760px，
   用 media query 的話桌面上的內嵌永遠吃不到、手機上的獨立頁反而吃得到。 */
.erd-root.erd-inline, .erd-root.erd-overlay { container: erd / inline-size; }
.erd-root.erd-shell { display: flex; flex-direction: column; min-width: 0; background: var(--surface-card); font-size: 13px; }
.erd-root.erd-shell code { font-family: var(--font-mono); }
/* page：滿版貼齊資料檔頁的內容區，不畫外框；至少撐滿捲動容器的可視高度，內容短時導覽欄底色也到底 */
.erd-root.erd-shell--page { min-height: var(--erd-scroll-h, 100dvh); }
/* page 的 Diagram 分頁：外殼剛好等於捲動容器的可視高度，畫布填滿剩餘空間（滿版時不必再用 100vh 扣固定值去猜） */
.erd-root.erd-shell--page.erd-shell--dg { height: var(--erd-scroll-h, 100dvh); }
.erd-root.erd-shell--page.erd-shell--dg .erd-body { min-height: 0; }
.erd-root.erd-shell--embed { height: 580px; }
.erd-root.erd-shell--wide { height: 100%; }
@container erd (max-width: 520px) { .erd-root.erd-shell--embed { height: min(580px, 75vh); } }
.erd-root .erd-bar { display: flex; align-items: center; gap: 12px; flex: none; height: 44px; padding: 0 14px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-card); }
.erd-root.erd-shell--page .erd-bar { position: sticky; top: 0; z-index: 6; }
.erd-root .erd-iconbtn { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 30px; height: 30px; padding: 0; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--text-muted); cursor: pointer; }
.erd-root .erd-iconbtn:hover { background: var(--blue-50); color: var(--blue-700); }
.erd-root .erd-iconbtn.erd-on { color: var(--blue-700); }
.erd-root .erd-iconbtn:focus-visible, .erd-root .erd-tabs button:focus-visible, .erd-root .erd-pill:focus-visible, .erd-root .erd-nav button:focus-visible { outline: var(--focus-ring); outline-offset: 1px; }
.erd-root .erd-tabs { display: flex; gap: 2px; height: 100%; }
.erd-root .erd-tabs button { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 100%; padding: 0 12px; border: 0; background: none; font: inherit; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; }
.erd-root .erd-tabs button:hover { color: var(--blue-700); }
.erd-root .erd-tabs button.erd-on { color: var(--blue-700); font-weight: var(--weight-bold); background: linear-gradient(var(--orange-400), var(--orange-400)) no-repeat center bottom / calc(100% - 20px) 2px; }
.erd-root .erd-bar-crumb { margin-left: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; color: var(--text-muted); }
.erd-root .erd-bar-crumb code { color: var(--blue-700); }
.erd-root .erd-bar-fill { margin-left: auto; }
.erd-root .erd-pill { display: inline-flex; align-items: center; gap: 5px; flex: none; height: 28px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-pill); background: var(--surface-card); font: inherit; font-size: 12px; font-weight: 600; color: var(--text-body); cursor: pointer; white-space: nowrap; transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out); }
.erd-root .erd-pill:hover { border-color: var(--blue-400); color: var(--blue-700); }
.erd-root .erd-pill:active { transform: scale(.97); }
.erd-root .erd-pill--blue { background: var(--blue-50); border-color: var(--blue-100); color: var(--blue-700); }
.erd-root .erd-pill--blue:hover { background: var(--blue-100); }
.erd-root .erd-pill--gold { background: var(--orange-400); border-color: var(--orange-400); color: var(--blue-950); }
.erd-root .erd-pill--gold:hover { background: var(--orange-300); border-color: var(--orange-300); color: var(--blue-950); }
.erd-root .erd-hold .erd-pill { margin-left: auto; }
.erd-root .erd-body { position: relative; flex: 1; display: flex; min-height: 0; }
.erd-root .erd-main { flex: 1; min-width: 0; overflow: auto; }
.erd-root.erd-shell--page .erd-main { overflow: visible; }
.erd-root .erd-main--dg { display: flex; flex-direction: column; padding: 14px 16px 16px; }
.erd-root .erd-main--dg .erd-wrap.erd-root { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.erd-root.erd-overlay { position: fixed; inset: 0; z-index: 2147483000; background: var(--surface-card); animation: erd-fade 160ms var(--ease-out); }
@keyframes erd-fade { from { opacity: 0; } to { opacity: 1; } }

/* ── 導覽 ── */
.erd-root .erd-nav { display: flex; flex-direction: column; flex: 0 0 248px; width: 248px; min-height: 0; border-right: 1px solid var(--border-subtle); background: var(--surface-page); }
.erd-root.erd-shell--embed .erd-nav { flex-basis: 220px; width: 220px; }
/* page：導覽 sticky、高度上限取捲動容器的可視高度（renderer 量好寫進 --erd-scroll-h）。
   導覽比內容短時，欄底色與分隔線由 body 的背景補滿整欄 */
.erd-root.erd-shell--page .erd-nav { position: sticky; top: 44px; align-self: flex-start; max-height: calc(var(--erd-scroll-h, 100dvh) - 44px); border-right: 0; background: transparent; }
.erd-root.erd-shell--page:not(.erd-shell--navclosed) .erd-body { background: linear-gradient(to right, var(--surface-page) 0 248px, var(--border-subtle) 248px 249px, transparent 249px); }
.erd-root .erd-nav-search { display: flex; align-items: center; gap: 6px; flex: none; height: 30px; margin: 10px 10px 4px; padding: 0 8px 0 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: var(--surface-card); color: var(--text-muted); }
.erd-root .erd-nav-search:focus-within { border-color: var(--blue-400); }
.erd-root .erd-nav-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 12.5px; color: var(--text-strong); }
.erd-root .erd-nav-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 8px 16px; }
.erd-root .erd-nav-sec { display: flex; justify-content: space-between; padding: 12px 8px 4px; font-size: 10.5px; font-weight: var(--weight-bold); letter-spacing: .1em; color: var(--text-muted); }
.erd-root .erd-nav-item { display: flex; align-items: center; gap: 7px; width: 100%; min-height: 30px; padding: 0 8px; border: 0; border-radius: var(--radius-md); background: transparent; font: inherit; font-size: 12.5px; color: var(--neutral-700); cursor: pointer; text-align: left; }
.erd-root .erd-nav-item:hover { background: color-mix(in srgb, var(--blue-700) 6%, transparent); }
.erd-root .erd-nav-item.erd-on { background: color-mix(in srgb, var(--blue-700) 10%, transparent); color: var(--blue-700); }
.erd-root .erd-nav-item.erd-on .erd-nav-l { font-weight: var(--weight-bold); }
.erd-root .erd-nav-item--node { gap: 0; padding: 0 4px 0 0; }
.erd-root .erd-nav-main { display: flex; flex: 1; align-items: center; gap: 7px; min-width: 0; height: 30px; padding: 0 4px; border: 0; background: none; font: inherit; font-size: 12.5px; color: inherit; cursor: pointer; text-align: left; }
.erd-root .erd-nav-l { display: flex; flex: 1; align-items: baseline; gap: 6px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.erd-root .erd-nav-l code { font-size: 12px; color: var(--blue-700); }
.erd-root .erd-nav-item--node .erd-nav-l { font-weight: 600; color: var(--text-strong); }
.erd-root .erd-nav-l--group { font-size: 12px; }
.erd-root .erd-nav-sub { overflow: hidden; text-overflow: ellipsis; font-size: 11px; color: var(--text-muted); }
.erd-root .erd-nav-colhit { overflow: hidden; text-overflow: ellipsis; font-size: 11px; color: var(--text-muted); }
.erd-root .erd-nav-colhit code { font-size: 11px; color: var(--blue-700); }
.erd-root .erd-nav-n { font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.erd-root .erd-caret { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 20px; height: 30px; padding: 0; border: 0; background: none; color: var(--text-muted); cursor: pointer; }
.erd-root .erd-caret svg { transition: transform var(--duration-fast) var(--ease-out); }
.erd-root .erd-caret--open svg { transform: rotate(90deg); }
.erd-root .erd-nav-group { margin: 0 0 2px 20px; padding-left: 6px; border-left: 1px solid var(--border-subtle); }
.erd-root .erd-nav-glabel { padding: 6px 8px 2px; font-size: 10.5px; font-weight: var(--weight-bold); color: color-mix(in srgb, var(--blue-700) 80%, transparent); }
.erd-root .erd-nav-item--table { min-height: 28px; color: var(--text-muted); }
.erd-root .erd-nav-item--table code { color: var(--neutral-800); }
.erd-root .erd-nav-item--table.erd-on code { color: var(--blue-700); }
.erd-root .erd-nav-item--table.erd-on { box-shadow: inset 2px 0 0 var(--orange-400); }

/* ── 窄外殼：導覽改為覆蓋在內容上 ── */
@container erd (max-width: 760px) {
  .erd-root .erd-nav { position: absolute; top: 0; left: 0; bottom: 0; z-index: 7; box-shadow: var(--shadow-lg); }
  .erd-root.erd-shell--page .erd-nav { position: absolute; top: 0; bottom: auto; height: min(100%, calc(var(--erd-scroll-h, 100dvh) - 44px)); max-height: none; background: var(--surface-page); }
  .erd-root.erd-shell--page:not(.erd-shell--navclosed) .erd-body { background: none; }
}
@media (prefers-reduced-motion: reduce) {
  .erd-root.erd-overlay { animation: none; }
  .erd-root .erd-pill:active { transform: none; }
}

/* ── Wiki ── */
.erd-root .erd-page { padding: 28px 36px 64px; }
.erd-root.erd-shell--embed .erd-page { padding: 20px 24px 40px; }
.erd-root .erd-eyebrow { margin-bottom: 6px; font-size: 11px; font-weight: var(--weight-bold); letter-spacing: var(--tracking-wide, .12em); color: var(--orange-500); }
.erd-root .erd-h1-row { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 16px; }
.erd-root .erd-h1 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 0; font-size: 24px; font-weight: var(--weight-bold); line-height: 1.3; color: var(--text-strong); }
.erd-root .erd-h1 code { font-size: 22px; color: var(--blue-700); }
.erd-root.erd-shell--embed .erd-h1 { font-size: 20px; }
.erd-root.erd-shell--embed .erd-h1 code { font-size: 18px; }
.erd-root .erd-crumbs { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; font-size: 11.5px; color: var(--text-muted); }
.erd-root .erd-crumbs button { padding: 0; border: 0; background: none; font: inherit; color: var(--blue-700); cursor: pointer; }
.erd-root .erd-crumbs button:hover code { text-decoration: underline; }
.erd-root .erd-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; margin: 10px 0 18px; font-size: 12px; color: var(--text-muted); }
.erd-root .erd-meta b { margin-right: 2px; color: var(--text-strong); font-variant-numeric: tabular-nums; }
.erd-root .erd-meta-src { margin-left: auto; }
.erd-root .erd-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: var(--radius-pill); font-size: 11px; font-weight: 600; }
.erd-root .erd-badge--blue { background: var(--blue-50); color: var(--blue-700); }
.erd-root .erd-md { max-width: 80ch; font-size: 14px; line-height: 1.8; color: var(--text-body); text-wrap: pretty; }
.erd-root .erd-md p { margin: 0 0 12px; }
.erd-root .erd-md h3 { margin: 22px 0 8px; font-size: 15px; color: var(--text-strong); }
.erd-root .erd-md h4 { margin: 16px 0 6px; font-size: 14px; color: var(--text-strong); }
.erd-root .erd-md ul, .erd-root .erd-md ol { margin: 0 0 12px; padding-left: 22px; }
.erd-root .erd-md ul { list-style: disc; }
.erd-root .erd-md ol { list-style: decimal; }
.erd-root .erd-md li { margin: 2px 0; }
.erd-root .erd-md blockquote { margin: 12px 0; padding: 8px 14px; border-radius: var(--radius-md); background: var(--surface-accent-soft); font-size: 13px; color: var(--neutral-700); }
.erd-root .erd-md a { color: var(--blue-700); }
.erd-root .erd-md code, .erd-root .erd-lede code, .erd-root .erd-empty code { padding: 1px 5px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 12.5px; color: var(--neutral-800); }
.erd-root .erd-md .erd-tlink { text-decoration: none; }
.erd-root .erd-md .erd-tlink code { background: var(--blue-50); color: var(--blue-700); }
.erd-root .erd-md .erd-tlink:hover code { background: var(--blue-100); }
.erd-root .erd-md--lede { margin: 0 0 12px; font-size: 13px; line-height: 1.7; color: var(--text-muted); }
.erd-root .erd-md--lede p:last-child { margin-bottom: 0; }
.erd-root .erd-h2 { display: flex; align-items: center; gap: 8px; margin: 32px 0 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle); font-size: 16px; font-weight: var(--weight-bold); color: var(--blue-700); }
.erd-root .erd-h2-n { padding: 1px 8px; border-radius: var(--radius-pill); background: var(--neutral-100); font-size: 11px; font-weight: 600; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.erd-root .erd-lede { margin: 0 0 12px; font-size: 13px; line-height: 1.7; color: var(--text-muted); }
.erd-root .erd-empty { margin: 4px 0 8px; font-size: 12.5px; color: var(--text-muted); }
.erd-root .erd-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.erd-root .erd-card2 { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border: 1px solid var(--border-subtle); border-top: 3px solid var(--blue-500); border-radius: var(--radius-lg); background: var(--surface-card); box-shadow: var(--shadow-xs); font: inherit; text-align: left; cursor: pointer; transition: box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.erd-root .erd-card2:hover { box-shadow: var(--shadow-sm); transform: translateY(-1px); }
.erd-root .erd-card2:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
.erd-root .erd-card2--static { cursor: default; }
.erd-root .erd-card2--static:hover { box-shadow: var(--shadow-xs); transform: none; }
.erd-root .erd-card2-h { display: flex; align-items: baseline; gap: 8px; }
.erd-root .erd-card2-h code { font-size: 14px; font-weight: var(--weight-bold); color: var(--blue-700); }
.erd-root .erd-card2-h span { font-size: 13px; font-weight: 600; color: var(--text-strong); }
.erd-root .erd-card2-h em { margin-left: auto; font-size: 11px; font-style: normal; color: var(--text-muted); white-space: nowrap; }
.erd-root .erd-card2 p { display: -webkit-box; margin: 0; overflow: hidden; font-size: 12.5px; line-height: 1.65; color: var(--text-muted); -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.erd-root .erd-card2-g { display: flex; flex-wrap: wrap; gap: 4px; }
.erd-root .erd-card2-g span, .erd-root .erd-card2-g button { padding: 1px 8px; border: 0; border-radius: var(--radius-pill); background: var(--blue-50); font: inherit; font-size: 11px; color: var(--blue-700); }
.erd-root .erd-card2-g button { cursor: pointer; }
.erd-root .erd-card2-g button:hover { background: var(--blue-100); }
.erd-root .erd-card2-g button code { font-size: 11px; }
.erd-root .erd-vocab { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 24px; }
.erd-root .erd-vocab h4 { margin: 0 0 6px; font-size: 12px; font-weight: var(--weight-bold); color: var(--text-muted); }
.erd-root .erd-vocab-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12.5px; }
.erd-root .erd-vocab-row b:not(.erd-k) { font-weight: 600; color: var(--text-strong); }
.erd-root .erd-vocab-row span { font-size: 12px; color: var(--text-muted); }
.erd-root .erd-tlist { overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.erd-root .erd-tlist-h, .erd-root .erd-tlist-r { display: grid; grid-template-columns: minmax(150px, 1.1fr) minmax(0, 2fr) 48px 60px; align-items: center; gap: 12px; padding: 0 14px; }
.erd-root .erd-tlist-h { height: 32px; background: var(--surface-page); font-size: 11px; font-weight: var(--weight-bold); color: var(--text-muted); }
.erd-root .erd-tlist-r { width: 100%; min-height: 48px; padding-top: 8px; padding-bottom: 8px; border: 0; border-top: 1px solid var(--border-subtle); background: var(--surface-card); font: inherit; font-size: 12.5px; text-align: left; cursor: pointer; }
.erd-root .erd-tlist-r:hover { background: var(--blue-50); }
.erd-root .erd-tlist-r:focus-visible { outline: var(--focus-ring); outline-offset: -2px; }
.erd-root .erd-tlist-name { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.erd-root .erd-tlist-name code { font-weight: 600; color: var(--blue-700); }
.erd-root .erd-tlist-name em { font-size: 11.5px; font-style: normal; color: var(--text-muted); }
.erd-root .erd-tlist-d { display: -webkit-box; overflow: hidden; line-height: 1.6; color: var(--text-body); -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.erd-root .erd-tlist-d i { font-style: normal; color: var(--neutral-400); }
.erd-root .erd-tnum { font-variant-numeric: tabular-nums; }
.erd-root .erd-colt-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.erd-root .erd-colt { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.erd-root .erd-colt th { position: sticky; top: 0; padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-page); font-size: 11px; font-weight: var(--weight-bold); color: var(--text-muted); text-align: left; white-space: nowrap; }
.erd-root .erd-colt td { padding: 8px 12px; border-top: 1px solid var(--border-subtle); line-height: 1.6; vertical-align: top; }
.erd-root .erd-colt tr:first-child td { border-top: 0; }
.erd-root .erd-colt tr:hover td { background: var(--neutral-50); }
.erd-root .erd-colt .erd-keys, .erd-root .erd-kv .erd-keys { margin-left: 0; padding-left: 0; }
.erd-root .erd-colt .erd-k, .erd-root .erd-kv .erd-k, .erd-root .erd-vocab .erd-k { padding: 3px 5px; font-size: 10px; white-space: nowrap; }
.erd-root .erd-cname { font-size: 12.5px; font-weight: 600; color: var(--text-strong); white-space: nowrap; }
.erd-root .erd-ctype { font-size: 11.5px; color: var(--text-muted); white-space: nowrap; }
.erd-root .erd-req { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.erd-root .erd-na { color: var(--neutral-300); }
.erd-root .erd-cnote { min-width: 220px; color: var(--text-body); }
.erd-root .erd-fkref { display: inline-flex; align-items: center; gap: 3px; margin-right: 6px; color: var(--blue-600); text-decoration: none; }
.erd-root .erd-fkref code { padding: 0 5px; border-radius: var(--radius-sm); background: var(--blue-50); font-size: 11.5px; }
.erd-root a.erd-fkref:hover code { background: var(--blue-100); }
.erd-root .erd-fkref--missing { color: var(--neutral-400); cursor: default; }
.erd-root .erd-fkref--missing code { background: var(--neutral-100); }
.erd-root .erd-rel { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 24px; margin-top: 14px; }
.erd-root .erd-rel h4 { margin: 0 0 6px; font-size: 12px; color: var(--text-muted); }
.erd-root .erd-rel-r { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; width: 100%; padding: 6px 10px; border: 0; border-radius: var(--radius-md); background: transparent; font: inherit; font-size: 12px; color: var(--text-muted); text-align: left; cursor: pointer; }
.erd-root .erd-rel-r:hover { background: var(--blue-50); }
.erd-root .erd-rel-r:focus-visible { outline: var(--focus-ring); outline-offset: -2px; }
.erd-root .erd-rel-r code { color: var(--neutral-800); }
.erd-root .erd-rel-r code.erd-to { font-weight: 600; color: var(--blue-700); }
.erd-root .erd-rel-r em { flex: none; white-space: nowrap; padding: 0 6px; border-radius: var(--radius-pill); background: var(--neutral-100); font-size: 10.5px; font-style: normal; color: var(--neutral-600); }
.erd-root .erd-kv { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.erd-root .erd-kv-r { display: grid; grid-template-columns: minmax(140px, 180px) auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 8px 14px; border-top: 1px solid var(--border-subtle); font-size: 12.5px; }
.erd-root .erd-kv-r:first-child { border-top: 0; }
.erd-root .erd-kv-r span { color: var(--text-body); }
.erd-root .erd-kv-r span b { font-weight: 600; color: var(--text-strong); }
@container erd (max-width: 760px) {
  .erd-root .erd-page, .erd-root.erd-shell--embed .erd-page { padding: 20px 18px 40px; }
  .erd-root .erd-meta-src { margin-left: 0; }
  .erd-root .erd-tlist-h, .erd-root .erd-tlist-r { grid-template-columns: minmax(120px, 1fr) minmax(0, 1.4fr) 40px 52px; gap: 8px; padding: 0 10px; }
}
@container erd (max-width: 520px) {
  .erd-root .erd-tlist-h, .erd-root .erd-tlist-r { grid-template-columns: minmax(0, 1fr) 40px 52px; }
  .erd-root .erd-tlist-h span:nth-child(2), .erd-root .erd-tlist-d { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .erd-root .erd-card2:hover { transform: none; }
}

/* ── 局部關聯圖 ── */
.erd-root .erd-local { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 0 72px; padding: 16px 18px; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background-color: var(--surface-page); background-image: radial-gradient(circle, color-mix(in srgb, var(--text-muted) 20%, transparent) 1px, transparent 1px); background-size: 20px 20px; }
.erd-root .erd-local-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.erd-root .erd-local-svg path { fill: none; stroke: var(--blue-300); stroke-width: 1.3; }
.erd-root .erd-local-svg .erd-local-head { fill: var(--blue-400); stroke: none; }
.erd-root .erd-local-col { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.erd-root .erd-local-col--p { align-items: flex-start; }
.erd-root .erd-local-col--me { align-items: center; }
.erd-root .erd-local-col--c { align-items: flex-end; }
.erd-root .erd-local-h { font-size: 10.5px; font-weight: var(--weight-bold); letter-spacing: .06em; color: var(--text-muted); }
.erd-root .erd-local-empty { font-size: 12px; color: var(--neutral-400); }
.erd-root .erd-ln { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; max-width: 100%; min-width: 0; padding: 6px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--surface-card); box-shadow: var(--shadow-xs); font: inherit; text-align: left; cursor: pointer; }
.erd-root button.erd-ln:hover { border-color: var(--blue-400); }
.erd-root button.erd-ln:focus-visible, .erd-root .erd-ln-more:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
.erd-root .erd-ln-n { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 12px; font-weight: var(--weight-bold); color: var(--blue-700); }
.erd-root .erd-ln-l { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-muted); }
.erd-root .erd-ln--me { padding: 9px 14px; border-color: var(--orange-400); background: var(--gradient-accent); box-shadow: var(--shadow-accent); cursor: default; }
.erd-root .erd-ln--me .erd-ln-n { font-size: 13px; color: var(--blue-950); }
.erd-root .erd-ln--me .erd-ln-l { color: var(--blue-950); }
.erd-root .erd-ln-self { margin-top: 2px; font-size: 10px; color: color-mix(in srgb, var(--blue-950) 80%, transparent); }
.erd-root .erd-ln-more { padding: 2px 10px; border: 1px dashed var(--border-default); border-radius: var(--radius-pill); background: var(--surface-card); font: inherit; font-size: 11px; color: var(--blue-700); cursor: pointer; }
.erd-root .erd-ln-more:hover { border-color: var(--blue-400); }
.erd-root .erd-local--v { grid-template-columns: minmax(0, 1fr); gap: 36px 0; }
.erd-root .erd-local--v .erd-local-col { flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center; }
.erd-root .erd-local--v .erd-local-h { flex-basis: 100%; text-align: left; }
.erd-root .erd-local--v .erd-local-col--me .erd-local-h { display: none; }

/* ── Diagram 範圍與聚焦列（v1.2）── */
.erd-root .erd-scope { display: flex; align-items: center; gap: 4px; min-width: 0; margin-left: auto; overflow-x: auto; font-size: 11.5px; color: var(--text-muted); scrollbar-width: none; }
.erd-root .erd-scope-l { flex: none; margin-right: 4px; }
.erd-root .erd-scope button { flex: none; height: 24px; padding: 0 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: var(--surface-card); font: inherit; font-size: 11.5px; color: var(--text-body); cursor: pointer; white-space: nowrap; }
.erd-root .erd-scope button:hover { border-color: var(--blue-300); color: var(--blue-700); }
.erd-root .erd-scope button.erd-on { border-color: var(--blue-700); background: var(--blue-700); color: var(--neutral-0); }
.erd-root .erd-scope button:focus-visible { outline: var(--focus-ring); outline-offset: 1px; }
.erd-root .erd-focusbar-act { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-left: auto; }
.erd-root .erd-focusbar-act .erd-reset { margin-left: 0; }
.erd-root .erd-hint-cross { margin-left: 6px; color: var(--orange-600); }

/* ── 響應式收尾（v1.2）── */
.erd-root .erd-nav-backdrop { position: absolute; inset: 0; z-index: 6; background: color-mix(in srgb, var(--blue-950) 12%, transparent); }
@container erd (max-width: 520px) {
  .erd-root .erd-bar { gap: 8px; padding: 0 8px; }
  .erd-root .erd-tabs button { padding: 0 10px; }
  .erd-root .erd-tab-l, .erd-root .erd-bar-crumb, .erd-root .erd-scope-l { display: none; }
  .erd-root .erd-search { min-width: 0; flex: 1; }
  .erd-root .erd-legend { display: none; }
}

/* embed 的高度固定：提示列與聚焦列不能無限長高，否則畫布被擠到只剩一條縫 */
.erd-root.erd-shell--embed .erd-hint { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.erd-root.erd-shell--embed .erd-focusbar .erd-muted { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
`

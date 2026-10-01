/* OpenAPI Renderer —— 樣式
 *
 * 以字串注入 <style>，不另開 .css：plugin 自帶樣式、不碰 app 的 Tailwind 掃描。
 * 所有規則以 .oar-root 起頭，避免漏到筆記內文。
 *
 * 兩條不能破的規則（scripts/checks/oar-styles.mjs 把關）：
 * - 字串裡不可有 < > & " ' —— React SSR 會把它們跳脫成實體，<style> 不會解回來，選擇器壞掉、hydration 對不上。
 *   所以不用子代選擇器 >，改用具名 class
 * - DS 沒有的值只能出現在下方 .oar-root 的 --oar-* 定義裡，規則只引用變數
 *
 * 導覽、Wiki 頁首、h2、欄位表、參照兩欄、kv 列的數值與 ER plugin（er-diagram-renderer/styles.ts）相同 ——
 * 兩個 plugin 是同一家族，但各自安裝、不共用 class。改 ER 的骨架時記得同步這裡。
 */

export const CSS = `
/* ── token：DS 沒有的值集中在這裡 ───────────────────────── */
.oar-root {
  --oar-ok-ink: #1f7350; --oar-warn-ink: #8a6412; --oar-danger-ink: #c0392f;
  --oar-get-fg: var(--blue-600); --oar-get-bg: var(--blue-50);
  --oar-post-fg: var(--oar-ok-ink); --oar-post-bg: var(--success-50);
  --oar-put-fg: var(--oar-warn-ink); --oar-put-bg: var(--warning-50);
  --oar-patch-fg: oklch(.47 .08 195); --oar-patch-bg: oklch(.96 .022 195);
  --oar-delete-fg: var(--oar-danger-ink); --oar-delete-bg: var(--danger-50);
  --oar-other-fg: var(--neutral-600); --oar-other-bg: var(--neutral-100);
  --oar-param-fg: var(--orange-700); --oar-param-bg: var(--orange-50);
  --oar-json-key: var(--blue-800); --oar-json-str: var(--oar-ok-ink); --oar-json-num: var(--orange-700); --oar-json-lit: var(--neutral-500);
  font-family: var(--font-sans); color: var(--text-body);
}
.oar-root.oar-host { container: oar / inline-size; }
.oar-root code { font-family: var(--font-mono); }
.oar-root .oar-tnum { font-variant-numeric: tabular-nums; }
.oar-root .oar-muted { color: var(--text-muted); }
.oar-root .oar-none, .oar-root .oar-none code { font-style: normal; color: var(--text-muted); }
.oar-root .oar-kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border: 1px solid var(--border-default); border-bottom-width: 2px; border-radius: 4px; background: var(--surface-card); font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted); line-height: 1; }
.oar-root button:focus-visible, .oar-root a:focus-visible, .oar-root select:focus-visible { outline: var(--focus-ring); outline-offset: 1px; }

/* ── 外殼（骨架同 ER）────────────────────────────────── */
.oar-root .oar-shell { position: relative; display: flex; flex-direction: column; min-width: 0; background: var(--surface-card); font-size: 13px; }
.oar-root .oar-shell--page { min-height: var(--oar-scroll-h, 100dvh); }
.oar-root .oar-bar { display: flex; align-items: center; gap: 12px; flex: none; height: 44px; padding: 0 14px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-card); }
.oar-root .oar-shell--page .oar-bar { position: sticky; top: 0; z-index: 6; }
.oar-root .oar-iconbtn { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 30px; height: 30px; padding: 0; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--text-muted); cursor: pointer; }
.oar-root .oar-iconbtn:hover { background: var(--blue-50); color: var(--blue-700); }
.oar-root .oar-iconbtn.oar-on { color: var(--blue-700); }
.oar-root .oar-bar-crumb { margin: 0 auto 0 4px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; color: var(--text-muted); }
.oar-root .oar-bar-crumb code { color: var(--blue-700); }
.oar-root .oar-bar-v { flex: none; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
.oar-root .oar-bar-warn { display: inline-flex; flex: none; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: var(--radius-pill); background: var(--warning-50); color: var(--oar-warn-ink); font-family: var(--font-mono); font-size: 11px; font-weight: 700; }
.oar-root .oar-toast { display: inline-flex; flex: none; align-items: center; gap: 5px; height: 24px; padding: 0 10px; border-radius: var(--radius-pill); background: var(--neutral-900); color: var(--text-on-brand); font-size: 11.5px; animation: oar-fade 140ms var(--ease-out); }
@keyframes oar-fade { from { opacity: 0; } to { opacity: 1; } }
.oar-root .oar-pill { display: inline-flex; align-items: center; gap: 5px; flex: none; height: 28px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-pill); background: var(--surface-card); font: inherit; font-size: 12px; font-weight: 600; color: var(--text-body); cursor: pointer; white-space: nowrap; transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out); }
.oar-root .oar-pill:hover { border-color: var(--blue-400); color: var(--blue-700); }
.oar-root .oar-pill:active { transform: scale(.97); }
.oar-root .oar-body { position: relative; flex: 1; display: flex; min-height: 0; }
.oar-root .oar-main { flex: 1; min-width: 0; }
.oar-root .oar-main-col { min-width: 0; }
.oar-root .oar-narrow { max-width: 880px; margin: 0 auto; }

/* ── 導覽（骨架同 ER）────────────────────────────────── */
.oar-root .oar-nav { display: flex; flex-direction: column; flex: 0 0 248px; width: 248px; min-height: 0; border-right: 1px solid var(--border-subtle); background: var(--surface-page); }
.oar-root .oar-shell--page .oar-nav { position: sticky; top: 44px; align-self: flex-start; max-height: calc(var(--oar-scroll-h, 100dvh) - 44px); border-right: 0; background: transparent; }
.oar-root .oar-shell--page.oar-shell--nav .oar-body { background: linear-gradient(to right, var(--surface-page) 0 248px, var(--border-subtle) 248px 249px, transparent 249px); }
.oar-root .oar-nav-search { display: flex; align-items: center; gap: 6px; flex: none; height: 30px; margin: 10px 10px 4px; padding: 0 8px 0 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: var(--surface-card); color: var(--text-muted); }
.oar-root .oar-nav-search:focus-within { border-color: var(--blue-400); }
.oar-root .oar-nav-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 12.5px; color: var(--text-strong); }
.oar-root .oar-hits { flex: none; font-size: 11px; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.oar-root .oar-hits-ok { color: var(--blue-700); }
.oar-root .oar-hits-none { color: var(--danger-500); }
.oar-root .oar-nav-methods { display: flex; flex: none; flex-wrap: wrap; gap: 4px; padding: 4px 10px 6px; }
.oar-root .oar-mchip { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 6px 0 3px; border: 1px solid transparent; border-radius: var(--radius-pill); background: none; font: inherit; font-size: 11px; color: var(--text-muted); cursor: pointer; }
.oar-root .oar-mchip .oar-m { width: auto; height: 16px; padding: 0 5px; font-size: 9.5px; }
.oar-root .oar-mchip:hover { border-color: var(--border-subtle); background: var(--surface-card); }
.oar-root .oar-mchip.oar-on { border-color: var(--blue-400); background: var(--surface-card); color: var(--blue-700); font-weight: 700; }
.oar-root .oar-nav-scroll { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 4px 8px 16px; }
.oar-root .oar-nav-sec { display: flex; justify-content: space-between; padding: 12px 8px 4px; font-size: 10.5px; font-weight: var(--weight-bold); letter-spacing: .1em; color: var(--text-muted); }
.oar-root .oar-nav-item { display: flex; align-items: center; gap: 7px; width: 100%; min-height: 30px; padding: 0 8px; border: 0; border-radius: var(--radius-md); background: transparent; font: inherit; font-size: 12.5px; color: var(--neutral-700); cursor: pointer; text-align: left; }
.oar-root .oar-nav-item:hover { background: color-mix(in srgb, var(--blue-700) 6%, transparent); }
.oar-root .oar-nav-item.oar-on { background: color-mix(in srgb, var(--blue-700) 10%, transparent); color: var(--blue-700); }
.oar-root .oar-nav-item.oar-on .oar-nav-l { font-weight: var(--weight-bold); }
.oar-root .oar-nav-item--node { gap: 0; padding: 0 4px 0 0; }
.oar-root .oar-nav-item--leaf { min-height: 28px; color: var(--text-muted); }
.oar-root .oar-nav-item--leaf code { color: var(--neutral-800); }
.oar-root .oar-nav-item--leaf.oar-on code { color: var(--blue-700); }
.oar-root .oar-nav-item--leaf.oar-on { box-shadow: inset 2px 0 0 var(--orange-400); }
.oar-root .oar-nav-main { display: flex; flex: 1; align-items: center; gap: 7px; min-width: 0; height: 30px; padding: 0 4px; border: 0; background: none; font: inherit; font-size: 12.5px; color: inherit; cursor: pointer; text-align: left; }
.oar-root .oar-nav-l { display: flex; flex: 1; align-items: baseline; gap: 6px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oar-root .oar-nav-item--node .oar-nav-l { font-weight: 600; color: var(--text-strong); }
.oar-root .oar-nav-item--node .oar-nav-l.oar-none { font-weight: 600; }
.oar-root .oar-nav-n { font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.oar-root .oar-caret { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 20px; height: 30px; padding: 0; border: 0; background: none; color: var(--text-muted); cursor: pointer; }
.oar-root .oar-caret:disabled { opacity: .35; cursor: default; }
.oar-root .oar-caret svg { transition: transform var(--duration-fast) var(--ease-out); }
.oar-root .oar-caret.oar-open svg { transform: rotate(90deg); }
.oar-root .oar-nav-group { margin: 0 0 2px 16px; padding-left: 6px; border-left: 1px solid var(--border-subtle); }
.oar-root .oar-nav-base { padding: 4px 8px 2px; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oar-root .oar-nav-op { display: flex; align-items: center; gap: 7px; width: 100%; min-height: 30px; padding: 0 6px; border: 0; border-radius: var(--radius-md); background: transparent; font: inherit; text-align: left; cursor: pointer; color: var(--neutral-700); }
.oar-root .oar-nav-op:hover { background: color-mix(in srgb, var(--blue-700) 6%, transparent); }
.oar-root .oar-nav-op.oar-on { background: color-mix(in srgb, var(--blue-700) 10%, transparent); box-shadow: inset 2px 0 0 var(--orange-400); }
.oar-root .oar-nav-op.oar-on .oar-path { color: var(--blue-700); font-weight: 700; }
.oar-root .oar-nav-op.oar-two { align-items: flex-start; min-height: 40px; padding-top: 4px; padding-bottom: 4px; }
.oar-root .oar-nav-op.oar-two .oar-m { margin-top: 1px; }
.oar-root .oar-nav-pw { display: flex; flex: 1; flex-direction: column; gap: 1px; min-width: 0; }
.oar-root .oar-nav-p { display: flex; min-width: 0; }
.oar-root .oar-nav-p .oar-path { min-width: 0; font-size: 11.5px; color: var(--neutral-800); }
.oar-root .oar-nav-s { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-muted); }
.oar-root .oar-nav-s i { font-style: normal; color: var(--neutral-400); }
.oar-root .oar-nav-op.oar-dep .oar-path { color: var(--neutral-400); text-decoration: line-through; text-decoration-color: var(--neutral-300); }
.oar-root .oar-nav-op.oar-dep .oar-m { opacity: .55; }
.oar-root .oar-nav-dep { flex: none; font-size: 10px; color: var(--neutral-400); }
.oar-root .oar-nav-secs { display: flex; flex-direction: column; margin: 2px 0 4px 26px; padding-left: 8px; border-left: 1px solid var(--border-subtle); }
.oar-root .oar-nav-secs button { height: 24px; padding: 0 8px; border: 0; border-radius: var(--radius-sm); background: none; font: inherit; font-size: 11.5px; color: var(--text-muted); text-align: left; cursor: pointer; }
.oar-root .oar-nav-secs button:hover { color: var(--blue-700); }
.oar-root .oar-nav-secs button.oar-on { background: color-mix(in srgb, var(--blue-700) 6%, transparent); color: var(--blue-700); font-weight: 700; }
.oar-root .oar-nav-empty { margin: 8px; font-size: 12px; line-height: 1.7; color: var(--text-muted); }
.oar-root .oar-nav-foot { display: flex; flex: none; align-items: center; gap: 5px; padding: 8px 12px; border-top: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-muted); }
.oar-root .oar-nav-foot .oar-kbd-gap { margin-left: 8px; }
.oar-root .oar-nav-backdrop { position: absolute; inset: 0; z-index: 6; background: color-mix(in srgb, var(--blue-950) 12%, transparent); }
.oar-root .oar-tip { position: fixed; z-index: 50; max-width: 340px; padding: 8px 10px; border-radius: var(--radius-md); background: var(--blue-950); color: var(--text-on-brand); font-size: 12px; line-height: 1.6; box-shadow: var(--shadow-lg); pointer-events: none; }
.oar-root .oar-tip-p { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.oar-root .oar-tip-p .oar-path { color: var(--orange-300); font-size: 11.5px; white-space: normal; overflow-wrap: anywhere; }
.oar-root .oar-tip .oar-m { background: color-mix(in srgb, var(--text-on-brand) 10%, transparent); box-shadow: none; color: var(--text-on-brand); }

/* ── Wiki 頁（骨架同 ER）─────────────────────────────── */
.oar-root .oar-page { padding: 28px 36px 64px; }
.oar-root .oar-eyebrow { margin-bottom: 6px; font-size: 11px; font-weight: var(--weight-bold); letter-spacing: var(--tracking-wide, .12em); color: var(--orange-500); }
.oar-root .oar-h1-row { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 16px; }
.oar-root .oar-h1 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 0; font-size: 24px; font-weight: var(--weight-bold); line-height: 1.3; color: var(--text-strong); }
.oar-root .oar-h1 code { font-size: 22px; color: var(--blue-700); }
.oar-root .oar-crumbs { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; font-size: 11.5px; color: var(--text-muted); }
.oar-root .oar-crumbs button { padding: 0; border: 0; background: none; font: inherit; color: var(--blue-700); cursor: pointer; }
.oar-root .oar-crumbs button:hover code { text-decoration: underline; }
.oar-root .oar-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; margin: 10px 0 18px; font-size: 12px; color: var(--text-muted); }
.oar-root .oar-meta b { margin-right: 2px; color: var(--text-strong); font-variant-numeric: tabular-nums; }
.oar-root .oar-meta-src { margin-left: auto; }
.oar-root .oar-meta-src code { font-size: 11.5px; }
.oar-root .oar-md { max-width: 80ch; font-size: 14px; line-height: 1.8; color: var(--text-body); text-wrap: pretty; }
.oar-root .oar-md p { margin: 0 0 12px; }
.oar-root .oar-md h3 { margin: 22px 0 8px; font-size: 15px; color: var(--text-strong); }
.oar-root .oar-md h4 { margin: 16px 0 6px; font-size: 14px; color: var(--text-strong); }
.oar-root .oar-md ul, .oar-root .oar-md ol { margin: 0 0 12px; padding-left: 22px; }
.oar-root .oar-md ul { list-style: disc; }
.oar-root .oar-md ol { list-style: decimal; }
.oar-root .oar-md li { margin: 2px 0; }
.oar-root .oar-md blockquote { margin: 12px 0; padding: 8px 14px; border-radius: var(--radius-md); background: var(--surface-accent-soft); font-size: 13px; color: var(--neutral-700); }
.oar-root .oar-md a, .oar-root .oar-inl a { color: var(--blue-700); }
.oar-root .oar-md code, .oar-root .oar-lede code, .oar-root .oar-empty code { padding: 1px 5px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 12.5px; color: var(--neutral-800); }
.oar-root .oar-h2 { display: flex; align-items: center; gap: 8px; margin: 32px 0 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle); font-size: 16px; font-weight: var(--weight-bold); color: var(--blue-700); }
.oar-root .oar-h2-n { padding: 1px 8px; border-radius: var(--radius-pill); background: var(--neutral-100); font-size: 11px; font-weight: 600; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.oar-root .oar-h2-x { display: inline-flex; align-items: center; margin-left: auto; font-size: 12px; font-weight: 400; color: var(--text-muted); }
.oar-root .oar-lede { margin: 0 0 12px; font-size: 13px; line-height: 1.7; color: var(--text-muted); }
.oar-root .oar-empty { margin: 4px 0 8px; font-size: 12.5px; color: var(--text-muted); }
.oar-root [data-sec], .oar-root .oar-ptable tr { scroll-margin-top: 56px; }
.oar-root .oar-missing { display: flex; align-items: flex-start; gap: 7px; margin: 4px 0 8px; padding: 9px 12px; border: 1px dashed var(--border-default); border-radius: var(--radius-md); font-size: 12.5px; line-height: 1.7; color: var(--text-muted); }
.oar-root .oar-missing svg { flex: none; margin-top: 4px; }
.oar-root .oar-missing code { padding: 1px 5px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 12px; color: var(--neutral-800); word-break: break-all; }
.oar-root .oar-notice { display: flex; align-items: flex-start; gap: 8px; margin: 0 0 18px; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--warning-500) 34%, transparent); border-radius: var(--radius-md); background: var(--warning-50); font-size: 12.5px; line-height: 1.7; color: var(--neutral-800); }
.oar-root .oar-notice svg { flex: none; margin-top: 4px; color: var(--oar-warn-ink); }
.oar-root .oar-notice code { padding: 0 4px; border-radius: 3px; background: color-mix(in srgb, var(--surface-card) 70%, transparent); font-size: 12px; }
.oar-root .oar-ver { align-self: center; padding: 2px 8px; border-radius: var(--radius-pill); background: var(--neutral-100); font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--neutral-700); }
.oar-root .oar-unsupported { display: flex; align-items: flex-start; gap: 8px; margin: 24px; padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--surface-card); font-size: 13px; line-height: 1.7; color: var(--text-body); }
.oar-root .oar-unsupported svg { flex: none; margin-top: 3px; color: var(--danger-500); }
.oar-root .oar-unsupported code { padding: 1px 5px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 12px; }

/* ── 表格、kv、參照（骨架同 ER）──────────────────────── */
.oar-root .oar-colt-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.oar-root .oar-colt { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.oar-root .oar-colt th { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-page); font-size: 11px; font-weight: var(--weight-bold); color: var(--text-muted); text-align: left; white-space: nowrap; }
.oar-root .oar-colt td { padding: 8px 12px; border-top: 1px solid var(--border-subtle); line-height: 1.6; vertical-align: top; }
.oar-root .oar-colt tbody tr:first-child td { border-top: 0; }
.oar-root .oar-colt tr:hover td { background: var(--neutral-50); }
.oar-root .oar-cname { font-size: 12.5px; font-weight: 600; color: var(--text-strong); white-space: nowrap; }
.oar-root .oar-na { color: var(--neutral-300); }
.oar-root .oar-cnote { color: var(--text-body); }
.oar-root .oar-kv { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.oar-root .oar-kv-r { display: grid; grid-template-columns: minmax(140px, 180px) auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 8px 14px; border-top: 1px solid var(--border-subtle); font-size: 12.5px; }
.oar-root .oar-kv-r:first-child { border-top: 0; }
.oar-root .oar-kv-r.oar-kv3 { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto; }
.oar-root .oar-kv-r.oar-kv-sec { grid-template-columns: minmax(120px, 160px) auto minmax(0, 1fr); }
.oar-root .oar-url { overflow-wrap: anywhere; font-size: 12.5px; color: var(--text-strong); }
.oar-root .oar-scope { margin-left: 4px; padding: 0 5px; border-radius: 3px; background: var(--neutral-100); font-size: 11px; }
.oar-root .oar-rel { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 24px; margin-top: 14px; }
.oar-root .oar-rel h4 { margin: 0 0 6px; font-size: 12px; color: var(--text-muted); }
.oar-root .oar-rel-r { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; width: 100%; padding: 6px 10px; border: 0; border-radius: var(--radius-md); background: transparent; font: inherit; font-size: 12px; color: var(--text-muted); text-align: left; cursor: pointer; }
.oar-root .oar-rel-r:hover { background: var(--blue-50); }
.oar-root .oar-rel-r code { color: var(--neutral-800); }
.oar-root .oar-rel-r code.oar-to { font-weight: 600; color: var(--blue-700); }
.oar-root .oar-rel-r em { flex: none; padding: 0 6px; border-radius: var(--radius-pill); background: var(--neutral-100); font-size: 10.5px; font-style: normal; color: var(--neutral-600); white-space: nowrap; }

/* ── method、status、path ────────────────────────────── */
.oar-root .oar-m { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 44px; height: 18px; border-radius: 4px; background: var(--mbg); box-shadow: inset 0 0 0 1px transparent; font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: .02em; color: var(--mfg); }
.oar-root .oar-m.oar-read { background: var(--surface-card); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mfg) 45%, transparent); }
.oar-root .oar-m--get { --mfg: var(--oar-get-fg); --mbg: var(--oar-get-bg); }
.oar-root .oar-m--post { --mfg: var(--oar-post-fg); --mbg: var(--oar-post-bg); }
.oar-root .oar-m--put { --mfg: var(--oar-put-fg); --mbg: var(--oar-put-bg); }
.oar-root .oar-m--patch { --mfg: var(--oar-patch-fg); --mbg: var(--oar-patch-bg); }
.oar-root .oar-m--delete { --mfg: var(--oar-delete-fg); --mbg: var(--oar-delete-bg); }
.oar-root .oar-m--other { --mfg: var(--oar-other-fg); --mbg: var(--oar-other-bg); }
.oar-root .oar-m--lg { width: auto; min-width: 52px; height: 24px; padding: 0 8px; border-radius: 5px; font-size: 12px; }
.oar-root .oar-st { display: inline-flex; flex: none; align-items: center; gap: 6px; height: 22px; padding: 0 9px; border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: var(--surface-card); font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--sfg); cursor: default; }
.oar-root .oar-st i { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--sfg); }
.oar-root .oar-st--ok { --sfg: var(--oar-ok-ink); }
.oar-root .oar-st--info { --sfg: var(--blue-600); }
.oar-root .oar-st--warn { --sfg: var(--oar-warn-ink); }
.oar-root .oar-st--danger { --sfg: var(--oar-danger-ink); }
.oar-root .oar-st--neutral { --sfg: var(--neutral-600); }
.oar-root .oar-st--warn i { border-radius: 1px; transform: rotate(45deg) scale(.85); }
.oar-root .oar-st--danger i { border-radius: 1px; }
.oar-root .oar-st--neutral i { background: transparent; box-shadow: inset 0 0 0 1.5px var(--sfg); }
.oar-root button.oar-st { cursor: pointer; }
.oar-root button.oar-st:hover { border-color: color-mix(in srgb, var(--sfg) 50%, transparent); }
.oar-root button.oar-st.oar-on { border-color: var(--sfg); background: color-mix(in srgb, var(--sfg) 9%, var(--surface-card)); }
.oar-root .oar-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); color: var(--text-strong); }
.oar-root .oar-path.oar-wrap { white-space: normal; overflow-wrap: anywhere; }
.oar-root .oar-pp { padding: 0 2px; border-radius: 3px; background: var(--oar-param-bg); color: var(--oar-param-fg); }
.oar-root button.oar-pp { border: 0; font: inherit; cursor: pointer; }
.oar-root button.oar-pp:hover { background: var(--orange-100); }

/* ── 按鈕、切換、程式碼 ───────────────────────────────── */
.oar-root .oar-copy { display: inline-flex; flex: none; align-items: center; gap: 4px; height: 24px; padding: 0 9px; border: 1px solid var(--border-subtle); border-radius: var(--radius-pill); background: var(--surface-card); font: inherit; font-size: 11.5px; font-weight: 600; color: var(--text-muted); cursor: pointer; white-space: nowrap; }
.oar-root .oar-copy:hover { border-color: var(--blue-300); color: var(--blue-700); }
.oar-root .oar-copy.oar-done, .oar-root .oar-pill.oar-done { border-color: var(--success-500); background: var(--success-50); color: var(--oar-ok-ink); }
.oar-root .oar-sel { max-width: 220px; height: 24px; padding: 0 6px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--surface-card); font: inherit; font-size: 11.5px; color: var(--text-body); }
.oar-root .oar-seg { display: inline-flex; flex-wrap: nowrap; gap: 2px; max-width: 100%; padding: 2px; overflow-x: auto; border-radius: var(--radius-pill); background: var(--neutral-100); scrollbar-width: none; }
.oar-root .oar-seg button { height: 22px; padding: 0 10px; border: 0; border-radius: var(--radius-pill); background: none; font: inherit; font-size: 11.5px; color: var(--text-muted); cursor: pointer; white-space: nowrap; }
.oar-root .oar-seg button:hover { color: var(--blue-700); }
.oar-root .oar-seg button.oar-on { background: var(--surface-card); box-shadow: var(--shadow-xs); color: var(--blue-700); font-weight: 700; }
.oar-root .oar-seg.oar-mono button, .oar-root .oar-seg-one.oar-mono { font-family: var(--font-mono); font-size: 11px; }
.oar-root .oar-seg-one { padding: 2px 8px; border-radius: var(--radius-pill); background: var(--neutral-100); font-size: 11.5px; color: var(--text-body); }
.oar-root .oar-code { min-width: 0; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--surface-page); }
.oar-root .oar-code-h { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 8px 0 12px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-card); font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.oar-root .oar-code-t { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.oar-root .oar-code-sp { flex: 1; }
.oar-root .oar-code-f { padding: 7px 12px; border-top: 1px solid var(--border-subtle); background: var(--surface-card); font-size: 11.5px; line-height: 1.6; color: var(--text-muted); }
.oar-root .oar-code-empty { margin: 0; padding: 16px 12px; font-size: 12px; color: var(--text-muted); }
.oar-root .oar-pre { margin: 0; padding: 12px 14px; overflow: auto; font-family: var(--font-mono); font-size: 12px; line-height: 1.65; color: var(--neutral-800); white-space: pre; tab-size: 2; }
.oar-root .oar-pre.oar-sh { white-space: pre-wrap; word-break: break-all; }
.oar-root .oar-j-k { color: var(--oar-json-key); }
.oar-root .oar-j-s { color: var(--oar-json-str); }
.oar-root .oar-j-n { color: var(--oar-json-num); }
.oar-root .oar-j-l { color: var(--oar-json-lit); font-weight: 600; }
.oar-root .oar-ph { padding: 0 2px; border-radius: 3px; background: var(--oar-param-bg); font-family: var(--font-mono); color: var(--oar-param-fg); }

/* ── 型別與旗標 ───────────────────────────────────────── */
.oar-root .oar-type { display: inline-flex; align-items: center; height: 18px; padding: 0 5px; border-radius: var(--radius-sm); background: var(--neutral-100); font-family: var(--font-mono); font-size: 11px; color: var(--neutral-700); white-space: nowrap; }
.oar-root .oar-type.oar-combo-t { background: var(--blue-50); color: var(--blue-700); }
.oar-root .oar-tref { display: inline-flex; align-items: center; gap: 2px; height: 18px; padding: 0 5px; border-radius: var(--radius-sm); background: var(--blue-50); color: var(--blue-700); text-decoration: none; white-space: nowrap; }
.oar-root .oar-tref code { font-size: 11px; font-weight: 600; }
.oar-root .oar-tref:hover { background: var(--blue-100); color: var(--blue-800); }
.oar-root .oar-flag { display: inline-flex; align-items: center; gap: 3px; height: 17px; padding: 0 6px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 10.5px; font-weight: 600; color: var(--neutral-600); white-space: nowrap; }
.oar-root .oar-flag.oar-dep { background: transparent; box-shadow: inset 0 0 0 1px var(--border-default); color: var(--neutral-500); }
.oar-root .oar-flag.oar-lg { height: 20px; margin-left: 8px; font-size: 11px; }
.oar-root .oar-flag.oar-cyc { background: var(--orange-50); color: var(--orange-700); }
.oar-root .oar-enum { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 3px; }
.oar-root .oar-enum em { margin-right: 1px; font-size: 10.5px; font-style: normal; color: var(--text-muted); }
.oar-root .oar-enum code { padding: 0 4px; border-radius: 3px; background: var(--orange-50); font-size: 10.5px; color: var(--orange-700); }
.oar-root .oar-enum span { font-size: 10.5px; color: var(--text-muted); }
.oar-root .oar-req { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--blue-700); white-space: nowrap; }
.oar-root .oar-req i { width: 6px; height: 6px; border-radius: 50%; background: var(--blue-500); }
.oar-root .oar-fmt { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted); }
.oar-root .oar-con { padding: 0 5px; border: 1px solid var(--border-subtle); border-radius: 3px; background: var(--surface-page); font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted); }
.oar-root .oar-inl code { padding: 0 4px; border-radius: 3px; background: var(--neutral-100); font-size: 11px; }

/* ── 總覽 ─────────────────────────────────────────────── */
.oar-root .oar-sizebar { display: flex; gap: 2px; height: 40px; margin: 4px 0 14px; overflow: hidden; border-radius: var(--radius-md); }
.oar-root .oar-sizebar button { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-width: 28px; padding: 0 8px; overflow: hidden; border: 0; background: var(--blue-50); font: inherit; text-align: left; cursor: pointer; }
.oar-root .oar-sizebar button:nth-child(even) { background: var(--blue-100); }
.oar-root .oar-sizebar button:hover { background: var(--blue-200); }
.oar-root .oar-sizebar span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 11px; color: var(--blue-800); }
.oar-root .oar-sizebar b { font-size: 11px; color: var(--blue-700); }
.oar-root .oar-tagt { overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.oar-root .oar-tagt-h, .oar-root .oar-tagt-r { display: grid; grid-template-columns: minmax(110px, .8fr) minmax(0, 1.6fr) 110px minmax(180px, 1.3fr); align-items: center; gap: 12px; padding: 0 14px; }
.oar-root .oar-tagt-h { height: 32px; background: var(--surface-page); font-size: 11px; font-weight: 700; color: var(--text-muted); }
.oar-root .oar-tagt-r { width: 100%; min-height: 42px; padding-top: 6px; padding-bottom: 6px; border: 0; border-top: 1px solid var(--border-subtle); background: var(--surface-card); font: inherit; font-size: 12.5px; text-align: left; cursor: pointer; }
.oar-root .oar-tagt-r:hover { background: var(--blue-50); }
.oar-root .oar-tagt-r code { font-weight: 600; color: var(--blue-700); }
.oar-root .oar-tagt-d { display: -webkit-box; overflow: hidden; line-height: 1.6; color: var(--text-body); -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.oar-root .oar-tagt-d i { font-style: normal; color: var(--neutral-400); }
.oar-root .oar-tagt-n { display: flex; align-items: center; gap: 8px; }
.oar-root .oar-tagt-n b { width: 24px; font-weight: 700; color: var(--text-strong); text-align: right; }
.oar-root .oar-tagt-n i { max-width: 70px; height: 5px; border-radius: 999px; background: var(--blue-400); }
.oar-root .oar-mcounts { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.oar-root .oar-mcount { display: inline-flex; align-items: center; gap: 3px; }
.oar-root .oar-mcount .oar-m { width: auto; height: 16px; padding: 0 4px; font-size: 9.5px; }
.oar-root .oar-mcount b { font-size: 11.5px; font-weight: 600; color: var(--text-body); }
.oar-root .oar-oplist { overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.oar-root .oar-oplist-r { display: grid; grid-template-columns: 44px minmax(0, 1.2fr) minmax(0, 1fr) auto; align-items: center; gap: 12px; width: 100%; min-height: 38px; padding: 4px 14px; border: 0; border-top: 1px solid var(--border-subtle); background: var(--surface-card); font: inherit; font-size: 12.5px; text-align: left; cursor: pointer; }
.oar-root .oar-oplist-r.oar-first { border-top: 0; }
.oar-root .oar-oplist-r:hover { background: var(--blue-50); }
.oar-root .oar-oplist-p { display: flex; min-width: 0; }
.oar-root .oar-oplist-p .oar-path { font-size: 12px; }
.oar-root .oar-oplist-s { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); }
.oar-root .oar-oplist-s i { font-style: normal; color: var(--neutral-400); }
.oar-root .oar-oplist-r.oar-dep .oar-path { color: var(--neutral-400); text-decoration: line-through; }
.oar-root .oar-oplist-r.oar-via .oar-path { color: var(--neutral-600); }
.oar-root .oar-oplist-sub { padding: 6px 14px; border-top: 1px solid var(--border-subtle); background: var(--surface-page); font-size: 11px; font-weight: 700; color: var(--text-muted); }
.oar-root .oar-oplist-sub.oar-first { border-top: 0; }
.oar-root .oar-schemachips { display: flex; flex-wrap: wrap; gap: 8px; }
.oar-root .oar-schemachip { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--surface-card); font: inherit; color: var(--text-muted); cursor: pointer; }
.oar-root .oar-schemachip code { font-size: 12.5px; font-weight: 600; color: var(--blue-700); }
.oar-root .oar-schemachip span { font-size: 11px; }
.oar-root .oar-schemachip:hover { border-color: var(--blue-300); }

/* ── Operation 頁 ─────────────────────────────────────── */
.oar-root .oar-op-hd { display: flex; align-items: flex-start; gap: 10px; }
.oar-root .oar-op-hd .oar-m { margin-top: 2px; }
.oar-root .oar-op-path { min-width: 0; margin: 0; font-size: 19px; font-weight: 700; line-height: 1.4; }
.oar-root .oar-op-sum { display: flex; flex-wrap: wrap; align-items: center; margin: 6px 0 0; font-size: 15px; font-weight: 600; color: var(--neutral-800); }
.oar-root .oar-op-meta { gap: 8px 14px; }
.oar-root .oar-opid { font-size: 12px; }
.oar-root .oar-opid code { margin-left: 3px; padding: 1px 6px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 12px; color: var(--neutral-800); }
.oar-root .oar-op-tools { display: inline-flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
.oar-root .oar-op-tools .oar-pill { height: 26px; font-size: 11.5px; }
.oar-root .oar-secs { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.oar-root .oar-secs em { font-size: 11px; font-style: normal; color: var(--text-muted); }
.oar-root .oar-sec { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: var(--radius-pill); background: var(--blue-50); font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--blue-700); }
.oar-root .oar-sec.oar-nosec { background: var(--neutral-100); font-family: var(--font-sans); color: var(--neutral-600); }
.oar-root .oar-sec-sc { font-weight: 400; color: var(--blue-600); opacity: .85; }
.oar-root .oar-dep-note { display: flex; align-items: flex-start; gap: 7px; margin: 0 0 14px; padding: 8px 12px; border-radius: var(--radius-md); background: var(--neutral-100); font-size: 12.5px; line-height: 1.7; color: var(--neutral-700); }
.oar-root .oar-dep-note svg { flex: none; margin-top: 4px; color: var(--neutral-500); }
.oar-root .oar-dep-note code { font-size: 12px; }
.oar-root .oar-pgroup { margin: 0 0 14px; }
.oar-root .oar-pgroup-h { display: flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 12px; font-weight: 700; color: var(--neutral-700); }
.oar-root .oar-ptable { table-layout: fixed; }
.oar-root .oar-ptable .oar-cname { white-space: normal; word-break: break-all; }
.oar-root .oar-ptable tr.oar-dep td { color: var(--neutral-400); }
.oar-root .oar-ptable tr.oar-dep .oar-cname { color: var(--neutral-400); text-decoration: line-through; }
.oar-root .oar-ptable tr.oar-flash td { animation: oar-flash 1.2s var(--ease-out); }
@keyframes oar-flash { from { background: var(--orange-100); } to { background: transparent; } }
.oar-root .oar-ptable .oar-flag { margin-left: 6px; }
.oar-root .oar-tcell { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.oar-root .oar-ex { padding: 1px 5px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 11.5px; color: var(--neutral-800); word-break: break-all; }
.oar-root .oar-pdesc { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; padding-top: 4px; }
.oar-root .oar-media-bar { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 11.5px; color: var(--text-muted); }
.oar-root .oar-media-l { white-space: nowrap; }
.oar-root .oar-split { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); align-items: start; gap: 14px; }
.oar-root .oar-shell--page .oar-split-r { position: sticky; top: 56px; }
.oar-root .oar-st-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.oar-root .oar-resp { padding: 12px 14px 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.oar-root .oar-resp-h { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin: 0 0 12px; }
.oar-root .oar-resp-d { font-size: 13px; color: var(--text-body); }
.oar-root .oar-resp-ct { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
.oar-root .oar-media-n { font-size: 11px; color: var(--text-muted); }
.oar-root .oar-rh { margin: 0 0 12px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
.oar-root .oar-rh-t { padding: 5px 12px; background: var(--surface-page); font-size: 11px; font-weight: 700; color: var(--text-muted); }
.oar-root .oar-rh-r { display: grid; grid-template-columns: minmax(130px, auto) auto minmax(0, 1fr); align-items: center; gap: 10px; padding: 6px 12px; border-top: 1px solid var(--border-subtle); font-size: 12.5px; }
.oar-root .oar-nobody { margin: 0; font-size: 12.5px; color: var(--text-muted); }

/* ── 欄位樹 ───────────────────────────────────────────── */
.oar-root .oar-tree { min-width: 0; padding: 6px 0; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--surface-card); }
.oar-root .oar-tree.oar-flat { padding: 0; border: 0; }
.oar-root .oar-tree-root, .oar-root .oar-tree-crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 4px; padding: 4px 12px 8px; border-bottom: 1px solid var(--border-subtle); font-size: 11.5px; color: var(--text-muted); }
.oar-root .oar-tree.oar-flat .oar-tree-root, .oar-root .oar-tree.oar-flat .oar-tree-crumb { padding-left: 0; }
.oar-root .oar-tree-root-n { margin-left: auto; }
.oar-root .oar-tree-crumb button { padding: 0; border: 0; background: none; font-family: var(--font-mono); font-size: 11.5px; color: var(--blue-700); cursor: pointer; }
.oar-root .oar-tree-crumb button:hover { text-decoration: underline; }
.oar-root .oar-tree-crumb b { font-family: var(--font-mono); color: var(--text-strong); }
.oar-root .oar-tree-crumb .oar-tree-back { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: var(--radius-md); background: var(--neutral-100); }
.oar-root .oar-tree-crumb .oar-tree-back:hover { text-decoration: none; }
.oar-root .oar-tree-prim { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 4px 12px; }
.oar-root .oar-tree.oar-flat .oar-tree-prim { padding-left: 0; }
.oar-root .oar-f { padding: 0 12px 0 6px; }
.oar-root .oar-tree.oar-flat .oar-f, .oar-root .oar-combo-b .oar-f { padding-left: 0; }
.oar-root .oar-f-l { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; min-height: 28px; }
.oar-root .oar-fcaret, .oar-root .oar-fcaret-sp { flex: none; width: 18px; height: 20px; }
.oar-root .oar-fcaret { display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: var(--radius-sm); background: none; color: var(--text-muted); cursor: pointer; }
.oar-root .oar-fcaret:hover { background: var(--neutral-100); color: var(--blue-700); }
.oar-root .oar-fcaret svg { transition: transform var(--duration-fast) var(--ease-out); }
.oar-root .oar-fcaret.oar-open svg { transform: rotate(90deg); }
.oar-root .oar-f-n { font-size: 12.5px; font-weight: 600; color: var(--text-strong); }
.oar-root .oar-f.oar-dep .oar-f-n.oar-f-own { color: var(--neutral-400); text-decoration: line-through; }
.oar-root .oar-f.oar-dep .oar-f-d.oar-f-own { opacity: .7; }
.oar-root .oar-f-via { font-size: 10.5px; color: var(--text-muted); }
.oar-root .oar-f-d { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; padding: 0 0 6px 24px; font-size: 12px; line-height: 1.65; color: var(--text-body); }
.oar-root .oar-f-kids { margin-left: 14px; padding-left: 4px; border-left: 1px solid var(--border-subtle); }
.oar-root .oar-f-note { display: flex; align-items: center; gap: 5px; padding: 4px 8px 6px 24px; font-size: 11.5px; color: var(--text-muted); }
.oar-root .oar-dive { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 8px; border: 1px dashed var(--blue-300); border-radius: var(--radius-pill); background: var(--blue-50); font: inherit; font-size: 11px; font-weight: 600; color: var(--blue-700); cursor: pointer; }
.oar-root .oar-dive:hover { border-style: solid; }
.oar-root .oar-allof { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin: 0 12px 4px; padding: 4px 8px; border-radius: var(--radius-md); background: var(--blue-50); font-size: 11.5px; color: var(--blue-800); }
.oar-root .oar-allof code { font-size: 11px; font-weight: 600; }
.oar-root .oar-combo { margin: 2px 0 6px 24px; overflow: hidden; border: 1px solid var(--blue-100); border-radius: var(--radius-md); }
.oar-root .oar-combo-h { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; padding: 6px 8px; background: var(--blue-50); font-size: 11.5px; color: var(--blue-800); }
.oar-root .oar-combo-m { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-weight: 700; }
.oar-root .oar-combo-h code { font-size: 11px; }
.oar-root .oar-combo-h .oar-seg { margin-left: auto; background: color-mix(in srgb, var(--surface-card) 70%, transparent); }
.oar-root .oar-combo-b { padding: 4px 0; }
.oar-root .oar-combo-ref { display: flex; align-items: center; gap: 6px; padding: 2px 10px 4px; font-size: 11.5px; color: var(--text-muted); }

/* ── embed ────────────────────────────────────────────── */
.oar-root .oar-embed { font-size: 13px; line-height: 1.5; }
.oar-root .oar-embed-err { display: flex; align-items: center; gap: 8px; padding: 16px 18px; font-size: 12.5px; color: var(--text-body); }
.oar-root .oar-embed-err svg { flex: none; color: var(--danger-500); }
.oar-root .oar-embed-err code { padding: 1px 5px; border-radius: var(--radius-sm); background: var(--neutral-100); font-size: 12px; }
.oar-root .oar-card { padding: 16px 18px 6px; }
.oar-root .oar-card-hd { display: flex; align-items: flex-start; gap: 10px; }
.oar-root .oar-card-path { min-width: 0; font-size: 15px; font-weight: 700; line-height: 1.45; }
.oar-root .oar-card-sum { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 6px 0 6px; font-size: 13.5px; font-weight: 600; color: var(--neutral-800); }
.oar-root .oar-card-sec { margin-left: auto; }
.oar-root .oar-card-id { margin: 0 0 12px; font-size: 11.5px; color: var(--text-muted); }
.oar-root .oar-card-id code { margin-left: 3px; color: var(--blue-700); }
.oar-root .oar-card-b { padding: 10px 0; border-top: 1px solid var(--border-subtle); }
.oar-root .oar-card-t { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 12px; font-weight: 700; color: var(--neutral-700); }
.oar-root .oar-card-rd { font-weight: 400; color: var(--text-body); }
.oar-root .oar-ct { font-size: 11px; font-weight: 400; color: var(--text-muted); }
.oar-root .oar-card-params { display: flex; flex-direction: column; }
.oar-root .oar-card-pr { display: grid; grid-template-columns: minmax(110px, auto) 52px auto 52px minmax(0, 1fr); align-items: center; gap: 8px; min-height: 28px; font-size: 12px; }
.oar-root .oar-in { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted); }
.oar-root .oar-card-pd { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); }
.oar-root .oar-card-others { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; font-size: 11.5px; color: var(--text-muted); }
.oar-root .oar-card-others .oar-st { height: 20px; font-size: 11px; }
.oar-root .oar-mini { padding: 14px 18px 16px; }
.oar-root .oar-mini-hd { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 15px; color: var(--text-strong); }
.oar-root .oar-mini-hd .oar-muted { font-family: var(--font-mono); font-size: 11.5px; }
.oar-root .oar-mini-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 6px 0 12px; font-size: 12px; color: var(--text-muted); }
.oar-root .oar-mini-meta b { color: var(--text-strong); }
.oar-root .oar-mini-tags { overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
.oar-root .oar-mini-tag { display: grid; grid-template-columns: minmax(90px, auto) minmax(0, 1fr) 90px 28px; align-items: center; gap: 12px; width: 100%; min-height: 34px; padding: 0 12px; border-top: 1px solid var(--border-subtle); background: var(--surface-card); font-size: 12.5px; color: inherit; text-decoration: none; }
.oar-root .oar-mini-tag.oar-first { border-top: 0; }
.oar-root .oar-mini-tag:hover { background: var(--blue-50); }
.oar-root .oar-mini-tag code { font-weight: 600; color: var(--blue-700); }
.oar-root .oar-mini-d { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); }
.oar-root .oar-mini-bar { height: 5px; overflow: hidden; border-radius: 999px; background: var(--neutral-100); }
.oar-root .oar-mini-bar i { display: block; height: 100%; background: var(--blue-400); }
.oar-root .oar-mini-tag b { color: var(--text-strong); text-align: right; }
.oar-root .oar-mini-more { margin-top: 8px; font-size: 12px; color: var(--text-muted); }

/* ── 響應式：一律依外殼寬度（container），不看視窗 ───────── */
@container oar (max-width: 1100px) {
  .oar-root .oar-split { grid-template-columns: minmax(0, 1fr); }
  .oar-root .oar-shell--page .oar-split-r { position: static; }
}
@container oar (max-width: 760px) {
  .oar-root .oar-nav { position: absolute; top: 0; left: 0; bottom: 0; z-index: 7; box-shadow: var(--shadow-lg); }
  .oar-root .oar-shell--page .oar-nav { position: absolute; top: 0; bottom: auto; height: min(100%, calc(var(--oar-scroll-h, 100dvh) - 44px)); max-height: none; background: var(--surface-page); }
  .oar-root .oar-shell--page.oar-shell--nav .oar-body { background: none; }
  .oar-root .oar-page { padding: 20px 18px 40px; }
  .oar-root .oar-meta-src { margin-left: 0; }
  .oar-root .oar-tagt-h, .oar-root .oar-tagt-r { grid-template-columns: minmax(90px, 1fr) 70px minmax(0, 1.2fr); }
  .oar-root .oar-tagt-h span:nth-child(2), .oar-root .oar-tagt-d { display: none; }
  .oar-root .oar-oplist-r { grid-template-columns: 44px minmax(0, 1fr) auto; }
  .oar-root .oar-oplist-s { display: none; }
}
@container oar (max-width: 520px) {
  .oar-root .oar-bar { gap: 8px; padding: 0 8px; }
  .oar-root .oar-bar-crumb { display: none; }
  .oar-root .oar-toast { margin-left: auto; }
  .oar-root .oar-ptable, .oar-root .oar-ptable tbody { display: block; }
  .oar-root .oar-ptable thead, .oar-root .oar-ptable colgroup { display: none; }
  .oar-root .oar-ptable tr { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 2px 8px; padding: 8px 10px; border-top: 1px solid var(--border-subtle); }
  .oar-root .oar-ptable tbody tr:first-child { border-top: 0; }
  .oar-root .oar-ptable td { padding: 0; border: 0; }
  .oar-root .oar-ptable td.oar-td-desc { grid-column: 1 / -1; }
  .oar-root .oar-ptable td.oar-td-ex { display: none; }
  .oar-root .oar-card-pr { grid-template-columns: minmax(0, 1fr) auto auto; }
  .oar-root .oar-card-pr .oar-in, .oar-root .oar-card-pd { display: none; }
  .oar-root .oar-mini-tag { grid-template-columns: minmax(0, 1fr) 60px 28px; }
  .oar-root .oar-mini-d { display: none; }
  .oar-root .oar-kv-r, .oar-root .oar-kv-r.oar-kv3, .oar-root .oar-kv-r.oar-kv-sec { grid-template-columns: minmax(0, 1fr); gap: 4px; }
}
@media (hover: none) {
  .oar-root .oar-tip { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .oar-root .oar-caret svg, .oar-root .oar-fcaret svg { transition: none; }
  .oar-root .oar-pill:active { transform: none; }
  .oar-root .oar-ptable tr.oar-flash td, .oar-root .oar-toast { animation: none; }
}
`

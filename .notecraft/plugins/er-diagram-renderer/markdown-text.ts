/* ER Diagram Renderer —— 迷你 Markdown：解析、連結判定、純文字模式
 *
 * Wiki 內文（meta／schemas／groups／tables 的 description）只支援 8 種語法：
 * `##`、`###`、段落、`-` 清單、`1.` 清單、`>` 引言、`**粗體**`、`` `code` ``、`[文字](url)`。
 * `#` 視同 `##`（否則整行會卡在段落判定外）。其餘一律當文字 —— HTML 標籤也是，由 React 跳脫。
 *
 * 不引入 Markdown 函式庫、不輸出 HTML 字串：解析成 token，由 markdown.tsx 轉成 React 元素。
 *
 * 本檔無 JSX、只有 `import type`：scripts/checks 以 Node strip-types 直接載入它。
 * app 端 src/lib/strip-markdown.ts 另有一份純文字實作（app 不能 import plugin），
 * 兩者輸出由 scripts/checks/app-strip-markdown.mjs 對照，改這裡的純文字規則時兩邊要一起改。
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; v: string }
  | { t: 'code'; v: string }
  | { t: 'link'; text: string; href: string; external: boolean }

export type Block =
  | { type: 'h3' | 'h4' | 'p' | 'quote'; inline: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] }

const HEADING = /^(#{1,6})\s+/
const QUOTE = /^>\s?/
const LIST = /^(-|\d+\.)\s+/
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\))/g

/** 連結只接受 http(s)、mailto、單一 / 開頭的站內路徑、# 錨點；其餘回 null（整段當純文字）。
 *  React 對 `javascript:` href 只警告不擋，這一關不能省。 */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  /* 去掉空白與控制字元再判定，擋掉 `java\tscript:` 這類繞法 */
  // eslint-disable-next-line no-control-regex
  const url = raw.replace(/[\u0000- \u007f]/g, '')
  const lower = url.toLowerCase()
  if (/^(https?:|mailto:)/.test(lower)) return { href: url, external: true }
  if (/^\/(?!\/)/.test(url)) return { href: url, external: false }
  if (url.startsWith('#')) return { href: url, external: false }
  return null
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0]
    const at = m.index ?? 0
    if (at > last) out.push({ t: 'text', v: text.slice(last, at) })
    if (tok.startsWith('**')) out.push({ t: 'strong', v: tok.slice(2, -2) })
    else if (tok.startsWith('`')) out.push({ t: 'code', v: tok.slice(1, -1) })
    else {
      const mm = /^\[([^\]]+)\]\(([^)]*)\)$/.exec(tok)
      const safe = mm ? safeHref(mm[2]) : null
      if (mm && safe) out.push({ t: 'link', text: mm[1], href: safe.href, external: safe.external })
      else out.push({ t: 'text', v: tok })
    }
    last = at + tok.length
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
  return out
}

export function parseMarkdown(src: string | undefined): Block[] {
  if (!src) return []
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) {
      i++
      continue
    }
    const h = HEADING.exec(l)
    if (h) {
      blocks.push({ type: h[1].length >= 3 ? 'h4' : 'h3', inline: parseInline(l.slice(h[0].length).trim()) })
      i++
      continue
    }
    if (QUOTE.test(l)) {
      const q: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) q.push(lines[i++].replace(QUOTE, ''))
      blocks.push({ type: 'quote', inline: parseInline(q.join(' ').trim()) })
      continue
    }
    const li = LIST.exec(l)
    if (li) {
      const ordered = li[1] !== '-'
      const items: Inline[][] = []
      while (i < lines.length) {
        const m = LIST.exec(lines[i])
        if (!m || (m[1] !== '-') === !ordered) break
        items.push(parseInline(lines[i++].slice(m[0].length).trim()))
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items })
      continue
    }
    const p: string[] = []
    while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !QUOTE.test(lines[i]) && !LIST.test(lines[i])) {
      p.push(lines[i++].trim())
    }
    blocks.push({ type: 'p', inline: parseInline(p.join(' ')) })
  }
  return blocks
}

export interface LinkTargets {
  tables: Set<string>
  schemas: Set<string>
}

export type CodeLink = { kind: 'table' | 'schema'; key: string; display: string }

const PREFIXED = /^(table|schema):(\S+)$/

/** 反引號內容 → 自動連結目標。
 *  無前綴：表名優先，其次 schema key；`table:x`／`schema:x` 明確指定，找不到回 null（呼叫端保留原字串）。 */
export function resolveCodeLink(code: string, targets: LinkTargets): CodeLink | null {
  const m = PREFIXED.exec(code)
  if (m) {
    const [, kind, key] = m
    if (kind === 'table') return !key.includes('.') && targets.tables.has(key) ? { kind: 'table', key, display: key } : null
    return targets.schemas.has(key) ? { kind: 'schema', key, display: key } : null
  }
  if (targets.tables.has(code)) return { kind: 'table', key: code, display: code }
  if (targets.schemas.has(code)) return { kind: 'schema', key: code, display: code }
  return null
}

/* ── 純文字模式 ───────────────────────────────────────── */

const stripCodePrefix = (v: string) => v.replace(/^(table|schema):(?=\S)/, '')

function inlineText(text: string): string {
  return (
    parseInline(text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1'))
      .map((x) => {
        if (x.t === 'code') return stripCodePrefix(x.v)
        if (x.t === 'link') return x.text
        if (x.t === 'text') return x.v.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        return x.v
      })
      .join('')
      /* HTML 標籤不渲染也不該出現在摘要裡 */
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
  )
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Markdown → 單行純文字。
 *  first：第一個非標題區塊（卡片摘要、表格說明欄）；all：全文，區塊以空白分隔。
 *  反引號內的 table:／schema: 前綴一律去掉 —— 純文字模式不知道目標存不存在。 */
export function stripMarkdown(src: string | undefined, mode: 'first' | 'all'): string {
  if (!src) return ''
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  /* 以原始行分區塊（而非重用 parseMarkdown 的 token），行內再各自攤平 */
  const blocks: { heading: boolean; text: string }[] = []
  let cur: string[] = []
  let curKind = ''
  const flush = () => {
    if (cur.length) blocks.push({ heading: false, text: squash(cur.join(' ')) })
    cur = []
  }
  for (const raw of lines) {
    const l = raw.trim()
    if (!l) {
      flush()
      continue
    }
    if (HEADING.test(l)) {
      flush()
      blocks.push({ heading: true, text: squash(inlineText(l.replace(HEADING, ''))) })
      continue
    }
    /* 段落、引言、清單之間即使沒有空行也是不同區塊（與 parseMarkdown 的切法一致） */
    const kind = QUOTE.test(l) ? 'quote' : LIST.test(l) ? 'list' : 'p'
    if (kind !== curKind) flush()
    curKind = kind
    cur.push(inlineText(l.replace(QUOTE, '').replace(LIST, '')))
  }
  flush()
  const nonEmpty = blocks.filter((b) => b.text)
  if (mode === 'all') return squash(nonEmpty.map((b) => b.text).join(' '))
  return (nonEmpty.find((b) => !b.heading) ?? nonEmpty[0])?.text ?? ''
}

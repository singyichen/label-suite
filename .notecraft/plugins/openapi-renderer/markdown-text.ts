/* OpenAPI Renderer —— 迷你 Markdown：解析與連結判定
 *
 * 自 er-diagram-renderer/markdown-text.ts 複製通用部分（parseInline、parseMarkdown、safeHref）。
 * 兩個 plugin 各自安裝、不能互相 import，所以各持一份；行為是否一致由
 * scripts/checks/oar-markdown.mjs 拿同一組輸入對照。改這裡時 ER 那份要一起改（反之亦然）。
 * ER 專用的 resolveCodeLink（認表名）與 stripMarkdown 不複製。
 *
 * 支援：`##`、`###`、段落、`-` 清單、`1.` 清單、`>` 引言、`**粗體**`、`` `code` ``、`[文字](url)`。
 * 其餘一律當文字 —— HTML 標籤也是，由 React 跳脫。
 *
 * 本檔無 JSX、無 import：scripts/checks 以 Node strip-types 直接載入。
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

/* OpenAPI Renderer —— 迷你 Markdown 的 React 輸出
 *
 * 解析在 markdown-text.ts；這裡只把 token 轉成元素。全部走 React 的文字節點，
 * 不注入 HTML 字串（install lint 也會擋）—— spec 裡的 HTML 標籤會原樣顯示成文字。
 */

import type { ReactNode } from 'react'
import { parseInline, parseMarkdown } from './markdown-text'
import type { Inline } from './markdown-text'

function renderInline(parts: Inline[]): ReactNode[] {
  return parts.map((p, i) => {
    if (p.t === 'text') return p.v
    if (p.t === 'strong') return <strong key={i}>{p.v}</strong>
    if (p.t === 'code') return <code key={i}>{p.v}</code>
    return p.external ? (
      <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
        {p.text}
      </a>
    ) : (
      <a key={i} href={p.href}>
        {p.text}
      </a>
    )
  })
}

/** 區塊 Markdown（info／tag／operation／schema 的 description） */
export function Md({ src, className }: { src: string | undefined; className?: string }) {
  const blocks = parseMarkdown(src)
  if (!blocks.length) return null
  return (
    <div className={`oar-md${className ? ` ${className}` : ''}`}>
      {blocks.map((b, k) => {
        switch (b.type) {
          case 'h3':
            return <h3 key={k}>{renderInline(b.inline)}</h3>
          case 'h4':
            return <h4 key={k}>{renderInline(b.inline)}</h4>
          case 'quote':
            return <blockquote key={k}>{renderInline(b.inline)}</blockquote>
          case 'p':
            return <p key={k}>{renderInline(b.inline)}</p>
          case 'ul':
            return (
              <ul key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

/** 行內 Markdown（欄位、參數、回應的 description）：換行合併成一行 */
export function MdInline({ text }: { text: string | undefined }) {
  if (!text) return null
  return <span className="oar-inl">{renderInline(parseInline(text.replace(/\s*\n\s*/g, ' ')))}</span>
}

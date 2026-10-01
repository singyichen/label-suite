/* ER Diagram Renderer —— 迷你 Markdown 的 React 輸出
 *
 * 解析在 markdown-text.ts；這裡只把 token 轉成元素。全部走 React 的文字節點，
 * 不直接注入 HTML 字串（install lint 也會擋）—— 資料檔裡的 HTML 標籤會被原樣顯示成文字。
 */

import type { ReactNode } from 'react'
import { parseMarkdown, resolveCodeLink } from './markdown-text'
import type { Inline, LinkTargets } from './markdown-text'
import type { Route } from './types'

export interface ErMarkdownProps {
  src: string | undefined
  targets: LinkTargets
  onLink: (route: Route) => void
  className?: string
}

function renderInline(parts: Inline[], targets: LinkTargets, onLink: (r: Route) => void): ReactNode[] {
  return parts.map((p, i) => {
    if (p.t === 'text') return p.v
    if (p.t === 'strong') return <strong key={i}>{p.v}</strong>
    if (p.t === 'link') {
      return p.external ? (
        <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
          {p.text}
        </a>
      ) : (
        <a key={i} href={p.href}>
          {p.text}
        </a>
      )
    }
    const link = resolveCodeLink(p.v, targets)
    if (!link) return <code key={i}>{p.v}</code>
    /* href 讓中鍵、複製連結有東西可拿；實際換頁走 onLink（Wiki 是元件內路由，不是網址） */
    return (
      <a
        key={i}
        className="erd-root erd-tlink"
        href={`#${link.kind}:${link.key}`}
        onClick={(ev) => {
          ev.preventDefault()
          onLink({ kind: link.kind, key: link.key })
        }}
      >
        <code>{link.display}</code>
      </a>
    )
  })
}

export function ErMarkdown({ src, targets, onLink, className }: ErMarkdownProps) {
  const blocks = parseMarkdown(src)
  if (!blocks.length) return null
  const inl = (parts: Inline[]) => renderInline(parts, targets, onLink)
  return (
    <div className={`erd-root erd-md${className ? ` ${className}` : ''}`}>
      {blocks.map((b, k) => {
        switch (b.type) {
          case 'h3':
            return <h3 key={k}>{inl(b.inline)}</h3>
          case 'h4':
            return <h4 key={k}>{inl(b.inline)}</h4>
          case 'quote':
            return <blockquote key={k}>{inl(b.inline)}</blockquote>
          case 'p':
            return <p key={k}>{inl(b.inline)}</p>
          case 'ul':
            return (
              <ul key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{inl(it)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{inl(it)}</li>
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

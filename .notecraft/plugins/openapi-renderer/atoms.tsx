/* OpenAPI Renderer —— 原子元件
 *
 * method 標記、status、path、型別 chip、複製按鈕、程式碼框、JSON 上色、分段切換、空狀態。
 * 連結一律透過 LinkCtx：page 模式是元件內路由（hash），embed 是指向文件頁的真連結。
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { ArrowUpRight, Check, Copy, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { KNOWN_METHODS, READ_METHODS, isLocalRef, refName, schemaType, statusTone } from './derive'
import type { Route, Schema } from './types'

/* ── 連結 ─────────────────────────────────────────────── */

export interface LinkApi {
  /** 連結的 href（page：`#op/x`；embed：`/view/…#op/x`） */
  href: (r: Route) => string
  /** 有值時攔下點擊、改走元件內路由；embed 沒有，讓瀏覽器真的換頁 */
  go?: (r: Route) => void
}

export const LinkCtx = createContext<LinkApi>({ href: () => '#' })

export function useLink() {
  const api = useContext(LinkCtx)
  return useCallback(
    (r: Route) => ({
      href: api.href(r),
      onClick: (ev: ReactMouseEvent) => {
        if (!api.go || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return
        ev.preventDefault()
        ev.stopPropagation()
        api.go(r)
      },
    }),
    [api],
  )
}

/* ── method、status、path ───────────────────────────── */

export function Method({ m, size }: { m: string; size?: 'lg' }) {
  const known = KNOWN_METHODS.has(m) ? m : 'other'
  const read = READ_METHODS.has(m)
  const full = m.toUpperCase()
  return (
    <span
      className={`oar-m oar-m--${known}${read ? ' oar-read' : ''}${size ? ` oar-m--${size}` : ''}`}
      title={read ? '唯讀方法' : '會改變資料的方法'}
      aria-label={full}
      role="img"
    >
      {m === 'delete' && size !== 'lg' ? 'DEL' : full}
    </span>
  )
}

export function Status({ code, on, onClick }: { code: string; on?: boolean; onClick?: () => void }) {
  const cls = `oar-st oar-st--${statusTone(code)}${on ? ' oar-on' : ''}`
  if (onClick) {
    return (
      <button type="button" role="tab" aria-selected={!!on} className={cls} onClick={onClick}>
        <i aria-hidden />
        {code}
      </button>
    )
  }
  return (
    <span className={cls}>
      <i aria-hidden />
      {code}
    </span>
  )
}

/** path：{param} 上色；wrap 時每個 / 後可換行；onParam 時 {param} 是按鈕 */
export function PathText({ path, display, wrap, onParam }: { path: string; display?: string; wrap?: boolean; onParam?: (name: string) => void }) {
  const shown = display ?? path
  const parts = shown.split(/(\{[^}]+\})/)
  return (
    <span className={`oar-path${wrap ? ' oar-wrap' : ''}`} title={shown !== path ? path : undefined}>
      {parts.map((p, i) => {
        if (p.startsWith('{') && p.endsWith('}')) {
          const name = p.slice(1, -1)
          return onParam ? (
            <button type="button" key={i} className="oar-pp" onClick={() => onParam(name)} title={`捲到參數 ${name}`}>
              {p}
            </button>
          ) : (
            <span key={i} className="oar-pp">
              {p}
            </span>
          )
        }
        if (!wrap) return p
        return p.split(/(\/)/).map((x, j) =>
          x === '/' ? (
            <span key={`${i}-${j}`}>
              <wbr />/
            </span>
          ) : (
            x
          ),
        )
      })}
    </span>
  )
}

/* ── 型別 ─────────────────────────────────────────────── */

function RefLink({ name, arr }: { name: string; arr?: boolean }) {
  const link = useLink()
  return (
    <a className="oar-tref" title={`前往 Schema ${name}`} {...link({ kind: 'schema', key: name })}>
      <code>
        {name}
        {arr ? '[]' : ''}
      </code>
      <ArrowUpRight size={10} aria-hidden />
    </a>
  )
}

/** 型別 chip：$ref 可點；外部 ref 顯示原字串 */
export function TypeLabel({ f }: { f: Schema | undefined }) {
  if (!f) return <code className="oar-type">any</code>
  if (f.$ref) return isLocalRef(f.$ref) ? <RefLink name={refName(f.$ref)} /> : <code className="oar-type">{f.$ref}</code>
  const t = schemaType(f)
  if (t === 'array') {
    const it = f.items ?? {}
    if (it.$ref) return isLocalRef(it.$ref) ? <RefLink name={refName(it.$ref)} arr /> : <code className="oar-type">{it.$ref}[]</code>
    return <code className="oar-type">{schemaType(it) ?? (it.oneOf ? 'oneOf' : it.anyOf ? 'anyOf' : 'any')}[]</code>
  }
  if (f.oneOf || f.anyOf) return <code className="oar-type oar-combo-t">{f.oneOf ? 'oneOf' : 'anyOf'}</code>
  if (f.allOf) {
    const only = f.allOf.length === 1 ? f.allOf[0].$ref : undefined
    return only && isLocalRef(only) ? <RefLink name={refName(only)} /> : <code className="oar-type oar-combo-t">allOf</code>
  }
  if (t === 'object' && !f.properties && f.additionalProperties && typeof f.additionalProperties === 'object') {
    const ap = f.additionalProperties
    return <code className="oar-type">{`map<string, ${ap.$ref ? refName(ap.$ref) : schemaType(ap) ?? 'any'}>`}</code>
  }
  return <code className="oar-type">{t ?? 'any'}</code>
}

export function Enum({ values, max = 8 }: { values: unknown[] | undefined; max?: number }) {
  if (!values || !values.length) return null
  return (
    <span className="oar-enum">
      <em>enum</em>
      {values.slice(0, max).map((v, i) => (
        <code key={i}>{JSON.stringify(v)}</code>
      ))}
      {values.length > max ? <span>+{values.length - max}</span> : null}
    </span>
  )
}

export function Required({ on }: { on: boolean }) {
  return on ? (
    <span className="oar-req">
      <i aria-hidden />
      必填
    </span>
  ) : (
    <span className="oar-na">選填</span>
  )
}

/* ── 複製 ─────────────────────────────────────────────── */

function copyText(text: string): void {
  const fallback = () => {
    const t = document.createElement('textarea')
    t.value = text
    t.style.position = 'fixed'
    t.style.opacity = '0'
    document.body.appendChild(t)
    t.select()
    try {
      document.execCommand('copy')
    } catch {
      /* 兩條路都失敗就算了：按鈕仍會顯示已複製，但這在現代瀏覽器幾乎不會發生 */
    }
    t.remove()
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback)
  else fallback()
}

export function CopyButton({
  text,
  label = '複製',
  icon: Icon = Copy,
  className = 'oar-copy',
}: {
  text: string | (() => string)
  label?: string
  icon?: LucideIcon
  className?: string
}) {
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className={`${className}${done ? ' oar-done' : ''}`}
      onClick={(ev) => {
        ev.stopPropagation()
        copyText(typeof text === 'function' ? text() : text)
        setDone(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setDone(false), 1600)
      }}
      aria-live="polite"
    >
      {done ? <Check size={12} aria-hidden /> : <Icon size={12} aria-hidden />}
      {done ? '已複製' : label}
    </button>
  )
}

/* ── 程式碼 ───────────────────────────────────────────── */

export function CodeBox({ title, tools, copy, children, foot }: { title: ReactNode; tools?: ReactNode; copy?: string | null; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="oar-code">
      <div className="oar-code-h">
        <span className="oar-code-t">{title}</span>
        <span className="oar-code-sp" />
        {tools}
        {copy != null ? <CopyButton text={copy} /> : null}
      </div>
      {children}
      {foot ? <div className="oar-code-f">{foot}</div> : null}
    </div>
  )
}

const JSON_TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

/** JSON 上色：自寫 tokenizer 輸出 React 元素（不注入 HTML） */
export function JsonView({ value, maxH }: { value: unknown; maxH?: number }) {
  const src = value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  const out: ReactNode[] = []
  if (typeof value === 'string') out.push(src)
  else {
    let last = 0
    let k = 0
    for (const m of src.matchAll(JSON_TOKEN)) {
      const at = m.index ?? 0
      if (at > last) out.push(src.slice(last, at))
      const t = m[0]
      if (t.startsWith('"')) {
        if (/:\s*$/.test(t)) {
          const key = t.replace(/\s*:\s*$/, '')
          out.push(
            <span key={k++} className="oar-j-k">
              {key}
            </span>,
            t.slice(key.length),
          )
        } else
          out.push(
            <span key={k++} className="oar-j-s">
              {t}
            </span>,
          )
      } else
        out.push(
          <span key={k++} className={/^(true|false|null)$/.test(t) ? 'oar-j-l' : 'oar-j-n'}>
            {t}
          </span>,
        )
      last = at + t.length
    }
    out.push(src.slice(last))
  }
  return (
    <pre className="oar-pre" style={maxH ? { maxHeight: maxH } : undefined}>
      <code>{out}</code>
    </pre>
  )
}

/** cURL／fetch：`<…>` 佔位上色 */
export function SnippetView({ text }: { text: string }) {
  return (
    <pre className="oar-pre oar-sh">
      <code>
        {text.split(/(<[^>\s]+>)/).map((p, i) =>
          /^<[^>\s]+>$/.test(p) ? (
            <span key={i} className="oar-ph">
              {p}
            </span>
          ) : (
            p
          ),
        )}
      </code>
    </pre>
  )
}

/* ── 分段切換（tablist，左右方向鍵）──────────────────── */

export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  mono,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  mono?: boolean
  label?: string
}) {
  if (options.length < 2) {
    return options.length ? <span className={`oar-seg-one${mono ? ' oar-mono' : ''}`}>{options[0].label}</span> : null
  }
  const onKey = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return
    ev.preventDefault()
    const i = options.findIndex((o) => o.value === value)
    const j = (i + (ev.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length
    onChange(options[j].value)
    ev.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[j]?.focus()
  }
  return (
    <div className={`oar-seg${mono ? ' oar-mono' : ''}`} role="tablist" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => (
        <button
          type="button"
          role="tab"
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          key={String(o.value)}
          className={o.value === value ? 'oar-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── 標題與空狀態 ─────────────────────────────────────── */

export function H2({ sec, count, extra, children }: { sec?: string; count?: number | null; extra?: ReactNode; children: ReactNode }) {
  return (
    <h2 className="oar-h2" data-sec={sec}>
      {children}
      {count != null ? <span className="oar-h2-n">{count}</span> : null}
      {extra ? <span className="oar-h2-x">{extra}</span> : null}
    </h2>
  )
}

/** 空狀態：告訴作者去 spec 哪個欄位補 */
export function Missing({ field, what }: { field: string; what: string }) {
  return (
    <p className="oar-missing">
      <Info size={13} aria-hidden />
      <span>
        {what}。在 spec 的 <code>{field}</code> 以 Markdown 補上，下次 build 就會出現在這裡。
      </span>
    </p>
  )
}

export function MethodCounts({ ops }: { ops: { method: string }[] }) {
  const counts = new Map<string, number>()
  for (const o of ops) counts.set(o.method, (counts.get(o.method) ?? 0) + 1)
  return (
    <span className="oar-mcounts">
      {['get', 'post', 'put', 'patch', 'delete', 'query', 'head', 'options', 'trace']
        .filter((m) => counts.has(m))
        .map((m) => (
          <span key={m} className="oar-mcount">
            <Method m={m} />
            <b className="oar-tnum">{counts.get(m)}</b>
          </span>
        ))}
    </span>
  )
}

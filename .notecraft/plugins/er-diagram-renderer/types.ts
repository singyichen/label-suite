/* ER Diagram Renderer —— 型別與常數
 *
 * 只放型別與純值常數，不 import 任何 runtime 模組：
 * scripts/checks 以 Node 的 strip-types 直接載入 derive.ts，它對這裡只能有 `import type`。
 */

/* props 的型別在這裡自帶一份，不從 `@notes/plugins/_types` import。
 * 理由：官方 plugin 同時要能在主 repo（CI 驗證用）與使用者專案裡 build，
 * 而 `@notes` 在兩處指向不同的根。TypeScript 是結構型別，自帶一份不影響相容性。
 * 偏好共用型別的 plugin 作者仍可改寫成 `import type { PluginRendererProps } from '@notes/plugins/_types'`。
 */
export interface PluginRendererProps<T> {
  data: T
  file: { path: string; name: string; updatedAt: string }
  options: Record<string, unknown>
  mode: 'page' | 'embed'
}

/* ── 資料型別 ─────────────────────────────────────────── */

/** 徽章可以掛在哪些欄位屬性上。fk 是字串（父表名），其餘是 boolean，兩者都以 truthy 判定。 */
type ErFlagKey = 'pk' | 'fk' | 'unique' | 'index'

export interface ErColumn {
  name: string
  type: string
  /** 對應 data.requirement[].key */
  required: string
  default?: string
  note?: string
  /** 父表名；有值即為外鍵 */
  fk?: string
  pk?: boolean
  unique?: boolean
  index?: boolean
  /** 對應 data.derivations[].key */
  derivation?: string
  /** 個資標示。目前渲染器不用，保留讓資料先記著 */
  pii?: boolean
}

export interface ErTable {
  name: string
  label: string
  /** 章節編號，顯示在卡片右上 */
  section?: string
  /** 對應 data.groups[].key */
  group: string
  columns: ErColumn[]
  /** Table Wiki 頁的表說明（Markdown）。v1.2 */
  description?: string
}

/** 導覽第一層。v1.2；沒有時所有 group 歸在單一隱含 schema 下 */
export interface ErSchema {
  key: string
  label: string
  /** Schema Wiki 頁內文（Markdown） */
  description?: string
}

export interface ErGroup {
  key: string
  label: string
  /** 對應 schemas[].key。v1.2；沒寫或找不到時歸入第一個 schema */
  schema?: string
  /** Schema 頁該分群標題下的說明（Markdown）。v1.2 */
  description?: string
}

export interface ErOptions {
  /** 卡片預設顯示幾欄（主鍵與外鍵一律顯示，不計入） */
  defaultRows: number
  /** hub 表：被極多張表指向的共用表，連線預設收起，否則整張圖會被它蓋滿 */
  hubTables: string[]
  /** 章節編號的前綴 */
  sectionPrefix: string
  hint: string
  searchPlaceholder: string
  /** 畫布高度（px）。不給就依 mode 取預設：內嵌 560、獨立頁依視窗算 */
  canvasHeight?: number
}

export interface ErDiagramData {
  meta?: { title?: string; description?: string; source?: string; backTo?: string }
  options?: Partial<ErOptions>
  /** 必填性語彙。marker 對應 CSS 的圓點樣式：solid / half / hollow / muted */
  requirement: { key: string; label: string; marker: string; title?: string }[]
  /** 欄位徽章。tone 對應配色：danger / info / success / neutral / warning */
  flags: { key: ErFlagKey; badge: string; tone?: string; label?: string }[]
  /** 衍生欄徽章，一律 warning 色 */
  derivations: { key: string; badge: string; label?: string }[]
  /** v1.2 */
  schemas?: ErSchema[]
  groups: ErGroup[]
  layout: { columns: { key: string; groups: string[] }[] }
  tables: ErTable[]
}

export const DEFAULT_OPTIONS: ErOptions = {
  defaultRows: 6,
  hubTables: [],
  sectionPrefix: '§',
  hint: '點一張表可聚焦它的關聯，其餘變淡；再點一次、點空白處或按 Esc 取消。欄位右側的圖示 hover 可看該欄說明。',
  searchPlaceholder: '搜尋表名或欄位名',
}

export interface Edge {
  id: string
  child: string
  parent: string
  col: string
  self: boolean
}

/* 無限畫布的縮放範圍。下限 0.2 讓 36 張表的全圖能一眼看完，
   上限 2.5 足以把 10px 的欄位型別看清楚，再大只是模糊放大。 */
export const MIN_ZOOM = 0.2
export const MAX_ZOOM = 2.5
export const ZOOM_STEP = 1.25
/** fit 時四周留的呼吸空間 */
export const FIT_PAD = 28

export interface ViewState {
  x: number
  y: number
  z: number
}

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export const TIP_MAX_WIDTH = 320
export const TIP_HALF = TIP_MAX_WIDTH / 2

export interface TipState {
  x: number
  rawX: number
  y: number
  up: boolean
  adjusted: boolean
  title: string
  body: string
}

/** Wiki 的目前頁。Diagram 的範圍與聚焦由它投影而來 */
export type Route =
  | { kind: 'overview' }
  | { kind: 'schema'; key: string }
  | { kind: 'table'; key: string }

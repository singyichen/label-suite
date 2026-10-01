/* OpenAPI Renderer —— 型別與常數
 *
 * 只放型別與純值常數，不 import 任何 runtime 模組：
 * scripts/checks 以 Node 的 strip-types 直接載入 derive.ts／examples.ts，它們對這裡只能有 `import type`。
 *
 * OpenAPI 型別只描述 renderer 讀得到的子集，同時容得下 3.0（nullable、單一 type、example）
 * 與 3.1（type 陣列、const、examples 陣列）。未知欄位一律不宣告 —— spec 可以帶任何 x- 擴充。
 */

/* props 型別自帶一份，不從 `@notes/plugins/_types` import（理由同 ER plugin：
 * 官方 plugin 同時要在主 repo 與使用者專案 build，`@notes` 在兩處指向不同的根）。 */
export interface PluginRendererProps<T> {
  data: T
  file: { path: string; name: string; updatedAt: string }
  options: Record<string, unknown>
  mode: 'page' | 'embed'
}

/* ── OpenAPI 子集 ─────────────────────────────────────── */

export interface Schema {
  $ref?: string
  type?: string | string[]
  format?: string
  title?: string
  description?: string
  properties?: Record<string, Schema>
  required?: string[]
  items?: Schema
  additionalProperties?: boolean | Schema
  enum?: unknown[]
  const?: unknown
  default?: unknown
  example?: unknown
  /** JSON Schema 2020（OAS 3.1）的 examples 是陣列 */
  examples?: unknown
  nullable?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  deprecated?: boolean
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  discriminator?: { propertyName?: string }
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  pattern?: string
}

export interface ExampleObject {
  $ref?: string
  summary?: string
  description?: string
  value?: unknown
}

export interface Parameter {
  $ref?: string
  name: string
  in: 'path' | 'query' | 'header' | 'cookie' | string
  description?: string
  required?: boolean
  deprecated?: boolean
  schema?: Schema
  example?: unknown
  examples?: Record<string, ExampleObject>
  style?: string
  explode?: boolean
}

export interface MediaType {
  schema?: Schema
  example?: unknown
  examples?: Record<string, ExampleObject>
}

export interface RequestBody {
  $ref?: string
  description?: string
  required?: boolean
  content?: Record<string, MediaType>
}

export interface Header {
  $ref?: string
  description?: string
  schema?: Schema
}

export interface Response {
  $ref?: string
  description?: string
  headers?: Record<string, Header>
  content?: Record<string, MediaType>
}

export type SecurityRequirement = Record<string, string[]>

export interface Operation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses?: Record<string, Response>
  deprecated?: boolean
  security?: SecurityRequirement[]
}

export type PathItem = Partial<Record<Method, Operation>> & { parameters?: Parameter[] }

export interface SecurityScheme {
  type?: string
  description?: string
  name?: string
  in?: string
  scheme?: string
  bearerFormat?: string
  flows?: Record<string, { scopes?: Record<string, string> }>
}

export interface Server {
  url: string
  description?: string
}

export interface TagObject {
  name: string
  summary?: string
  description?: string
}

export interface OpenApiDoc {
  openapi?: string
  /** Swagger 2.0 —— 不渲染，只顯示轉檔指引 */
  swagger?: string
  info?: { title?: string; version?: string; description?: string }
  servers?: Server[]
  tags?: TagObject[]
  paths?: Record<string, PathItem>
  components?: {
    schemas?: Record<string, Schema>
    securitySchemes?: Record<string, SecurityScheme>
    [k: string]: unknown
  }
  security?: SecurityRequirement[]
}

/* ── 推導結果 ─────────────────────────────────────────── */

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'query' | 'head' | 'options' | 'trace'

export interface OpEntry {
  /** operationId；沒有或重複時為 `method/path`（例：`get/pet/{petId}`） */
  key: string
  method: Method
  path: string
  operationId?: string
  summary?: string
  description?: string
  deprecated: boolean
  /** path-level 與 op-level 合併、$ref 已解開；同 name + in 時 op-level 覆蓋 */
  params: Parameter[]
  requestBody: RequestBody | null
  responses: Record<string, Response>
  security: SecurityRequirement[]
  /** 沒有 tags 時為 ['__none'] */
  tags: string[]
  /** 直接參照的 schema 與位置字串（`參數 x`／`Request body`／`回應 200`） */
  refs: [string, string][]
}

export interface TagEntry {
  name: string
  /** 顯示用；`__none` 為「未分類」 */
  label: string
  summary?: string
  description?: string
  ops: OpEntry[]
  /** tag 內所有 path 的共同前綴（≥ 2 段才有），導覽顯示一次 */
  base: string
}

export type UsageEntry = { op: OpEntry; where: string[]; via?: undefined } | { op: OpEntry; via: string; where?: undefined }

export interface VersionInfo {
  raw: string
  kind: '3.0' | '3.1' | '3.x' | 'swagger' | 'unknown'
  /** 3.0／3.1 才算支援；3.2 等以 3.1 規則盡力渲染並警示 */
  supported: boolean
}

export interface Derived {
  doc: OpenApiDoc
  ops: OpEntry[]
  opByKey: Map<string, OpEntry>
  tags: TagEntry[]
  schemas: Record<string, Schema>
  schemaNames: string[]
  /** 每個 schema 直接參照的其他 schema（不追 ref、略過 example(s)） */
  deps: Record<string, Set<string>>
  refBy: Record<string, string[]>
  usage: Record<string, UsageEntry[]>
  servers: Server[]
  securitySchemes: Record<string, SecurityScheme>
  version: VersionInfo
  /** ≤ 4 支 operation 且沒有任何 tag：不顯示導覽 */
  tiny: boolean
  /** 不 throw 的資料瑕疵，dev 下 console.warn */
  warnings: string[]
}

export type Route =
  | { kind: 'overview' }
  | { kind: 'tag'; key: string }
  | { kind: 'op'; key: string; sub?: string }
  | { kind: 'schema'; key: string; sub?: string }

/* ── 選項 ─────────────────────────────────────────────── */

export interface OarOptions {
  /** embed 限定：要顯示的 op key（通常是 operationId）。未給 → 總覽縮影 */
  operation?: string
  /** 導覽 summary：hover 卡或第二行 */
  navSummary: 'hover' | 'line'
  /** 範例請求預設用第幾個 server */
  server: number
}

export const DEFAULT_OPTIONS: OarOptions = {
  navSummary: 'hover',
  server: 0,
}

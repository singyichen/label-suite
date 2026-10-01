/* ER Diagram Renderer —— 資料推導
 *
 * 由資料檔推導出 UI 需要的一切：關聯、父子表、schema 歸屬、導覽樹。
 * 推導而不存，是為了只有一份真相 —— edges 由 columns[].fk 推，父／子表數由 edges 推，
 * 沒有 schemas 時補一個隱含 schema，讓 v1.1 的資料檔不改也能跑。
 *
 * 純函式、只有 `import type`：scripts/checks/er-derive.mjs 以 Node 的 strip-types 直接載入本檔，
 * 它不解析省略副檔名的相對 import、也不轉 JSX。
 */

import type { Edge, ErDiagramData, ErGroup, ErSchema, ErTable } from './types'

/** 沒有 schemas 時補上的隱含 schema。UI 不以節點形式顯示它 */
export const IMPLICIT_SCHEMA_KEY = '_all'
/** group 指向不存在的分群時，表歸入的虛擬分群 */
export const UNGROUPED_KEY = '__ungrouped'

export interface ErTreeGroup extends ErGroup {
  tables: ErTable[]
}

export interface ErTreeSchema extends ErSchema {
  groups: ErTreeGroup[]
}

export interface ErDerived {
  byName: Map<string, ErTable>
  groupByKey: Map<string, ErGroup>
  schemas: ErSchema[]
  /** 資料檔沒有 schemas、用的是隱含 schema */
  implicit: boolean
  schemaOfGroup: (groupKey: string) => string
  schemaOfTable: (tableName: string) => string
  /** schema 缺漏或指向不存在 key 的 group（只在有 schemas 時才算） */
  orphanGroups: string[]
  /** group 指向不存在分群的表 */
  ungroupedTables: string[]
  edges: Edge[]
  /** 本表的外鍵 edge（排除自我參照） */
  parentsOf: (name: string) => Edge[]
  /** 指向本表的 edge（排除自我參照） */
  childrenOf: (name: string) => Edge[]
  /** 父表名，去重、依 tables[] 原順序 */
  parentTables: (name: string) => string[]
  /** 子表名，去重、依 tables[] 原順序 */
  childTables: (name: string) => string[]
  /** schema → group（依 layout 順序）→ table */
  tree: ErTreeSchema[]
  /** 反引號自動連結的目標。隱含模式下 schemas 為空集合 */
  linkTargets: { tables: Set<string>; schemas: Set<string> }
}

export function erDerive(data: ErDiagramData): ErDerived {
  const tables = data.tables
  const byName = new Map(tables.map((t) => [t.name, t]))
  const groupByKey = new Map(data.groups.map((g) => [g.key, g]))
  const implicit = !data.schemas || data.schemas.length === 0
  const schemas: ErSchema[] = implicit
    ? [{ key: IMPLICIT_SCHEMA_KEY, label: '全部' }]
    : (data.schemas as ErSchema[])
  const schemaKeys = new Set(schemas.map((s) => s.key))
  const firstSchema = schemas[0].key

  const schemaOfGroup = (groupKey: string): string => {
    const s = groupByKey.get(groupKey)?.schema
    return s && schemaKeys.has(s) ? s : firstSchema
  }
  const schemaOfTable = (tableName: string): string => {
    const t = byName.get(tableName)
    return t ? schemaOfGroup(t.group) : firstSchema
  }

  const orphanGroups = implicit
    ? []
    : data.groups.filter((g) => !g.schema || !schemaKeys.has(g.schema)).map((g) => g.key)
  const ungroupedTables = tables.filter((t) => !groupByKey.has(t.group)).map((t) => t.name)

  const edges: Edge[] = tables.flatMap((t) =>
    t.columns
      .filter((c) => c.fk && byName.has(c.fk))
      .map((c) => ({
        id: `${t.name}.${c.name}`,
        child: t.name,
        parent: c.fk as string,
        col: c.name,
        self: c.fk === t.name,
      })),
  )

  const order = new Map(tables.map((t, i) => [t.name, i]))
  const byOrder = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0)
  const parentsOf = (n: string) => edges.filter((e) => e.child === n && !e.self)
  const childrenOf = (n: string) => edges.filter((e) => e.parent === n && !e.self)
  const parentTables = (n: string) => [...new Set(parentsOf(n).map((e) => e.parent))].sort(byOrder)
  const childTables = (n: string) => [...new Set(childrenOf(n).map((e) => e.child))].sort(byOrder)

  /* 導覽樹的分群順序依 layout.columns —— 與圖上的位置一致；沒出現在 layout 的接在最後 */
  const groupOrder: string[] = []
  for (const col of data.layout.columns) {
    for (const g of col.groups) if (groupByKey.has(g) && !groupOrder.includes(g)) groupOrder.push(g)
  }
  for (const g of data.groups) if (!groupOrder.includes(g.key)) groupOrder.push(g.key)

  const tree: ErTreeSchema[] = schemas.map((s) => {
    const groups: ErTreeGroup[] = groupOrder
      .map((k) => groupByKey.get(k) as ErGroup)
      .filter((g) => schemaOfGroup(g.key) === s.key)
      .map((g) => ({ ...g, tables: tables.filter((t) => t.group === g.key) }))
    if (s.key === firstSchema && ungroupedTables.length) {
      groups.push({
        key: UNGROUPED_KEY,
        label: '未分群',
        tables: tables.filter((t) => !groupByKey.has(t.group)),
      })
    }
    return { ...s, groups }
  })

  return {
    byName,
    groupByKey,
    schemas,
    implicit,
    schemaOfGroup,
    schemaOfTable,
    orphanGroups,
    ungroupedTables,
    edges,
    parentsOf,
    childrenOf,
    parentTables,
    childTables,
    tree,
    linkTargets: {
      tables: new Set(tables.map((t) => t.name)),
      schemas: implicit ? new Set() : new Set(schemaKeys),
    },
  }
}

export interface TableMatch {
  hit: boolean
  /** 表名或表 label 命中 */
  byName: boolean
  /** 命中的欄位名 */
  columns: string[]
}

/** 表名、表 label、欄位名，不分大小寫。導覽篩選與 Diagram 搜尋共用這一支 */
export function matchTable(table: ErTable, query: string): TableMatch {
  const q = query.trim().toLowerCase()
  if (!q) return { hit: true, byName: true, columns: [] }
  const byName = table.name.toLowerCase().includes(q) || table.label.toLowerCase().includes(q)
  const columns = table.columns.filter((c) => c.name.toLowerCase().includes(q)).map((c) => c.name)
  return { hit: byName || columns.length > 0, byName, columns }
}

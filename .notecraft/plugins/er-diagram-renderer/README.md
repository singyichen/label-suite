# ER Diagram Renderer

把一份資料庫 schema JSON 渲染成 DBdocs 式的資料庫文件：**導覽樹**、**Wiki** 與**關聯圖**。

## 它畫出什麼

### 外殼（v1.2.0）

- **導覽樹**：Schema → 分群 → 資料表三層，可篩選（比對表名、表的中文標籤與欄位名，附「命中／總數」）、可收合。
  資料沒有 `schemas` 時省略 Schema 那一層，直接從分群開始 —— 只有一個節點的層級沒有意義
- **Wiki／Diagram 兩個分頁**，互相跳轉：Wiki 的「在 Diagram 聚焦」、Diagram 聚焦列的「開啟 Wiki」；
  在 Diagram 點一張表，切回 Wiki 就是那張表
- **記得上次看到哪**：目前的頁面、分頁與範圍存在瀏覽器（localStorage，依資料檔路徑區分），reload 回到原處；
  資料改名後殘留的無效位置會回到總覽
- **兩種情境**：獨立頁（`/view/<路徑>`）外殼隨內容長高、分頁列與導覽黏在頂端；
  內嵌在筆記裡時是 580px 高的框、導覽預設收起，可「展開全寬」攤開整個外殼
- **窄寬度**（外殼 ≤ 760px，看的是外殼自己的寬度而非視窗）：導覽改為覆蓋在內容上

### Wiki

- **總覽**：資料庫標題、統計（schemas／表／欄位／外鍵）、`meta.description`、各 schema 卡片、本份資料的語彙（必填性、欄位徽章、衍生欄）
- **Schema 頁**：schema 說明，以及每個分群的說明與資料表清單（說明摘要、欄位數、父／子表數）
- **Table 頁**：表說明、欄位表（型別、必填、預設、PK／FK／UQ／IX 與衍生徽章、說明；外鍵可點到父表）、
  **局部關聯圖**（父表 ← 本表 ← 子表，各最多畫 8 張）、參照／被參照清單、索引與唯一鍵、衍生欄

`description` 全部選填，缺漏時照常渲染並顯示空狀態。

### Diagram

- **可縮放平移的無限畫布**（v1.1.0）：拖曳平移、⌘/Ctrl＋滾輪縮放（觸控板捏合同樣有效）、
  雙擊空白處或按右下的還原鈕回到起點。開啟時自動 fit **寬度**（不是整張圖 ——
  這種版面往下長，用寬高都塞得下的倍率去 fit 會被高度壓到讀不到字），
  之後就交給你，動過視角後不會再被自動拉回。
  單純滾輪一律放行給頁面捲動，畫布不會把滾輪吃掉讓你出不去
- **固定欄數的版面**：模組分群由上而下堆疊，欄序自己指定 —— 相鄰欄放關係密切的模組，
  多數外鍵就只跨一欄，連線不必繞遠路
- **範圍**（v1.2.0）：只畫某個 schema 的表；跨範圍的連線不畫，但會註明有幾條
- **關聯連線**：由欄位的 `fk` 推導，量測卡片實際位置後畫貝茲曲線
- **聚焦**：點一張表，它的父表與子表保持清晰、其餘變淡，並列出「指向 N 張父表、被 M 張子表指向」
- **搜尋**：比對表名、表的中文標籤與欄位名，附命中數（沒有這個數字，「查不到」與「沒在查」長得一樣）
- **hub 表收折**：被極多張表指向的共用表（例：選項主檔），連線預設收起 ——
  不收的話整張圖會被它的放射狀線條蓋滿
- **Esc 逐層退**：先取消聚焦，再收起覆蓋式導覽，最後離開全寬；在筆記的「放大檢視」裡也一樣

## 資料長什麼樣

完整規格見 [schema.json](./schema.json)。可跑的範例：
[example/schema.json](./example/schema.json)（v1.2：3 個 schema、14 張表）、
[example/schema.v1.1.json](./example/schema.v1.1.json)（v1.1 格式，保留作相容測試）。

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/SteveLin100132/notecraft/main/plugins/er-diagram-renderer/schema.json",
  "meta": {
    "title": "…",
    "description": "Wiki 總覽頁內文，**允許 Markdown**",
    "source": "…",
    "backTo": "/notes/…"
  },
  "options": { "defaultRows": 6, "hubTables": ["option_item"], "canvasHeight": 640 },

  // 語彙都是資料，不是寫死的 —— 換個專案可以改叫法
  "requirement": [{ "key": "required", "label": "必填", "marker": "solid" }],
  "flags":       [{ "key": "pk", "badge": "PK", "tone": "danger", "label": "主鍵" }],
  "derivations": [{ "key": "trigger", "badge": "TRG", "label": "由 trigger 維護" }],

  // v1.2：導覽第一層，順序即導覽順序（選填）
  "schemas": [{ "key": "crm", "label": "客戶關係", "description": "…（Markdown）" }],
  "groups":  [{ "key": "customer", "label": "客戶", "schema": "crm", "description": "…（Markdown）" }],
  "layout":  { "columns": [{ "key": "c1", "groups": ["customer"] }] },

  "tables": [{
    "name": "customer", "label": "客戶主檔", "section": "2.1", "group": "customer",
    "description": "…（Markdown，Table 頁的表說明）",
    "columns": [
      { "name": "id", "type": "bigint", "required": "system", "pk": true, "note": "代理主鍵" },
      { "name": "industry_id", "type": "bigint", "required": "nullable", "fk": "option_item", "note": "產業類別" }
    ]
  }]
}
```

**關聯不要另外存一份。** `edges` 由 `columns[].fk` 推導 —— 存了就會有兩份真相，改一邊忘另一邊。
同理，索引與唯一鍵清單由 `pk`／`unique`／`index` 推導，衍生欄清單由 `derivation` 推導，父／子表數由關聯推導。

### v1.1 → v1.2：全部是選填新增

| 位置 | 新欄位 | 用途 |
| --- | --- | --- |
| 頂層 | `schemas[]`（`key`、`label`、`description?`） | 導覽第一層 |
| `meta.description` | 語意擴充：允許 Markdown | Wiki 總覽頁內文 |
| `groups[]` | `schema`、`description` | 分群歸屬哪個 schema、Schema 頁的分群說明 |
| `tables[]` | `description` | Table 頁的表說明 |

- **v1.1 的資料檔不改也能跑**：沒有 `schemas` 時全部分群歸在一個隱含的 schema 下，介面自動省略 Schema 那一層、Diagram 不顯示範圍切換
- `groups[].schema` 沒寫或指向不存在的 key：歸入第一個 schema，開發模式下 console 警告一次（不會讓頁面壞掉）
- `layout.columns` 仍決定 Diagram 版面，也決定導覽樹裡分群的順序（沒出現在 layout 的分群接在最後）
- 用 v1.1 的 `schema.json` 驗證 v1.2 資料會失敗（`additionalProperties: false`），這是預期的 —— 請用本版的 schema

### Wiki 內文（Markdown）

`description` 只支援這幾種語法：`##`／`###` 標題、段落、`-`／`1.` 清單、`>` 引言、`**粗體**`、`` `code` ``、`[文字](url)`。
其餘（表格、圖片、HTML）一律當文字顯示。

- **自動連結**：反引號內容恰好是表名 → 連到該表的 Table 頁；恰好是 schema key → 連到 Schema 頁
- 表名與 schema key 撞名時表名優先；要明確指定就加前綴：`` `table:customer` ``、`` `schema:customer` ``
  （顯示時會去掉前綴；指向不存在的目標時原樣顯示，讓你看得出引用壞了）
- **連結只接受** `http(s):`、`mailto:`、單一 `/` 開頭的站內路徑、`#` 錨點；`javascript:`、`data:`、`//host` 等一律當文字

`meta.description` 同時是 NoteCraft 的頁面描述與搜尋索引來源。**notecraftapp ≥ 1.3.0** 會自動去除 Markdown 標記
（頁面描述與清單只取第一段、搜尋索引收全文）；在較舊的版本上仍能正常渲染，只是頁面描述處會看到原始符號。

## 安裝與使用

```bash
npx notecraftapp install-plugin er-diagram-renderer
```

然後在 `.notecraft/plugins.json` 加一條映射：

```json
{ "plugins": [{ "plugin": "er-diagram-renderer", "files": ["**/*.er.json"] }] }
```

`plugins.json` 的 `options` 會覆蓋資料檔自帶的 `options` —— 同一份資料被不同專案引用時，
覆寫權在引用的人手上。`options.canvasHeight` 指定 Diagram 畫布高度（px），不給就依情境自動決定。

## 從寫死資料的舊元件遷移

若你已經有一支「資料寫死在 tsx 裡」的 ER 元件，用轉檔腳本一次轉出來：

```bash
node scripts/er-schema-from-tsx.mjs <舊元件.tsx> <輸出.json> --title "…" --back "/notes/…"
```

它會抽出表定義與版面、把短鍵轉成長鍵、把每張表重複一份的 `groupLabel` 正規化成頂層 `groups`，
並補上原本寫死在程式裡的語彙。檔案會變大約 1.6 倍 —— 那是為可讀性付的錢，
壓縮過的短鍵 JSON 人改不動、AI 也難產。產物不含 v1.2 的新欄位，可直接通過 v1.2 schema；
要用 Wiki 就在轉出的檔案上補 `schemas` 與各層 `description`。

## 檔案

入口固定是 `renderer.tsx`（外殼、路由與同步），其餘由它 import：`nav.tsx`（導覽）、`wiki.tsx`（Wiki 三頁）、
`local-diagram.tsx`（局部關聯圖）、`diagram.tsx`（畫布）、`derive.ts`（資料推導）、`markdown.tsx`／`markdown-text.ts`（迷你 Markdown）、
`types.ts`、`styles.ts`。

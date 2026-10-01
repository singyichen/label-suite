# OpenAPI Renderer（`openapi-renderer`）

把筆記資料夾裡的 OpenAPI 文件（JSON，OAS 3.0／3.1）渲染成 API 文件：

- **導覽**：tag → operation（可依 path／summary 篩選、依 method 複選），以及 Schemas
- **總覽**：API 規模、各 tag 的 method 分布、伺服器、驗證方式
- **Operation 頁**：參數（依 path／query／header／cookie 分組）、Request Body 與 Responses 的欄位樹與範例、cURL／fetch 範例請求
- **Schema 頁**：欄位樹、被哪些 operation 使用（直接／間接）、參照關係
- **內嵌**：在筆記裡放單一 operation 的卡片，或整份 API 的總覽縮影

它是「讀文件」的地方，不會替你送出請求（純靜態站、沒有執行時 API）。

需要 notecraftapp **1.6.0** 以上。

## 安裝與設定

```bash
npx notecraftapp install-plugin openapi-renderer
```

`.notecraft/plugins.json`：

```jsonc
{
  "plugins": [
    { "plugin": "openapi-renderer", "files": ["**/*.openapi.json"] }
  ]
}
```

路由規則與其他資料檔相同：只去掉 `.json`。`api/orders.openapi.json` → `/view/api/orders.openapi`。

頁首的標題與描述取自 `info.title`／`info.description`（`description` 可用 Markdown，搜尋索引會用去掉標記的純文字）。
要顯示「回到來源筆記」，在 spec 頂層加 `"x-notecraft-back-to": "/notes/<slug>"`。

## 內嵌在筆記裡

```mdx
{/* 單一 operation 的卡片；anchor 讓「開啟完整檢視頁」直接到那一支 */}
<PluginView src="api/orders.openapi.json" options={{ operation: "createOrder" }} anchor="op/createOrder" />

{/* 不指定 operation → 總覽縮影 */}
<PluginView src="api/orders.openapi.json" />
```

- `options.operation`：operationId（沒有 operationId 的用 `method/path`，例：`get/pet/{petId}`）。找不到時卡片內顯示錯誤，不會 build fail
- `anchor`：app 不會從 `options` 自動推導，要自己寫。格式見下方〈深連結〉
- 每一處內嵌都會帶著**整份** spec（資料 inline 在頁面裡）。大型 spec 請只內嵌少數幾處

## 深連結

文件頁的網址 hash 對應目前位置，可以直接分享：

| 位置 | hash |
| --- | --- |
| 總覽 | （無） |
| Tag | `#tag/orders` |
| Operation | `#op/createOrder` |
| 沒有 operationId 的 operation | `#op/get/pet/{petId}` |
| 指定回應 | `#op/createOrder/responses/409` |
| Schema | `#schema/Order` |

## 選項（`plugins.json` 的 `options` 或 `<PluginView options>`）

| 鍵 | 預設 | 說明 |
| --- | --- | --- |
| `operation` | — | 僅內嵌：要顯示的 operation |
| `navSummary` | `"hover"` | 導覽列 summary 的呈現：`"hover"` 滑過才顯示、`"line"` 固定顯示在第二行（觸控裝置一律第二行） |
| `server` | `0` | 範例請求預設用 `servers` 的第幾個 |

## 支援範圍

| 版本 | 行為 |
| --- | --- |
| OpenAPI 3.0.x、3.1.x | 完整支援 |
| 其他 3.x（例：3.2.0） | 以 3.1 規則盡力渲染，頁首與總覽顯示警示；3.2 的 `query` method 以中性色標記 |
| Swagger 2.0 | 不渲染，顯示轉檔指引（例如用 `swagger2openapi` 轉成 3.0） |

不支援、或刻意不做的：

- **YAML**：資料檔只吃 JSON，請先轉檔
- **外部 `$ref`**（不是 `#/` 開頭）：不解析，型別欄位顯示 ref 原字串
- **試打 API**：站台是純靜態，大多數 API 不會對它開 CORS，而且要在公開頁面輸入 token。範例區提供可複製的 cURL／fetch
- `$ref` 斷掉、`operationId` 重複等瑕疵不會讓 build 失敗：會略過或改用 `method/path`，dev 模式在瀏覽器 console 警告

## 範例資料

`example/` 底下三份 spec 同時是 CI 的相容性測試資料（`npm run check-plugins` 會驗證並實際 build）：

| 檔案 | 用途 |
| --- | --- |
| `petstore.openapi.json` | [Swagger Petstore](https://github.com/swagger-api/swagger-petstore)（OAS 3.2.0，Apache-2.0）—— 官方範例，也是 `manifest.example` |
| `orders.openapi.json` | 3.1 邊界案例：循環 `$ref`、`oneOf`／`anyOf`／`allOf`、同一個 status 多種 content-type、長 path、深層巢狀、deprecated |
| `health.openapi.json` | 極小文件（2 支、沒有 tag）：不顯示導覽 |

規模測試（20 個 tag、280 支 operation）用程式產生的 spec：`node scripts/fixtures/oar-large-spec.mjs <輸出路徑>`。

## 開發

入口檔名固定為 `renderer.tsx`；其餘檔案由相對 import 帶進打包，新增檔案時記得登記到 `plugins/registry.json` 的 `files`。

| 檔案 | 內容 |
| --- | --- |
| `renderer.tsx` | 外殼、hash 路由、鍵盤、捲動同步、page／embed 分流 |
| `nav.tsx`／`pages.tsx`／`embed.tsx` | 導覽、四種頁面、內嵌卡片 |
| `schema-tree.tsx`／`atoms.tsx`／`markdown.tsx` | 欄位樹、原子元件、Markdown 輸出 |
| `derive.ts`／`examples.ts`／`markdown-text.ts` | 純函式（推導、範例與 cURL、Markdown 解析），`scripts/checks/oar-*.mjs` 直接載入斷言 —— 只能 `import type`、不能有 JSX |
| `styles.ts` | CSS 字串（所有規則以 `.oar-root` 起頭、不可含 `< > & " '`） |

`markdown-text.ts` 與 ER plugin 各持一份（plugin 各自安裝、不能互相 import），由 `scripts/checks/oar-markdown.mjs` 確保兩邊輸出一致。

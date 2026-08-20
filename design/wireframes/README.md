# design/wireframes/ — 凍結說明（Frozen）

> **狀態：凍結（2026-08-20，issue #183）。保留不刪除，請勿再編輯本目錄下的 .pen 檔。**

## 為什麼凍結

- Wireframe 階段自 2026-05-21 起實質休眠：`design-system.pen` 最後一次變動為 2026-05-20，`pages/` 僅繪製過 5 頁（account 4 頁 + dashboard 1 頁），其後所有設計工作皆直接以 HTML prototype（`design/prototype/`）進行。
- `design-system.pen` 是人工重繪的元件鏡像——與 `design/prototype/assets/tokens.css` / `design/system/MASTER.md` 之間必然飄移。
- 其展示職能已由 **`design/prototype/components-showcase.html`**（living styleguide，issue #183 產出）取代：直接 link 真實 tokens.css、token 區以 getComputedStyle 執行期列舉、元件區採 MASTER.md canonical CSS 逐字複製，並納入 Playwright 驗證——結構上不可能飄移。

## 為什麼保留

本目錄是論文（Demo Paper）可引用的設計過程演進證據：wireframe → HTML prototype → living styleguide 的工作流轉變本身是研究記錄的一部分。

## 現行的設計真相來源

| 用途 | 位置 |
|------|------|
| 視覺 token 唯一真源 | `design/prototype/assets/tokens.css` |
| 元件規格正典 | `design/system/MASTER.md`（+ `design/system/pages/*.md` 頁面覆寫） |
| Living styleguide（元件展示） | `design/prototype/components-showcase.html` |
| 跨功能行為慣例 | `design/system/ux-conventions.md` |

`/pencil-wireframe` skill 與 Pencil MCP 工具仍存在於 repo，但對本目錄僅供唯讀檢視（`batch_get` / `get_screenshot`）；新的設計工作請走 `/label-suite-design`（prototype）路徑。

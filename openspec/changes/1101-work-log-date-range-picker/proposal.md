---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1101
基準版本: 014 v4.2.1
目標版本: 014 v4.3.0
---

## Why

`task-detail` 工時紀錄 Tab E 的「工時篩選列」目前以兩個獨立的原生 `<input type="date">`（`#workLogDateFrom` / `#workLogDateTo`）呈現日期區間篩選。issue #1101 的使用者提供截圖要求改為單一日期區間選擇器：點擊後於同一日曆介面框選起訖日期、即時高亮選取範圍，並以 `2026-04-19 ～ 2026-04-20` 的單行文字顯示已選範圍；僅將兩個既有欄位包在同一外框不符合需求。

本頁（以及全站 `design/prototype/pages/**`、`components-showcase.html` 與 `design/system/MASTER.md`）目前沒有任何日期區間／日曆選取模式可重用，原生 `<input type="date">` 也無法表達一個區間，而 prototype 不載入任何執行期 npm 套件（無 UI 元件庫）。因此必須新寫一個最小的共用元件（reach-for ladder 第 7 階，見下）。

**是否需要存在（YAGNI 檢查）**：需要。issue #1101 的全部驗收條件（單一框選介面、不完整選取不套用、反向正規化、鍵盤操作）都要求日曆互動行為，不是可用 CSS 把兩個 input 包起來達成的樣式調整。

**規格層級的釐清**：正典 014 Tab E「工時篩選列」原文僅寫「篩選：日期區間、標記階段」，未規定日期區間要用幾個輸入元件呈現，因此控制項從兩個欄位改為一個不構成 BREAKING；但「單一框選、高亮、不完整選取不套用、反向正規化、鍵盤操作、窄螢幕不溢出」是目前規格完全沒有規定的新行為規則，必須新增 FR 承載，不能只當作免 SDD 的樣式修正（issue #1101 執行範圍第 1 點）。`wl_from`／`wl_to` 的 URL 契約（FR-019）與既有篩選/分頁行為（FR-007、FR-007a、FR-007b）文字不變。

## What Changes

- **新增 FR-007c**（Tab E 工時篩選列單一日期區間選擇器）：工時篩選列的日期區間輸入 MUST 以單一日期區間選擇器呈現，不得使用兩個獨立日期欄位；點擊後於同一日曆介面框選起訖日期，已選範圍即時高亮；控制項顯示已選範圍（`YYYY-MM-DD ～ YYYY-MM-DD`）或未選時的提示文字；只選取起點、尚未完成第二次選取前不得套用不完整區間（表格與匯總不得更新）；允許反向點選（先點較晚日期），系統必須正規化為有效起訖；套用時包含起日與迄日（沿用既有 `entry.date < from` / `> to` 排除式比較，起訖本身不被排除，為既有行為、本次不變更）；提供「清除」操作，清除後恢復不限制日期的結果；控制項必須可用鍵盤完整操作（方向鍵移動日期焦點、Enter 選取、Esc 關閉並將焦點送回觸發元件），且在 `RWD_VIEWPORTS`（含 375px）不得造成版面溢出。內部篩選狀態（`state.workLogDateFrom`／`state.workLogDateTo`）與 `wl_from`／`wl_to` 網址參數（FR-019）維持不變，單邊網址（僅 `wl_from` 或僅 `wl_to`）仍須在單一控制項中正確呈現為開放式區間。
- **新增六條驗收情境**（AC 編號於 gate 4 回寫時配發，接續使用者故事 1 現有序號，起點 `AC-1.20`）：單一控制項取代兩欄位且高亮清楚可辨、不完整選取不套用、反向選取正規化、清除恢復不限制結果、與任務階段／成員篩選組合並維持既有分頁重置規則、`wl_from`／`wl_to` 直連還原（含單邊網址）。
- **非 FR 錨點同步**：Tab E「工時篩選列」介面描述（`:328`）補一句「以單一日期區間選擇器呈現」，不改變其所屬 FR 範圍。
- **新增共用元件**（prototype，無獨立 FR——比照 `sidebar.js` 屬設計系統實作細節而非功能規格）：`design/prototype/pages/shared/date-range-picker.js` + `date-range-picker.css`，vanilla JS、沿用 `assets/tokens.css`，在 `components-showcase.html` 新增示範區塊並收錄進 Living Styleguide。元件契約見 `design.md`。
- **FR-019、FR-007、FR-007a、FR-007b 文字不變**：`wl_from`／`wl_to` 參數名、`history.replaceState()` 寫回規則、無效值回退、角色邊界、分頁重置、完成筆數拆欄規則皆未修改，僅變更其底層輸入元件的呈現方式。

**BREAKING 判定**：非 BREAKING。沒有任何 FR／AC 被移除；FR-007c 與六條驗收情境為新增；既有欄位 `workLogDateFrom`／`workLogDateTo`、URL 參數 `wl_from`／`wl_to`、既有篩選與分頁邏輯皆不變。

**delta 形式說明**：FR-007c 為全新 ID，置於 `## ADDED Requirements`；六條驗收情境不預先編號，AC 編號於 gate 4 回寫正典時依使用者故事 1 現有序號續編。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑；共用日期區間選擇器為 prototype 設計系統元件，不是獨立 capability。）

### Modified Capabilities

- `task-management/014-task-detail`：新增 FR-007c 與六條驗收情境；Tab E「工時篩選列」介面描述補一句呈現方式說明。FR-007、FR-007a、FR-007b、FR-019 維持原文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v4.2.1 → v4.3.0，**MINOR**，理由：新增 FR-007c 與六條驗收情境，沒有既有行為被移除）。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 的實際版本，版本號依合併目標重算，不得倒退。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併）。
- 上游／下游：無其他正典需要修改；`annotation/015`、`dataset/016`、`dataset/017` 未被引用亦未被修改。

**原型程式（Principle X 之產品檔案盤點）**

| 檔案 | 用途 | 群組 |
|------|------|------|
| `design/prototype/pages/shared/date-range-picker.js` | 共用日期區間選擇器邏輯（mount/setValue/setLang/destroy） | A |
| `design/prototype/pages/shared/date-range-picker.css` | 共用日期區間選擇器樣式，沿用 `assets/tokens.css` | A |
| `design/prototype/components-showcase.html` | 新增示範區塊，收錄進 Living Styleguide | A |
| `design/prototype/pages/task-management/task-detail.panels/work-log.html` | 以單一觸發元件取代兩個日期欄位 markup | B |
| `design/prototype/pages/task-management/task-detail.html` | i18n 鍵、state 掛載共用元件、render／change listener 改接單一控制項，`wl_from`／`wl_to` mapping 不變 | B |

Group A 3 個產品檔案、Group B 2 個產品檔案，兩組皆低於 5 檔／300 行門檻，拆為兩個 PR（`design.md` 拆分理由同列）。Group A 為 intermediate PR（OpenSpec change 維持開啟），Group B 為最終 PR，承載正典回寫與 `/opsx:archive`（ADR-033 Rule 1）。測試檔、`design/system/screen-inventory.md`、`specs/**`、`openspec/**` 不計入門檻。

**套用順序**：Group A 必須先合併，Group B 於 `git merge origin/main` 取得 Group A 之後才能動工，避免共用元件路徑衝突。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：共用元件不內嵌 `work-log` 的任何欄位名稱或任務邏輯，以 `{from, to}` ISO 字串與 callback 為介面，可被其他頁面之後重用；不為 `wl_from`／`wl_to` 寫死第二份篩選常數。
- **Data Fairness（NON-NEGOTIABLE）**：本變更僅調整日期篩選的輸入元件，不改變任何標記內容、答案或跨角色資料存取；reviewer 唯讀自身工時的邊界（FR-007）不受影響。
- **Simplicity First / YAGNI**：不新增快捷區間、匯出或其他篩選維度（issue #1101 明列範圍外）；不引入新的執行期相依套件，沿用 vanilla JS + 既有 tokens。
- **PR 規模（Principle X）**：Group A 3 檔、Group B 2 檔，皆低於 5 檔／300 行門檻。

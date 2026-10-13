---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #1340
基準版本: 013 v8.4.0
目標版本: 013 v8.5.0
---

## Why

issue #1337（複雜樣本顯示）的子單 C：對話型資料集的 Input 欄位是「物件陣列」（例如 `utterances[]`，每則含發言者、編號、文字）。目前 Step 1 沒有任何機制辨識這種形狀，Step 2 預覽對物件取 `String(v)` 而顯示 `[object Object]`。本單讓系統在建立任務時偵測對話串欄位、由建立者確認各子欄位的對應，並讓 Step 2 預覽以對話串呈現；設定存為新任務設定鍵 `dialogue_fields`，是子單 D（工作區 2-A 對話串）的設定來源。

屬新 FR／AC 與新設定鍵，不符合 Lightweight Path，走完整 OpenSpec change，並因設定鍵需定義型別、驗證與持久化契約而附 `design.md`。

**是否需要存在（YAGNI 檢查）**：需要。013 FR-002c-2 規定 `single_item` 恰好 1 個 Input，物件陣列欄位必須能當這「1 個 Input」並被正確呈現；工作區端（子單 D）需要建立者已確認的對應，不能由前端各自猜測。

**Data Fairness（NON-NEGOTIABLE）**：對應只在角色為 Input 的欄位內取子欄位；Step 2 預覽的 Input 文字來源不得退回角色為 Output 或 Evidence 的欄位。本變更不新增任何以欄名字面決定 Output 的推測；子欄位名稱線索只用於預填 Input 內部的對應，且一律由建立者確認或更改。

**Generalization-First（NON-NEGOTIABLE）**：偵測依資料形狀（物件陣列且每筆有字串子欄位）而非任務名稱或欄名硬編；子欄位名稱線索僅是預填值，非判定條件。

**Frontend Ready Gate 九項紀錄**

1. 通過：013 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：013 Prototype Traceability 已連到 `task-new.html`、`task-config.engine.js`、`task-config.data.js` 與對應測試。
3. `N/A`：不新增 route，沿用 task-new 既有 route 與角色白名單（Project Leader）。
4. 通過：偵測不到時不顯示確認區；已確認欄位失效時回到重新偵測（design.md D3）；唯讀沿用既有規則，不另增狀態。
5. 通過：新增 `data-testid` 於 `design.md` D5 列出，Red 與實作共用。
6. 通過：欄位為 `dialogue_fields`（物件或 `null`）、偵測與確認規則見 delta 與 `design.md` D1～D4；錯誤情境為已確認子欄位失效（D3）。
7. 通過：沿用 `TASK_CONFIG_I18N` zh／en 字串；確認區為原生 `<select>` 與 checkbox，鍵盤可操作。
8. 通過：屬 `task-config.engine.js` 共用引擎，無新增 shared 元件；Storybook 不適用（prototype 階段）。
9. 通過：Step 1 目標完成後去向仍為 Step 2；`design/system/user-path-map.html` 無 F3／F4 命中新增。

**已知範圍界線（task-detail）**：013 Step 1 與 014 設定›基本資料編輯模式共用引擎。本變更的確認區只在宿主頁面已初始化 `dialogueFields` 狀態鍵時才建立（task-new 初始化、task-detail 尚未），因此 task-detail 不會出現一個無法持久化的控制項；task-detail 對 `dialogue_fields` 的讀寫另案處理，不在本單。

## What Changes

- **新增 FR-002c-10**：Input 欄位為物件陣列且每筆元素都有字串文字子欄位時，Step 1 於欄位預覽下方提議以「對話串」呈現，顯示確認區（文字欄位必選、發言者欄位可選、發言編號欄位可選，未選時用陣列序號），候選由偵測結果預填、建立者可改或取消；偵測不到時不提議；設定存為任務設定鍵 `dialogue_fields: { text, speaker, utt_id }`。Step 2 預覽以對話串呈現（每則一列：發言編號、發言者、文字）；Input 文字來源 MUST NOT 對物件取字串（不得出現 `[object Object]`），且不得退回非 Input 欄位。
- **新增 AC-1.10、AC-1.11、AC-1.12、SC-002j**：驗收偵測與預填、偵測不到不提議、Step 2 預覽對話串呈現與文字來源不外洩，以及建立任務 payload 帶 `dialogue_fields`。
- **新增任務設定鍵 `dialogue_fields`**：型別與命名見 `design.md` D1。
- **不修訂既有條文**：全部以 `## ADDED Requirements` 承載（理由同 #755、#1338：衍生檢視 `openspec/specs/` 不含 FR-002c 其餘條文，MODIFIED 會使 archive 硬中止）。
- **不處理**：工作區整合預覽、反白座標、T013 種子（子單 D #1341）；「自動」標題摘要（#1339）；task-detail 對 `dialogue_fields` 的讀寫；`item_pair` 輸入類型的對話串。

## Capabilities

- 修改：`task-management/013-task-new`（新增 FR-002c-10）。

## Impact

- 產品檔案（3 個）：`task-config.engine.js`、`task-config.data.js`、`task-new.html`。
- 正典 013 於 archive 時寫回 v8.4.0 → v8.5.0（MINOR：純新增條文）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：偵測依資料形狀，不依任務名稱硬編。
- **Data Fairness（NON-NEGOTIABLE）**：文字來源不退回 Output／Evidence 欄位；對應限於 Input 欄位內部。
- **Simplicity First / YAGNI**：沿用原生控制項與既有預覽容器，UI 在引擎內動態建立；不支援 `item_pair`（`ponytail:` 需要時另案）。
- **PR 規模（Principle X）**：產品檔案 3 個，預估 ≤ 300 行，單一 PR。

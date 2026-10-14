---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #1378
基準版本: 013 v8.5.2
目標版本: 013 v8.6.0
---

## Why

issue #1378 把草圖 artifact（https://claude.ai/artifact/B3fsqSYVQR2odnS987zGgE）裡對話串的細節補進正典。其中「回覆縮排」與「跨發言 · 回應 #n」標記（草圖第 2、3 項）需要知道「哪一則發言在回覆哪一則」，這個關係不能從內文的 `@名字` 或實體推測，必須由建立者在 Step 1 的 `dialogue_fields` 明確宣告。維護者已裁定（2026-10-14）：`dialogue_fields` 加選填的 `reply_to` 子欄位，指向 utterance 物件中存放被回覆發言編號的欄位；沒有指定就不縮排、不標記。

本 change 是 #1378 的第一個 change（013，設定來源）；第二個 change（015，工作區與清單的顯示，堆疊其上）另案處理，兩者依「一個 change 一份正典」拆開。本單新增 AC 與任務設定鍵子欄位，不符合 Lightweight Path，走完整 OpenSpec change，並因設定鍵形狀變動附 `design.md`。

**是否需要存在（YAGNI 檢查）**：需要。沒有 `reply_to` 設定來源，工作區端只能從內文推測回覆關係，違反 Generalization-First 與 Data Fairness（推測會讀到不該讀的內容）；維護者已明確裁定要做。

**Generalization-First（NON-NEGOTIABLE）**：`reply_to` 是建立者宣告的子欄位對應，不依欄位名稱硬編；候選依資料形狀（值為字串、數字或空值）列出，預設一律留空，名稱線索不預填。

**Data Fairness（NON-NEGOTIABLE）**：`reply_to` 只能指向角色為 Input 的物件陣列欄位內部的子欄位，不新增任何讀取 Output／Evidence 欄位的路徑。

**Frontend Ready Gate 九項紀錄**

1. 通過：013 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：013 Prototype Traceability 已連到 `task-new.html`、`task-config.engine.js`、`task-config.data.js` 與對應測試。
3. `N/A`：不新增 route，沿用 task-new 既有 route 與角色白名單（Project Leader）。
4. 通過：候選為空時不顯示「回覆對象欄位」下拉；已確認值失效時清為 `null`（design.md D3）；唯讀沿用既有規則。
5. 通過：新增 `data-testid` 於 `design.md` D4 列出，Red 與實作共用。
6. 通過：設定鍵形狀、候選規則與失效處理見 delta 與 `design.md` D1～D3；錯誤情境為已確認 `reply_to` 失效（D3）。
7. 通過：沿用 `TASK_CONFIG_I18N` zh／en 字串；下拉為原生 `<select>`，鍵盤可操作。
8. 通過：屬 `task-config.engine.js` 共用引擎，無新增 shared 元件；Storybook 不適用（prototype 階段）。
9. 通過：Step 1 目標完成後去向仍為 Step 2；`design/system/user-path-map.html` 無 F3／F4 命中新增。

## What Changes

- **修訂 FR-002c-10**：對話串確認區新增第四個選填對應「回覆對象欄位」（`reply_to`），建立者可選擇或留空，預設留空；候選為物件陣列元素中值皆為字串、數字或空值（至少一筆非空）的子欄位（不含已選為文字欄位者）；`dialogue_fields` 形狀由 `{ text, speaker, utt_id }` 擴為 `{ text, speaker, utt_id, reply_to }`，`reply_to` 可為 `null`；已確認的 `reply_to` 不再合法時清為 `null`，其餘對應不受影響。
- **新增 AC-1.13、AC-1.14**：驗收「回覆對象欄位」的候選與預設留空、可選擇與清除，以及 `reply_to` 隨建立任務 payload 帶出且草稿重載後保留。新增 AC 與所屬條文同置於 FR-002c-10 的修訂區塊，沿用本專案既有做法（#1358 的 015 change 同此做法）。
- **修訂 SC-002j**：payload 的 `dialogue_fields` 含 `reply_to`。
- **向前相容**：既有任務與種子的 `dialogue_fields` 缺少 `reply_to` 時，一律視同 `null`（不縮排、不標記）。
- **不處理（顯示端）**：工作區與清單如何呈現回覆縮排、回應標記、頭像標頭行、發言者前綴、筆數小標籤與純文字切換，全部屬第二個 change（015），延後至 #1378 的第二個 PR；T013 種子補 `reply_to` 亦在該 PR。

## 草圖元素對照表

| # | 草圖元素 | 維護者裁定 | 本 change 的對應 |
|---|---|---|---|
| 1 | 對話串版面：頭像、「發言者＋`#n`」標頭行、發言文字另起一行 | 做 | 顯示屬 015，延後至 #1378（同 issue 第二個 change `annotation-dialogue-sketch-details`，堆疊於本 change 之上）。本 change 無對應 AC |
| 2 | 回覆縮排：回覆發言縮排接在被回覆者下方 | 做 | 設定前提：FR-002c-10、AC-1.13（`reply_to` 由建立者選擇，預設留空即不縮排）；縮排顯示延後至 #1378（第二個 change） |
| 3 | 「跨發言 · 回應 #n」標記 | 做 | 設定前提：FR-002c-10、AC-1.13、AC-1.14（`reply_to` 設定與帶出）；觸發條件（該則有 `reply_to` 且能對應到同一樣本另一則的發言編號）與顯示延後至 #1378（第二個 change） |
| 4 | 左欄清單發言者前綴與筆數小標籤 | 做 | 顯示屬 015，延後至 #1378（第二個 change）。本 change 無對應 AC |
| 5 | 「顯示已標實體／純文字」切換（`aria-pressed`） | 做 | 顯示屬 015，延後至 #1378（第二個 change）。本 change 無對應 AC |

## Capabilities

- 修改：`task-management/013-task-new`（修訂 FR-002c-10、SC-002j；新增 AC-1.13、AC-1.14）。

## Impact

- 產品檔案（2 個）：`task-config.engine.js`（候選、確認區下拉、失效處理）、`task-config.data.js`（zh／en 字串）。`task-new.html` 的 payload 與草稿持久化已整體傳遞 `state.dialogueFields`，不需修改。
- 正典 013 於 archive 時寫回 v8.5.2 → v8.6.0（MINOR：新增選填設定鍵子欄位與 AC）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：`reply_to` 為建立者宣告的對應，不依欄位名稱預填或硬編。
- **Data Fairness（NON-NEGOTIABLE）**：候選與對應限於 Input 物件陣列欄位內部。
- **Simplicity First / YAGNI**：沿用原生 `<select>` 與既有確認區，不新增偵測啟發式。
- **PR 規模（Principle X）**：產品檔案 2 個，預估 ≤ 80 行；單一 PR。

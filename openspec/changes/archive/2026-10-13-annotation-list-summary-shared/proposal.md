---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1339
基準版本: 015 v12.5.1
目標版本: 015 v12.6.0
---

## Why

issue #1337（複雜樣本顯示）的根因之一：左側標記清單把樣本摘要顯示成 `[object Object],[object Object]…`。`annotation-workspace.data.js` 的 `getRecordPreviewText` 取第一個 Input 欄位後直接 `String(value)`，物件陣列（如 T013 的 `utterances[]`）因而變成 `[object Object]`；`annotation-list.html` 的 `getRecordSnippet` 則另寫一份，以 `JSON.stringify` 串接所有 Input 欄位。同一件事有兩份實作，且 015 沒有任何專屬條文規範左欄／清單的文本摘要。

本單是 #1337 四張子單的 B（A→B、A→C、B+C→D）：在 #1338（已合併，specs/task-management/013-task-new/spec.md v8.4.0 FR-002c-9）提供任務設定鍵 `list_title_field` 之後，定義「清單摘要」的單一規則並讓工作區三處與 annotation-list 共用同一個 helper。新增 FR／AC 與行為，不符合 Lightweight Path，走完整 OpenSpec change。

**是否需要存在（YAGNI 檢查）**：需要。`[object Object]` 為使用者可見缺陷；且摘要欄位的候選範圍牽涉 Data Fairness（Output 欄位可能是預標記答案），必須由規格明文約束，不能留給實作自行決定。

**Data Fairness（NON-NEGOTIABLE）**：摘要只讀角色為 Input 的欄位（指定 `list_title_field` 時另可讀 Evidence 與 `id`），永不讀 Output。`task-config.engine.js` 的 `getDatasetPreviewText` 在所有 Input 被濾掉時退回「最長字串欄位」的做法，不得在此沿用；該函式不在本單範圍（由 #1340 負責）。

**範圍外**：中央整合預覽與對話串渲染（#1341）、T013 `text` 欄位角色、發言者前綴、`task-config.engine.js`。

## What Changes

- **新增 FR-106**：清單摘要規則——工作區左欄（標記員項目、reviewer 分組表頭、例外池分組表頭）與 `annotation-list` 文本摘要共用同一個 helper；指定 `list_title_field` 且仍有效時用該欄位，否則依資料形狀自動摘要；絕不輸出 `[object Object]`；絕不讀 Output 欄位。
- **新增 AC-1.35、AC-1.36、AC-1.37、AC-1.38、SC-028**：驗收自動摘要不出現 `[object Object]`、指定欄位後四處一致、Output 欄位永不入摘要，以及兩頁共用同一實作。
- **不修訂既有條文**：全部以 `## ADDED Requirements` 承載（理由同 #1338：衍生檢視 `openspec/specs/` 不含 FR-007／FR-013A／FR-071 等條文，MODIFIED 會使 archive 硬中止）；FR-106 內明文述及其與 FR-007、FR-007I、FR-013A、FR-071 第 2 點的關係。
- **行為變更**：`annotation-list` 文本摘要由「串接所有 Input 欄位」改為「單一欄位摘要」（與工作區一致）。

## Capabilities

- 修改：`annotation/015-annotation-workspace`（新增 FR-106）。

## Impact

- 產品檔案（3 個）：`annotation-workspace.data.js`（以共用 helper 取代 `getRecordPreviewText`，並讓 `resolveTaskProfile` 帶出 `list_title_field`）、`annotation-workspace.config.js`（三處呼叫點）、`annotation-list.html`（`getRecordSnippet` 改呼叫共用 helper）。
- 正典 015 於 archive 時寫回 v12.5.1 → v12.6.0（MINOR：純新增條文）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：摘要由欄位角色與值的形狀推導，不依任務類型或欄位名稱硬編（物件文字欄位沿用 specs/task-management/013-task-new/spec.md FR-002c-9 的「`text` 優先，否則第一個字串值」規則）。
- **Data Fairness（NON-NEGOTIABLE）**：Output 永不讀取（FR-106、AC-1.36）。
- **Simplicity First / YAGNI**：`annotation-list` 已載入 `annotation-workspace.data.js`，helper 放在該檔，不新增檔案；不做發言者前綴。
- **PR 規模（Principle X）**：產品檔案 3 個，預估 ≤ 120 行。

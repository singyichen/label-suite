---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1430
基準版本: 015 v12.12.0
目標版本: 015 v12.13.0
---

## Why

issue #1430 要把整合預覽「預填實體／三元組」的來源從寫死的鍵名（`entities`、`triples`、`gold_triplets`、`gold_triples`）改為由任務設定宣告。維護者已裁定（2026-10-20）：整合預覽只從 `prefill_fields` 宣告的欄位讀取；宣告的欄位仍須通過 #1413 的角色守門，且守門延伸到三元組；`prefill_fields` 缺鍵或子鍵缺漏視同 `null`（不預填）。

本 change 是 #1430 的第二個 change（015，讀取端），堆疊在第一個 change（013，設定鍵定義與帶出，specs/task-management/013-task-new/spec.md FR-002c-11，v8.7.0）之上。修訂 FR-107 第 16 點、對齊 AC-2.45／AC-2.48／AC-2.49，並新增 AC-2.50 ~ AC-2.53，屬 MINOR，不符合 Lightweight Path（新增 AC、動到 3 個以上關聯規格），走完整 OpenSpec change，因讀取契約改變附 `design.md`。

**是否需要存在（YAGNI 檢查）**：需要。第一個 change 只定義了鍵與帶出，讀取端若不改，鍵形同虛設，預覽仍依欄位名稱硬編讀取，違反 Generalization-First；維護者已明確裁定要做。

**Generalization-First（NON-NEGOTIABLE）**：預覽不再依固定鍵名預填，來源完全由設定宣告。

**Data Fairness（NON-NEGOTIABLE）**：宣告的欄位仍須通過角色守門（Output 或未知一律不預填），守門延伸到三元組，原本由鍵名 `triples`／`gold_triplets` 讀取 Output 欄位的外露路徑一併關閉。

**已知行為變化（需 reviewer 留意）**：

- T010 的 `triples` 欄位角色為 Output，依 Data Fairness 不宣告，預覽不再預填其三元組（原本由鍵名讀取）。
- task-new 精靈沒有設定 `prefill_fields` 的 UI（裁定不新增 UI），Step 2 預覽不再依欄位名稱預填實體與三元組；非物件陣列 Input 由 Output 欄位解析預填的既有路徑不變。
- 審核員端的 `scaffoldingEntities` 讀取不在本 change 範圍，維持不變。

**Frontend Ready Gate 九項紀錄**

1. 通過：015 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：015 Prototype Traceability 已連到 `annotation-workspace.html` 與對應測試；本 change 不新增 Traceability 列。
3. `N/A`：不新增 route 與畫面。
4. `N/A`：無 UI 狀態變化；唯一差異為預填來源（design.md D1～D3）。
5. `N/A`：無新增 `data-testid`；Red 以 `previewEntities`／`previewTriples` 狀態與頁面文字斷言。
6. 通過：讀取契約、角色守門與向前相容見 delta 與 `design.md`。
7. `N/A`：無新增文字。
8. `N/A`：無新增 shared 元件。
9. `N/A`：不改變導覽去向。

## What Changes

- **修訂 FR-107 第 16 點**：預填實體與預填三元組只從 `prefill_fields` 宣告的欄位讀取，移除固定鍵名；角色守門延伸到三元組；關係類型自動帶入同樣只認宣告的三元組欄位；移除「延後至 #1430」句；調整第 14 點的交叉引用。
- **修訂 AC-2.45、AC-2.48、AC-2.49**：Given 改為「由 `prefill_fields.entities` 宣告」，語意不變。
- **新增 AC-2.50 ~ AC-2.53**：宣告欄位被讀取且同名未宣告欄位被忽略、三元組套用守門、未宣告不預填、關係類型自動帶入只認宣告欄位。
- **既有規格同步**：釘住舊硬編鍵名行為的既有 Playwright 規格改為宣告 `prefill_fields`，或改斷言新契約（清單見 design.md D5）。
- **不處理（範圍外）**：Step 1 角色詞彙、任何新 UI 或畫面、既有「非物件陣列 Input 由 Output 欄位解析預填」路徑（FR-107 第 14 點、AC-2.45）、審核員端 `scaffoldingEntities`。

## Capabilities

- 修改：`annotation/015-annotation-workspace`（修訂 FR-107、AC-2.45、AC-2.48、AC-2.49；新增 AC-2.50 ~ AC-2.53）。

## Impact

- 產品檔案（3 個）：`task-config.engine.js`（預填讀取與關係類型候選）、`annotation-workspace.data.js`（任務設定帶出 `prefillFields`）、`annotation-workspace.config.js`（設定狀態接收）。
- 正典 015 於 archive 時寫回 v12.12.0 → v12.13.0（MINOR：修訂預填來源契約並新增 AC）。歷史 Changelog 列 12.12.0 不改寫。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：移除所有硬編鍵名讀取。
- **Data Fairness（NON-NEGOTIABLE）**：宣告欄位仍過角色守門，三元組一併納入，fail-closed。
- **Simplicity First / YAGNI**：以單一 helper 取代三處分散的鍵名讀取，不新增 UI。
- **PR 規模（Principle X）**：產品檔案 3 個，預估 ≤ 40 行；單一 PR。

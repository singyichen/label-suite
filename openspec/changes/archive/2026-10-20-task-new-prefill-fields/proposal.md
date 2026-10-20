---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #1430
基準版本: 013 v8.6.2
目標版本: 013 v8.7.0
---

## Why

issue #1430 要把整合預覽「預填實體／三元組」的來源從寫死的鍵名（`entities`、`triples`、`gold_triplets`、`gold_triples`）改為由任務設定宣告。#1413 已對 `entities` 加上角色守門（fail-closed），並在範圍外明確延後「預填來源改由設定宣告」至 #1430。維護者已裁定（2026-10-20）：新增任務設定鍵 `prefill_fields: { entities: <欄位|null>, triples: <欄位|null> }`，仿 `dialogue_fields`；整個鍵預設 `null`，缺少子鍵視同 `null`；預覽只從宣告的欄位讀取；宣告的欄位仍須通過 #1413 的角色守門。

本 change 是 #1430 的第一個 change（013，設定來源）；第二個 change（015，預覽改讀宣告欄位，堆疊其上）另案處理，兩者依「一個 change 一份正典」拆開。本單新增任務設定鍵與 FR／AC，不符合 Lightweight Path，走完整 OpenSpec change，並因設定鍵形狀新增附 `design.md`。

**是否需要存在（YAGNI 檢查）**：需要。沒有設定來源，工作區端只能繼續依欄位名稱硬編讀取，違反 Generalization-First；維護者已明確裁定要做。裁定同時明訂不新增任何 UI，故本 change 只定義鍵的形狀、預設、向前相容與 payload／種子帶出，不新增畫面。

**Generalization-First（NON-NEGOTIABLE）**：`prefill_fields` 是設定宣告的欄位對應，不依欄位名稱預填或硬編。

**Data Fairness（NON-NEGOTIABLE）**：宣告本身不改變欄位角色；讀取端（015，第二個 change）對宣告的欄位仍套用角色守門，角色為 Output 或未知一律不預填。

**Frontend Ready Gate 九項紀錄**

1. 通過：013 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：013 Prototype Traceability 已連到 `task-new.html` 與對應測試；本 change 另觸及 `task-detail.*`（014 載入端），不新增 Traceability 列。
3. `N/A`：不新增 route 與畫面。
4. `N/A`：無 UI；唯一狀態為鍵缺漏／子鍵缺漏，皆視同 `null`（design.md D2）。
5. `N/A`：無新增 `data-testid`；Red 以建立任務 payload 與種子資料斷言。
6. 通過：設定鍵形狀、預設與向前相容見 delta 與 `design.md` D1～D3。
7. `N/A`：無新增文字。
8. `N/A`：無新增 shared 元件。
9. `N/A`：不改變精靈與任務詳情的導覽去向。

## What Changes

- **新增 FR-002c-11**：任務設定鍵 `prefill_fields`（`{ entities: string | null, triples: string | null } | null`），指向資料列紀錄中存放預填實體與預填三元組的欄位；整個鍵預設 `null`，缺少子鍵視同 `null`；建立任務 payload MUST 帶此鍵；既有任務與種子缺少此鍵時視同 `null`。
- **新增 AC-1.15、AC-1.16**：AC-1.15 驗收預設與向前相容（建立任務 payload 為 `null`、缺鍵與缺子鍵視同 `null`）；AC-1.16 驗收宣告值由種子帶入任務詳情設定狀態。
- **新增 SC-002k**：建立任務 payload 帶 `prefill_fields`。
- **種子宣告**：T008 的 `entities` 欄位角色為 Evidence（非 Output），宣告 `prefill_fields: { entities: 'entities', triples: null }`；T010、T013 的對應欄位角色皆為 Output，依 Data Fairness 不宣告（維持 `null`）。
- **不處理（讀取端）**：整合預覽如何依 `prefill_fields` 讀取、角色守門延伸到三元組、移除硬編鍵名，全屬第二個 change（015），延後至 #1430 的第二個 PR。
- **不處理（範圍外）**：Step 1 角色詞彙、任何新 UI 或畫面、既有「非物件陣列 Input 由 Output 欄位解析預填」路徑（specs/annotation/015-annotation-workspace/spec.md FR-107 第 14 點、AC-2.45）。

## Capabilities

- 修改：`task-management/013-task-new`（新增 FR-002c-11、AC-1.15、AC-1.16、SC-002k）。

## Impact

- 產品檔案（4 個）：`task-new.html`（state 預設與 payload）、`task-detail.html`（任務資料載入與儲存帶出）、`task-detail.config.js`（設定狀態種子）、`task-detail.data.js`（T008 種子宣告）。
- 正典 013 於 archive 時寫回 v8.6.2 → v8.7.0（MINOR：新增選填任務設定鍵與 AC）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：預填來源由設定宣告，不硬編。
- **Data Fairness（NON-NEGOTIABLE）**：宣告不放寬角色守門；Output 欄位依裁定不在種子宣告。
- **Simplicity First / YAGNI**：不新增 UI、不新增偵測啟發式，沿用 `dialogue_fields` 的帶出模式。
- **PR 規模（Principle X）**：產品檔案 4 個，預估 ≤ 30 行；單一 PR。

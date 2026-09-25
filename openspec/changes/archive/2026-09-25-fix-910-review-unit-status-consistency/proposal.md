---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/910
基準版本: 6.16.2
目標版本: 6.17.0
---

## Why

issue #910 第二輪經維護者裁示收窄範圍：**不推翻 FR-044a／FR-053**（示範列 seed、雙條件空單位閘門皆維持原狀），只修兩個下游缺陷。

第一個缺陷與規格無關，純屬程式邏輯疏漏：審核員對同一審核單位重複送出同一決策（例如孤兒單位——受審標記員從未提交、僅有 FR-044a 示範列頂替——因 `getReviewUnitStatus()` 對此類單位恆回傳 `null`，`handleReviewSubmit()` 的 `lockedStatus === FINALIZED` 守衛永遠不觸發，單位因此永不鎖定）會在歷程（`entry.history`）再疊加一筆內容一模一樣的 `accepted`／`modified`／`bypassed` 事件，沒有任何阻擋。既有的 `appendHistoryEvent()`（issue #201/#583 double-submit guard）已對標記員的 `submitted` 事件做連續重複去重，但註解明載該比對範圍**明文排除**審核決策事件，審核路徑目前無等價保護。

第二個缺陷牽動正典既有文字：左欄 `reviewUnitState()`（`annotation-workspace.config.js:1545`）在無儲存提交時以 `|| 'pending'` 補上「示範列即代表標記員答案」的語意，頂部 `currentReviewUnitStatus()`／橫幅（`:3604`、`:4898`）沒有這個補位，null 時直接落到 `尚無標記提交`。正典 **FR-053**（`spec.md:775`，既有 MUST）其實已經明文規定「「真空」判定必須與 FR-064 橫幅顯示 `尚無標記提交` 的判定同源（`getReviewUnitStatus` 為 null **且** FR-044a 遞補列不存在），不得另行維護第二份判定」——也就是說 FR-064 的橫幅本來就該與 FR-053 的空單位閘門同源檢查示範列，但 **FR-064 第 2 點**（`spec.md:826`）本文只寫「標記員未提交時改顯示尚無標記提交」，漏了這個「且」的限定語，導致實作只落實了前半段。本變更**補齊**這段既有限定語（釐清，非推翻），並讓左欄與頂部改用同一個推導函式，不再各自維護一份判定。

兩者皆非新功能，是既有規格與既有去重先例的自然延伸；不觸及 API 契約或資料庫結構。

## What Changes

- 修訂 **FR-064 第 2 點**：在「標記員未提交時改顯示 `尚無標記提交`」後補上限定語——存在 FR-044a 遞補列時視為已有標記員答案（沿用 FR-053 既有「同源判定」之字面定義），此時三態 pill 顯示 `pending`（`待審`），不落到 `尚無標記提交`。
- 工作區左欄 `reviewUnitState()` 與頂部橫幅（`buildReviewUnitContext()` 消費之 `unitStatus`）改共用同一個推導：非 null 直接採用；null 時比照既有 `reviewUnitBlockReason()`（`:3630`，本次不修改）之判定查詢示範列（FR-044a），有則視為 `pending`，否則維持 `null`（真空，`尚無標記提交`，與空狀態卡一致）。
- 審核決策事件（`accepted`／`modified`／`bypassed`）之寫入（`appendReviewDecisionEvents()`／`appendHistoryEvent()`）新增以 `outKey` 為比對單位的連續重複去重：泛化既有 `appendHistoryEvent()` 的 double-submit guard（issue #201/#583），比對範圍從僅認 `submitted` 事件擴及審核決策事件，比對鍵為「同一 `outKey` 的上一筆事件」而非陣列最後一筆（避免同一次送出寫入多個不同 `outKey` 事件時互相誤判為重複），並比對 `action`／`role`／`actorId`／`reason`／該 outKey 之修正值皆相同才視為重複而捨棄，內容有實質差異（例如修正值改變）之重複送出仍照常記錄。

**不變更**：FR-053 之雙條件空單位閘門判定式、FR-044a 之遞補語意、`reviewUnitBlockReason()`（`:3630`）與 `handleReviewSubmit()`（`:5104`）現行的 `!demoAnnotatorRow()` 豁免、`issue-307-empty-review-unit-gate.spec.ts` 既有正向斷言。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `annotation/015-annotation-workspace`：FR-064 第 2 點文字修訂（補齊示範列限定語）；審核決策事件寫入路徑新增去重規則（不新增獨立 FR，屬既有 FR-016B append-only 與既有 double-submit guard 先例的實作層修正，若最終判定需要新 AC 才落 FR-064 或新設 FR-100 區段的 delta，於 specs 階段依實際比對結果決定）。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`reviewUnitState()`、`currentReviewUnitStatus()` 消費處（新增共用推導函式）。
- `design/prototype/pages/annotation/annotation-workspace.data.js`：`appendHistoryEvent()`、`appendReviewDecisionEvents()`（新增 outKey 去重）。
- `specs/annotation/015-annotation-workspace/spec.md`：FR-064 第 2 點文字修訂、版本 bump、Changelog。
- 新增 Playwright 契約測試（`design/prototype/tests/annotation/`）。
- 不影響 API 契約、DB schema、其他模組。

## Constitution Check

- **Generalization-First**：兩處修正皆為既有推導函式的邏輯修正／共用化，不引入任何任務專屬硬編邏輯，`outputs[]` 驅動的既有架構不變。
- **Data Fairness**：不變更 FR-044a 遞補來源限定（仍為 `REVIEWER_MOCK_ROWS` 且不得由答案欄位帶入），不新增任何可能造成測試集答案外洩的路徑。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。

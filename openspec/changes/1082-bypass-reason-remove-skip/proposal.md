---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1082
基準版本: 9.1.1
目標版本: 10.0.0
---

## Why

標記卡尾端的「無法判定 (Bypass)」勾選項（`specs/task-management/013-task-new/spec.md` FR-003j，`OutputAnswer.bypass`，由 `allow_bypass` 控制）與底部列的「跳過理由（必填）＋跳過」控件（015 FR-089，`skipped` 歷程事件）語意重疊：單一輸出類型任務下，「勾 Bypass 後提交」與「填理由後跳過」對標記員幾乎是同一個動作，介面卻無任何說明區分。

追溯來源後確認「跳過」按鈕並非來自任何使用情境需求：issue #578 把歷程 `action` 常數化時，原型 CSS 已有 `.history-action-badge.skipped` 死碼，FR-086 要求 `HISTORY_ACTIONS` 每個值都要有產生點，才在 commit `a422e1f2`（2026-08-31）新增這顆按鈕作為 `skipped` 的產生點——在那之前原型沒有跳過按鈕。015 規格也從未定義「跳過」的使用情境（何時該跳過而非 Bypass、跳過後樣本如何回流、審核員是否看得到跳過理由）。

更關鍵的落差是理由的去向：FR-089 理由必填的動機是「理由是指出標記指引該修哪裡的直接證據」，但跳過不會提交、不進入審核單位，審核員看不到跳過理由；真正會進入審核單位的 Bypass 答案，反而沒有理由欄位，審核員看到 Bypass 時不知道原因。

維護者裁示（2026-10-01，issue #1082 本文）：**理由欄位移到 Bypass 上，底部跳過功能完整移除。** 本次不新增「跳過」的替代機制；若日後有真實需求，另開 issue 處理，不在本次範圍內保留。

## What Changes

- **MODIFIED FR-089**（動作理由必填）：列舉之「標記員跳過（`skipped`）」整句改為「標記員無法判定（`OutputAnswer.bypass`）」；理由持久化路徑由原本獨立的 `skipped` 歷程事件，改為標記員提交 payload 之一部（逐 outKey，隨 `submitted` 事件之 `reason` 寫入）；本條原有「跳過動作本身之定義」（入口可見性、FR-013A 三態可用條件、不改變樣本狀態、導覽重用 FR-022A／FR-022C）整段移除，因跳過動作本身已不存在。審核側（`modified`、`bypassed`）之理由持久化路徑（FR-016A `reasons` map）不變。
- **MODIFIED FR-086**（歷程動作常數化）：`HISTORY_ACTIONS` 自九值改為**八值**，移除 `skipped`；`ACTION_LABEL`（`design/prototype/pages/shared/annotation-history.js`）同步移除「已跳過」對應鍵。既有 `skipped` 事件依本條既有「集合外值以中性徽章呈現且以英文原值顯示」通則處理（不落入 `rejected`／`saved` 之例外清單），歷史事實不因模型改版而失真、不遷移、不改寫。一併修訂關鍵實體 `AnnotationHistoryItem` 之 `action` 列舉（移除 `skipped`）。
- **MODIFIED FR-101**（標記員定稿鎖定）：鎖定生效時保留在畫面上並套用 `disabled`＋`aria-disabled` 的控件，由三個（`wsSkipBtn`、`wsSaveBtn`、`wsSubmitBtn`）改為兩個（`wsSaveBtn`、`wsSubmitBtn`）——`wsSkipBtn` 隨跳過功能整組移除，不再存在於 DOM。
- **MODIFIED AC-2.27**（對應 FR-101）：Given/When/Then 中列舉之三個鎖定控件改為兩個，移除 `wsSkipBtn` 子句。
- **MODIFIED AC-2.20**（對應 FR-089）：情境主體由「標記員點擊跳過、理由必填」改寫為「標記員勾選 Bypass、理由必填」——未填理由即嘗試送出時，送出被阻擋、理由欄位下方出現行內錯誤訊息並指名缺理由的 outKey、同時顯示警告 toast，該筆提交未送出（亦不產生 `submitted` 事件）；填寫理由後送出成功，`submitted` 事件之 `reason` 含該 outKey 之理由；多輸出類型任務下，每個已勾選 Bypass 的 outKey 各自獨立判定、理由不互相替代。
- **MODIFIED FR-092**（審核員三向決策）：新增一點——審核卡之「無法判定 (Bypass)」答案值 chip（`ws-review-original-answer`，`originalIsBypass` 分支）旁必須顯示該 outKey 對應之標記員 Bypass 理由；理由來源為標記員提交 payload（FR-089 新持久化路徑），未填理由之舊資料（本次變更以前寫入，若有）顯示為缺值、不得報錯、不得補寫推估理由。
- **ADDED AC-2.29**（對應 FR-089／UXC-04／UXC-05）：勾選 Bypass 瞬間不顯示錯誤，理由輸入框於同一列（`.preview-bypass-row`）向右展開；未勾選時不渲染；取消勾選時欄位收起並清空已填內容；開始輸入即清除既有行內錯誤；已填寫時欄位下方顯示說明文字（理由會隨提交寫入歷程，審核員可見）；多輸出類型任務下每個 outKey 之理由欄位各自獨立展開／收起，不互相干擾。
- **ADDED AC-3.66**（對應 FR-092）：審核卡／仲裁版面顯示標記員 Bypass 答案之 outKey，其「無法判定 (Bypass)」chip 旁必須顯示該 outKey 對應之理由文字；理由為空（本次變更以前寫入之舊資料）時該區塊不渲染理由文字，不得顯示空字串或報錯。

**介面**（不新增 FR/AC 之純畫面落點，記錄於此供 Green 階段對照）：底部列完整移除 `#wsSkipGroup`；「無法判定 (Bypass)」勾選項維持在標記卡尾端的 `.preview-bypass-row`，位置與樣式不變；勾選後標籤區比照現行行為淡化停用（既有行為不變）。

**不變更**：013 `allow_bypass` 契約、`REVIEW_DECISIONS` 審核決策三向語彙、FR-016A 審核側理由持久化路徑、AC-3.60（答案值與決策值語彙分離，字面不受影響）、`.preview-bypass-row` 所在之共用引擎 `task-config.engine.js`（`makeBypassChip()`／`appendBypassControl()`）本身——理由欄位改由 annotation-workspace 之既有「消費端於此列掛自己的尾端控件」patch 層（`patchBypassChip()`，`annotation-workspace.config.js:583-596`）掛載，不觸及 task-management 之 task-new 預覽面板既有行為。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `annotation/015-annotation-workspace`：MODIFIED FR-089、FR-086、FR-101、AC-2.27、AC-2.20、FR-092；ADDED AC-2.29、AC-3.66。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.html`：移除 `#wsSkipGroup`（`#wsSkipReason`／`#wsSkipBtn`）及其 CSS（`#wsSkipBtn[data-submit-blocked]` 等）。
- `design/prototype/pages/annotation/annotation-workspace.config.js`：移除 `skipReasonText()`／`refreshSkipBlocker()`／`renderSkipControl()`／`handleSkip()` 與其事件綁定（`wsSkipBtn` click、`wsSkipReason` input）；`setControlLocked('wsSkipBtn', ...)` 呼叫隨 FR-101 修訂移除；`patchBypassChip()` 新增逐 outKey 理由輸入框之掛載與展開／收起；`collectAnswerPayload()` 新增 `bypassReasons` 欄位（逐 outKey）；`handleSubmit()` 新增送出前驗證（已勾選 Bypass 但理由空白時阻擋＋行內錯誤＋toast）；`appendCorrectionControl()` 之 `ws-review-original-answer` 區塊新增理由顯示。
- `design/prototype/pages/annotation/annotation-workspace.data.js`：`markSampleSubmitted()` 之 `submitted` 事件新增 `reason` 欄位（來源為 payload 之 `bypassReasons`，逐 outKey 組字串，格式比照既有 `buildHistorySummary()` 慣例）；整段移除 `markSampleSkipped()`。
- `design/prototype/pages/shared/annotation-history.js`：`HISTORY_ACTIONS` 移除 `skipped`；`ACTION_LABEL` 移除「已跳過」鍵。
- 新增中英文 i18n 字串（Bypass 理由欄位 placeholder／helper text／行內錯誤／toast）；移除 `skipNeedsReason`／`skipSuccess` 等跳過專用 i18n 字串（若移除後不再被任何呼叫消費）。
- 測試：移除跳過相關案例（`issue-578-reason-required.spec.ts` 等涉及跳過之案例，詳見 tasks.md）；新增 `design/prototype/tests/annotation/annotation-workspace-bypass-reason.spec.ts`；`inventory.csv` 依 `design/prototype/README.md` Test Policy 退列（移除）與新列（新增，`decision=keep`，追溯標註本次新增之 FR／AC id）。
- `specs/annotation/015-annotation-workspace/spec.md`：版本 9.1.1 → **10.0.0（MAJOR）**，Changelog 新增一列；`specs/STATUS.md` 同步更新。
- 不影響 API 契約、DB schema、後端／前端正式程式碼（`frontend/**`、`backend/**` 範圍外）。

## Constitution Check

- **Generalization-First**：理由欄位之掛載與驗證沿用既有「逐 `state.selectedOutputTypes` 之 outKey」通用迴圈（`collectAnswerPayload()`、`buildHistorySummary()`、`patchBypassChip()` 既有模式），不新增任何任務 ID 或輸出類型專屬分支；審核卡理由顯示沿用既有 `ws-review-original-answer` 之逐 outKey 迴圈。
- **Data Fairness**：理由欄位為標記員自填之主觀說明文字，不讀取、不顯示、不推導任何 ground-truth 或 gold 欄位；移除跳過功能不影響任何測試集答案揭露面。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。
- 本次為 **MAJOR** 版本升級：FR-089 之受規範主體由「標記員跳過」整句替換為「標記員無法判定」，且 `HISTORY_ACTIONS` 自九值改為八值（移除 `skipped`）——推翻既有 FR 字面之受規範行為，依本專案既有分級慣例（參照 v9.0.0、issue #1053 前例）定為 MAJOR。維護者裁示已寫在 issue #1082 本文（2026-10-01），MAJOR 停點已預先滿足。

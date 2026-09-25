---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/908
基準版本: 6.18.0
目標版本: 6.19.0
---

## Why

issue #908 要求：已定稿（`REVIEW_UNIT_STATUS = finalized`）的 `official_run` 審核單位，標記員自己的後續寫入不得再使該單位翻回 `爭議中`（FR-051 已定義 `finalized` 為終態，但目前只有寫入側的審核決策路徑守著這條終態邊界，標記員自己的 `markSampleSubmitted`／`markSampleSaved`／`appendSampleTimelineEvent` 三個寫入點完全沒有守衛）。

維護者第二輪裁示（2026-09-25）進一步收斂了觸發條件：**定稿鎖只對「該受審標記員存在真實已提交紀錄」的單位生效，不是只看單位狀態為 `finalized`。** 理由是 FR-044a 已裁定保留（示範列是標記員答案的合法 seed 來源），但示範列 seed 頂替出的審核單位，其對應標記員本人可能從未真正提交過——對一個從未提交的人顯示「你的標記已定稿」是假訊息。這一點必須寫成條文，否則下一個人讀 AC 會以為鎖對所有 `finalized` 單位生效。

程式面追蹤這個約束的落點是 `getReviewUnitStatus()`（`annotation-workspace.data.js:2228`）本身：其判定式第一句已是「`getSubmission(taskId, 'annotator', runType, sampleId, identity)` 為空 → 直接回傳 `null`」——`null` 不等於 `finalized`。這代表只要本次新增的寫入守衛直接沿用（或等價於）`getReviewUnitStatus()` 做判定，而不是另外發明一套「檢查是否存在審核決策」的捷徑，「存在真實已提交紀錄」這個前提就是結構性地自動成立，不需要另外寫一份判定邏輯，也不會有第二個真相來源可能與 `getReviewUnitStatus()` 打架。

維護者同時裁定：`FR-072` 第 3 點目前列舉「標記員重新提交」為會改變審核單位狀態、需要重新推導覆蓋率的操作之一；但依本次新增的 `FR-051` 終態鎖定，已定稿單位的標記員寫入會被直接擋下、不產生任何狀態變更，因此該點需要限定語「未定稿審核單位」——這是既有 MUST 的必要澄清，不是推翻。

## What Changes

- 新增 **FR-101**（對應新增 **AC-2.27**）：`official_run` 已定稿審核單位之標記員定稿鎖定。明文寫入觸發條件——鎖定僅在「受審標記員存在真實已儲存提交」（即 `getReviewUnitStatus()` 判定式首句成立）時生效；僅由 FR-044a 示範列遞補、標記員本人無真實提交的單位，其 `getReviewUnitStatus()` 恆為 `null`，不觸發本條鎖定，標記員之首次提交必須正常送出。`dry_run` 不受影響（`submissionBucketKey()` 無 round 維度）。守衛加於 `markSampleSubmitted()`、`markSampleSaved()`、`appendSampleTimelineEvent()`（`annotation-workspace.data.js`）三個標記員寫入點，寫入前判定已定稿時回傳 `false` 且不產生任何寫入；outKeys 由 `resolveTaskProfile(taskId).outputs`（`annotation-workspace.data.js:51`）內部推導，三個函式既有簽章不變。畫面呈現：鎖定提示 banner（`ws-annotator-finalized-notice`，資訊色、非錯誤色）、`wsSkipBtn`／`wsSaveBtn`／`wsSubmitBtn` 保留在畫面但套用原生 `disabled`＋`aria-disabled`、作答控制維持可辨識（不整排轉灰）、自動儲存狀態列改文案「已定稿，不再自動儲存」。不引入任何定稿快照（沿用 FR-072(3) 既有之讀取時計算、不快取），不新增任何一般解鎖入口。
- 修訂 **FR-072 第 3 點**：把其中列舉的「標記員重新提交」限定為「未定稿審核單位之標記員重新提交」——已定稿單位的標記員寫入依新增 FR-101 之守衛直接阻擋，不產生狀態變更，故不在本點「改變審核單位狀態的操作」之列。該點「推導為讀取時計算、不快取」之既有原則維持不變。

**不變更**：FR-044a 之遞補語意、FR-053 之雙條件空單位閘門判定式、FR-051 判定式本身、`getReviewUnitStatus()` 之既有邏輯、FR-072(3)「不快取」之既有原則、`issue-307-empty-review-unit-gate.spec.ts` 與 `issue-910-review-unit-status-consistency.spec.ts` 既有正向斷言、任何審核員／仲裁者側之既有寫入路徑（FR-094／AC-3.39 已規範，不屬本次範圍）。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `annotation/015-annotation-workspace`：新增 FR-101（標記員定稿鎖定）與 AC-2.27；修訂 FR-072 第 3 點文字（補上「未定稿單位」限定語）。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.data.js`：`markSampleSubmitted()`、`markSampleSaved()`、`appendSampleTimelineEvent()` 新增寫入前守衛（回傳 boolean）；新增一個內部判定 helper（沿用 `getReviewUnitStatus()` + `resolveTaskProfile()` 推導 outKeys）。
- `design/prototype/pages/annotation/annotation-workspace.config.js`：`handleSave()`／`handleSubmit()`／`handleSkip()` 依三個寫入函式的回傳值分流（鎖定時顯示錯誤 toast、不清空未儲存狀態、不導頁）；`renderWorkspace()` 新增鎖定提示渲染與控件禁用；`renderAutosaveStatus()` 新增鎖定分支文案；新增中英文 i18n 字串。
- `specs/annotation/015-annotation-workspace/spec.md`：新增 FR-101、AC-2.27；修訂 FR-072 第 3 點；版本 bump 至 6.19.0，Changelog 新增一列。
- 新增 Playwright 契約測試（`design/prototype/tests/annotation/`）。
- 不影響 API 契約、DB schema、審核員／仲裁者側既有行為、其他模組。

## Constitution Check

- **Generalization-First**：守衛沿用既有 `getReviewUnitStatus()` 之通用推導與 `resolveTaskProfile(taskId).outputs` 之既有 outputs[] 契約，不新增任何任務 ID 或輸出類型專屬分支；作答控制之禁用採跨輸出類型通用的 DOM 屬性設定，不逐型別各自實作。
- **Data Fairness**：不變更 FR-044a 遞補來源限定，不新增任何可能造成測試集答案外洩的路徑；鎖定判定本身不讀取或顯示任何額外的 gold 欄位。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。

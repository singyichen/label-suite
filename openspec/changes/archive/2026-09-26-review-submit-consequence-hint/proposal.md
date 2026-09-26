---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/930
基準版本: 7.1.0
目標版本: 7.3.0
---

## Why

issue #930 回報：審核員在試標（`dry_run`）選「通過」並送出，會讓該審核單位直接定稿——高風險動作——但送出鈕旁沒有任何後果說明；送出後畫面只顯示「審核已送出」toast，接著靜默跳到下一筆，審核員完全無法在動手前得知這一步會造成什麼結果。

正典現有的 `FR-070`（`ws-review-note`）已規範一段固定的說明泡泡，逐字陳述通過／修正／無法裁決三向決策的真實效果，且依 `run_type` 分流（issue #550／#596）。但該說明有三個與本 issue 訴求不符的性質：(1) 它是**單一審核單位恰渲染一次的靜態文字**，內容涵蓋全部三向決策，**不會依審核員當前實際選了哪個決策而切換**；(2) 它掛在 `?` 觸發鈕之後、需要點擊才會展開（`role="tooltip"`），**不是**貼在送出鈕旁隨時可見的一行字；(3) 它渲染於 `ws-review-unit-context` 橫幅內，與 `ws-review-submit-btn`（固定 footer）、`ws-review-quick-submit-btn`（決策列，issue #926／#927／#928）兩個送出入口在 DOM 位置上都不相鄰。issue #930 的訴求——「送出鈕旁、依所選決策切換的一行後果提示」——是 FR-070 未涵蓋的新使用者可見行為，需新增 FR。

**`dry_run` 與 `official_run` 的後果差異**（已對照 `getReviewUnitStatus()`／`FR-092`／`FR-051` 查證，非假設）：兩種 `run_type` 的**狀態機分流規則完全一致**——全部 outKey 決策皆為 `approve` 時單位推導為 `已定稿`，任一為 `modify`／`bypass` 時單位推導為 `爭議中`（FR-051）。差異只在於「已定稿」這個狀態本身的意義：`official_run` 的定稿值即成為最終答案（gold，FR-063）；`dry_run` 的定稿不產生任何最終答案，只彙總一致性與被修改率（FR-063 第 3 點，FR-070 既有措辭 `reviewNoteDryRunExtra`）。issue 標題所稱「試標會讓單位直接定稿」在資料模型層面對兩種 `run_type` 皆成立且規則相同——`dry_run` 並非特例規則，而是「定稿」在其上意義較輕（不產生答案）。本次新增之後果提示文字必須忠實反映這一點：**通過**與**修正／無法裁決**兩個分支的推導規則兩種 `run_type` 一致，僅「已定稿」分支的文字依 `run_type` 分流一句話（沿用 FR-070 既有的 `reviewNoteDryRunExtra` 措辭精神）。

**分類判定：完整 OpenSpec change flow**。本變更新增使用者可見行為（送出鈕旁即時切換的後果提示）與對應新測試點，`specs/annotation/015-annotation-workspace/spec.md` 現行條文（FR-070／FR-092／FR-051）未涵蓋此行為，需新增 FR 與 AC，不符合 Lightweight Path「不新增 FR/AC，只澄清」之條件，依 CLAUDE.md 走完整流程。

**分級為 MINOR**：本次僅新增 FR-102 與兩個新 AC（AC-3.64、AC-3.65），不修改、不撤銷任何既有 FR/AC 之 MUST 敘述——FR-070 之既有 tooltip、FR-092 之三向決策集合、FR-051 之狀態機皆維持不變，僅被本次新增之提示文字**引用**其推導結果，不重新定義。未觸及既有需求之移除，不構成 MAJOR，不需要額外的維護者授權。

**兩個送出入口是否都要加後果提示（issue 原文僅要求「送出鈕旁」，本節記錄本次判定與理由）**：**採兩者皆加**。`ws-review-submit-btn`（固定 footer）與 `ws-review-quick-submit-btn`（issue #926／#927／#928 新增之決策列送出鈕，`buildReviewQuickSubmit()`）呼叫的是同一個 `handleReviewSubmit()`，是同一個高風險動作的兩個對等入口。若只在其中一個入口旁加後果提示，從另一個入口送出的審核員完全拿不到警示，等同沒解掉 issue 描述的問題——這正是本 issue 派工指示明文點出、要求判斷的落差。兩處提示的文字**共用同一份推導與同一組 i18n 來源**，不另立第二套判定（見下方 What Changes）。

## What Changes

- 新增 **FR-102（送出前即時後果提示）**：於 `annotation-workspace` reviewer 視角、可互動審核單位（FR-070 既有排除範圍：仲裁版面、已定稿唯讀卡、空審核單位皆不渲染）的兩個送出入口——`ws-review-submit-btn`（固定 footer）與 `ws-review-quick-submit-btn`（決策列，可見時）——旁各渲染一行**恆常可見**（非 tooltip、不需點擊展開）之後果提示文字（testid 分別為 `ws-review-submit-consequence`、`ws-review-quick-submit-consequence`），依審核員**目前尚未送出**的草稿決策即時切換：
  1. 該單位全部 outKey 皆已決策且皆為 `approve` → 顯示「送出後即定稿」文字，`official_run`／`dry_run` 依 FR-070 既有措辭精神分流（前者「成為最終答案」，後者加註「不產生最終答案，僅計入一致性統計」）。
  2. 任一 outKey 之決策為 `modify` 或 `bypass` → 顯示「送出後進入爭議池，待仲裁定案」，兩種決策文字相同（FR-092：兩者對單位狀態的效果相同，皆使單位推導為 `爭議中`），不得為兩者分別編造不同文字。
  3. 尚未完成全部決策、且已選定的決策中沒有第 2 點之爭議性決策 → 顯示中性的「尚未選擇決策」提示。
  4. 上述推導**必須重用** `FR-051`／`FR-092` 既有的「任一非 `approve` 決策即判定該單位为 `爭議中`、全部 `approve` 才判定為 `已定稿`」規則（`getReviewUnitStatus()`／`anyReviewerChanged()` 的草稿版等價判定），**不得**另建第二套「approve+dry_run=已定稿」之類的對照表。
  5. 兩個送出入口之文字內容與推導**同源**（同一份計算、同一組 i18n 鍵），不得其中一個入口用另一套邏輯或另一份文案。
  6. 決策切換（含改答案導致既有決策被重置、切換至另一個決策）時，本提示必須即時跟著切換，不需重新整理頁面。

## Capabilities

### New Capabilities

- `annotation/015-annotation-workspace`：新增 FR-102 送出前即時後果提示。

### Modified Capabilities

無——FR-070／FR-092／FR-051 皆未修改，僅被引用。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderReviewerWorkspace()`（約 :5306）、`buildReviewQuickSubmit()`（約 :3358）新增後果提示元素與其 `reviewDecisionRefreshers` 掛載；新增一個小型純函式計算「若現在送出，此單位會被推導為哪個 `REVIEW_UNIT_STATUS`」，重用既有草稿狀態（`reviewRowDecisions`、`state.selectedOutputTypes`）與既有推導規則，不讀寫任何新的持久化欄位。
- `design/prototype/pages/annotation/annotation-workspace.html`：`.action-bar-right` 內 `wsReviewSubmitBtn` 旁新增一個靜態占位元素（預設 hidden，由 JS 依既有五個非互動分支鏡射其可見狀態）。
- i18n：zh/en 各新增 4 個字串鍵（見 tasks.md）。
- `specs/annotation/015-annotation-workspace/spec.md`：新增 FR-102、AC-3.64（固定 footer 提示依決策與 run_type 即時切換）、AC-3.65（決策列送出鈕之提示與 footer 同源同步）；版本 7.1.0 → 7.3.0（實際號碼由主 session 於合併時依實際順序指派），Changelog 新增一列。
- 新增 Playwright 契約測試 `design/prototype/tests/annotation/issue-930-submit-consequence-hint.spec.ts`。
- 不影響 API 契約、DB schema、annotator 側行為、其他模組。

## Constitution Check

- **Generalization-First**：後果文字推導僅讀取 `REVIEW_DECISIONS` 既有三向詞彙值與 `run_type`，不新增任何任務 ID 或輸出類型專屬分支；`modify`／`bypass` 共用同一文字亦是重用既有 FR-092 對兩者效果之定義，非另立分流。
- **Data Fairness**：不涉及測試集答案外洩路徑，僅為審核員自身送出前的提示文字。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。

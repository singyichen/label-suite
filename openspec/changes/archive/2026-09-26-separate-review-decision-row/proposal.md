---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/926, https://github.com/singyichen/label-suite/issues/927, https://github.com/singyichen/label-suite/issues/928
基準版本: 6.21.1
目標版本: 6.22.0
---

## Why

2026-09-24 以 Impeccable＋uxaudit 試跑審視審核員工作區（T015、reviewer_wang）產出三張 issue，共同指向同一塊版面——審核卡尾端的「答案 Bypass 列 + 決策列」：

- **#926**：決策按鈕（`ws-review-row-approve/modify/bypass`）是全卡最小的控制項（實測 59.7×22px = 1313px²），而答案值 chip（實測 107.9×44.5px = 4800px²）與「無法判定 (Bypass)」chip（162.5×39px = 6343px²）都比它大 3.7～4.8 倍，觸控目標也低於 WCAG 2.5.5 的 44px 建議值。
- **#927**：答案值「無法判定 (Bypass)」（`OutputAnswer.bypass`）與決策值「無法裁決」（`REVIEW_DECISIONS.bypass`）並排同一列，兩個概念雖已於 2026-09-18 定案為獨立語彙（issue #811, FR-092 v6.8.0），版面上仍容易混淆。
- **#928**：「送出審核」按鈕距離決策列約 389px（實測，1440×900），每審一筆都要做一次長距離移動。

三者的共同根因是同一段標記——`dockDecisionsOnBypassRow()` 把決策按鈕（`.rv-choice-group`）掛進共用引擎渲染的 `.preview-bypass-row` 內，與答案值 Bypass chip 同列。這不是實作疏漏：正典 **FR-014P(2)** 與 **FR-053** 明文要求決策按鈕「掛載於…Bypass 列…右側」，因此修正 #927 必須改動這兩條的呈現契約字面，不是單純樣式調整，故本次採完整 OpenSpec change（非 Lightweight Path）。

三張議題合併為一支 PR：單一目的可用一句話涵蓋——「讓審核決策列成為審核卡的主要動作區、並與答案區明確分隔」，分開處理會在同一段標記上連續衝突三輪。

## What Changes

- **拆分決策列**（解 #927，同時是 #926 的前提）：`buildRowDecisionButtons()`／`buildMergedSpanReviewRow()` 產生的決策按鈕群組不再由 `dockDecisionsOnBypassRow()` dock 進 `.preview-bypass-row`；改為直接附加到既有的 `.rv-decision-row`（此 class 目前僅用於 `allow_bypass:false` 的備用情境，本次升級為唯一、一律使用的決策列容器），以 `correction` 面板的 sibling 型態掛在 `row` 上（與既有 `buildReviewReasonField()` 的掛法一致），不再受共用引擎重繪 `.preview-bypass-row` 影響。移除 `dockDecisionsOnBypassRow()` 與其 `MutationObserver`（重掛機制不再需要）。
- **決策列視覺主角化**（解 #926）：`.rv-decision-row` 內的 `.rv-choice-group`／`.rv-merged-decision` 與其 `.mini-btn` 改為全寬分段控制、`min-height: 44px`，選用祖先選擇器 `.rv-decision-row .mini-btn` 限定範圍——刻意不修改 `.mini-btn` 基底規則，因為該 class 亦被仲裁選擇按鈕與例外池處置按鈕（issue #907 範圍）共用。全程沿用既有 `--space-*`／`--radius-md` token，不寫死色值、不發明新 token。
- **決策完成後就近呈現送出**（解 #928）：既有 `#wsReviewSubmitBtn`（`.action-bar` 內、右對齊契約受 issue #563 等既有測試鎖定）位置不動。改在決策列之後新增一個「快速送出」按鈕（新 testid `ws-review-quick-submit-btn`），文案沿用既有 i18n key `reviewSubmitLabel`（不新造文案），點擊呼叫既有 `handleReviewSubmit()`（同一函式，非第二套邏輯），可見性沿用既有 `pendingReviewOutputKeys(...).length === 0` 判準（決策全數完成才顯示），透過既有 `reviewDecisionRefreshers` 掛入即時刷新。
- **不採用** issue #926 例示的「答案 chip 於未選修正前降為中性」——確認為示例而非獨立驗收條件，且會牽動未在本次 Red 測試範圍內的既有著色邏輯，風險/效益比不佳；改以「決策列全寬 44px 主角化＋版面明確分區」滿足視覺層級要求。
- 既有測試 `annotation-workspace-reviewer.spec.ts` 4 處斷言「決策按鈕掛在 `.preview-bypass-row`」的前提位移為「掛在 `.rv-decision-row`」，選擇器同步更新（非刪除，PR body 附理由）；同檔另 2 處斷言實際 Bypass 答案切換按鈕的用例不受影響。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `annotation/015-annotation-workspace`：修訂 FR-014P(2)(3)(4)、FR-053 呼應句之呈現契約字面，並於 FR-014P 新增第(5)(6)點（決策列視覺面積/觸控目標、決策完成後鄰近送出），新增對應驗收情境；正式 AC 編號於 archive 階段依當時正典最新編號指派。FR-014B（三向控件行為、testid、文案來源）不修訂——只有尺寸與掛載位置改變，行為契約不變。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`buildRowDecisionButtons()`、`buildMergedSpanReviewRow()`、`buildReviewRow()`、移除 `dockDecisionsOnBypassRow()`，新增 `buildReviewQuickSubmit()`。
- `design/prototype/pages/annotation/annotation-workspace.html`：`.rv-decision-row`／`.mini-btn`／`.rv-choice-group`／`.rv-merged-decision` 相關 CSS 規則新增與清理（移除 `.preview-bypass-row > .rv-choice-group` 等已失效選擇器）。
- `specs/annotation/015-annotation-workspace/spec.md`：FR-014P、FR-053 文字修訂，新增對應驗收情境（正式編號於 archive 階段指派），版本 bump、Changelog。
- 新增 Playwright 契約測試（`design/prototype/tests/annotation/`），更新既有 `annotation-workspace-reviewer.spec.ts` 4 處選擇器。
- 不影響 API 契約、DB schema、其他模組。

## Constitution Check

- **Generalization-First**：決策列容器化與快速送出按鈕皆重用既有 `REVIEW_DECISIONS`／`pendingReviewOutputKeys()`／`handleReviewSubmit()` 既有的、config-driven 的判準與函式，不引入任何任務專屬硬編邏輯。
- **Data Fairness**：不涉及任何答案來源或測試集資料路徑變更。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。

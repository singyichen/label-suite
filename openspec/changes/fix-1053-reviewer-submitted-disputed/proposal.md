---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1053
基準版本: 8.1.0
目標版本: 8.2.0
---

## Why

`role=reviewer` 的審核員對某審核單位提交過審核決策（`decisions`／修正值／理由皆已寫入）後，若該單位因與其他審核意見不一致而進入 `爭議中`，這位**當事審核員**（非仲裁者，即 `isArbiterCandidate()` 為 `false`）重新開啟工作區時，畫面與「這筆單位我還沒審過」完全相同：直接修正面板回填**標記員原答案**而非審核員自己的修正值、三顆決策鈕（通過／修正／無法裁決）皆未選取、裁定理由欄空白，且「送出審核」可直接按下。頂端進度條雖已把這筆算進「已提交」，畫面卻毫無反映，誤按送出會無聲覆寫審核員自己原本已送出的決策與理由。

根因兩處（維護者已實測確認，行號已由主 session 覆核與現況一致）：`reviewUnitBlockReason()`（`design/prototype/pages/annotation/annotation-workspace.config.js:3883`）唯一攔截爭議中單位的分支是 `:3889` 的 `ARBITRATION`（僅適用具仲裁資格者，即 `isArbiterCandidate()`，`annotation-workspace.data.js:2579`），當事審核員恆落回函式尾端 `return null`（互動版面）；即使補上攔截，`seedReviewRow()`（`:3693`）也無條件以呼叫端傳入的 `submission`（標記員提交）播種修正面板，從未檢查審核員自己是否已有一筆不同的提交——這正是修正面板回填 `neutral`（標記員原答案）而非 `positive`（審核員修正值）的直接原因。

維護者已確認採用方案 A（唯讀摘要 ＋ 明確改判入口），本 change 依方案 A 落地。

**分類判定：不符 Lightweight Path，走完整 OpenSpec change flow**——本變更新增 FR（FR-103）與 AC（AC-4.81），非僅澄清既有條文。

**單一目的判斷**：單一句描述——「當事審核員重入自己已送出的爭議中審核單位時，預設呈現唯讀摘要而非可誤觸送出的空白審核卡」。不拆分。

## What Changes

- 新增 `REVIEW_UNIT_BLOCK.SUBMITTED_DISPUTED`：`reviewUnitBlockReason()` 在既有 `ARBITRATION` 分支之後，新增判定「單位為爭議中，且當前審核員在此單位已有自己的 `reviewer` 提交（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 非空）」時回傳此值，不改變既有 `ARBITRATION`／`FINALIZED`／`OFF_ROSTER`／`NOT_ASSIGNED`／`EMPTY` 分支的判定順序與行為。
- 新增唯讀摘要渲染（比照 `renderFinalizedCard()` 的 `.rv-finalized-summary` 語彙）：預設呈現審核員自己送出的決策、修正值與裁定理由，逐項顯示標記員原答案對照，內容須與 `getSubmission()` 的實際回傳值一致；「送出審核」（`ws-review-submit-btn`）於此模式下不可見／不可觸發（隱藏而非僅視覺遮蔽，避免 `Ctrl/Cmd+Enter` 快捷鍵可繞過）。
- 新增「修改我的審核」次要按鈕：按下後切換為既有可編輯的 FR-053 審核卡，修正面板改以**審核員自己的提交值**播種（而非標記員原答案）；`seedReviewRow()` 補一個可選的播種來源參數／新呼叫路徑以支援此路徑，既有無條件呼叫（互動分支之 `submission = getAnnotatorSubmission()`）行為不變。
- 新增「取消，維持原決策」按鈕：退回唯讀摘要，不寫入任何變更。
- 新增 i18n 鍵（zh／en 成對）：`reviewSubmittedTitle`、`reviewSubmittedNote`、`reviewSubmittedDecisionLabel`、`reviewSubmittedValueLabel`、`reviewEditMyDecisionBtn`、`reviewCancelEditBtn`。
- **不得更動**：`ARBITRATION`（FR-061）與 `FINALIZED`（issue #308）兩既有分支的行為；新分支與既有兩者三方互斥。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `annotation/015-annotation-workspace`：新增 FR-103（審核員重入自己已提交、爭議中審核單位時的唯讀摘要與明確改判入口），新增 AC-4.81。

### Removed Capabilities

無。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`reviewUnitBlockReason()` 新增一個分支、新增渲染函式（仿 `renderFinalizedCard()`）、`seedReviewRow()` 新增可選播種來源、`:5376` 附近呼叫入口新增一個 `blockReason` 分支。
- i18n 新增鍵（zh／en 成對），實際檔案位置以實作時該檔案現況為準（i18n 鍵目前與其他 workspace 字串同置於 `annotation-workspace.config.js` 內）。
- `specs/annotation/015-annotation-workspace/spec.md`：新增 FR-103、AC-4.81；版本 8.1.0 → 8.2.0（MINOR，新增 FR／AC），Changelog 新增一列。
- **不受影響**：`annotation-workspace.data.js` 之 `getSubmission()`／`isArbiterCandidate()`／`isRosterReviewer()` 等既有資料層函式皆重用、不新增或修改；不涉及任何 API 契約或資料庫 schema 變更（純前端原型畫面行為）；不影響標記員視角、`FINALIZED`、`OFF_ROSTER`、`NOT_ASSIGNED`、`EMPTY` 分支。
- **對照組（須逐字不變）**：`T016 / official_run / ofm-03-awaiting-arbitration × kioleemg12`（reviewer_chen 為仲裁者，走 ARBITRATION 版面）。

## Constitution Check

- **Generalization-First**：新分支的判定條件（爭議中 ＋ 當前審核員已有自己的提交）重用既有 `getSubmission()`／`REVIEW_UNIT_STATUS.DISPUTED`，不新增任何任務 ID 或輸出類型專屬邏輯；渲染沿用既有 `OUTPUT_TYPE_REGISTRY` 驅動的 `describeOutputAnswer()`／`describeCompactAnswer()`，不硬編任一輸出類型。
- **Data Fairness**：不涉及測試集答案外洩路徑；唯讀摘要只呈現審核員自己已合法讀取的資料（自己的提交、標記員原答案），未新增任何跨角色資料存取。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用；本變更為既有審核工作區單一畫面分支的新增＋既有 UI 元件重用，無新資料結構或互動模型層級的設計決策需要獨立記錄，故省略 `design.md`。

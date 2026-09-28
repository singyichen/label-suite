# Spec Delta

## ADDED Requirements

### Requirement: FR-103 當事審核員重入爭議單位之唯讀摘要與改判入口

`annotation-workspace` reviewer 視角，當一個審核單位狀態為 `爭議中`（FR-051 `REVIEW_UNIT_STATUS.DISPUTED`）、且目前審核員**不具**仲裁資格（FR-060／`isArbiterCandidate()`，即該審核員恰為當事人，非仲裁者），但目前審核員在此單位**已有自己的 `reviewer` 提交**（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 對目前審核員之 `identity` 非空）時，`reviewUnitBlockReason()`（`annotation-workspace.config.js`）MUST 回傳新的攔截值 `REVIEW_UNIT_BLOCK.SUBMITTED_DISPUTED`，切換為本條所定義的唯讀摘要版面，MUST NOT 再落回 FR-053 之互動審核卡。本判定 MUST 緊接於既有 `ARBITRATION` 分支（FR-061）之後、`FINALIZED`（FR-094）分支之前，MUST NOT 改變 `ARBITRATION`、`FINALIZED`、`OFF_ROSTER`（FR-093）、`NOT_ASSIGNED`（FR-093）、`EMPTY`（FR-053）五個既有分支的判定順序或渲染行為——本條與既有五個分支互斥，同一時刻恰一個成立。

**唯讀摘要版面**（testid `ws-review-submitted-card`，比照 `renderFinalizedCard()` 之 `.rv-finalized-summary` 呈現語彙，MUST 重用同一 CSS class，MUST NOT 另立第二套摘要樣式）：

1. 逐 outKey 呈現標記員原答案（沿用既有 `getAnnotatorSubmission()`）與目前審核員自己的決策（`approve`／`modify`／`bypass`）、修正值（`modify` 時）與裁定理由（`modify`／`bypass` 時），三者內容 MUST 與 `getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 之實際回傳值（`answers.previewState`／`decisions`／`reasons`）逐字一致，MUST NOT 從其他來源（如當前未提交草稿 `reviewRowDecisions`）取值。
2. 「送出審核」（`ws-review-submit-btn`，固定 footer）與其後果提示（`ws-review-submit-consequence`，FR-102）MUST 隱藏（沿用既有 `reviewSubmitBtn.classList.add('hidden')` 寫法），MUST NOT 停留於視覺遮蔽而 DOM 仍可被 `Ctrl/Cmd+Enter`（FR-058）等既有送出捷徑觸發——`setupActionShortcuts` 略過 hidden 按鈕的既有機制 MUST 在本分支下同樣生效。
3. 版面底部 MUST 渲染一顆次要按鈕「修改我的審核」（`ws-review-edit-my-decision-btn`）。

**改判入口**：按下「修改我的審核」後，MUST 切換為既有 FR-053 互動審核卡（含決策列、理由欄、送出按鈕），且 MUST 以目前審核員自己的提交（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)`）而非標記員原答案播種下列三者：

1. 修正面板（correction panel）之初始可編輯值——`seedReviewRow()` MUST 補一個可選的播種來源參數（或等效之新呼叫路徑），使本分支呼叫時可傳入審核員自己的提交作為 `seedReviewState()` 之來源，MUST NOT 直接複用既有無條件呼叫（`seedReviewRow(outKey, submission)` 於互動分支仍以 `getAnnotatorSubmission()` 為來源，該既有行為 MUST 不變）。`reviewRowOriginals`（供畫面顯示「原答案：」比對用）之來源 MUST 維持為標記員原答案，MUST NOT 因本次改判入口而改為審核員自己的提交——兩者用途不同，不得混用同一份資料。
2. 決策按鈕（`ws-review-row-approve`／`ws-review-row-modify`／`ws-review-row-bypass`）之初始選取狀態，MUST 對應審核員自己提交之 `decisions[outKey]`。
3. 裁定理由欄，MUST 帶回審核員自己提交之 `reasons[outKey]`。

版面 MUST 額外渲染一顆「取消，維持原決策」按鈕（`ws-review-cancel-edit-btn`），按下後 MUST 退回唯讀摘要版面（重新渲染本條第一段之唯讀摘要），MUST NOT 寫入任何變更（不呼叫任何提交或草稿持久化函式）。

**i18n**：本條新增之顯示文字 MUST 提供 zh／en 成對之 i18n 鍵，不得僅提供單一語言。

**不改變的部分**：本條不改變 FR-051 狀態機、FR-060／FR-061 仲裁資格與版面判定、FR-094 已定稿唯讀卡、FR-093 指派與離冊閘門、`getSubmission()`／`isArbiterCandidate()`／`isRosterReviewer()` 等既有資料層函式之行為與簽章；本條之唯讀摘要與改判入口為工作區呈現層新增分支，MUST NOT 引入任何新的持久化欄位或改變 `handleReviewSubmit()` 實際送出時的判定邏輯。

#### Scenario: AC-4.81 當事審核員重入已提交之爭議中單位為唯讀摘要

- **GIVEN** 審核員 X 已對某審核單位提交過審核（`decisions`／修正值／理由皆已寫入），該單位其後因與其他審核意見不一致而推導為 `爭議中`（FR-051），且 X 不具仲裁資格（FR-060）
- **WHEN** X 重新開啟該單位
- **THEN** 卡片（`ws-review-submitted-card`）預設為唯讀摘要，逐項顯示標記員原答案、X 的決策、X 的修正值與裁定理由，內容須與 `getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 之實際回傳值完全一致
- **AND** 卡片提供「修改我的審核」按鈕（`ws-review-edit-my-decision-btn`），按下後切換為可編輯的 FR-053 審核卡，修正面板以 X 自己的提交值播種（而非標記員原答案），決策按鈕初始選取對應 X 之 `decisions[outKey]`，理由欄帶回 X 之 `reasons[outKey]`
- **AND** 該編輯版面提供「取消，維持原決策」按鈕（`ws-review-cancel-edit-btn`），按下後退回唯讀摘要，且不寫入任何變更
- **AND** 唯讀摘要模式下「送出審核」（`ws-review-submit-btn`）不可見（`classList` 含 `hidden`）且不可經 `Ctrl/Cmd+Enter` 觸發
- **AND** 本情境不得改變 `ARBITRATION`（FR-061）與 `FINALIZED`（issue #308／FR-094）兩既有分支之行為——三者互斥

#### Scenario: 仲裁者視角不受影響（對照組）

- **GIVEN** 審核員 C 具仲裁資格（FR-060：在該任務 `arbiter_ids` 中且對該單位未提交過審核），該單位為 `爭議中`
- **WHEN** C 開啟該單位（例如 `T016 / official_run / ofm-03-awaiting-arbitration × kioleemg12`，reviewer_chen 為仲裁者）
- **THEN** 畫面仍渲染既有仲裁版面（`ws-arbitration-card`），`ws-review-submitted-card` 為 0 個節點，行為與本次變更前逐字相同

#### Scenario: 已定稿單位不受影響（對照組）

- **GIVEN** 一個狀態為 `已定稿` 的審核單位
- **WHEN** 任一曾審核之審核員開啟該單位
- **THEN** 畫面仍渲染既有 FR-094 唯讀結果卡（`ws-review-finalized-card`），`ws-review-submitted-card` 為 0 個節點，行為與本次變更前逐字相同

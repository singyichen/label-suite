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

**寫入側殘留路徑守衛**（`handleReviewSubmit()`）：呈現層隱藏送出控件不足以防止經殘留呼叫路徑（如快捷鍵或未來的呼叫變更）繞過而直接寫入——`markSampleSubmitted()` 對 `reviewer` 角色寫入路徑無護欄（FR-101 之寫入鎖僅適用 `annotator` 角色），且寫入為整筆覆寫 `answers`（含 `decisions`／`reasons`），`getReviewUnitStatus()`／`getDisputeItems()` 正是讀取該欄位推導單位狀態；若無守欄，當事審核員經殘留路徑重新送出 `approve` 會抹除自己原先造成爭議之 `modify`／`bypass` 決策，使一個仍待仲裁的單位被當事人單方面消解出爭議池。`handleReviewSubmit()` MUST 在既有 issue #307（空單位）與 issue #308（已定稿）兩道進入時護欄之後，新增第三道進入時護欄：當「該單位狀態為 `DISPUTED`」**AND**「目前審核員在該單位已有自己的 `reviewer` 提交（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 非空）」**AND**「畫面目前**不在**已按下『修改我的審核』後的編輯態」三者同時成立時，直接 `return`，MUST NOT 寫入任何欄位、MUST NOT 追加任何歷程事件。本守衛 MUST NOT 阻擋「修改我的審核」之改判入口本身送出——編輯態下（第三條件不成立）送出仍必須正常寫入，FR-103 刻意允許當事人改判；本守衛僅收斂唯讀摘要模式下的殘留寫入路徑，不改變改判入口之送出行為。**明確排除**：本條不判定、亦不阻擋爭議項是否已有仲裁者 `votes[]`（即「仲裁進行中之改判是否應被限制」）——此為另一未定之產品問題，不在本條範圍，MUST NOT 於此順帶實作。

**不改變的部分**：本條不改變 FR-051 狀態機、FR-094 已定稿唯讀卡、FR-093 指派與離冊閘門、`getSubmission()`／`isArbiterCandidate()`／`isRosterReviewer()` 等既有資料層函式之行為與簽章；本條之唯讀摘要與改判入口為工作區呈現層新增分支，MUST NOT 引入任何新的持久化欄位。FR-060（仲裁資格判定本身）與 FR-093（指派與離冊閘門）之判定邏輯不變；FR-061 與 AC-4.22 之版面切換判定則依本次 `## MODIFIED Requirements` 一併修訂（見下）。

#### Scenario: AC-4.81 當事審核員重入已提交之爭議中單位為唯讀摘要

- **GIVEN** 審核員 X 已對某審核單位提交過審核（`decisions`／修正值／理由皆已寫入），該單位其後因與其他審核意見不一致而推導為 `爭議中`（FR-051），且 X 不具仲裁資格（FR-060）
- **WHEN** X 重新開啟該單位
- **THEN** 卡片（`ws-review-submitted-card`）預設為唯讀摘要，逐項顯示標記員原答案、X 的決策、X 的修正值與裁定理由，內容須與 `getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 之實際回傳值完全一致
- **AND** 卡片提供「修改我的審核」按鈕（`ws-review-edit-my-decision-btn`），按下後切換為可編輯的 FR-053 審核卡，修正面板以 X 自己的提交值播種（而非標記員原答案），決策按鈕初始選取對應 X 之 `decisions[outKey]`，理由欄帶回 X 之 `reasons[outKey]`
- **AND** 該編輯版面提供「取消，維持原決策」按鈕（`ws-review-cancel-edit-btn`），按下後退回唯讀摘要，且不寫入任何變更
- **AND** 唯讀摘要模式下「送出審核」（`ws-review-submit-btn`）不可見（`classList` 含 `hidden`）且不可經 `Ctrl/Cmd+Enter` 觸發
- **AND** 本情境不得改變 `FINALIZED`（issue #308／FR-094）分支之行為；`ARBITRATION`（FR-061）分支之行為僅依本次 `## MODIFIED Requirements` 增列一則排除當事審核員的例外，仲裁者本人視角逐字不變（見下一情境）——三者互斥

#### Scenario: AC-4.82 唯讀摘要模式下殘留送出路徑不得寫入

- **GIVEN** 審核員 X 已對某爭議中單位提交過審核（同 AC-4.81 前提），目前呈現唯讀摘要（尚未按下「修改我的審核」）
- **WHEN** 經殘留呼叫路徑直接觸發 `handleReviewSubmit()`（例如殘留的 `Ctrl/Cmd+Enter` 呼叫路徑，而非透過已隱藏之送出鈕）
- **THEN** 函式必須於進入時即 `return`，該單位於 `getSubmission()` 讀回之 `decisions`／`previewState`／`reasons` 必須與觸發前逐位元組相同
- **AND** 該單位不得新增任何歷程事件，`getReviewUnitStatus()` 之推導結果不得改變（仍為 `爭議中`）
- **AND**〔改判入口不受影響，對照〕**GIVEN** X 已按下「修改我的審核」進入可編輯的 FR-053 審核卡，**WHEN** X 完成決策並按下送出審核，**THEN** 送出必須正常寫入（本守衛之第三條件——不在編輯態——不成立，不得阻擋）

#### Scenario: 仲裁者視角不受影響（對照組）

- **GIVEN** 審核員 C 具仲裁資格（FR-060：在該任務 `arbiter_ids` 中且對該單位未提交過審核），該單位為 `爭議中`
- **WHEN** C 開啟該單位（例如 `T016 / official_run / ofm-03-awaiting-arbitration × kioleemg12`，reviewer_chen 為仲裁者）
- **THEN** 畫面仍渲染既有仲裁版面（`ws-arbitration-card`），`ws-review-submitted-card` 為 0 個節點，行為與本次變更前逐字相同

#### Scenario: 已定稿單位不受影響（對照組）

- **GIVEN** 一個狀態為 `已定稿` 的審核單位
- **WHEN** 任一曾審核之審核員開啟該單位
- **THEN** 畫面仍渲染既有 FR-094 唯讀結果卡（`ws-review-finalized-card`），`ws-review-submitted-card` 為 0 個節點，行為與本次變更前逐字相同

## MODIFIED Requirements

### Requirement: FR-061 仲裁版面：逐項二選一與 Reject 出口

工作區 reviewer 視圖 MUST 為爭議池提供**逐項仲裁版面**，切換條件為「該審核單位狀態為 `爭議中`（FR-051）**AND** 目前審核員具仲裁資格（FR-060 兩條件）」——條件成立時整張審核卡切換為仲裁版面；條件不成立時，若目前審核員在該單位**已有自己的 `reviewer` 提交**（issue #1053：當事審核員重入自己已提交、其後轉為爭議中的單位），改依 FR-103 呈現其唯讀摘要版面（`ws-review-submitted-card`）——此為 FR-103 新增之第三種版面，非本條之仲裁版面，亦非 FR-053 之互動審核卡；其餘情形（目前審核員在該單位**尚無**自己的提交）維持 FR-053 審核卡。三者（仲裁版面、FR-103 唯讀摘要、FR-053 審核卡）互斥、MUST NOT 混渲染：

1. **仲裁者選邊、不重新標記**：仲裁版面呈現標記員答案的唯讀摘要（一致項的脈絡）與逐爭議項的 A／B 選擇；修正控件與決策控件 MUST NOT 渲染——仲裁的產出是「採哪一側」，不是第三份新答案。仲裁 MUST NOT 觸發任何形式的重標。
2. **A／B 取值與 B 的動態渲染**：A ＝ `annotator_value`（標記員原答案）。B ＝ 該單位審核員的答案，其呈現 MUST 依決策來源動態決定：
   - 來源 `modify` → 呈現 `B · 審核員：{修正值}`；採 B 即以該修正值定案。
   - 來源 `bypass` → 呈現 `B · 審核員：無法裁決`（與來源 `modify` 同一組字規則，冒號後改為決策值文案，決策值文案讀自 FR-092 v6.8.0 修訂之唯一來源）；採 B 即**定案為無法判定**，該項之定案值記為無法判定，MUST NOT 回填標記員原答案。
   一個審核單位恰有一位審核員（FR-093），故每個爭議項恰有一個 B 選項，MUST NOT 出現多個 B 或需要合併相同值的情形。
3. **第三出口：兩者皆非（Reject）**：仲裁者判定 A 與 B 皆不可採時 MUST 可選 `兩者皆非`，**理由必填**；送出後該爭議項 MUST 落入最終例外池（FR-095），該單位維持 `爭議中` 直到例外池收尾。
4. **送出與寫入**：所有爭議項皆已裁定（採 A／採 B／兩者皆非）方可送出，未完成時 MUST 阻擋且 MUST NOT 寫入任何狀態。送出時逐項寫入 `votes[]`（`arbiter_id`、`choice`、`voted_at`）與 `finalized_value` / `finalized_by`；`choice` 取值 MUST 為 `ARBITRATION_OUTCOMES = adopt_a | adopt_b | reject`。仲裁狀態以**審核單位**定址（`task_id × run_type × annotator_id × sample_id`），MUST NOT 寫入任何 reviewer bucket——爭議屬於單位本身，任何仲裁者的定案必須對該單位的所有檢視者可見。
5. **仲裁效果說明**：版面 MUST 載明仲裁的效果為「逐爭議項選定定稿值、不重新標記」。

**v5.0.0 移除**：逐項多數決收斂（`DISPUTE_CONVERGENCE_RULE`）、隱含同意票、偶數平手／全數分歧之不收斂情境、以及 issue #551 之「純退回恆不收斂」與「維持退回」語意 MUST 全部移除——單一審核員沒有票數可計，且退回機制已不存在。爭議項 MUST 全數由仲裁者逐項裁定，不存在自動收斂路徑。
**v6.8.0 修訂**（issue #811）：B 選項之 `bypass` 呈現由 `B · 審核員 Bypass（無法判定）` 改為 `B · 審核員：無法裁決`——舊標籤把答案值與決策值兩個概念的名字疊在同一個標籤裡。「採 B 即定案為無法判定」描述的是定案後的值，不在本版改名範圍。

#### Scenario: AC-4.54 B 依來源動態渲染且 Reject 進例外池
- **GIVEN** 一個 `爭議中` 單位含兩個爭議項：項目 1 之審核員決策為 `修正`（改為 `positive`），項目 2 為 `無法裁決`
- **WHEN** 具資格之仲裁者開啟仲裁版面
- **THEN** 項目 1 之 B 選項顯示審核員修正值 `positive`，項目 2 之 B 選項顯示 `審核員：無法裁決`，且不含 `Bypass` 字樣
- **AND** 仲裁者對項目 2 選 `兩者皆非` 且未填理由時送出被阻擋；填妥理由送出後該項出現於最終例外池，該單位狀態維持 `爭議中`

#### Scenario: AC-4.22 仲裁版面切換

- **GIVEN** 一個 `disputed` 審核單位（FR-051）
- **WHEN** 具仲裁資格的審核員（FR-060：`can_arbitrate` 旗標 AND 非當事人）以完整審核單位身分開啟工作區 reviewer 視圖
- **THEN** 整張審核卡 MUST 切換為仲裁版面（`ws-arbitration-card`）：標記員答案以唯讀摘要呈現、每個未解決爭議項恰渲染一列 A/B 選擇（`ws-arbitration-item`）
- **AND** 修正控件（含作答面板互動元件）與 ✕/✓ 決策按鈕（`ws-review-row-approve` / `ws-review-row-reject`）MUST 為 0 節點——仲裁者選邊、不重新標記
- **AND** 當事審核員於該單位**尚無**自己的提交、未具旗標的審核員、以及任何人開啟非 `disputed` 單位時，皆 MUST 維持 FR-053 審核卡，MUST NOT 出現仲裁版面（見 FR-061）
- **AND**〔issue #1053 新增〕當事審核員於該單位**已有**自己的提交時，改依 FR-103 呈現唯讀摘要版面（`ws-review-submitted-card`），同樣 MUST NOT 出現仲裁版面

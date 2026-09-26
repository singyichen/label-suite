# Spec Delta

## MODIFIED Requirements

### Requirement: FR-092 審核員三向決策

審核員對審核單位每個 outKey 的決策 MUST 取自 `REVIEW_DECISIONS = approve | modify | bypass`（中文語彙 `通過`／`修正`／`無法裁決`），三者為全部出口，系統 MUST NOT 提供第四種決策：

1. `approve`（通過）：該 outKey 之定稿值即標記員原答案。該單位全部 outKey 皆為 `approve` 時，單位直接推導為 `已定稿`（FR-051）。
2. `modify`（直接修正）：審核員於作答控件上直接改答案，並依 FR-016A 填寫必填理由。**修正 MUST NOT 立即生效**——該 outKey 之差異成為爭議項（FR-059），單位推導為 `爭議中`，待仲裁裁定方定案。
3. `bypass`（無法裁決）：審核員表示自己無法裁決該 outKey，並依 FR-016A 填寫必填理由。該 outKey MUST 成為爭議項，其審核員側值 MUST 記為「無法判定」而非任何具體答案值——`bypass` MUST NOT 被推導為「與標記員答案相同」，亦 MUST NOT 使單位推導為 `已定稿`。

送出審核前，該單位每個 outKey MUST 恰有一筆決策（FR-044），未完成時 MUST 阻擋送出並指名缺項（FR-083）。

**v6.8.0 修訂**（issue #811）：**同字二義拆分**。「無法判定」原同時承載兩個概念，本版起分為兩套顯示語彙：

- **答案值**（標記員對某 outKey 宣告無法作答，`OutputAnswer.bypass`，由 `allow_bypass` 控制）：zh `無法判定 (Bypass)`／en `Unable to determine (Bypass)`。消費面為任務設定、task-new 預覽 chip、作答與修正面板、清單 pill。
- **決策值**（本條之 `bypass`）：zh `無法裁決`／en `Cannot adjudicate`。消費面為決策按鈕、歷程 `bypassed` 徽章（FR-086）、共用側欄快捷鍵總覽之 `B` 列（FR-054）、仲裁 B 選項（FR-061）、定稿卡微型歷程（FR-094）。

兩套語彙 MUST 各自恰有一個 i18n 來源，上列消費面 MUST 讀自該來源，MUST NOT 另行手寫副本；答案值與決策值 MUST NOT 互相取代。描述定案結果之「無法判定」（FR-061 採 B 之定案值、FR-063、FR-095、FR-097）描述的是定案後的值，不在本版拆分範圍。本版不改 `REVIEW_DECISIONS` 識別字、決策集合或任何行為。

**明確不存在的出口**：`reject`（退回）MUST NOT 存在於任何 `run_type`。審核員 MUST NOT 有任何使標記員重新標記該樣本的通道。

**決策與答案變更之失效規則收窄**（**v6.26.0 修訂**，issue #453／#925，對應 AC-3.42 撤銷附註第 (2) 點）：`syncDecisionsWithCorrections()`（`annotation-workspace.config.js:3755`）持續以「決策做出當下的答案快照」判定該決策是否仍有效——快照與當前答案不同時：

- 決策為 `approve` 或 `bypass` 時，MUST 清空該決策、刪除快照、顯示 `toastReviewDecisionResetOnEdit` toast。這兩者的合法性建立在「當下這個答案值」之上，答案一變原判定即不再成立，此為既有行為，本次 **不變更**。
- 決策為 `modify` 時（本次新增排除），MUST NOT 清空該決策、MUST NOT 清空其必填理由、MUST NOT 顯示上述 toast；MUST 將快照更新為新的當前答案值，使該決策繼續綁定「當前」答案。理由：把答案改成正確值正是 `modify` 這個決策所指的動作本身，不是對已決策答案的意外二次變更——用「答案變更即失效」同一條規則處理 `modify`，等同懲罰審核員完成修正的正確操作序列（先選「修正」、後點正確答案）。

#### Scenario: 修正不立即生效而進入爭議池
- **GIVEN** 一個 `待審` 審核單位，其審核員將某 outKey 由 `neutral` 直接改為 `positive` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，該 outKey 之定稿值尚未產生
- **AND** 該 outKey 出現於爭議池，A 側為 `neutral`、B 側為 `positive`

#### Scenario: Bypass 不得被視為同意
- **GIVEN** 一個審核單位之審核員對全部 outKey 選 `無法裁決` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，MUST NOT 推導為 `已定稿`
- **AND** 每個 outKey 之爭議項 B 側呈現為「審核員：無法裁決」，而非標記員的原答案值

#### Scenario: 答案值與決策值各自同源且互不混用
- **GIVEN** 某標記員對一個 outKey 宣告 `無法判定 (Bypass)`，其審核員對同一 outKey 選 `無法裁決`
- **WHEN** 分別檢視審核卡、仲裁版面、歷程頁籤與共用側欄快捷鍵總覽
- **THEN** 標記員原答案處顯示 `無法判定 (Bypass)`，決策按鈕、仲裁 B 選項、`bypassed` 徽章與快捷鍵 `B` 說明皆顯示 `無法裁決`
- **AND** 切換為英文時分別為 `Unable to determine (Bypass)` 與 `Cannot adjudicate`，且兩組字串皆等於同一個 i18n 來源所定義之值

#### Scenario: 修正決策改答案後保留決策與理由欄（issue #925）
- **GIVEN** reviewer 對某 outKey 已點選「修正」（`modify`）決策並填入必填理由
- **WHEN** reviewer 接著在同一 outKey 的直接修正控件上，把答案改成另一個與原答案不同的值
- **THEN** 該 outKey 的「修正」決策按鈕必須維持 `aria-pressed="true"` 且理由欄（`ws-review-reject-reason`）必須維持可見、既有輸入內容不得被清空
- **AND** 不得顯示 `toastReviewDecisionResetOnEdit` toast
- **AND** 若此時該審核單位所有 outKey 皆已決策，送出審核（`ws-review-submit-btn` 或 `ws-review-quick-submit-btn`）必須正常成功，不得被「請完成以下輸出類型的審核決策」toast 擋下

#### Scenario: 通過／無法裁決決策改答案後仍須重置（issue #925 迴歸不變量）
- **GIVEN** reviewer 對某 outKey 已點選「通過」（`approve`）決策
- **WHEN** reviewer 接著在同一 outKey 的直接修正控件上，把答案改成另一個與原答案不同的值
- **THEN** 該 outKey 的「通過」決策必須被清空（決策按鈕 `aria-pressed` 回到 `false`），且必須顯示 `toastReviewDecisionResetOnEdit` toast
- **AND** 對「無法裁決」（`bypass`）決策重複上述操作，理由欄必須連同決策一併清空，且同樣顯示該 toast——本情境為既有行為，本次收窄 MUST NOT 使其失效

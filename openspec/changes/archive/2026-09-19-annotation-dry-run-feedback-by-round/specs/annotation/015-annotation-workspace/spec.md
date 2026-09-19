## MODIFIED Requirements

### Requirement: FR-096 試標歷史回饋

標記員視角 MUST 提供**試標歷史回饋**列表，使標記員在「不退回重標」的前提下仍能自我對齊。列表逐筆呈現該標記員於已完成試標回合中的標記，並 MUST 包含：

1. 被修改筆數（該回合中該標記員被審核員修正或被仲裁改判的項目數）與其占比——MUST 逐回合分列計算，MUST NOT 將多個回合合併為單一分母；
2. 逐筆之「我的答案 → 定案結果」對照；
3. 定案來源（審核員通過／仲裁採 A／仲裁採 B／例外池收尾）與具名決策者；
4. 原因——審核員或仲裁者填寫的理由原文；理由中引用之標註指南段落 MUST 可點擊跳轉至該段落。

**揭露時機（Data Fairness NON-NEGOTIABLE）**：揭露閘門 MUST 以**回合**為單位判定，MUST NOT 以任務狀態整體判定。某試標回合 R{n} 之回饋 MUST 僅在 R{n} 全部標記提交、R{n} 轉入 `waiting_iaa_confirmation` 之後對標記員開放；開放後 MUST NOT 因任務建立 R{n+1}（任務狀態回到 `dry_run_in_progress`）或轉入 `official_run_in_progress`／`completed` 而收回。**進行中之回合** MUST NOT 對標記員揭露任何定案結果、他人答案或審核判斷——否則標記員可據以回頭對齊，直接污染同輪 IAA。無法判定所屬回合之提交，於任務處於 `dry_run_in_progress` 時 MUST 視為屬於進行中回合而不揭露（fail closed）。

本列表 MUST 僅呈現該標記員**本人**的標記與其定案結果，MUST NOT 呈現其他標記員的答案。

**本版修訂**（issue #834）：原條文以「任務轉入 `waiting_iaa_confirmation`」作為唯一開放條件，並將「回合進行中」等同於「任務狀態為 `dry_run_in_progress`」——此等同僅在單一試標回合下成立。`task-management/014-task-detail` 開放自 `waiting_iaa_confirmation` 建立 R{n+1} 後，任務狀態層級之閘門使已結束之 R{n} 回饋在 R{n+1} 進行期間整段消失，與本需求「自我對齊」之目的相反；而 R{n} 之揭露前提在 R{n+1} 建立前即已成立（`task-management/014-task-detail` FR-013 第 (6) 點）。本版將閘門改為逐回合判定；進行中回合不揭露之 Data Fairness 保證不變。

#### Scenario: AC-1.27 回合結束後才開放試標歷史回饋
- **GIVEN** 某試標回合仍在進行中（任務狀態為 `dry_run_in_progress`）
- **WHEN** 標記員嘗試進入試標歷史回饋
- **THEN** 該回合之資料不揭露，畫面說明需待該回合結束
- **AND** 任務轉入 `waiting_iaa_confirmation` 後，同一標記員可看到被修改筆數、逐筆「我的答案 → 定案結果」、定案來源與具名決策者、以及理由原文與可跳轉的指南段落引用，且看不到其他標記員的答案

#### Scenario: 下一回合進行中仍可見已結束回合之試標歷史回饋
- **GIVEN** 某 `dry_run` 任務之 R{n} 已轉入 `waiting_iaa_confirmation`，其後負責人建立 R{n+1}，任務狀態回到 `dry_run_in_progress`，且同一標記員於 R{n} 與 R{n+1} 皆有已提交之標記
- **WHEN** 該標記員進入試標歷史回饋
- **THEN** R{n} 之回饋 MUST 照常呈現，其被修改筆數與占比 MUST 僅以 R{n} 之提交計算
- **AND** R{n+1} 之任何提交、定案結果與審核判斷 MUST NOT 出現在回饋中，且畫面 MUST 說明 R{n+1} 需待該回合結束
- **AND** 任務轉入 `official_run_in_progress` 後，已結束之各試標回合回饋 MUST 仍可見

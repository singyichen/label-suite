---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #868。現行 `FR-093` 會把 `reviewer_ids` 中每一位成員都納入自動審核指派，而 `FR-060` 又禁止曾對該審核單位提交審核的人仲裁同一單位。當任務只有一位被指定於 `arbiter_ids` 的仲裁者時，只要某個爭議單位先被指派給該人，該人便因「當事人」失格，且任務沒有第二位仲裁者可接手；T014 `dry-03-dispute-open` 與 T016 `ofm-03-awaiting-arbitration` 已能重現此無錯誤訊息、但永遠無法收斂的狀態機死路。

## What Changes

- `FR-093` 明定**所有** `arbiter_ids` 成員皆為保留仲裁者，不進入新審核單位的自動分派池；自動分派對象改為 `reviewer_ids - arbiter_ids`。
- `FR-060` 明定仲裁資格的名冊來源是任務自己的 `arbiter_ids`，不得只讀全域示範名冊的 `can_arbitrate` 旗標。
- `FR-073`／`FR-099` 同步收斂下一個可處理單位：保留仲裁者不會因任務另有 `pending` 單位而被導入未指派的審核工作，只在自己具資格的 `disputed` 單位間前進。
- issue #824 的黏住規則維持優先：已存在提交的歷史單位不得因本次名冊角色收斂而改派；若保留仲裁者過去已審過該單位，該提交仍黏住且本人仍不得仲裁該單位。
- `arbiter_ids` 留空時不排除任何審核員，沿用 014 既有「允許儲存但警示無人可仲裁」契約。
- 原型資料層以任務 profile 的 `arbiterIds` 計算保留名冊，負荷統計、清單、工作區與下一個可處理單位共用同一份指派結果；T014–T016 示範種子同步遷移，使既有爭議列由非仲裁者審核、指定仲裁者可實際進入仲裁。
- companion change `validate-reviewer-arbiter-role-separation` 於 014 阻擋 `reviewer_ids - arbiter_ids` 為空的審核設定。

## 非目標

- 不放寬 FR-060 的非當事人限制。
- 不新增 PL 手動改派、臨時指派仲裁者或仲裁者自選單位。
- 不修改 backend、frontend 正式產品程式碼或正式 E2E；只調整 `design/prototype/**` 與規格治理檔。
- 不改變 issue #824 的已提交黏住、離冊唯讀與決定性取捨。

## Capabilities

`annotation` — 仲裁者保留與審核指派可收斂性。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First** | 只依任務 `reviewer_ids`／`arbiter_ids` 做集合差，不含任務、樣本或帳號白名單 |
| **III. Data Fairness** | 不揭露新答案；仲裁資格仍須同時通過任務名冊與非當事人檢查 |
| **X. Change Scope Discipline** | 產品變更只在 prototype 資料層與既有 task-detail prototype；正式 backend／frontend／testing 不在範圍 |
| **XX. Source of Truth** | 仲裁名冊只讀 014 `arbiter_ids`，指派與負荷共用同一個保留名冊 helper |

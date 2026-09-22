---
對應 Spec: specs/task-management/014-task-detail/spec.md
---

## Why

Issue #868 的 annotation companion change 將所有 `arbiter_ids` 成員保留於仲裁角色，不再分派新審核工作。若 PL 把每一位 reviewer 都勾為 arbiter，則 `reviewer_ids - arbiter_ids` 為空，任務雖有「審核員」卻沒有任何人可接審核單位。現行 FR-010s-1 只檢查 `reviewer_ids` 至少一人，因此會接受這個無法運作的設定。

## What Changes

- 修訂 FR-010s-1：儲存審核設定時，除了 `reviewer_ids` 非空，也必須保證 `reviewer_ids - arbiter_ids` 至少一人。
- `arbiter_ids` 仍允許空值；本變更不把仲裁改成發布硬前置條件。
- 審核設定 helper text 明確揭露：指定仲裁者會從新審核單位的自動分派池保留。
- prototype 儲存驗證新增中英文可修正錯誤；既有「仲裁者必須為 reviewer 子集合」互動不變。

## 非目標

- 不修改 backend、frontend 正式產品程式碼或正式 E2E。
- 不要求至少兩位仲裁者，也不改變 `arbiter_ids` 空值警示。
- 不新增手動指派或發布後名冊遷移流程。

## Capabilities

`task-management` — 審核／仲裁角色設定的可運作性驗證。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First** | 驗證只依兩份 ID 集合，不含任務或帳號特例 |
| **X. Change Scope Discipline** | 產品變更只在既有 task-detail prototype HTML；正式前後端不在範圍 |
| **XX. Source of Truth** | 014 定義設定合法性，015 companion change 消費同一份 `reviewer_ids`／`arbiter_ids` |

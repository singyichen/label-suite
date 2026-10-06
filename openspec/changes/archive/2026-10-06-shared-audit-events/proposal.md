---
對應 Spec: specs/admin/006-user-management/spec.md
---

## Why

Issue #1160 的 D-4 尚有共用稽核表與 account/admin 候選字典的衝突：Proposed ADR-032 定義 `audit_events` 與可空 `task_id`，字典卻使用 `audit_event` 且沒有任務作用域；`specs/foundation/000-foundation/spec.md` FR-105 不允許未明示的複數、跨模組新表例外。系統事件操作者與保存期限也缺少可驗收規則。

## What Changes

- 修訂並接受 ADR-032，定案共用事件、system actor、至少一年保存、registry 與 redacted summary 邊界。
- 在 foundation FR-105 明示 `audit_events` 的唯一命名例外；admin-006／007 的稽核需求回指共用事件。
- 更新 account/admin 候選欄位字典與 NoteCraft Wiki／Diagram 至 9 張、63 欄、6 條已確認候選 FK。

本變更只規劃資料契約，不建立 ORM、migration、API 或已部署的資料表。

## Capabilities

`admin/006-user-management`、`foundation/000-foundation`、`admin/007-role-settings`。主規格為 admin-006；foundation 與 admin-007 為明列的受影響正典。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| II. Generalization-First | action／target 以 registry 管理，不依 task type 建稽核程式分支。 |
| III. Data Fairness | 共用摘要不保存隱藏答案、原始標記內容或憑證。 |
| XII. Traceability | Accepted ADR 與 canonical FR 先定案，候選字典與 NoteCraft 只做來源投影。 |

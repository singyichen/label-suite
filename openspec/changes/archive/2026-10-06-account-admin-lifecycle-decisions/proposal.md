---
對應 Spec: specs/admin/006-user-management/spec.md
---

## Why

Issue #1160 的 account/admin 候選 schema 尚未固定邀請連結期限、作廢與使用的區別、通知偏好缺列預設值，以及 seeder 超管建立方式。若以目前字典直接寫 migration，過期未使用 token 會阻擋新連結，且併發停用超管可能使平台失去管理員。

## What Changes

- 在 canonical account/admin 規格定義 D-2、D-5、D-7 的可驗收行為。
- 將一次性連結的 `invalidated_at` 投影至 account/admin 欄位字典和 NoteCraft Wiki／Diagram，修正部分唯一索引與併發規則。
- 固定通知偏好缺列全開與明確冪等 bootstrap 的候選實作契約。

本變更只規劃資料契約，不建立 migration、ORM、API 或 frontend runtime。

## Capabilities

`account/004-forgot-reset-password`、`account/005-profile-settings`、`admin/006-user-management`。

主規格為 admin-006；account-004 與 account-005 是此變更明列的受影響正典規格。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| XI. Security & Privacy | 作廢連結不得成功設定密碼或洩漏 token；bootstrap 沒有預設密碼。 |
| XV. RBAC | SQLite／PostgreSQL 都須保留 seeder 與最後一位 active 超管。 |
| XII. Traceability | 正典條文先定案，候選字典與 NoteCraft 只做可驗證投影。 |

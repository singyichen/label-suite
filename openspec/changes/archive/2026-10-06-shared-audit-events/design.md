# Design: shared-audit-events

## Goal

Issue #1160 D-4 的完整設計見 `docs/superpowers/specs/2026-10-06-shared-audit-events-design.md`。本 change 只更新跨模組稽核契約與候選 ER 投影；不建立執行時資料表。

## Decisions

1. 接受 ADR-032 的共用 `audit_events`；foundation FR-105 明列此一名稱例外。`RunStateTransition` 仍為獨立 domain record，和 `task.status_changed` 同交易。
2. 系統事件使用 `actor_role='system'` 與 `actor_user_id IS NULL`；人為事件使用非空真實 `users` FK，兩種情形以 CHECK 互斥。不可憑空建立可登入的 system user。
3. `task_id` 依 Accepted ADR-022 作可空 UUID 候選作用域，task 表與 PK 未定前不畫 FK。多型 target 只做 registry／服務端寫入驗證，不造假 FK。
4. 所有共用事件至少保存一個曆年，正常服務只能 INSERT；沒有自動刪除。將來的封存／清理需另行審核政策。
5. `member.updated` 補齊一般帳號編輯事件；`role_permissions.changed` 為 D-9 可編輯矩陣保留。摘要採 action-scoped allowlist，不含 token、hidden gold、raw annotation text。

## Runtime boundary

候選字典與 NoteCraft 僅作規劃。未來 migration PR 應獨立於 service/API PR，並以 SQLite 與真實 PostgreSQL 驗證 PK/FK/CHECK、append-only、交易原子性、索引及 upgrade／downgrade／upgrade。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| II. Generalization-First | 共用 registry，不依 task type 寫入特例。 |
| III. Data Fairness | 共用 payload 只存不敏感摘要，答案歷程另由受權限控管的 domain record 保存。 |
| VI. English-First | 程式識別字採英文；文件使用繁體中文。 |

# Design: account-admin-lifecycle-decisions

## Goal

Issue #1160 D-2、D-5、D-7 的正式規格結果見 `docs/superpowers/specs/2026-10-06-account-admin-lifecycle-decisions-design.md`；canonical FR／SC 分別由 account-004、account-005、admin-006 擁有。

## Decisions

1. Invite TTL 24 小時；成功使用與作廢分別記 `used_at`／`invalidated_at`。同一使用者同一用途只允許一筆尚未使用且尚未作廢的連結；重發先作廢舊列，過期列不能靠時間動態移出部分索引。
2. 通知偏好讀取時缺列投影為 true／true，不建立資料列；首次儲存與後續儲存同一交易寫足六項事件。
3. Seeder 用明確、冪等 bootstrap 指令建立全新帳號；既有非 seeder 帳號不得透過 bootstrap 升權，以免其舊 session 繼承超管權限。SQLite 與 PG 分別以 trigger 保護 seeder；PG 的角色變更共用固定 advisory transaction lock，SQLite 使用 `BEGIN IMMEDIATE`，避免不同列更新造成 write skew。

## Runtime boundary

本 change 只更新正典與候選資料模型。後續 migration／service PR 須以 SQLite 與真實 PG 測試約束、並發、回滾，並先解決 admin-006 FR-006b 的郵件寄送與 DB commit 協調方式。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| XI. Security & Privacy | token 只存雜湊，作廢不可誤判使用成功；bootstrap 憑證不得有預設值。 |
| XV. Role-Based Access Control | seeder 不可移除，併發角色異動在兩種資料庫都要保留 active 超管。 |
| XIV. Dataset Lineage | 此切片不修改 dataset、task 或隱藏答案資料。 |

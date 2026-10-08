---
對應 Spec: specs/dataset/021-dataset-ingestion-and-lineage/spec.md
---

# 資料保存、刪除與匿名化政策（#1224）

## Why

正典只訂了保存下限：audit 至少一個日曆年（ADR-032）、工時與 session 暫定一年（ADR-021）、匯出原檔 30 日與 metadata 一年（`task-management/014-task-detail` FR-021）。dataset-021 FR-011 與 `annotation-review-db-schema.md` §7 第 4 項都明寫「待補」，ADR-024 增補 (2026-10-08, #1221) 的特權更正路徑也指向「#1224 仍待決」。主憲章 XXII 要求每類資料都有保存政策；沒有政策，第一個 migration 無法決定 `ON DELETE` 與匿名化欄位（#1216）。

維護者已於 2026-10-08 在 #1224 逐類裁決六類資料：users 與 `pending_email` 採 (b) 匿名化／墓碑；audit 與歷程中的 PII 採 (b) 過 ADR-032 下限後匿名化；含答案的歷程 JSON 採 (d) 隨資料集版本保存；原始 artifact 與 private 答案採 (d) 被 sealed 版本或 run 引用就保留；session 與 refresh token 採 (c) 過期或撤銷後實體刪除；匯出檔與 manifest 採 (d) 照現行正典分級。除既有正典下限外，各級具體期限不在本次裁決，本變更一律寫成「待定（#1224）」，不自行假定。

## Goal

六類資料各有一條可引用的正典保存政策；各字典的 `ON DELETE`、清理與匿名化規則與該政策一致；特權匿名化路徑與 ADR-024 增補的不可變 trigger 銜接，不新增應用程式碼路徑。

## What Changes

- 新增 ADR-038「Data Retention, Deletion and Anonymization Policy」：逐類列出裁決、既有下限、待定項（#1224）及特權匿名化路徑；ADR-021、ADR-024、ADR-032 各補一段指向 ADR-038 的增補，ADR 索引新增一列。
- 修改 dataset-021 FR-011：受限來源 artifact、私有答案與 `protected_payload` 在有 sealed 版本或 run 引用時以 RESTRICT 保留；只有未封存 draft 被丟棄時可實體刪除；含答案的派生資源隨版本保存，版本整體下架的程序與期限待定（#1224）；cache 與匯出不回傳已刪除／逾期資料。版本 1.3.0 → 1.4.0（MINOR）與 Changelog。
- 同步字典：`account-admin-db-schema.md`（帳號匿名化 U-17、session 清理 F-07、refresh token 清理 R-10、A-05 指向 ADR-038）、`annotation-review-db-schema.md`（§7 第 4 項改為已裁決、A-01 銜接特權匿名化）、`database-table-inventory.md` §5.2 待決矩陣改為政策矩陣、`task-work-db-schema.md`、`task-export-db-schema.md`、`dataset-db-schema.md`、`task-run-db-schema.md` 的保存段落。
- 不新增欄位或表：欄位總數不變；匿名化狀態的持久化形式（專用欄或保留墓碑值）待第一個 migration 裁定（#1224）。
- `task-management/014-task-detail` FR-021(5) 與 `annotation/015-annotation-workspace` FR-063 不改寫，只在 ADR-038 與字典引用；`account/020-auth-session-security` 的 FR-001／FR-008「受引用 session 保留」不變，清理只刪無引用列。
- 屬 MINOR：dataset-021 為未部署候選契約，FR-011 由待補改為已裁決政策；未移除或推翻任何 FR／AC。

## Capabilities

主規格：`specs/dataset/021-dataset-ingestion-and-lineage/spec.md`（FR-011）。其他資料類別的政策寫在 `docs/adr/038-data-retention-deletion-anonymization.md`，引用 `task-management/014-task-detail` FR-021、`annotation/015-annotation-workspace` FR-063、`account/020-auth-session-security` FR-004／FR-008 但不改其條文。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| III. Data Fairness | 私有答案與 `protected_payload` 被 sealed 版本或 run 引用時 RESTRICT；匿名化只動 PII 欄位，不讓答案進入任何新的讀取路徑；cache 與匯出不回傳已刪除／逾期資料。 |
| XXII. Data Classification, Retention & Deletion | 六類資料各有保存政策；派生資源（歷程 JSON、匯出）處置明列；停用帳號另有匿名化路徑；未定期限一律標待定（#1224），不默認永久保存。 |

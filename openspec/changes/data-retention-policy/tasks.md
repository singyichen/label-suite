# 任務清單：data-retention-policy

> 對應 issue #1224（Part of #1216）。主 session 驗證 Red／Green 並更新勾選。

## 1. Red 測試

**故事目標**：dataset-021 SC-006 — 規劃文件對保存、刪除與匿名化政策的描述與維護者裁決一致，且不出現正典以外的期限。

- [x] 1.1 先提交檢查器測試的獨立 Red：在既有檢查器測試斷言 ADR-038 的六類政策與期限護欄、ADR-021／ADR-024／ADR-032 增補與 ADR 索引、正典 FR-011 v1.4.0 與 Changelog，以及各字典保存段落（U-17、F-07、R-10、A-05、§5.2、§7），觀察預期失敗。Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`, `scripts/tests/check-account-session-canonical.test.mjs`, `scripts/tests/check-database-annotation-review.test.mjs`, `scripts/tests/check-database-dataset.test.mjs`, `scripts/tests/check-database-task-export.test.mjs`, `scripts/tests/check-database-worklog.test.mjs`, `scripts/tests/check-database-task-run.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]

## 2. Green 回寫

**故事目標**：dataset-021 SC-006 — 正典、ADR 與字典對六類資料的保存政策一致。

- [ ] 2.1 新增 ADR-038 並補 ADR-021、ADR-024、ADR-032 的增補與 ADR 索引，回寫 `specs/dataset/021-dataset-ingestion-and-lineage/spec.md` 的 FR-011、版本 1.4.0 與 Changelog。Exception: governance-propagation; Files: `docs/adr/038-data-retention-deletion-anonymization.md`, `docs/adr/021-jwt-refresh-token-auth.md`, `docs/adr/024-database-quickstart-sqlite-tiered.md`, `docs/adr/032-user-action-audit-trail.md`, `docs/adr/README.md`; Reason: 政策正典與三份 ADR 的指向必須同一任務落地，否則引用斷裂。 [@senior-sa]
- [ ] 2.2 同步各字典的 `ON DELETE`、清理與匿名化規則，Red 測試轉綠。Exception: governance-propagation; Files: `docs/diagrams/architecture/account-admin-db-schema.md`, `docs/diagrams/architecture/annotation-review-db-schema.md`, `docs/diagrams/architecture/database-table-inventory.md`, `docs/diagrams/architecture/task-work-db-schema.md`, `docs/diagrams/architecture/task-export-db-schema.md`, `docs/diagrams/architecture/dataset-db-schema.md`, `docs/diagrams/architecture/task-run-db-schema.md`; Reason: 七份字典引用同一政策，須同一任務同步，否則字典間互相矛盾。 [@senior-dba]

## 3. 驗證與歸檔

**故事目標**：dataset-021 SC-006 — 閘門與 archive 後的衍生檢視保留 FR-011 政策。

- [ ] 3.1 執行 OpenSpec schema 驗證、Project SDD lint、檢查器測試與 `check-database-schema.mjs`。 [@main]
- [ ] 3.2 Source-Verify 預掃後 archive 並核對衍生檢視 FR 引用、版本與 Changelog，更新 `specs/STATUS.md`。 [@main]

# 任務清單：database-final-audit

> issue #1160 的未部署規劃切片。主 session 核對 Red／Green 證據並更新 checkbox；archive 僅在 final PR group 執行。

## 1. 正典與候選實體

**故事目標**：014 SC-062／SC-063 — 最新試標回合只有完整、可追溯結果才可 `done`；任務狀態與隔離設定各有一筆同交易、無重複表的稽核事件。

- [ ] 1.1 `senior-qa` 修改 `scripts/tests/check-database-task-run.test.mjs`，先執行 Red 並記錄失敗原因，獨立提交。[@senior-qa]
- [ ] 1.2 修改 `docs/adr/022-task-state-machine-location.md`，將狀態轉換紀錄收斂到 `audit_events.task.status_changed`。[@senior-dba]
- [ ] 1.3 修改 `docs/adr/032-user-action-audit-trail.md`，定義兩個 typed action、單一事件、task 真 FK 候選與敏感摘要 allowlist。[@senior-dba]
- [ ] 1.4 修改 `specs/task-management/014-task-detail/spec.md`，新增 FR-010o-5／FR-025、AC-3.51～52、SC-062～63、v11.0.0 與 Changelog。[@senior-sa]
- [ ] 1.5 修改 `docs/diagrams/architecture/task-run-db-schema.md`，新增試標結果六欄、候選鍵、索引、安全與 pending/done/failed 交易規則。[@senior-dba]
- [ ] 1.6 修改 `docs/diagrams/architecture/account-admin-db-schema.md`，為非空 `audit_events.task_id` 加 task 真 FK 候選及反查索引。[@senior-dba]

## 2. 衍生視圖與追溯

**故事目標**：014 SC-062／SC-063 — 六份字典與 NoteCraft 的表、欄和 FK 一致，保存事實與未決政策能由總帳追溯。

- [ ] 2.1 修改 `docs/diagrams/architecture/database-schema.er.json`，加入試標結果表及兩條新真 FK，更新中文說明與候選計數。[@main]
- [ ] 2.2 修改 `docs/diagrams/architecture/database-table-inventory.md`，補 MVP 雙向追溯與資料類別保存待決矩陣，刪除舊待決文字。[@main]
- [ ] 2.3 修改 `specs/STATUS.md`，同步 014 版本，維持 `in-progress`。[@main]
- [ ] 2.4 修改 `design/system/screen-inventory.md`，僅在 `node scripts/gen-screen-inventory.mjs --check` 指出漂移時進行。[@main]

## 3. 驗證與交付

**故事目標**：014 SC-062／SC-063 — OpenSpec schema、Project SDD lint、來源／NoteCraft 與 archive Source-Verify 四層證據完整。

- [ ] 3.1 驗證（無檔案變更）：`openspec validate database-final-audit --type change`、`bash scripts/check-sdd.sh`、`node --test scripts/tests/check-database-*.test.mjs`、`node scripts/check-database-schema.mjs`、`git diff --check` 均 exit 0。[@main]
- [ ] 3.2 驗證（無檔案變更）：NoteCraft plugin JSON Schema／build 與實際 Wiki／Diagram，核對 39／333／46 及候選狀態。[@main]
- [ ] 3.3 獨立 DBA、code、security review，解決 Critical／High，保留 review 證據。[@main]
- [ ] 3.4 archive 後逐條 Source-Verify；此工具操作會原子移動 change 四件套並更新 `openspec/specs/task-management/014-task-detail/spec.md`。Exception: governance-propagation; Files: `openspec/changes/archive/2026-10-08-database-final-audit/proposal.md`, `openspec/changes/archive/2026-10-08-database-final-audit/design.md`, `openspec/changes/archive/2026-10-08-database-final-audit/tasks.md`, `openspec/changes/archive/2026-10-08-database-final-audit/specs/task-management/014-task-detail/spec.md`, `openspec/specs/task-management/014-task-detail/spec.md`; Reason: `openspec archive` 在同一操作中移動 change 與更新衍生視圖。[@main]

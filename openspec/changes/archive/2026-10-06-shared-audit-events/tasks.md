# 任務清單：shared-audit-events

> 本 change 僅涵蓋 D-4 正典與候選資料投影。主 session 核對 Red／Green 證據並更新 checkbox；runtime/migration 另立變更。

## 1. 共用稽核正典

**故事目標**：foundation F-08 約束情境 5 與 admin-006 SC-012／admin-007 SC-010 — 共用稽核事件可追溯且不產生命名與角色歧義。

- [x] 1.1 修訂並接受 `docs/adr/032-user-action-audit-trail.md`：事件表、actor、task 作用域、保存與 registry。 [@main]
- [x] 1.2 修改 `specs/foundation/000-foundation/spec.md`：FR-105 明列共用稽核表命名例外，更新版本與 Changelog。 [@main]
- [x] 1.3 修改 `specs/admin/006-user-management/spec.md`：FR-013 與關鍵實體映射共用事件及受權限保護的目標歷程。 [@main]
- [x] 1.4 修改 `specs/admin/007-role-settings/spec.md`：FR-010 的矩陣事件與一年歷程映射共用事件，維持 D-9 條件。 [@main]

## 2. Red／Green 候選投影

**故事目標**：admin-006 SC-012／admin-007 SC-010 — 欄位字典、Wiki／Diagram 與正典事件形狀一致。

- [x] 2.1 先修改 `scripts/tests/check-database-schema.test.mjs`，執行並提交缺 `audit_events.task_id` 的預期 Red；Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: schema-governance test is owned by senior-qa and must precede projection changes. [@senior-qa]
- [x] 2.2 修改 `docs/diagrams/architecture/account-admin-db-schema.md` 的表名、十欄、CHECK、索引與 D-4 狀態；以 2.1 已提交的預期失敗作為實作前證據。 [@main]
- [x] 2.3 修改 `docs/diagrams/architecture/database-schema.er.json` 的 Wiki／Diagram 投影，不新增 task 假 FK。 [@main]
- [x] 2.4 修改 `docs/diagrams/architecture/database-table-inventory.md` 的計數、狀態與待決項。 [@main]
- [x] 2.5 修改 `docs/diagrams/README.md` 的 NoteCraft 計數。 [@main]

## 3. 驗證與交付

**故事目標**：admin-006 SC-012／admin-007 SC-010 — 稽核契約可以從正典定位到候選圖，且未宣稱資料庫已部署。

- [x] 3.1 執行 OpenSpec schema validation、Project SDD lint、來源檢查、NoteCraft JSON Schema/build、實際 Wiki／Diagram 檢視與 Source-Verify。 [@main]
- [x] 3.2 執行 final PR 內 archive 並驗證衍生規格、版本與 Changelog。 [@main]
- [ ] 3.3 執行 senior-dba、code、security review 與 CI，合併 PR 後回寫 issue #1160 已驗證項目。 [@main]

# 任務清單：account-admin-lifecycle-decisions

> 本 change 僅規劃契約與候選圖；runtime/migration 另立變更。Red test 與 Green 投影分開，主 session 紀錄證據及勾選。

## 1. 正典契約

**故事目標**：SC-013／SC-014 — token 與 seeder 有可驗收結果；account-005／account-004 的對應規格另列於各自任務。

- [x] 1.1 更新 `specs/admin/006-user-management/spec.md`：invite 24 小時、作廢語意、冪等 bootstrap 與跨 DB 保護。 [@main]
- [x] 1.2 更新 `specs/account/005-profile-settings/spec.md`：缺列預設與六列完整儲存。 [@main]
- [x] 1.3 更新 `specs/account/004-forgot-reset-password/spec.md`：後端作廢連結結果與 prototype 狀態邊界。 [@main]

## 2. 候選資料模型與驗證

**故事目標**：SC-013／SC-014 — 欄位字典、Wiki／Diagram 和正典一致，並核對 account-005 的偏好預設。

- [x] 2.1 先修改 `scripts/tests/check-database-schema.test.mjs`，執行 Red 並記錄缺 `invalidated_at` 的預期失敗；Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: schema-governance test follows the canonical contract and is owned by senior-qa. [@senior-qa]
- [x] 2.2 更新 `docs/diagrams/architecture/account-admin-db-schema.md` 的欄位、索引、規則與已裁決清單。 [@main]
- [x] 2.3 更新 `docs/diagrams/architecture/database-schema.er.json` 的 NoteCraft 投影。 [@main]
- [x] 2.4 更新 `docs/diagrams/architecture/database-table-inventory.md` 的候選欄位計數。 [@main]
- [x] 2.5 執行 OpenSpec、Project SDD lint、來源一致性檢查、NoteCraft schema/build、Wiki／Diagram 畫面與正典引用。 [@main]
- [ ] 2.6 完成 PR review、CI、合併後，回寫 issue #1160 已驗證事項。 [@main]

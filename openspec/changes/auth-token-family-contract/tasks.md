# 任務清單：auth-token-family-contract

> 本 change 僅完成契約與規劃圖；runtime/migration 的 Red/Green 另立變更。主 session 唯一更新勾選；每項一檔或 command-only 驗證。

## 1. 正典來源

**故事目標**：SC-001～SC-008 — 對每種失效／競爭結果建立可定位契約。

- [x] 1.1 建立 `specs/account/020-auth-session-security/spec.md`，定義 FR-001～FR-010、AC-1.1～AC-4.2、SC-001～SC-008；已以 Project SDD lint 驗證。 [@main]
- [x] 1.2 更新 `specs/STATUS.md`，登錄 account-020 為 `spec-ready`；容器建立後改 `change-open`。 [@main]
- [x] 1.3 修訂 `docs/adr/021-jwt-refresh-token-auth.md`，使 token-family、立即失效、一次寬限與 `409` 成為 Accepted 決策。 [@main]
- [x] 1.4 修訂 `specs/foundation/000-foundation/spec.md` 的 F-04／命名條款與對應情境，更新版本及 Changelog。 [@main]
- [x] 1.5 修訂 `specs/account/001-login-email-password/plan.md` 的舊實體假設並標明它不建立正典契約。 [@main]
- [x] 1.6 修訂 `specs/account/003-register-email-password/spec.md` 的 email canonicalization，更新版本與 Changelog。 [@main]
- [x] 1.7 修訂 `specs/account/005-profile-settings/spec.md` 的 session 結果，更新版本與 Changelog。 [@main]
- [x] 1.8 修訂 `specs/admin/006-user-management/spec.md` 的邀請／停用相依性，更新版本與 Changelog。 [@main]

## 2. 來源投影

**故事目標**：SC-008 — 規劃層有可讀的 PK/FK/nullable 字典與 Wiki／Diagram，且不誤稱部署。

- [x] 2.1 修改 `scripts/tests/check-database-schema.test.mjs`，先加入新增 family／移除重複欄位的 Red 測試，保存預期失敗；Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: schema-governance test follows canonical contract and is owned by senior-qa. [@senior-qa]
- [x] 2.2 修改 `docs/diagrams/architecture/account-admin-db-schema.md`，新增 family 與欄位、關聯、規則來源及索引查詢理由。 [@main]
- [x] 2.3 修改 `docs/diagrams/architecture/database-table-inventory.md`，同步第九張候選表與模組待決標記。 [@main]
- [x] 2.4 修改 `docs/diagrams/architecture/database-schema.er.json`，讓 NoteCraft Wiki／Diagram 與字典一致。 [@main]
- [x] 2.5 若來源投影驗證顯示 parser 不足，修改 `scripts/check-database-schema.mjs` 並驗證測試通過；若無需修改則以命令記錄原因。 [@senior-devops]

## 3. 四層驗證與回寫

**故事目標**：SC-001～SC-008 — OpenSpec、SDD、source checker 和 Source-Verify 各有獨立證據。

- [x] 3.1 執行 `openspec validate auth-token-family-contract --type change`、`bash scripts/check-sdd.sh`、`node --test scripts/tests/check-database-schema.test.mjs`、`node scripts/check-database-schema.mjs` 和 NoteCraft schema 驗證；每個命令預期 exit `0`。 [@main]
- [x] 3.2 檢查 NoteCraft Wiki／Diagram 實際畫面；若 local server 未啟動，先啟動對應 workspace 再驗證。 [@main]
- [ ] 3.3 Source-Verify 每個 delta FR／SC、正典版本與 Changelog；完成 `openspec archive auth-token-family-contract` 後逐條核對 derived view 的正典引用，預期全部可定位。 [@main]
- [ ] 3.4 完成 review、PR、CI 與 issue #1160 已驗證勾選；其他模組未驗證前不得勾。 [@main]

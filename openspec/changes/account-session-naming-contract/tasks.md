# 任務清單：account-session-naming-contract

> 本 change 只更新規劃契約、候選字典與衍生視圖；main session 唯一核對 Red／Green 證據並更新勾選。正式 runtime 與 migration 另立變更。

## 1. Red 合約

**故事目標**：account-020 SC-001／SC-008 — access-only 登出與無憑證清理可分辨；session 表與真實 FK 可從來源驗證。

- [ ] 1.1 修改 `scripts/tests/check-database-schema.test.mjs`，先要求 `account_session`、`logged_out_at`、`refresh_tokens.session_id` 真 FK 與候選圖總數；Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: 來源契約測試由 senior-qa 提交並由主 session 核對 Red 證據。 [@senior-qa]
- [ ] 1.2 新增 `scripts/tests/check-account-session-canonical.test.mjs`，先要求 FR-001／FR-008、ADR-021 的成功登出及非登出語意，並保持 JWT `sid`；Exception: governance-propagation; Files: `scripts/tests/check-account-session-canonical.test.mjs`; Reason: 正典契約測試由 senior-qa 提交並由主 session 核對 Red 證據。 [@senior-qa]
- [ ] 1.3 驗證 Red：執行 `node --test scripts/tests/check-database-schema.test.mjs scripts/tests/check-account-session-canonical.test.mjs`；預期僅新增契約因舊名與缺欄失敗，記錄失敗原因與已提交測試。 [@main]

## 2. 正典與 Accepted ADR

**故事目標**：account-020 SC-001／SC-004／SC-005／SC-006／SC-008／SC-009 — 物理命名與明確登出時間一致，既有安全失效保持。

- [ ] 2.1 修訂 `specs/account/020-auth-session-security/spec.md`，更新 FR-001／002／003／006／007／008、AC、SC、版本與 Changelog。 [@senior-sa]
- [ ] 2.2 修訂 `specs/foundation/000-foundation/spec.md`，更新 F-04 FR-016／076／077／105、版本與 Changelog。 [@senior-sa]
- [ ] 2.3 修訂 `docs/adr/021-jwt-refresh-token-auth.md`，對齊 session 身份、FK、`sid` 與登出寫入條件。 [@senior-sa]
- [ ] 2.4 修訂 `docs/adr/035-google-oidc-no-external-idp.md`，對齊安全撤銷命名及空 `logged_out_at`。 [@senior-sa]
- [ ] 2.5 修訂 `specs/account/005-profile-settings/spec.md`，對齊 Email／密碼安全撤銷。 [@senior-sa]
- [ ] 2.6 修訂 `specs/admin/006-user-management/spec.md`，對齊停用安全撤銷。 [@senior-sa]
- [ ] 2.7 修訂 `specs/account/001-login-email-password/plan.md`，對齊規劃中的實體、FK 與登出交易。 [@senior-sa]
- [ ] 2.8 驗證正典：執行 `openspec validate account-session-naming-contract --type change` 與 `bash scripts/check-sdd.sh`；預期兩者 exit 0。 [@main]

## 3. 字典與圖的 Green 投影

**故事目標**：account-020 SC-008 — 候選字典、NoteCraft 真實 FK 與生命週期圖和正典一致。

- [ ] 3.1 修訂 `docs/diagrams/architecture/account-admin-db-schema.md`，標明一次登入、可空登出時間、真實 FK 與未部署狀態。 [@senior-dba]
- [ ] 3.2 修訂 `docs/diagrams/architecture/database-table-inventory.md`，同步候選表與欄數。 [@senior-dba]
- [ ] 3.3 修訂 `docs/diagrams/architecture/database-schema.er.json`，更新單一 session 表、欄位及 FK。 [@senior-dba]
- [ ] 3.4 修訂 `docs/diagrams/README.md`，同步 NoteCraft 來源與驗證說明。 [@senior-dba]
- [ ] 3.5 修訂 `specs/account/001-login-email-password/diagrams/auth-token-lifecycle.json`，從可編輯圖來源對齊 session 名稱。 [@main]
- [ ] 3.6 重生 `specs/account/001-login-email-password/diagrams/auth-token-lifecycle.html`，使用 `node .claude/skills/archify/bin/archify.mjs deliver lifecycle <absolute-json> <absolute-html> --quality showcase --json`；預期輸出成功且 HTML 與 JSON 名稱一致。 [@main]
- [ ] 3.7 驗證投影：執行 `node --test scripts/tests/check-database-schema.test.mjs scripts/tests/check-account-session-canonical.test.mjs`、`node scripts/check-database-schema.mjs`、`node --test scripts/tests/check-database-*.test.mjs`；預期全部 exit 0。 [@main]

## 4. 歸檔與來源驗證

**故事目標**：account-020 SC-001／SC-008 — 每條 delta 均能在正典定位，歸檔後 derived view 不遺失來源。

- [ ] 4.1 驗證並歸檔：執行 `openspec validate account-session-naming-contract --type change` 與 `openspec archive account-session-naming-contract --yes`；預期 exit 0 且只在最後 PR 執行。 [@main]
- [ ] 4.2 Source-Verify：對 archive 的 FR／AC／SC ID 在正典逐一 `rg` 定位，核對版本與 Changelog，檢查 derived view 不含 delta heading；預期所有引用可定位。 [@main]
- [ ] 4.3 執行 `bash scripts/check-sdd.sh`、`git diff --check` 與 NoteCraft build／實際 Wiki、Diagram 檢視；預期 exit 0 且畫面呈現一次登入與真實 FK。 [@main]

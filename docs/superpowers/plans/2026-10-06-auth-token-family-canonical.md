# Auth Token Family Canonical Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 issue #1160 的 auth/token-family DBA 裁決回寫到可追溯的正典契約，並讓 account/admin 實體層字典與 NoteCraft 呈現一致的九張候選表。

**Architecture:** 正典由新的 auth/security owning spec、foundation F-04 與 Accepted ADR-021 共同定義；既有 account/admin spec 只修訂受影響流程。實體層字典與 `.er.json` 是衍生視圖，最後才更新。這是資料庫**規劃**切片，不建立 ORM、migration、API 或 frontend runtime。

**Tech Stack:** Markdown canonical specs／ADR、OpenSpec CLI、NoteCraft `er-diagram-renderer` JSON、Node.js source projection checker、Project SDD lint。

**Spec:** `docs/superpowers/specs/2026-10-06-auth-token-family-canonical-design.md`

## Global Constraints

- 遵循 `docs/sdd-workflow.md` §0 權威順序；Proposed ADR 與 `.er.json` 不可覆蓋 Accepted ADR 或正典 spec。
- `users`／`refresh_tokens` 保留舊名例外；新表 `account_token_family` 用單數與模組前綴。
- JWT `sid` 必須指向 `user_id = sub` 且未撤銷的 family；高風險事件以 `credential_version` 立即失效，角色／停用仍每請求查 DB。
- `refresh_tokens` 移除重複 `user_id`／`session_started_at`，改以真實 `family_id` FK；SQLite／PostgreSQL 兩層約束與競爭驗證列為後續 migration PR 的必要 gate。
- 任何正典或衍生文件不得宣稱候選表已落地；本切片不新增 migration、ORM、runtime API 或前端行為。

## Review Focus

- 舊 token 的 `family_id` 指向其他人的 family：owning spec 明確要求拒絕，且有 SC 驗證 `sid`／`sub` 不相符。
- 改密碼保留目前裝置：005 FR-010、ADR 與 owning spec 都須寫出舊 access token 失效後的 silent refresh 結果。
- 第三次寬限重發：`409`、無新 token、無全量撤銷、前端有界重試及終止結果皆有 SC。
- 重設密碼／Google 連結／改 email：family 全量撤銷、`credential_version` 增加與 session 結果有來源。
- 跨 DB email 唯一性：canonicalization 後長度、ASCII／非 ASCII 測試及 DB `lower(email)` 索引的責任邊界寫清楚。

---

### Task 1: Auth/security owning spec

**Files:**
- Create: `specs/account/020-auth-session-security/spec.md`

**Interfaces:**
- Consumes: 本計畫 Spec、foundation FR-016／075／076／077、ADR-021、account-005 FR-004K／010。
- Produces: 穩定的 FR／AC／SC、實體語意及 downstream source citations；Task 2–8 依它核對。

- [ ] **Step 1: 寫 `## 功能目標`、流程、邊界與規格相依性**，說明本 spec 承接 001 明示排除的真實 auth/session，不納入 UI／runtime。[@main]
- [ ] **Step 2: 寫 FR／AC／SC**，逐一覆蓋 JWT `sid`／`credential_version`、family 身份與失效、30 秒一次額外重發及 409、有界前端協調、改密碼／改 email／重設／Google 連結／登出／停用、email canonicalization。[@main]
- [ ] **Step 3: 執行 `bash scripts/check-sdd.sh`**；預期 0 errors，並以 `rg` 確認每個 Review Focus 均有 FR／SC。[@main]
- [ ] **Step 4: 以 `git diff --check` 驗證並提交此單一規格檔**。[@main]

### Task 2: SDD 狀態與變更容器

**Files:**
- Modify: `specs/STATUS.md`
- Create: `openspec/changes/auth-token-family-contract/{proposal.md,design.md,tasks.md,specs/account/020-auth-session-security/spec.md}`

**Interfaces:**
- Consumes: Task 1 的 FR／SC 與本計畫。
- Produces: 可由 `openspec validate` 與 Project SDD lint 檢查的規劃型 OpenSpec change；不包含 runtime apply。

- [ ] **Step 1: 更新 `specs/STATUS.md`**，登錄 020、分支與 `change-open`，不改既有功能的完成宣告。[@main]
- [ ] **Step 2: 寫 `proposal.md`**，frontmatter 指向 020，界定本 change 只定契約與規劃資料。[@main]
- [ ] **Step 3: 寫 `design.md`**，明列 API／DB 影響、SQLite／PG 差異與本 change 不實作 runtime 的界線。[@main]
- [ ] **Step 4: 寫 020 的 delta spec**，以正典 FR／SC ID 表達新增要求與驗收情境。[@main]
- [ ] **Step 5: 寫 `tasks.md`**，每列一個 owner 與單檔邊界。[@main]
- [ ] **Step 6: 執行 `openspec validate auth-token-family-contract --type change` 與 `bash scripts/check-sdd.sh`**；兩者退出碼皆 0。[@main]
- [ ] **Step 7: 用 `rg` 核對 delta 的每個 FR／SC 引用可定位，再提交此容器**。[@main]

### Task 3: Auth ADR 與 foundation 衝突

**Files:**
- Modify: `docs/adr/021-jwt-refresh-token-auth.md`
- Modify: `specs/foundation/000-foundation/spec.md`

**Interfaces:**
- Consumes: Task 1 正典 FR／SC；保留既有 role/is_active 即時 DB 檢查。
- Produces: 與 family 3NF、`sid`、credential version、單次 grace、absolute TTL 相容的跨模組基準。

- [ ] **Step 1: 修 ADR-021**，記錄命名例外、JWT claims、family 表、所有 refresh 的 family 檢查、撤銷流程與 `409`；原先拒絕 role/status token versioning 的理由保留。[@main]
- [ ] **Step 2: 修 foundation FR-016／075／077／105 及相應情境**；`refresh_tokens.user_id` 不再是直接欄位，session family 與 token row 分責，新增版本／Changelog。[@main]
- [ ] **Step 3: 執行 `bash scripts/check-sdd.sh` 與來源 `rg`**，確認 0 errors 且沒有仍要求 token row `user_id` 的條款；提交。[@main]

### Task 4: 受影響 account/admin 正典對齊

**Files:**
- Modify: `specs/account/001-login-email-password/plan.md`
- Modify: `specs/account/003-register-email-password/spec.md`
- Modify: `specs/account/005-profile-settings/spec.md`
- Modify: `specs/admin/006-user-management/spec.md`

**Interfaces:**
- Consumes: Tasks 1–3 的 auth 契約；001 `spec.md` 仍只涵蓋 prototype。
- Produces: email 不分大小寫識別、SSO/邀請 null 密碼、保留／撤銷 session 行為與 admin 概念欄名對應。

- [ ] **Step 1: 更新 001 plan**，移除過時的 NOT NULL／直接 `refresh_tokens.user_id`／無限制 grace 敘述並標明它不是正典。[@main]
- [ ] **Step 2: 更新 003 正典**，定義 email canonicalization、版本與 Changelog，提交此單檔。[@main]
- [ ] **Step 3: 更新 005 正典**，明確記錄目前裝置 refresh、改 email／密碼後的 session 語意，提交此單檔。[@main]
- [ ] **Step 4: 更新 006 正典**，對齊邀請帳號 null 密碼、大小寫 email 與管理員停用行為，提交此單檔。[@main]
- [ ] **Step 5: 執行 Project SDD lint 與 `rg` 雙向來源核對**；0 errors，全部 D-1／D-3／D-6／D-8 語意可定位。[@main]

### Task 5: 九張候選表與 NoteCraft 投影

**Files:**
- Modify: `docs/diagrams/architecture/account-admin-db-schema.md`
- Modify: `docs/diagrams/architecture/database-table-inventory.md`
- Modify: `docs/diagrams/architecture/database-schema.er.json`
- Modify: `scripts/tests/check-database-schema.test.mjs`
- Modify: `scripts/check-database-schema.mjs` only if current source parser cannot represent the new constraints.

**Interfaces:**
- Consumes: Tasks 1–4 正典；`er-diagram-renderer/schema.json`。
- Produces: 九張候選表的欄位字典、來源追溯、PK/FK/狀態及 NoteCraft Wiki／Diagram。

- [ ] **Step 1: 先寫失敗的 checker 測試**，要求 family 表及 FK、移除 token 列重複欄位、`grace_reissued_at` 與 `credential_version` 與字典一致；執行並保存預期 Red。[@main]
- [ ] **Step 2: 更新 account/admin 字典**，逐欄記型別／null／鍵／來源／狀態，另列索引查詢對照；不表示已部署。[@main]
- [ ] **Step 3: 更新跨模組總帳**，記錄第九張候選表與其來源，其他模組仍保留待決。[@main]
- [ ] **Step 4: 更新 `.er.json`**，僅畫已在字典確認的 FK；執行 Node 測試，預期轉 Green，若仍失敗先定位差異。[@main]
- [ ] **Step 5: 若 checker 不能解析新欄位字典，單獨修 `scripts/check-database-schema.mjs`**；Node 測試轉 Green。[@main]
- [ ] **Step 6: 開 NoteCraft 實際核對 Wiki／Diagram、驗證 plugin JSON Schema、`bash scripts/check-sdd.sh` 與 `git diff --check`**；全部通過後提交。[@main]

### Task 6: 四層 gate 與交付

**Files:**
- Modify: `openspec/changes/auth-token-family-contract/`（僅通過 review 後修正）
- Modify: issue #1160 checklist／進度紀錄。

**Interfaces:**
- Consumes: Tasks 1–5 的來源、字典、ER JSON 與驗證輸出。
- Produces: 可審查 PR 與仍未完成項目的準確 issue 狀態。

- [ ] **Step 1: 分別執行 OpenSpec validate、Project SDD lint、Node source checker／tests、plugin schema 與來源定位檢查**，記錄每層結果；本切片無 runtime code gate。[@main]
- [ ] **Step 2: 以 senior-dba／code-reviewer／security 視角核對正典、3NF、失效語意與 ground-truth 無關性**；修 blocking findings。[@main]
- [ ] **Step 3: 完成 Source-Verify 後按 SDD 時序 archive/write-back，建立繁體中文 PR；等待完整 CI 成功，再合併**。[@main]
- [ ] **Step 4: 逐項更新 issue #1160 已驗證的勾選與未完成的其他模組；接續 dataset/task/run 切片**。[@main]

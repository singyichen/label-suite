# MVP Worklog Physical Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 #1160 的 MVP 工時來源、正典、未部署候選表與 NoteCraft Wiki／Diagram 一致，且不把登入或歷程耗時誤稱工作時長。

**Architecture:** 以 `task_work_interval` 保存可觀測工作區間，既有 `annotation_history_event` 增 session 來源，`WorkLogEntry` 維持查詢投影。先回寫 014／015／account-020 與 ADR-021，再建字典與 ER JSON；完成事件和時間按 session、task、run、membership、工作種類、台北日期定址。

**Tech Stack:** Markdown canonical specs／Accepted ADR、OpenSpec、Node `node:test` 一致性檢查、NoteCraft 1.7.0 `er-diagram-renderer`。本計畫不新增 Python ORM、Alembic、API 或外部依賴。

**Spec:** `docs/superpowers/specs/2026-10-08-worklog-physical-design.md`

## Global Constraints

- 新表皆是**未部署候選**；目前業務 ORM／migration 表數為 0。
- Lite SQLite、正式 PostgreSQL；原始時間用 server UTC，報表固定 `Asia/Taipei`，每連線 SQLite FK 必須啟用。
- `task_work_interval.work_kind` 限 `annotation | review | arbitration`；心跳 30 秒、閒置 10 分鐘、失聯 90 秒為本版候選門檻。
- `logged_out_at` 僅表示可驗證明確登出，`revoked_at` 不得當登出；`lead_time_ms` 不得當工時。
- 不把標記件、審核單位、仲裁項相加算單一速度；沒有可信時間顯示未知。
- 不新增 016／017 資料集分析專用表；不把私有答案、test/gold 標記送到 annotator 路徑。
- 依 `AGENTS.md` 先 Red 後 Green；commit 英文 subject 與含粗體動詞的 body bullets；每個正典變更通過 OpenSpec schema、Project SDD lint、code/test 及 Source-Verify／archive 四個 gate。

## Review Focus

1. 同一人雙裝置同時開工：唯一 open 區間與服務交易須防雙計，Task 3 的測試要驗規則和兩庫待測標記。
2. 同日兩次登入、同名 R1 跨 run：Task 1／4 要驗 session/run 分組不合併。
3. 多 outKey 審核及後續改判：Task 1／4 要驗只算一個完整審核單位。
4. 登出不可驗或失聯：Task 1／4 要驗未知值與 `last_seen_at` 關閉，不以 `revoked_at`／`now` 補時。
5. 舊歷程缺 session、私有答案存在：Task 1／4 要驗不能虛構歸屬，且可見投影不能含答案或跨人成員資料。

---

### Task 1: 正典 Red 契約測試

**Files:**
- Create: `scripts/tests/check-worklog-canonical.test.mjs`
- Read: `specs/task-management/014-task-detail/spec.md`、`specs/annotation/015-annotation-workspace/spec.md`、`specs/account/020-auth-session-security/spec.md`、`docs/adr/021-jwt-refresh-token-auth.md`

**Interfaces:**
- Consumes: 現行正典中的 FR-007b、FR-010u、FR-088、FR-001／008。
- Produces: 正典及 OpenSpec delta 的回歸守衛；不匯出 runtime API。

- [ ] **Step 1: 寫會失敗的 `node:test`。** 斷言 014 FR-007d、AC-1.28～1.31、SC-057／058、逐類速度與 `WorkLogEntry` 投影；015 FR-088 的 `account_session_id` 真實來源與舊事件可空；account-020／ADR-021 的歷史保留不等於授權。明確拒絕把 `lead_time_ms`、`revoked_at` 當時間來源，以及三類筆數相加。
- [ ] **Step 2: 跑 Red。** `node --test scripts/tests/check-worklog-canonical.test.mjs` 預期在上述缺失斷言失敗，記錄失敗原因；其餘既有資料庫測試仍須綠。
- [ ] **Step 3: commit Red。** `test: define worklog canonical contract`；body 使用 **Define**／**Verify** bullets。

### Task 2: 正典、ADR 與 OpenSpec Green

**Files:**
- Modify: `specs/task-management/014-task-detail/spec.md`
- Modify: `specs/annotation/015-annotation-workspace/spec.md`
- Modify: `specs/account/020-auth-session-security/spec.md`
- Modify: `docs/adr/021-jwt-refresh-token-auth.md`
- Create: `openspec/changes/worklog-observable-interval-contract/{proposal.md,design.md,tasks.md,specs/**/spec.md}`
- Test: `scripts/tests/check-worklog-canonical.test.mjs`

**Interfaces:**
- Consumes: Task 1 Red 斷言及設計文件的時間、單位、保留語意。
- Produces: 014 版本 9.0.0、015 版本 12.1.0、account-020 版本 1.3.0 的候選正典；OpenSpec delta 使用完整 Requirement 標題及既有 scenario，必要時 RENAMED／ADDED，避免 archive 靜默刪除舊子句。

- [ ] **Step 1: 最小修改 014。** FR-007b 改逐類速度，新增 FR-007d；FR-010u 補同 session/run/day 聚合；Tab E 和 `WorkLogEntry` 明列投影與未知值；新增 AC-1.28～1.31、SC-057／058；版本及 Changelog 與變更類型一致。
- [ ] **Step 2: 最小修改 015、account-020 與 ADR-021。** 015 FR-088 補歷程 session 真 FK 來源、舊／系統事件可空和遮蔽；account/ADR 補 session 歷史保留不代表 token 有效、普通刪除不得 cascade 歷程。保留原有安全撤銷與 JWT `sid`。
- [ ] **Step 3: 建 OpenSpec change 並驗。** `openspec validate worklog-observable-interval-contract --type change` 預期 valid；`scripts/check-sdd.sh` 預期 0 errors。
- [ ] **Step 4: 跑 Green 與 commit。** `node --test scripts/tests/check-worklog-canonical.test.mjs` 預期全通過；commit `docs: define observable worklog contract`，body 使用 **Define**／**Align** bullets。

### Task 3: 候選欄位與 NoteCraft Red

**Files:**
- Create: `scripts/tests/check-database-worklog.test.mjs`
- Modify: `.github/workflows/ci.yml`（Green 才加測試檔）
- Read: `scripts/check-database-schema.mjs`、五份現有字典、`database-schema.er.json`

**Interfaces:**
- Consumes: Task 2 正典；既有 `validateErData`／`validateSchemaSummary` 與字典 parser 模式。
- Produces: 第六份字典及全圖的一致性守衛。

- [ ] **Step 1: 寫 Red。** 檢查 `task_work_interval` 11 欄、非空 UUID PK、`work_kind`、時間可空語意、三組複合 FK 與 open user 部分 UNIQUE；`annotation_history_event.account_session_id` 可空真 FK；`account_session` 歷史 RESTRICT 候選；Wiki／Diagram 摘要及來源一致、無假 FK 線；沒有 `WorkLogEntry` 實體表、duration／count 冗餘欄或私有答案欄。測試變異時確認 checker 能拒絕欄位／FK／總數漂移。
- [ ] **Step 2: 跑 Red。** `node --test scripts/tests/check-database-worklog.test.mjs` 預期因缺新表和來源欄位而失敗，記錄原因。
- [ ] **Step 3: commit Red。** `test: define worklog physical projection`，body 使用 **Guard**／**Verify** bullets。

### Task 4: 字典、盤點總帳與 NoteCraft Green

**Files:**
- Create: `docs/diagrams/architecture/task-work-db-schema.md`
- Modify: `docs/diagrams/architecture/{account-admin-db-schema.md,annotation-review-db-schema.md,task-run-db-schema.md,database-table-inventory.md,database-schema.er.json}`
- Modify: `docs/diagrams/README.md`、`scripts/check-database-schema.mjs`、`scripts/tests/check-database-*.test.mjs` 的必要總數預期、`.github/workflows/ci.yml`
- Test: `scripts/tests/check-database-worklog.test.mjs`

**Interfaces:**
- Consumes: Task 2 正典與 Task 3 Red；新字典採現有六欄格式，供 `scripts/check-database-schema.mjs` 解析。
- Produces: 六份來源字典與 NoteCraft 單一 JSON；所有計數從資料重算，複合 FK 只在 Wiki 說明。

- [ ] **Step 1: 完成六欄字典。** 寫 11 欄工作區間與 DB／SVC 約束、索引、保留待決及雙庫差異；annotation 歷程加 session 欄，account session 刪除策略改 RESTRICT，task/run 加交叉引用。
- [ ] **Step 2: 更新 checker 與 NoteCraft。** 新字典加入來源合併；JSON 加工作區間分群、中文逐表欄位說明及實際單欄 FK，更新總帳／README 和按資料算出的總表／欄／FK 數。
- [ ] **Step 3: 跑 Green。** `node --test --test-reporter=spec scripts/tests/check-database-*.test.mjs scripts/tests/check-account-session-canonical.test.mjs scripts/tests/check-mvp-export-canonical.test.mjs scripts/tests/check-worklog-canonical.test.mjs` 預期全通過；`node scripts/check-database-schema.mjs` 預期來源一致；CI 的 database-schema job 需包含新 Red 測試。
- [ ] **Step 4: commit。** `docs: project worklog candidates into NoteCraft`，body 使用 **Add**／**Verify** bullets。

### Task 5: 四個 gate、實際畫面、歸檔與 PR

**Files:**
- Modify: `openspec/changes/worklog-observable-interval-contract/tasks.md`
- Generate: `openspec/changes/archive/2026-10-08-worklog-observable-interval-contract/**` 與 `openspec/specs/**` derived views
- Test: 上述 Node 測試及正典／字典來源引用

**Interfaces:**
- Consumes: Tasks 1–4 的正典、delta、字典和圖。
- Produces: 可追溯歸檔、經驗證的 NoteCraft Wiki／Diagram 及繁體中文 PR。

- [ ] **Step 1: 跑四個 gate。** OpenSpec change validate；Project SDD lint；全套相關 Node 與 checker；歸檔後逐一比對 FR／AC／SC canonical ID、版本、Changelog 與 derived view 引用，不能只信 `openspec archive`。
- [ ] **Step 2: NoteCraft build／畫面檢查。** 本機已安裝 1.7.0 CLI build `docs`；實際 Wiki 查逐表中文說明、可空欄與來源，Diagram 搜尋／聚焦真實 FK；確認標示未部署。plugin build 不取代資料庫約束測試。
- [ ] **Step 3: 獨立 DBA／程式碼／安全審查。** 只修阻擋問題，重跑相關 gate；核對可見投影不含私有答案與跨人 session。
- [ ] **Step 4: 開 PR、等待 CI、合併與 issue 回寫。** 先待上游 #1201／#1204 合併後以 `main` 為 base；PR／issue body 用繁體中文。CI 全綠且 review 無阻擋後依使用者授權自動合併；#1160 僅勾選已驗證的 MVP 文件項目，保留 migration／雙庫執行及尚未裁決的最大保留期為未完成。

# NoteCraft Database Planning View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 NoteCraft Wiki／Diagram 顯示 account/admin 八張可追溯的候選表，清楚標示草案與待裁決狀態。

**Architecture:** 以現行 spec／Accepted ADR 及 `account-admin-db-schema.md` 為依據，手工維護一份 `database-schema.er.json` 作為 NoteCraft 檢視投影；用只讀的 Node 檢查器比對欄位字典、Mermaid 鍵標記及 JSON。renderer 已安裝，無須改 plugin。

**Tech Stack:** Markdown、NoteCraft `er-diagram-renderer` v1.2、JSON Schema Draft 2020-12、Node.js 20 內建 test runner。

**Spec:** [`2026-10-06-database-notecraft-planning-design.md`](../specs/2026-10-06-database-notecraft-planning-design.md)；GitHub issue [#1160](https://github.com/singyichen/label-suite/issues/1160)。本計畫只完成該 issue 的第一階段。

## Global Constraints

- `specs/_governance/constitution.md`、backend/testing constitution 與 `docs/sdd-workflow.md` 的權威矩陣優先；此工作不修改 DB／API contract、migration、ORM 或 plugin 程式。
- 八張表皆為候選；`admin_role_permission` 與 `admin_role_permission_version` 的存在取決於 D-9。未決欄位與 FK 不得假定已落地。
- 不加入依據不足的 task／dataset／annotation 表卡；測試集答案與 ground truth 不放入檢視資料。
- 先有失敗測試，再寫可執行檢查器或資料檔；所有提交在 `feat/` 分支，commit 為英文 Conventional Commit，body 含粗體動詞 bullet。

## Review Focus

1. 字典新增或刪除一欄後 JSON 仍能顯示舊資料：Task 1 的 missing／extra column 測試須報錯。
2. 欄位 `fk` 指向不存在或錯誤的父表：Task 1 的 dangling／wrong target 測試須報錯。
3. `users.hashed_password` D-1 尚未裁決卻在 Wiki 顯示為已定：Task 1 的 pending-state 測試與 Task 2 的實際資料檢查須保留 D-1。
4. 兩張 D-9 條件表被當作確定存在：Task 1 的 conditional-description 測試與 Task 2 的內容檢查須顯示 D-9。
5. JSON 合法但 NoteCraft 導覽、搜尋或跨頁跳轉失效：Task 3 的 build 與瀏覽器驗收須實際走 Wiki ↔ Diagram。

---

### Task 1: 建立來源一致性檢查器（Red → Green）

**Files:**
- Create: `scripts/check-database-schema.mjs`
- Create: `scripts/tests/check-database-schema.test.mjs`
- Read: `docs/diagrams/architecture/account-admin-db-schema.md`
- Read: `.notecraft/plugins/er-diagram-renderer/schema.json`

**Interfaces:**
- Export `parseAccountAdminSchema(markdown: string)`，取得 §3.1～§3.8 的表名、欄名、型別、可空性、`uuid → users` 等明列 FK，並從 §2 Mermaid 區塊取得 PK 標記。
- Export `validateErData(source, data): string[]`；回傳可定位的錯誤清單。CLI 預設讀 repository 中的來源文件與 `database-schema.er.json`，0＝一致、1＝差異、2＝來源或 JSON 無法讀取。

- [x] **Step 1: 寫失敗測試。** 用 Node `node:test` 的最小 Markdown／JSON fixture 寫 `parsesDictionaryAndMermaidKeys`（斷言表、欄、`uuid → users`、複合 PK）、`acceptsMatchingProjection`（`errors.length === 0`）、`rejectsTableAndColumnDrift`（漏／多表或欄時訊息含其名稱）、`rejectsColumnAndKeyDrift`（型別、非空性、PK、FK 目標錯誤時訊息含 `table.column`）、`rejectsDuplicatesAndDanglingFk`（重複表欄與不存在父表各報錯）、`requiresPendingDecisionLabels`（`users.hashed_password.required === "pending"` 時須附 D-1；兩張條件表 description 各含 D-9）。來源 `hashed_password` 的「是」是字典現行建議，D-1 仍未裁決，此欄為明確例外。
- [x] **Step 2: 確認 Red。** `node --test scripts/tests/check-database-schema.test.mjs` 應因檢查器尚不存在或 assertions 失敗而 non-zero，記錄預期原因。
- [x] **Step 3: 實作最小檢查器。** 只解析 `account-admin-db-schema.md` 的 §2 Mermaid 與 §3 六欄表，不掃 prototype；從型別的 `→ users` 取得 FK，對 JSON 驗證字典覆蓋、欄型別、可空性、Mermaid PK 標記及父表存在；錯誤訊息帶表／欄名。D-1 的唯一例外必須顯示 `pending` 與 D-1，不默默當 `nullable`。
- [x] **Step 4: 確認 Green 與第一階段資料 Red。** `node --test scripts/tests/check-database-schema.test.mjs` 應全過；`node scripts/check-database-schema.mjs` 此時應因 JSON 尚未建立而 non-zero，記錄缺檔原因。
- [x] **Step 5: 提交。** 只提交上述 test 與檢查器，使用符合專案格式的 `test:`／`feat:` commit 與 body bullet。

### Task 2: 建立八張候選表的 NoteCraft 資料檔

**Files:**
- Create: `docs/diagrams/architecture/database-schema.er.json`
- Read: `docs/diagrams/architecture/account-admin-db-schema.md:132`
- Test: `scripts/tests/check-database-schema.test.mjs`

**Interfaces:**
- 輸出符合 `.notecraft/plugins/er-diagram-renderer/schema.json`；`groups` 只有 `account`、`admin`，不提供未定案的 `schemas[]`。
- `tables[].columns[].fk` 是 renderer 的唯一連線來源；`description` 是表的草案／決策狀態來源，頂層 `meta.description` 說明 0 張已部署業務表。

- [x] **Step 1: 逐欄轉寫。** 依字典 §3.1～§3.8 建八張表及其欄位；`uuid → users` 拆成 `type: "uuid"`、`fk: "users"`；PK／UQ／IX 僅依來源標記。`users.hashed_password` 顯示 D-1 待裁決，兩張 admin 表顯示 D-9 有條件。
- [x] **Step 2: 確認 Green。** `node scripts/check-database-schema.mjs` 應 0 error，表數為 8 且所有 FK 父表存在；`node --test scripts/tests/check-database-schema.test.mjs` 保持全過。
- [x] **Step 3: 驗證 plugin schema。** 使用本機 NoteCraft 1.7.0 CLI `node /Users/mandychen/.npm/_npx/9c3b20fd6aa7648e/node_modules/notecraftapp/bin/notecraftapp.mjs build docs`；它用 Ajv 2020 載入本專案 plugin 的 `dataSchema`。成功 build 才算 JSON Schema 通過；若路徑失效，先解析本機已安裝 CLI，不下載新版本取代。
- [x] **Step 4: 提交。** 只提交 JSON 與修正此步暴露的必要 test／checker 變更，使用英文 Conventional Commit 與 body bullet。

### Task 3: 接上文件入口並驗證 Wiki／Diagram

**Files:**
- Modify: `docs/diagrams/architecture/account-admin-db-schema.md:1-10`
- Modify: `docs/diagrams/architecture/database-table-inventory.md:1-50`
- Modify: `docs/diagrams/README.md:40-52`
- Read: `docs/diagrams/architecture/core-data-model-er.md`

**Interfaces:**
- 文件連至 NoteCraft `/view/diagrams/architecture/database-schema.er`；保留 Mermaid 概念圖與實體層草案各自定位。

- [x] **Step 1: 修正衍生文件權威文字。** 將 account/admin 文件與盤點總帳中錯置的優先順序對齊 `docs/sdd-workflow.md` §0；新增 NoteCraft 規劃版入口，明示八張候選表、兩張有條件、零張已落地與其餘模組待盤點。
- [x] **Step 2: 靜態檢查。** 驗證新增的 repo 內相對連結存在、`git diff --check` 通過、`node scripts/check-database-schema.mjs` 為零錯誤；執行適用的 `scripts/check-sdd.sh` 文件檢查。
- [x] **Step 3: 實際瀏覽。** 以已安裝 CLI 啟動 NoteCraft 於未佔用的本機 port，開啟 `/view/diagrams/architecture/database-schema.er`；確認總覽、八張表 Wiki、兩張 D-9 標記、Diagram 聚焦、搜尋、FK 跳轉，以及 Wiki ↔ Diagram 切換。若無法啟動，記下確切錯誤與未驗證項。
- [x] **Step 4: 提交並回報第一階段。** 只提交本 task 的文件變更；回報測試／build／UI 證據及後續模組的待裁決清單。Issue #1160 保持開啟，待跨模組實體 Schema 後續階段完成。

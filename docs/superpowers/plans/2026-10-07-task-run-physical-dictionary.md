# Issue #1160：task/run 實體候選字典與 NoteCraft 投影

**狀態：**實作與本機驗證完成，待 PR CI。此切片只交付規劃文件、ER 資料與來源檢查；不建立 ORM、migration、API 或正式資料庫。

## 目標與來源

依 013 v8.3.0、014 v6.0.0、015 v11.0.1、dataset-021、Accepted ADR-022／037 及已審閱的 [task/run identity design](../specs/2026-10-06-task-run-identity-design.md)，將 task/run 的持久化身分轉成逐表六欄候選字典。每張表應可回指正典，標出暫定型別與未決約束；NoteCraft 只呈現字典有型別的欄位與單欄 FK。

## 順序與驗證

1. **Red**：新增 `scripts/tests/check-database-task-run.test.mjs`，要求候選表清單、PK、安全邊界、跨表唯一鍵、來源字典與 ER 資料一致，並檢查 CI job 會執行它。執行並保存預期失敗證據。
2. **字典**：由 senior-dba 對 `docs/diagrams/architecture/task-run-db-schema.md` 建立 Mermaid、六欄字典、複合 FK／CHECK／唯一鍵清單、查詢與索引、SQLite／PG 對照、權限與保留待決。`ReviewAssignment` 與 `OutputConfig` 不建獨立表。
3. **Green**：讓 `scripts/check-database-schema.mjs` 同時載入 account/admin、dataset、task/run 字典；更新 `database-schema.er.json` 的 meta、分群、版面與候選表投影；調整既有測試只驗原先兩模組的子集，避免把新增表誤判為 drift；加入 CI job。
4. **總帳**：更新 `database-table-inventory.md` 的 task/run 狀態、來源與待決，精確標示哪些約束仍需 migration 前裁決。
5. **驗收**：執行 Node 測試、投影檢查、plugin JSON Schema 驗證、Project SDD lint；如有實際 NoteCraft 可達服務，再驗 Wiki／Diagram。核對所有新增表與鍵的正典定位，不將規劃圖稱作已部署 Schema。

## 本機證據（2026-10-07）

- Red：`senior-qa` 的獨立測試提交 `e0515e10`（task/run 字典與 CI）、`5cc1a0c2`（摘要數字防漂移）、`592b783c` 與 `c7a904f3`（Mermaid 假線、漏線與 FK 標記）均先確認預期失敗；格式容忍修正為 `7c49fc2d`。
- Green：`node --test scripts/tests/check-database-schema.test.mjs scripts/tests/check-database-dataset.test.mjs scripts/tests/check-database-task-run.test.mjs` 為 38/38 通過；`node scripts/check-database-schema.mjs` 為 27 表／206 欄／27 單欄 FK。
- Project SDD lint：0 error、8 個既有 legacy heading warning；`bash scripts/inventory-tests.sh` 全通過；`git diff --check` 無錯誤。
- 本機 NoteCraft 1.7.0 `build docs` 成功，產生 `/view/diagrams/architecture/database-schema.er` 靜態頁；此 build 使用 plugin JSON Schema 驗證資料。實際在 `127.0.0.1:4329` 核對 Wiki 的五個分群、`task` 15 欄與父子表跳轉，Diagram 顯示 27 表、`task_run_item` 只指向單欄 FK 的 `dataset_item`，搜尋／聚焦與返回 Wiki 控件可用。全圖在 33% 概覽縮放下欄位文字較小，需靠搜尋聚焦或放大閱讀。
- 未建 ORM／migration，SQLite／PostgreSQL 的 PK/FK/UNIQUE/CHECK、併發與 roundtrip 均屬後續實作驗證，不把 build 成功等同資料庫約束已生效。

## 界線

本切片不替 annotation/review/quality 定型；它們仍在 #1160 盤點總帳等待後續獨立字典。跨表複合 FK 在字典寫成候選約束，renderer 的單欄 `fk` 只畫有真實單欄關聯的線。PostgreSQL 與 SQLite 行為在 migration 切片實測。

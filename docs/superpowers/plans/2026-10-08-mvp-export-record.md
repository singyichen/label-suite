# MVP 匯出紀錄與 NoteCraft 規劃實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 014 正典定義可逐位元組重新下載的 MVP 匯出紀錄，並將兩張未部署候選表投影到資料字典及 NoteCraft。

**Architecture:** 首次匯出保存不可變原始產物；歷史列保存條件快照及產物完整性資料，逐 run 關聯表保存範圍順序。重新下載只經授權與完整性檢查後讀原始產物。字典與圖均從正典衍生。

**Tech Stack:** Markdown／OpenSpec、Node.js 來源檢查、NoteCraft ER JSON；SQLite Lite／PostgreSQL 是未來 migration 驗證目標。

**Spec:** [設計文件](../specs/2026-10-08-mvp-export-record-design.md)；正典 `specs/task-management/014-task-detail/spec.md`。

## Global Constraints

- 僅規劃文件、來源檢查及 NoteCraft 資料；不新增 ORM、migration、API 或部署宣稱。
- 資料表說明用繁體中文；表／欄與程式識別碼沿用英文 `lower_case_snake`。
- 每個檔案變更各是一個 task；行為檢查遵守獨立 Red 提交、Green、複核。
- OpenSpec 結構、Project SDD lint、來源檢查、archive/write-back 四閘分別驗證。

## Review Focus

- 跨 run 匯出：manifest 每個 run 的版本與 snapshot 正確，不能以任務目前版本替代。
- 後續標記變更：歷史下載仍提供原始 bytes 與檔名。
- 切詞引擎失效：有效原產物仍可下載，新的詞級匯出仍須有版本資訊。
- 過期／撤銷／失權／損壞：拒絕下載，不洩露內部物件路徑。
- 零列 `json-min`：v2 envelope 仍含 manifest，舊版產物不被改寫。

## Task 1：正典 Red 與 OpenSpec

- [x] 由 `senior-qa` 新增並提交 `scripts/tests/check-mvp-export-canonical.test.mjs`；斷言 014 的不可變原始產物、`runs[]`、版本 2、期限／完整性及重新授權條款，先跑出預期失敗，既有測試維持通過。
- [x] 新增 `openspec/changes/mvp-export-record-contract/proposal.md`，記下 #1160 的衝突、目標及規劃範圍。
- [x] 新增同 change 的 `design.md`，記下原始產物、兩表責任、狀態、雙庫差異與回滾界線。
- [x] 新增同 change 的 `specs/task-management/014-task-detail/spec.md` delta，精確修訂 FR-009a、FR-010i-1／2、FR-015h、FR-020、FR-021 與對應 AC／SC，不改其他模組。
- [x] 新增同 change 的 `tasks.md`，每項一檔、分 Red／Green／驗證，列故事目標。
- [x] 修訂 `specs/task-management/014-task-detail/spec.md` 的生效條文、版本及 Changelog；執行 Red 測試至 Green。breaking `json-min` 格式升至 v2，spec 7.0.0 → 8.0.0。
- [x] 執行 `openspec validate mvp-export-record-contract --type change`、`bash scripts/check-sdd.sh` 與正典測試；記錄結果。

## Task 2：物理字典與來源檢查

- [x] 由 `senior-dba` 新增 `docs/diagrams/architecture/task-export-db-schema.md`，以 §2 Mermaid、§3 六欄字典及 §4～§7 約束／索引／雙庫／待決描述 `task_export`、`task_export_run`。
- [x] 由 `senior-qa` 新增並提交 `scripts/tests/check-database-task-export.test.mjs` Red 測試，檢查兩表、PK、FK、型別、敏感欄、圖一致性與摘要；確認預期失敗。
- [x] 擴充 `scripts/check-database-schema.mjs`，讀取匯出字典並執行既有嚴格 Mermaid／ER 檢查，讓 Red 測試轉 Green。
- [x] 更新 `docs/diagrams/architecture/database-schema.er.json`，由字典投影兩表、中文 Wiki 說明及真實單欄 FK；複合 FK 只寫文字。
- [x] 更新 `docs/diagrams/architecture/database-table-inventory.md`，記錄已定的匯出落點、正典來源、新計數和仍未部署／未驗證項。
- [x] 若 CI 未自動選取新增測試，更新 `.github/workflows/ci.yml` 的資料庫規劃檢查 job。

## Task 3：四閘、審查與交付

- [x] 執行 `node --test scripts/tests/check-database-*.test.mjs scripts/tests/check-mvp-export-canonical.test.mjs`、`node scripts/check-database-schema.mjs`、plugin JSON Schema/build、`bash scripts/check-sdd.sh`、`git diff --check`；實際開啟 NoteCraft Wiki／Diagram 驗兩表及跳轉。
- [x] 依 `senior-code-reviewer`／`senior-security` 檢查資料隔離、授權和版本追溯；只處理阻擋缺陷。
- [x] 對照正典每條引用完成 Source-Verify；archive change 後再次核對 derived view 的 ID／版本／Changelog：26 個 FR／AC／SC 識別字均可定位於 014／017 正典，014 為 v8.0.0 且有 2026-10-08 Changelog，ADR-024／029／037 與引用檔案均存在；歸檔後修正兩個過時情境標題及 Purpose。
- [ ] 建立繁體中文 PR，CI 全綠及 review thread 清空後依既有授權合併；只將 #1160 真正完成的規劃項打勾，保留工時及 runtime 約束為待辦。

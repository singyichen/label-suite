# 任務清單：task-run-publication-integrity

> issue #1160 的未部署候選契約切片；只更新正典、字典、NoteCraft 與來源驗證，不新增 ORM、migration 或 API。主 session 核對 Red／Green 證據並獨自更新 checkbox；只有 final PR group 執行 archive。

## 1. 正典與 OpenSpec 契約

**故事目標**：014 SC-059～SC-061 — 已提交回執可逐位元核對、重試不重抽且失敗無可見半套發布，assignment 顯示狀態由唯一事實推導；013 AC-4.3 的初建版本指標維持同交易且同任務。

- [ ] 1.1 在 `scripts/tests/check-database-task-run.test.mjs` 增加初建循環 FK、回執位元組、失敗重試、assignment 投影與 327 欄的 Red 斷言，執行 `node --test scripts/tests/check-database-task-run.test.mjs` 並保存預期失敗原因，獨立提交 Red（證據提交 `d2b7ab11`：13 pass／5 預期 fail）。Exception: governance-propagation; Files: `scripts/tests/check-database-task-run.test.mjs`; Reason: 此規格契約測試由 senior-qa 獨立擁有，測試檔路徑的工具擁有權規則須服從 TDD Red 所有人。[@senior-qa]
- [ ] 1.2 釐清 `specs/task-management/013-task-new/spec.md` FR-006a／AC-4.3 的三個預配置 UUID 與提交時同任務非空指標；以 PATCH v8.3.1 記錄 Changelog，不改建立流程或 API 形狀。[@senior-sa]
- [ ] 1.3 修訂 `specs/task-management/014-task-detail/spec.md` FR-010f／FR-010f-6，新增 FR-010f-7、AC-3.48～AC-3.50、SC-059～SC-061，同步關鍵實體、v10.0.0 及 Changelog；保留既有 run 與排除情境。[@senior-sa]
- [ ] 1.4 新增 `openspec/changes/task-run-publication-integrity/specs/task-management/014-task-detail/spec.md`，將 1.3 的 FR／AC／SC 原文逐字鏡射為 ADDED／MODIFIED delta 與可驗證 Scenario，保留 FR-010f／FR-010f-6 既有 Scenario。[@senior-sa]
- [ ] 1.5 更新 `specs/STATUS.md` 的 013／014 版本與本次未部署契約狀態，維持 `in-progress`。[@senior-sa]

## 2. 候選字典與檢視投影

**故事目標**：014 SC-059～SC-061 — 候選 schema 的初建約束、回執欄位與唯讀 assignment 狀態同正典一致，NoteCraft 與總帳均顯示 38 表／327 欄／44 個候選單欄 FK。

- [ ] 2.1 修改 `docs/diagrams/architecture/task-run-db-schema.md`，明列 task 兩個非空同任務延後複合 FK、回執讀回／冪等／清理、assignment 無 `status` 及普通刪除限制。[@senior-dba]
- [ ] 2.2 修改 `docs/diagrams/architecture/database-schema.er.json`，移除 assignment 冗餘欄並同步 Wiki 說明與候選欄數。[@main]
- [ ] 2.3 修改 `docs/diagrams/architecture/database-table-inventory.md`，由實際 NoteCraft 資料推導新總數並標明未部署與保存政策待決。[@main]

## 3. 驗證與交付

**故事目標**：014 SC-059～SC-061 — 四層閘門分別保留證據，正典與 derived view 的每個穩定引用可定位。

- [ ] 3.1 驗證：執行 `openspec --version`（預期 ≥ 1.6.0）、`openspec validate task-run-publication-integrity --type change`、`bash scripts/check-sdd.sh`、`node --test scripts/tests/check-database-task-run.test.mjs scripts/tests/check-database-schema.test.mjs`、`node scripts/check-database-schema.mjs`、`git diff --check`；預期皆 exit 0，並記錄紅轉綠證據。[@main]
- [ ] 3.2 驗證：執行 NoteCraft plugin JSON Schema／build，實開 Wiki／Diagram 核對 38 表／327 欄與 assignment 說明；確認資料保存上限仍標示待決，雙庫與物件故障測試未誤稱通過。[@main]
- [ ] 3.3 由獨立 `senior-code-reviewer` 與 `senior-security` 檢查回執冪等、資料庫／外部物件失敗界線、答案隔離及派工狀態優先序；修正阻擋項後重驗。[@main]
- [ ] 3.4 final PR group 在 Gate 1～3 與 Source-Verify 證據完成後執行 `openspec archive task-run-publication-integrity --yes`，並依 `docs/sdd-workflow.md` §6.2 逐條檢查 derived view 的正典 ID、版本、Changelog、章節與檔案路徑；未經主 session 授權不得提前歸檔。Exception: governance-propagation; Files: `openspec/changes/task-run-publication-integrity/proposal.md`, `openspec/changes/task-run-publication-integrity/design.md`, `openspec/changes/task-run-publication-integrity/tasks.md`, `openspec/changes/task-run-publication-integrity/specs/task-management/014-task-detail/spec.md`, `openspec/specs/task-management/014-task-detail/spec.md`; Reason: archive 須在同一操作中移動 change 四件套並更新衍生檢視。[@main]

archive 後才依 final PR 流程交付；資料保存上限、SQLite／PostgreSQL migration 與物件失敗注入仍是後續獨立工作。

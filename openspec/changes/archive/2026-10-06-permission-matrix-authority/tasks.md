# 任務清單：permission-matrix-authority

> 本 change 是 issue #1160 D-9～D-13 的規劃契約；不建 ORM、migration、API 或 runtime。主 session 核對驗證證據並獨自更新 checkbox。每項檔案任務只修改所列單一檔；`specs/**` 與 `openspec/**` 不計入 PR 的 5 檔／300 行手寫生產程式限制。

## 1. 授權正典

**故事目標**：admin/007 SC-011 — V1 42 列矩陣是已映射操作的必要授權輸入，固定格、缺列拒絕及 reviewer 唯讀皆有單一來源。

- [x] 1.1 建立並接受 `docs/adr/037-permission-matrix-authorization.md`，定義身分→角色／membership→矩陣格→資源條件的順序與候選儲存契約。 [@main]
- [x] 1.2 修改 `docs/adr/021-jwt-refresh-token-auth.md`，區分當前 system role 硬邊界與矩陣授權，避免把 JWT role 視為權威。 [@main]
- [x] 1.3 修改 `specs/admin/007-role-settings/spec.md`，補 task.detail.edit、42 列、固定格、新鍵啟用、CAS／稽核與 FR／AC／SC、版本及 Changelog。 [@main]
- [x] 1.4 修改 `specs/admin/006-user-management/spec.md`，保留超管硬邊界並加入對應 admin 格與 SC-015。 [@main]

## 2. 下游操作與 membership

**故事目標**：task-management/010 SC-016、013 SC-006、014 SC-052 與 annotation/015 SC-013 — 操作鍵、任務範圍與 active role 可驗收，URL 參數不能升權。

- [x] 2.1 修改 `specs/task-management/010-task-list/spec.md`，界定列表鍵與刪除無 V1 專用鍵的硬邊界。 [@main]
- [x] 2.2 修改 `specs/task-management/013-task-new/spec.md`，讓建立任務同時要求現行角色與 task.create 格。 [@main]
- [x] 2.3 修改 `specs/task-management/014-task-detail/spec.md`，對映 view/edit/members/export，改用三元組 membership 與同角色判重。 [@main]
- [x] 2.4 修改 `specs/annotation/015-annotation-workspace/spec.md`，限定明選 active role 的寫入授權與答案隔離。 [@main]

## 3. OpenSpec 與候選資料投影

**故事目標**：admin/007 SC-011 — 正典、delta、候選字典與 NoteCraft 投影一致，且均標示尚未部署。

- [x] 3.1 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/proposal.md`，列出主規格、目標、受影響正典與憲章檢查。 [@main]
- [x] 3.2 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/design.md`，記錄授權順序、候選 schema、交易及 runtime 邊界。 [@main]
- [x] 3.3 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/tasks.md`，標註單一責任者與四層閘門。 [@main]
- [x] 3.4 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/specs/admin/006-user-management/spec.md`，鏡射修改的 FR／SC 原文。 [@main]
- [x] 3.5 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/specs/admin/007-role-settings/spec.md`，鏡射修改與新增的 FR／SC 原文。 [@main]
- [x] 3.6 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/specs/task-management/010-task-list/spec.md`，鏡射修改與新增的 FR／SC 原文。 [@main]
- [x] 3.7 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/specs/task-management/013-task-new/spec.md`，鏡射修改的 FR／SC 原文。 [@main]
- [x] 3.8 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/specs/task-management/014-task-detail/spec.md`，鏡射修改與新增的 FR／SC 原文。 [@main]
- [x] 3.9 建立 `openspec/changes/archive/2026-10-06-permission-matrix-authority/specs/annotation/015-annotation-workspace/spec.md`，鏡射新增的 FR／SC 原文。 [@main]
- [x] 3.10 先修改 `scripts/tests/check-database-schema.test.mjs`，執行新測試並記錄 39 列或 D-9 conditional 的預期 Red；原有測試仍應通過。Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: 正典來源驗證測試由 senior-qa 獨立建立並先於候選投影。 [@senior-qa]
- [x] 3.11 修改 `docs/diagrams/architecture/account-admin-db-schema.md`，更新兩個候選矩陣表、42 列、固定格、CHECK 與 D-9～D-13 狀態；以 3.10 已提交 Red 為前提。 [@main]
- [x] 3.12 修改 `docs/diagrams/architecture/database-schema.er.json`，同步 NoteCraft 候選圖且不虛構 task FK。 [@main]
- [x] 3.13 修改 `docs/diagrams/architecture/database-table-inventory.md`，同步狀態與仍待決的實體 task FK。 [@main]
- [x] 3.14 核對 `docs/diagrams/README.md`；現有說明仍準確，無需修改。 [@main]

## 4. 四層驗證與交付

**故事目標**：admin/007 SC-011 與 annotation/015 SC-013 — 每一條來源及衍生引用可定位，授權規劃不被誤認為 runtime 已實作。

- [x] 4.1 執行 `openspec --version`（至少 1.6.0）與 `openspec validate permission-matrix-authority --type change`；預期 exit 0 且六個鏡射 delta 均被偵測。 [@main]
- [x] 4.2 執行 `bash scripts/check-sdd.sh`；預期零新增錯誤，逐一核對 FR／SC 原文與正典版本、Changelog。 [@main]
- [x] 4.3 執行 `node --test scripts/tests/check-database-schema.test.mjs`、`node scripts/check-database-schema.mjs`、NoteCraft JSON Schema/build 與 `git diff --check`；3.10 Red 證據已成立，預期 exit 0。 [@main]
- [x] 4.4 執行 senior-dba、senior-code-reviewer 與 senior-security 審查，並檢視 NoteCraft Wiki／Diagram 的候選狀態、兩張矩陣表及 9 表／63 欄／6 FK。 [@main]
- [x] 4.5 final PR 中執行 Source-Verify 與 `openspec archive permission-matrix-authority`；archive 後以 `rg` 逐條確認衍生視圖的正典 ID、版本、Changelog、路徑及需求原文，並記錄 Test Plan。 [@main]

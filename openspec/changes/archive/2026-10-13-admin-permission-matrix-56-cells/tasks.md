# 任務清單：admin-permission-matrix-56-cells

> 主 session／per-issue lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。正式後端尚未實作，五個新鍵的 runtime 安全測試不在本 change 範圍（見 proposal「預設停用」解讀）；本 change 的可執行證據是 DB 投影測試與 prototype 矩陣測試。同 issue 的 `task-management-detail-lifecycle-roster-keys`、`annotation-exception-resolve-key` 兩個 change，以及 010／012 的 Lightweight PATCH，由同一 PR 承接，不在本清單勾選。

## 1. 規格提案與驗證

**故事目標**：SC-011 — 矩陣只儲存 56 列適用格；未知、待啟用、缺列、錯層與失效 membership 均拒絕。

> 依賴：序列 1.1 → 1.2，沒有平行任務。

- [x] 1.1 撰寫 `openspec/changes/admin-permission-matrix-56-cells/specs/admin/007-role-settings/spec.md`，以 `## MODIFIED Requirements` 收錄 FR-011、SC-011 的完整原文與既有情境，補 v1.3.0 修訂段與不帶 ID 的安全情境 [@main]
- [x] 1.2 執行 Gate 1 與 Gate 2，皆預期 exit 0：`openspec validate --changes --no-interactive`、`scripts/check-sdd.sh`、`scripts/speckit-tests.sh`，並在 scratchpad 乾跑 archive [@main]

## 2. DB 投影與 prototype 矩陣

**故事目標**：SC-011 — DB 文件與 prototype 矩陣同步為 22 鍵、56 列適用格，固定格增加 `admin.platform_overview.view` 兩格。

> 依賴：2.1 → 2.2 → 2.3；2.4 → 2.5；2.6 最後。2.1 與 2.4 的 committed Red 必須先於各自的實作。

- [x] 2.1 修改 `scripts/tests/check-database-schema.test.mjs`，把 admin-007 格數斷言改為 22 鍵／平台 20 列／任務 36 列／合計 56，先提交再執行並記錄預期失敗；Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]
- [x] 2.2 更新 `docs/diagrams/architecture/account-admin-db-schema.md` §3.8 與 M-08 的鍵數、列數與新鍵狀態，使 2.1 轉為通過 [@main]
- [x] 2.3 更新 `docs/diagrams/architecture/database-schema.er.json` 的 `admin_role_permission` 說明為 56 列，保留候選與尚未部署字樣 [@main]
- [x] 2.4 Red：修改 `design/prototype/tests/admin/role-settings.spec.ts`，把 `EXPECTED_PERMISSION_KEYS` 擴為 22 鍵並斷言 10／12 鍵、56 格、12 個固定格、編輯模式 44 格可勾；先提交再以 worktree 專屬 `PW_PORT` 執行並記錄預期失敗 [@senior-qa]
- [x] 2.5 Green：修改 `design/prototype/pages/admin/role-settings.html`，新增五列、中英文說明、預設值與平台總覽鍵的固定格；不得改寫 Red 契約，不動 audit drawer 空狀態 [@senior-frontend]
- [x] 2.6 執行 code/test gate：NoteCraft `node --test` 全組、`node scripts/check-database-schema.mjs`，以及於 `design/prototype/` 執行 `typecheck`、`test:node` 與受影響 Playwright 規格，皆預期 exit 0 [@main]

## 3. 正典回寫

**故事目標**：SC-011 — 正典記錄 56 列、五個「已登錄、待啟用」的鍵與名冊改歸。

- [x] 3.1 更新 `specs/admin/007-role-settings/spec.md` 完成 gate 4 回寫：白名單與兩張矩陣表加列、授權判斷規則改為 56 列與待啟用語意、成員管理鍵的說明補名冊、FR-011／SC-011 補 v1.3.0 修訂段（原文逐字保留）、新增一則 AC（編號接續使用者故事 3 現行最大者 AC-3.4）、版號 1.2.1 → 1.3.0、Changelog 頂端加一列 [@main]
- [x] 3.2 更新 `docs/adr/037-permission-matrix-authorization.md`，加一段 issue #1270 修訂：22 鍵／56 列、五鍵已登錄待啟用、名冊改歸 [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 checkbox 完成且 code review 通過後，本 PR 才執行 Source-Verify 與 `/opsx:archive admin-permission-matrix-56-cells`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-011、SC-011、AC-3.4 之後新增的 AC、`task-management/010-task-list` FR-010e、`annotation/015-annotation-workspace` FR-095、`task-management/014-task-detail` FR-023、`dashboard/012-dashboard` FR-008、ADR-037、issue #1270），確認每一條都能個別定位。

# Tasks: admin-role-settings-nav-shortcut

> **Apply 前硬閘**：先執行 `openspec validate admin-role-settings-nav-shortcut --type change`（或等價 non-strict all-changes command）與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者通過後必須停止，取得使用者明確確認才可進入 Stage 1 `/opsx:apply`。主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。

## 1. PR-725-FINAL — Red／Green、驗證與 archive 回寫（唯一且 final PR 群組）

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；順序：1.1 → 1.2 → 1.3 → 1.4 → 1.5。1.2 之 committed Red evidence 必須先於 1.3／1.4 Green；本群組手寫生產變更僅 `sidebar.js` 與 `sidebar.css` 兩檔，遵守 ≤ 5 檔／≤ 300 行（測試檔排除計算）。

**故事目標**：落實正典 FR-019 群與 SC-012 群（使用者故事 8）——`系統管理` 保持唯一 L0 項目，Desktop 未收合時可展開次選單直達 `role-settings`，Mobile／收合狀態與既有 admin-tabs 入口維持不變。

- [x] 1.1 新增 `design/prototype/tests/shared/issue-725-admin-submenu-shortcut.spec.ts`，涵蓋：次選單開關（`aria-expanded` 切換、`.navbar-center .nav-link` 計數維持 `6`）、點擊「角色設定」子項直達 `role-settings.html`（不經過 `user-management.html`）、目前子項標示（`role-settings.html`／`user-management.html` 各自的 `aria-current="page"` 分流）、點擊外部與 `Esc` 關閉次選單、Mobile（375px）與 Desktop 收合狀態下點擊「系統管理」仍直達 `user-management.html` 且不開啟次選單、`user-management.html` 既有 admin-tabs `#tabRoles` 入口與導頁不受影響；以獨立 Red commit 提交。 [@senior-qa]
- [x] 1.2 執行 Red 證據：自 design/prototype 執行 `pnpm playwright test --config playwright.local.config.ts tests/shared/issue-725-admin-submenu-shortcut.spec.ts`，預期因 `admin-nav-trigger`／`admin-nav-submenu`／`admin-nav-sublink-*` 測試 id 尚不存在而失敗，記錄 expected failure 之測試數與失敗原因。 [@senior-qa]
- [x] 1.3 修改 `design/prototype/pages/shared/sidebar.js`：新增 `getRoleSettingsHref()`、`getCurrentAdminSubKey()`、`adminSubmenuI18n`／`updateAdminSubmenuLanguage()`、`isAdminSubmenuAvailable()`、`setAdminSubmenuExpanded()`、`adminNavGroup()`（取代 admin 項目原本的 `navItem()` 渲染路徑，其餘 5 個 L0 項目不變）；於 `mountSidebar()` 綁定次選單點擊開關、點擊外部關閉、`Esc` 關閉（併入既有 keydown handler）、Desktop 收合切換與 `resize` 時自動收合次選單；於 `applyGlobalLanguage()` 併入 `updateAdminSubmenuLanguage()`。不得修改 Red contract、不得新增任何既有消費頁面 `mountSidebar()` 呼叫參數；以獨立 Green commit 提交。 [@senior-frontend]
- [x] 1.4 修改 `design/prototype/pages/shared/sidebar.css`：新增次選單相關樣式規則（trigger group 容器、展開箭頭、次選單容器與子項、子項目前狀態樣式），並於既有 mobile media query 區塊與 sidebar 收合選擇器下強制隱藏次選單與展開箭頭（defense-in-depth）；以獨立 commit 提交（延續 1.3 之樣式配套）。 [@senior-frontend]
- [x] 1.5 執行 command-only 完整驗證：自 design/prototype 執行 `pnpm typecheck` 與 `pnpm playwright test`（全套，含既有 `tests/shared/sidebar-*.spec.ts`、`tests/shared/mobile-top-actions.spec.ts` 確認無假陽性迴歸）；自專案根執行 `scripts/check-sdd.sh` 與 `git diff --check`；逐一記錄 exit code 與 Playwright 總數。 [@main]

## Pre-merge finalization (outside /opsx:apply) — NON-CHECKBOX

本段不屬於 `/opsx:apply`。全部 checkbox 完成後，main session 於同一 branch 執行 `/opsx:archive admin-role-settings-nav-shortcut`（CLI 不可用時手動回寫）：`specs/shared/008-sidebar-navbar-shared/spec.md` 版本升至 `1.5.0`，新增使用者故事 8、FR-019 群、SC-012 群，並於「L0 群組與目標頁（IA Contract）」Admin 條目補註次選單存在事實；於 `## Changelog` 表首新增一列。產生 `openspec/specs/shared/008-sidebar-navbar-shared/spec.md` derived view；將 proposal／design／tasks／delta 移至 `openspec/changes/archive/2026-09-13-admin-role-settings-nav-shortcut/`。接著依 `docs/sdd-workflow.md` §6.2 逐條 `grep -i` 驗證 FR/AC ID、testid、檔案路徑與 issue 編號皆可於正典定位。Final PR merge 後由 main session 更新 `specs/STATUS.md`（008 仍為 Active，不移動至 `_archive/`，僅記錄本次版本變更）。

# 任務清單：pl-exception-disposal-screen-shell

> **範圍硬閘**：只得修改 `design/prototype/**`、本 change 與正典／治理檔；不得修改 `backend/**`、`frontend/**` 或 root `e2e/**`。Apply 前執行 OpenSpec schema validation 與 Project SDD lint。

## 1. PR-907A — 最終例外處置畫面改用例外池專屬外殼

> **相依與平行性**：1.1 → 1.2 → 1.3 → 1.4 → 1.5 嚴格依序；1.2 與 1.3 集中於 `annotation-workspace.config.js` 與 `annotation-workspace.html` 的內嵌樣式段落，不可與其他動同檔的 change 並行 apply。

**故事目標**：延伸 SC-004W 所建立的「工作區版面與該單位資料層推導值一致」標準至專案負責人視角——專案負責人開啟最終例外處置畫面時，看到的 MUST 是例外池佇列與待處置計數，而非整份資料集的標記樣本、標記提交進度與永不前進的自動儲存狀態；並能就地看到仲裁理由與排除動作的風險提示。本畫面尚無對應 SC，其可量測成功標準於 1.5 的 archive 回寫時新增。

- [x] 1.1 以 `design/prototype/tests/annotation/issue-907-exception-pool-screen-shell.spec.ts` 建立 committed Red：以專案負責人身分開啟 T016 正式標記的最終例外處置畫面，斷言左側清單筆數等於該任務該回合的待處置例外項數且不含標記進度狀態、進度文字不含「已提交」、自動儲存狀態列不存在、每一例外項呈現仲裁者與仲裁理由、排除動作具備危險樣式類名。記錄 expected failure。 [@senior-qa]
  - Red commit：`8450dce6`。`PW_PORT=8994 pnpm playwright test tests/annotation/issue-907-exception-pool-screen-shell.spec.ts` → 本檔 5 failed／0 passed；預期失敗為左側渲染 5 個 `ws-sample-item`（待處置例外項僅 1 筆）、`ws-progress-text` 為 `0 / 5 已提交`、`ws-autosave-status` 可見且讀作「尚未儲存」、`ws-exception-pool-origin` 不存在、`exclude_from_dataset` 與其餘三個處置共用同一個 `mini-btn` 類名。
- [x] 1.2 Green：於 `design/prototype/pages/annotation/annotation-workspace.config.js` 將專案負責人自標記員的樣本清單、樣本導覽與自動儲存分支抽離，左側佇列改消費既有的 `listReviewPoolItems()` 待處置例外項，進度改以待處置例外項計數，並於每列呈現仲裁者與仲裁理由；不得弱化 1.1。 [@main]
  - 同一指令 → 5 passed／0 failed。Red 契約逐條保留未改動（`issue-907-exception-pool-screen-shell.spec.ts` 在 Green 期間 0 行變更）。
- [x] 1.3 於 `design/prototype/pages/annotation/annotation-workspace.html` 既有迷你按鈕樣式段落，為自資料集排除的操作項加上與其餘三個採用型處置可區辨的危險樣式，沿用設計系統既有 danger 色階 token。 [@main]
  - `.mini-btn-danger` 置於 `.mini-btn-active-bypass` 之後，沿用 `--color-error` 與 `--color-error-border`，未新增色票。
- [x] 1.4 執行 prototype typecheck、issue #907 定向 Playwright、全量 prototype Playwright、screen inventory 重生、使用者到達路徑圖時效檢查、Project SDD lint 與測試盤點；全部通過後才開 PR，CI 全綠後 merge。 [@main]
  - `pnpm typecheck` 通過；issue #907 定向 5 passed；全量 prototype Playwright 1945 passed（13.5m）；`node scripts/gen-screen-inventory.mjs` 重生後僅 015 的 SC 計數 44 → 45；`node scripts/check-user-path-map-freshness.mjs` 回報 `PATH_MAP_FRESH`；`scripts/check-sdd.sh` 0 error(s)／14 warning(s)（皆為既有 legacy 與人工複核類）；`scripts/inventory-tests.sh` 全數通過；`openspec validate --changes --no-interactive` 1 passed。
- [x] 1.5 正典 015 MINOR bump，修訂 FR-095 加入畫面外殼段落並新增一條可量測成功標準；delta 中的新情境於 archive 時接續對應使用者故事現行最大 AC 編號，補 Changelog；archive 後逐條 Source-Verify。 [@main]
  - 正典 `specs/annotation/015-annotation-workspace/spec.md` v6.15.1 → **v6.16.0**：FR-095（`:1006`）補「（**v6.16.0 新增**，issue #907，對應 AC-4.69）最終例外處置畫面的外殼」五點；新增 **AC-4.69**（`:627`，接續使用者故事 4 現行最大編號 AC-4.68）與 **SC-011**（`:1148`）；Changelog 新增 6.16.0 列（`:1178`），舊列逐字未改。
  - `openspec archive pl-exception-disposal-screen-shell --yes` → 歸檔為 `openspec/changes/archive/2026-09-24-pl-exception-disposal-screen-shell/`，衍生檢視 `~ 1 modified`。CLI 不更新衍生檢視 Purpose 行，故手動同步 `（v6.15.0）` → `（v6.16.0）` 並於「目前收錄」列舉補上本 change。
  - Source-Verify（逐條 grep 衍生檢視 FR-095 區段對正典）：`FR-051`／`FR-061`／`FR-063`／`FR-086`／`FR-095`／`AC-4.56`／`AC-4.57`／`AC-4.69`／`EXCEPTION_POOL_ACTIONS`／`OUTPUT_TYPE_REGISTRY`／`adopt_annotator`／`adopt_reviewer`／`custom_answer`／`exclude_from_dataset`／`exception_resolved`／`official_run`／`dry_run`／`task_id`／`run_type` 共 19 項全數命中，0 項 MISS。Changelog 所引程式碼識別字亦逐一複驗存在：`listReviewPoolItems()`（`annotation-workspace.data.js:2893`，唯一定義）、`pendingExceptions`（`annotation-workspace.config.js:2180` 與 `task-detail.data.js:1546` 同源消費，佐證 SC-011「列舉實作恰為 1 份」）、`.mini-btn-danger`（`annotation-workspace.html:529`）、`buildExceptionPoolItemRow()`（`annotation-workspace.config.js:4290`）。
  - `specs/STATUS.md` `annotation-015` 列同步 v6.16.0、狀態 `change-open` → `in-progress`（正典依 issue #578／#596 先例留在 `specs/annotation/`），分支欄改 `fix/907-pl-exception-screen-chrome`，並補一列 2026-09-24 變更紀錄。

## 非本 change 範圍

issue #907 預期結果第 4 點後半（底部改為「尚未選擇最終處置」＋「確認處置」）另立 issue 與 change：該改動會取代 AC-4.56／AC-4.57 已驗證的「一鍵完成」互動契約，屬互動模型變更而非畫面外殼。

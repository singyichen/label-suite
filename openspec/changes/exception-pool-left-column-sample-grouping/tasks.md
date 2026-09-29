# Tasks

## 1. Red — 建立預期失敗測試

**故事目標**：SC-011 — 專案負責人開啟最終例外處置畫面時，左側清單須以樣本分組呈現待處置例外項與其資訊層級，且既有「清單筆數與待處置例外項數一致、不列一般標記樣本、不用標記進度狀態」之既有保證不受影響（issue #1060）。

- [x] 1.1 於 `design/prototype/tests/annotation/issue-1060-exception-pool-sample-grouping.spec.ts` 新增涵蓋 UI-01 至 UI-05 的 Playwright 測試案例（zh 與 en 皆驗證 UI-02；鍵盤 Tab／Enter 與 title／aria-label 驗證 UI-04；1024px 與 375px 驗證 UI-05），commit 後於 PW_PORT=8982 執行並記錄預期失敗原因 [@senior-qa]

## 2. Green — 實作左欄樣本分組與資訊層級

> 2.1 與 2.2 依序在不同檔案上進行，2.3 須在兩者完成後執行，三者皆不可並行。

**故事目標**：SC-011 — 左側清單依樣本分組呈現待處置例外項數、文本摘要與人類可讀輸出類型名稱，且清單筆數、無一般標記樣本、無標記進度狀態之既有保證維持通過（issue #1060）。

- [x] 2.1 於 `design/prototype/pages/annotation/annotation-workspace.config.js` 改寫 renderExceptionQueueList，新增例外池專用分組輔助函式（功能命名分組 selector，與 reviewer 專用分組區隔），並新增例外池分組與待處置狀態之 zh/en I18N 條目；驗證：PW_PORT=8982 執行 Playwright 測試轉綠 [@senior-frontend]
- [x] 2.2 於 `design/prototype/pages/annotation/annotation-workspace.html` 擴充既有樣本項目與分組相關 CSS 規則，支援例外池分組樣式、長 ID 截斷與 1024px／375px RWD；驗證：PW_PORT=8982 執行 Playwright 測試之版面斷言轉綠 [@senior-frontend]
- [x] 2.3 執行 `node scripts/gen-screen-inventory.mjs` 重新生成 `design/system/screen-inventory.md`；驗證：git status --short 顯示該檔已更新且無其他未預期變更 [@senior-frontend]

## 3. 回歸與整合驗證

> 與 Green 任務序列相依，於 2.1 至 2.3 全數完成後執行。

**故事目標**：SC-011 — 本次左欄分組變更不影響既有例外池外殼、麵包屑與樣本分組相關規格之既有保證（issue #1060）。

- [x] 3.1 執行 `PW_PORT=8982 pnpm playwright test tests/annotation/issue-1060-exception-pool-sample-grouping.spec.ts tests/annotation/issue-907-exception-pool-screen-shell.spec.ts tests/annotation/issue-922-exception-breadcrumb.spec.ts tests/annotation/issue-455-workspace-unit-grouping.spec.ts`，確認四個測試檔全數通過 [@main]
- [x] 3.2 執行 `pnpm typecheck`，確認 exit 0 [@main]

# 任務清單：1120-015-arbitration-output-unit（issue #1120）

> **Apply 前硬閘**：先 `openspec validate --changes --no-interactive`（OpenSpec schema validation），再 `scripts/check-sdd.sh`（Project SDD lint）。兩者皆通過才進入實作。
>
> **沒有 Red／Green 配對的理由**：原型 `listReviewPoolItems()` 已依 FR-059 之 `outKey × 合併鍵` 逐項計數，依新條文寫的測試在條文改動前即通過，沒有可寫的失敗契約（同 issue #864 前例）。改以釘住測試加突變探針作為證據；本 change 不修改任何產品檔案。
>
> **單一目的**：本 change 是 1120 `tasks.md` 所列「015 擁有、G5 後獨立 PR」的計數單位定義，承載 propose、證據、正典回寫與 archive。

## 1. 仲裁輸出項目計數單位（final PR）

**故事目標**（SC-004R）：讓任務詳情頁的仲裁進度計數以 FR-059 之爭議項逐項計數，同一輸出類型內多個合併鍵的差異不會被合併成一筆。

- [ ] 1.1 撰寫 `design/prototype/tests/task-management/issue-1120-arbitration-output-unit.spec.ts` 釘住測試，涵蓋 delta 之計數單位條文：同一 `multi_label` 輸出內兩個合併鍵差異時，進度頁籤 `待仲裁` 為 2；一項 `adopt_a`、一項 `兩者皆非` 送出後 `待仲裁` 為 0、`最終例外待處置` 為 1；案例登錄於 prototype 測試盤點清單。驗證：`PW_PORT=8981 pnpm playwright test tests/task-management/issue-1120-arbitration-output-unit.spec.ts` exit 0，且暫時把計數改為每個 outKey 一筆之突變探針下出現失敗、探針還原後無殘留 [@senior-qa]
- [ ] 1.2 回寫正典 `specs/annotation/015-annotation-workspace/spec.md` 至 v10.1.0：FR-061 新增計數單位一點、新增對應 AC、Changelog 置頂一列、frontmatter 功能分支更新。驗證：`scripts/check-sdd.sh` exit 0 [@main]
- [ ] 1.3 更新 `specs/STATUS.md` 之 annotation-015 列與變更紀錄。驗證：`scripts/check-spec-artifacts.sh` exit 0 [@main]
- [ ] 1.4 執行 `node scripts/gen-screen-inventory.mjs` 重生畫面盤點清單。驗證：`node scripts/gen-screen-inventory.mjs --check` exit 0 [@main]
- [ ] 1.5 執行 Source-Verify 預掃：delta 與正典回寫中每一個 FR／AC／SC 編號、檔案路徑與 issue 編號皆可於正典或 repo 以 grep 定位。驗證：預掃逐項 grep 命中 [@main]
- [ ] 1.6 執行 `npx -y -p @fission-ai/openspec openspec archive 1120-015-arbitration-output-unit --yes`，並複驗衍生檢視 FR-061 引用。驗證：`scripts/check-sdd.sh` exit 0 [@main]

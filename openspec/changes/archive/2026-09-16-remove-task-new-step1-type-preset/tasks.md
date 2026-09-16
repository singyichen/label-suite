# 任務清單：remove-task-new-step1-type-preset

> **角色分工**：主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。實作角色不得改寫 1.1 的測試契約以求通過。

## 1. 移除 Step 1 一鍵預設並同步盤點

> **相依與平行性**：1.1 的 committed 失敗證據必須先於 1.2～1.5；1.2～1.5 為互不相依之淨刪除，可平行執行；1.6～1.7 描述的是移除後狀態，須待 1.2～1.5 全數完成後才執行。
>
> **執行紀錄（1.4）**：除原訂四處外另須移除語言切換處理器內之 `renderTaskTypePresets();` 呼叫。本項原訂的驗證 pattern 使用小寫 `taskTypePreset`，無法命中大寫開頭的 `renderTaskTypePresets`，故該處未被斷言涵蓋，由主 session 以 `grep -rni` 跨檔複驗後補除；若留下該呼叫，每次切換語言都會丟 `ReferenceError`。

**故事目標**：SC-001、SC-002e — 移除 FR-002f 後，Step 1 任務類型選擇回到 FR-002／FR-002a–FR-002e 定義之三段式模型，使用者仍可完成 Step 1~4 建立任務，且既有輸出 chip 的單選與互斥語意不受影響。

- [x] 1.1 修改 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts`，將「預設按鈕可用」契約改寫為移除後契約，斷言 Step 1 不存在預設容器、標籤與任何預設按鈕，且三段式選擇器仍可獨立湊出合法組合並啟用下一步；此迴歸斷言須補齊 `validateStep1()` 之完整前置條件——任務名稱非空、已上傳資料集、`single_item` 需恰好 1 個 `input` 角色欄位——否則下一步恆為 disabled 而斷言形同恆假；先提交此單檔 Red，再執行 prototype 測試，expected failure 必須只因預設實作仍存在於 DOM，並保存 command、exit 與失敗訊息。 [@senior-qa]
- [x] 1.2 Green：只修改 `design/prototype/pages/task-management/task-config.data.js`，移除 `TASK_TYPE_PRESETS` 常數定義與其區塊註解；驗證 `grep -c "TASK_TYPE_PRESETS" design/prototype/pages/task-management/task-config.data.js` 回傳 0，且其後之 `FIELD_ROLE_LABELS` 不受影響。 [@senior-frontend]
- [x] 1.3 修改 `design/prototype/pages/task-management/task-config.engine.js`，移除 `renderTaskTypePresets()` 與 `applyTaskTypePreset()` 兩個函式、其區塊註解，以及 `initTaskTypeChips()` 內的呼叫點；不得移除 `syncChipsFromState()` 或 `onChipSelectionChange()`，兩者另有其他呼叫者；驗證 `grep -c "TaskTypePreset" design/prototype/pages/task-management/task-config.engine.js` 回傳 0 且 `grep -c "function syncChipsFromState" design/prototype/pages/task-management/task-config.engine.js` 回傳 1。 [@senior-frontend]
- [x] 1.4 修改 `design/prototype/pages/task-management/task-new.html`，移除預設容器與其標籤 div 及上方註解、zh 與 en 兩處預設標籤詞條、語言切換 ids 陣列中的對應項，以及語言切換處理器內殘留的預設重繪呼叫；不得改動 `validateStep1()` 或下一步啟用邏輯；驗證 `grep -rni "taskTypePreset" design/prototype/pages/task-management/task-new.html` 無輸出。 [@senior-frontend]
- [x] 1.5 修改 `design/prototype/pages/task-management/task-config.css`，移除預設按鈕群組、按鈕與其 hover 之樣式規則與區塊註解；不得動到其後 `.task-type-selector` 起始之三段式選擇器樣式；驗證 `grep -c "task-type-preset" design/prototype/pages/task-management/task-config.css` 回傳 0。 [@senior-frontend]
- [x] 1.6 修改 `design/system/inventory-manifest.json`，移除元件字典中的預設按鈕條目、頁面 08 之 components 陣列項與 note 內對應片段；驗證 `grep -c "preset-button" design/system/inventory-manifest.json` 回傳 0 且檔案仍為合法 JSON。 [@senior-frontend]
- [x] 1.7 執行 generated view 重產與盤點驗證：`node scripts/gen-screen-inventory.mjs`、`bash scripts/inventory-tests.sh`、`git diff --stat design/system/screen-inventory.md`；前兩者預期 exit 0，第三者預期顯示該檔已更新，以證明盤點文件與移除後實作一致。 [@main]

## 2. 驗證閘門

> **相依與平行性**：前置條件為第 1 組全數完成；本組只有 command-only verification，不修改檔案。任一紅燈即停並回報。

**故事目標**：SC-001 — 以型別、prototype 測試與 Project SDD lint 三道獨立 gate 證明移除後 Step 1~4 建立流程與既有驗收條文皆未受損。

- [x] 2.1 執行 command-only verification：於 `design/prototype/` 執行 `corepack pnpm typecheck` 與 `corepack pnpm playwright test`，於專案根目錄執行 `bash scripts/check-sdd.sh`；全部預期 exit 0，其中 1.1 之測試須由失敗轉為通過，分開記錄 code/test gate 與 Project SDD lint 的輸出作為證據。 [@main]

## 3. 正典回寫與封存

> **相依與平行性**：僅本 change 之最終 PR 執行；須在第 2 組全綠後依 3.1 → 3.2 → 3.3 → 3.4 序列進行。

**故事目標**：SC-002g — 以 archive 與正典回寫移除 SC-002g 及其對應 FR-002f、AC-1.4、AC-1.5，使正典、衍生檢視與實作三者一致。

- [x] 3.1 執行 archive 合併：以絕對路徑 `/Users/mandychen/Library/pnpm/openspec` 執行 `openspec archive`（本機另有舊版會靜默 no-op），將 REMOVED Requirements 併入衍生檢視；驗證 `grep -c "FR-002f" openspec/specs/task-management/013-task-new/spec.md` 回傳 0。 [@main]
- [x] 3.2 修改 `specs/task-management/013-task-new/spec.md`，移除 FR-002f、AC-1.4、AC-1.5、SC-002g、變更摘要之 v7.1.0 條目、Step 1 UI 描述中的一鍵套用項與對應邊界情況，版本號由 v7.1.0 改為 v8.0.0，並新增 Changelog 條目記錄移除理由與後續追蹤 issue。 [@main]
- [x] 3.3 修改 `specs/STATUS.md`，同步 task-management-013 之版本號與分支欄；驗證 `grep -n "task-management-013" specs/STATUS.md` 顯示更新後的值。 [@main]
- [x] 3.4 執行 Source-Verify：以 `grep` 逐項複驗衍生檢視與正典中每個引用之 FR/AC/SC ID、檔案路徑與 issue 編號（#645、#724、#755）皆可定位，保存指令輸出作為 gate 4 證據。 [@main]

## 4. 交付

> **相依與平行性**：前置條件為第 3 組完成；4.1 與 4.2 可依序執行。
>
> **執行紀錄**：4.1 issue #724 已重開並留言 https://github.com/singyichen/label-suite/issues/724#issuecomment-5691882389（方向①實作後回退、方向②③轉由 issue #755 承接）；4.2 PR https://github.com/singyichen/label-suite/pull/770。

**故事目標**：SC-001 — 以重新開啟的 issue 與 PR 完整記錄「方向①已實作後回退」之決策軌跡，避免日後在不知情下重新提出同一方向。

- [x] 4.1 重新開啟 issue #724 並以繁體中文留言註記：一鍵預設方向已實作後判定投報率不成立而回退，欄位角色與必填預設兩個方向仍由 issue #755 追蹤；記錄 issue URL。 [@main]
- [x] 4.2 開 PR，使用繁體中文標題與內文，附測試由紅轉綠之證據與四道 gate 的驗證輸出。 [@main]

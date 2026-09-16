# Tasks — 移除 Step 1 任務類型常用組合一鍵預設

目標 SC：本 change 移除 SC-002g，故驗收目標為「移除後 Step 1 任務類型選擇回到 FR-002／FR-002a–FR-002e 定義之三段式選擇模型，且既有 SC-002、SC-002b–SC-002f 不受影響」。

## 1. Red 契約

> 本組為單一任務，須先 commit 並跑出預期失敗，才可進入第 2 組。

- [ ] 1.1 將 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts` 由「預設按鈕可用」契約改寫為移除後契約：斷言 Step 1 不存在 `#taskTypePresets` 容器、不存在 `#taskTypePresetsLabel` 標籤、不存在任何 `[data-testid^="task-type-preset-"]` 按鈕，並斷言三段式選擇器仍可獨立湊出 `classification` + `single_item` + `single_label` 且 `下一步` 按鈕啟用；提交後執行 `corepack pnpm playwright test tests/task-management/issue-724-task-new-step1-preset.spec.ts`（於 `design/prototype/`），預期失敗且失敗原因為「預設按鈕仍存在於 DOM」 [@senior-qa]

## 2. Green 實作（移除）

> 本組各任務皆為淨刪除、互不相依，但共同決定第 1 組測試能否轉綠；須全數完成後才重跑測試。

<!-- parallel:start -->
- [ ] 2.1 `design/prototype/pages/task-management/task-config.data.js`：移除 `TASK_TYPE_PRESETS` 常數定義；驗證 `grep -c "TASK_TYPE_PRESETS" design/prototype/pages/task-management/task-config.data.js` 回傳 0 [@senior-frontend]
- [ ] 2.2 `design/prototype/pages/task-management/task-config.engine.js`：移除 `renderTaskTypePresets()` 與 `applyTaskTypePreset()` 兩個函式及其區塊註解，並移除 `initTaskTypeChips()` 內的 `renderTaskTypePresets();` 呼叫；不得移除 `syncChipsFromState()` 或 `onChipSelectionChange()`（另有 5 處呼叫者）；驗證 `grep -c "TaskTypePreset" design/prototype/pages/task-management/task-config.engine.js` 回傳 0 且 `grep -c "function syncChipsFromState" …/task-config.engine.js` 回傳 1 [@senior-frontend]
- [ ] 2.3 `design/prototype/pages/task-management/task-new.html`：移除 `taskTypePresetsLabel` 與 `taskTypePresets` 兩個 div 及其上方註解、zh 與 en 兩處 `taskTypePresetsLabel` 詞條、語言切換 `ids` 陣列中的 `'taskTypePresetsLabel'` 項；驗證 `grep -c "taskTypePreset\|常用組合" design/prototype/pages/task-management/task-new.html` 回傳 0 [@senior-frontend]
- [ ] 2.4 `design/prototype/pages/task-management/task-config.css`：移除 `.task-type-presets-label`、`.task-type-presets`、`.task-type-preset-btn`、`.task-type-preset-btn:hover` 樣式規則與其區塊註解；不得動到其下 `.task-type-selector` 起始之三段式選擇器樣式；驗證 `grep -c "task-type-preset" design/prototype/pages/task-management/task-config.css` 回傳 0 [@senior-frontend]
<!-- parallel:end -->

## 3. 設計系統盤點同步

> 需第 2 組完成後執行（manifest 描述的是移除後狀態）。

- [ ] 3.1 `design/system/inventory-manifest.json`：移除 `preset-button` 元件條目與頁面 08 note 內「Preset Button 為 Step 1 常用組合一鍵預設（issue #724），尚未收錄進 MASTER.md 之 Button 變體目錄；」片段；驗證 `grep -c "preset-button\|常用組合" design/system/inventory-manifest.json` 回傳 0 [@senior-frontend]
- [ ] 3.2 重新產生 generated view：於專案根目錄執行 `node scripts/gen-screen-inventory.mjs`，再執行 `bash scripts/inventory-tests.sh`，預期兩者皆 exit 0 且 `git diff --stat design/system/screen-inventory.md` 顯示該檔已更新 [@main]

## 4. 驗證閘門

> 第 1–3 組全數完成後執行；任一紅燈即停並回報。

- [ ] 4.1 於 `design/prototype/` 執行 `corepack pnpm typecheck`，預期 exit 0 [@main]
- [ ] 4.2 於 `design/prototype/` 執行 `corepack pnpm playwright test`，預期 exit 0 且第 1.1 項之 Red 測試轉綠（留存 Green 證據） [@main]
- [ ] 4.3 於專案根目錄執行 `bash scripts/check-sdd.sh`，預期 exit 0 [@main]

## 5. 正典回寫與封存

> 僅本 change 之最終 PR 執行；須在第 4 組全綠後進行。

- [ ] 5.1 執行 `openspec archive`（本機須用絕對路徑 `/Users/mandychen/Library/pnpm/openspec`，v1.10.0），將 `## REMOVED Requirements` 合併入衍生檢視 `openspec/specs/task-management/013-task-new/spec.md`；驗證 `grep -c "FR-002f" openspec/specs/task-management/013-task-new/spec.md` 回傳 0 [@main]
- [ ] 5.2 `specs/task-management/013-task-new/spec.md`：移除 FR-002f、AC-1.4、AC-1.5、SC-002g、變更摘要 v7.1.0 條目、Step 1 UI 描述中「常用組合一鍵套用」項與對應邊界情況，版本號 v7.1.0 → **v8.0.0** 並新增 Changelog 條目記錄移除理由與 issue 追蹤；驗證 `grep -c "FR-002f\|AC-1.4\|AC-1.5\|SC-002g\|常用組合" specs/task-management/013-task-new/spec.md` 僅命中 Changelog 條目本身 [@main]
- [ ] 5.3 `specs/STATUS.md`：同步 `task-management-013` 之版本號與分支欄至 v8.0.0 / `feat/remove-task-new-step1-preset`；驗證 `grep -n "task-management-013" specs/STATUS.md` 顯示更新後值 [@main]
- [ ] 5.4 Source-Verify：以 `grep` 逐項複驗衍生檢視與正典中每個引用之 FR/AC ID、檔案路徑、issue 編號（#645／#724／#755）皆可定位，留存指令輸出作為 gate 4 證據 [@main]

## 6. 交付

- [ ] 6.1 重新開啟 issue #724 並以繁中留言註記：方向①（一鍵預設）已實作後判定投報率不成立而回退，方向②③仍由 issue #755 追蹤；記錄 issue URL [@main]
- [ ] 6.2 開 PR（繁中標題與內文，`<type>: <中文描述>` 格式），附 Red／Green 證據與四道 gate 之驗證輸出 [@main]

## 1. PR 群組 A — 事件模型與 action 常數化（FR-016B、FR-086）

> 本群組為後續所有群組的地基，必須最先合併。組內 1.1 → 1.2 → 1.3 → 1.4 → 1.5 嚴格序列；與其他群組無並行空間。
> 產品檔案：`design/prototype/pages/shared/annotation-history.js`（新增）、`annotation-workspace.html`、`annotation-workspace.config.js`（共 3 檔）。
> 本群組只換渲染層。資料層仍寫入舊值 `saved`，因此既有草稿事件在本群組合併後暫時以中性徽章呈現（符合 FR-086 對集合外值的規定）；寫入端更名於群組 B 的 2.2 完成。

- [x] 1.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-history-actions.spec.ts`：斷言 AC-2.16（七種 `HISTORY_ACTIONS` 各自呈現一個徽章且七色兩兩不同；集合外舊值以中性徽章呈現且清單其餘事件正常渲染）與 AC-2.15 第二個 **AND**（缺新欄位之舊事件原樣顯示、不擲錯）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [x] 1.2 新增 `design/prototype/pages/shared/annotation-history.js`：定義 `HISTORY_ACTIONS` 常數、`action` → 徽章語意色的單一對應表與事件建構函式；驗證方式為 `corepack pnpm typecheck`（於 `design/prototype/`）exit 0 [@senior-frontend]
- [x] 1.3 修改 `design/prototype/pages/annotation/annotation-workspace.html`：載入 1.2 的共用模組，並為七個 action 各定義一組語意色徽章樣式（既有 `.saved` 規則由 `.draft-saved` 取代，`.adjudicated` 由死碼轉為 FR-086 用途）；驗證方式為 `corepack pnpm typecheck` exit 0 [@senior-frontend]
- [x] 1.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderHistoryPanel()` 改由 1.2 的對應表推導徽章，移除三值硬編分支，集合外值走中性徽章；驗證方式為 1.1 的 Red 測試轉綠 [@senior-frontend]
- [x] 1.5 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且 1.1 新增案例全綠；核對 Red／Green 證據後勾選本群組 [@main]

## 2. PR 群組 B — 結果快照與分層遮蔽（FR-087 純值部分、FR-090）

> 依賴群組 A 合併。組內 2.1 → 2.2 → 2.3 → 2.4 → 2.5 嚴格序列。
> 產品檔案：`annotation-workspace.data.js`、`annotation-workspace.config.js`、`annotation-workspace.html`、`annotation-list.html`、`task-detail.html`（共 5 檔；後兩者只加一行共用模組 `<script>`，因為它們同樣載入 `annotation-workspace.data.js`）。
> **實測修正**：`wsSubmissions` 早已於 issue #283 由整包 blob 改為 per-bucket key（`labelsuite.wsSubmissions.<bucketKey>`），design.md D6 所述的「整包 read-modify-write」現況不成立。同一 bucket 內仍是 read-modify-write，快照放大體積後仍值得改為事件層級追加，但風險等級低於 propose 時的判斷。
> 本群組含 Data Fairness NON-NEGOTIABLE 的遮蔽契約，測試必須斷言「被遮蔽內容不存在於檢視者可取得的輸出中」，不得只斷言畫面不可見。

- [ ] 2.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-history-snapshot-masking.spec.ts`：斷言 AC-2.17（純值前後差異、首次提交呈現為全新內容）與 AC-4.51（標記員取不到他人快照與理由、reviewer 兩人皆可見、仲裁者仍看不到他人未提交草稿）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [ ] 2.2 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：`appendHistoryEvent()` 改用共用模組的 `createEvent()` 與 `ACTIONS` 常數（草稿事件由 `saved` 更名為 `draft_saved`），事件寫入 `result_snapshot`（精簡 `outputs[]`，排除原始文本與資料集欄位），`getSampleHistory()` 改為接受檢視者脈絡並依序套用 FR-062、FR-090 回傳已遮蔽事件，同一 bucket 內改為事件層級追加寫入；驗證方式為 2.1 中 AC-4.51 三個斷言轉綠，且既有 `issue-470-autosave-indicator-honesty.spec.ts` 的 `action === 'saved'` 斷言同步更名後仍綠 [@senior-frontend]
- [ ] 2.2b 修改 `design/prototype/pages/annotation/annotation-list.html` 與 `design/prototype/pages/task-management/task-detail.html`：各加一行 `<script src="../shared/annotation-history.js">`（相對路徑依各頁位置），使 `annotation-workspace.data.js` 在三個載入端都能取得共用模組；驗證方式為三頁載入後 `window.LabelSuiteAnnotationHistory` 皆存在且無 console error。Exception: scaffold; Files: annotation-list.html, task-detail.html; Reason: 同一個共用模組的載入接線，分成兩個任務只會讓依賴半接上 [@senior-frontend]
- [ ] 2.3 修改 `design/prototype/pages/annotation/annotation-workspace.html`：歷程卡片新增差異區塊與理由區塊的版型容器；驗證方式為 `corepack pnpm typecheck` exit 0 且卡片於既有事件下不產生空白區塊 [@senior-frontend]
- [ ] 2.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：渲染純值輸出類型的前後差異與理由，缺欄位不渲染；驗證方式為 2.1 中 AC-2.17 斷言轉綠 [@senior-frontend]
- [ ] 2.5 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且既有盲審隔離測試（FR-062 相關）未退化；核對 Red／Green 證據後勾選本群組 [@main]

## 3. PR 群組 C — 位置型輸出差異（FR-087 位置型部分）

> 依賴群組 B 合併。組內 3.1 → 3.2 → 3.3 嚴格序列。
> 產品檔案：`design/prototype/pages/shared/annotation-history.js`（共 1 檔）。

- [ ] 3.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-entity-diff.spec.ts`：斷言 AC-2.18（3→4 實體且一個 span 由 `[0,4]` 改為 `[0,6]` 時列出 1 筆新增與 1 筆邊界變更；實體數量相同但邊界不同時差異區塊不得為空；起點相同而標籤不同時列為一刪一增）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [ ] 3.2 修改 `design/prototype/pages/shared/annotation-history.js`：新增依 `OUTPUT_TYPE_REGISTRY` 註冊的 span 對齊比對器（起點＋標籤配對，比對 `end` 判定邊界變更），不得逐 task 硬編；驗證方式為 3.1 的 Red 測試轉綠 [@senior-frontend]
- [ ] 3.3 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0；核對 Red／Green 證據後勾選本群組 [@main]

## 4. PR 群組 D — 標記耗時（FR-088）

> 依賴群組 A 合併，與群組 C 無檔案交集，可與群組 C 並行開發但須各自獨立開 PR。組內 4.1 → 4.2 → 4.3 → 4.4 嚴格序列。
> 產品檔案：`annotation-workspace.config.js`、`annotation-workspace.data.js`（共 2 檔）。
> 計時器測試必須全程使用假時鐘，不得混用真實 `Date.now()`（本頁 autosave 有真／假時鐘混用競態前例）。

- [ ] 4.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-lead-time.spec.ts`：斷言 AC-2.19（分頁切背景期間不計入、`lead_time` 小於 `at` 與 `started_at` 之差）與 AC-3.49（annotator 視角無任何耗時呈現、reviewer 視角可見）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [ ] 4.2 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：以 `visibilitychange`／`blur`／`focus` 驅動可見時間累計，並依角色決定是否渲染耗時；驗證方式為 4.1 中 AC-3.49 斷言轉綠 [@senior-frontend]
- [ ] 4.3 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：事件寫入 `started_at` 與 `lead_time`；驗證方式為 4.1 中 AC-2.19 斷言轉綠 [@senior-frontend]
- [ ] 4.4 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且既有 autosave 測試未因新計時器退化；核對 Red／Green 證據後勾選本群組 [@main]

## 5. PR 群組 E — 動作理由必填（FR-089）

> 依賴群組 B 合併（`reason` 欄位由該群組落地）。組內 5.1 → 5.2 → 5.3 → 5.4 嚴格序列。
> 產品檔案：`annotation-workspace.html`、`annotation-workspace.config.js`（共 2 檔）。
> 本群組含標記員互動的 **BREAKING** 變更（跳過由單鍵改為需填理由）。

- [ ] 5.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-reason-required.spec.ts`：斷言 AC-2.20（未填理由時跳過被阻擋且不產生 `skipped` 事件、填理由後 `reason` 等於所填值）與 AC-3.50（仲裁未填理由被阻擋並指名缺理由項目、填後 `adjudicated` 事件帶 `reason`）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [ ] 5.2 修改 `design/prototype/pages/annotation/annotation-workspace.html`：新增跳過理由輸入與仲裁理由輸入的必填欄位版型；驗證方式為 `corepack pnpm typecheck` exit 0 且欄位於未觸發跳過／仲裁時計數為 0 [@senior-frontend]
- [ ] 5.3 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：跳過與仲裁送出前驗證理由並阻擋、理由寫入事件 `reason`，審核側沿用 FR-016A 既有 `reasons` 來源不另存第二份；驗證方式為 5.1 的 Red 測試轉綠 [@senior-frontend]
- [ ] 5.4 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0 且既有 FR-016A／FR-083／FR-085 退回理由測試未退化；核對 Red／Green 證據後勾選本群組 [@main]

## 6. PR 群組 F — 標記清單處理狀況彙總（FR-091）

> 依賴群組 A 與 D 合併（最後動作取自常數化 `action`，累計耗時取自 `lead_time`）。組內 6.1 → 6.2 → 6.3 嚴格序列。
> 產品檔案：`design/prototype/pages/annotation/annotation-list.html`（共 1 檔）。

- [ ] 6.1 撰寫 Red 測試 `design/prototype/tests/annotation/issue-578-list-summary.spec.ts`：斷言 AC-1.25（reviewer 檢視顯示最後動作／最後活動時間／累計耗時；annotator 檢視不呈現累計耗時；無歷程事件之樣本三項皆為空狀態而非零值）；提交並執行，記錄預期失敗原因 [@senior-qa]
- [ ] 6.2 修改 `design/prototype/pages/annotation/annotation-list.html`：每筆樣本新增三項彙總，全部由歷程事件推導、不另存第二份；驗證方式為 6.1 的 Red 測試轉綠 [@senior-frontend]
- [ ] 6.3 執行 `cd design/prototype && corepack pnpm typecheck && corepack pnpm playwright test`，預期兩者皆 exit 0；核對 Red／Green 證據後勾選本群組 [@main]

## 7. 最終 PR 群組 — Source-Verify 與 archive 回寫

> 僅在群組 A ~ F 全數合併後執行；本群組完成第 4 道驗證閘。

- [ ] 7.1 執行 `openspec validate --changes --no-interactive`，預期 `change/enrich-annotation-history` 通過（第 1 道閘：OpenSpec schema） [@main]
- [ ] 7.2 逐條以 `grep` 驗證 delta 中每個引用的正典 ID（FR-016A、FR-016B、FR-049、FR-050、FR-062、FR-083、FR-085）皆可於 `specs/annotation/015-annotation-workspace/spec.md` 定位，記錄命中行號作為 Source-Verify 證據（第 4 道閘前置） [@main]
- [ ] 7.3 執行 `openspec archive enrich-annotation-history`，並回寫正典 `specs/annotation/015-annotation-workspace/spec.md`：版本 4.60.0 → 4.61.0、新增 Changelog 條目、納入 FR-086 ~ FR-091 與對應 AC；驗證方式為衍生檢視不殘留任何 delta 標題且正典版號與 Changelog 已更新 [@main]
- [ ] 7.4 最終 PR 合併後更新 `specs/STATUS.md`，並於 issue #578 附上完成摘要後關閉 [@main]

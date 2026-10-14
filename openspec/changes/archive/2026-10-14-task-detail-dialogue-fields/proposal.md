---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1386
基準版本: 014 v12.2.4
目標版本: 014 v12.3.0
---

## Why

issue #1386：對話串任務在 `task-detail` 的「自動」清單標題顯示「5 筆資料」，而非第 1 則對話文字。根因是 task-detail 從不載入任務已儲存的 `dialogue_fields`。Green 補上載入後，獨立審查發現更大的問題：`state.dialogueFields` 一旦非 `undefined`，共用引擎的 `renderDialogueBlock()` 也會啟用，基本資料編輯模式會多出可編輯的對話串確認區（`#inlineDialogueBlock`），但儲存不寫回 `dialogue_fields`，使用者的編輯會被默默丟掉；取消再開還會因 `dialogueDeclined` 未重設而關掉開關、讓標題回到「N 筆資料」。

維護者已裁定（issue #1386 留言，2026-10-14）：不隱藏、不改唯讀（會讓 FR-014k 的同構缺一塊，且要改引擎），改由 task-detail 同時承接 `dialogue_fields` 的**載入與儲存**。013 v8.5.0 Changelog 寫明「task-detail 載入與儲存另案」，本 change 就是那個「另案」；013 的歷史 Changelog 列不得改寫，014 的 Changelog 於 archive 時指名 #1386 並說明承接。

本單新增 AC（MINOR），不符合 Lightweight Path（新增 FR／AC），走完整 OpenSpec change。

**是否需要存在（YAGNI 檢查）**：需要。FR-014k 已要求基本資料編輯模式與 013 Step 1 同構，而 013 Step 1 已有對話串確認區；不補載入與儲存，要嘛使用者編輯被丟棄，要嘛 parity 缺一塊。沒有更小的作法：隱藏區塊已被維護者否決。

**Generalization-First（NON-NEGOTIABLE）**：沿用 013 task-management/013-task-new FR-002c-10 的偵測、預填與確認規則與共用引擎，不依欄位名稱硬編，也不新增 task-detail 專屬的對話串偵測。非對話任務行為不變。

**Data Fairness（NON-NEGOTIABLE）**：`dialogue_fields` 只指向 Input 物件陣列欄位內部的子欄位；預覽與標題摘要的文字來源不含 Output／Evidence 欄位（沿用 013 AC-1.12 與 015 FR-106）。

**Frontend Ready Gate 九項紀錄**

1. 通過：014 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：014 Prototype Traceability 已連到 `task-detail.config.js`、`task-config.engine.js` 與 `task-detail-config-parity.spec.ts`。
3. `N/A`：不新增 route，沿用 `task-detail` 既有 route 與角色白名單（Project Leader 可編輯，Reviewer 唯讀）。
4. 通過：非對話任務不顯示確認區；使用者取消提議（declined）與取消編輯的還原行為見 `design.md` D2、D3；唯讀沿用既有規則。
5. 通過：沿用 013 既有 `data-testid`（`dialogue-field-*`）與 `#inlineDialogueBlock`，不新增 selector，見 `design.md` D5。
6. 通過：`dialogue_fields` 形狀沿用 013 task-management/013-task-new FR-002c-10（`{ text, speaker, utt_id, reply_to } | null`）；錯誤情境為已儲存值不再合法（沿用 013 的失效規則），見 `design.md` D1。
7. 通過：沿用 `TASK_CONFIG_I18N` zh／en 字串；控制項為既有原生元件。
8. 通過：屬 `task-config.engine.js` 共用引擎，無新增 shared 元件；Storybook 不適用（prototype 階段）。
9. 通過：儲存後去向仍為設定分頁檢視狀態；`design/system/user-path-map.html` 無 F3／F4 命中新增。

## What Changes

- **新增 FR-014k-1**（基本資料編輯模式的對話串確認區）：進入編輯模式時，確認區以已儲存的 `dialogue_fields` 初始化；`dialogue_fields` 為 `null` 或缺漏時依 013 task-management/013-task-new FR-002c-10 的偵測與預填規則，非對話任務不顯示確認區、行為不變；儲存時將當下確認結果寫回 `dialogue_fields`（使用者取消提議或無對話串時為 `null`）；取消編輯（含放棄變更的頁內確認）還原已儲存值，重新進入編輯模式時開關與自動標題回到已儲存狀態；「自動」清單標題預覽與 015 FR-106 的 `getRecordSummaryText` 一致。
- **新增 FR-014l-4**（標記設定預覽）：對話串任務的 Step 2 同構預覽以對話串呈現，每則一列，沿用 013 task-management/013-task-new FR-002c-10 與 AC-1.12。
- **新增 AC-3.80～AC-3.84**：依序驗收載入初始化、儲存寫回、取消還原、自動標題與 FR-106 一致、標記設定預覽以對話串呈現。新增 AC 放在新增的 ADDED Requirement 區塊，避免在 MODIFIED 區塊內新增 AC ID 造成 `check-sdd` 紅燈。
- **不修訂既有 FR-014k、FR-014l-1 措辭**：新條文以 FR-014k-1／FR-014l-4 補足，既有條文原文保留。
- **不處理**：013 與 015 正典條文不變（013 v8.5.0 Changelog 歷史列不改寫）；task-detail 唯讀顯示模式不新增對話串區塊。

## Capabilities

- 修改：`task-management/014-task-detail`（新增 FR-014k-1、FR-014l-4；新增 AC-3.80～AC-3.84）。

## Impact

- 產品檔案（3 個）：`task-detail.config.js`（由 `TASK_DATA.dialogue_fields` 初始化 `state.dialogueFields`，重新 seed 時重設 `state.dialogueDeclined = false`）、`task-detail.html`（載入 profile 的 `dialogue_fields` 到 `TASK_DATA`，儲存路徑寫回；不得動 `renderSettingsEditState()`）、`task-config.engine.js`（僅註解，已於 5e612314 完成）。
- 既有 commit 保留：Red `2f60f225`（auto 標題）、Green `5e612314`（seed 載入）、`ff54c878`（重生 screen inventory）。
- 正典 014 於 archive 時寫回 v12.2.4 → v12.3.0（MINOR：新增 FR／AC）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：沿用共用引擎與 013 規則，無任務類型硬編。
- **Data Fairness（NON-NEGOTIABLE）**：文字來源限 Input，預覽與標題不含 Output。
- **Simplicity First / YAGNI**：不新增偵測、不新增 selector、不改引擎行為。
- **PR 規模（Principle X）**：產品檔案 3 個（遠低於 5 個），預估 ≤ 60 行；單一 PR。

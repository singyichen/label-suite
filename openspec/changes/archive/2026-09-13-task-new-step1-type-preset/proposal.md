---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #724
基準版本: 013 v7.0.2
目標版本: 013 v7.1.0
---

## Why

issue #645 的使用者到達路徑圖以 F1（點擊數超標）門檻檢視目標 G5，task-new Step 1 是全站點擊數最高的單一畫面，而建立任務是專案負責人最高頻的操作，Step 1 的摩擦會被重複支付。

issue #724 指出 Step 1 有兩個結構性的高點擊位置：① 任務型態必須跨大分類、輸入類型、輸出類型三個群組各選一次，即使是最常見的任務型態（文字分類、單一標籤）也至少要 3 次點選才湊得出一組合法的 `selected_categories[]` / `input_type` / `selectedOutputTypes[]`；② 資料集欄位角色逐欄指派、點擊數隨欄位數線性成長，且沒有批次動作或依欄名自動推測。

本 change 只承接方向 ①（型態選擇一鍵預設），理由是它是三個結構性高點位置中「新增程式碼量最小、且不改變任何既有驗證與資料形狀」的一項：`OUTPUT_TYPE_REGISTRY` 與 `TASK_TAXONOMY` 早已是三段式選擇器共用的資料來源，一鍵預設只是把既有的三次 chip 點選批次成一次呼叫，不新增資料形狀、不改變 `validateStep1()` 的判斷條件。方向 ②（欄位角色批次動作／自動推測）與方向 ③（檢視 `validateStep1()` 必填項是否有可用合理預設值免點）需要新增資料形狀（欄名慣例對照表、批次套用 UI）或改變驗證關卡語意，風險與工作量都明顯更高，且與方向 ① 分屬 Step 1 內互相獨立的兩個介面區塊（任務類型選擇器 vs. 資料集欄位角色表格），可各自獨立驗收與交付；已另開 issue 追蹤方向 ②／③ 的後續工作（詳見 Impact）。

## What Changes

- **新增「常用組合」一鍵預設**：Step 1 的三組 chip（大分類／輸入類型／輸出類型）上方新增一列由 `OUTPUT_TYPE_REGISTRY` 與 `TASK_TAXONOMY` 衍生的預設按鈕；本版提供 1 個預設——「文字分類（單一標籤）」（`classification` + `single_item` + `single_label`，對應現行任務清單 fixture 中命中數最高的任務型態）。點擊預設按鈕，在單一互動內同時寫入 `selected_categories[]`、`input_type`、`selectedOutputTypes[]`，效果與逐一點選三組 chip 完全等價（含 `outputs[].type` 推導、Step 2 schema 初始化）。
- **保留三段式自訂入口**：套用預設後，三組 chip 維持可見、可個別再調整（新增、取消、替換任一已選項），不停用、不隱藏、不移除任何現有能力；使用者仍可完全略過預設、只用三段式選擇器手動組合。
- **不新增資料形狀**：預設清單為新增的靜態設定資料（`TASK_TYPE_PRESETS`，比照既有 `TASK_TAXONOMY` 的 config-driven 模式），套用後寫入的仍是既有的 `state.taskCategories` / `state.taskInputTypes` / `state.taskOutputTypes`，不新增或修改任何提交 payload 欄位、不改變 `validateStep1()` 的必填判斷。

## Capabilities

### New Capabilities

- `task-management/013-task-new`：Step 1 任務類型選擇新增「常用組合一鍵預設」子能力（FR-002f）——registry/taxonomy 驅動的批次選取捷徑，與既有三段式選擇器並存而非取代。

### Modified Capabilities

- 無（FR-002 系列既有需求之選擇語意、cascade 規則與 `下一步` 啟用條件皆不變；本 change 只新增 FR-002f 與對應 AC/SC/邊界情況，不修改既有條文）。

## Impact

**規格**

- 正典：`specs/task-management/013-task-new/spec.md`（v7.0.2 → **v7.1.0**，MINOR：新增 FR-002f、AC-1.4、SC-002g 與 1 條邊界情況，不移除或修改既有 FR/AC/SC）
- 衍生檢視：`openspec/specs/task-management/013-task-new/spec.md`（archive 時自動合併）
- `specs/STATUS.md`：`task-management-013` 列版本號與分支欄同步更新

**原型程式（Principle X 之產品檔案盤點，共 4 個手寫產品檔案）**

| 檔案 | 變更 |
|------|------|
| `design/prototype/pages/task-management/task-config.data.js` | 新增 `TASK_TYPE_PRESETS` 常數（config-driven 預設清單） |
| `design/prototype/pages/task-management/task-config.engine.js` | 新增 `renderTaskTypePresets()` / `applyTaskTypePreset()`，接入既有 `initTaskTypeChips()` |
| `design/prototype/pages/task-management/task-new.html` | Step 1 新增預設按鈕容器與其 zh/en 標籤，語言切換時同步重繪 |
| `design/prototype/pages/task-management/task-config.css` | 新增預設按鈕群組與按鈕的最小樣式，沿用既有 chip 樣式慣例 |

4 個手寫產品檔案、預估 diff 遠低於 300 行，單一 PR 即可完成（propose／apply／archive 同 PR，依 ADR-033 Rule 1 與 git-workflow.md）。

**測試**

- 新增 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts`：斷言 1 次點擊完成原本 3 次點擊才能湊齊的合法組合、三段式選擇器套用後仍可個別調整、並以同一測試資料集記錄套用前後點擊數對照（PR 描述所附之可重現證據來源）。

**後續追蹤（本 change 不承接）**

- 新開 issue：方向 ②「資料集欄位角色批次動作或依欄名自動推測初值」與方向 ③「檢視 `validateStep1()` 必填項是否有可免點的合理預設值」（issue URL 於 PR 描述與任務清單補上）。

## Constitution Check

| 原則 | 檢核 |
|------|------|
| **Generalization-First（NON-NEGOTIABLE）** | ✅ 通過。`TASK_TYPE_PRESETS` 為資料表而非任務類型專屬程式邏輯；套用邏輯讀取 preset 的 `category`／`inputType`／`outputTypes` 欄位並重用既有 `syncChipsFromState()` / `onChipSelectionChange()`，不在選擇核心流程新增依大分類或輸出類型 key 的硬編分支。 |
| **Data Fairness（NON-NEGOTIABLE）** | ✅ 通過。本 change 僅影響 Step 1 任務類型選擇的互動效率，不涉及任何標記者可見資料或 ground-truth 欄位。 |
| **Principle X（PR 規模）** | ✅ 通過，4 個手寫產品檔案、預估 diff 遠低於 300 行，單一 PR 即可完成，無需拆分。 |
| **TDD** | ✅ 每項可觀察行為皆配對 Red（`senior-qa` 角色）與 Green（`senior-frontend` 角色）任務，Red 須先 commit 並留下預期失敗證據。 |
| **PR Single Purpose** | ✅ 單一目的：「Step 1 任務類型選擇新增一鍵預設，降低必點次數」。 |
| **Simplicity First** | ✅ 不新增資料形狀、不改變既有驗證關卡；預設清單本版僅 1 筆，足以驗證機制且不過度設計。 |

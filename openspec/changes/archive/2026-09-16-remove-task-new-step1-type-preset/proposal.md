---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #724
基準版本: 013 v7.1.0
目標版本: 013 v8.0.0
---

## Why

013 v7.1.0（2026-09-13，issue #724 方向①）在 Step 1 三段式任務類型選擇器上方新增了「常用組合・一鍵套用」預設按鈕列（FR-002f）。上線後檢視實際版面，該功能的投報率不成立：預設清單本版只有 1 筆（「文字分類（單一標籤）」），卻佔用 Step 1 「任務類型」欄位最上方一整列的視覺權重，並在三組 chip 之外多加一層使用者必須先理解「這列跟下面三組是什麼關係」的介面概念。單一預設換來的是「多一個要讀懂的東西」，而不是「少一些要點的東西」——只有恰好要建立該一種任務型態的使用者省下 2 次點擊，其餘使用者付出的是額外的閱讀成本。

issue #645 使用者到達路徑圖的 F1（點擊數超標）門檻並不因此落空：issue #724 同時指出的方向②（資料集欄位角色批次動作或依欄名自動推測初值）與方向③（檢視 `validateStep1()` 必填項是否有可免點的合理預設值）仍由 issue #755 承接，且方向②的點擊數隨欄位數線性成長，是 Step 1 更大的結構性摩擦來源。移除方向①不等於放棄該門檻，而是把介面預算留給真正有效的那一半。

## What Changes

- **BREAKING（規格層）移除 FR-002f「常用組合一鍵預設」**：Step 1 不再提供任何 registry／taxonomy 衍生的一鍵預設按鈕列；任務類型一律回到「大分類 → 輸入類型 → 輸出類型」三組 chip 的三段式選擇，即 v7.0.2 的選擇模型。同時移除其配套的 AC-1.4、AC-1.5、SC-002g 與對應邊界情況條文。
- **不改動任何既有選擇語意**：FR-002／FR-002a–FR-002e 的選擇規則、cascade 行為（`rebuildOutputChips()`）、`deriveTaskType()` 推導、`validateStep1()` 必填判斷與 `下一步` 啟用條件皆完全不變。FR-002f 當初以「零新資料形狀、不碰核心流程」的方式實作（proposal `task-new-step1-type-preset` 之 Constitution Check 有案），因此移除亦不在核心流程留下殘跡。
- **提交 payload 不變**：`selected_categories[]`、`input_type`、`selectedOutputTypes[]` 與 `outputs[].type` 推導結果不新增、不移除、不改變形狀；預設按鈕本來就只是批次寫入既有 state，移除後這些欄位仍由三組 chip 逐一寫入。
- **移除 config-driven 預設資料表 `TASK_TYPE_PRESETS`**：不保留供未來復用。若日後重新評估需要預設機制，應依當時的使用證據重新設計（YAGNI；保留無人呼叫的資料與函式會同時違反 Simplicity First 與 Fail Loudly）。

## Capabilities

### New Capabilities

- 無。

### Modified Capabilities

- `task-management/013-task-new`：移除 Step 1 任務類型選擇的「常用組合一鍵預設」子能力（FR-002f）及其驗收條文（AC-1.4、AC-1.5、SC-002g）與 1 條邊界情況；FR-002 系列其餘條文不變。

## Impact

**規格**

- 正典：`specs/task-management/013-task-new/spec.md`（v7.1.0 → **v8.0.0**，MAJOR：移除既有 FR-002f、AC-1.4、AC-1.5、SC-002g 與 1 條邊界情況。依 semver 對規格的語意，移除任何既有 FR/AC 即為 breaking，與實作 diff 大小無關）
- 衍生檢視：`openspec/specs/task-management/013-task-new/spec.md`（archive 時自動合併 `## REMOVED Requirements`）
- `specs/STATUS.md`：`task-management-013` 列版本號與分支欄同步更新

**原型程式（Principle X 之產品檔案盤點，共 4 個手寫產品檔案）**

| 檔案 | 變更 |
|------|------|
| `design/prototype/pages/task-management/task-config.data.js` | 移除 `TASK_TYPE_PRESETS` 常數 |
| `design/prototype/pages/task-management/task-config.engine.js` | 移除 `renderTaskTypePresets()` / `applyTaskTypePreset()` 及 `initTaskTypeChips()` 內之呼叫點 |
| `design/prototype/pages/task-management/task-new.html` | 移除 Step 1 預設按鈕容器與其標籤 div、zh/en `taskTypePresetsLabel` 詞條、語言切換 `ids` 陣列項 |
| `design/prototype/pages/task-management/task-config.css` | 移除 `.task-type-presets-label` / `.task-type-presets` / `.task-type-preset-btn`（含 `:hover`）樣式規則 |

4 個手寫產品檔案、diff 為淨刪除且遠低於 300 行，單一 PR 即可完成（propose／apply／archive 同 PR，依 ADR-033 Rule 1 與 git-workflow.md）。

`syncChipsFromState()` 與 `onChipSelectionChange()` 另有其他呼叫者（`task-new.html`、`task-detail.config.js`、`task-detail.html`），不因本 change 成為孤兒，不得一併移除。

**設計系統盤點（generated view，不計入 Principle X）**

- `design/system/inventory-manifest.json`：移除 `preset-button` 元件條目與頁面 08 之 note 片段
- `design/system/screen-inventory.md`：以 `node scripts/gen-screen-inventory.mjs` 重新產生（generated view，禁止手改）

**測試**

- 移除 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts` 原有之「預設可用」斷言，改寫為移除後的契約：Step 1 不存在預設按鈕容器與按鈕、三段式選擇器仍可獨立湊出 `classification` + `single_item` + `single_label` 之合法組合並通過 `validateStep1()`。

**後續追蹤（本 change 不承接）**

- issue #724：重新開啟並註記方向①已實作後判定為多餘而回退，方向②③仍由 issue #755 追蹤。
- issue #755：方向②「資料集欄位角色批次動作或依欄名自動推測初值」與方向③「`validateStep1()` 必填項是否有可免點的合理預設值」。

## Constitution Check

| 原則 | 檢核 |
|------|------|
| **Generalization-First（NON-NEGOTIABLE）** | ✅ 通過。移除的是一份純資料表與其兩個讀取函式，不在任何任務類型的選擇流程留下硬編分支；移除後 Step 1 的選擇邏輯完全由 `TASK_TAXONOMY` 與 `OUTPUT_TYPE_REGISTRY` 驅動，泛化程度不降反升（少一條特例捷徑）。 |
| **Data Fairness（NON-NEGOTIABLE）** | ✅ 通過。本 change 僅影響 Step 1 任務類型選擇的互動方式，不涉及任何標記者可見資料或 ground-truth 欄位。 |
| **Principle X（PR 規模）** | ✅ 通過，4 個手寫產品檔案、淨刪除且 diff 遠低於 300 行（測試、`specs/**`、`openspec/**`、generated view 依規則不計入門檻），單一 PR 即可完成，無需拆分。 |
| **TDD** | ✅ Red 先行：由 `senior-qa` 將既有 preset 測試改寫為「預設按鈕不存在」契約並 commit、跑出預期失敗（此時實作尚未移除，斷言必紅），再由實作角色執行 Green。實作角色不得改寫該 Red 契約以求通過。 |
| **PR Single Purpose** | ✅ 單一目的：「移除 Step 1 常用組合一鍵預設」。一句話可描述、無 and／also。 |
| **Simplicity First** | ✅ 完整移除而非保留死碼：不留下無人呼叫的 `TASK_TYPE_PRESETS` 或預設函式供「未來可能復用」，避免 YAGNI 違規與規格／實作背離。 |
| **Ratchet Principle** | ✅ 移除理由與後續追蹤同時寫入 spec Changelog（v8.0.0 條目）與重新開啟的 issue #724，決策軌跡可回溯，避免日後有人在不知情下重新提出同一方向。 |

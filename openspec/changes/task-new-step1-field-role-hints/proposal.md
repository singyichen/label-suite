---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #755
基準版本: 013 v7.1.0
目標版本: 013 v7.2.0
---

## Why

issue #645 的使用者到達路徑圖以 F1（點擊數超標）門檻檢視 task-new Step 1，issue #724 指出兩個結構性高點擊位置：① 任務型態三段式選擇、② 資料集欄位角色逐欄指派。方向 ① 已由 `task-new-step1-type-preset`（已 archive 為 `2026-09-13-task-new-step1-type-preset`）以常用組合一鍵預設解決；本 change 承接尚未處理的方向 ②，並依 spec v7.1.0 Changelog 的既有記錄檢視方向 ③（`validateStep1()` 必填項有無可免點的合理預設值）。

**Source-Verify 更正**：issue #755 body 以 `FIELD_ROLES`（Evidence／Input／Output／不使用）稱呼欄位角色下拉選單，這與正典 `specs/task-management/013-task-new/spec.md:84`（規格常數）及 FR-002c（spec.md:551）的既有條文用字一致，屬於 spec 層級的說明性代稱。但若照字面在程式碼中搜尋 `FIELD_ROLES` 這個識別字，全 repo 零命中（已以 `/usr/bin/grep` 確認）；實際程式碼識別字為狀態 `state.fieldRoleMap`（`design/prototype/pages/task-management/task-config.engine.js`，例見 :310、:1544、:1575、:3393）與標籤表 `FIELD_ROLE_LABELS`（`design/prototype/pages/task-management/task-config.data.js:602-605`）。本 change 之 spec delta 一律使用可 grep 定位的程式碼識別字，避免 Source-Verify 於 archive 後失效。另已確認 `applyAll`／`bulkRole`／`guessRole`／`autoRole`／「整批」／「全部套用」等批次捷徑關鍵字在 `task-config.engine.js` 全數零命中，issue 主張「確實缺少批次或自動推測捷徑」成立。

**方向 ①（批次動作 vs. 欄名自動推測）之取捨**：issue 併列兩個子方向——(a) 批次動作按鈕（如「全部設為 Input」）、(b) 依欄名慣例自動推測初值（如含 `label`／`answer` 自動預填 Output）。本 change 兩者皆不採用其字面提案，改採**僅限 Input 角色**的欄名自動推測，理由如下：

1. **批次動作按鈕（a）語意衝突**：`FR-002c-2` 要求 Input 欄位數量必須依 `input_type` 恰好為 1（`single_item`）或 2（`item_pair`），「全部設為 Input」對任何欄位數 > 2 的資料集都會立即違反此硬性數量限制，按鈕本身的預設語意即與既有驗證規則衝突，需要額外規則才能定義「設哪幾欄」——複雜度不低於直接做欄名推測，且多一次點擊（使用者仍須按按鈕）。
2. **Output／Evidence 欄名自動推測（b 的完整字面提案）違反 Data Fairness（NON-NEGOTIABLE）風險**：FR-003g-5 明訂 Output 角色資料為「建立者明確指定的 annotator-visible preannotation」，「隱藏 test-set ground truth 仍不得透過 API、前端 state 或 preview 下發給標記者」。若欄名含 `label`／`answer`／`gold` 即自動預填為 Output，等同把「是否公開此欄位給標記者」的判斷從建立者手中移交給欄名字面比對——一旦資料集欄名恰好是保留答案（如 `gold_label`、`gold_answer`），使用者只要沒有逐欄覆寫就可能無意間洩漏 test-set 答案。經逐檔解析 `docs/product/example-data/` 全部 17 份 fixture 的首列欄名，`gold_label`（`single-label.json`／四份 `review-flow-*.json`）、`gold_labels`（`multi-label.json`／`multi-label-hierarchical.json`）、`gold_entities`（`entity-recognition.json`）、`gold_answer`（`free-text.json`）、`gold_triplets`（`absa-va.json`）、`gold_scores`（`multi-dim.json`）、`gold_score`（`single-dim.json`）、`Label`（`nli.json`）、`answer`（`mrc.json`）確實普遍存在，此風險並非理論案例。
3. **Input 角色安全且仍能達成點擊數下降目標**：Input 是原始輸入內容，不是被評分或需要保密的欄位。以 `docs/product/example-data/` 全部 **17 份** fixture 逐檔解析首列欄名實測（非抽樣、非估計）：七個關鍵字命中 **14/17**，未命中者為 `mrc.json`（`article_id`／`angle`／`instruction`／`background`／`question`／`answer`）、`multi-dim.json`（`id`／`source`／`translation`／`gold_scores`）、`nli.json`（`ID`／`Title`／`Premise`／`Hypothesis`／`Label`／`Evidence`／`Source ID`／`Source URL`）。14 份命中全部經由 `text` 一個關鍵字達成，其餘六個關鍵字於現有語料零命中（屬前瞻性保留，不影響現況效益）。同一次實測亦確認七個關鍵字**未命中任何 `gold_*`／`label`／`answer` 欄位**，故此清單在現有語料上不構成 Data Fairness 風險。未命中的三份恰為需要兩個 Input 的 `item_pair` 情境（`nli` 的 Premise／Hypothesis、`mrc` 的 question／background），該情境本 change 不提供捷徑、維持逐欄手動指定。Output／Evidence 角色自動推測則為永久排除（見下方維護者裁決 1）。

**方向 ③（`validateStep1()` 必填項預設值）之結論**：`task_name` 與資料集上傳為使用者必須主動完成的真實動作，無安全的合理預設值，不予變更。任務類型三個群組已由 issue #724 的 FR-002f 一鍵預設解決，不在本 change 範圍。`validateStep1()` 唯一因欄位角色指定而阻擋的情形是 Input 缺值（`getFieldsByRole('input')` 檢查），而 Input 角色的取得已由上述欄名自動推測（FR-002c-8）間接降低必點次數；`validateStep1()` 函式本身的判斷邏輯不需要修改，因此本 change 不改動 `design/prototype/pages/task-management/task-new.html`。

## What Changes

- **新增 FR-002c-8**：Step 1 嵌入式資料預覽表格為尚未指定過角色的欄位初始化角色時，依欄名慣例自動推測 Input 角色初始值（規格常數 `FIELD_ROLE_INPUT_NAME_HINTS`，欄名不分大小寫比對子字串），推測數量受 `FR-002c-2` 既有的 Input 欄位數量上限約束（`single_item` 1 個、`item_pair` 2 個），超出上限或未命中欄名線索的欄位維持「不使用」；使用者仍可逐欄覆寫推測結果。
- **不修訂任何既有條文**：與 FR-002c-1 預設值規則的關係改由 FR-002c-8 自述為「FR-002c-1 之具名例外」承載，FR-002c-1 的其餘規則（資料列來源記憶、`field_role_map` payload 形狀、Evidence／Output 為 optional、Input 受 FR-002c-2 約束）完全不受影響。

  改採此承載方式而非 `## MODIFIED Requirements`，是因為 `openspec archive` 把 delta 套用在 `openspec/specs/` 衍生檢視上，而該檢視只累積歷來 OpenSpec change 碰過的條文——013 的衍生檢視目前僅有 FR-003d-1／FR-003d-3／FR-002f 三條，不含 FR-002c-1。**已於暫存複本實測**：原寫法執行 `openspec archive` 會硬中止並回報 `task-management/013-task-new MODIFIED failed for header "### Requirement: FR-002c-1 欄位角色指定行為規則" - not found`、`Aborted. No files were changed.`；而 `openspec validate` 對此**完全無訊號**（`specs-apply.js` 只被 `archive.js` import，validate 呼叫鏈不經過它），故 gate 1 通過不構成 archive 可行的證據。
- **新增 AC-1.6、AC-1.7、SC-002h**：驗收欄名命中線索的欄位可於 0 次點擊內完成 Input 指定、重新上傳後仍取得 Input 初始值，且不影響使用者手動覆寫能力。
- **不提供批次動作按鈕**：經上述評估後不採用，理由見 Why。
- **不對 Evidence／Output 角色做任何自動推測**：僅限 Input，理由見 Why（Data Fairness）。
- **不新增或變更提交 payload 欄位**：`field_role_map: Record<string, FieldRole>` 形狀不變，本 change 只改變其預設值的產生方式。
- **不修改 `validateStep1()`**：理由見 Why。

## Capabilities

### New Capabilities

- `task-management/013-task-new`：Step 1 資料集欄位角色新增「Input 欄名自動推測初始值」子能力（FR-002c-8）——欄名慣例驅動的初始值捷徑，與既有逐欄手動指定並存而非取代，且不涵蓋 Evidence／Output。

### Modified Capabilities

（無）本 change 為純新增：FR-002c-8 以具名例外自述其相對 FR-002c-1 的優先順序，未修訂任何既有條文。

## Impact

**規格**

- 正典：`specs/task-management/013-task-new/spec.md`（v7.1.0 → **v7.2.0**，MINOR：新增 FR-002c-8、AC-1.6、AC-1.7、SC-002h，不移除也不改寫任何既有 FR/AC/SC）
- **正典回寫的附加動作（不在 delta 內，須由 gate 4 回寫者執行）**：於正典 FR-002c-1（`spec.md:552`）的預設值敘述後補一句交叉引用「（例外見 FR-002c-8）」。delta 保持純新增是為了讓 `openspec archive` 能套用到衍生檢視；但 `specs/` 是給人閱讀的 SSoT，FR-002c-1 若完全不提示例外存在，單獨閱讀該條會得到錯誤結論。此附加動作使衍生檢視與正典就此句刻意不一致，屬已知且已記錄的分歧（衍生檢視本就不是正典鏡像）。
- 衍生檢視：`openspec/specs/task-management/013-task-new/spec.md`（archive 時自動合併）
- `specs/STATUS.md`：`task-management-013` 列分支欄由已合併之舊分支 `feat/task-new-step1-click-reduction` 校正為本 change 分支 `feat/task-new-step1-field-role-hints`，狀態由 `in-progress` 改為 `change-open`（比照 `task-new-step1-type-preset` 先例，見 `tasks.md` 群組 0）

**原型程式（Principle X 之產品檔案盤點，共 2 個手寫產品檔案，預估 diff 遠低於 300 行）**

| 檔案 | 變更 | 預估行數 |
|------|------|---------|
| `design/prototype/pages/task-management/task-config.data.js` | 新增 `FIELD_ROLE_INPUT_NAME_HINTS` 常數（config-driven 欄名線索陣列） | 約 10 行 |
| `design/prototype/pages/task-management/task-config.engine.js` | 修改 `renderInlineDatasetPreview()` 內「Init fieldRoleMap for any new columns」初始化迴圈，套用欄名比對與 Input 數量上限邏輯 | 約 20–25 行 |

2 個手寫產品檔案、預估合計 diff 約 30–35 行，單一 PR 即可完成（propose／apply／archive 同 PR，依 ADR-033 Rule 1 與 git-workflow.md），無需拆分為多個 PR 群組。

**對 `task-management/014-task-detail` 的影響**：`renderInlineDatasetPreview()` 為 013 與 014 共用引擎（見 013 spec `## Prototype Traceability`），FR-002c-8 的觸發條件明確限定於「尚未指定過角色的欄位」，且不得覆寫使用者已手動指定或依資料列來源記憶（FR-002c-1／FR-002c-4）還原的既有角色——因此 014 概覽面板載入既有任務（欄位角色已由建立時的 `field_role_map` 決定）時不受影響；僅當 014 的資料集編輯情境出現全新、先前未指定過角色的欄位時才會套用相同推測邏輯，效果與 013 一致（同一份共用引擎、同一條規則，不需在 014 spec 另立條文）。`tasks.md` 已安排 014 概覽面板的回歸驗證任務。

**測試**

- 新增 `design/prototype/tests/task-management/issue-755-field-role-input-hints.spec.ts`：斷言欄名命中線索的欄位於初始化後角色下拉選單已為 Input、未命中欄位維持「不使用」、推測數量受 Input 上限約束、使用者仍可手動覆寫，並以 014 task-detail 概覽面板驗證既有任務之已配置角色不受影響。PR 描述須附改動前後、以同一測試資料集實測的點擊次數對照（比照 issue #724 先例），實測數據於 apply 階段以 Playwright 斷言為準，propose 階段不預先臆測數字。

**維護者裁決（2026-09-16 問答式定案，原「後續追蹤」）**

1. **Output／Evidence 角色永久不做欄名自動推測**——不是本版的暫行範圍限制，而是定案規則，已寫成 FR-002c-8 的顯式條款（`MUST NOT` ＋ Data Fairness 理由 ＋ 放寬前置條件），不另開追蹤 issue。理由：欄名字面比對會把「是否對標記者公開此欄」的判斷移出建立者手中，而 `gold_label`／`gold_answer`／`gold_entities` 等保留答案欄名在既有 fixture 普遍存在，構成實際的 test-set 答案洩漏途徑。日後若要放寬，須先提出不依賴欄名比對的建立者確認機制。
2. **`FIELD_ROLE_INPUT_NAME_HINTS` 關鍵字清單定案為七個**：`text`／`content`／`sentence`／`passage`／`document`／`body`／`context`，apply 階段不再擴充。清單內容已寫入 FR-002c-8 規格本文（而非僅存在於本提案），使 archive 後的 gate 4 Source-Verify 可直接於正典定位。依據是 `docs/product/example-data/` 全部 17 份 fixture 的逐檔欄名實測（命中 14/17，全由 `text` 達成，其餘六個關鍵字於現有語料零命中）；此為刻意的保守取捨——寧可漏推測（使用者照舊手動指定，無損失）也不過度推測（需使用者發現並覆寫，反而增加點擊）。
3. **欄位角色批次動作按鈕不採用**：與 `FR-002c-2` 數量限制語意衝突且多一次點擊；如日後仍希望提供，需先定義按鈕語意如何與數量限制共存。

## Constitution Check

| 原則 | 檢核 |
|------|------|
| **Generalization-First（NON-NEGOTIABLE）** | ✅ 通過。`FIELD_ROLE_INPUT_NAME_HINTS` 為資料表而非任務類型專屬邏輯；比對邏輯讀取常數陣列做子字串比對，不新增依欄位名稱字面值的硬編分支，亦不依任務類型或輸出類型 key 分流。 |
| **Data Fairness（NON-NEGOTIABLE）** | ✅ 通過。自動推測僅限 Input 角色（原始輸入內容，非評分或保密欄位）；Evidence／Output 角色一律維持使用者手動指定，不受本 change 影響，`field_role_map` 形狀與既有 ground-truth 保護規則（FR-003g-5）不變。 |
| **Principle X（PR 規模）** | ✅ 通過，2 個手寫產品檔案、預估合計 diff 約 30–35 行，單一 PR 即可完成，無需拆分。 |
| **TDD** | ✅ 每項可觀察行為皆配對 Red（`senior-qa` 角色）與 Green（實作者角色）任務，Red 須先 commit 並留下預期失敗證據，詳見 `tasks.md`。 |
| **PR Single Purpose** | ✅ 單一目的：「Step 1 資料集欄位角色新增 Input 欄名自動推測初始值，降低必點次數」。 |
| **Simplicity First** | ✅ 不新增批次動作 UI、不修改 `validateStep1()`、不對 Output／Evidence 做自動推測；僅在既有初始化迴圈內新增一段判斷邏輯，沿用既有 `field_role_map` 資料形狀。 |

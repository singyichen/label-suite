# Task New — Step 1 資料集欄位角色 Input 欄名自動推測（issue #755）

## Purpose

本 delta 為 task-new Step 1 的資料集欄位角色指派新增「Input 欄名自動推測初始值」子能力：嵌入式資料預覽表格為尚未指定過角色的欄位初始化時，依欄名慣例自動預填 Input 角色初始值，讓命中線索的欄位可於 0 次點擊內完成原本至少需要 1 次點擊的角色指定；逐欄手動指定與資料列來源記憶等既有機制維持不變，使用者仍可對任一欄位覆寫推測結果。僅涵蓋 Input 角色，不涉及 Evidence／Output 角色的自動推測（Data Fairness 考量，詳見 `proposal.md`）。本 delta **只新增 FR-002c-8 與 AC-1.6／AC-1.7／SC-002h，不修訂任何既有條文**：與 FR-002c-1 預設值規則的關係以 FR-002c-8 自述的具名例外承載。

## ADDED Requirements

### Requirement: FR-002c-8 Step 1 資料集欄位角色 Input 欄名自動推測初始值

嵌入式資料預覽表格為尚未指定過角色的欄位進行角色初始化時（包含資料集首次上傳成功、重新上傳、移除檔案後的重新初始化，以及切換資料列來源後首次出現、先前未指定過角色的欄位），系統 MUST 依欄名慣例自動推測 Input 角色初始值；此推測僅適用於前述「尚未指定過角色」的欄位，不得覆寫使用者已手動指定的角色，亦不得覆寫 FR-002c-1 依資料列來源記憶還原的既有角色指定。

判定規則：規格常數 `FIELD_ROLE_INPUT_NAME_HINTS` 的內容定為七個泛用輸入欄名關鍵字——`text`、`content`、`sentence`、`passage`、`document`、`body`、`context`；欄位名稱（不分大小寫）包含其中任一子字串者視為命中欄名線索；命中線索的欄位依所選資料列來源全部紀錄聯集欄位的原始出現順序，依序指定為 Input，至多指定至當下輸入類型所要求的 Input 欄位數量（`single_item` 為 1、`item_pair` 為 2；尚未選定輸入類型時上限為 1）；超出上限的其餘命中欄位與未命中線索的欄位相同，維持「不使用」。

本條為 FR-002c-1「欄位角色預設為『不使用』」之**具名例外**：欄名命中線索且尚未指定過角色的欄位，其初始值以本條為準而非 FR-002c-1 的預設值；FR-002c-1 的其餘規則（資料列來源記憶與還原、`field_role_map` payload 形狀、Evidence／Output 為 optional、Input 數量受 FR-002c-2 約束）一律不受本條影響。

使用者可逐欄覆寫任一推測結果，覆寫方式與手動指定角色完全相同（FR-002c-1）。

系統 MUST NOT 對 Evidence 或 Output 角色進行任何自動推測，此排除為**永久性規則**而非本版的暫行範圍限制：Output 角色資料依 FR-003g-5 為 annotator-visible preannotation，若以欄名字面比對決定某欄是否成為 Output，等同把「是否對標記者公開此欄」的判斷移出建立者手中；`docs/product/example-data/` 既有 fixture 普遍存在 `gold_label`／`gold_answer`／`gold_entities` 等保留答案欄名，自動推測將構成 test-set 答案洩漏途徑，違反 Data Fairness（NON-NEGOTIABLE）。任何後續變更若要放寬此排除，MUST 先行提出不依賴欄名字面比對的建立者確認機制。

#### Scenario: AC-1.6 欄名命中線索的欄位於初始化後自動指定為 Input

- **GIVEN** 已上傳資料集且其中一欄位名稱包含 `FIELD_ROLE_INPUT_NAME_HINTS` 命中線索（如欄名為 `text`）、其餘欄位皆未命中
- **WHEN** 嵌入式資料預覽表格完成初始化
- **THEN** 該命中欄位的角色下拉選單初始值已為 Input、無需使用者點擊即完成該欄位角色指定
- **AND** 使用者仍可再點擊改為其他角色或「不使用」

#### Scenario: AC-1.7 資料集重新上傳後僅命中欄名線索的欄位保留 Input 初始值

- **GIVEN** 使用者已於目前資料集手動指定至少一個欄位角色
- **WHEN** 使用者重新上傳資料集或移除目前資料集檔案
- **THEN** 所有欄位角色依 FR-002c-1 重設，但欄名命中 `FIELD_ROLE_INPUT_NAME_HINTS` 的欄位依本條（FR-002c-8）取得 Input 初始值，其餘欄位為「不使用」

#### Scenario: SC-002h Input 欄名自動推測降低欄位角色指定所需的最少點擊次數

- **GIVEN** Step 1 資料集含至少一個欄名命中 `FIELD_ROLE_INPUT_NAME_HINTS` 的欄位
- **WHEN** 嵌入式資料預覽表格完成初始化
- **THEN** 該欄位的 Input 角色可於 0 次點擊內完成指定（相對於逐欄手動點選下拉選單需要至少 1 次點擊）
- **AND** 推測結果超出當下輸入類型所需 Input 欄位數量時不指定多餘欄位，且使用者仍可對任一欄位手動覆寫推測結果

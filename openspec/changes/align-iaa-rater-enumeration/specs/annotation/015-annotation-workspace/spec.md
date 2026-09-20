## MODIFIED Requirements

### Requirement: FR-055 annotation-list reviewer 清單粒度

`annotation-list` reviewer 視圖的清單粒度 MUST 為**審核單位**（`REVIEW_UNIT_DIMENSIONS`，FR-051）——同一樣本由 N 位標記員標記即渲染為 N 個連續資料列，兩種 `run_type` 完全一致，MUST NOT 存在任何依 `run_type` 分流的清單分支。

每列 MUST 呈現：樣本 ID、該列標記員帳號、該審核單位的 `REVIEW_UNIT_STATUS`、完成時間、文本摘要、**該標記員本人**的逐輸出類型答案摘要 tag，以及該樣本的跨標記員標記分布統計（統計單位仍為樣本，故同一樣本各列數值相同）。分頁總筆數計審核單位數。

狀態篩選選項 MUST 依角色由對應常數推導，MUST NOT 於選單硬編狀態清單：自 v5.0.0 起 reviewer 為 `REVIEW_UNIT_STATUS` **三態**（`待審`／`爭議中`／`已定稿`），annotator 維持既有三態。導頁（列點擊與行動按鈕）MUST 帶出該列的 `annotator_id`，使工作區審核卡開在同一審核單位。

展開控制項與標記員明細列、逐列決策控件、清單層級 `送出審核` 按鈕維持既有之廢止狀態，testid 與 i18n key 保留不重用。

**本版修訂（issue #792，審核單位之列舉來源）**：一筆樣本的審核單位 MUST 為下列兩者之聯集：(1) 該樣本的示範標記員列（FR-044a 第二 seed 來源）；(2) 該樣本在本 `run_type` 下具**已儲存提交**之標記員（FR-044a 第一 seed 來源）。未提交之草稿 MUST NOT 構成審核單位；兩個 seed 來源皆缺之單位仍不在列舉範圍內（v6.3.1 釐清，issue #784，不變）。此聯集 MUST 由資料層單一函式提供，`annotation-list` 清單列、工作區 reviewer 導覽（FR-056）、任務摘要（FR-072）、快速審核候選（FR-073）、審核指派之輸入（FR-093）與定稿卡剩餘量（FR-100）皆讀同一份結果，MUST NOT 各自列舉。列舉 MUST NOT 依任務 ID、樣本 ID 或輸出類型分流（Generalization-First）。

**本版修訂（issue #866，IAA 之評分者列舉亦同源）**：前段之消費端清單 MUST 再含**本規格供應給 IAA 的評分者列舉**（FR-079 所述之輸入）——IAA 的評分者數與值集合 MUST 由同一份聯集結果推導，MUST NOT 只取示範標記員列這一個 seed 來源。因此一位在本 `run_type` 下具已儲存提交、但無示範列之標記員，MUST 與其他標記員同樣計入評分者數與各樣本的值集合。本條僅規範供應給 IAA 的**輸入**；α 之計算公式、可計算性門檻與閘門語意之正典仍在 `dataset-017`（FR-079），MUST NOT 因本修訂而改變。

#### Scenario: AC-1.26 狀態篩選為三態
- **GIVEN** reviewer 開啟 `annotation-list`
- **WHEN** 展開狀態篩選選單
- **THEN** 選項恰為 `待審`／`爭議中`／`已定稿` 三項，MUST NOT 出現 `已同意` 或 `已修改`

#### Scenario: 已提交但無示範列之審核單位進入列舉
- **GIVEN** 某任務某樣本沒有示範標記員列，而一位標記員已於本 `run_type` 提交該樣本
- **WHEN** 被指派到該單位的審核員開啟 `annotation-list` 與 dashboard
- **THEN** 清單出現一列該樣本 × 該標記員之審核單位，狀態為 `待審`，答案欄顯示該標記員提交的答案
- **AND** 任務摘要的待審與未定稿計數各含此單位
- **AND** `快速審核` 可導向此單位，該單位恰被指派給一位審核員

#### Scenario: 草稿與兩個 seed 來源皆缺之單位不進入列舉
- **GIVEN** 某樣本沒有示範標記員列，而一位標記員對該樣本只存了草稿、未提交
- **WHEN** 審核員開啟 `annotation-list`
- **THEN** 清單不出現該樣本之任何審核單位，任務摘要亦不計入

#### Scenario: 已提交但無示範列之標記員計入 IAA 評分者
- **GIVEN** 某任務某 `run_type` 下，一位標記員對該任務的樣本具已儲存提交，但不在任何樣本的示範標記員列中
- **WHEN** 檢視該任務該輸出類型的 IAA
- **THEN** 評分者數含該標記員，各該樣本的值集合含其答案
- **AND** α 依含該標記員之完整值集合計算

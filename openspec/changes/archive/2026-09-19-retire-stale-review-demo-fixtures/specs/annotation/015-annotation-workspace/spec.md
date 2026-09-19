## MODIFIED Requirements

### Requirement: FR-044 審核列的呈現與 seed 來源

Reviewer 審查列 MUST 僅呈現**受審標記員本人**的提交，MUST NOT 渲染標記分布統計盒（`ws-review-stats`）、批次操作列、FR-014A 之偏差著色，或多標記員清單（`ws-review-annotator-list`）——MUST NOT 以空殼 DOM 形式存在，須完全不渲染。標記員答案 MUST 直接帶入修正/作答控制項（該控制項同時作為顯示與編輯用途，不另外呈現唯讀答案列）。

決策控制 MUST 置於該輸出類型標題列右側（卡片語意 = 單一審查項目），其選項自 v5.0.0 起為 `REVIEW_DECISIONS` 三向（FR-092）。「送出審核」驗證維持「每個 outKey 皆須有決策」，範圍為單一標記員。

**v5.0.0 移除**：原文末段「退回後回退為待標記並保留原答案供修改之機制沿用 FR-014I／AC-3.15」隨退回機制移除而失效——兩種 `run_type` 皆 MUST NOT 提供任何使標記員重新標記的通道。seed 來源規則（真實提交 → FR-044a 示範遞補）不變。

**本版新增——示範 seed 的合法性**：審核流程示範任務的種子列 MUST 只示範現行資料模型可產生的形狀。任一種子列所描述的狀態，MUST 能由 FR-051 的三態推導、FR-093 的指派粒度、FR-092 的 `REVIEW_DECISIONS` 與 FR-061 的 `ARBITRATION_OUTCOMES` 共同產生；MUST NOT 保留任何只能由已廢止規則（定稿門檻 `min_reviewers`、多數決收斂、審核員層級的退回決策）產生的列。示範任務整組的種子 MUST 集體見證 `REVIEW_DECISIONS` 的每一個值——含 `bypass`——以及仲裁「兩者皆非」進入最終例外池（FR-095）的路徑；任一決策值於整組種子零命中時，該組 MUST 視為覆蓋不足。

**本版新增——雙份副本一致性**：示範審核單位的種子資料存在兩份手寫副本（`docs/product/example-data/review-flow-*.json` 與 prototype `task-detail.data.js` 各示範任務 profile 的 `datasetFileName`／`datasetRecords`）。兩份 MUST 逐列一致，以實際渲染的 prototype 種子為基準；此一致性 MUST 由一道可執行的檢查守住，並依本專案的兩向契約同時登錄本機驗證指令與對應 CI job，MUST NOT 僅以文件約定或人工比對代替。

#### Scenario: AC-6.11 正式標記不再產生重標待辦
- **GIVEN** `run_type = official_run` 的一筆樣本，其審核員對某 outKey 送出 `修正`
- **WHEN** 該樣本的標記員回到工作區
- **THEN** 該樣本 MUST NOT 出現於其待辦，狀態 MUST NOT 回退為 `待標記`，畫面上不存在重標理由橫幅

#### Scenario: 示範審核單位的 sample id 不得編碼已廢止的審核狀態詞
- **GIVEN** `run_type = official_run` 的審核流程示範任務 T016，其審核單位種子同時被 workspace 種子、task-detail 樣本清單與 `docs/product/example-data` fixture 三處消費
- **WHEN** 任一消費端列舉該審核單位的 `sample_id`
- **THEN** 該 `sample_id` MUST NOT 含 v5.0.0 已自 `REVIEW_UNIT_STATUS` 移除的中間狀態詞（`approved`、`modified`），MUST 改以該情境實際發生的審核行為命名，使 id 與 FR-051 現行三態語彙一致
- **AND** 同一個 id 的每一處出現（種子物件的 map key 與資料列欄位、樣本清單、fixture、Playwright 測試與正典條文引文）MUST 於同一次變更內同步改名；只改其中一部分會使該筆種子查無對應答案而整列不渲染，因此部分改名 MUST NOT 發生

#### Scenario: 示範種子集體見證三向決策與例外池路徑
- **GIVEN** 審核流程示範任務整組的審核單位種子
- **WHEN** 列舉每一列所攜帶的審核決策與仲裁裁定
- **THEN** `REVIEW_DECISIONS` 的三個值 MUST 各至少有一列見證，其中 `bypass` MUST 有一列以 `official_run` 形態呈現非空理由與空答案值——`bypass` 依設計不寫入答案值，此為其與 `modify` 在資料層的唯一區辨
- **AND** MUST 有一列見證審核員 `修正` 後仲裁裁定為 `reject`（兩者皆非），使該單位維持 `爭議中` 並列入最終例外池；此路徑 MUST NOT 因任何示範任務被移除而失去其唯一見證
- **AND** MUST NOT 存在任何一列，其狀態只能由 `MIN_REVIEWERS_DEFAULT`、多數決收斂或審核員層級的 `reject` 產生

#### Scenario: 兩份示範資料副本逐列一致
- **GIVEN** `docs/product/example-data` 的審核流程 fixture 與 prototype 的審核單位種子
- **WHEN** 執行示範資料一致性檢查
- **THEN** 兩份的任務集合、每個任務的樣本 id 序列與每筆樣本的文字內容 MUST 完全相同，任一差異 MUST 使該檢查以非零 exit 失敗並逐筆指名差異所在
- **AND** 該檢查 MUST 同時被列為本機驗證指令與 CI job；只存在其一時，本專案的 `CI_JOB_PARITY` 檢查 MUST 回報缺口

### Requirement: FR-093 審核指派粒度

審核指派 MUST 由系統自動執行，MUST NOT 提供手動指派模式。指派對象為該任務**被勾選進審核員名冊**的成員（勾選來源為 014 之審核設定名冊，其正典修改隨 companion change 提案）。指派粒度依 `REVIEW_ASSIGNMENT_GRANULARITY` 分流，此為兩種 `run_type` **唯一**的流程差異：

1. `dry_run: per_sample`——試標中同一份樣本由多位標記員各標一次，其產生的全部審核單位 MUST 指派給**同一位**審核員，使該審核員得以一次看完同一份資料的所有標記；
2. `official_run: per_unit`——每筆樣本恰一位標記員、恰一個審核單位，系統 MUST 把全部審核單位平均分給被勾選的審核員；樣本數不可整除時，任兩位審核員的分派筆數差距 MUST NOT 超過 1。

每個審核單位恰有**一位**指派審核員，MUST NOT 出現同一單位由多位審核員並行審核的情形。

**本版釐清**：前段「恰有一位」同樣約束**種子與示範資料**，而非僅約束執行期的指派演算法。一筆在 `rev` 之類的審核結果結構中登錄了兩位以上審核員的 `official_run` 種子列，描述的是本資料模型永遠無法產生的狀態，MUST NOT 存在於示範資料中。

**明確不存在的規則**：系統 MUST NOT 因某位審核員恰為該筆樣本的標記員而將其排除於指派之外——「審核員不得審自己標的資料」不是本規格的規則。非當事人限制僅適用於仲裁者（FR-060）。

#### Scenario: 試標以樣本為單位指派
- **GIVEN** 一份試標樣本由三位標記員各標一次，任務勾選了兩位審核員
- **WHEN** 系統建立審核指派
- **THEN** 該樣本產生的三個審核單位全部指派給同一位審核員

#### Scenario: 正式標記平均分派且不排除標記員本人
- **GIVEN** `official_run` 有 7 筆樣本、勾選 2 位審核員，其中一位同時是部分樣本的標記員
- **WHEN** 系統建立審核指派
- **THEN** 兩位審核員的分派筆數差距不超過 1
- **AND** 該審核員仍可能被指派到自己標記的樣本，系統不因此排除或重新分派

#### Scenario: 示範種子不得讓多位審核員並行審同一個正式標記單位
- **GIVEN** 任一 `run_type = official_run` 的示範審核單位種子列
- **WHEN** 讀取該列所登錄的審核員集合
- **THEN** 該集合 MUST 恰含一位審核員；含兩位以上者 MUST 視為與本條文直接衝突的失效種子並汰換
- **AND** 該單位若需示範定稿前的第二個判斷，MUST 循 FR-060 的仲裁路徑表達（一位審核員 + 一位非當事人仲裁者），MUST NOT 以並列多位審核員表達

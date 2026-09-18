## MODIFIED Requirements

### Requirement: FR-044 審核列的呈現與 seed 來源

Reviewer 審查列 MUST 僅呈現**受審標記員本人**的提交，MUST NOT 渲染標記分布統計盒（`ws-review-stats`）、批次操作列、FR-014A 之偏差著色，或多標記員清單（`ws-review-annotator-list`）——MUST NOT 以空殼 DOM 形式存在，須完全不渲染。標記員答案 MUST 直接帶入修正/作答控制項（該控制項同時作為顯示與編輯用途，不另外呈現唯讀答案列）。

決策控制 MUST 置於該輸出類型標題列右側（卡片語意 = 單一審查項目），其選項自 v5.0.0 起為 `REVIEW_DECISIONS` 三向（FR-092）。「送出審核」驗證維持「每個 outKey 皆須有決策」，範圍為單一標記員。

**v5.0.0 移除**：原文末段「退回後回退為待標記並保留原答案供修改之機制沿用 FR-014I／AC-3.15」隨退回機制移除而失效——兩種 `run_type` 皆 MUST NOT 提供任何使標記員重新標記的通道。seed 來源規則（真實提交 → FR-044a 示範遞補）不變。

#### Scenario: AC-6.11 正式標記不再產生重標待辦
- **GIVEN** `run_type = official_run` 的一筆樣本，其審核員對某 outKey 送出 `修正`
- **WHEN** 該樣本的標記員回到工作區
- **THEN** 該樣本 MUST NOT 出現於其待辦，狀態 MUST NOT 回退為 `待標記`，畫面上不存在重標理由橫幅

#### Scenario: 示範審核單位的 sample id 不得編碼已廢止的審核狀態詞
- **GIVEN** `run_type = official_run` 的審核流程示範任務 T016，其審核單位種子同時被 workspace 種子、task-detail 樣本清單與 `docs/product/example-data` fixture 三處消費
- **WHEN** 任一消費端列舉該審核單位的 `sample_id`
- **THEN** 該 `sample_id` MUST NOT 含 v5.0.0 已自 `REVIEW_UNIT_STATUS` 移除的中間狀態詞（`approved`、`modified`），MUST 改以該情境實際發生的審核行為命名，使 id 與 FR-051 現行三態語彙一致
- **AND** 同一個 id 的每一處出現（種子物件的 map key 與資料列欄位、樣本清單、fixture、Playwright 測試與正典條文引文）MUST 於同一次變更內同步改名；只改其中一部分會使該筆種子查無對應答案而整列不渲染，因此部分改名 MUST NOT 發生

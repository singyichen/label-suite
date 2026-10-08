> 正典：`specs/task-management/014-task-detail/spec.md`（v7.0.0 → v8.0.0，MAJOR）。本 delta 修訂 FR-009a、FR-010i／FR-010i-1／2、FR-015e／FR-015h、FR-020、FR-021、FR-024 與 AC-1.14～1.16、SC-046；僅為規劃契約，沒有部署 ORM、migration 或 API。來源：issue #1160、ADR-024、ADR-037。

## MODIFIED Requirements

### Requirement: FR-009a 首次匯出保存不可變原始產物

首次匯出 MUST 明確選取同任務一個或多個 run；同一次匯出可同時選取 Dry Run 與 Official Run，並凍結所選 run 的順序與各自階段，不得從目前頁面階段推定或合併 run。依 `EXPORT_SYNC_MAX_ROWS` 選同步回應或背景工作。內容與答案隔離驗證通過後 MUST 原子保存不可變原始位元組、原檔名、格式版本及 SHA-256，才將歷史列設為可下載；失敗不可留下可下載的部分產物。重送與工作重試依同一請求冪等識別處理，不得重複建立歷史列。生命週期為 `pending → processing → ready | failed`；到期、撤銷另由時間記錄判定。

#### Scenario: 首次匯出和重試只產生一份完整原檔

- **GIVEN** 使用者有目前任務的匯出權限且匯出內容通過驗證
- **WHEN** 匯出成功或背景工作對同一請求重試
- **THEN** 只有一筆歷史列及一份不可變原檔，含檔名、格式版本、SHA-256
- **AND** 驗證失敗時沒有可下載的部分檔案

#### Scenario: 同次匯出選取 Dry 與 Official

- **GIVEN** 同一任務已有 Dry Run R1、R2 及 Official Run
- **WHEN** 使用者明確選取 Dry R2 與 Official Run 建立一次匯出
- **THEN** 只建立一筆歷史列，所選 run 的身分、階段與選取順序固定，manifest 不含未選取的 Dry R1

### Requirement: FR-010i 每個 run 的匯出 metadata

匯出結果檔 metadata MUST 逐 run 記錄 `run_stage`、`isolation_enabled`、`sampling_value`、`applied_iaa_metrics`、`sample_snapshot_id` 和該 run 範圍內已排除標記作業的摘要。跨 run 不能以單一 snapshot 或版本值覆蓋各 run 的值，細目依 FR-010i-1。

#### Scenario: 不同 run 的抽樣快照分開呈現

- **GIVEN** 同一匯出納入兩個各有不可變 snapshot 的 run
- **WHEN** 使用者查閱原始匯出檔
- **THEN** 每個 run 的抽樣及排除摘要各自對應原快照，互不覆寫

### Requirement: FR-010i-1 逐 run manifest

所有匯出檔的 `manifest` MUST 包含 `export_format`、`export_format_version`、`exported_at`、`exported_by`、`applied_filters` 及有序 `manifest.runs[]`。每個 run 須保留 `run_id`、`cycle_id`、`dataset_version_id`、`config_version_id`、`schema_version`、`guideline_version_id`、`sample_snapshot_id`；`schema_version` 由該 run 的 cycle 已釘住 config 的 `schema_version_no` 取得。FR-010i 的階段、隔離、抽樣、IAA、排除摘要仍須保留；零筆結果也有完整 manifest。跨 run 匯出不得用單一版本或任務目前版本冒充。

#### Scenario: AC-1.15 多 run 與零筆結果仍可追溯

- **GIVEN** 一次匯出納入兩個版本不同的 run
- **WHEN** 原始檔案生成，即使結果列為零筆
- **THEN** `manifest.runs[]` 依順序列出各 run 七項釘住的身分，並有格式版本與請求人

### Requirement: FR-010i-2 條件快照與原始檔案分離

每筆歷史列 MUST 對應一次請求及一份不可變原檔。已驗證、版本化的條件快照保存 `export_format`、`run_stage`、`submission_status`、`annotator_scope`、審核員／審核狀態及其他篩選、匯出語言、序列選項、完整精度 `exported_at`、原請求人 `exported_by` 與逐 run 版本／快照。每個 run 的納入關聯及輸出順序獨立保存，對應 `manifest.runs[]`。快照僅供審計及重製驗證，MUST NOT 作為重新下載時查詢目前結果的指令。`scope_label` 和 `export_type` 僅為另存的顯示資料，不參與原檔完整性驗證。

#### Scenario: 變更目前任務版本不改寫歷史匯出

- **GIVEN** 匯出後任務發布新版本且頁面篩選改變
- **WHEN** 使用者查閱歷史與下載
- **THEN** 逐 run 快照仍指向原版本，下載也不查詢目前結果

### Requirement: FR-015e 匯出入口支援明確的跨階段選取

`annotation-results` MUST 提供 `EXPORT_FORMATS` 所列格式及同任務 run 選取。同一次匯出可同時選取 Dry Run 與 Official Run；選取後的固定順序與每個 run 的階段、結果身分須分別顯示及保存，跨階段呈現在同一原檔不代表解除資料隔離。結果列數不超過 `EXPORT_SYNC_MAX_ROWS` 同步回應，超過門檻改為背景工作與通知；metadata 依 FR-010i／FR-010i-1。

#### Scenario: 結果介面顯示跨階段匯出範圍

- **GIVEN** 同任務有可選的 Dry Run 和 Official Run
- **WHEN** 使用者在 `annotation-results` 明確選取兩階段的 run 匯出
- **THEN** 介面與原檔按固定順序呈現各 run，結果仍標明所屬 run 和階段且互不混用

### Requirement: FR-015h JSON-MIN v2 envelope

`JSON-MIN` MUST 採 `EXPORT_JSON_MIN_SHAPE = {manifest,rows[]}`，格式版本 2；`rows[]` 每列仍是含共通欄、標記最小欄及任務結果摘要的 flat row。零筆時 `rows[]` 為空陣列，`manifest` 仍含格式版本、請求人及逐 run 身分。有效舊版原始檔案照原位元組交付，不以 v2 序列化器改寫。

#### Scenario: AC-1.15 空結果仍有版本 metadata

- **GIVEN** 篩選沒有任何可輸出的結果列
- **WHEN** 建立 `json-min` 匯出
- **THEN** 檔案為格式版本 2 的 `{manifest,rows[]}`，`rows[]` 為空且 manifest 含請求人與逐 run 身分

### Requirement: FR-020 詞級推導只在首次生成執行

新建 `sequence_tagging` 詞級匯出仍 MUST 按 `dataset/017` FR-041／FR-042 共用推導契約驗證 `tokenizer.engine` 及 `tokenizer.version`；缺少時拒絕且不新增檔案或歷史列。首次條件快照保存方案、單位及詞級切詞器身分，供版本追溯和重製驗證。有效原檔重新下載 MUST NOT 再推導序列，也不因引擎後來停用而失敗；其他輸出類型欄位分流仍依原規則。

#### Scenario: 新匯出缺切詞器版本但舊原檔有效

- **GIVEN** 切詞器版本資訊已不可用，先前詞級匯出仍有有效原檔
- **WHEN** 使用者分別新建詞級匯出及下載舊檔
- **THEN** 新建匯出被阻擋，舊檔通過 FR-021 檢查後按原位元組交付且不重新切詞

### Requirement: FR-021 歷史重新下載原始位元組

歷史「下載」 MUST 讀取首次原子保存的不可變位元組與原檔名，MUST NOT 以快照重算目前結果、重新切詞、重新序列化或新增歷史列。每次下載 MUST 重新檢查 `dataset.export` 當前 active membership、目前任務範圍、來源與任務有效性、產物 `ready`、未到期未撤銷、物件存在及 SHA-256。任一條件不符須拒絕並給可理解的繁體中文原因；內部物件儲存路徑不得回傳，私有答案亦不得暴露。標記／審核、頁面條件、語言、切詞器後續變化不影響有效原檔。原始產物保留 30 日，歷史 metadata 保留一年；舊版只有快照而無有效原檔者停用下載，有效舊原檔依原格式交付。新詞級匯出仍受 FR-020 約束，有效原檔重新下載不要求切詞器可用。

#### Scenario: AC-1.14 後續變更不改變原檔

- **GIVEN** 原始檔案有效，後續標記、審核、畫面條件、語言或切詞器狀態已改變
- **WHEN** 有權限使用者重新下載
- **THEN** 位元組和檔名與首次下載完全相同，不重算結果、不開對話框、不新增歷史列

#### Scenario: AC-1.16 失權或失效時拒絕

- **GIVEN** 使用者失權，或原檔缺失、到期、撤銷、來源刪除、SHA-256 不符
- **WHEN** 使用者檢視或按下載
- **THEN** 停用或拒絕，說明原因，不重建檔案或新增歷史列
- **AND** 不洩露內部物件路徑、私有答案或未提交審核草稿

#### Scenario: SC-046 自動化檢驗原檔及拒絕情形

- **GIVEN** 跨 run、空結果 `json-min` v2 和上述後續變化與失效情形
- **WHEN** 自動化檢查首次與歷史下載
- **THEN** 有效原檔的位元組與檔名相同比率為 100%，新增歷史列為 0
- **AND** 失權、刪除、到期、撤銷、缺檔及校驗不符的下載成功次數皆為 0

### Requirement: FR-024 匯出授權及答案隔離

匯出 MUST 依 ADR-037 的目前 active membership、已啟用 `dataset.export` 矩陣格、任務範圍及資料可見性共同判定；原請求人身分不自動授權。標記者 MUST NOT 透過匯出檔、條件快照或歷史列取得私有答案、測試集答案及未提交審核草稿。公開回應不得暴露受限物件參照；URL 角色參數不能替代正式授權。

#### Scenario: 標記者無法透過匯出歷史取得隱藏資料

- **GIVEN** 標記者知道一筆歷史 ID，但沒有當前任務的匯出權限或資料範圍
- **WHEN** 其讀取歷史列、快照或原檔
- **THEN** 授權拒絕，回應不含私有答案、測試集答案、審核草稿或受限物件參照

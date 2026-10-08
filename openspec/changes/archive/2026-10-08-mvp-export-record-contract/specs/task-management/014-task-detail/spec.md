> 正典：`specs/task-management/014-task-detail/spec.md`（v7.0.0 → v8.0.0，MAJOR）。本 delta 修訂 FR-009a、FR-010i／FR-010i-1／2、FR-015e／FR-015h、FR-020、FR-021、FR-024 與 AC-1.14～1.16、SC-046；僅為規劃契約，沒有部署 ORM、migration 或 API。來源：issue #1160、ADR-024、ADR-037。

## RENAMED Requirements

- FROM: `### Requirement: FR-021 匯出記錄重新下載依條件快照重建且不新增紀錄`
- TO: `### Requirement: FR-021 歷史重新下載原始位元組`

## MODIFIED Requirements

### Requirement: FR-010i-1 task/run 身分契約

所有匯出檔的 `manifest` MUST 包含 `export_format`、`export_format_version`、`exported_at`、`exported_by`、`applied_filters` 及有序 `manifest.runs[]`。每個 run 須保留 `run_stage`、`run_id`、`cycle_id`、`dataset_version_id`、`config_version_id`、`schema_version`、`guideline_version_id`、`sample_snapshot_id`；`schema_version` 由該 run 的 cycle 已釘住 config 的 `schema_version_no` 取得。FR-010i 的隔離、抽樣、IAA、排除摘要仍須保留；零筆結果也有完整 manifest。跨 run 匯出不得用單一版本或任務目前版本冒充，每筆結果 MUST 保留來源 `run_id` 和 `run_stage`。

#### Scenario: AC-1.15 多 run 與零筆結果仍可追溯

- **GIVEN** 一次匯出納入兩個版本不同的 run
- **WHEN** 原始檔案生成，即使結果列為零筆
- **THEN** `manifest.runs[]` 依順序列出各 run 七項釘住的身分，並有格式版本與請求人

#### Scenario: FR-010i-1 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-010i-1；AC-3.43）

### Requirement: FR-010i-2 task/run 身分契約

每筆歷史列 MUST 對應一次請求及一份不可變原檔。已驗證、版本化的條件快照把共享篩選條件和逐 run 身分分開保存：共通條件含 `export_format`、`export_format_version`、`submission_status`、`annotator_scope`、審核員／審核狀態及其他已驗證 filters、匯出語言、序列／切詞選項、完整精度 `exported_at` 與原請求人 `exported_by`。有序 `selected_runs[]` 中每項含 `run_id`、`selected_runs[].run_stage`、`cycle_id`、`dataset_version_id`、`config_version_id`、`schema_version`、`guideline_version_id`、`sample_snapshot_id`。混合 Dry／Official 時頂層 `run_stage = all`，不得冒稱單一階段；單階段可保留該階段值。每個 run 的納入關聯及輸出順序獨立保存，對應 `manifest.runs[]`；每筆結果亦含來源 `run_id` 與 `run_stage`。快照僅供審計及重製驗證，MUST NOT 作為重新下載時查詢目前結果的指令。`scope_label` 和 `export_type` 僅為另存的顯示資料，不參與原檔完整性驗證。

#### Scenario: 混合階段快照沒有假單一階段

- **GIVEN** 同一匯出選取 Dry R2 與 Official Run，兩者釘住不同版本及快照
- **WHEN** 首次請求保存條件快照並產出結果
- **THEN** `selected_runs[]` 逐項保存階段與釘住身分，頂層 `run_stage` 為 `all`，每筆結果標明來源 run
- **AND** 共享篩選條件只保存一份，輸出順序與 `manifest.runs[]` 一致

#### Scenario: 變更目前任務版本不改寫歷史匯出

- **GIVEN** 匯出後任務發布新版本且頁面篩選改變
- **WHEN** 使用者查閱歷史與下載
- **THEN** 逐 run 快照仍指向原版本，下載也不查詢目前結果

#### Scenario: FR-010i-2 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-010i-2；AC-3.43）

### Requirement: FR-020 `sequence_tagging` 匯出對話框與序列匯出欄位

`annotation-results` 的匯出功能 MUST 在任務 `outputs[]` 含 `sequence_tagging` 時，以一個匯出對話框承載標註方案與詞元單位的選擇，並依 `dataset/017` FR-041 與 FR-042 所定義的推導契約產生序列與其 metadata。本需求只規範畫面行為與匯出檔欄位的呈現，MUST NOT 重新定義推導規則本身。

**(1) 唯一推導入口**。序列的產生 MUST 一律呼叫共用純函式模組（`dataset/017` FR-041 第 2 點要求推導為純函式；原型落點 `design/prototype/pages/shared/span-tagging-export.js` 之 `LabelSuiteSpanTaggingExport.deriveSequence()`）。本頁 MUST NOT 自行拼接 `B-` / `I-` / `E-` / `S-` / `O` 標記前綴、MUST NOT 自行判斷 span 與 token 的邊界關係、MUST NOT 複製任何一份方案轉換表或詞元對齊規則。此條為硬性界線：`dataset/017` FR-041 本文已將本推導訂為跨模組唯一權威來源（SSoT），本頁多存在一份轉換邏輯，就是多一個 `E-` 的定義。

同理，方案與詞元單位的合法值域與預設值 MUST 取自 `dataset/017` 的 `EXPORT_TAGGING_SCHEMES`、`EXPORT_DEFAULT_TAGGING_SCHEME`、`EXPORT_TOKEN_UNITS`、`EXPORT_DEFAULT_TOKEN_UNIT` 四個規格常數，MUST NOT 於本頁的畫面標記或程式碼硬編第二份選項清單。

**(2) 對話框與選擇器**。匯出對話框 MUST 提供兩組選擇器：

| 選擇器 | 值域 | 預設值 |
|--------|------|--------|
| 標註方案 | `EXPORT_TAGGING_SCHEMES`（`BIO` / `BIOES` / `IOB2`） | `EXPORT_DEFAULT_TAGGING_SCHEME`（`BIO`） |
| 詞元單位 | `EXPORT_TOKEN_UNITS`（`character` / `word`） | `EXPORT_DEFAULT_TOKEN_UNIT`（`character`） |

詞元單位選為 `word` 時，對話框 MUST 額外提供切詞引擎的選擇；選為 `character` 時 MUST NOT 要求使用者提供任何切詞資訊。對話框的出現與否 MUST 依 `outputs[]` 是否含 `sequence_tagging` 判定，MUST NOT 以任務 ID 白名單或其他非設定驅動的方式分流（憲法：Generalization-First）。既有的兩種匯出格式（`EXPORT_FORMATS`）與既有的階段指定（FR-009a）語意不變，對話框 MUST 承接而非取代它們。

**(3) 匯出檔 metadata**。匯出檔 MUST 記錄本次匯出實際採用的選項，且 MUST 同時出現在 `JSON`（FR-015g 之 `manifest`）與 `JSON-MIN`（FR-015h）兩種格式，否則 JSON-MIN 的匯出結果無法被重現：

- 兩種詞元單位皆 MUST 記錄 `tagging_scheme` 與 `token_unit`。
- `token_unit = word` 時 MUST 額外記錄 `tokenizer.engine`、`tokenizer.version`、`alignment_mode` 與 `expanded_span_count`。
- `token_unit = character` 時 MUST NOT 寫入任何 tokenizer 相關欄位、對齊模式或擴張筆數——依 `dataset/017` FR-042 第 5 點，一份宣稱用過其實沒用過的切詞引擎的檔案，比什麼都不說更糟。

標註方案的選擇 MUST NOT 被寫回任務 config：依 `dataset/017` FR-041 第 3 點，方案屬於匯出當下的輸出格式選項，同一份標記結果 MUST 可用不同方案重複匯出而不需重新標記，且任務設定 MUST NOT 因一次匯出而改變。

匯出記錄（FR-010i-2 之條件快照）MUST 一併保存本次的標註方案、詞元單位與（詞級時）切詞引擎識別，供原始產物的版本追溯與重製驗證；重新下載只讀已保存的原始產物，不重新推導序列。

**(4) 對齊擴張摘要**。`token_unit = word` 的匯出完成後，畫面 MUST 顯示「N 段標記因對齊被擴張」摘要，`N` 取自模組回傳的擴張筆數；`N = 0` 時 MUST NOT 顯示該摘要。摘要 MUST 可展開，展開後逐筆列出原始標記文字、擴張後文字與起訖 offset 差值，三項皆直接取自模組回傳的擴張清單，本頁 MUST NOT 重算。`token_unit = character` 時 MUST NOT 顯示該摘要（字元級不可能發生擴張）。

擴張 MUST 只發生於匯出產物：依 `dataset/017` FR-042 第 4 點，已儲存的 `spans[]` MUST NOT 被本流程修改，標記員圈選的字元 offset 仍為權威值。

**(5) 缺 tokenizer 版本時阻擋**。`token_unit = word` 且所選切詞引擎未提供 `engine` 或 `version` 任一欄位時，該次匯出 MUST 被阻擋：畫面 MUST 顯示可理解的原因（指出缺少的是切詞引擎版本資訊，而非顯示原始錯誤字串或靜默失敗），且 MUST NOT 產生任何匯出檔、MUST NOT 於匯出記錄表新增紀錄。使用者改回 `character` 後 MUST 能正常完成匯出。阻擋判定 MUST 以模組回傳的阻擋結果為準，MUST NOT 於本頁另行實作一套 tokenizer 欄位檢查。

**(6) 適用邊界與其他輸出類型**。本需求 MUST 僅適用標記值為字元 offset `spans[]` 的 `sequence_tagging`。

標記值攜帶 `entities[]` 的實體型結果（`entity_recognition` 任務，以及 ADR-029 遷移前留下的 legacy 實體資料）MUST NOT 套用本需求所指名的序列推導——依 `dataset/017` FR-041 第 1 點，`entity_recognition` 允許重疊與巢狀，不具 span 與扁平序列之間的雙射性質。其匯出結果欄位 MUST 全文依 FR-015i-3 辦理，該條所定義的 `entities[]` 與 `entities_summary` 語意 MUST NOT 因本需求而改變。

反向亦然：FR-015i-3 所稱的實體型結果 MUST NOT 被理解為涵蓋 `spans[]`——`LEGACY_TASK_TYPE_EXPORT_ENUM` 不含 `sequence_tagging`，其匯出檔的 `task_type` 欄位雖同樣落在 `sequence_labeling`，結果欄位分流仍依 FR-015i 所定「依標記結果實際結構決定」，而 `spans[]` 的結果欄位由本需求承接。

其餘輸出類型的匯出欄位與欄位分流規則皆 MUST 維持不變；格式版本與重新下載依 FR-015h、FR-021 的 v8.0.0 修訂。

#### Scenario: AC-1.10 字元級匯出記錄方案與單位且不動任務設定

- **GIVEN** 任務 `outputs[]` 含 `sequence_tagging`，某樣本已提交 `spans[]` 形狀的標記結果
- **WHEN** `project_leader` 於 `annotation-results` 點擊匯出，於對話框維持預設（方案 `BIO`、單位 `character`）並確認
- **THEN** 匯出檔的 metadata 記錄 `tagging_scheme` 為 `BIO`、`token_unit` 為 `character`
- **AND** 匯出檔不含 `tokenizer.engine`、`tokenizer.version`、對齊模式或擴張筆數任一欄位
- **AND** 畫面未顯示任何擴張摘要
- **AND** 同一份標記結果改選 `BIOES` 再次匯出可正常完成，兩份檔案的 `tagging_scheme` 各自為 `BIO` 與 `BIOES`
- **AND** 兩次匯出後任務設定未被寫入任何標註方案或詞元單位欄位

#### Scenario: AC-1.11 詞級匯出顯示擴張摘要並可展開逐筆比對

- **GIVEN** 任務 `outputs[]` 含 `sequence_tagging`，某樣本有一筆標記的邊界落在所選切詞引擎的 token 內部
- **WHEN** `project_leader` 於匯出對話框選擇單位 `word`、指定一個具備版本資訊的切詞引擎並確認
- **THEN** 匯出完成，檔案 metadata 含 `tokenizer.engine`、`tokenizer.version`、對齊模式與擴張筆數
- **AND** 畫面顯示「N 段標記因對齊被擴張」摘要，`N` 與 metadata 的擴張筆數一致
- **AND** 展開摘要後逐筆顯示原始標記文字、擴張後文字與起訖 offset 差值
- **AND** 該樣本已儲存的 `spans[]` 起訖值未被改動
- **AND** 同一任務改選單位 `character` 匯出時，該摘要不出現

#### Scenario: AC-1.12 缺切詞引擎版本時阻擋匯出並說明原因

- **GIVEN** `project_leader` 於匯出對話框選擇單位 `word`
- **WHEN** 所選切詞引擎未提供版本資訊，使用者觸發匯出
- **THEN** 該次匯出被阻擋，畫面顯示可理解的原因，指出缺少切詞引擎版本資訊
- **AND** 未產生任何匯出檔，匯出記錄表未新增紀錄
- **AND** 使用者於同一對話框改回單位 `character` 後匯出正常完成
- **AND** 該次匯出的檔案不含 tokenizer metadata，畫面亦未顯示擴張摘要

#### Scenario: SC-045 序列推導唯一入口與選項來源可被靜態驗證

- **GIVEN** `task-detail` 的匯出實作
- **WHEN** 以原始碼掃描檢視序列推導與選項渲染的來源
- **THEN** 序列的唯一產生入口為共用模組的推導函式，頁面內不存在自行拼接標記前綴、自行判斷 span 與 token 邊界或複製方案轉換表的程式碼
- **AND** 兩組選擇器的選項由模組匯出的方案與單位常數渲染，頁面內不存在第二份硬編的選項清單
- **AND** `entity_recognition` 任務的匯出路徑未呼叫該推導函式

#### Scenario: AC-1.13 實體型結果的匯出不因序列推導而改變

- **GIVEN** 一個 `entity_recognition` 任務，其標記值為 `entities[]`
- **WHEN** `project_leader` 於 `annotation-results` 匯出該任務的結果
- **THEN** 匯出流程不出現標註方案或詞元單位的選擇，亦不呼叫序列推導
- **AND** 匯出結果仍逐欄位包含 `entities[]`，每個 entity 保留 `text`、`label` 與 span/offset 語意
- **AND** `JSON-MIN` 的扁平化欄位仍為 `entities_summary`

#### Scenario: 新匯出缺切詞器版本但舊原檔有效

- **GIVEN** 切詞器版本資訊已不可用，先前詞級匯出仍有有效原檔
- **WHEN** 使用者分別新建詞級匯出及下載舊檔
- **THEN** 新建匯出被阻擋，舊檔通過 FR-021 檢查後按原位元組交付且不重新切詞

### Requirement: FR-021 歷史重新下載原始位元組

歷史「下載」 MUST 依下列 v8.0.0 原檔契約交付。

匯出歷史列的「下載」須提供首次匯出原子保存的不可變原始檔案位元組與原始檔名，不得以該列條件快照重新查詢或重算目前結果，也不得重新呼叫切詞引擎。(1) **建立與保存**：首次匯出通過資料完整性及答案隔離驗證後，保存原始產物、檔名、SHA-256、位元組數及受限物件參照；歷史列記錄原請求人與建立時間。條件快照用於審計／重製驗證，不作為重新下載資料來源；後續標記或審核變更不影響既有原檔。(2) **目前授權**：每次下載都重新檢查 `dataset.export` 的當前 active membership 與當前 task 範圍，並遵守 FR-024 的角色、資料可見性與答案隔離；歷史請求人身分不構成授權。不得讀取或覆寫目前頁面篩選及對話框選項，也不得開啟對話框。(3) **可下載條件**：產物完成並處於 `ready`、來源及任務有效、未到期且未撤銷、受限物件存在並通過 SHA-256 驗證時才提供原始位元組；到期須拒絕下載，撤銷須拒絕下載，來源刪除或 SHA-256 不符亦須拒絕下載。拒絕時提供可理解的繁體中文原因，內部物件儲存路徑不得回傳，私有答案亦不得暴露。(4) **同一歷史列**：重新下載不得新增匯出記錄，不改變歷史列內容或排序，不產生新檔案、不重新序列化，也不顯示當次匯出對話框的對齊擴張摘要。原始檔名與首次下載相同；對所有任務類型和 `EXPORT_FORMATS` 適用，即使標記或審核後續修改、畫面語言改變或原切詞引擎停用，仍交付相同位元組。(5) **保留與舊版**：原始產物保存 30 日，匯出歷史 metadata 保存一年；期限屆滿或撤銷立即停止下載，歷史列可顯示「已過期」但不得延長原產物期限。只有條件快照、缺少有效原始產物的舊版列不得由目前結果重建，須停用下載並說明原因；有效的舊版原檔仍按其原格式位元組下載，不升版改寫。(6) **切詞邊界**：新建 `word` 匯出仍須由 FR-020 驗證 `tokenizer.engine`／`tokenizer.version`；有效的原始產物重新下載不需切詞引擎，不因引擎之後不可用而失敗。

#### Scenario: AC-1.14 `sequence_tagging` 重新下載不受當前篩選與對話框選項影響且不新增紀錄

- **GIVEN** 原始檔案有效，後續標記、審核、畫面條件、語言或切詞器狀態已改變
- **WHEN** 有權限使用者重新下載
- **THEN** 位元組和檔名與首次下載完全相同，不重算結果、不開對話框、不新增歷史列
- **AND** 原始方案、詞元單位及切詞器 metadata 保持不變；目前篩選與對話框選項保持原值，不顯示對齊擴張摘要

#### Scenario: AC-1.15 跨階段與零筆匯出的原檔重新下載保持一致

- **GIVEN** 一次匯出同時選取 Dry Run 與 Official Run，`JSON-MIN` v2 的結果為零筆且原始檔案有效
- **WHEN** 有權限使用者首次下載，切換介面語言後再按歷史列「下載」
- **THEN** `{manifest,rows[]}` 的 `rows[]` 仍為空，`manifest.runs[]` 依原順序保存每個 run 的精確版本、快照與請求人
- **AND** 重新下載的原檔位元組與檔名完全相同，不讀任務目前版本，頁面條件保持原值且歷史列數不變

#### Scenario: AC-1.16 原檔失效或失權時拒絕，仍允許有效詞級原檔

- **GIVEN** 舊歷史列只有條件快照而沒有有效原檔，或產物到期、撤銷、來源刪除、SHA-256 不符，或使用者失去目前 `dataset.export` 與任務範圍權限
- **WHEN** 使用者檢視或按下載
- **THEN** 停用或拒絕並以不洩露內部物件路徑的繁體中文說明，不能以快照補算檔案或新增歷史列
- **AND** 已保存且有效的 `word` 詞級原檔即使切詞引擎後來不可用，仍按原位元組下載且不重新切詞；新的詞級匯出缺引擎或版本時依 FR-020 阻擋

#### Scenario: 失權或失效時拒絕

- **GIVEN** 使用者失權，或原檔缺失、到期、撤銷、來源刪除、SHA-256 不符
- **WHEN** 使用者檢視或按下載
- **THEN** 停用或拒絕，說明原因，不重建檔案或新增歷史列
- **AND** 不洩露內部物件路徑、私有答案或未提交審核草稿

#### Scenario: SC-046 重新下載可重現性

- **GIVEN** 跨 run、空結果 `json-min` v2 和上述後續變化與失效情形
- **WHEN** 自動化檢查首次與歷史下載
- **THEN** 有效原檔的位元組與檔名相同比率為 100%，新增歷史列為 0
- **AND** 失權、刪除、到期、撤銷、缺檔及校驗不符的下載成功次數皆為 0

#### Scenario: FR-021 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-021；AC-3.43）

### Requirement: FR-024 授權契約

正式服務端 MUST 依下列授權契約檢查每次請求。

正式服務端須依 ADR-037 以當前 active membership 與已啟用矩陣格判斷：詳情讀取用 `task.detail.view`，Overview 的 `OVERVIEW_EDITABLE_FIELDS` 儲存用 `task.detail.edit`，成員操作用 `task.members.manage`，資料匯出用 `dataset.export`，並保留各自任務狀態、資料範圍、blind review 與答案隔離限制。reviewer 有 view 而無 edit；一人多角色時非 workspace 可用 active 角色權限聯集，狀態與移除只作用於選定 membership。發布、結案、仲裁與其他生命週期命令尚無完整 V1 專用鍵，不得借用上述鍵或只憑矩陣放行，須在 runtime 轉換前另行核准操作鍵、種子資料與安全測試。標記者不得透過匯出檔、條件快照或歷史列取得私有答案、測試集答案或未提交審核草稿；公開回應亦不得暴露受限物件參照。Prototype 的 URL `task_role` 僅保留檢視上下文，不可當作正式授權身分。

#### Scenario: FR-024 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 詳情檢視、儲存、成員管理與匯出各用專屬鍵，其他命令不得借鍵（FR-024）

#### Scenario: 標記者無法透過匯出歷史取得隱藏資料

- **GIVEN** 標記者知道一筆歷史 ID，但沒有當前任務的匯出權限或資料範圍
- **WHEN** 其讀取歷史列、快照或原檔
- **THEN** 授權拒絕，回應不含私有答案、測試集答案、審核草稿或受限物件參照

## ADDED Requirements

### Requirement: FR-009a 首次匯出保存不可變原始產物

首次匯出 MUST 明確選取同任務一個或多個 run；同一次匯出可同時選取 Dry Run 與 Official Run，並凍結所選 run 的順序與各自階段，不得從目前頁面階段推定或合併 run。依 `EXPORT_SYNC_MAX_ROWS` 選同步回應或背景工作。內容與答案隔離驗證通過後 MUST 原子保存不可變原始位元組、原檔名、格式版本及 SHA-256，才將歷史列設為可下載；失敗不可留下可下載的部分產物。服務端 MUST 在身分、`dataset.export` 和任務範圍授權後才查詢冪等鍵。冪等鍵作用範圍是 `(task_id, requested_by_user_id, client_idempotency_key)`；服務端計算正規化命令摘要，輸入包括任務、請求人、格式及格式版本、有序 run ID、已驗證的共享篩選、語言、序列方案／單位與切詞器引擎／版本。摘要 MUST 排除生成時間及產物資料（包括 bytes、檔名、原檔 SHA-256）。同鍵同摘要重送或工作重試回傳／續用原歷史列；同鍵不同摘要拒絕為衝突，MUST NOT 覆寫或建立第二筆。生命週期為 `pending → processing → ready | failed`；到期、撤銷另由時間記錄判定。

#### Scenario: 首次匯出和重試只產生一份完整原檔

- **GIVEN** 使用者有目前任務的匯出權限且匯出內容通過驗證
- **WHEN** 匯出成功或背景工作對同一請求重試
- **THEN** 只有一筆歷史列及一份不可變原檔，含檔名、格式版本、SHA-256
- **AND** 驗證失敗時沒有可下載的部分檔案

#### Scenario: 冪等鍵作用範圍與內容衝突

- **GIVEN** 任務 A 的請求人 U 已用鍵 K 建立匯出，命令摘要已保存
- **WHEN** U 在任務 A 以鍵 K 重送相同命令，或以鍵 K 送出不同 run 順序／篩選／格式／語言／序列選項
- **THEN** 相同命令續用原歷史列；不同命令回傳衝突且不改寫原列
- **AND** 任務 B 或另一請求人不能藉 K 探測 A／U 的請求，因為查鍵前須先通過目前授權

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

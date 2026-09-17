> 正典：`specs/task-management/014-task-detail/spec.md`（v3.1.0 → v3.2.0，**MINOR**）。本 delta 只新增 FR-020，並對應新增 AC-1.10、AC-1.11、AC-1.12、AC-1.13 與 SC-045；既有條文一律不修訂（`entity_recognition` 的匯出欄位仍全文依 FR-015i-3，其排除規則寫在 FR-020 第 6 點）。推導邏輯本身的 SSoT 在 `dataset/017`（FR-041、FR-042），本規格只定義畫面與匯出檔欄位的呈現責任。issue #742。

## ADDED Requirements

### Requirement: FR-020 `sequence_tagging` 匯出對話框與序列匯出欄位

`annotation-results` 的匯出功能 MUST 在任務 `outputs[]` 含 `sequence_tagging` 時，以一個匯出對話框承載標註方案與詞元單位的選擇，並依 `dataset/017` FR-041 與 FR-042 所定義的推導契約產生序列與其 metadata。本需求只規範畫面行為與匯出檔欄位的呈現，MUST NOT 重新定義推導規則本身。

**(1) 唯一推導入口**。序列的產生 MUST 一律呼叫 `dataset/017` FR-041 所指名的共用純函式模組（原型落點 `design/prototype/pages/shared/span-tagging-export.js` 之 `LabelSuiteSpanTaggingExport.deriveSequence()`）。本頁 MUST NOT 自行拼接 `B-` / `I-` / `E-` / `S-` / `O` 標記前綴、MUST NOT 自行判斷 span 與 token 的邊界關係、MUST NOT 複製任何一份方案轉換表或詞元對齊規則。此條為硬性界線：`dataset/017` FR-041 第 1 點已將本推導訂為跨模組唯一權威來源，本頁多存在一份轉換邏輯，就是多一個 `E-` 的定義。

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

匯出記錄（FR-010i-2 之條件快照）MUST 一併保存本次的標註方案、詞元單位與（詞級時）切詞引擎識別，使重新下載重建出的檔案與原檔逐字元相同。

**(4) 對齊擴張摘要**。`token_unit = word` 的匯出完成後，畫面 MUST 顯示「N 段標記因對齊被擴張」摘要，`N` 取自模組回傳的擴張筆數；`N = 0` 時 MUST NOT 顯示該摘要。摘要 MUST 可展開，展開後逐筆列出原始標記文字、擴張後文字與起訖 offset 差值，三項皆直接取自模組回傳的擴張清單，本頁 MUST NOT 重算。`token_unit = character` 時 MUST NOT 顯示該摘要（字元級不可能發生擴張）。

擴張 MUST 只發生於匯出產物：依 `dataset/017` FR-042 第 4 點，已儲存的 `spans[]` MUST NOT 被本流程修改，標記員圈選的字元 offset 仍為權威值。

**(5) 缺 tokenizer 版本時阻擋**。`token_unit = word` 且所選切詞引擎未提供 `engine` 或 `version` 任一欄位時，該次匯出 MUST 被阻擋：畫面 MUST 顯示可理解的原因（指出缺少的是切詞引擎版本資訊，而非顯示原始錯誤字串或靜默失敗），且 MUST NOT 產生任何匯出檔、MUST NOT 於匯出記錄表新增紀錄。使用者改回 `character` 後 MUST 能正常完成匯出。阻擋判定 MUST 以模組回傳的阻擋結果為準，MUST NOT 於本頁另行實作一套 tokenizer 欄位檢查。

**(6) 適用邊界與其他輸出類型**。本需求 MUST 僅適用標記值為字元 offset `spans[]` 的 `sequence_tagging`。

標記值攜帶 `entities[]` 的實體型結果（`entity_recognition` 任務，以及 ADR-029 遷移前留下的 legacy 實體資料）MUST NOT 套用本需求所指名的序列推導——依 `dataset/017` FR-041 第 1 點，`entity_recognition` 允許重疊與巢狀，不具 span 與扁平序列之間的雙射性質。其匯出結果欄位 MUST 全文依 FR-015i-3 辦理，該條所定義的 `entities[]` 與 `entities_summary` 語意 MUST NOT 因本需求而改變。

反向亦然：FR-015i-3 所稱的實體型結果 MUST NOT 被理解為涵蓋 `spans[]`——`LEGACY_TASK_TYPE_EXPORT_ENUM` 不含 `sequence_tagging`，其匯出檔的 `task_type` 欄位雖同樣落在 `sequence_labeling`，結果欄位分流仍依 FR-015i 所定「依標記結果實際結構決定」，而 `spans[]` 的結果欄位由本需求承接。

其餘六種輸出類型的匯出欄位、兩種格式的結構、匯出記錄表與重新下載語意皆 MUST 維持不變。

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

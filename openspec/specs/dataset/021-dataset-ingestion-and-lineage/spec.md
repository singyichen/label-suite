# dataset/021-dataset-ingestion-and-lineage Specification

## Purpose
定義 dataset 匯入來源、完整版本快照、來源欄位分類與隱藏答案隔離的候選資料契約；實體表與 runtime 尚未部署。

## Requirements

### Requirement: FR-001 dataset lineage 契約

- **FR-001**：候選表採 `dataset`、`dataset_version`、`dataset_import_batch`、`dataset_item`、`dataset_item_private` 五個單數、模組前綴名稱；每表均有非空且唯一主鍵。穩定 ID 使用 UUID；FK 與 datetime 命名符合 foundation FR-105／FR-106。每筆 item 的 version/source/preprocessing 身分由 `dataset_item → dataset_import_batch → dataset_version → dataset` 的 FK 鏈追溯，不在 item 複製這些值。

#### Scenario: FR-001 主要驗收

- **GIVEN** 使用合成資料檢查 FR-001 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 五表有 PK 且 item 經 batch 追溯（FR-001）

### Requirement: FR-002 dataset lineage 契約

- **FR-002**：`dataset` 保留 `created_by_user_id → users.id`；`dataset_version` 保留 `dataset_id → dataset.id`、同 dataset 範圍的 `parent_version_id` 自參照、正整數 `version_no`、`state`、manifest checksum 及建立／封存時間，唯一鍵為 `(dataset_id, version_no)`。首版本無父版本；禁止自參照、跨 dataset 父版本、祖先循環與非遞增的後繼版本號。

#### Scenario: FR-002 主要驗收

- **GIVEN** 使用合成資料檢查 FR-002 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 版本與同資料集父版本限制成立（FR-002）

### Requirement: FR-003 dataset lineage 契約

- **FR-003**：每個已接受來源檔在版本內形成一筆 `dataset_import_batch`，有唯一 `(dataset_version_id, source_ordinal)`、來源名稱、SHA-256、受限不可變 `source_ref`、選定紀錄路徑、前處理版本與非空的受限 `classification_manifest` JSON。此 manifest 逐一保存該檔來源欄位路徑的公開／受保護分類與 PII 審查證據，不含答案值；各檔可有不同分類。JSONL 或根陣列的紀錄路徑以 `$` 表示，巢狀 JSON 使用 RFC 6901 JSON Pointer，來源紀錄序號自 1 起算。不可假設來源檔自帶的 id 全域唯一；批次來源與前處理版本不能由項目內容反推。

#### Scenario: FR-003 主要驗收

- **GIVEN** 使用合成資料檢查 FR-003 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 逐檔來源與分類 manifest 可追溯（FR-003）

### Requirement: FR-004 dataset lineage 契約

- **FR-004**：每筆接受的來源紀錄形成一筆 `dataset_item`，含 `dataset_import_batch_id` FK、正整數 `source_row_no` 與經驗證的 JSON `public_payload`，唯一鍵為 `(dataset_import_batch_id, source_row_no)`；同一內容或來源 id 在不同批次／版本可各有身分。版本是完整快照，不能透過可變父版本內容計算當前項目集合。

#### Scenario: FR-004 主要驗收

- **GIVEN** 使用合成資料檢查 FR-004 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 來源行序唯一且公開投影受控（FR-004）

### Requirement: FR-005 dataset lineage 契約

- **FR-005**：每個 item 須在同一交易建立恰一筆 `dataset_item_private`，以 `dataset_item_id` 作 PK/FK；`declared_split`、`hidden_answer` 與 `protected_payload` 可空，其中 `declared_split` 與 `hidden_answer` 只代表**來源宣告**，不代表後續 run 的實際抽樣／指派。`protected_payload` 為 JSON，只存該 item 所屬批次 `classification_manifest` 受保護集合中的非答案欄位值，鍵名一律取自 manifest、不得以欄名猜測或寫死，也不得存放 `hidden_answer` 的答案 envelope。隱藏答案、`protected_payload` 與來源 artifact 需受獨立權限控制，且 `protected_payload` 的讀取權與 `hidden_answer` 分開授權；儲存後只允許授權 scoring worker 讀取答案，標記者、一般建立者與一般 API 皆不可讀這些欄位，也不得為此新增可讀角色；scoring worker 不因可讀答案而自動取得 `protected_payload` 的讀取權，本規格不指定任何 `protected_payload` 讀取角色；不得進入標記者可讀的資料路徑。

#### Scenario: FR-005 主要驗收

- **GIVEN** 使用合成資料檢查 FR-005 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 私有伴隨列隔離答案（FR-005）

#### Scenario: FR-005 受保護非答案值落於 protected_payload

- **GIVEN** 一批 `classification_manifest` 將任意名稱的欄位分類為受保護且非答案
- **WHEN** 匯入該批 item 並寫入私有伴隨列
- **THEN** 這些欄位值寫入 `protected_payload`、不寫入 `public_payload` 或 `hidden_answer`，且鍵名完全來自 manifest（FR-005）

### Requirement: FR-006 dataset lineage 契約

- **FR-006**：匯入前須由授權建立流程明確分類來源欄位、檢查 PII／敏感內容，並獨立於 `field_role_map` 為每個來源批次保存版本化、經驗證且完整互斥的 `classification_manifest`。只有 manifest 的公開 allowlist 可進入 `public_payload`；受保護欄位不得同時為 Input、Evidence 或可見 Output。分類缺漏／矛盾時不可 seal；sealed 後 manifest 不可改。draft 修正 manifest 僅允許將欄位由公開改為受保護，系統只刪除該欄位的公開投影並把該欄位已存於 `public_payload` 的公開值（非答案）搬入私有列的 `protected_payload`，不讀取已儲存的含答案資料；其他方向（受保護改公開、為尚未分類的欄位新增分類）一律須重新上傳該批來源並走串流匯入器重建，不得以修正 manifest 原地重建，也不得為此新增可讀答案的角色。匯入後不可透過一般預覽端點讀取受保護原始來源。

#### Scenario: FR-006 主要驗收

- **GIVEN** 使用合成資料檢查 FR-006 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 分類不完整或重疊時拒絕封存（FR-006）

#### Scenario: FR-006 draft 修正僅限公開改受保護

- **GIVEN** 一個 draft 批次的 manifest 已分類，且修正者為授權建立流程
- **WHEN** 修正把某欄位由公開改為受保護
- **THEN** 公開投影被刪除且值搬入私有列的 `protected_payload`，過程不讀取已儲存的含答案資料（FR-006）

#### Scenario: FR-006 其他方向須重新上傳

- **GIVEN** 一個 draft 批次的 manifest 已分類
- **WHEN** 修正嘗試把欄位由受保護改公開，或為尚未分類的欄位新增分類
- **THEN** 修正被拒絕並要求重新上傳該批來源走串流匯入器（FR-006）

### Requirement: FR-007 dataset lineage 契約

- **FR-007**：標記者可見 API、frontend state、log、cache、trace、screenshot 及 fixture 不得包含 hidden answer、split、答案檔路徑、私有來源參照或可辨識 gold/test 的 metadata。回應模型須依公開欄位建構，不能靠 `SELECT *` 後刪欄；PostgreSQL 使用最小權限禁止標記者讀取角色查詢 private table，SQLite 以 repository／service 權限與回應 allowlist 保持同等隔離。

#### Scenario: FR-007 主要驗收

- **GIVEN** 使用合成資料檢查 FR-007 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 標記者路徑不洩漏隱藏答案（FR-007）

### Requirement: FR-008 dataset lineage 契約

- **FR-008**：`draft` 版本可由授權匯入服務更正來源與項目；封存前須驗證每批分類 manifest、匯入時取得的來源 checksum 回執、private row 完整性、正整數順序及完整快照 manifest。封存不重新讀取含答案的已儲存原始 artifact；`draft → sealed` 於同一交易寫入含分類摘要的 manifest digest、時間、狀態與稽核事件；重試冪等、競爭防衝突、失敗全回滾。`sealed` 版本不可原地改內容或解除封存，須建立新的完整快照版本。

#### Scenario: FR-008 主要驗收

- **GIVEN** 使用合成資料檢查 FR-008 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 封存交易原子且版本不可變（FR-008）

### Requirement: FR-009 dataset lineage 契約

- **FR-009**：共同路徑須兼容 SQLite quick start／PostgreSQL production：結構化 payload 在 SQLite 為 JSON storage、PostgreSQL 為 JSONB，時間以 UTC 表示；兩種方言都要驗證 FK、唯一鍵、正整數、seal 交易與公開／私有隔離。不得因 SQLite 缺 DB role 就降低答案保護；實際 migration／ORM 另立工作項實作。

#### Scenario: FR-009 主要驗收

- **GIVEN** 使用合成資料檢查 FR-009 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 雙資料庫完整性語意一致（FR-009）

### Requirement: FR-010 dataset lineage 契約

- **FR-010**：task/run、annotation、review、quality 與 export 的資料表不屬於本規格；後續契約須為任務綁定 `dataset_version_id`、為 run/snapshot 固定 item IDs 與 seeds、為標註／匯出保存 schema/config/version 條件，使用真實 FK 和交易驗證。不畫未定義的跨模組 FK，也不得把來源 `declared_split` 誤作 run 的切分結果。

#### Scenario: FR-010 主要驗收

- **GIVEN** 使用合成資料檢查 FR-010 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 待決跨模組 FK 不假裝已建立（FR-010）

### Requirement: FR-011 dataset lineage 契約

- **FR-011**：dataset 各類資料依 ADR-038（維護者 2026-10-08 於 #1224 的裁決）分級保存：(1) 受限來源 artifact、`dataset_item_private` 的私有答案與 `protected_payload`，只要仍有 sealed 版本或 run 引用，即以 RESTRICT 保留，不得刪除、匿名化或以無限制 cascade 移除；(2) 只有未封存的 draft 版本被丟棄時，才可在同一交易依服務順序實體刪除其 item、私有伴隨列、批次與受限 artifact；sealed 版本及被 run 引用的項目一律拒絕刪除；(3) 以該版本為來源的派生資源（含答案的歷程 JSON、匯出 metadata）隨其版本與 run 保存，版本整體下架的程序與期限待定（#1224），未定案前不得刪除；(4) cache 與匯出不能回傳已刪除／逾期資料。除既有正典下限外，本規格不訂任何保存期限。

#### Scenario: FR-011 主要驗收

- **GIVEN** 使用合成資料檢查 FR-011 的規劃或後續實體約束
- **WHEN** 嘗試刪除被 sealed 版本或 run 引用的受限 artifact、私有答案或 `protected_payload`
- **THEN** 刪除被 RESTRICT 拒絕，被引用資料不變（FR-011）

#### Scenario: FR-011 丟棄未封存 draft 可實體刪除

- **GIVEN** 一個未封存且未被任何 run 引用的 draft 版本
- **WHEN** 授權流程丟棄該 draft
- **THEN** 其 item、私有伴隨列、批次與受限 artifact 在同一交易被實體刪除，且不影響任何 sealed 版本（FR-011）

### Requirement: SC-001 dataset lineage 契約

- **SC-001**：兩來源檔、重複來源 id 與後繼版本的合成測試能沿真實 FK 從 item 追到來源順序、checksum、紀錄路徑、前處理版本及完整版本；同批次重複行序與同版本重複來源順序由 DB 約束拒絕。

#### Scenario: SC-001 主要驗收

- **GIVEN** 使用合成資料檢查 SC-001 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 多來源合成案例可重現（SC-001）

### Requirement: SC-002 dataset lineage 契約

- **SC-002**：跨 dataset 父版本、自參照、祖先循環及倒退版本號均拒絕；已封存版本不因建立後繼版本而改變項目集合或 manifest。

#### Scenario: SC-002 主要驗收

- **GIVEN** 使用合成資料檢查 SC-002 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 跨資料集與循環父版本被拒（SC-002）

### Requirement: SC-003 dataset lineage 契約

- **SC-003**：未明確分類、PII 審查未完成或受保護欄位與 Input／Evidence／Output 重疊時無法 seal；合成 hidden answer 和來源 split 不出現在公開項目與任一標記者可讀路徑，所有標記者回應的遞迴安全測試均通過。

#### Scenario: SC-003 主要驗收

- **GIVEN** 使用合成資料檢查 SC-003 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 受保護欄位不進公開投影（SC-003）

### Requirement: SC-004 dataset lineage 契約

- **SC-004**：`draft → sealed` 的 manifest、狀態、時間及稽核事件只同時成功或同時回滾；重試與並發不產生雙重封存或部分發布，`sealed` 後內容修訂被拒絕。

#### Scenario: SC-004 主要驗收

- **GIVEN** 使用合成資料檢查 SC-004 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 封存失敗完整回滾（SC-004）

### Requirement: SC-005 dataset lineage 契約

- **SC-005**：相同的合成案例在 SQLite 與真實 PostgreSQL 對 PK/FK、UNIQUE、CHECK、隔離及交易得出相同結果；本規格未實作前，此標準是後續 code/test gate，不能宣稱已通過。

#### Scenario: SC-005 主要驗收

- **GIVEN** 使用合成資料檢查 SC-005 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** SQLite 與 PostgreSQL 後續實體測試通過（SC-005）

### Requirement: SC-006 dataset lineage 契約

- **SC-006**：規劃文件與 NoteCraft 圖只顯示已定義的資料集內 FK，清楚標示候選／未部署及 task/run 下游待定；不得把圖的單欄連線當成同 dataset 複合父版本約束的證據。

#### Scenario: SC-006 主要驗收

- **GIVEN** 使用合成資料檢查 SC-006 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** NoteCraft 只顯示已定義的候選 FK（SC-006）

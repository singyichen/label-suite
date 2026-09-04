## MODIFIED Requirements

### Requirement: FR-003d-1 sequence_tagging 的設定契約與 Step 2 專屬預覽

`sequence_tagging` MUST 支援 `entities`（`{ name, color }[]`）、`snap_unit`（`SPAN_SNAP_UNITS = character | word`，預設 `character`）與 `allow_bypass`（boolean）三個設定欄位。設定面板依序顯示「標籤類型」、「選取吸附」、「允許無法判定」共三欄。

**`snap_unit` 只影響選取落點，不影響儲存值。** `character` 表示不吸附，使用者拖曳到哪裡就是哪裡；`word` 表示放開滑鼠時把起訖點各自吸附至最近的詞界。兩種設定產出的資料結構完全相同，且切換 `snap_unit` MUST NOT 使任何既有標記失效、錯位或被清除——這是本版與 v6.3.0 `tokenization.unit` 的根本差異。

詞界判定 MUST 使用前端 `Intl.Segmenter`（`granularity: 'word'`），MUST NOT 依賴後端 tokenizer、MUST NOT 於任務建立時凍結任何 engine 或 version。執行環境缺少 `Intl.Segmenter` 時 MUST 退回「不吸附」行為，且 MUST NOT 因此改寫任務設定值（標註者端的降級提示由 `annotation/015-annotation-workspace` 承接）。

Step 2 專屬預覽 MUST 以拖曳圈選呈現：以「原始文本」標題（英文 Text）與未經任何切分的 Input 原始文本為單一呈現面，使用者拖曳圈出一段文字後點選標籤類型完成新增，產出 `spans[]`（`{ start, end, label }`，`start`／`end` 為相對於原始文本的字元 offset，`end` 不含端點）。`sequence_tagging` 宣告 `hidePreviewTitle: true`，預覽 MUST NOT 顯示輸出卡片的「序列標註」標題。已標記 span MUST 以對應 `entities` 顏色底線呈現，並提供含類型徽章、文字、字元位置與刪除按鈕的已標記清單。

**下列 v6.2.0–v6.4.0 建立的機制隨 token 座標系一併移除**，MUST NOT 於任何路徑保留：Token 網格；`tokenization`（`{ unit, mode, punctuation, version }`）設定契約；`tagging_scheme`（`BIO | BIOES | IOB2 | SINGLE`）設定欄位；依方案產生完整 tag 按鈕列（`B-X`／`I-X`／`E-X`／`S-X`／`O`）與「先選完整 tag 再點擊 Token」互動；「可見預標記數量必須等於 Token 數量、否則阻擋進入 Step 3」硬約束；切換單位後清除暫存 tag、依新 Token 數重新驗證、數量重新一致時自資料重新初始化三條防護；數量與另一單位對齊時「切回該單位／改用符合目前單位的預標記」兩條出路的錯誤訊息分支。

規格常數同步改版：`SEQUENCE_TOKEN_UNITS` 更名為 `SPAN_SNAP_UNITS = character | word`（原名之 `SEQUENCE_` 前綴與 `TOKEN` 語意皆已不成立，且該常數現同時服務 `sequence_tagging` 與 `entity_recognition`）；`SEQUENCE_TAGGING_SCHEMES`、`SEQUENCE_TOKENIZATION_VERSION`、`SEQUENCE_TOKENIZATION_MODE` 自 013 規格常數移除。BIO 序列改由匯出層自 `spans[]` 決定性推導，其契約由 `dataset/017-dataset-analysis-detail` 定義，013 MUST NOT 再產出任何標記方案設定欄位。

預標記載入：資料中的 span 以字元 offset 直接落位，MUST NOT 施加任何數量一致性檢查。`start`／`end` 超出原始文本長度或 `start >= end` 的 span MUST 被拒絕並在預覽中列出，其餘 span 正常載入；此為本版唯一的預標記錯誤情境。

**span 重疊政策為型別級不變式。** `sequence_tagging` 與 `entity_recognition` 自 v7.0.0 起共用同一套拖曳圈選介面與同一組 span 儲存結構，兩者的區分 MUST 由規格常數 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE` 明訂，MUST NOT 僅以顯示名稱或匯出預設值區分：

- `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE = sequence_tagging: forbidden | entity_recognition: configurable`

`sequence_tagging` 的 `allow_overlapping` MUST 鎖死為 `false`——它是型別不變式而非可設定欄位，因此 MUST NOT 出現於 Step 2 設定面板、MUST NOT 出現於序列化後的 config、MUST NOT 可經 Code 模式覆寫；Code 模式載入的 config 若帶 `allow_overlapping: true`，MUST 視為驗證錯誤並阻擋前進，MUST NOT 靜默改寫為 `false`。此約束的理由是可驗證的數學事實：扁平 BIO 序列無法表達重疊與巢狀，鎖死 `false` 保證任何 `sequence_tagging` 標記在任何時候都能無損壓成 BIO 序列（匯出契約見 `dataset/017-dataset-analysis-detail`）。

Step 2 預覽 MUST 在 `sequence_tagging` 下對相交落點給出即時可見的拒絕回饋：新圈選範圍與任一既有 span 相交時，色條 MUST 轉為錯誤色且 MUST NOT 建立該 span。相鄰但不相交（前一 span 的 `end` 等於新 span 的 `start`）MUST 被允許。

驗證：`entities` 不得為空且不得含空白項目；`snap_unit` 必須為 `SPAN_SNAP_UNITS` 列舉值。

#### Scenario: SC-003x sequence_tagging 拖曳圈選與吸附行為
- **GIVEN** 使用者於 Step 1 選擇 `sequence_tagging` 並進入 Step 2
- **WHEN** 標記預覽載入
- **THEN** 設定區依序顯示「標籤類型」、「選取吸附」、「允許無法判定」三欄，且畫面上不存在「標記方案」欄位、不存在 Token 網格、不存在任何 `B-`／`I-`／`E-`／`S-` 前綴的 tag 按鈕
- **AND** 預覽以帶「原始文本」標題的未切分文本呈現，且不顯示輸出卡片的「序列標註」標題
- **WHEN** 選取吸附為「字元」，使用者於中文文本「台積電董事長今天出席」自「積」拖曳至「電」後點選標籤類型
- **THEN** 新增一筆 `{ start: 1, end: 3, label: <類型> }`，反白範圍與拖曳範圍一致
- **WHEN** 將選取吸附切換為「詞」
- **THEN** 既有 span 的 `start`／`end` 與顯示位置皆維持不變，畫面不出現任何數量不一致錯誤，亦不阻擋進入 Step 3
- **AND** 於「詞」模式下自「積」拖曳至「電」放開時，起訖點吸附至詞界而產生涵蓋「台積電」的 `{ start: 0, end: 3 }`

#### Scenario: 預標記以字元 offset 落位且不做數量檢查
- **GIVEN** 資料集某筆紀錄的 output 欄位提供 3 筆 span 預標記，而原始文本共 20 個字元
- **WHEN** Step 2 標記預覽初始化
- **THEN** 3 筆 span 依其字元 offset 直接落位，畫面不顯示任何「標記數量與 Token 數不一致」錯誤，「下一步」按鈕可用
- **WHEN** 其中一筆預標記為 `{ start: 18, end: 25 }`（`end` 超出文本長度）
- **THEN** 該筆被拒絕並列於預覽的錯誤清單中，其餘 2 筆正常載入且不阻擋進入 Step 3

#### Scenario: sequence_tagging 拒絕相交 span
- **GIVEN** `sequence_tagging` 的 Step 2 預覽已存在一筆 span `{ start: 0, end: 3 }`
- **WHEN** 使用者拖曳圈出 `{ start: 2, end: 5 }` 並點選標籤類型
- **THEN** 色條轉為錯誤色，該 span 不被建立，已標記清單筆數維持 1
- **WHEN** 使用者改為拖曳圈出 `{ start: 3, end: 5 }`（與既有 span 相鄰但不相交）並點選標籤類型
- **THEN** 該 span 正常建立，已標記清單筆數為 2
- **AND** Step 2 設定面板不存在「允許重疊與巢狀」欄位，序列化後的 `sequence_tagging` config 不含 `allow_overlapping` 鍵

#### Scenario: Code 模式不得繞過重疊政策
- **GIVEN** 使用者於 Step 2 切換至 Code 模式
- **WHEN** 貼上一份 `sequence_tagging` 輸出帶 `allow_overlapping: true` 的 config 並套用
- **THEN** 顯示可定位的驗證錯誤並阻擋進入 Step 3
- **AND** 系統不得靜默把該值改寫為 `false` 後接受

### Requirement: FR-003d-3 entity_recognition 的設定契約與 Step 2 專屬預覽

`entity_recognition` MUST 支援 `entities`（`{ name, color }[]`）、`snap_unit`（`SPAN_SNAP_UNITS`，預設 `character`）、`allow_overlapping`（boolean）與 `allow_bypass`（boolean）四個設定欄位。設定面板依序顯示「標籤類型」、「選取吸附」、「允許重疊與巢狀」、「允許無法判定」共四欄；`allow_overlapping` 的設定卡與前一個 `entity-list` 結尾保留 12px，並與後方 `allow_bypass` 的群組間距一致。

`snap_unit` 的語意、`Intl.Segmenter` 依賴與降級行為與 FR-003d-1 完全一致，MUST 由同一套共用元件提供，MUST NOT 於本型別另立第二套詞界判定邏輯。

自 v7.0.0 起，`entity_recognition` 與 `sequence_tagging` 共用同一套拖曳圈選預覽元件，兩者的唯一設定差異為 `allow_overlapping` 是否可設定（政策常數見 FR-003d-1）。預覽：文本區域可圈選文字建立實體 + 實體類型按鈕列 + 已標記實體列表（含類型 badge、文字、字元位置、刪除按鈕），已標記實體以對應顏色底線顯示。單一或混合 `entity_recognition` 模式都 MUST 支援兩種順序：（1）先選擇實體類型再圈選文字，圈選後立即新增；（2）先圈選文字再選擇實體類型，圈選範圍持續反白但不顯示提示，點擊類型後才新增並保留該類型為作用中。未分類期間若重新圈選，以最新範圍取代前一範圍。

驗證：`entities` 不得為空且不得含空白項目；`snap_unit` 必須為 `SPAN_SNAP_UNITS` 列舉值。

#### Scenario: entity_recognition 四欄設定與共用圈選元件
- **GIVEN** 使用者於 Step 1 選擇 `entity_recognition` 並進入 Step 2
- **WHEN** 設定面板載入
- **THEN** 依序顯示「標籤類型」、「選取吸附」、「允許重疊與巢狀」、「允許無法判定」四欄
- **AND** 其「選取吸附」欄位的選項與 `sequence_tagging` 完全相同（`character`／`word`）
- **WHEN** 同一份任務同時選取 `sequence_tagging` 與 `entity_recognition`
- **THEN** 兩個手風琴面板各自顯示自己的「選取吸附」設定，兩者可設為不同值且互不影響

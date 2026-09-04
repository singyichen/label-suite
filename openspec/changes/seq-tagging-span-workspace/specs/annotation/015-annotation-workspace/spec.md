## MODIFIED Requirements

### Requirement: FR-024A sequence_tagging 的 annotator 標記介面

當 `outputs[]` 含 `sequence_tagging` 時，Annotator 工作區 MUST 顯示帶「原始文本」標題的、**未經任何切分**的原始文本作為單一圈選面；使用者拖曳圈出一段文字後點選標籤類型完成標記，產出 `spans[]`（`{ start, end, label }`，`start`／`end` 為相對於原始文本的字元 offset，`end` 不含端點）。已標記 span MUST 以對應標籤顏色底線呈現，並提供含類型徽章、文字、字元位置與刪除按鈕的已標記清單。

`sequence_tagging` 的 span MUST NOT 相交（型別不變式，見 `task-management/013-task-new` 的 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE`）；相交落點 MUST 給出即時可見的拒絕回饋且不建立該 span，相鄰但不相交（前一 span 的 `end` 等於新 span 的 `start`）MUST 被允許。

**下列 v6.4.0 以前的機制隨 token 座標系一併移除**，MUST NOT 於工作區任何路徑保留：Token 網格；「先依 `tagging_scheme` 選定完整 tag 再點擊 Token」互動；依方案產生的完整 tag 按鈕列（`B-X`／`I-X`／`E-X`／`S-X`／`O`）；依前一 Token 標籤自動推導 `B-`／`I-` 前綴的邏輯。`tagging_scheme` 自 013 設定契約移除後，工作區 MUST NOT 再讀取或呈現該欄位；BIO 序列改由匯出層自 `spans[]` 決定性推導。

`allow_bypass` 的行為不變：Bypass 仍為整張輸出卡片層級的「無法判定」宣告，與 span 標記互斥。

#### Scenario: AC-2A.5 annotator 以拖曳圈選完成 sequence_tagging 標記
- **GIVEN** `outputs[]` 含 `sequence_tagging`，annotator 開啟工作區某筆樣本
- **WHEN** 該輸出卡片渲染
- **THEN** 顯示帶「原始文本」標題的未切分文本，且畫面上不存在 Token 網格、不存在任何 `B-`／`I-`／`E-`／`S-` 前綴的 tag 按鈕、不存在「標記方案」相關呈現
- **WHEN** annotator 於文本上拖曳圈出一段文字並點選標籤類型
- **THEN** 新增一筆 `{ start, end, label }`，該範圍以對應標籤顏色底線呈現，已標記清單新增一列（類型徽章、文字、字元位置、刪除按鈕）
- **WHEN** annotator 拖曳圈出與既有 span 相交的範圍並點選標籤類型
- **THEN** 給出可見的拒絕回饋，該 span 不被建立，已標記清單筆數不變
- **AND** 改為圈出與既有 span 相鄰但不相交的範圍時，該 span 正常建立

### Requirement: FR-024A-1 sequence_tagging 的選取吸附與降級

`sequence_tagging` 工作區 MUST 依任務 config 的 `snap_unit`（`SPAN_SNAP_UNITS = character | word`）決定拖曳放開時的落點吸附行為：`character` 不吸附，`word` 將起訖點各自吸附至最近的詞界。**吸附只影響滑鼠落點，不影響儲存值**——兩種設定產出的資料結構完全相同。

詞界判定 MUST 使用前端 `Intl.Segmenter`（`granularity: 'word'`），MUST NOT 依賴後端 tokenizer、MUST NOT 於任務建立時凍結任何 engine 或 version。

**v6.4.0 以前的「後端權威 Token 邊界」契約整組作廢**（原 ADR-031：tokenization 為 annotation 資料契約的一部分、engine/version 依任務凍結、workspace 不得自行重新切分）。span 的儲存值是使用者實際圈選的字元 offset，不存在需要由單一權威來源裁定的切分結果，因此 MUST NOT 於任何路徑保留凍結 engine／version 的欄位或校驗。

執行環境缺少 `Intl.Segmenter` 時，該標註者端 MUST 退回「不吸附」行為並於標記卡顯示一行提示，MUST NOT 因此改寫任務設定值。

**吸附能力差異不影響資料可比性（本版新增規則）。** 同一任務的不同標註者可能在吸附能力不同的執行環境作業，這在 v6.4.0 以前不可能發生——當時 token 邊界由後端統一供給。因吸附只影響滑鼠落點、不進入資料，降級標註者產出的 `spans[]` 與其他標註者完全相容：系統 MUST 照常將其答案納入 IAA、共識與差異比對計算，MUST NOT 因其吸附能力而標記為可疑、降權或排除，MUST NOT 於事後對其 span 邊界做任何「對齊詞界」的修正。標記卡的降級提示 MUST 定位為操作手感說明，MUST NOT 呈現為資料品質警告。

#### Scenario: 吸附只影響落點，降級標註者的答案照常參與計算
- **GIVEN** 任務 config 的 `snap_unit` 為 `word`，樣本文本為「台積電董事長今天出席」
- **WHEN** annotator 自「事」拖曳至「長」放開並點選標籤類型
- **THEN** 起訖點吸附至詞界而產生涵蓋「董事長」的 `{ start: 3, end: 6 }`
- **WHEN** 執行環境不提供 `Intl.Segmenter`
- **THEN** 該標註者端退回不吸附（拖曳到哪裡就是哪裡），標記卡顯示一行說明目前不吸附的提示
- **AND** 任務 config 的 `snap_unit` 值維持 `word` 不變
- **WHEN** 同一任務由吸附可用的標註者 A 與降級的標註者 B 各自完成標記，系統計算該樣本的 IAA 與差異比對
- **THEN** A 與 B 的答案皆完整納入計算，B 的答案未被標記為可疑、未被降權、未被排除
- **AND** B 的 span 邊界維持其實際圈選的 offset，未被事後對齊至任何詞界

### Requirement: FR-024A-2 sequence_tagging 提交前的 span 合法性驗證

`sequence_tagging` 提交前 MUST 驗證每筆 span 的合法性：`start >= end`、`start < 0`、或 `end` 超出原始文本長度者為錯誤，MUST 阻擋提交並顯示可定位的錯誤。

**v6.4.0 的「標記 tag 數量必須等於正式 Token 數量、否則阻擋提交」硬約束移除**——span 模型下不存在需要對齊的 Token 陣列，該驗證已無對象。同理，「可見預標記數量與正式 Token 數量不一致時阻擋提交」的邊界情境一併移除；預標記 span 依字元 offset 直接落位，超出範圍者被拒絕並列出，其餘正常載入。

未標記任何 span 且未宣告 Bypass 時 MUST 阻擋提交（沿用既有的空答案阻擋語意），建立任一 span 後該阻擋 MUST 解除。

#### Scenario: 空 span 阻擋提交、越界預標記為錯誤
- **GIVEN** `outputs[]` 含 `sequence_tagging`，annotator 尚未建立任何 span 且未宣告 Bypass
- **WHEN** annotator 嘗試提交
- **THEN** 提交被阻擋並顯示可定位的錯誤
- **WHEN** annotator 圈選任一段文字並套用標籤類型
- **THEN** 該阻擋解除，提交可進行
- **WHEN** 樣本的預標記含一筆 `end` 超出原始文本長度的 span
- **THEN** 該筆被拒絕並列於錯誤清單，其餘預標記正常落位，且畫面不出現任何「標記數量與 Token 數不一致」錯誤

### Requirement: FR-024A-3 sequence_tagging 標記結果 payload

`sequence_tagging` 標記結果 payload MUST 包含 `spans[]`（`{ start, end, label }`）、`snap_unit`（`SPAN_SNAP_UNITS` 之一）、`bypass`、`version`；annotator 可見資料 MUST NOT 包含 ground truth。

**`tokens[]`、`tags[]`、`scheme`、`unit` 四個欄位移除**：前二者是 token 座標系的儲存形式，`scheme` 隨 `tagging_scheme` 移至匯出層，`unit` 更名為 `snap_unit` 以反映它只影響落點而非資料。BIO 序列 MUST NOT 出現於 payload，其推導契約由 `dataset/017-dataset-analysis-detail` 定義。

#### Scenario: 提交 payload 為 span 形狀
- **GIVEN** annotator 於 `sequence_tagging` 卡片建立了 2 筆 span
- **WHEN** 提交該筆樣本
- **THEN** payload 含 `spans[]`（2 筆 `{ start, end, label }`）、`snap_unit`、`bypass`、`version`
- **AND** payload 不含 `tokens[]`、`tags[]`、`scheme`、`unit`，亦不含任何帶 `B-`／`I-` 前綴的值
- **AND** annotator 可見資料不含 ground truth

### Requirement: FR-052 標記員與審核員答案的差異比對

標記員與審核員答案的差異比對 MUST 逐輸出類型定義，且在共通的 CompactAnswer 形狀上運作：`multi_label`、`sequence_tagging`、`entity_recognition`、`relation_identification` 以合併鍵做順序無關的集合比對（沿用 `CONSENSUS_MERGE_KEYS` 的比對語意，僅存在於單邊者列為差異項）；`multi_dim` 逐維度比對；`single_label` / `single_dim` / `free_text` 為單值比對。`single_dim` 與 `multi_dim` 一律採**嚴格相等**，不得套用 `DIM_CONSENSUS_TOLERANCE`。比對結果 MUST 同時提供「是否相同」與「差異項清單」。

**`sequence_tagging` 由「逐 token 位置比對」改為集合比對。** CompactAnswer 的 `sequence_tagging` 形狀自本版起為 `{ text, label, start, end }`（原為 `{ text, tag }`），合併鍵為 `start + end + label`。三項變更理由：

1. span 模型下不存在可逐位比對的 token 陣列；
2. 逐 token 比對會把「一個 n 字實體被改了型別」計為 n 個差異項，集合比對計為「原項移除 + 新項新增」共 2 項，與 `entity_recognition` 對同一種更動的計法一致；
3. `tag` 更名為 `label` 是因為值不再帶 `B-`／`I-`／`E-`／`S-` 前綴。

`text` 為呈現用的去正規化欄位，MUST 等於原始文本 `[start, end)` 的切片；**`(start, end)` 為權威**，消費端於兩者不一致時 MUST 以 offset 為準，MUST NOT 以 `text` 反向修正 offset。保留 `text` 的理由是審核列表與審核卡的既有呈現路徑直接讀該欄位顯示標記文字，而其資料列未必攜帶原始文本。

**已知落差（範圍收斂）**：`CONSENSUS_MERGE_KEYS` 對 `entity_recognition` 定義的合併鍵為 `start + end + type`，但其 CompactAnswer 不攜帶位置資訊，原型實作退而以 `text + type` 為鍵。本版使 `sequence_tagging` 的 CompactAnswer 確實攜帶位置，因此其合併鍵 MUST 使用完整的 `start + end + label`，MUST NOT 退化為文字比對；`entity_recognition` 的該項落差不在本版範圍。

#### Scenario: AC-4.11 sequence_tagging 差異比對以 span 合併鍵運作
- **GIVEN** 某標記員的 `sequence_tagging` 答案含一筆 `{ text: '台積電', label: 'ORG', start: 0, end: 3 }`
- **WHEN** 審核員將該筆的類型改為 `PRODUCT` 後送出審核
- **THEN** 差異比對回報「不相同」，且差異項清單為 2 項（`ORG` 該項移除、`PRODUCT` 該項新增），MUST NOT 因該實體佔 3 個字元而回報 3 項
- **WHEN** 審核員未更動任何 span 即送出
- **THEN** 差異比對回報「相同」，差異項清單為空，且比對過程不依賴標記文字的左至右依序消耗

### Requirement: FR-024L Reviewer 審查呈現的逐型別對應規則

Reviewer 審查呈現 MUST 依 `outputs[].type` 對應下列規則之一：`single_label` / `multi_label` / `sequence_tagging` 顯示**標籤**出現次數分布；`single_dim` / `multi_dim` 顯示 `mean`/`std`/`±1.5std` 分數統計；`entity_recognition` 顯示 entity diff；`relation_identification` 顯示 triple 清單（monospace，一筆一行）；`free_text` 顯示標記員文字內容比對。此對應規則由 workspace 端呈現層維護，MUST NOT 逐任務硬編分支。

`sequence_tagging` 的統計主體由「帶 BIO 前綴的 tag」改為「不帶前綴的標籤類型」，因此其實體數量統計與 `entity_recognition` 一致——同一個 n 字實體計為 1，MUST NOT 因方案前綴而拆成多筆。

#### Scenario: AC-3.12 標記分布統計盒以標籤類型計數
- **GIVEN** 標記分布統計盒（`ws-review-stats`）渲染一筆 `sequence_tagging` 輸出，某標記員標了 2 個 `ORG` 實體與 1 個 `PER` 實體
- **WHEN** reviewer 檢視統計文字
- **THEN** 顯示 `ORG×2 · PER×1`（依出現次數降冪、以 `·` 串接）
- **AND** 統計文字不含任何 `B-`／`I-`／`E-`／`S-` 前綴，且不因某實體橫跨多個字元而重複計數
- **AND** 已標記為 Bypass 的標記員結果不計入統計

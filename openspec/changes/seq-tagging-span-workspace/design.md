# 設計決策：sequence_tagging 作業面遷移至 span 座標系

> 本 change 是 issue #581 三段拆分的第二段，承接 `seq-tagging-span-config`（change ①）已定案的 span 座標系與 `SPAN_SNAP_UNITS` 契約。change ① 的五項決策（儲存座標系、粒度降級為吸附、型別不變式、`tagging_scheme` 移至匯出層、前端 `Intl.Segmenter`）於本 change 全部沿用，此處僅記錄 015 作業面**額外**需要的決策。

## 決策 1：CompactAnswer 的 `sequence_tagging` 形狀採 `{ text, label, start, end }`

**選項**

| 方案 | 形狀 | 評估 |
|------|------|------|
| A | `{ start, end, label }`（純 offset） | 最精簡，但 `annotation-list.html` 的 official_run 單列摘要與 `REVIEWER_MOCK_ROWS` 的呈現路徑都直接讀 `text` 顯示標記文字，改純 offset 會讓所有呈現端被迫改成「拿 offset 回原文切片」——而審核列表的資料列並不總是帶著原始文本。 |
| B | `{ text, label }`（僅更名） | 呈現端零改動，但反向重建仍需靠文字比對推位置，本 change 的主要動機之一落空。 |
| **C（採用）** | `{ text, label, start, end }` | 呈現端零改動（`text` 保留），反向重建改為依 offset 精確定位。代價是 `text` 與 `(start, end)` 存在冗餘，可能不一致。 |

**採用 C。** 冗餘以一條不變式約束：`text` MUST 等於原始文本 `[start, end)` 的切片，且 **`(start, end)` 為權威**——任何消費端在兩者不一致時 MUST 以 offset 為準，MUST NOT 反過來以 `text` 修正 offset。`text` 的定位是呈現用的去正規化欄位，不是第二個真相來源。

**`tag` → `label` 更名的理由**：v6.4.0 的 `tag` 值帶 `B-`／`I-`／`E-`／`S-` 前綴（值域是「方案 × 類型」的笛卡兒積），span 模型下值就是類型本身。沿用 `tag` 會讓消費端誤以為仍需剝前綴。

**此決策同時廢掉一段近似邏輯。** 現行 `buildSequenceTagsFromPairs` 以「逐一比對 token 文字、左至右依序消耗」還原標記位置，其程式碼註解即明載它如何處理 T006 樣本中「台」在 index 0 與 13 重複出現的情況——這是猜測而非還原。帶上 offset 後該路徑整段消失。

## 決策 2：差異比對由「逐 token 位置」改為集合比對，且視為缺陷修正

FR-052 現行規定 `sequence_tagging` 逐 token 位置比對。span 模型下沒有 token 陣列可逐位比對，必須改制。

採 `(start, end, label)` 為合併鍵的順序無關集合比對，與 `entity_recognition`／`multi_label`／`relation_identification` 一致，語意直接沿用 `CONSENSUS_MERGE_KEYS`。

**這不只是形狀適配，而是修正一項既有缺陷**：逐 token 比對會把「一個三字實體被審核員改了型別」計為 **3 個差異項**；集合比對計為 **1 項改動**（依 FR-052 既有集合語意拆為「原項移除」＋「新項新增」共 2 個差異項，仍遠比 3 更貼近事實，且與 `entity_recognition` 對同一種更動的計法一致）。此差異會直接反映在審核卡與爭議池的呈現上。

**與 FR-052「已知落差」的關係**：FR-052 記載 `CONSENSUS_MERGE_KEYS` 對 `entity_recognition` 定義的合併鍵是 `start + end + type`，但 CompactAnswer 不帶位置，原型實作退而以 `text + type` 為鍵。本 change 讓 `sequence_tagging` 的 CompactAnswer **確實帶位置**，因此它可直接使用 `start + end + label` 完整鍵，不需要退化實作。`entity_recognition` 的該項落差**不在本 change 範圍**，維持原狀。

## 決策 3：吸附能力降級明訂為「資料相容、禁止事後修正」

change ① 的 013 設定契約已規定「執行環境缺少 `Intl.Segmenter` 時 MUST 退回不吸附，且 MUST NOT 因此改寫任務設定值」，並明文把標註者端的降級提示交給 015。

015 需要多寫一條 013 無從規範的東西：**同一任務的不同標註者可能以不同吸附行為作業**——這在後端權威 token 邊界的舊模型下不可能發生（邊界統一由後端供給）。若不明文處理，日後極可能被誤判為資料污染而寫出「修正」邏輯。

規則：吸附只影響滑鼠落點，不進入資料。降級標註者產出的 `spans[]` 與其他標註者**完全相容**，IAA 與共識計算 MUST 照常納入，MUST NOT 標記為可疑、MUST NOT 事後對齊詞界。標記卡 MUST 顯示一行提示告知該標註者目前不吸附——提示的用途是解釋操作手感差異，不是資料品質警告。

## 決策 4：`patchSequenceTaggingPanel` 整段退場，不保留相容層

工作區現行以 DOM 後處理接手引擎預覽：以 `previewState.sequence_tagging.tokens` 是否為陣列作為守衛，查詢引擎產生的 `[data-testid="sequence-token"]` 節點改標為 `ws-seq-token`，並依前一個 token 的標籤自動決定 `B-`／`I-` 前綴。

**這是工作區唯一為單一輸出類型存在的 DOM 後處理函式**，其存在理由（型別晶片 → 完整 tag、前綴推導）在 span 模型下全部消失：引擎的拖曳圈選介面本身就是型別層級，沒有前綴可推。因此整段移除，不留「舊渲染器 + host 旗標」的相容層——保留相容層等於在引擎內把 `sequence_tagging` 分岔成兩套渲染、兩套回填、兩套 `clearOutputPreviewState` 形狀，違反 Generalization-First。

連帶移除 change ① 群組 2 為了不讓工作區立即崩潰而刻意保留的 `getSequencePreviewTokens` 與 `tokenizeSequenceText`。

## 對 ADR-031 的處置

ADR-031（tokenization 為 annotation 資料契約的一部分，engine/version 依任務凍結）由 change ① 群組 3 標記為 Superseded。015 現有三處引用其結論——FR-024A-1 的權威來源、AC-2A.5 的「不得自行重新切分」、L308 邊界情境、L631 的數量一致性——本 change 一併改寫或移除。**本 change 不修改 ADR 檔案本身**，避免與 change ① 群組 3 撞同一檔案。

L1107 的 Open Question（word-mode 分詞引擎 CKIP／Jieba／PyICU 選型未定案）隨之註銷：吸附改由前端 `Intl.Segmenter` 執行，不存在後端分詞引擎選型問題。

## Constitution Check

| 原則 | 檢核 |
|------|------|
| Generalization-First | ✅ 淨移除硬編路徑：`sequence_tagging` 專屬的 DOM 後處理函式與專屬的差異比對分支雙雙併入通用路徑。 |
| Data Fairness | ✅ FR-024A-3 的「annotator 可見資料不得包含 ground truth」原文保留。 |
| Simplicity First | ✅ 決策 4 明確拒絕相容層；`text` 的冗餘以單一權威方向的不變式約束，不引入同步機制。 |
| KISS > DRY | ✅ 決策 1 選 C 而非最精簡的 A，理由是避免所有呈現端被迫承擔「offset 回原文切片」的取用成本。 |

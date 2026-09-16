# 設計決策：task-detail-seq-tagging-export-dialog（issue #742）

> 為何需要本文件：本 change 為匯出檔新增 `tagging_scheme`、`token_unit`、`tokenizer.engine`、`tokenizer.version`、`alignment_mode`、`expanded_span_count` 六個欄位，且同時影響 `JSON` 與 `JSON-MIN` 兩種既有格式的輸出結構。匯出檔是下游消費者（研究者的訓練腳本、評測管線）會直接 parse 的產物，其 manifest 已自帶 `schema_version`（`design/prototype/pages/task-management/task-detail.html:9156`，現值 `'1.0.0'`），因此欄位增補屬 CLAUDE.md「Modify Existing Feature」第 2 步所稱之 API 契約／schema 變更，須有 design.md。

## 背景：既有匯出路徑的三個事實

三項皆為讀檔確認，非推測：

1. **序列推導模組已存在但全無呼叫端**。`design/prototype/pages/shared/span-tagging-export.js` 由 issue #581 change ③ 落地。其公開面只有一個函式與五個常數，其餘皆封裝於 IIFE 內：

   ```js
   global.LabelSuiteSpanTaggingExport = {
     EXPORT_TAGGING_SCHEMES, EXPORT_DEFAULT_TAGGING_SCHEME,
     EXPORT_TOKEN_UNITS, EXPORT_DEFAULT_TOKEN_UNIT,
     SPAN_TOKEN_ALIGNMENT_MODE, deriveSequence,
   };
   ```

   全原型無任何頁面載入此檔（該模組檔頭註解自陳「the dialog that does belongs to the 014 companion change (issue #742)」）。

2. **`spans[]` 形狀的標記值目前匯出為空**。`buildTaskSpecificExportFields()`（`design/prototype/pages/task-management/task-detail.html:9058`）於 `sequence_labeling` 分支只認 `value.aspects` 與 `value.entities` 兩種形狀；`spans[]` 兩者皆不符，落入 `entities` 分支並產出空陣列。

3. **原型內沒有任何切詞器**。`tokenizer` 這個識別字在 `design/prototype/pages/` 底下只出現於上述模組本身。

## 決策

### D1 metadata 落點：`JSON` 放 manifest，`JSON-MIN` 放每一列

`buildJsonExportPayload()`（`:9145`）產出 `{ manifest, items[] }`，`buildJsonMinExportPayload()`（`:9194`）產出扁平 `rows[]`、**沒有 manifest**。若只寫 manifest，JSON-MIN 的匯出結果會完全不帶方案與單位資訊，無法重現——這正是 delta FR-020 第 3 點要求「兩種格式皆須出現」的理由。

因此：`JSON` 的六個欄位置於 `manifest` 之下（與既有的 `applied_iaa_metrics`、`applied_filters` 同層，屬「這次匯出的條件」而非「某一列的資料」）；`JSON-MIN` 由 `buildTaskSpecificExportFields()` 於 `sequence_tagging` 分支逐列附帶（與既有 `sequence_labeling_subtype` 同一機制）。

`tokenizer` 在 `JSON` 與 `JSON-MIN` **兩種格式皆為巢狀物件 `{ engine, version }`**（直接沿用模組回傳形狀），不展平。

此處**刻意不沿用 JSON-MIN 的扁平化現場慣例**——`excluded_annotation_assignments_ref`（`task-detail.html:9056`）確實是既有的扁平化先例，但那是「結果欄位」的扁平化，而 `tokenizer` 屬 metadata，類別不同。更關鍵的是 `dataset/017` FR-042 第 1 點與 AC-5.3／AC-5.4 逐字寫的都是 `tokenizer.engine`／`tokenizer.version`，該契約是本推導的 SSoT；若 JSON-MIN 改用 `tokenizer_engine`，gate 4 的 Source-Verify 在 archive 時將無法以該契約原文逐字核對匯出欄位。兩份規格對得起來的價值高於單一格式的解析便利。

**維護者裁決（2026-09-16）**：兩種格式一律保留巢狀 `tokenizer.engine`／`tokenizer.version`。

### D2 `schema_version` 由 `1.0.0` 升為 `1.1.0`

只新增欄位、不移除也不改變任何既有欄位語意，對既有消費者向後相容，故為 MINOR。

**維護者裁決（2026-09-16）**：升為 `1.1.0`。新增欄位對下游解析者是相容的增補，正是 MINOR 的定義；FR-010i-1 將 `schema_version` 列為審計用途，不跳號等於讓它失去意義。

### D3 token 與 tokenizer 由資料層預先種入，不在 014 實作切詞演算法

模組的詞級路徑要求呼叫端提供 `options.tokens`（`[{start,end}]`）與 `options.tokenizer`（`{engine, version}`），模組本身不切詞。原型若要示範詞級匯出，只有兩條路：

- (a) 在 014 頁實作一套中文斷詞；
- (b) 在資料層種入若干「已切好的引擎結果」。

採 (b)。理由：(a) 會讓 014 成為第二個切詞權威，與 delta FR-020 第 1 點的界線精神相違，且斷詞品質不是 issue #742 要示範的東西；(b) 使 `tokenizer.engine` 與 `tokenizer.version` 成為真實的資料欄位而非硬編字串，正好能誠實呈現 `dataset/017` FR-042 第 1 點所要求的「可重現性靠的是引擎與版本被記錄下來」。

種入內容至少兩個引擎：一個具備完整 `engine` + `version`（供 AC-1.11 的成功路徑，其 token 邊界須刻意讓至少一筆 span 落在 token 內部以產生擴張），一個**刻意缺少 `version`**（供 AC-1.12 的阻擋路徑）。缺版本的引擎是資料，不是程式碼分支——阻擋與否交由模組回傳值決定。

### D4 為 T006 新增 `spans[]` 形狀的標註結果種子，不動 T010

`ANNOTATION_RESULTS_BY_TASK`（`:4305`）目前把 `T006`（`sequence_tagging`）與 `T010`（`entity_recognition`）同時指向 `AR_SAMPLES_NER`，而 `AR_SAMPLES_NER`（`:4225`）的標記值形狀為 `{ entities: [{ type, text }] }`，**不帶字元 offset**，模組無從消費。

新增一份 `spans[]` 形狀的樣本集合供 `T006` 使用，`T010` 維持指向 `AR_SAMPLES_NER`。這不只是資料整理：`dataset/017` FR-041 第 1 點明定 `entity_recognition` MUST NOT 套用本推導，兩者共用同一份種子等於在資料層就混淆了這條界線。新種子的文字與 offset 直接沿用 `design/prototype/pages/task-management/task-detail.data.js:333-374` 之 `T006` `datasetRecords` 已有的權威 `spans`，避免再造第三份資料。

### D5 呼叫端只判斷「阻擋與否」，不解讀阻擋原因字串

模組阻擋時回傳 `{ blocked: true, reason: '<英文訊息>' }`——**沒有 `tags`、也沒有 `expansions`**。呼叫端必須先檢查 `blocked` 再取其他欄位，否則會對 `undefined` 做陣列操作。

畫面顯示的原因文字取自頁面既有的 i18n 機制（新增鍵），不得把模組回傳的英文 `reason` 直接印到畫面上：該字串是給開發者看的診斷訊息，且畫面全站雙語。`reason` 的用途僅限開發期除錯。

### D6 對話框沿用 `modal-focus.js`，不自造焦點管理

頁面已載入 `design/prototype/pages/shared/modal-focus.js`（`:2226`）。新對話框依既有共用機制處理焦點鎖定與 Esc 關閉，不另寫一套。

### D7 模組載入方式：於 `task-detail.html` 既有 shared script 區塊新增一行 `<script>`

模組為 UMD 風格、掛 `global.LabelSuiteSpanTaggingExport`，與同目錄的 `sidebar.js`（`:2225`）／`modal-focus.js`（`:2226`）載入方式一致，於其後追加一行即可，無需建置步驟。

## 維護者裁決（2026-09-16 問答式定案，原「未決事項」）

1. **版本語意 → MINOR v3.2.0**。本 delta 最終**不修訂任何既有條文**：FR-015i-3 的適用邊界改由新條文 FR-020 第 6 點雙向言明（新條文自述不涵蓋 `entities[]`，並反向言明 FR-015i-3 不涵蓋 `spans[]`）。決定性證據是 `LEGACY_TASK_TYPE_EXPORT_ENUM`（正典 :44）不含 `sequence_tagging` —— `spans[]` 從來不在 FR-015i-3 的承諾範圍內，本版是補空白而非收縮語意。

   改採此承載方式的直接原因是機制而非語意：`openspec archive` 是把 delta 套用到 `openspec/specs/` 這份衍生檢視上，而衍生檢視只累積歷來 change 碰過的條文；FR-015i-3 從未進過 OpenSpec 流程，對它下 `## MODIFIED Requirements` 會在 archive 階段硬中止（`@fission-ai/openspec` v1.10.0 `dist/core/specs-apply.js:326` 丟出 `MODIFIED failed for header "### Requirement: ..." - not found`，且 `Aborted. No files were changed.`）。**`openspec validate` 偵測不到此缺陷**——它未 import `specs-apply.js`，該檢查只存在於 `archive.js` 呼叫鏈，故 gate 1 無論退出碼或 `N passed` 都不構成 archive 可行的證據。唯一可靠的前置驗法是把 `openspec/` 複製到暫存目錄後乾跑一次 `openspec archive <change> --yes`（本 delta 已實測：`+ 1 added`、archive 成功）。

2. **JSON-MIN 的 tokenizer 欄位命名 → 兩種格式皆保留巢狀**（見 D1）。

3. **`schema_version` → 升 `1.1.0`**（見 D2）。

4. **切詞引擎種子 → 使用真實套件名**：`ckip-transformers` / `0.3.4` 為具備完整版本資訊的引擎，驅動 AC-1.11 的成功路徑；`jieba` **刻意不提供 version 欄位**，驅動 AC-1.12 的阻擋路徑（jieba 現實中確實不暴露模型版本，此設定在語意上成立而非人為製造）。版本字串為原型佔位值，資料層須以註解標明，避免被誤讀為已完成的後端整合。

5. **T006 的 `spans[]` 種子 → 新增專屬種子，`AR_SAMPLES_NER` 維持不動**。`AR_SAMPLES_NER`（`task-detail.html:4225`）同時服務 T006（`sequence_tagging`，`task-detail.data.js:338`）與 T010（`entity_recognition`，同檔 :612），而其 `entities:[{type,text}]` 形狀對 T010 是**正確的**——遷移這個共用常數會反向弄壞 T010。根因是 issue #581 的 span 遷移只改了任務層，`annotation-results` 的展示種子從未跟著遷移；本 change 只補 T006 這一側，不承擔該遷移的其餘範圍。

   注意 `task-detail.data.js` T006 既有的權威 `spans[]`（英文樣本 `'The chairman of TSMC attended the forum in Taipei today.'`）與 `AR_SAMPLES_NER` 的中文樣本**不是同一份資料**，offset 不可直接搬用，只能沿用其形狀作為範式。

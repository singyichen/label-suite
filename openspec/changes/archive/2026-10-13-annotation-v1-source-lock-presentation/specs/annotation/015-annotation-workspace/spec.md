## MODIFIED Requirements

### Requirement: FR-101 標記員定稿鎖定

- **FR-101**（**v6.19.0 新增**，對應 AC-2.27，issue #908；**v10.0.0 修訂**，issue #1082；**v12.5.0 修訂**，對應 AC-2.27、AC-2.30，issue #1328）：**標記員定稿鎖定**。`official_run` 審核單位一旦依 FR-051 推導為 `已定稿`，且該推導成立之前提——受審標記員存在真實已儲存提交（FR-051 判定式首句：標記員未提交 → 不成立審核單位，推導為 `null`）——已滿足時，該標記員自身之後續寫入必須被鎖定，不得再變更已定稿之作答，亦不得使單位狀態翻回 `爭議中` 或 `待審`。**範圍限定**（**v12.5.0 修訂**，issue #1328）：上述「定稿終態鎖」僅適用 `official_run`；`dry_run` 因 `submissionBucketKey()` 無 round 維度，定稿終態鎖範圍不得涵蓋 `dry_run`，試標之後續回合不受影響。`dry_run` 不觸發定稿終態鎖，但仍受下述「V1 來源完整性鎖」約束（Dry／Official 同樣適用）。**觸發條件（不得誤觸的邊界）**：本條不得對僅由 FR-044a 示範標記員答案遞補、標記員本人尚無任何真實儲存提交的審核單位觸發鎖定。此類單位之 `getReviewUnitStatus()` 依 FR-051 判定式首句恆推導為 `null`，不成立「已定稿」狀態，本條鎖定天然不觸發；標記員本人之首次提交必須正常送出，不得因該單位已有示範列遞補或既有審核員決策而顯示定稿鎖定提示。本條鎖定判定必須沿用（或等價於）`getReviewUnitStatus()` 既有之判定式，使「存在真實已提交紀錄」這項前提結構性地成立，不得另立第二套不要求真實提交存在的判定捷徑（例如直接查詢審核決策記錄或 `REVIEWER_MOCK_ROWS` 遞補列本身是否存在）。**寫入側守衛**：`markSampleSubmitted()`、`markSampleSaved()`、`appendSampleTimelineEvent()`（`annotation-workspace.data.js`）三個標記員寫入點，於執行寫入前，當呼叫之 `role` 為 `annotator` 時，必須先以寫入前（pre-write）狀態呼叫上述判定；判定為 `已定稿` 時，必須直接回傳 `false`、不得寫入任何欄位、不得追加任何歷程事件，既有 bucket 內容維持原狀；未鎖定時必須回傳 `true` 並維持既有寫入行為不變。判定所需之 outKeys 必須由 `resolveTaskProfile(taskId).outputs`（`annotation-workspace.data.js:51`）內部推導取得，三個函式之既有簽章不得因本條新增參數。審核員或仲裁者之寫入路徑不屬本條範圍（FR-094、AC-3.39 已規範），不受本條三個函式之守衛約束於其 `role` 非 `annotator` 之呼叫。標記員自身促成單位轉為已定稿的那一筆提交，因寫入前狀態尚未轉為已定稿，必須正常寫入、不被本條擋下。**呈現**：鎖定生效時，畫面必須渲染鎖定提示（testid `ws-annotator-finalized-notice`），文案為「此標記結果已定稿，無法再修改或提交」（en: "This annotation is finalized and can no longer be edited or submitted."）；視覺必須沿用 FR-094 唯讀卡之語言慣例，但色階必須採資訊色（`--color-info`／`--color-info-bg`／`--color-info-border`），不得沿用 FR-094 之錯誤色，亦不得採 warning 色階——定稿是終態，不是錯誤也不是提醒（**v12.5.0 修訂**，issue #1328：AC-2.27 v12.1.2 原稱「warning 語氣」，與本句矛盾，以本句為準，AC-2.27 已更正為資訊色）。鎖定提示 `ws-annotator-finalized-notice` 必須帶 `data-lock-reason` 屬性標示鎖定原因，定稿終態鎖為 `finalized`。作答控制與**儲存草稿／提交**兩個既有控件（`wsSaveBtn`、`wsSubmitBtn`；**v10.0.0 修訂**，issue #1082：原列舉三個既有控件含 `wsSkipBtn`，該控件隨跳過功能整組移除，本點改為兩個既有控件）必須保留在畫面上並套用原生 `disabled` 屬性與 `aria-disabled="true"`，不得自 DOM 移除或隱藏，不得以非原生互動元素（例如 `div`）取代原生控件；兩者既有觸控高度不得因本條縮減。定稿當下已選定之作答必須維持可辨識，不得使已選與未選選項套用相同的視覺結果（例如整排轉灰致無法分辨曾選定何值）。自動儲存狀態列（`ws-autosave-status`）鎖定生效時必須改顯示「已定稿，不再自動儲存」（en: "Finalized — autosave stopped."），不得沿用鎖定前之 INITIAL／DIRTY／SAVED 三態文案。**不引入定稿快照**：本條判定必須沿用 FR-072(3) 既有之讀取時計算、不快取原則，不得引入任何持久化之定稿快照欄位。**不提供解鎖入口**：本條不得新增任何一般解鎖操作；重啟流程（FR-016A 審計理由）延後至後端階段，原型不提供任何解鎖入口。 **V1 來源完整性鎖**：除了既有 Official finalized 終態鎖，第一次 reviewer 正式提交後，同一 `run_id × assignment_id` 的 annotator 儲存與提交皆拒絕；Dry／Official 同樣適用，不同 Dry run 不互鎖。與首次審核競爭時序列化同一 assignment，僅先提交者成功，另一方回衝突。**審核中鎖之標記員呈現**（**v12.5.0 新增**、AC-2.30，issue #1328）：V1 來源完整性鎖生效、但該單位尚未依 FR-051 推導為 `已定稿` 時（Dry／Official 皆可能發生），標記員重新開啟該單位，畫面必須沿用同一鎖定提示 testid `ws-annotator-finalized-notice`，並帶 `data-lock-reason="under_review"`；標題為「此標記已進入審核」（en: "This annotation is under review."），說明為「審核員已開始處理這筆作答，內容已鎖定，無法再修改或提交。」（en: "A reviewer has started working on this answer. The content is locked and can no longer be edited or submitted."）；色階必須採提醒色（`--color-warning`／`--color-warning-bg`／`--color-warning-border`），與定稿終態的資訊色區隔；`wsSaveBtn`、`wsSubmitBtn` 與作答區控件之禁用與視覺處理同 AC-2.27 視覺層；自動儲存狀態列（`ws-autosave-status`）必須顯示「審核中，不再自動儲存」（en: "Under review — autosave stopped."）。本呈現**不得**透露爭議中、等待仲裁、最終例外池，或任何審核員決策內容（決策類型、理由、審核員身分），以符合 Data Fairness。兩種鎖同時成立時（例如 `official_run` 已定稿），必須顯示定稿終態呈現（`data-lock-reason="finalized"`、「已定稿，不再自動儲存」），不得顯示審核中呈現。

#### Scenario: 標記與首次審核競爭

- **GIVEN** 同一 run／assignment 的有效當事者與目前來源
- **WHEN** 依 FR-101 進行讀寫或推導
- **THEN** 身分、版本、授權、原子性與不可變邊界須符合上述完整條文

#### Scenario: AC-2.27 已定稿單位鎖定標記員寫入，示範列 seed 單位不觸發鎖定
- **GIVEN** 一個 `official_run` 審核單位已有標記員之真實已儲存提交且依 FR-051 推導為 `已定稿`
- **WHEN** 該標記員以 annotator 身分重新開啟該單位之工作區
- **THEN** 畫面 MUST 渲染鎖定提示 `ws-annotator-finalized-notice`，`wsSaveBtn`、`wsSubmitBtn` 兩者皆帶 `disabled` 屬性與 `aria-disabled="true"`，且皆仍存在於 DOM 中（**v10.0.0 修訂**：不再列舉 `wsSkipBtn`，該控件已隨跳過功能整組移除，不存在於 DOM）
- **AND** 嘗試以既有 `Ctrl/Cmd+S`（儲存）或 `Ctrl/Cmd+Enter`（提交）快捷鍵，皆 MUST NOT 改變該單位之儲存內容或狀態
- **AND** 自動儲存狀態列 MUST 顯示「已定稿，不再自動儲存」
- **AND** 該單位狀態於前後兩次讀取皆 MUST 維持 `已定稿`，MUST NOT 因上述任何嘗試翻回 `爭議中` 或 `待審`
- **AND**〔示範列 seed 豁免〕**GIVEN** 另一個 `official_run` 審核單位僅由 FR-044a 示範標記員答案遞補構成一筆審核員已核可決策，該樣本對應之標記員本人尚無任何真實儲存提交，**WHEN** 該標記員以 annotator 身分首次開啟並提交該單位，**THEN** 提交前畫面 MUST NOT 渲染 `ws-annotator-finalized-notice`，兩個控件皆 MUST NOT 帶 `disabled` 或 `aria-disabled`；**AND** 該次提交 MUST 正常寫入成功（`markSampleSubmitted()` 回傳 `true`），MUST NOT 被本條鎖定機制阻擋
- **AND**〔視覺呈現，v12.1.2 澄清，v12.5.0 更正色階，issue #1328〕鎖定提示 MUST 以資訊語氣呈現（採 `--color-info`／`--color-info-bg`／`--color-info-border`，含鎖頭圖示，標題「此標記結果已定稿」與說明兩行）並帶 `data-lock-reason="finalized"`，MUST NOT 採 warning 色階（v12.1.2 原稱「warning 語氣」已更正）
- **AND**〔dry_run 不觸發定稿終態鎖，v12.5.0 修訂，issue #1328〕同一組資料以 `dry_run` 開啟時，Dry 不觸發定稿終態鎖，但仍受 V1 來源完整性鎖約束（審核員第一次正式提交後，同一 `run_id × assignment_id` 的標記員儲存與提交皆 MUST 被拒絕）；不同 Dry run 互不影響

#### Scenario: 審核中鎖之標記員呈現不透露審核內容
- **GIVEN** 某 `run_id × assignment_id` 已有審核員第一次正式提交（V1 來源完整性鎖生效），且該審核單位尚未依 FR-051 推導為 `已定稿`（`official_run` 或 `dry_run` 皆可）
- **WHEN** 該標記員以 annotator 身分重新開啟該單位之工作區
- **THEN** 畫面 MUST 渲染 `ws-annotator-finalized-notice` 且帶 `data-lock-reason="under_review"`，標題 MUST 為「此標記已進入審核」（en: "This annotation is under review."），說明 MUST 為「審核員已開始處理這筆作答，內容已鎖定，無法再修改或提交。」（en: "A reviewer has started working on this answer. The content is locked and can no longer be edited or submitted."）
- **AND** 提示色階 MUST 採提醒色（`--color-warning`／`--color-warning-bg`／`--color-warning-border`）並含鎖頭圖示
- **AND** `wsSaveBtn`、`wsSubmitBtn` 皆帶 `disabled` 屬性與 `aria-disabled="true"` 且仍存在於 DOM，控件與作答區之視覺處理同 AC-2.27 視覺層；`ws-autosave-status` MUST 顯示「審核中，不再自動儲存」（en: "Under review — autosave stopped."）
- **AND** 嘗試儲存、提交或使用 `Ctrl/Cmd+S`、`Ctrl/Cmd+Enter` 皆 MUST NOT 改變該單位之儲存內容
- **AND** 畫面 MUST NOT 出現「爭議中」、「等待仲裁」、「例外池」字樣，亦 MUST NOT 呈現審核員之決策類型、理由或身分（Data Fairness）
- **AND**〔兩鎖同時成立〕`official_run` 單位已定稿時，提示 MUST 帶 `data-lock-reason="finalized"` 並顯示定稿終態呈現與「已定稿，不再自動儲存」，MUST NOT 顯示審核中文案
- **AND**〔不同 Dry run 互不影響〕另一個 `dry_run` 的同一標記員作答，MUST NOT 因本單位之審核中鎖而顯示提示或被阻擋

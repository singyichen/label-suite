# 設計決策：task-detail-export-history-redownload（issue #772）

> 本文件存在的理由：issue #772 表面上是「把一顆沒綁行為的按鈕接上」，但維護者要求的是**逐字元相同**，而現行匯出程式碼有五處會讓「照快照重跑一次」得到不同的檔案。這五處不是實作細節，而是決定快照要多存什麼、重建路徑要怎麼走的設計約束，必須在 apply 前定案。

## 背景：現行匯出路徑中會破壞重現性的五個事實

以下行號皆指 `design/prototype/pages/task-management/task-detail.html`（`origin/main` `184ab1cb`）。

1. **按鈕沒有行為**。`renderArExportHistory()`（:9642）建立 `dlBtn` 後只設定 class、type 與文字（:9677–9681），沒有任何 click handler。快照目前只有寫入端（`performArExport()`，:9461），沒有讀取端。
2. **樣本篩選讀的是即時畫面狀態，而且快照少存兩個篩選**。`getArFilteredSamples()`（:8790）依 `state.arStage`、`state.arStatus`、`state.arAnnotator`、`state.arReviewer`、`state.arReviewStatus` 五個值過濾；`performArExport()` 的 `conditionsSnapshot` 只存了前三個。`performArExport()` 自己判斷匯出類型時卻有讀這五個值——快照與結果集合的實際決定因素不一致。
3. **匯出內容組裝函式直接讀即時狀態**。`buildJsonExportPayload()`（:9321）的 `run_stage`、`applied_filters`、`sample_snapshot_id`、`excluded_annotation_assignments` 讀 `state.arStage` 等即時值；`buildJsonMinExportPayload()`（:9389）同理。換言之，就算把快照值傳進去，函式內部仍會讀畫面。
4. **時間、匯出人與語言每次重算**。`buildJsonExportPayload()` 以 `new Date()` 取 `exported_at`、以 `getExportedByName()` 取 `exported_by`；`downloadArExport()`（:9440）**再呼叫一次** `new Date()` 組檔名——同一次匯出內 metadata 時間與檔名時間是兩個值，跨秒邊界時就不同。兩種格式的 `task_name` 皆依 `state.lang` 取中文或英文名稱。
5. **既有種子紀錄沒有快照**。`TASK_DATA.exportHistory` 的三筆種子（:3432–3434）皆不帶 `conditionsSnapshot`，是 FR-010i-2 寫入端落地前形狀的紀錄；而新紀錄只存在於當次 session 記憶體。

另有一個不構成缺口、但會限制實作形狀的既有約束：issue #742 的原始碼掃描護欄斷言 `deriveSequence(` 在頁面內**恰好出現一次**（SC-045）。重新下載若另寫一份序列組裝，該護欄會直接轉紅。

## 決策

### D1 條件來源參數化：同一組組裝函式，條件由呼叫端傳入

把現行「組裝函式內部讀 `state.*`」改為「呼叫端先產出一個條件物件，組裝函式只讀這個物件」。匯出按鈕路徑從畫面狀態建立條件物件，重新下載路徑直接使用快照。兩條路徑共用 `getArFilteredSamples`、`buildJsonExportPayload`、`buildJsonMinExportPayload`、`buildTaskSpecificExportFields` 同一組函式。

**不採用的替代方案**：
- **快取原始檔案字串**：最簡單、天然逐字元相同，但維護者裁定明文為「依快照重建」，且快取在真實產品等同於保存完整匯出檔，與 FR-010i-2「保存條件快照」的設計意圖不同。
- **重新下載前暫時把快照值寫進 `state` 再還原**：程式碼少，但任何例外都會讓畫面篩選停在錯誤狀態，且違反 FR-021 第 1 點「重新下載不得回寫篩選」的精神；以 D1 的顯式參數取代隱式全域狀態，才能被 Red 契約穩定鎖住。

### D2 快照補存五個值

在 `performArExport()` 的快照中補存：審核員篩選、審核狀態篩選、完整精度的 `exported_at`、`exported_by`、介面語言。FR-010i-2 列舉的 `scope_label` 與 `export_type` 目前以 `scope` 與 `exportType` 存在紀錄本體而非快照內，兩者只影響記錄表顯示、不影響檔案內容；本 change 不搬動它們，以免擴大 diff（見未決事項 Q6）。

同一次匯出只取一次時間：`exported_at` 在條件物件建立時決定，metadata 與檔名都讀它（修正背景第 4 點的雙時間來源）。

### D3 必要欄位檢查只做「有沒有」，不做「補預設」

「下載」可用與否由快照是否具備 D2 與 FR-010i-2 的全部必要欄位決定；`sequence_tagging` 任務另需 `tagging_scheme` 與 `token_unit`。缺任一項即停用並附說明，**不**以 `BIO`／`character` 或當前畫面補齊——補出來的檔案不會等於原檔，等同對使用者謊稱「這是你當時匯出的東西」。

### D4 切詞引擎可用性交由共用模組判斷

重新下載 `word` 單位的紀錄時，頁面以快照的 `tokenizer_engine` 查找切詞引擎種子並交給 `deriveSequence()`；引擎已不存在或缺版本時，模組回傳阻擋結果，頁面只依回傳值顯示中文原因。這與 #742 design.md D5「呼叫端只判斷阻擋與否」一致，也維持 SC-045 的單一入口。

### D5 重新下載不寫入累加器畫面、不渲染擴張摘要

`state.arSeqExportRun` 是對話框當次匯出的擴張累加器。重新下載仍需它來取得 manifest 的 `tokenizer`／`alignment_mode`／`expanded_span_count`（否則 metadata 不同），但**不**把結果渲染成擴張摘要，也不在重新下載結束後殘留讓對話框下次開啟時誤顯示的狀態。

### D6 產品檔案範圍：只動 `task-detail.html`

條件參數化、快照補存、按鈕綁定、停用與阻擋提示、i18n 鍵皆在同一檔。`task-detail.data.js` 與 `annotation-results.html` 不需改動：停用說明以按鈕屬性承載，阻擋原因沿用既有 toast 機制。預估 diff 150–220 行，單一 PR 可交付；若實作後超過 300 行，比照 #742 先例把純重構（D1）移到 Red 之前另成一個 PR。

## 維護者定案（2026-09-17）

Q1–Q7 全數採用下列「建議」，delta 無須修改即可 apply：Q1 阻擋並顯示中文原因、不產檔；Q2 停用「下載」並附中文說明；Q3 檔名與原檔完全相同；Q4 `exported_at`／`exported_by` 沿用原始值；Q5 全部任務類型與兩種格式皆須逐字元相同；Q6 `scope_label`／`export_type` 本次不搬進快照；Q7 反映重新下載當下之資料。

## 原未決事項（保留為決策紀錄）

**Q1 快照記錄的切詞引擎在重新下載當下已不可用時怎麼辦？**
建議：阻擋、顯示中文原因、不產檔（已寫入 FR-021 第 6 點與 AC-1.16）。替代：退回字元級重建——但檔案會與原檔不同，違反維護者「逐字元相同」的裁定，不建議。

**Q2 #742／#772 之前留下、缺快照或缺新欄位的紀錄怎麼辦？**
建議：「下載」停用並附中文說明（FR-021 第 6 點、D3）。替代 A：隱藏按鈕——使用者看不出為何這列不能下載。替代 B：以當前畫面或預設值補齊——產出的不是原檔，不建議。

**Q3 重新下載的檔名？**
建議：與原始檔名完全相同（沿用快照的 `exported_at` 組檔名，FR-021 第 4 點）。替代：加上 `-redownload-<現在時間>` 後綴以區分——但檔名不同會讓「逐字元相同」只剩內容層級，且使用者重複下載會產生多份看似不同的檔案。

**Q4 manifest 的 `exported_at` 與 `exported_by` 用原始值還是重新下載當下的值？**
建議：原始值（FR-021 第 3 點）。改用當下值會讓每次重新下載的 JSON 檔都不同，直接違反逐字元相同。

**Q5 逐字元相同只要求 `sequence_tagging`，還是所有任務類型？**
維護者裁定明文只點名 `sequence_tagging`。建議：擴及所有任務類型與兩種格式（FR-021 第 4 點、AC-1.15）——D1 的共用路徑讓非序列任務零額外成本達成，且 FR-010i-2 本就要求「以快照為唯一依據」，只保證序列任務反而會留下「非序列任務可以不同」的誤讀空間。

**Q6 FR-010i-2 列舉的 `scope_label`、`export_type` 要不要搬進快照物件？**
建議：本 change 不搬（D2）。兩者已存在紀錄本體，不影響檔案內容；搬動屬資料形狀整理，與 #772 的目的無關。若維護者認為 FR-010i-2 字面要求它們必須在快照內，另開 issue 處理。

**Q7 標記結果在匯出之後被修改（例如新提交、審核決定變更），重新下載要反映哪一版？**
建議：反映當下資料，逐字元相同只在「標記結果與切詞引擎資料皆未變動」的前提下保證（FR-021 第 4 點前提句，與 `dataset/017` AC-5.2 的前提寫法一致）。真正凍結資料版本需要 FR-010i-2 所提的 sample snapshot／dataset version 機制，原型目前以 `getExportSampleSnapshotId()` 推導而非保存，屬後端範圍，不在本 change 處理。

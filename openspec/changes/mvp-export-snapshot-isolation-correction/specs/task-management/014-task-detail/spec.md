> 正典：`specs/task-management/014-task-detail/spec.md`（v8.0.0 → v8.0.1，PATCH）。本 delta 修訂 FR-010b／FR-010c／FR-010i-1／FR-010i-2／FR-021 與 SC-005 的既有語意；保留原有安全、版本追溯與驗收情境。僅為規劃契約，沒有部署 ORM、migration 或 API。

## MODIFIED Requirements

### Requirement: FR-010b task/run 身分契約

- **FR-010b**（**v8.0.1 釐清**，issue #1160）：系統必須提供「資料隔離」開關，預設為啟用；啟用時 Dry/Official 資料與結果不得混用。同一次匯出可明確選取 Dry Run 與 Official Run 並同檔封裝，即使 `isolation_enabled = true` 也不需關閉隔離；每個 run 的資料與結果不得混入其他 run，不得跨 run 合併、聚合或去重，每筆結果保留來源 `run_id` 與 `run_stage`。不論 `isolation_enabled` 為何，同一 cycle 的任兩個已發布 Dry／Official run 之 item ID 清單皆不得重疊；關聯成員資料須以 `(cycle_id, dataset_item_id)` 唯一性約束保障，不得僅依 UI 或查詢篩選。

#### Scenario: FR-010b 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010b；AC-3.41）

#### Scenario: 隔離開啟時的明確混合匯出

- **GIVEN** `isolation_enabled = true` 且同一任務已有 Dry Run 與 Official Run
- **WHEN** 有權限者明確選取兩個 run 建立同一次匯出
- **THEN** 同一原檔可依選取順序封裝兩個 run，但每個 run 的結果不得混入其他 run
- **AND** 每列保留 `run_id` 與 `run_stage`，不得跨 run 合併、聚合或去重

### Requirement: FR-010c task/run 身分契約

- **FR-010c**（**v8.0.1 釐清**，issue #1160）：當使用者停用資料隔離時，系統必須顯示高風險警告、要求二次確認，並記錄審計資訊（操作者、時間、設定值）。停用僅改變跨階段結果隔離保證及其 metadata，不放寬 FR-010b 的 item 不重疊限制，也不自動建立混合結果查詢或匯出動作；既有按階段選取的操作維持原語意。使用者依 FR-009a 的同一次匯出可明確選取 Dry Run 與 Official Run，並在 `isolation_enabled` 為 `true` 時封裝兩階段，每個 run 的結果仍分開且保留來源身分，無須停用隔離或啟動其他混合結果查詢。

#### Scenario: FR-010c 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010c；AC-3.41）

#### Scenario: 混合封裝不要求關閉隔離

- **GIVEN** `isolation_enabled = true` 且使用者選取 Dry Run 與 Official Run
- **WHEN** 建立 FR-009a 所定的同一次匯出
- **THEN** 不需停用隔離；兩階段只共用原檔容器，逐 run 結果和身分仍分離
- **AND** 若使用者另行停用隔離，仍須高風險警告、二次確認與審計，不得因此自動建立混合查詢

### Requirement: FR-010i-1 task/run 身分契約

- **FR-010i-1**（**v8.0.1 釐清**，issue #1160）：所有匯出檔的 `manifest` 必須包含 `export_format`、`export_format_version`、`exported_at`、`exported_by`、`applied_filters`，以及有序的 `manifest.runs[]`。`exported_at` 為首次成功原檔實際採用的結果讀取快照時間，須與原始檔名中的匯出時間一致，不得投影為請求接受時間 `requested_at`；零筆結果亦依同一讀取快照決定。每個 run 項目須記錄其 `run_stage`、`run_id`、`cycle_id`、`dataset_version_id`、`config_version_id`、`schema_version`（由該 run 的 cycle 所釘住 config 版本的 `schema_version_no` 取得）、`guideline_version_id`、`sample_snapshot_id`，並保留 FR-010i 的階段、隔離、抽樣、IAA 與排除摘要。跨 run 匯出須逐 run 記錄，不能用單一版本欄或任務目前版本取代；零筆結果仍須提供完整 manifest；每筆一般匯出結果亦須保留來源 `run_id` 與 `run_stage`，不可只有頂層階段標籤。

#### Scenario: AC-1.15 多 run 與零筆結果仍可追溯

- **GIVEN** 一次匯出納入兩個版本不同的 run
- **WHEN** 原始檔案生成，即使結果列為零筆
- **THEN** `manifest.runs[]` 依順序列出各 run 七項釘住的身分，並有格式版本與請求人

#### Scenario: FR-010i-1 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-010i-1；AC-3.43）

#### Scenario: manifest 與檔名使用實際讀取快照時間

- **GIVEN** 匯出請求已接受，worker 稍後才讀取結果
- **WHEN** 產生可下載的原始檔案與檔名
- **THEN** `manifest.exported_at` 與檔名均使用該原檔實際採用的結果讀取快照時間，不以 `requested_at` 冒充

### Requirement: FR-010i-2 task/run 身分契約

- **FR-010i-2**（**v8.0.1 釐清**，issue #1160）：每筆匯出歷史代表一次請求與一份不可變原始檔案。`requested_at` 在請求獲接受時固定為完整精度 UTC 時間；已驗證且版本化的 `conditions_snapshot` 於接受請求時保存並保持不可變，供審計與重製驗證，不含稍後才決定的 `exported_at`，也不能作為重新下載時查詢目前結果的指令。`conditions_snapshot` 的共通條件包含 `export_format`、`export_format_version`、`submission_status`、`annotator_scope`、審核員／審核狀態及其他已驗證的共享 filters、請求指定的語言與序列／tokenizer 選項、原請求人 `exported_by`；另以有序 `selected_runs[]` 逐項保存 `run_id`、`selected_runs[].run_stage`、`cycle_id`、`dataset_version_id`、`config_version_id`、`schema_version`、`guideline_version_id`、`sample_snapshot_id`。混合試標與正式標記的快照頂層 `run_stage` 僅可為 `all`，不可冒稱單一階段；單階段可記其階段值。每個 run 的納入關聯及輸出順序須獨立保存，對應 FR-010i-1 的 `manifest.runs[]`；每筆結果亦須有來源 `run_id` 與 `run_stage`，不能從頂層階段倒推。`task_export.exported_at` 為獨立可空欄位；`exported_at` 在結果讀取快照產生時記錄該快照的完整精度 UTC 時間，於 `ready` 前可為 null，並須與原始位元組、原檔名及校驗資訊在原子 `ready` 轉換中一同固定；manifest 與檔名均使用實際 `exported_at`。尚未 `ready` 的 worker 重試可讀取較晚的結果快照並重新產生原檔，但不得改寫已接受的 `conditions_snapshot` 或 `requested_at`；`ready` 後的冪等重試只回傳原始產物與同一歷史列，不得重新讀取結果。`scope_label` 與 `export_type` 僅為歷史列顯示 metadata，另存且不參與產物完整性校驗；重新下載不得套用當前畫面 filter，也不得以目前版本冒充歷史內容（FR-021）。

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

#### Scenario: 接受條件與結果時間分開固定

- **GIVEN** 請求已接受並記下 `requested_at`、不可變 `conditions_snapshot`，此時 `exported_at` 為 null
- **WHEN** worker 取得一致的結果讀取快照並完成原始位元組與校驗
- **THEN** `exported_at` 記為該結果快照時間，與檔名及產物資訊在原子 `ready` 轉換固定
- **AND** 接受時的 `conditions_snapshot` 不含 `exported_at`，重試不得改寫它或 `requested_at`

#### Scenario: 未完成與已完成匯出的重試分界

- **GIVEN** 同一已授權請求因 worker 失敗或冪等重送而重試
- **WHEN** 原列尚未 `ready`
- **THEN** worker 可讀取較晚的結果快照並重新產檔，仍只使用同一歷史列
- **AND** 原列已 `ready` 時只回傳既有原始位元組、檔名與 `exported_at`，不得重新查詢結果

### Requirement: FR-021 歷史重新下載原始位元組

- **FR-021**（**v8.0.1 釐清**，對應 AC-1.14～AC-1.16、SC-046，issue #1160）：匯出歷史列的「下載」須提供首次匯出原子保存的不可變原始檔案位元組與原始檔名，不得以該列條件快照重新查詢或重算目前結果，也不得重新呼叫切詞引擎。(1) **建立與保存**：首次匯出通過資料完整性及答案隔離驗證後，保存原始產物、檔名、SHA-256、位元組數及受限物件參照；歷史列記錄原請求人、請求接受時間 `requested_at`，以及首次成功原檔的結果讀取快照時間 `exported_at`；兩個時間各有不同用途。原檔 manifest 與檔名均使用實際 `exported_at`，其與原檔資料在原子 `ready` 轉換中固定。條件快照用於審計／重製驗證，不作為重新下載資料來源；後續標記或審核變更不影響既有原檔。(2) **目前授權**：每次下載都重新檢查 `dataset.export` 的當前 active membership 與當前 task 範圍，並遵守 FR-024 的角色、資料可見性與答案隔離；歷史請求人身分不構成授權。不得讀取或覆寫目前頁面篩選及對話框選項，也不得開啟對話框。(3) **可下載條件**：產物完成並處於 `ready`、來源及任務有效、未到期且未撤銷、受限物件存在並通過 SHA-256 驗證時才提供原始位元組；到期須拒絕下載，撤銷須拒絕下載，來源刪除或 SHA-256 不符亦須拒絕下載。拒絕時提供可理解的繁體中文原因，內部物件儲存路徑不得回傳，私有答案亦不得暴露。(4) **同一歷史列**：尚未 `ready` 的 worker 重試可對較晚的結果快照重新產檔，並依 FR-010i-2 固定該次的 `exported_at`；`ready` 後重試只回傳原始產物與同一歷史列。重新下載不得新增匯出記錄，不改變歷史列內容或排序，不產生新檔案、不重新序列化，也不顯示當次匯出對話框的對齊擴張摘要。原始檔名與首次下載相同；對所有任務類型和 `EXPORT_FORMATS` 適用，即使標記或審核後續修改、畫面語言改變或原切詞引擎停用，仍交付相同位元組。(5) **保留與舊版**：原始產物保存 30 日，匯出歷史 metadata 保存一年；期限屆滿或撤銷立即停止下載，歷史列可顯示「已過期」但不得延長原產物期限。只有條件快照、缺少有效原始產物的舊版列不得由目前結果重建，須停用下載並說明原因；有效的舊版原檔仍按其原格式位元組下載，不升版改寫。(6) **切詞邊界**：新建 `word` 匯出仍須由 FR-020 驗證 `tokenizer.engine`／`tokenizer.version`；有效的原始產物重新下載不需切詞引擎，不因引擎之後不可用而失敗。

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

#### Scenario: 背景重試與歷史下載保持原檔時間

- **GIVEN** 請求接受時間與 worker 的結果讀取快照時間不同
- **WHEN** worker 首次將完整產物設為 `ready`，其後使用者重新下載或同鍵重試
- **THEN** 原始位元組、檔名與 `exported_at` 共同固定，歷史下載及 `ready` 重試交付完全相同的原檔
- **AND** 不以 `requested_at` 重建檔案、查詢目前結果或延長既有產物期限

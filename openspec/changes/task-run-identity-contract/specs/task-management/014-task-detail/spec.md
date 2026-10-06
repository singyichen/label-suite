> 正典：`specs/task-management/014-task-detail/spec.md` v6.0.0；本 delta 僅鏡射 issue #1160 改動的 FR／AC／SC 原文。`ADDED` 表示此條首次進入 OpenSpec 衍生 view，不表示正典條款皆為新編號。下列資料模型仍屬候選規劃，未建立 ORM、migration 或 API。

## ADDED Requirements

### Requirement: FR-005h task/run 身分契約

- **FR-005h**：`project_leader` 明確排除未指派標記作業時，系統必須保存排除者、排除時間、排除原因、run stage 與原作業識別資訊；被排除作業不得計入完成率或標記分布統計，Dry Run 排除作業亦不得計入 IAA。 V1 排除為穩定 `assignment_id` 的終局事件，每個 slot 最多一筆不可刪除／撤回的證據；退回 draft 不清除此證據，未指派不等於排除。日後修正須另訂補償流程。

#### Scenario: FR-005h 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-005h；AC-3.44）

### Requirement: FR-010b task/run 身分契約

- **FR-010b**：系統必須提供「資料隔離」開關，預設為啟用；啟用時 Dry/Official 資料與結果不得混用。不論 `isolation_enabled` 為何，同一 cycle 的任兩個已發布 Dry／Official run 之 item ID 清單皆不得重疊；關聯成員資料須以 `(cycle_id, dataset_item_id)` 唯一性約束保障，不得僅依 UI 或查詢篩選。

#### Scenario: FR-010b 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010b；AC-3.41）

### Requirement: FR-010c task/run 身分契約

- **FR-010c**：當使用者停用資料隔離時，系統必須顯示高風險警告、要求二次確認，並記錄審計資訊（操作者、時間、設定值）。停用僅改變跨階段結果隔離保證及其 metadata，不放寬 FR-010b 的 item 不重疊限制，也不自動建立混合結果查詢或匯出動作；既有按階段選取的操作維持原語意。

#### Scenario: FR-010c 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010c；AC-3.41）

### Requirement: FR-010d task/run 身分契約

- **FR-010d**：試標抽樣輸入必須為整數且 `1 <= sampling_value < dataset_total`；`dataset_total` 為所綁定 sealed dataset version 中已接受 `dataset_item` 數，由 `dataset_item → dataset_import_batch → dataset_version` 追溯（dataset-021 FR-004／FR-008／FR-010），不得使用可變資料集、來源列數或其他版本總數。cycle 開啟後固定使用該 cycle 版本。每次 Dry 發布還必須驗證 `1 <= requested_sampling_value <= dataset_total - sum(本 cycle 已發布 Dry run 的實際 item_count) - 1`；不符時整次拒絕並提示剩餘可用筆數，不得縮減要求筆數後發布。

#### Scenario: FR-010d 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010d；AC-3.41）

### Requirement: FR-010e task/run 身分契約

- **FR-010e**：每次試標發布均須依 FR-010d 的累計上限保留 Official Run 至少 1 筆；R1 無既有回合時等價於 `sampling_value < dataset_total`，Rn 不得耗盡正式池最後一項。assignment 排除不會把已發布 Dry item 退回正式池。

#### Scenario: FR-010e 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010e；AC-3.41）

### Requirement: FR-010f task/run 身分契約

- **FR-010f**（**v6.0.0 修訂，BREAKING**，issue #1160）：首次 Dry 發布開啟不可變身分的 `RunCycle`，釘住同任務 sealed `dataset_version_id`、不可變 `config_version_id`（含 schema）、資格池、seed 與演算法版本。資格池為該版本全部已接受 item；抽樣只讀公開 item 身分與 payload，不讀 `dataset_item_private`、`declared_split`、hidden answer 或受限 `source_ref`，亦不得在 run item／manifest 中加入 gold/test 標記。每次 Dry 或 Official 發布各自建立一份不可變 `sample_snapshot_id`，只凍結該次 run 的有序 item 清單、seed／演算法與 digest；R1 不預先封存 Official 清單，發布前的剩餘池只是推導值。關聯 run-item 清單為成員身分正典，外部 `selection_manifest_ref` 為相同清單的審計回執，digest 必須一致。

#### Scenario: FR-010f 對應 AC-3.45

- **GIVEN** item 的 private row 含 hidden answer 或 declared_split
- **WHEN** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料
- **THEN** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。（FR-010f；AC-3.45）

### Requirement: FR-010f-2 task/run 身分契約

- **FR-010f-2**：每次 `新增試標回合 R{n}` 成功時，系統必須建立該回合獨立的試標清單，筆數等於 `sampling_value`，且不得重用前一回合已建立的清單資料；系統必須同時建立對應 `TrialRound` 紀錄並寫入建立當下的 `TaskGuidelineConfig.guideline_version`。`n >= 2` 時，建立前必須先通過 FR-017 之修訂紀錄必填檢查（`prior_round_findings`、`guideline_change_summary`，含 `no_change` 選項與其必填 `no_change_reason`）；`n = 1` 兩欄皆非必填。清單建立完成後，`TrialRound.sampling_value` 必須等於本回合實際建立的 `AnnotationListMaterialization.item_count`——`sampling_value` 之百分比或既有預設值換算僅作為建立前輸入框的預填建議，一經建立即以實際建立筆數為準，系統不得於畫面回退顯示與實際清單筆數脫節的衍生值（issue #491／#489）。 每輪具有穩定 `trial_round_id`，`(cycle_id, round_no)` 唯一且只發布一次；Dry run 必須有同 cycle round，以複合參照釘住與 round 相同的非空同任務 `guideline_version_id`。抽樣排除本 cycle 全部先前 Dry item，依 FR-010d 累計上限精確建立要求筆數；新 cycle R1 可選中舊 cycle item，但不能共用 run／snapshot。

#### Scenario: FR-010f-2 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010f-2；AC-3.41）

### Requirement: FR-010f-3 task/run 身分契約

- **FR-010f-3**：`開始正式標記` 成功時，以本 cycle 的 sealed version 扣除本 cycle 全部已發布 Dry run item 清單後的剩餘樣本，建立 Official run 及其專屬不可變 snapshot；筆數等於 `dataset_total - sum(本 cycle 已發布 Dry run 的實際 item_count)` 且必須大於 0，不扣除舊 cycle 的 item。Official 的 `trial_round_id` 必須為空，並在發布交易中釘住當下同任務的非空 `guideline_version_id`；該版本可不同於最後一輪 Dry 指引。每個 task 生命週期最多一筆 Official run，不能因 cycle 改變而再發布；重試依 FR-010f-6 回傳原發布。

#### Scenario: FR-010f-3 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010f-3；AC-3.41）

### Requirement: FR-010f-4 task/run 身分契約

- **FR-010f-4**：`開始正式標記` 建立正式標記清單時，系統必須同時以輪流分派（round-robin）建立樣本-標記員 assignment：每筆正式標記樣本恰指派給一位 `membership_status = active` 且 `task_role = annotator` 的標記員，依成員清單固定順序輪流分配直到全部樣本指派完畢；樣本數不可整除時，任兩位標記員的分派筆數差距不得超過 1。`min_annotators` 僅約束試標回合的重疊標記人數與 FR-010t 的發布前人數檢查，不改變正式標記「每筆單一標記員」的分派語意；發布後的成員異動不得自動重算既有 assignment，其處置依成員管理規則（FR-005f 系列）。 assignment 為穩定工作 slot，以 `assignment_id` 識別、`(run_id, dataset_item_id, slot_no)` 唯一，`slot_no` 為正整數；同 run item 不得重複指派相同非空 membership。item 必須屬於 run，membership 必須為同 task 的 active annotator。停用／移除／重指派保留 slot ID，已提交歷史保留；Official 每 item 僅一個 slot。

#### Scenario: FR-010f-4 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-010f-4；AC-3.44）

### Requirement: FR-010f-5 task/run 身分契約

- **FR-010f-5**（**v6.0.0 新增**，issue #1160）：依 [ADR-022](../../../docs/adr/022-task-state-machine-location.md) 的 `waiting_iaa_confirmation → draft` 退回動作，關閉目前 cycle、記錄拒絕原因並清除 current cycle 指標；不得刪除或重寫其 round、run、snapshot、assignment 或排除證據。下一次 Dry 發布建立下一個 `(task_id, cycle_no)` 並自 R1 起算；同一 task 同時最多一個未關閉 cycle，完成 Official 時關閉該 cycle。current run／snapshot 由 current cycle 推導，不是可覆寫歷史的 task 級單一 snapshot。

#### Scenario: FR-010f-5 對應 AC-3.40

- **GIVEN** cycle 1 的 R1 已發布後退回 draft
- **WHEN** 重綁版本並再次發布 R1
- **THEN** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。（FR-010f-5；AC-3.40）

### Requirement: FR-010f-6 task/run 身分契約

- **FR-010f-6**（**v6.0.0 新增**，issue #1160）：發布須在同一交易鎖定任務／目前版本並驗證狀態、權限、sealed version、每個來源批次的公開／受保護欄位對映、成員與回合前置條件。每個選中 item 須經 batch 確認屬於 cycle 版本；任一跨版本 item 即整次拒絕。cycle（R1）、round（Dry）、snapshot／manifest 回執、run、run items、候選審核名冊、assignment 與狀態轉換事件須全部提交或全部回滾；提交前驗證 `item_count` 等於實際 run-item 數。發布 idempotency key 綁定 task、發布目標及請求內容：相同 key／相同內容重試回傳原 run 與 snapshot，不重抽、不增加指派或事件；同 key 異內容、不同 key 對同 round 重複發布或第二次 Official 發布均回報衝突。並行請求亦須由交易及唯一性約束保證相同結果，SQLite 與 PostgreSQL 語意一致。

#### Scenario: FR-010f-6 對應 AC-3.42

- **GIVEN** 合法 Dry 或 Official 發布請求
- **WHEN** 相同 key／內容重送或並行重送
- **THEN** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。（FR-010f-6；AC-3.42）

### Requirement: FR-010i-1 task/run 身分契約

- **FR-010i-1**：所有匯出結果檔 metadata 必須額外包含 `export_format`、`exported_at`、`exported_by`、`schema_version` 與 `applied_filters`，以支援審計與下游解析。 `schema_version` 取自 run 的 cycle 所釘住 config 版本的 `schema_version_no`，另保存 `config_version_id`、`dataset_version_id`、`run_id`、`cycle_id`、`guideline_version_id` 與 snapshot 身分，不得以任務目前版本代替。

#### Scenario: FR-010i-1 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-010i-1；AC-3.43）

### Requirement: FR-010i-2 task/run 身分契約

- **FR-010i-2**：匯出記錄表中的每筆紀錄必須保存 `re-download` 所需的條件快照；重新下載時必須以該快照為唯一依據重建匯出結果，不得讀取使用者當前頁面 filter state。條件快照至少包含 `export_format`、`run_stage`、`submission_status`、`annotator_scope`，以及任何會改變結果集合的版本/快照識別資訊。`scope_label` 與 `export_type` 只供歷史列表顯示，必須另存於匯出歷史列的顯示 metadata，排除於重建條件快照及其完整性檢查之外（FR-021 第 (6) 項）。版本條件須含 FR-010i-1 的精確版本／run／cycle／snapshot 識別；跨 run 匯出逐 run 保存，不得以目前版本冒充歷史內容。

#### Scenario: FR-010i-2 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-010i-2；AC-3.43）

### Requirement: FR-014 task/run 身分契約

- **FR-014**（**v6.0.0 修訂**，issue #1160）：Overview 必須支援 `OVERVIEW_EDITABLE_FIELDS` 的編輯能力；通過既有權限檢查的 active `project_leader` 可於 `draft` 儲存一般變更。唯一等待階段例外：在 `waiting_iaa_confirmation` 只可儲存 `GUIDELINE_CONTENT_FIELDS` 四個內容欄位並依 FR-017a 建立新版本；其餘欄位（含 dataset、config/schema、抽樣、名冊及 `force_guideline`）仍為 draft-only。其他執行階段不得修改指引內容。draft 重綁 dataset 或另存 config 只影響未來 cycle，歷史 cycle 的版本參照不變。

#### Scenario: FR-014 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-014；AC-3.43）

### Requirement: FR-017a task/run 身分契約

- **FR-017a**：任務建立時初始化同任務不可變指引版本；`GUIDELINE_CONTENT_FIELDS`（`annotator_guideline_text`、`annotator_guideline_assets`、`reviewer_guideline_text`、`reviewer_guideline_assets`）任一實際修改並依 FR-014 成功儲存，建立下一個正整數版本，保留舊內容及資產參照。`force_guideline` 為顯示政策，其單獨異動不建立內容版本。每個 run 必須釘住非空且同任務的 `guideline_version_id`；Dry run 必須與其 TrialRound 的版本相同並由複合參照約束保證，Official 依 FR-010f-3 於發布交易選定目前版本。既有 run／round 不因指引更新而回填；annotation-015 FR-066 第 4 點依所選 run 的版本解析，不可追隨可變目前指標。

#### Scenario: FR-017a 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-017a；AC-3.43）

### Requirement: AC-1.26 驗收情境

26. **AC-1.26**（**v5.0.0 新增**，issue #1120）：**Given** 一個任務同時存在已結束的試標回合與一個進行中的回合，**When** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤，**Then** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。

#### Scenario: AC-1.26 對應 AC-1.26

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。（AC-1.26；AC-1.26）

### Requirement: AC-3.40 驗收情境

40. **AC-3.40**（v6.0.0，issue #1160）：**Given** cycle 1 的 R1 已發布後退回 draft，**When** 重綁版本並再次發布 R1，**Then** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。

#### Scenario: AC-3.40 對應 AC-3.40

- **GIVEN** cycle 1 的 R1 已發布後退回 draft
- **WHEN** 重綁版本並再次發布 R1
- **THEN** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。（AC-3.40；AC-3.40）

### Requirement: AC-3.41 驗收情境

41. **AC-3.41**（v6.0.0，issue #1160）：**Given** sealed version 有 10 個已接受 item、R1 已用 3 個，**When** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2，**Then** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。

#### Scenario: AC-3.41 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（AC-3.41；AC-3.41）

### Requirement: AC-3.42 驗收情境

42. **AC-3.42**（v6.0.0，issue #1160）：**Given** 合法 Dry 或 Official 發布請求，**When** 相同 key／內容重送或並行重送，**Then** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。

#### Scenario: AC-3.42 對應 AC-3.42

- **GIVEN** 合法 Dry 或 Official 發布請求
- **WHEN** 相同 key／內容重送或並行重送
- **THEN** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。（AC-3.42；AC-3.42）

### Requirement: AC-3.43 驗收情境

43. **AC-3.43**（v6.0.0，issue #1160）：**Given** Dry R1 釘住指引 v1 且已進入等待階段，**When** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official，**Then** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。

#### Scenario: AC-3.43 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（AC-3.43；AC-3.43）

### Requirement: AC-3.44 驗收情境

44. **AC-3.44**（v6.0.0，issue #1160）：**Given** run 已凍結 reviewer 候選並建立 annotator 工作 slot，**When** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除，**Then** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。

#### Scenario: AC-3.44 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（AC-3.44；AC-3.44）

### Requirement: AC-3.45 驗收情境

45. **AC-3.45**（v6.0.0，issue #1160）：**Given** item 的 private row 含 hidden answer 或 declared_split，**When** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料，**Then** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。

#### Scenario: AC-3.45 對應 AC-3.45

- **GIVEN** item 的 private row 含 hidden answer 或 declared_split
- **WHEN** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料
- **THEN** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。（AC-3.45；AC-3.45）

### Requirement: AC-3.46 驗收情境

46. **AC-3.46**（v6.0.0，issue #1160）：**Given** 同一 cycle 綁定的 sealed dataset version 有 12 個已接受 item，已發布 R1 實際使用 3 個、R2 實際使用 4 個，其中一筆 R1 assignment 後來被終局排除，**When** 發布要求 4 個的 R3，**Then** R3 精確取得 4 個不屬於 R1／R2 的新 item ID，已排除 assignment 對應的 item ID 不得重新出現在 R3，並保留 1 個 item 供 Official 發布時凍結；若改為要求 5 個的 R3，則整次拒絕且不建立 run／snapshot／assignment，不得因 R1 assignment 排除而回補可用池（FR-010d／FR-010e／FR-010f-2）。

#### Scenario: AC-3.46 排除 assignment 不回補已用 item

- **GIVEN** 同一 cycle 綁定的 sealed dataset version 有 12 個已接受 item，已發布 R1 實際使用 3 個、R2 實際使用 4 個，其中一筆 R1 assignment 後來被終局排除
- **WHEN** 發布要求 4 個的 R3
- **THEN** R3 精確取得 4 個不屬於 R1／R2 的新 item ID，已排除 assignment 對應的 item ID 不得重新出現在 R3，並保留 1 個 item 供 Official 發布時凍結；若改為要求 5 個的 R3，則整次拒絕且不建立 run／snapshot／assignment，不得因 R1 assignment 排除而回補可用池（FR-010d／FR-010e／FR-010f-2）。

### Requirement: SC-005 成功標準

- **SC-005**：`isolation_enabled = true` 時匯出與查詢結果中 Dry／Official 不混入；`false` 時揭露風險並保存確認與審計證據，但不自動產生混合結果動作。兩種值皆須拒絕同 cycle 任何 Dry／Official item ID 重疊；只允許 draft 退回後的新 cycle 再使用舊 cycle item（AC-3.40／AC-3.41）。

#### Scenario: SC-005 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（SC-005；AC-3.41）

### Requirement: SC-011 成功標準

- **SC-011**：僅 reviewer 或不符 FR-014 狀態／欄位範圍時，Overview 編輯入口不可用且顯示唯讀原因；active PL 在等待階段只可儲存四個指引內容欄位（AC-3.43）。

#### Scenario: SC-011 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（SC-011；AC-3.43）

### Requirement: SC-050 成功標準

- **SC-050**（**v5.0.0 新增**，issue #1120）：對同一任務依序檢視五個頁籤時，由同一 `task_id × cycle_id × run_type × round_no` 推導之計數在各頁籤間完全一致，且無任一數字由標記 assignment、審核單位、爭議項三種單位相加而得；該任務無工時或匯出紀錄時兩區塊皆呈現空狀態，不出現其他任務的通用資料（FR-010u）。

#### Scenario: SC-050 對應 AC-1.26

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。（SC-050；AC-1.26）

### Requirement: SC-053 成功標準

- **SC-053**：通過 AC-3.40／AC-3.41／AC-3.46：新舊 cycle R1 可同時追溯且互不計數，兩種隔離值下 item 集合皆不重疊；即使先前 Dry assignment 被排除，sealed-version 累計上限仍依已發布 Dry run 的實際 item_count 計算，每輪保留至少一筆 Official。

#### Scenario: SC-053 對應 AC-3.40

- **GIVEN** cycle 1 的 R1 已發布後退回 draft
- **WHEN** 重綁版本並再次發布 R1
- **THEN** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。（SC-053；AC-3.40）

#### Scenario: SC-053 對應 AC-3.46

- **GIVEN** 同一 cycle 綁定的 sealed dataset version 有 12 個已接受 item，已發布 R1 實際使用 3 個、R2 實際使用 4 個，其中一筆 R1 assignment 後來被終局排除
- **WHEN** 發布要求 4 個的 R3
- **THEN** R3 精確取得 4 個不屬於 R1／R2 的新 item ID，已排除 assignment 對應的 item ID 不得重新出現在 R3，並保留 1 個 item 供 Official 發布時凍結；若改為要求 5 個的 R3，則整次拒絕且不建立 run／snapshot／assignment，不得因 R1 assignment 排除而回補可用池（FR-010d／FR-010e／FR-010f-2）。

### Requirement: SC-054 成功標準

- **SC-054**：通過 AC-3.42：SQLite／PostgreSQL 後續實作驗證須涵蓋並行冪等、同 task Official 生命週期唯一、跨版本拒絕及交易失敗零部分寫入。

#### Scenario: SC-054 對應 AC-3.42

- **GIVEN** 合法 Dry 或 Official 發布請求
- **WHEN** 相同 key／內容重送或並行重送
- **THEN** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。（SC-054；AC-3.42）

### Requirement: SC-055 成功標準

- **SC-055**：通過 AC-3.43：run／round 指引 equality、等待階段四欄位界線、config/schema 同步版本與歷史匯出版本皆可追溯，無任何歷史記錄改讀目前版本。

#### Scenario: SC-055 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（SC-055；AC-3.43）

### Requirement: SC-056 成功標準

- **SC-056**：通過 AC-3.44／AC-3.45：候選快照不授予已停用 membership 權限，終局排除不計分母，無第二份持久化 ReviewAssignment，抽樣／manifest／標記者路徑不讀或暴露私有答案。

#### Scenario: SC-056 對應 AC-3.45

- **GIVEN** item 的 private row 含 hidden answer 或 declared_split
- **WHEN** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料
- **THEN** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。（SC-056；AC-3.45）

## MODIFIED Requirements

### Requirement: FR-010s-1 審核設定編輯模式

- **FR-010s-1**（**v3.0.0 修訂，BREAKING**，對應 AC-3.7、AC-3.8，issue #688）：審核設定編輯模式必須提供兩份勾選清單，不得提供任何數值輸入框、模式單選或行為 toggle：(1) `審核員` 勾選清單——候選 = `membership_status = active AND task_role = reviewer`；勾選結果寫入 `reviewer_ids`，即系統自動指派的分派對象（`015` FR-093）。(2) `仲裁者` 勾選清單——候選必須為 `reviewer_ids` 的子集合（未被勾選為審核員者不得出現於仲裁者候選）；勾選結果寫入 `arbiter_ids`，即 `can_arbitrate = true` 的來源（`015` FR-060 條件一）。兩份名冊寫入的元素必須遵守 `REVIEWER_ID_FORMAT`：值為該成員的 `TaskMembership.user_id`，不得寫入 Email 或顯示名稱；消費端比對審核員身分與成員清單「審核負荷」欄聚合皆必須以該 id 為唯一鍵，Email 僅供成員清單顯示。驗證：儲存時 `reviewer_ids` 至少 1 人，否則必須阻擋儲存並顯示可修正錯誤訊息；`arbiter_ids` 允許為空並於摘要值標示（FR-010s-2），不阻擋儲存；取消勾選某審核員時，若其 `arbiter_ids` 亦被勾選，必須同步取消並於儲存前提示。編輯區塊必須載明：仲裁時另受非當事人限制（對該審核單位已提交審核者不得仲裁該單位，`015` FR-060），且系統不得因某審核員恰為該筆的標記員而排除其審核指派。 目前名冊正典為同任務 reviewer membership 關聯列（含 `can_arbitrate` 與穩定排序）；`reviewer_ids`／`arbiter_ids` 僅是 user ID 相容投影，不另存可分歧 JSON 名冊。
  **v4.2.0 修訂**（issue #868，對應 AC-3.21～AC-3.23、SC-048）：`arbiter_ids` 中的每位成員依 015 FR-093 皆保留處理仲裁，不接收新的審核單位。儲存時除 `reviewer_ids` 至少一人外，`reviewer_ids - arbiter_ids` 亦必須至少一人；否則整筆儲存必須被阻擋並顯示可修正錯誤「請至少保留一位未被指定為仲裁者的審核員」。驗證必須採 ID 集合差，不得只比較兩陣列長度。`arbiter_ids = []` 仍合法並沿用 FR-010s-2／FR-010t 警示。編輯區 helper text 必須揭露指定仲裁者不接收新審核單位；FR-060 非當事人限制不變。

#### Scenario: 全部審核員同時是仲裁者時阻擋儲存

- **GIVEN** PL 在審核設定中勾選兩位 reviewer，並把這兩人都勾為 arbiter
- **WHEN** PL 儲存審核設定
- **THEN** 儲存被阻擋，既有設定不被覆寫
- **AND** 畫面明確提示至少保留一位未被指定為仲裁者的審核員

#### Scenario: 保留一位可分派審核員後可儲存

- **GIVEN** `reviewer_ids = [W, C]` 且 `arbiter_ids = [C]`
- **WHEN** PL 儲存審核設定
- **THEN** 儲存成功，W 是新審核單位的有效分派對象，C 保留處理仲裁

#### Scenario: 空仲裁名冊仍可儲存

- **GIVEN** `reviewer_ids` 至少一人且 `arbiter_ids = []`
- **WHEN** PL 儲存審核設定
- **THEN** 儲存成功
- **AND** 摘要與發布確認仍依既有規則警示未指定仲裁者，不新增儲存阻擋

#### Scenario: 仲裁者候選限於已勾選審核員

- **GIVEN** 任務有 4 位啟用中審核員，其中 2 位被勾選為 `審核員`
- **WHEN** 專案負責人展開 `仲裁者` 勾選清單
- **THEN** 候選恰為該 2 位被勾選的審核員
- **AND** 取消勾選其中一位審核員時，其仲裁者勾選同步取消並於儲存前提示

#### Scenario: 名冊以不透明 user id 儲存而非 Email

- **GIVEN** 專案負責人於審核設定勾選一位啟用中審核員並儲存
- **WHEN** 檢視該任務的 `reviewer_ids`
- **THEN** 其元素為該成員的 `TaskMembership.user_id`（形如 `reviewer_wang`），不含任何 Email 字串
- **AND** 審核工作分派、審核負荷聚合與審核員身分比對皆以該 id 為鍵，Email 僅出現於成員清單顯示欄

#### Scenario: FR-010s-1 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-010s-1；AC-3.44）

### Requirement: FR-010t 發布前的成員人數檢查

- **FR-010t**（**v3.0.0 修訂**，對應 AC-3.10，issue #688）：發布 `新增試標回合 R{n}` 或 `開始正式標記` 前，系統必須驗證實際啟用成員人數：(1) `membership_status = active` 且 `task_role = annotator` 的人數 `>= min_annotators`；(2) 被勾選為審核員（`reviewer_ids`）且 `membership_status = active` 的人數 `>= 1`。任一條件不足時，系統必須阻擋發布，並逐角色顯示缺口訊息「還差 N 位」（`N = 應有人數 - 實際人數`）。發布前檢查不得僅驗證抽樣／審核設定值本身（決策 D3，issue #189）。`arbiter_ids` 為空時不得阻擋發布，但必須於發布確認顯示警示：未指定仲裁者時，爭議項將無人可仲裁而堆積於爭議池，任務將無法結案（FR-008b 第 3 項）。原「active reviewer 人數 `>= min_reviewers`」改為上列第 (2) 項——`min_reviewers` 已移除，審核只需至少一位被勾選的審核員即可運作。 同發布交易凍結當下所選 active reviewer membership、仲裁資格與排序為 run 候選池；此快照不是審核指派或永久授權。後續讀取／提交／分派／仲裁仍查即時 active membership、矩陣與資源條件；停用後候選歷史保留但立即失去授權。審核黏著依 annotation-015 FR-093(5) 自 submission 推導。
  **v4.2.0 修訂**（issue #868，對應 AC-3.24、SC-048）：發布前除上述人數檢查外，`membership_status = active` 的有效分派池 `reviewer_ids - arbiter_ids` 亦必須至少一人；此檢查必須在每次發布時以當下成員狀態重算，避免設定儲存後的停用或移除使分派池歸零。有效分派池為空時必須阻擋發布、顯示可修正訊息「至少需 1 位未被指定為仲裁者的啟用中審核員」，且不得建立回合或改變任務狀態。`arbiter_ids = []` 仍依既有規則合法。
  **v5.0.0 修訂**（issue #1120，對應 AC-3.39、SC-051）：`arbiter_ids` 為空時的發布警示文案必須更新。`arbiter_ids` 為空仍不得阻擋發布，但警示文字必須改為說明爭議項將由 `project_leader` 依 FR-023 自行裁定，不得再聲稱「任務將無法結案」——該敘述在 FR-023 生效後已不成立。成員人數檢查第 (1)(2) 點與其「還差 N 位」缺口訊息文字不變。

#### Scenario: 未勾選審核員時阻擋發布
- **GIVEN** 某 `draft` 任務有足額標記員但 `reviewer_ids` 為空
- **WHEN** 專案負責人點擊 `新增試標回合 R1`
- **THEN** 發布被阻擋並顯示審核員「還差 1 位」
- **AND** 另一任務已勾選審核員但未勾選仲裁者時發布不被阻擋，僅於確認畫面顯示無仲裁者的警示

#### Scenario: 成員異動不得留下零分派池
- **GIVEN** 任務已儲存 `reviewer_ids = [W, C]`、`arbiter_ids = [C]`，之後 W 被停用而只剩 C 為啟用中 reviewer
- **WHEN** 專案負責人發布新增試標回合或開始正式標記
- **THEN** 發布被阻擋並顯示至少需一位未被指定為仲裁者的啟用中審核員
- **AND** 任務狀態與回合數維持不變

#### Scenario: 空仲裁者名冊的發布警示指向負責人裁定通道

- **GIVEN** 一個 `arbiter_ids` 為空、成員人數檢查皆通過的任務
- **WHEN** `project_leader` 進入發布確認
- **THEN** 發布未被阻擋，警示文字說明爭議項將由負責人自行裁定（FR-023）
- **AND** 警示文字不含「任務將無法結案」之敘述

#### Scenario: FR-010t 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-010t；AC-3.44）

### Requirement: FR-010u 跨頁籤衍生計數的共用查詢上下文與聚合單位（成功標準 SC-050）

- **FR-010u**（**v5.0.0 新增**，對應 AC-1.26、AC-1.27、SC-050，issue #1120）：`task-detail` 五個頁籤（`TASK_TABS`）呈現的衍生計數必須以同一組查詢上下文推導，並必須依既有正典定義之聚合單位計數。(1) **共用查詢上下文**：任務、cycle、`run_type` 與回合為共用查詢上下文，概覽、成員、進度、結果四個頁籤之計數必須由同一組 `task_id × cycle_id × run_type × round_no` 推導；選取某一回合時不得混入其他回合或其他任務的資料。工時與匯出歷史必須依當前任務篩選；該任務無對應紀錄時必須呈現真實空狀態，不得呈現其他任務的通用示範資料。(2) **`已提交` 的分子分母**：分子為該 `task_id × cycle_id × run_type × round_no` 範圍內已提交之標記 assignment 數；分母為同範圍內未排除之標記工作 slot 數（含退回未指派的 slot）。依 FR-005h 被 `project_leader` 明確排除之標記作業不得計入分子或分母，與 FR-005h 既有的「不計入完成率或標記分布統計」一致。(3) **`已完成輪次` 的分子**：分子為已結束之試標回合數；當前進行中之回合不得計入。歷史回合與當前回合必須分列呈現，兩者之計數與決策不得交叉累計。「已結束」之判定依既有試標完成規則（FR-008a），本條不另定義該規則。(4) **既有定義不得重複**：`已定案 review unit` 之判定式與聚合單位（穩定 run／assignment 範圍內之樣本／標記員維度）以 `annotation/015-annotation-workspace` FR-051 為正典；`最終例外輸出項目` 之來源與逐筆收尾動作以 `annotation/015-annotation-workspace` FR-095 為正典，其分 `run_type` 獨立計數規則沿用本規格 FR-018 第 (5) 點。本規格必須讀取該兩處既有定義，不得另建第二份判定式、分母或狀態清單。(5) **單位不得相加**：標記 assignment、審核單位、爭議項（同一 run 範圍的審核單位 × outKey × 合併鍵（015 FR-059））分屬三個不同聚合層級，不得相加為單一數字，亦不得共用同一分母。畫面呈現必須使每個計數的單位可辨識；提交進度與定案進度必須分別命名，不得以同一標題涵蓋兩者。(6) **時間語意**：已提交時間不得被呈現為審核完成或仲裁完成時間；各階段時間必須取自其各自的事件來源。(7) **資料分配與工作完成分離**：樣本池分配的視覺呈現（FR-010p）必須附明確的「資料分配」語意說明；分配比例達滿不得被表述為標記或審核工作已完成。 上述範圍等價於穩定 `run_id`；重複 R1 不得合併 cycle。提交分母為同 run 未排除工作 slot 數（含退回未指派者），重指派不增分母；舊 cycle 回合不納入目前閘門。

#### Scenario: 五個頁籤的計數同源且不混入其他任務或回合

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × run_type × round` 推導，數值彼此一致
- **AND** 畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄
- **AND** 該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料

#### Scenario: 三種計數單位分列呈現且不相加

- **GIVEN** 一個任務之標記 assignment、審核單位與爭議項三者數量互不相等
- **WHEN** `project_leader` 檢視進度與結果頁籤
- **THEN** 提交進度與定案進度分別命名呈現，各自的分子分母可辨識其單位
- **AND** 畫面不存在將標記 assignment 數、審核單位數與爭議項數相加後的單一數字
- **AND** 歷史回合與當前回合的計數分列呈現，未交叉累計

#### Scenario: FR-010u 對應 AC-1.26

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。（FR-010u；AC-1.26）

### Requirement: FR-018 最終例外池

- **FR-018**（**v3.0.0 新增**，對應 AC-3.13、SC-043，issue #688）：`annotation-progress` tab 必須提供「最終例外池」區塊，作為專案負責人逐筆收尾爭議的入口：(1) 區塊標題列必須顯示待處置項目數；`0` 時必須渲染空狀態（`最終例外池已清空`），不得隱藏整個區塊——結案閘門（FR-008b）依賴此處為唯一可稽核的呈現點。(2) 清單欄位逐筆呈現樣本 ID、標記員帳號、審核員帳號、爭議的輸出類型、仲裁者帳號與其「兩者皆非」理由、落入例外池的時間。(3) 每列必須提供進入處置畫面的動作，導向 `015` FR-095 之收尾介面並攜帶完整審核單位身分（穩定 `run_id`／`assignment_id`，加上 task／cycle／run_type／樣本／標記員顯示維度）與爭議項識別；該動作按鈕/連結必須於操作欄內單行呈現、不得換行為兩行，窄螢幕下改依既有表格水平捲動（`.table-scroll`）呈現，不得以按鈕換行取代（v4.2.1 釐清，issue #1057，Lightweight Path PATCH，未新增或移除 FR/AC）。(4) 本區塊必須僅對 `project_leader` 呈現；其他角色不得看到此區塊，直連進入時須比照 FR-006 導回並提示無權限。(5) 清單必須可依 `run_type` 篩選；`dry_run` 與 `official_run` 的例外項各自獨立計數，FR-008b 第 (4) 項之結案閘門僅計 `official_run` 的待處置項目。

#### Scenario: SC-043 例外池清單與導頁
- **GIVEN** 某任務有 2 項 `official_run` 待處置例外
- **WHEN** 專案負責人開啟 `annotation-progress`
- **THEN** 「最終例外池」區塊標題顯示 2 項待處置，逐列呈現樣本 ID、標記員、審核員、爭議輸出類型、仲裁者與其理由
- **AND** 點擊任一列進入該爭議項的處置畫面，網址攜帶完整審核單位身分

#### Scenario: 非專案負責人看不到例外池
- **GIVEN** 操作者為 `reviewer`
- **WHEN** 其開啟 `annotation-progress`
- **THEN** 畫面上不存在「最終例外池」區塊

#### Scenario: dry_run 例外項計入試標閘門而不計入結案閘門

- **GIVEN** 一個任務同時存在 `1` 筆待處置的 `dry_run` 例外項與 `0` 筆待處置的 `official_run` 例外項
- **WHEN** 系統分別評估試標完成條件與結案條件
- **THEN** 試標完成條件因該 `dry_run` 例外項而未滿足
- **AND** 結案閘門的例外池條件不因該 `dry_run` 例外項而未滿足
- **AND** 最終例外池清單可依 `run_type` 篩選，兩種計數分列呈現且未相加

#### Scenario: FR-018 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-018；AC-3.44）

### Requirement: FR-021 匯出記錄重新下載依條件快照重建且不新增紀錄

- **FR-021**（**v3.3.0 新增**，對應 AC-1.14、AC-1.15、AC-1.16、SC-046，issue #772）：`annotation-results` 匯出記錄表每一列「操作」欄的「下載」必須以該列保存的條件快照（FR-010i-2）為唯一依據重建匯出結果並觸發下載。本條是 FR-010i-2 與 FR-020 第 (3) 項的讀取側；依兩者所定的重建條件與顯示 metadata 分界，補上重新下載的行為與快照為達成逐字元相同所需的最小欄位。(1) **唯一依據**：重新下載不得讀取使用者當前畫面上的任何篩選狀態（標記階段、提交狀態、標記員、審核員、審核狀態）、不得讀取 FR-020 匯出對話框目前的選項（標註方案、詞元單位、切詞引擎），且不得開啟匯出對話框；畫面篩選與對話框選項在重新下載前後必須維持原值，重新下載不得回寫它們。(2) **不新增匯出記錄**：重新下載不得在匯出記錄表新增任何一列，不得改變既有各列的內容與排列順序；使用者故事 1 介面定義「匯出記錄表」區塊所述「新記錄即時插入表格最前列」只適用於匯出按鈕觸發的匯出，不適用於重新下載。(3) **快照最小欄位**：為使重建結果不受重新下載當下的畫面狀態影響，每筆匯出記錄的條件快照除 FR-010i-2 列舉之欄位與 FR-020 第 (3) 項之序列欄位外，必須另外保存：審核員篩選值與審核狀態篩選值（兩者都會改變匯出的樣本集合，屬使用者故事 1 介面定義「匯出記錄表」區塊所要求保存之「任何會影響匯出結果集合的條件」）、匯出時間（完整精度；FR-010i-1 要求 metadata 含 `exported_at`，且下載檔名由匯出時間組成）、匯出人（FR-010i-1 要求 metadata 含 `exported_by`；重新下載者不取代原匯出人）、匯出當下的介面語言（匯出檔的任務名稱依介面語言取值，切換語言後重建會得到不同的檔案）。同一次匯出內，metadata 的匯出時間與下載檔名所用的匯出時間必須為同一個值。(4) **逐字元相同**：在該任務的標記結果與切詞引擎資料皆未變動的前提下，重新下載產生的檔案內容必須與該筆紀錄原始下載的檔案逐字元相同，下載檔名必須與原始檔名相同；此要求適用所有任務類型與 `EXPORT_FORMATS` 兩種格式，`sequence_tagging` 任務（FR-020）之方案、單位、切詞引擎 metadata 與序列內容亦在此列。(5) **單一產生路徑**：重新下載必須沿用匯出按鈕所用的同一組匯出內容產生邏輯，只把條件來源由畫面狀態換成快照，不得另建第二份匯出內容組裝程式碼；`sequence_tagging` 的序列產生入口仍受 FR-020 第 (1) 項與 SC-045 約束，頁面內推導函式的呼叫點不因重新下載而增加。重新下載不得顯示 FR-020 第 (4) 項的對齊擴張摘要——摘要屬於匯出對話框內的當次匯出回饋。(6) **無法重建時**：以下兩種情況不得產生任何檔案、不得新增匯出記錄，且不得以預設值或當前畫面狀態補齊缺漏條件——其一，該列沒有條件快照，或快照缺少重建檔案內容所需的任一欄位——即第 (3) 項所列全部欄位，以及 FR-010i-2 所列欄位中會影響匯出結果集合與檔案內容者（`export_format`、`run_stage`、`submission_status`、`annotator_scope`，以及 FR-010i-1／FR-010i-2 的精確 dataset／config／schema／guideline／run／cycle／snapshot 識別）；`scope_label` 與 `export_type` 僅保存於歷史列的顯示 metadata，依 issue #772 change 之 `design.md` D2／Q6 定案不保存於重建快照，故不屬本項必要欄位（例如本條生效前留下的紀錄）：該列的「下載」必須呈停用狀態，並以可理解的中文說明此筆紀錄缺少重建所需的匯出條件；其二，快照的詞元單位為 `word`，而快照所記錄的切詞引擎在重新下載當下已不可用或未提供版本資訊：重新下載必須被阻擋並顯示可理解的中文原因，明確指出缺的是該切詞引擎；阻擋與否必須以共用推導模組的回傳值為準（FR-020 第 (1) 項），本頁不得自行判斷引擎欄位是否齊全。

#### Scenario: AC-1.14 `sequence_tagging` 重新下載不受當前篩選與對話框選項影響且不新增紀錄

- **WHEN** `project_leader` 於 `sequence_tagging` 任務選定一組頁面篩選、於匯出對話框選擇標註方案 `BIOES`、詞元單位 `word` 與一個具版本資訊的切詞引擎並完成一次 `JSON` 匯出，隨後改變頁面篩選、於匯出對話框改選其他方案與單位後取消，再按下該筆匯出記錄列的「下載」
- **THEN** 下載的檔案內容與第一次匯出的檔案逐字元相同，檔名亦相同
- **AND** 檔案 metadata 的標註方案、詞元單位與切詞引擎仍為第一次匯出時的值
- **AND** 匯出記錄表的列數與按下「下載」之前相同，匯出對話框未被開啟，畫面未出現對齊擴張摘要
- **AND** 頁面篩選維持使用者改變後的值

#### Scenario: AC-1.15 非序列任務重新下載同樣以快照為準（含審核篩選與介面語言）

- **WHEN** `project_leader` 於一個非 `sequence_tagging` 任務套用審核員與審核狀態篩選後完成一次 `JSON-MIN` 匯出，隨後清除全部篩選、切換介面語言，再按下該筆匯出記錄列的「下載」
- **THEN** 下載的檔案內容與原始匯出逐字元相同，檔名亦相同
- **AND** 匯出記錄表的列數不變

#### Scenario: AC-1.16 缺少快照或切詞引擎不可用時不產檔

- **WHEN** 匯出記錄表中存在一筆沒有條件快照的既有紀錄
- **THEN** 該列的「下載」為停用狀態並附中文說明，點擊不產生任何檔案
- **WHEN** 一筆 `word` 單位的 `sequence_tagging` 匯出紀錄所記錄的切詞引擎於重新下載當下已不可用，使用者按下該列的「下載」
- **THEN** 畫面顯示指出該切詞引擎不可用的中文原因，沒有任何檔案被產生
- **AND** 匯出記錄表的列數不變

#### Scenario: SC-046 重新下載可重現性

- **WHEN** 以 Playwright 對同一筆匯出記錄，在變更頁面篩選、匯出對話框選項與介面語言之後執行重新下載
- **THEN** 重建檔與原始下載檔逐字元相同的比率為 100%，且每次重新下載後匯出記錄表列數增量為 0

#### Scenario: FR-021 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-021；AC-3.43）

### Requirement: FR-022 正式標記池歸零之發布阻擋（成功標準 SC-049）

- **FR-022**（**v5.0.0 新增**，對應 AC-3.25～AC-3.28、SC-049，issue #1120）：發布 `開始正式標記` 前，系統必須驗證剩餘正式標記池筆數大於 `0`。剩餘筆數之推導一律沿用 FR-010f-3 之既有推導式，本條不得複製或另建第二份推導式。(1) **發布阻擋**：剩餘正式標記池筆數為 `0` 時，系統必須阻擋 `開始正式標記` 發布，任務狀態必須維持 `waiting_iaa_confirmation`，且不得建立任何正式標記清單或 assignment。(2) **與 IAA 語意分列**：資料池不足之原因必須與 IAA 相關狀態分列呈現：不得以「IAA 未達標」或「IAA 計算中／計算失敗」表述資料池不足，亦不得因資料池不足而改變最新試標回合之 `iaa_computation_status`。最新回合 `iaa_computation_status = done`（含「無法計算」記為 `done`）且 IAA 已達標時，本條之阻擋必須仍然生效——此阻擋依據為資料池筆數，與 IAA 達標與否及計算是否結束皆無關，不構成 FR-010o-3 所禁止之「因 IAA 未達標而停用」，亦不改變 FR-010o-4 之既有停用規則。(3) **`draft` 階段提前揭露**：任務處於 `draft` 且目前 `sampling_value` 與既有回合設定會使剩餘正式標記池為 `0` 時，系統必須於發布前即顯示原因，並必須以停用狀態呈現對應的執行控制 CTA。此提前揭露不得取代 FR-010t 之成員人數檢查，兩者各自獨立逐項呈現。(4) **handler 同樣驗證**：本條之驗證必須在操作 handler 內執行：直接呼叫發布 handler（繞過停用的按鈕）必須同樣失敗，不得改變任務狀態或建立任何清單資料。(5) **可取得性**：阻擋原因不得僅以 hover 或顏色傳達；原因文字必須為可見文字，且必須可由鍵盤操作與螢幕閱讀器取得。 剩餘池一律依 FR-010d 的 sealed-version `dataset_total`，只扣本 cycle 已發布 Dry run 實際 `item_count`；每次 Rn 先套用累計上限，不得耗盡正式池。

#### Scenario: `draft` 抽樣設定會使正式池歸零時提前揭露並停用 CTA

- **GIVEN** 一個 `draft` 任務，其資料集總筆數與目前每回合抽樣筆數設定會使扣除試標後的剩餘正式標記池為 `0`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 畫面以可見文字顯示剩餘正式標記池為 `0` 的原因，對應執行控制 CTA 呈現停用狀態
- **AND** 該原因文字可由鍵盤聚焦路徑與螢幕閱讀器取得，並非僅由 hover 或顏色傳達

#### Scenario: 計算狀態為 `done` 且 IAA 已達標，仍因正式池為 0 阻擋發布

- **GIVEN** 一個任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = done` 且 IAA 已達目標門檻，但剩餘正式標記池筆數為 `0`
- **WHEN** `project_leader` 點擊 `開始正式標記`
- **THEN** 系統阻擋發布，任務狀態維持 `waiting_iaa_confirmation`，未建立任何正式標記清單或 assignment
- **AND** 畫面逐項列出未滿足的原因，其中資料池不足與 IAA 相關狀態分列呈現

#### Scenario: 資料池不足不得被表述為 IAA 問題

- **GIVEN** 一個任務之剩餘正式標記池筆數為 `0`，且最新試標回合 `iaa_computation_status = done`
- **WHEN** `project_leader` 檢視發布阻擋原因
- **THEN** 原因文字指向資料池筆數不足，不含「IAA 未達標」「IAA 計算中」「IAA 計算失敗」任何表述
- **AND** 最新試標回合之 `iaa_computation_status` 不因本次阻擋而改變

#### Scenario: 直接呼叫發布 handler 同樣失敗

- **GIVEN** 一個任務之剩餘正式標記池筆數為 `0`，其 `開始正式標記` CTA 為停用狀態
- **WHEN** 直接呼叫發布 handler，繞過停用的按鈕
- **THEN** 發布失敗，任務狀態不變，未建立任何正式標記清單或 assignment

#### Scenario: FR-022 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-022；AC-3.41）

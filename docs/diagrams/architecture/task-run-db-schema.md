# task／run 資料庫 schema（實體候選）

> 本文件是 issue #1160 的衍生欄位字典。13 張表均為**未部署候選**，不是 Alembic migration、ORM 或可直接套用的 DDL。正典為 [013](../../../specs/task-management/013-task-new/spec.md)、[014](../../../specs/task-management/014-task-detail/spec.md)、[015](../../../specs/annotation/015-annotation-workspace/spec.md)、[ADR-022](../../adr/022-task-state-machine-location.md) 與 [ADR-037](../../adr/037-permission-matrix-authorization.md)；資料來源表形見 [dataset 字典](./dataset-db-schema.md)。[設計裁決](../../superpowers/specs/2026-10-06-task-run-identity-design.md)已被上述正典採納，但本字典的 SQL 型別、索引與刪除規則仍須在獨立 migration 工作驗證。

## 1. 範圍與狀態

一列 `task` 是可編輯的當前任務；每個 `task_run_cycle` 固定一個 sealed dataset 與不可變 config 版本；每次發布各有獨立 `task_sample_snapshot` 與 `task_run`。`task_run_item` 是被選中的公開 item 成員正典，`task_annotation_assignment` 是穩定工作 slot。退回 draft 後保留舊 cycle、run、assignment，再從新 cycle 的 R1 開始。表名採 foundation FR-105 的單數、模組前綴；`users` 為既有例外。

`TaskDetail`、`AnnotationListItem`、`ReviewUnit`、`ReviewAssignment` 是讀取投影或推導單位；其中 `ReviewAssignment` 已明定**不持久化**。`OutputConfig` 包在不可變 config 版本中。annotation submission、review decision、仲裁、IAA 與 export 的實體表不屬此批；不得替它們預畫 FK。所有下列型別和限制標為「候選」，沒有一項宣稱已在 SQLite／PostgreSQL 執行。

## 2. ERD

下圖列出 13 張候選表的全部欄位，線只畫**本批表之間的單欄 FK**。指向外部 `users`、`dataset_version`、`dataset_item` 的單欄 FK 在字典標明；同 task、同 cycle、同 run 的複合 FK 見 §4。ERD 線不表示表已建立。`dataset_item_private` 不接入發布路徑。

```mermaid
erDiagram
    task {
        uuid id PK
        uuid created_by_user_id FK
        uuid dataset_version_id FK
        uuid current_config_version_id
        uuid current_guideline_version_id
        uuid current_run_cycle_id
        varchar name
        varchar status
        integer sampling_value
        json target_agreement_overrides
        integer min_annotators
        boolean isolation_enabled
        boolean force_guideline
        timestamptz created_at
        timestamptz updated_at
    }
    task_config_version {
        uuid id PK
        uuid task_id FK
        integer version_no
        integer schema_version_no
        char schema_digest
        varchar schema_registry_version
        json config_payload
        char content_digest
        timestamptz created_at
    }
    task_guideline_version {
        uuid id PK
        uuid task_id FK
        integer version_no
        text annotator_guideline_text
        json annotator_guideline_assets
        text reviewer_guideline_text
        json reviewer_guideline_assets
        char content_digest
        timestamptz created_at
    }
    task_membership {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        varchar task_role
        varchar membership_status
        timestamptz created_at
        timestamptz updated_at
    }
    task_reviewer_roster_member {
        uuid task_id PK
        uuid reviewer_membership_id PK
        boolean can_arbitrate
        integer sort_order
    }
    task_run_cycle {
        uuid id PK
        uuid task_id FK
        integer cycle_no
        uuid dataset_version_id FK
        uuid config_version_id
        varchar selection_seed
        varchar selection_algorithm_version
        timestamptz opened_at
        timestamptz closed_at
        varchar close_reason
    }
    task_trial_round {
        uuid id PK
        uuid task_id
        uuid task_run_cycle_id
        integer round_no
        uuid guideline_version_id
        integer sampling_value
        text prior_round_findings
        text guideline_change_summary
        text no_change_reason
        varchar iaa_computation_status
        uuid created_by_user_id FK
        timestamptz created_at
    }
    task_sample_snapshot {
        uuid id PK
        uuid task_run_cycle_id FK
        varchar selection_seed
        varchar selection_algorithm_version
        integer requested_sampling_value
        json target_agreement_overrides
        integer min_annotators
        text selection_manifest_ref
        char selected_item_digest
        timestamptz locked_at
        uuid locked_by_user_id FK
    }
    task_run {
        uuid id PK
        uuid task_id
        uuid task_run_cycle_id
        varchar run_type
        uuid trial_round_id
        uuid sample_snapshot_id
        uuid guideline_version_id
        integer item_count
        varchar publication_idempotency_key
        char publication_request_digest
        uuid created_by_user_id FK
        timestamptz created_at
    }
    task_run_reviewer_candidate {
        uuid task_id
        uuid task_run_id PK
        uuid reviewer_membership_id PK
        boolean can_arbitrate_at_publish
        integer sort_order_at_publish
    }
    task_run_item {
        uuid task_run_id PK
        uuid dataset_item_id PK,FK
        uuid task_run_cycle_id
        integer list_position
    }
    task_annotation_assignment {
        uuid id PK
        uuid task_id
        uuid task_run_id
        uuid dataset_item_id
        integer slot_no
        uuid assignee_membership_id
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }
    task_annotation_exclusion {
        uuid id PK
        uuid assignment_id FK
        uuid excluded_by_user_id FK
        timestamptz excluded_at
        text reason
    }

    task ||--o{ task_config_version : task_id
    task ||--o{ task_guideline_version : task_id
    task ||--o{ task_membership : task_id
    task ||--o{ task_run_cycle : task_id
    task_run_cycle ||--o{ task_sample_snapshot : task_run_cycle_id
    task_annotation_assignment ||--o| task_annotation_exclusion : assignment_id
```

## 3. 欄位字典

六欄中的「規則」參照 §4。`uuid`、`json`、`timestamptz` 是 PostgreSQL 表示法；SQLite 對應見 §6。`?` 不作型別或空值定案。未明列預設值的欄位**沒有候選 DB 預設**；建立者與時間由服務於交易中寫入。所有 FK 與 PK 都仍是規劃約束。

### 3.1 task：當前任務

一列只保存當前可變設定及版本指標，不複製歷史 run 的 dataset/config/guideline。建立者為有 `task.create` 權限的使用者；後續編輯仍須查即時 membership、矩陣及狀態。來源：013 關鍵實體、014 FR-014／關鍵實體、ADR-037。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 穩定 task PK | 建立；不改 | T-01 |
| `created_by_user_id` | uuid → users | 否 | 建立者 | 建立；不改 | T-01 |
| `dataset_version_id` | uuid → dataset_version | 否 | 當前綁定的 sealed 完整版本 | 建立；draft 可重綁 | T-02 |
| `current_config_version_id` | uuid | 是* | 當前不可變 config 版本 | 建立交易補齊；draft 儲存更新 | T-03 |
| `current_guideline_version_id` | uuid | 是* | 當前不可變指引內容版本 | 建立交易補齊；draft／waiting 指引內容儲存更新 | T-03 |
| `current_run_cycle_id` | uuid | 是 | 當前開啟 cycle；無 run 時為 null | 首次 Dry 發布／退回 draft／結案 | T-04 |
| `name` | varchar | 否 | 任務名稱；非身份鍵 | 建立；draft 編輯 | T-01 |
| `status` | varchar(32) | 否 | ADR-022 任務狀態 | 建立為 draft；合法轉換更新 | T-05 |
| `sampling_value` | integer | 否 | 下一次 Dry 的要求筆數 | 建立；允許階段編輯 | T-06 |
| `target_agreement_overrides` | json | 否 | config-driven IAA 目標覆寫；候選空物件預設 | 建立／允許階段編輯 | T-06 |
| `min_annotators` | integer | 否 | Dry 重疊標記及發布檢查下限 | 建立／允許階段編輯 | T-06 |
| `isolation_enabled` | boolean | 否 | 隔離顯示政策；候選 true 預設 | 建立／draft 編輯 | T-06 |
| `force_guideline` | boolean | 否 | 指引顯示政策；不屬內容版本 | 建立／draft 編輯 | T-06 |
| `created_at` | timestamptz | 否 | 建立時間 UTC | 建立 | X-01 |
| `updated_at` | timestamptz | 否 | 當前任務最後修改時間 UTC | 修改 | X-01 |

`*`：兩個 current version 指標為處理 task↔version 建立時的循環參照而暫列可空；**已提交任務不得缺值**。正式 DDL 的 NOT NULL 建立次序仍待 §7 決定。`task_type`、`trial_round`、`sample_snapshot_id`、`reviewer_ids[]`、`arbiter_ids[]` 均由版本／run／名冊投影，不加第二份欄位（014 關鍵實體）。

### 3.2 task_config_version：不可變 config 與 schema

一列是同任務的一個完整 config/schema 版本，`outputs[]`、`field_role_map` 和內嵌 schema snapshot 共存；輸出類型不另建硬編表。來源：013／014 `TaskConfig`。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | config 版本 PK | 成功儲存時；不改 | C-01 |
| `task_id` | uuid → task | 否 | 擁有任務 | 建立；不改 | C-01 |
| `version_no` | integer | 否 | 同 task 正整數版本 | 每次完整儲存 +1 | C-02 |
| `schema_version_no` | integer | 否 | 同列 schema 版本，等於 `version_no` | 同次儲存 | C-02 |
| `schema_digest` | char(64) | 否 | 規格化 outputs／field roles SHA-256；可跨版相同 | 建立；不改 | C-03 |
| `schema_registry_version` | varchar | 否 | 可追溯、保留的驗證定義版本 | 建立；不改 | C-03 |
| `config_payload` | json | 否 | 經 registry 驗證的完整 config 與 schema snapshot | 建立；不改 | C-03 |
| `content_digest` | char(64) | 否 | 完整版本內容摘要；候選算法待核定 | 建立；不改 | C-03 |
| `created_at` | timestamptz | 否 | 建立時間 UTC | 建立；不改 | X-01 |

### 3.3 task_guideline_version：不可變指引內容

即使 Step 4 留空也建立 v1；`force_guideline` 留在 task。資產欄存受控參照清單，不存原始檔案位元組。來源：013 `TaskGuidelineConfig`、014 FR-017a。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 指引版本 PK | 建立；不改 | G-01 |
| `task_id` | uuid → task | 否 | 擁有任務 | 建立；不改 | G-01 |
| `version_no` | integer | 否 | 同 task 正整數內容版本 | 內容實變時 +1 | G-02 |
| `annotator_guideline_text` | text | 否 | 標記員說明文字；空字串代表留空 | 建立；不改 | G-03 |
| `annotator_guideline_assets` | json | 否 | 標記員附件參照清單；候選空陣列預設 | 建立；不改 | G-03 |
| `reviewer_guideline_text` | text | 否 | 審核員說明文字；空字串代表留空 | 建立；不改 | G-03 |
| `reviewer_guideline_assets` | json | 否 | 審核員附件參照清單；候選空陣列預設 | 建立；不改 | G-03 |
| `content_digest` | char(64) | 否 | 四欄內容摘要 | 建立；不改 | G-03 |
| `created_at` | timestamptz | 否 | 建立時間 UTC | 建立；不改 | X-01 |

### 3.4 task_membership：一人於一任務的一個角色

同一人可同時持有多個 task role；停用一列不移除另一角色，也不刪歷史。來源：ADR-037、014 `TaskMembership`／FR-005l。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 穩定 membership PK | 建立；不改 | M-01 |
| `task_id` | uuid → task | 否 | 任務作用域 | 建立；不改 | M-01 |
| `user_id` | uuid → users | 否 | 真實使用者 | 建立；不改 | M-01 |
| `task_role` | varchar(24) | 否 | `project_leader`／`annotator`／`reviewer` | 建立；不改 | M-02 |
| `membership_status` | varchar(16) | 否 | 當前成員狀態 | 建立／停用／復用 | M-03 |
| `created_at` | timestamptz | 否 | 加入時間 UTC | 建立 | X-01 |
| `updated_at` | timestamptz | 否 | 最後狀態變更 UTC | 修改 | X-01 |

### 3.5 task_reviewer_roster_member：當前審核名冊

一列是一個當前選入審核名冊的 reviewer membership；`can_arbitrate` 令仲裁名冊自然為子集合。發布時凍結到 candidate 表，當前名冊變更不改舊 run。來源：014 FR-010s-1／FR-010t、ADR-037。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `task_id` | uuid | 否 | 複合 PK 一部分；同 task 範圍 | 勾選加入；不改 | R-01 |
| `reviewer_membership_id` | uuid | 否 | 複合 PK 一部分；reviewer 成員 | 勾選加入；不改 | R-01 |
| `can_arbitrate` | boolean | 否 | 同一名冊內的仲裁資格；候選 false 預設 | 編輯名冊 | R-02 |
| `sort_order` | integer | 否 | 可重現選人順序 | 編輯名冊 | R-03 |

### 3.6 task_run_cycle：一輪 draft→Dry→Official 的版本邊界

一個 cycle 釘住 sealed dataset、同任務 config/schema、seed 和演算法；退回 draft 僅關閉、不刪除。來源：014 FR-010f／FR-010f-5、ADR-022。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | cycle PK | R1 發布；不改 | Y-01 |
| `task_id` | uuid → task | 否 | 擁有任務 | R1 發布；不改 | Y-01 |
| `cycle_no` | integer | 否 | 同 task 正整數序號 | R1 發布；不改 | Y-02 |
| `dataset_version_id` | uuid → dataset_version | 否 | sealed 完整資料版本 | R1 發布；不改 | Y-03 |
| `config_version_id` | uuid | 否 | 同 task 的不可變 config/schema | R1 發布；不改 | Y-03 |
| `selection_seed` | varchar | 否 | 此 cycle 抽樣重播 seed | R1 發布；不改 | Y-04 |
| `selection_algorithm_version` | varchar | 否 | 抽樣演算法版本 | R1 發布；不改 | Y-04 |
| `opened_at` | timestamptz | 否 | cycle 開啟 UTC 時間 | R1 發布 | X-01 |
| `closed_at` | timestamptz | 是 | 退回 draft 或 Official 完結時間 | cycle 關閉一次 | Y-02 |
| `close_reason` | varchar | 是 | 關閉原因；退回時有明確拒絕原因 | cycle 關閉一次 | Y-02 |

### 3.7 task_trial_round：cycle 內的一個 Dry 回合

R1 與 Rn 的序號只在 cycle 內唯一；`sampling_value` 保存實際 item 數。來源：014 FR-010f-2／FR-010o-4／`TrialRound`。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | round PK | Dry 發布；不改 | Q-01 |
| `task_id` | uuid | 否 | 同 task 複合參照作用域 | Dry 發布；不改 | Q-01 |
| `task_run_cycle_id` | uuid | 否 | 所屬 cycle | Dry 發布；不改 | Q-01 |
| `round_no` | integer | 否 | cycle 內正整數序號 | Dry 發布；不改 | Q-02 |
| `guideline_version_id` | uuid | 否 | 發布時同 task 的指引版本 | Dry 發布；不改 | Q-03 |
| `sampling_value` | integer | 否 | 該回合實際 item 數 | Dry 發布；不改 | Q-04 |
| `prior_round_findings` | text | 是 | 上輪問題；R1 可空 | Dry 發布；不改 | Q-05 |
| `guideline_change_summary` | text | 是 | 本輪指引修訂摘要；R1 可空 | Dry 發布；不改 | Q-05 |
| `no_change_reason` | text | 是 | 指引無變化時原因 | Dry 發布；不改 | Q-05 |
| `iaa_computation_status` | varchar(16) | 否 | `pending`／`done`／`failed`；候選 pending 預設 | 發布；計算結果更新 | Q-06 |
| `created_by_user_id` | uuid → users | 否 | 發布者 | Dry 發布；不改 | Q-01 |
| `created_at` | timestamptz | 否 | 發布時間 UTC | Dry 發布 | X-01 |

### 3.8 task_sample_snapshot：單次發布的不可變抽樣回執

每 run 一份，保存 seed、演算法、digest 和外部有序清單回執；真正成員仍由 `task_run_item` 決定。來源：014 FR-010f／`SampleSnapshot`。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | snapshot PK | 發布；不改 | S-01 |
| `task_run_cycle_id` | uuid → task_run_cycle | 否 | 所屬 cycle | 發布；不改 | S-01 |
| `selection_seed` | varchar | 否 | 該次選取使用的 seed | 發布；不改 | S-02 |
| `selection_algorithm_version` | varchar | 否 | 該次演算法版本 | 發布；不改 | S-02 |
| `requested_sampling_value` | integer | 是 | Dry 要求筆數；Official 為 null | 發布；不改 | S-03 |
| `target_agreement_overrides` | json | 否 | 發布時採用的 IAA 覆寫快照；候選空物件 | 發布；不改 | S-03 |
| `min_annotators` | integer | 否 | 發布時使用的 Dry 人數下限 | 發布；不改 | S-03 |
| `selection_manifest_ref` | text | 否 | 不含答案的外部有序清單審計回執 | 發布；不改 | S-04 |
| `selected_item_digest` | char(64) | 否 | 有序 `dataset_item_id` 清單摘要 | 發布；不改 | S-04 |
| `locked_at` | timestamptz | 否 | 鎖定時間 UTC | 發布 | X-01 |
| `locked_by_user_id` | uuid → users | 否 | 執行發布者 | 發布；不改 | S-01 |

### 3.9 task_run：一次 Dry 或 Official 發布

Dry 有同 cycle round，Official 無 round；每 task 生命週期至多一筆 Official。run 釘住指引，不能以 task 的當前指標重建歷史。來源：014 FR-010f-2／f-3／f-6／`AnnotationListMaterialization`。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 穩定 run PK | 發布；不改 | U-01 |
| `task_id` | uuid | 否 | 同 task 複合參照作用域 | 發布；不改 | U-01 |
| `task_run_cycle_id` | uuid | 否 | 本次 cycle | 發布；不改 | U-01 |
| `run_type` | varchar(16) | 否 | `dry_run`／`official_run` | 發布；不改 | U-02 |
| `trial_round_id` | uuid | 是 | Dry 同 cycle round；Official 必為 null | 發布；不改 | U-02 |
| `sample_snapshot_id` | uuid | 否 | 本次專屬 snapshot | 發布；不改 | U-03 |
| `guideline_version_id` | uuid | 否 | 同 task 指引；Dry 須與 round 一致 | 發布；不改 | U-04 |
| `item_count` | integer | 否 | 與實際 run item 數一致 | 發布；不改 | U-05 |
| `publication_idempotency_key` | varchar | 否 | 任務作用域發布重試鍵 | 發布；不改 | U-06 |
| `publication_request_digest` | char(64) | 否 | 相同 key 的請求內容比對摘要 | 發布；不改 | U-06 |
| `created_by_user_id` | uuid → users | 否 | 發布者 | 發布；不改 | U-01 |
| `created_at` | timestamptz | 否 | 發布時間 UTC | 發布；不改 | X-01 |

### 3.10 task_run_reviewer_candidate：發布時候選名冊快照

此表只凍結審核分派輸入，不保存實際審核員黏著或授權。即時資格每次重新查 current membership 與矩陣；已提交 reviewer 由 015 FR-093(5) 推導。來源：014 FR-010t／關鍵實體、015 FR-093。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `task_id` | uuid | 否 | 同 task 複合參照作用域 | 發布；不改 | V-01 |
| `task_run_id` | uuid | 否 | 複合 PK 的 run | 發布；不改 | V-01 |
| `reviewer_membership_id` | uuid | 否 | 複合 PK 的 reviewer membership | 發布；不改 | V-01 |
| `can_arbitrate_at_publish` | boolean | 否 | 發布當時資格快照，非當前授權 | 發布；不改 | V-02 |
| `sort_order_at_publish` | integer | 否 | 發布當時穩定排序 | 發布；不改 | V-02 |

### 3.11 task_run_item：有序公開 item 成員

一列是一個 run 選中的 `dataset_item`。同 cycle 所有 Dry／Official run 不能重複選同 item；外部 manifest 只是這些列的回執。來源：014 FR-010b／FR-010f／`RunItem`。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `task_run_id` | uuid | 否 | 複合 PK 的 run | 發布；不改 | I-01 |
| `dataset_item_id` | uuid → dataset_item | 否 | 複合 PK 的公開 item | 發布；不改 | I-01 |
| `task_run_cycle_id` | uuid | 否 | 經 parent run 約束的 cycle；防重選 | 發布；不改 | I-02 |
| `list_position` | integer | 否 | run 內正整數排序 | 發布；不改 | I-03 |

### 3.12 task_annotation_assignment：穩定標記工作 slot

一個 assignment ID 不因停用、退回未指派池或重指派而改變；受派者可空不表示已排除。正式 run 每 item 恰一 slot，Dry 按重疊人數建立。來源：014 FR-005l／FR-010f-4／`AnnotationAssignment`；015 的 submission 後續以此 ID 定址。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 穩定工作 slot PK | 發布；不改 | A-01 |
| `task_id` | uuid | 否 | 同 task 複合參照作用域 | 發布；不改 | A-01 |
| `task_run_id` | uuid | 否 | 所屬 run | 發布；不改 | A-01 |
| `dataset_item_id` | uuid | 否 | 該 run 內的公開 item | 發布；不改 | A-01 |
| `slot_no` | integer | 否 | 同 run item 的正整數 slot 序 | 發布；不改 | A-02 |
| `assignee_membership_id` | uuid | 是 | 目前受派 annotator；null＝待重派 | 發布／停用退回／重派 | A-03 |
| `status` | varchar(16) | 否 | 工作 slot 狀態；精確值域待 §7 | 發布／工作進度更新 | A-04 |
| `created_at` | timestamptz | 否 | 建立時間 UTC | 發布 | X-01 |
| `updated_at` | timestamptz | 否 | 最後改動 UTC | 修改 | X-01 |

### 3.13 task_annotation_exclusion：終局排除證據

每 assignment 最多一筆，V1 不撤銷、不刪除，與原 slot 分離避免 null assignee 被誤判排除。來源：014 FR-005h／`ExcludedAnnotationAssignment`。

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| `id` | uuid | 否 | 排除證據 PK | 排除時；不改 | E-01 |
| `assignment_id` | uuid → task_annotation_assignment | 否 | 被排除的穩定 slot | 排除時；不改 | E-01 |
| `excluded_by_user_id` | uuid → users | 否 | 執行排除的 project leader | 排除時；不改 | E-02 |
| `excluded_at` | timestamptz | 否 | 排除時間 UTC | 排除時；不改 | X-01 |
| `reason` | text | 否 | 必填原因 | 排除時；不改 | E-02 |

## 4. 限制清單

**DB**＝候選 PK／FK／UNIQUE／CHECK；**SVC**＝必須在授權服務交易驗證；**SEC**＝restricted-client／答案隔離測試。複合 FK 父端要有同順序的 UNIQUE；Mermaid 不會畫出這些複合關聯。所有限制在獨立 migration 與 SQLite／PostgreSQL 測試通過前均未落地。

| ID | 執行位置 | 候選限制與驗證方向 | 來源 |
|---|---|---|---|
| T-01 | DB | `task.id` PK；`created_by_user_id → users.id`、`dataset_version_id → dataset_version.id` 真 FK；名稱非空白在服務驗證 | 013 建立、014 `TaskDetail` |
| T-02 | SVC | task 建立／draft 重綁與發布只接受 sealed `dataset_version`；舊 cycle 永遠追其原版 | dataset-021 FR-008／FR-010、014 FR-010f |
| T-03 | DB＋SVC | `(task.id,current_config_version_id) → task_config_version(task_id,id)`、同形 guideline 複合 FK；建立 task＋兩版本同交易完成後不可提交缺指標 | 013 `TaskConfig`／`TaskGuidelineConfig`、014 FR-017a |
| T-04 | DB＋SVC | `(task.id,current_run_cycle_id) → task_run_cycle(task_id,id)`；退回 draft 清指標且關閉 cycle；沒有 task 級 current snapshot | ADR-022、014 FR-010f-5 |
| T-05 | DB＋SVC | 狀態值域限 ADR-022 現行五態；轉換與 side effects 同交易，CHECK 無法判前後合法轉換 | ADR-022 Transition Table |
| T-06 | DB＋SVC | `sampling_value >= 1`、`min_annotators >= 2`；boolean NOT NULL；目標覆寫由 config/IAA registry 驗證，NULL/空物件不混淆 | 013 `RunInitConfig`、014 FR-010q |
| C-01 | DB | config PK、`task_id` FK；UNIQUE `(task_id,id)` 為同 task 子參照目標 | 013／014 `TaskConfig` |
| C-02 | DB | `version_no > 0`、`schema_version_no = version_no`、UNIQUE `(task_id,version_no)`；digest 可跨版本重複 | 013 `TaskConfig` |
| C-03 | SVC | `config_payload` 為已驗證不可變 JSON，registry 定義可重播；摘要按 canonical bytes 計算，不能用任意 JSON 欄位代替主鍵 | 013 `TaskConfig`、主憲法 II |
| G-01 | DB | guideline PK、`task_id` FK；UNIQUE `(task_id,id)` 為同 task 版本參照目標 | 013 `TaskGuidelineConfig` |
| G-02 | DB | `version_no > 0`、UNIQUE `(task_id,version_no)`；四內容欄任一真實變更才新增版本 | 014 FR-017a |
| G-03 | SVC | 四內容欄保留 immutable；資產 JSON 驗證、digest 與檔案保留政策須一致；`force_guideline` 不觸發新版本 | 013 `TaskGuidelineConfig`、014 FR-017a |
| M-01 | DB | membership PK、task/user 真 FK；UNIQUE `(task_id,id)` 供受派者與 roster 複合 FK | ADR-037、014 `TaskMembership` |
| M-02 | DB | UNIQUE `(task_id,user_id,task_role)`；一人多角色是多列，角色限現行 `TASK_ROLES` | ADR-037 §Boundaries、014 `TaskMembership` |
| M-03 | SVC | 停用後即時失權，已提交歷史保留；未提交 slot 退回池但不更換 assignment ID | ADR-037 §Persistence、014 FR-005l |
| R-01 | DB＋SVC | roster 複合 PK `(task_id,reviewer_membership_id)`、FK → membership `(task_id,id)`；服務另驗角色 reviewer 與 active | 014 FR-010s-1 |
| R-02 | SVC | `can_arbitrate=true` 只表示已選 reviewer 子集合；仲裁仍需非當事人及即時授權 | 014 FR-010s-1、015 FR-060 |
| R-03 | DB | `sort_order > 0`；UNIQUE `(task_id,sort_order)` | 014 FR-010t、015 FR-093 |
| Y-01 | DB | cycle PK、task/version FK；UNIQUE `(task_id,id)`；`(task_id,config_version_id)` 複合 FK → config `(task_id,id)` | 014 `RunCycle` |
| Y-02 | DB＋SVC | `cycle_no > 0`、UNIQUE `(task_id,cycle_no)`、部分唯一 `(task_id) WHERE closed_at IS NULL`；關閉原因與指標原子更新 | 014 FR-010f-5、ADR-022 |
| Y-03 | SVC | 發布時驗 dataset sealed、config 同 task 且不可變；cycle 不能轉移已釘版本 | 014 FR-010f／FR-014 |
| Y-04 | SVC | seed/演算法版本能重播同一公開資格池；不以 `declared_split` 或答案影響選取 | 014 FR-010f |
| Q-01 | DB | round PK、actor user FK；`(task_id,task_run_cycle_id)`→cycle `(task_id,id)`；UNIQUE `(task_run_cycle_id,id)` 與 `(id,guideline_version_id)` 供子參照 | 014 `TrialRound` |
| Q-02 | DB | `round_no > 0`、UNIQUE `(task_run_cycle_id,round_no)`；新 cycle 可再有 R1 | 014 FR-010f-2 |
| Q-03 | DB | `(task_id,guideline_version_id)`→guideline `(task_id,id)`，不得用裸版本號連到他人 task | 014 FR-017a／`TrialRound` |
| Q-04 | SVC | round `sampling_value = task_run.item_count = COUNT(task_run_item)`；CHECK 不能跨表計數 | 014 FR-010f-2／f-6 |
| Q-05 | SVC | Rn 修訂記錄與 `no_change` 原因依 FR-017 驗證；R1 可空不是偽造空字串 | 014 FR-017 |
| Q-06 | DB＋SVC | IAA 狀態僅 `pending/done/failed`；`done` 含數學上無法計算但已結束，不表示達標 | 014 FR-010o-4 |
| S-01 | DB | snapshot PK、cycle/locked_by user FK；UNIQUE `(task_run_cycle_id,id)` 供同 cycle run 參照 | 014 `SampleSnapshot` |
| S-02 | SVC | snapshot 一旦發布不可覆寫；R1 不預先寫 Official ID 清單 | 014 FR-010f、ADR-022 |
| S-03 | DB＋SVC | DB 只驗 `requested_sampling_value IS NULL OR requested_sampling_value > 0`；snapshot 沒有 `run_type`，所以 Dry 必填、Official 必為 null 須在發布交易由 SVC 對 run 驗證。threshold JSON 的 output type 也由 SVC 依釘住 config 驗證；snapshot 保存發布當下值 | 014 `SampleSnapshot`／FR-010o-1 |
| S-04 | SVC＋SEC | 外部 manifest 的有序 ID digest 必須與 `task_run_item` 等同；兩者無 hidden answer、split、受限來源位置 | 014 FR-010f、dataset 字典 §4 S-01 |
| U-01 | DB | run PK、actor user FK；`(task_id,task_run_cycle_id)`→cycle `(task_id,id)`；UNIQUE `(task_id,id)`、`(task_run_cycle_id,id)` | 014 `AnnotationListMaterialization` |
| U-02 | DB | CHECK Dry 必有 round、Official round 必空；`(task_run_cycle_id,trial_round_id)`→round `(task_run_cycle_id,id)`；Dry round 唯一，部分唯一 `(task_id) WHERE run_type='official_run'` 限一生一筆 | 014 FR-010f-2／f-3 |
| U-03 | DB | `(task_run_cycle_id,sample_snapshot_id)`→snapshot `(task_run_cycle_id,id)`，UNIQUE `sample_snapshot_id`；每 run 專屬 snapshot | 014 FR-010f、ADR-022 |
| U-04 | DB | `(task_id,guideline_version_id)`→guideline `(task_id,id)`；Dry 再用 `(trial_round_id,guideline_version_id)`→round `(id,guideline_version_id)` 限相等 | 014 FR-010f-2／f-3、FR-017a |
| U-05 | DB＋SVC | DB CHECK `item_count > 0`；提交前由服務驗證其等於實際 run-item 列數，Official 取當 cycle 剩餘且必須 >0 | 014 FR-010f-3／f-6 |
| U-06 | DB＋SVC | UNIQUE `(task_id,publication_idempotency_key)`；key/內容同者回原 run，異內容或同 round 異 key 拒絕；並發受唯一鍵與交易保護 | 014 FR-010f-6 |
| V-01 | DB | candidate 複合 PK `(task_run_id,reviewer_membership_id)`；`(task_id,task_run_id)`→run `(task_id,id)`、`(task_id,reviewer_membership_id)`→membership `(task_id,id)` | 014 `RunReviewerCandidate` |
| V-02 | DB＋SVC | UNIQUE `(task_run_id,sort_order_at_publish)`；快照不賦予停用者當前權限，也不產生 sticky 指派列 | 014 FR-010t、015 FR-093(5) |
| I-01 | DB | run-item 複合 PK `(task_run_id,dataset_item_id)`；公開 `dataset_item_id` 真 FK | 014 `RunItem` |
| I-02 | DB＋SVC | `(task_run_cycle_id,task_run_id)`→run `(task_run_cycle_id,id)`；UNIQUE `(task_run_cycle_id,dataset_item_id)` 阻擋當 cycle 任兩 run 重選；item→batch→version 與 sealed 資格需發布交易驗證 | 014 FR-010b／FR-010f-6、dataset 字典 §4 I-01 |
| I-03 | DB | `list_position > 0`、UNIQUE `(task_run_id,list_position)`；順序與 manifest digest 一致由服務驗 | 014 `RunItem` |
| A-01 | DB | assignment PK；`(task_id,task_run_id)`→run `(task_id,id)`、`(task_run_id,dataset_item_id)`→run item 複合 FK、`(task_id,assignee_membership_id)`→membership `(task_id,id)` | 014 `AnnotationAssignment` |
| A-02 | DB＋SVC | `slot_no > 0`、UNIQUE `(task_run_id,dataset_item_id,slot_no)`；Official 每 item 只一 slot、Dry 依活躍標記員數為服務交易規則 | 014 FR-010f-4 |
| A-03 | DB＋SVC | 非空 assignee 的部分 UNIQUE `(task_run_id,dataset_item_id,assignee_membership_id)`；active annotator 角色及重指派資格由服務當次驗 | 014 FR-005l／FR-010f-4 |
| A-04 | SVC | 空 assignee 不是排除；提交與排除不混算，已提交不可因停用被抹除；狀態值域待 §7 | 014 FR-005h／FR-005l／FR-010u |
| E-01 | DB＋SVC | exclusion PK、assignment FK、UNIQUE `(assignment_id)`；V1 append-only、不可撤銷須由服務守住，DB trigger 是否加入待 §7 核定 | 014 FR-005h |
| E-02 | DB＋SVC | 排除者真實 user FK；僅授權 project leader 可寫，原因非空白，保留 audit evidence | 014 FR-005h、ADR-037 |
| X-01 | SVC | 所有時間 UTC；SQLite 讀回須正規化時區，PG 用 `TIMESTAMPTZ` | ADR-024、account 字典 §4 X-02 |

## 5. 索引與查詢成本

以下都是**候選**。先用既有 PK／UNIQUE 左側前綴覆蓋 FK 和 WHERE，再補沒有覆蓋的索引；避免對每欄另建單欄索引。實作後依真實查詢與 `EXPLAIN` 在 SQLite／PostgreSQL 分別驗證。

| 查詢／參照 | 候選索引 | 理由與成本 |
|---|---|---|
| 我的任務與 user FK | `task_membership(user_id,membership_status,task_id)` | user 起首查詢；增加成員變更寫入成本；ADR-037 要求 |
| 同任務 config／指引版本 | UNIQUE `(task_id,version_no)` 各一 | 同時覆蓋 task FK 前綴；不另加 task_id 索引 |
| 當前 reviewer 名冊 | PK `(task_id,reviewer_membership_id)`、UNIQUE `(task_id,sort_order)` | 同 task 名冊與排序；membership 反查另評估 `(reviewer_membership_id,task_id)` |
| cycle 歷史與開啟唯一 | UNIQUE `(task_id,cycle_no)`、部分 UNIQUE `(task_id) WHERE closed_at IS NULL` | 防並行雙開；額外部分索引小而必要 |
| run 歷史及重試 | `(task_run_cycle_id,run_type,created_at,id)`、UNIQUE `(task_id,publication_idempotency_key)` | 第一個支援有界歷程；第二個擋重試衝突；兩者增加發布成本 |
| 當 cycle 已用 item | UNIQUE `(task_run_cycle_id,dataset_item_id)` | 防重選並加速剩餘池反查；PK `(task_run_id,dataset_item_id)` 已支援單 run item |
| run 清單順序 | UNIQUE `(task_run_id,list_position)` | 避免全表排序；重複 run_id 單欄索引無益 |
| 受派者待辦 | `(assignee_membership_id,task_run_id,id)` | PK/slot 唯一鍵無法覆蓋 assignee 起首查詢；依待辦實測調整 |
| FK 反查 | `task(created_by_user_id)`、`task(dataset_version_id)`、`task_run_cycle(dataset_version_id)`、`task_run_item(dataset_item_id)`、`task_annotation_exclusion(excluded_by_user_id)` | 父刪除檢查或業務反查；若複合索引左前綴已涵蓋則移除重複項 |

JSON config 與覆寫不先建 GIN；只有實際 JSON key predicate 與執行計畫證明需要時才加入 PostgreSQL 專用索引，SQLite Lite 仍須可運作。

## 6. SQLite／PostgreSQL 與安全邊界

- **雙資料庫**：ADR-024 規劃 SQLite Lite、PostgreSQL 正式機。UUID 在 PostgreSQL 用 `uuid`，SQLite 用 SQLAlchemy `Uuid` 或等效 adapter，應用層統一小寫帶連字號格式；`json` 以 PostgreSQL JSONB／SQLite JSON 對應，所有 payload 先經版本化 schema 驗證。`timestamptz` 讀寫一律 UTC；SQLite 讀回不保證時區資訊。沒有 PostgreSQL `TINYINT`。
- **FK／migration**：SQLite 每連線 `PRAGMA foreign_keys=ON`；所有複合父鍵先建對應 UNIQUE，否則 SQLite 可能在寫入時報 `foreign key mismatch`。Alembic 的 SQLite ALTER 採 batch mode；獨立 migration PR 須驗證 upgrade／downgrade／roundtrip 和真實 PostgreSQL integration。ON DELETE 暫採 RESTRICT 候選，歷史及私有來源保留政策定案前不得 cascade 清掉證據。
- **發布交易**：PostgreSQL 鎖定 task／目前版本；SQLite 使用序列化寫交易或等效機制，不能假設 `SELECT FOR UPDATE` 在 SQLite 生效。相同 key 同內容重試回原 run；異內容、同 round 另一 key、第二筆 Official、跨版 item 或途中失敗均拒絕或整筆回滾。兩種 DB 均實測併發與部分唯一索引。
- **公平性**：抽樣與公開 run item 只讀 `dataset_item.public_payload` 及其 batch→version 身分，不讀 `dataset_item_private.hidden_answer`、`declared_split` 或受限來源 artifact；Manifest 不包含答案或 test/gold 標記。PostgreSQL 限制標記者 DB role 對私有表的 `SELECT`，SQLite 靠 repository／response allowlist 並測漏。候選表不保留任何私有答案欄。
- **即時權限**：發布候選快照保存歷史輸入，當前讀寫仍每次查 active membership、權限矩陣及資源條件；已停用 reviewer 的舊提交可保留責任鏈，但不能獲得新授權。審核黏著按 015 FR-093(5) 從 submission 推導，不建立 `ReviewAssignment` 表。

## 7. 待決與不得推測事項

1. **migration 可用性**：13 張表的 SQL 長度、部分預設、append-only DB trigger、FK `ON DELETE`、索引精確成本與 migration 順序仍是候選；`task` ↔ config/guideline 的初建循環如何達成提交時 NOT NULL 尚需決策。這些不由可渲染 ERD 代替。
2. **規格內容編碼**：`config_payload`／guideline 資產 JSON 的 canonical bytes、registry 保留與檔案生命週期；snapshot `selection_manifest_ref`、有序 ID digest 與原子外部回執格式；seed／演算法版本型別及重播策略需在 runtime 前定義。
3. **工作 slot**：`task_annotation_assignment.status` 精確值域、狀態轉換、未提交草稿與受派者異動的競爭控制，及 Official「每 item 恰一 slot」的服務／DB 驗證策略；本字典不憑原型狀態猜 enum。
4. **其他實體**：`task_status_transition` 的獨立歷程與 `audit_events` 去重方式、`WorkLogEntry` 原始事件與日彙總、`IsolationAuditLog`、IAA 報告、annotation／review／仲裁及 export 表形另行裁決。ADR-022 的 `run_state_transitions` 是明示歷史示例；若另建狀態歷程，候選名為 `task_status_transition`，不算入本文件 13 張。
5. **跨模組 FK**：dataset 字典的 item 版本經 `dataset_item → dataset_import_batch → dataset_version` 取得；本批不能捏造 `dataset_item.dataset_version_id` 或只靠 item FK 宣稱已保證同 cycle 版本。annotation/review 的 `run_id × assignment_id` 複合約束須由其 owning spec 的實體字典決定。

**交付狀態：候選 13 表，已投影到 [NoteCraft Wiki／Diagram](./database-schema.er.json)，尚無業務 ORM／Alembic migration。** 上述待決事項關閉且雙資料庫測試通過後，才能稱為可執行 schema。

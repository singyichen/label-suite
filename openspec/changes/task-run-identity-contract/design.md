---
對應 Spec: specs/task-management/013-task-new/spec.md, specs/task-management/014-task-detail/spec.md, specs/annotation/015-annotation-workspace/spec.md
---

# Design: task-run-identity-contract

## Goal

以 `specs/task-management/013-task-new/spec.md` v8.3.0、`specs/task-management/014-task-detail/spec.md` v6.0.0、`specs/annotation/015-annotation-workspace/spec.md` v11.0.1 與 Accepted `docs/adr/022-task-state-machine-location.md` 的 2026-10-06 修訂，對齊 issue #1160 的 cycle、run、snapshot、版本及工作身分，使退回 draft 後再次發布 R1 仍可重現歷史且不混算。本 change 是正典規劃對齊，沒有 ORM、migration、API、資料搬遷或已部署 Schema。

`docs/superpowers/specs/2026-10-06-task-run-identity-design.md` §2–§7 與 T1–T12 ledger 提供 DBA 裁決背景；其中「待修訂」及舊版行號應依上述正典重新定位。本文件保留候選關聯模型的決策理由，不核准或重複其物理欄位字典、FK、索引、型別或刪除策略。後續實體設計須獨立確認，annotation/review、IAA 與 export 的物理關聯仍由各 owning domain 定義。

## Relational boundary

採 DBA 方案 A 的關聯式 run membership 與穩定 assignment slot 作為後續設計方向；有序 item 清單的 manifest／digest 提供重現與完整性核對，不能成為另一份可分歧的可變指派來源。以下 14 張表名皆為**候選、未部署**，只說明責任與邏輯身分。

| 候選表 | 責任與身分邊界 |
|---|---|
| `task` | 任務與目前狀態；目前 cycle／config／guideline 為投影，不能用來重建舊 run 的版本。 |
| `task_config_version` | 同 task 的不可變完整 config 及 embedded schema 版本。 |
| `task_guideline_version` | 同 task 的不可變指引內容版本。 |
| `task_membership` | task、user、task role 的角色關係；停用保留歷史，多角色各自獨立。 |
| `task_reviewer_roster_member` | 目前 reviewer roster、仲裁資格與穩定排序；user ID 清單是相容投影。 |
| `task_run_cycle` | 一次 draft 發布至後續試標／正式標記的 cycle；釘住 sealed dataset、config 與抽樣依據。 |
| `task_trial_round` | cycle 內的正整數 round 身分；新 cycle 可重新從 R1 開始。 |
| `task_sample_snapshot` | 每次成功發布各自封存的選樣輸入與清單證據。 |
| `task_run` | 一次 Dry 或 Official 發布的穩定身分，解析自己的 snapshot、cycle 及 guideline。 |
| `task_run_reviewer_candidate` | 發布時 reviewer 候選池的歷史快照；不代表 sticky assignment 或永久授權。 |
| `task_run_item` | run 的有序 item membership；同 cycle 各 run item 集合互斥。 |
| `task_annotation_assignment` | 同 run／item 的穩定工作 slot；更換受派者不更換 slot 身分。 |
| `task_annotation_exclusion` | 某 assignment slot 的終局排除證據。 |
| `task_run_state_transition` | 與狀態變更同交易保存的稽核事件。 |

同 task 的版本／membership、同 cycle 的 round／snapshot、同 run 的 item／assignment 必須一致。DBA 提議用 scoped composite FK、UNIQUE 與必要的冗餘 scope key 表達可由 DB 保證的關係；實際欄位、約束及 migration 留待下一階段。sealed 狀態、item 經 batch 所屬版本、當下 active role、合法轉換與完整集合計數仍需 service 交易驗證，不能宣稱單一 FK 已涵蓋全部規則。

## Cycle and publication identity

依 014 FR-010f、FR-010f-2、FR-010f-3、FR-010f-5／FR-010f-6 與 ADR-022 的 Transition Table／Cycle and Per-Run Snapshot Invariant，首次 Dry 發布才開啟 cycle 並建立 R1；建立 draft task 本身不建立 run 清單。後續 Rn 在相同 cycle 內發布，round 身分為 `(cycle_id, round_no)`。任務生命週期最多一次 Official 發布，不能將「每 cycle 一次」當成替代規則。

每個 published run 各有一份不可變 snapshot。R1 固定資格池及自己的 Dry 清單，後續 Rn 各自固定自己的清單；Official 的確切 item IDs 到 Official 發布時才封存。發布前的 Official remainder 是推導值，不能在 R1 提前當成最終不可變清單。

`waiting_iaa_confirmation → draft` 在同交易關閉被拒絕的目前 cycle、清空 `current_run_cycle_id` 並記錄轉換；歷史 rounds、runs、snapshots、assignments 與 exclusions 皆保留。再發布會開 cycle N+1／R1，可重新使用舊 cycle 的 item，但必須有不同的 run／assignment 身分。計數以穩定 run 或 `task_id × cycle_id × run_type × round_no` 解析；舊 cycle 不進目前完成閘門，也不得把不同 cycle 的 R1 合併。

## Sampling and privacy

014 FR-010b～FR-010f、FR-022 與 dataset-021（`specs/dataset/021-dataset-ingestion-and-lineage/spec.md`）FR-005／FR-010 共同界定：資格池是 cycle 釘住的 sealed dataset version 中全部已接受公開 item。`dataset_total` 不是原始來源筆數、舊 task 總量或私有 split 的子集合。

令 `D` 為該版本 item 總數、`U` 為目前 cycle 先前已發布 Dry 的實際 item 數總和，每次 Dry 發布都必須滿足 `1 ≤ requested_sampling_value ≤ D − U − 1`，選出恰好要求的筆數；不足時拒絕，不靜默縮小清單。Official 發布封存剩餘集合，要求 `D − U > 0`。assignment 排除或重新指派不會釋放已用 item 回資格池。

`isolation_enabled=false` 仍維持同 cycle 的 Dry／Dry 及 Dry／Official item 不重疊，只記錄既有警示與稽核政策；不新增自動跨階段混合查詢或匯出。`declared_split` 是私有來源宣告，不能驅動 run 分區。run item 與 manifest 不保存 gold/test 標記、隱藏答案或受限來源 artifact。未來發布須核對每個 bound batch 的公開／受保護欄位分類，回應只使用公開 allowlist；已儲存私有答案仍僅限授權 scoring worker 路徑。

## Version pins

013 的 `TaskConfig` 與 014 的 `TaskConfig`、FR-010i-1／FR-010i-2 定義首次驗證成功版本為 1；draft 每次後續完整 config 成功儲存建立新不可變版本，同步增加 `version_no` 與 `schema_version_no`，兩者相等。完整 config 與 embedded schema 共用精確版本參照；digest 依釘住且保留驗證定義的 registry version 計算，可跨版本相同。cycle 釘住該版本，不能以目前 task pointer 解析歷史 annotation/export；後續物理 FK 由其 owner 補齊。

依 014 FR-014／FR-017a，dataset、config、抽樣、roster 與 `force_guideline` 仍是 draft-only；`waiting_iaa_confirmation` 的唯一編輯例外是通過既有權限檢查的 active leader 儲存四個 `GUIDELINE_CONTENT_FIELDS`。內容變更建立新 guideline version，`force_guideline` 本身不是內容版本觸發條件。

每個 run 釘住同 task 的不可變 guideline version。Dry 必須與其 round 一致；Official 在發布交易釘住當下版本，不假設必然等於最新 Dry。015 FR-066／`TaskProfile` 的 modal 與側欄皆解析該 run 的版本，保持既有確認閘門契約。

## Membership and assignment

依 014 FR-010s-1／FR-010t，目前 reviewer roster 以 membership 關聯與排序為來源，`reviewer_ids`／`arbiter_ids` 是 user ID 投影。發布交易凍結當下所選 active reviewer membership、仲裁資格與排序，以保存歷史候選輸入。發布仍檢查有效的 `reviewer_ids - arbiter_ids` 池非空；arbiter 空集合依既有警示流程處理。

凍結候選池不授予後續操作權限；每次讀取、提交、分派或仲裁皆重查 live active membership、permission matrix 與資源／角色條件。停用立即撤權但保留候選歷史。015 FR-093 的 sticky review assignment 繼續從 submission 推導，014 的 review assignment 僅作唯讀投影；不得新增第二份 persisted `ReviewAssignment.review_unit_id` 真相。

014 FR-005f～FR-005l／FR-010u 與 015 FR-051／FR-093、`AnnotationListItem`／`AnnotationRecord`／`ReviewUnit` 要求穩定 run／assignment 範圍。停用 annotator 保留已提交歷史，只將未完成 slot 退回未指派；重新指派保留 slot ID，重新啟用不自動取回原工作。FR-005h 的排除是每 slot 最多一次且不可撤回／刪除的 V1 事件，未指派不等於排除；誤排除的補償流程需另訂契約。

提交分母是同 run 未排除 slot（含未指派），重指派不增加分母。annotation assignment、review unit 與爭議 output item 是不同聚合單位，不共用分母；015 定義 review 狀態與單位，本 change 只對齊身分，不建立 annotation/review 的實體表或 FK。

## Transactions and later database verification

依 ADR-022，service 擁有轉換與前置檢查。未來建立 task 時，初始 config／guideline、sealed dataset 綁定與建立者 leader membership 必須原子保存。發布時驗證預期狀態與版本、最新回合／IAA 前置條件、修訂紀錄、成員池及抽樣餘額；round、snapshot、run、items、assignments、reviewer candidates、transition／audit 全部成功或全部失敗。snapshot digest 與有序 membership、實際 item 數須一致，不得露出半完成清單。外部副作用依 ADR-022 於 commit 後處理，須可重試及恢復。

014 FR-010f-6 的冪等語意為同發布鍵、同內容重試回傳原發布；同鍵異內容衝突，不同鍵重複發布同 round 或第二次 Official 亦衝突。API key 儲存形狀、錯誤 envelope 與鎖策略不在本文件新增。併發版本／狀態檢查及交易失敗不得產生重複 run 或半套 assignment。

| 後續驗證面向 | 必須保留的實測邊界 |
|---|---|
| 身分與約束 | SQLite／PostgreSQL 分別證明 scoped FK、round 唯一、同 cycle item 不重疊、單一 open cycle、snapshot 不共享與 task 終身 Official 唯一；nullable round 的一般複合 UNIQUE 不足以保證 Official 唯一。 |
| 併發與重試 | DBA 提議 PostgreSQL row lock／交易衝突重試、SQLite serialized write／busy retry；具體策略須以重複發布、同鍵異內容、轉回 draft 與發布競爭等 Red tests 驗證，尚未選定實作。 |
| 方言差異 | UUID、JSON／JSONB、UTC、boolean／enum 約束及 SQLite 每連線 FK 啟用都需實測；不能用 SQLite 綠燈宣稱 PostgreSQL 併發安全。SQLite Lite 的用途依 ADR-024（`docs/adr/024-database-quickstart-sqlite-tiered.md`）。 |
| 安全與歷史 | 先以獨立 Red 證明停用即時撤權、重指派保留 slot、跨 cycle 統計隔離、版本重現及遞迴 answer leakage 阻擋，再進 Green。 |
| Migration 與效能 | 未來 migration 獨立 PR，分 upgrade、downgrade、roundtrip 任務；run 清單、個人佇列、歷史查詢以 EXPLAIN 與 FK／query index 檢查決定索引，不預先宣稱 JSON 索引必要或已有效。 |

## Alternatives, risks and rollback

DBA 方案 B（只留外部 manifest）難以用 DB 關係保證 item membership 與 assignment 一致，方案 C（單一 JSON task/run 文件）難以表達穩定關聯、唯一性與併發歷史，因此採方案 A。代價是 item／assignment 歷史與 reviewer 候選快照列數增加；實體儲存量及查詢成本留待負載與 migration 設計確認。

主要相容性風險是舊消費端仍用 task×stage×round、單一 task snapshot 或目前版本 pointer；014 v6.0.0 已標示 BREAKING 規劃修訂，後續實作不得假設舊資料已完成轉換。config 與 schema 同步版本會留下 digest 相同的多個版本，這是避免第二份 schema 版本真相的明確取捨。候選快照與 live authorization 分離須有撤權測試；終局排除若需修正，不能直接改寫證據。

本 change 無部署資料可 downgrade。若撤回，以新的文件修訂／revert commit 同步處理 013／014／015、ADR-022 與 OpenSpec 相依引用，核對版本及 Changelog；有下游依賴時先列明影響再裁決，不刪除歷史。未來物理部署的資料搬遷、回填與 rollback 計畫須另行審核。

## Projection and verification

本文件只建立決策與來源的對應，不把 DBA 舊行號複製為 canonical citation。依 `docs/sdd-workflow.md` §6.1／§6.2，OpenSpec schema validation、Project SDD lint、適用 code/test gates 與 Source-Verify + write-back/archive 是四個分開的 gate。此次純文件工作核對來源 ID／版本／Changelog 與 diff；資料庫、安全和 API runtime 測試仍屬後續實作證據，不能由文件驗證替代。

final PR 在前置 gate 與 Source-Verify evidence 完成後才 archive；archive 後須逐條 grep 驗證 derived view 的每個正典引用可定位，完成 write-back 才算通過第 4 層。單獨完成 design.md 不宣告整個 change 已 archive 或全部 gate 已通過。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| II. Generalization-First | config／schema 版本適用所有 outputs 組合，無 task type 核心分支。 |
| III. Data Fairness、XI. Security | 抽樣只用公開 item，私有 split／答案不進 run manifest 或 annotator 路徑。 |
| XIV／XVI. Lineage and Reproducibility | sealed pool、每 run snapshot、精確 config/schema／guideline 與穩定 slot 保存重現依據。 |
| XV. Role-Based Access Control | 歷史 reviewer candidate 不替代 live membership、矩陣及資源授權。 |
| XVIII. Deployment Safety、XX. Source of Truth | 14 張表皆候選未部署；三份 owning spec 與 Accepted ADR 為來源，物理 FK／API／migration 保留獨立流程。 |

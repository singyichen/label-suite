# Design: annotation-review-physical-contract

## Goal

為 issue #1160 的 annotation／review 規劃切片建立可追溯且不誤稱已部署的寫入契約，使同一 run 的標記、審核、仲裁、例外與歷程資料可由穩定 assignment 身分串接，並保障私有草稿與隱藏答案隔離。

## Source and relational boundary

`specs/task-management/014-task-detail/spec.md` 擁有 run／assignment、停用與重派；`specs/annotation/015-annotation-workspace/spec.md` 擁有答案、審核、仲裁與例外決策。八張候選表為 `annotation_record`、`annotation_review_draft`、`annotation_review_submission`、`annotation_review_decision`、`annotation_review_submission_revision`、`annotation_arbitration_vote`、`annotation_exception_resolution`、`annotation_history_event`。每張表有非空 UUID PK；子表的 `(run_id,assignment_id)` 須複合 FK 指向 `task_annotation_assignment(task_run_id,id)`，父表遷移前先有同序 UNIQUE。`ReviewUnit`、`DisputeItem` 和 `ReviewAssignment` 維持推導值，無獨立表或狀態快照。

`annotation_record` 以有效狀態部分唯一鍵保證每 assignment 最多一份現行標記，舊 `abandoned` 草稿保留原作者。`annotation_review_draft` 僅本人可見並在送出或失權時清除／失效。`annotation_review_submission` 以 `(run_id,assignment_id)` 唯一鍵保證單一 sticky reviewer；`annotation_review_decision` 每 outKey 一列，提交時全量驗證；不可變 `annotation_review_submission_revision` 保留每次正式版本。仲裁票與例外收尾各按 `(run_id,assignment_id,output_key,item_key)` 唯一；歷程以同單位 `event_no` 排序且只追加。

## Span key and transactional rules

015 FR-024A／FR-052 的 `sequence_tagging` 答案為 `spans[]` 半開區間，每個差異項的邏輯鍵是 `(start,end,label)`，同文字不同 offset 不合併，改 label 視為舊項移除及新項新增。物理 `item_key` 必須帶型別及編碼版本；精確跨 SQLite／PostgreSQL canonical bytes、字串正規化與 collision 測試需在 migration 前固定。`entity_recognition` CompactAnswer 位置落差保持獨立待決；此 change 不宣稱已修復。

寫入同一 assignment 時必須序列化標記、審核與仲裁：首次 reviewer 正式提交後，annotator 不能再覆寫來源；原 reviewer 僅在 `disputed` 且全單位無票時可改判，同交易保存不可變修訂、決策與事件；任一票提交後審核凍結。仲裁者按目前全部爭議鍵同一 batch 原子寫入，鍵和來源 digest 均須驗證，每鍵只有一票；同 batch key／內容重送回原結果，不同內容或第二票拒絕。`reject` 留在票表，PL 的一次例外收尾另寫唯一 resolution，不覆寫票。PostgreSQL 使用行鎖；SQLite Lite 使用序列化寫交易、條件更新與 UNIQUE 作防線，不假設 `SELECT FOR UPDATE` 有效。

015 FR-065 目前允許以 idempotent PUT 原地覆寫投票、改 `voted_at`，且只在整個單位 `finalized` 後停止改票；這與 V1 唯一不可變票衝突。delta 以完整 FR-065 新條文取代四段舊規則，同時讓 FR-061 的 `votes[]` 實際只有零或一筆，沒有挑「最新票」的讀取分支。

## Privacy, types, migration impact

答案 JSON 只存通過釘住 config registry 驗證的可見 `OutputAnswer[]`，固定身分、責任、版本、決策與時間仍為關聯欄位。不得以 FK 直連 `dataset_item_private`，亦不得把隱藏答案、gold/test 旗標放入 manifest、草稿或一般歷程投影。API 採 allowlist；寫入驗當前 active membership 與資源條件，歷史 actor membership 不授權。`finalized_value` 必須區分「合法 JSON null」與「沒有定案值」。

這是 DB schema **候選**設計；沒有 ORM、migration、API 或現成雙庫測試。未來實作需分別測 SQLite `PRAGMA foreign_keys=ON`、PostgreSQL JSONB／`timestamptz`、複合 FK、部分唯一鍵、並發、版本衝突、授權拒絕、upgrade／downgrade／roundtrip 與敏感資料不外洩。保留期、`ON DELETE`、審計事件責任及 gold／export 存放仍須獨立定案。

## Verification and source order

先更新 014／015 正典版本、Changelog 與 AC／SC，再由六欄物理字典導出 NoteCraft `.er.json`。來源檢查器核對每表欄位、型別、必填、PK、真實單欄 FK、Mermaid edge 與候選狀態；複合 FK 只能在 Wiki 說明和後續 migration 測試驗證。OpenSpec schema、Project SDD lint、來源與視覺驗證、archive 後 Source-Verify 為不同閘門，不互相取代。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| II／XIV. 通用與 lineage | 可配置答案只經 registry 驗證，歷史 schema／review revision 不被目前值覆寫。 |
| III／XI. 公平與安全 | 未提交草稿、前任答案及 private item 嚴格隔離，所有讀取與歷程以角色 allowlist 投影。 |
| XV. 權限 | 當下 membership、指派與非當事資格逐次檢查，歷史指派不作授權。 |
| XVIII／XX. 部署與來源 | 候選表未部署；014／015 正典高於本設計和 NoteCraft，未來雙庫 migration 須有回滾。 |

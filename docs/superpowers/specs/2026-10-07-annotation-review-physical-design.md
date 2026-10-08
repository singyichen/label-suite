# Annotation／Review 實體候選設計（issue #1160）

## 目的與界線

為 `specs/annotation/015-annotation-workspace/spec.md` 的正式後端資料設計一組可追溯、可在 SQLite Lite 與 PostgreSQL 正式機驗證的候選實體，承接 `task_run`、`task_annotation_assignment` 的穩定身分。成功條件是不同 cycle 的相同顯示樣本不混入、審核草稿不外洩、每個爭議項的裁定及例外處置可回溯，且任何標記者路徑都無法讀到私有答案。這是設計裁決，**八張表全為未部署候選**；本文不新增 ORM、migration、API、gold、品質報告或匯出實體。依據：015 FR-014S／FR-049／FR-051／FR-059／FR-061／FR-062／FR-093／FR-095／FR-097／FR-104、014 FR-010f／FR-010t、foundation FR-105、ADR-024／037。

`run_id × assignment_id` 是正式作業及審核單位身分；`sample_id`、R1、`run_type` 和路由上的 `annotator_id`／`reviewer_id` 只供呈現或查詢上下文，不作授權或唯一鍵。子表皆使用 `lower_case_snake`、單數及 `annotation_` 前綴；每表有非空 UUID 主鍵。六張單位表各存 `task_id`，並以 `(task_id,run_id,assignment_id)` 複合 FK 指向 `task_annotation_assignment(task_id,task_run_id,id)`，父表 migration 必須先增加同序 UNIQUE `(task_id,task_run_id,id)`；membership、候選名冊與同單位來源亦以複合 FK 綁定（見實體字典 §4 X-04、S-02、N-01、V-04、E-02、H-05）。版本與樣本仍依 assignment → run → cycle／dataset item 解析；不重複顯示 sample ID、run type 或 annotator 名稱。所有 FK／CHECK／UNIQUE 均為**候選**，不是現有資料庫事實。

## 持久化切分

| 候選表 | 一列代表 | 主鍵、候選唯一鍵與主要參照 | 保留欄位與寫入邊界 |
|---|---|---|---|
| `annotation_record` | 一個 assignment 的一位受派者標記草稿／提交嘗試 | `id` PK；部分 UNIQUE `(run_id,assignment_id) WHERE status IN ('saved','submitted')`；複合 FK → assignment；`author_membership_id` → `task_membership.id`（須驗同 task／annotator） | `answer_payload`（版本化、依釘住 config 驗證的 `OutputAnswer[]` JSON）、`note` 可空、`version` 正整數樂觀鎖、`status` 限 `saved/submitted/abandoned`、`saved_at`／`submitted_at`／`abandoned_at`。未儲存的 `pending` 由缺列推導。重派前舊未提交列變 `abandoned` 且保留原作者與內容，新受派者另建列；一般清單只取非 abandoned 列。 |
| `annotation_review_draft` | 一位 reviewer 對一個單位未提交的決策草稿 | `id` PK；部分 UNIQUE `(run_id,assignment_id,reviewer_membership_id) WHERE invalidated_at IS NULL`；複合 FK → assignment；reviewer FK → membership | `decision_payload` JSON（逐 outKey 的三向決策及理由；只保存 015 FR-014S 承諾的草稿範圍）、`version`、`updated_at`、`invalidated_at` 可空；僅目前被指派的本人可讀，送出審核同交易清除有效草稿。失權或指派變動時將舊列失效且私下保留，不讓其於恢復資格後誤還原。不能和提交共表，也不能因「已有草稿」發出其他角色可見的事件。 |
| `annotation_review_submission` | 一個單位唯一 reviewer 的目前已提交審核 | `id` PK；UNIQUE `(run_id,assignment_id)` 阻止兩位 reviewer 對同單位形成並列提交；複合 FK → assignment；`reviewer_membership_id` → membership | `version`、`submitted_at`、`updated_at`；同一 reviewer 依 FR-103 明示編輯後以樂觀鎖更新此 head 及其決策子列，舊決策由不可變 revision／history 保留。V1 一旦本單位有任一仲裁票，即禁止再次修改此 head。提交者黏著從此列推導，不建指派表。 |
| `annotation_review_decision` | 上列提交中的一個 outKey 決策 | `id` PK；UNIQUE `(review_submission_id,output_key)`；FK → `annotation_review_submission.id` | `output_key` 對釘住的 `outputs[]` 驗證；`decision` 限 `approve/modify/bypass`；`corrected_answer` JSON 僅 `modify`；`reason` 僅 `modify/bypass` 必填；`decided_at`。逐 outKey 拆列，避免整份審核答案覆寫時漏驗某個決策、理由或型別；單位提交時必須對全部 outKey 完整驗證並同交易替換。 |
| `annotation_arbitration_vote` | 一位合格仲裁者對一個**推導爭議鍵**的一次終局裁定 | `id` PK；UNIQUE `(run_id,assignment_id,output_key,item_key)` 阻止同鍵重投；複合 FK → assignment；`arbiter_membership_id` → membership；`review_revision_id` → 當次不可變提交修訂 | `choice` 限 `adopt_a/adopt_b/reject`、`reason`（三種 choice 都必填且非空白，與 `adjudicated` 歷程同交易保存）、`has_finalized_value`、`finalized_value` JSON 可為合法 null、`source_digest`、`voted_at`、`decision_batch_id`（請求冪等 UUID）、`decision_batch_digest`（完整 batch canonical 摘要）。`adopt_a/b` 必須有 `finalized_value` 屬性，B 為 reviewer bypass 時合法值可為 JSON null；`reject` 沒有定案值。V1 單位全爭議項同交易提交一個 batch，一鍵只有這一票；`votes[]` 讀取形狀可仍為單元素。 |
| `annotation_exception_resolution` | 某個 `reject` 爭議項的一次已確認收尾 | `id` PK；UNIQUE `(run_id,assignment_id,output_key,item_key)`；複合 FK → assignment；`arbitration_vote_id` → 導致入池的唯一 reject 票；`resolved_by_membership_id` → PL membership | `action` 限 `adopt_annotator/adopt_reviewer/custom_answer/exclude_from_dataset`；`reason` 非空；`has_finalized_value`＋`finalized_value` JSON 表示定案值存在性，`exclude_from_dataset` 不得有值；`custom_answer` 僅 Official 且值非 null；`resolved_at`。四動作皆先選後確認，只有確認才插入；終局排除不可藉重送覆蓋。這是爭議**輸出項目**的收尾，不是從 `dataset_item`／run 清單實際刪列。 |
| `annotation_history_event` | 一個單位中一次不可變的標記／審核／仲裁／例外動作 | `id` PK；UNIQUE `(run_id,assignment_id,event_no)` 保證同時戳排序；複合 FK → assignment；`actor_membership_id` → membership | `action` 限 015 FR-086 八值，`actor_task_role` 記錄當下角色、`output_key` 可空、`reason` 可空、`result_snapshot` JSON 可空、`started_at`／`lead_time_ms` 可空、`occurred_at`、來源寫入的 record/review revision/vote/resolution ID（各可空；審核事件指向不可變 revision，由服務驗同單位）。append-only，原始答案和理由依 FR-062／FR-090 在資料供給層遮蔽；微型衝突歷程及清單耗時由此推導，不另存摘要。 |
| `annotation_review_submission_revision` | reviewer 每次正式提交的不可變修訂快照 | `id` PK；UNIQUE `(review_submission_id,version)`；FK → `annotation_review_submission.id` | `decision_payload` JSON（當次全部 outKey、修正值與理由的完整已驗證快照）、`submitted_at`。FR-103 允許修改已提交判斷，歷史事件單獨保存摘要不足以精確重建舊版爭議輸入；此表只保存提交版本，不另代表第二位 reviewer 或第二份指派。仲裁票 `source_digest` 應含此版本的標識與對應標記提交版本。 |

### 實體與推導值的界線

- `ReviewAssignment`／`getAssignedReviewUnits()`：由當前 run 的 `task_run_reviewer_candidate`、有效 membership、完整單位宇宙及已提交的 sticky reviewer 決定；Dry 黏著鍵 `(run_id,dataset_item_id)`，Official 鍵 `(run_id,assignment_id)`。不得加持久化 `review_assignment` 表。已提交 reviewer 離冊可保留歷史，但即時授權仍可能拒絕讀寫。
- `ReviewUnit`：由已提交標記、唯一已提交 reviewer、有效仲裁／例外結果推導 `pending/disputed/finalized`；標記未提交則不成立。不得存可漂移的 `review_unit.status` 或 finalized 快照。
- `DisputeItem`：由凍結的標記提交版本及 reviewer 修訂版按 FR-052 計算 `output_key × item_key` 與 A/B 值；不得另建 `annotation_dispute_item`。`annotation_arbitration_vote`／`annotation_exception_resolution` 只指向該鍵並儲存決策，不複製 A/B 值。V1 首票後來源不再改寫，服務仍以 `source_digest` 偵測不一致並拒絕把不匹配票當成有效裁定。
- `OutputAnswer` 是 `annotation_record.answer_payload` 中經版本化 registry 驗證的值，不因八種 output type 建八種硬編的表；可查的責任、身分、決策、時間則保留關聯欄位。此 JSON 邊界不允許繞過 config 驗證。

## 正典修訂先決條件

015 v6.0.0 FR-024A／FR-052 已將 `sequence_tagging` 改為 `{start,end,label}` span 集合；但目前有效的 **FR-059 第 4 點**仍寫「逐 token 位置」，**FR-061 第 7 點 (a)** 的計數粒度亦重複此舊敘述；「關鍵實體」中的 **OutputAnswer** 仍列 `{tokens,tags,scheme,unit}`。這些是同一現行規格中的活文字落差，不是被刪線標明已廢止的沿革。先於 015 的 canonical spec 補丁版（版本與 Changelog 依 SDD 規則更新）作以下精確修正，再將 `item_key` 放入物理字典／NoteCraft：

1. FR-059(4) 及 FR-061(7)(a) 的 `sequence_tagging` 粒度改為「每個以 `(start,end,label)` 識別的 span 一項；某 span 改 label 產生原項移除與新項新增兩項」，不再使用 token 位置。`item_key` 需以型別化 canonical encoding 保存三元組，不能用裸字串拼接造成碰撞；其演算法版本及編碼格式在 schema 落地前固定。
2. OutputAnswer 的 `sequence_tagging` payload 改為 `spans: [{start,end,label}]`、`snap_unit`、`bypass`、`version`；移除 `tokens/tags/scheme/unit`，對齊 FR-024A-3。文中的 `entity_recognition` CompactAnswer 位置落差已被 FR-052 明列為另一問題，不能順手假定其鍵已採 offset；其 canonical key 亦須於仲裁實作前裁決。
3. 修訂對應 AC／SC、Spec Dependencies 的下游引用及 Changelog，作 Source-Verify／write-back。文件中的舊版 changelog 和已刪線沿革保留原貌；只改目前生效的契約。修訂後以含相同文字、不同 offset 的 span 測碰撞，以改 label 測兩項差異及仲裁待辦計數。

### DBA 裁決建議：V1 寫入凍結與單次裁定

以下是**本設計建議**，不是目前已生效的 014／015 正典。其目的在 V1 避免已裁定項因來源改寫而變成另一項，並使 migration 有可驗證的唯一鍵。正典修訂未合併前不得把它們當成既有產品行為。

1. **標記來源**：第一次 reviewer 正式提交後，該 `run_id × assignment_id` 的 `annotation_record` 對 annotator 凍結，Dry／Official 同樣適用；此前允許原受派者依 `version` 儲存／重送。這是「審核來源已使用」的完整性鎖，與 FR-101 僅針對 Official 已定稿的鎖分屬不同條件。新 Dry 回合是不同 `run_id`，不被舊回合鎖住。reviewer 提交與 annotator 更新競爭時，鎖定同一 assignment，先提交的 transaction 決定結果，另一方回衝突而非覆寫。
2. **改判邊界**：僅當本單位仍為 `disputed` 且尚無 `annotation_arbitration_vote` 時，原 reviewer 可依 FR-103 明示入口修改已提交審核；新 revision 與決策子列、歷程同交易寫入，舊 revision 永久保留。`finalized` 單位仍按 FR-051／FR-094 唯讀。一旦此單位已有任一票，reviewer 審核提交永久凍結；改判入口改為唯讀說明，直接寫入返回衝突，任何角色不得靠清除票解鎖。這修訂 FR-103 明言「不阻擋已有 votes」的現有範圍，屬需正式 SDD 的行為變更。
3. **單次裁定**：V1 只接受同一仲裁 batch 對當前**全部**爭議鍵各寫一票，原子提交後每鍵恰一筆不可變票；`UNIQUE (run_id,assignment_id,output_key,item_key)` 擋第二次。重送以 `decision_batch_id` 和 `decision_batch_digest` 對比原 batch：同 key／同內容回既有裁定，異內容或新 key 重投拒絕。已有票者不再選「最新票」。`reject` 進例外池且該票不變，收尾以 `annotation_exception_resolution` 唯一列記錄。沒有重投、改投、撤票或重啟仲裁的 V1 操作。若未來確需重啟，另建明示補償流程與版本規則，不在本 schema 偷留可覆寫欄位。
4. **未提交草稿重派**：membership 停用／移除導致未提交 slot 退回未指派池，或 PL 明確重派時，同一交易將舊 `annotation_record.status='saved'` 改成 `abandoned`、寫 `abandoned_at`，保留 `author_membership_id`、答案與責任鏈；原作者失去寫權，新受派者不得讀其草稿，從自己的空紀錄開始並使用同一穩定 assignment ID。已提交列不可走此路徑。若 reviewer 失權或指派變動，未提交 `annotation_review_draft` 同交易寫 `invalidated_at`、只保留供受限稽核，不能造成 sticky；原 reviewer 重新獲權也不自動恢復舊草稿，新有效候選按 FR-093 重新推導。

**正典修訂精確目標**：

| 來源位置 | 應加入／修正的規則與驗收 |
|---|---|
| 015 FR-051、FR-101 | 新增「reviewer 首次提交後，本 assignment 的 annotator 答案與草稿皆不可再寫」的來源完整性鎖，明列兩種 run type、不同 Dry 回合不互鎖；FR-101 的 Official finalized 鎖保持原語意。新增跨兩角色並發的 AC，驗證只一方成功、已提交 A/B 來源不漂移。 |
| 015 FR-103 尾段「明確排除」及改判入口 | 將「不判定／不阻擋已有 votes」改為 V1 明確限制：仍 `disputed` 且無票時同一 reviewer 可重送；單位有任一仲裁票後改判入口唯讀、直接提交拒絕；已 `finalized` 仍唯讀。新增有票／無票／已定稿 AC，驗歷程與 revision 保留。 |
| 015 FR-061(4)、FR-059(3)、FR-095 的「最新裁定」敘述 | 固定單位全爭議項同 batch 一次性裁定、每鍵至多一票、不覆寫；`votes[]` 為零或一筆，`reject` 的唯一票待 FR-095 一次收尾，所有讀取／計數只看該票及可能的唯一 resolution。更新對應 AC，覆蓋並發第二名仲裁者、相同／異內容重送及 reject→收尾。 |
| 014 FR-005f／FR-005l、FR-010f-4 與 015 AnnotationRecord／FR-014S | 明列未提交 annotator 草稿在 slot 退回或重派時轉 abandoned 並保留原作者，繼任者看不到草稿、從空紀錄開始；提交紀錄不 abandoned。reviewer 草稿離冊後不黏住，不可因失權而外洩。增加停用、重派、重新啟用及跨人讀取 AC。 |

上述四項規則已回寫 015 v12.0.0／014 v7.0.0 的 FR／AC／SC、版本與 Changelog；後續 runtime 仍須另行實作與驗證。DBA 設計文件不能自行取代 canonical spec。

## 完整性、索引、交易與資料隔離

- **主鍵／FK**：所有 `id` 為 UUID 非空 PK；所有 `run_id,assignment_id` 非空且指同一 assignment。所有 membership 欄位以 `(task_id,<membership 欄>)` 複合 FK → `task_membership(task_id,id)` 保證同 task；角色與 active 狀態仍由服務層核對，單靠 FK 不能證明角色。reviewer 另以 `(run_id,reviewer_membership_id)` 對應 run 候選名冊，arbiter 因 project_leader 的 FR-023 fallback 豁免。`output_key` 必須屬 run 釘住的 schema，且同一個 review submission 恰覆蓋每個輸出類型一次，需服務層交易驗證。FK 刪除策略暫按 RESTRICT 保護歷史；保留期及匿名化政策定案後才能確定 migration。
- **候選索引**：`annotation_record` 部分 UNIQUE 只涵蓋非 abandoned 列；依舊草稿保留查詢另設 `(run_id,assignment_id,author_membership_id)`。其他表的 `(run_id,assignment_id)` UNIQUE／前綴支援單位讀取；`annotation_review_draft(reviewer_membership_id,run_id) WHERE invalidated_at IS NULL` 支援本人有效草稿，舊列由受限稽核查詢；`annotation_review_submission(reviewer_membership_id,submitted_at,id)` 支援本人已審工作；`annotation_arbitration_vote` 的四欄 UNIQUE 已支援單位與鍵定位，`(run_id,assignment_id,decision_batch_id)` 供冪等重送查詢，不加重複的「最新 revision」索引；逐票重複的 batch digest 是明示的不可變反正規化，同一 batch 的 digest 必須同交易核對一致；`annotation_history_event(run_id,assignment_id,event_no DESC)` 支援責任鏈。FK 反查未被上述左前綴覆蓋者補索引；JSON 暫不建 GIN，待實際 predicate 與 PostgreSQL `EXPLAIN` 佐證。
- **原子提交**：annotation 儲存／提交採 `version` compare-and-swap，先確認無 reviewer 正式提交；review submission head、決策子列、不可變 revision、history event、草稿清除須一交易，先確認單位無票。仲裁先驗全部當前爭議項、非當事資格與 `source_digest`，整個 batch 票和事件一起提交；例外確認、定案值及事件同交易，重送須冪等。三類寫入鎖定同一 assignment，以序列化「標記提交／審核提交／仲裁」的競爭。PostgreSQL 可用行鎖，SQLite Lite 需序列化寫交易／條件更新與 UNIQUE 作最後防線，不能假設 `SELECT FOR UPDATE` 有效。每條寫路都驗當前 active membership、所選 task role、ADR-037 矩陣、assignment／roster／candidate 與資源條件，prototype query 不授權。
- **答案隔離**：八表只存標記／審核／仲裁決策，不含 `dataset_item_private.hidden_answer`、`declared_split` 或 gold/test 旗標；FK 只指公開 `dataset_item` 經 assignment 的身分鏈。annotator API 必須使用 allowlist 投影及 FR-090／062 遮蔽；未提交 reviewer draft 連存在與否都不能向其他人透露。PostgreSQL 限制角色對私有表 SELECT；SQLite 由 repository 邊界與洩漏測試保證。歷程 snapshot、例外理由、JSON 欄位同樣可能含答案與個資，不能把 `audit_events` 泛用查詢權套到這些表。
- **雙庫驗證**：SQLite 每連線啟用 `PRAGMA foreign_keys=ON`、JSON schema 在應用層驗；PostgreSQL 用 JSONB／`timestamptz`。兩庫都測 FK、唯一鍵、樂觀鎖、同時提交、失權、來源版本變動、null 定案值與 private answer denial。SQLite 時間讀回按 UTC 正規化。獨立 migration PR 必須附 upgrade／downgrade／roundtrip，不能把本設計圖視為已部署 schema。

## 在 migration 前仍需產品裁決

014 v7.0.0／015 v12.0.0 已收錄上述 V1 正典裁決；後續需以交易／並發測試驗證 runtime。未來的重新仲裁屬新需求，不預埋多票版本。

1. **工作 slot 細節**：014 的 `task_annotation_assignment.status` 完整值域、排除與未指派轉換仍需在 task/run 字典 §7 收斂；本文件已裁決與草稿相關的 `abandoned` 邊界，沒有憑此猜完整 slot enum。
2. **例外和排除的下游語意**：`exclude_from_dataset` 是輸出項目的終局排除，並不刪公開 dataset item；其與整個 assignment 的 `task_annotation_exclusion` 關係、導出分母和 run 完成條件需在 014／015 對齊。不得在這一步偷偷實作 gold、品質或 export 表。
3. **歷史與留存**：`annotation_history_event` 與共用 `audit_events` 的寫入責任、答案快照的可見時限、帳號刪除／匿名化及 FK `ON DELETE` 需形成保留政策；保留不可變責任鏈與個資刪除需求可能衝突，需以明示政策解決。

設計與六欄物理字典已完成，八表可作為**未部署候選**投影至 NoteCraft；migration 與 SQLite／PostgreSQL Red/Green 實測仍待後續切片。圖與字典均不得表述為已部署 Schema。

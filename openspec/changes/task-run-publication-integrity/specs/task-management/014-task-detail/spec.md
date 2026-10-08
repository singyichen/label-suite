> 正典：`specs/task-management/014-task-detail/spec.md`（v9.0.0 → v10.0.0，MAJOR）。本 delta 鏡射 FR-010f／FR-010f-6／FR-010f-7、AC-3.48～AC-3.50、SC-059～SC-061；未新增 ORM、migration 或 API。

## MODIFIED Requirements

### Requirement: FR-010f 發布清單與私有回執

- **FR-010f**（**v6.0.0 修訂，BREAKING**，issue #1160）：首次 Dry 發布開啟不可變身分的 `RunCycle`，釘住同任務 sealed `dataset_version_id`、不可變 `config_version_id`（含 schema）、資格池、seed 與演算法版本。資格池為該版本全部已接受 item；抽樣只讀公開 item 身分與 payload，不讀 `dataset_item_private`、`declared_split`、hidden answer 或受限 `source_ref`，亦不得在 run item／manifest 中加入 gold/test 標記。每次 Dry 或 Official 發布各自建立一份不可變 `sample_snapshot_id`，只凍結該次 run 的有序 item 清單、seed／演算法與 digest；R1 不預先封存 Official 清單，發布前的剩餘池只是推導值。關聯 run-item 清單為成員身分正典，外部 `selection_manifest_ref` 為相同清單的審計回執，digest 必須一致。
  - **v10.0.0 規範回執位元組**：公開清單按 `task_run_item.list_position` 排序，規範格式為 UTF-8；第一行固定為 `label-suite-run-items-v1\n`，其後每個 item 的小寫帶連字號 UUID 各佔一行、各以 `\n` 結尾，無額外空白或欄位。`selected_item_digest` 為這份完整位元組的 SHA-256 十六進位字串。`selection_manifest_ref` 是私有、不可覆寫的 content-addressed（內容定址）物件鍵，不是客戶端可取得的 URL。manifest／清單不得包含 hidden answer／答案、`declared_split`／split 或受限 `source_ref`，亦不得從私有欄位推導 gold/test 標記。

#### Scenario: FR-010f 對應 AC-3.45

- **GIVEN** item 的 private row 含 hidden answer 或 declared_split
- **WHEN** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料
- **THEN** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。（FR-010f；AC-3.45）

#### Scenario: AC-3.48 規範位元組與私有資料隔離

- **GIVEN** 同一 sealed version 和 seed 選出一組公開 item ID
- **WHEN** 發布 Dry 或 Official run
- **THEN** 規範位元組、SHA-256、私有回執及 SQL 清單逐位元一致，且不暴露答案、split、受限來源或 gold/test 標記

### Requirement: FR-010f-6 發布交易、冪等與失敗恢復

- **FR-010f-6**（**v10.0.0 修訂，BREAKING**，issue #1160）：發布服務須先驗證身分與權限、鎖定任務，按固定發布目標查已提交重試；若尚未提交，才驗證目前版本、狀態、sealed version、每個來源批次的公開／受保護欄位對映、成員與回合前置條件。每個選中 item 須經 batch 確認屬於 cycle 版本；任一跨版本 item 即整次拒絕。新發布先依 FR-010f 規範位元組寫入私有、不可覆寫的內容定址回執物件，讀回驗證完整位元組、`selected_item_digest` 摘要與持久性，之後才在**同一資料庫交易**提交 cycle（R1）、round（Dry）、snapshot 的 `selection_manifest_ref` 與 digest、run、run items、候選審核名冊、assignment、狀態轉換及稽核事件；提交前驗證 `item_count` 等於實際 run-item 數。外部物件寫入與資料庫提交不是同一 ACID 交易；回執寫入或讀回驗證失敗時 DB 不提交，DB 回滾可留下無引用物件，但不得留下可見的部分發布。資料庫提交後才可宣稱發布成功。
  - 發布 idempotency key 以 task、發布目標與 key 定址，另保存正規化請求內容摘要。發布命令須在首次嘗試前固定可跨重試辨識的目標：Dry 用同任務 `(cycle_no,round_no)` 唯一定位其 `trial_round_id`，Official 用 task 的單一正式發布定位；提交結果不明時沿用同一目標，不得新配回合身分。須先查已提交目標與 key，再執行會因首次發布而改變的狀態門檻或重新抽樣。Dry 以 `(task_id,trial_round_id,key)`、Official 以 `(task_id,key)` 分別約束冪等鍵，允許不同 Dry 回合重用同一 key。相同 key 與摘要的重試或並行重送回傳原 run／snapshot，不重新抽樣、不增加 assignment 或事件；同 key 異摘要／異內容拒絕為衝突，異 key 對同 round 重複發布或第二次 Official 亦拒絕。提交結果不明時先以資料庫冪等鍵查已提交 run，不重抽；既存回執缺失或摘要不符時拒絕讀取並告警，只能由 run-item SQL 正典重建相同位元組作受控修復，不能靜默換清單。清理無引用回執須超過交易／重試保護期、確認無活躍寫入租約且 DB 無引用；已引用物件不得刪除。並行請求須由資料庫交易與唯一性約束保證相同結果，SQLite 與 PostgreSQL 語意一致。

#### Scenario: FR-010f-6 對應 AC-3.42

- **GIVEN** 合法 Dry 或 Official 發布請求
- **WHEN** 相同 key／內容重送或並行重送
- **THEN** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。（FR-010f-6；AC-3.42）

#### Scenario: AC-3.49 失敗與重試不產生第二份發布

- **GIVEN** 合法發布命令與固定冪等鍵
- **WHEN** 同 key／摘要重送、回執驗證失敗、DB 回滾、提交結果不明或既存回執損壞
- **THEN** 同命令只回原 run，失敗不產生可見半套資料，不明提交先查 DB，壞回執拒絕讀取並告警

## ADDED Requirements

### Requirement: FR-010f-7 工作位唯讀狀態投影

- **FR-010f-7**（**v10.0.0 新增**，issue #1160）：`task_annotation_assignment` 僅保存穩定 slot、run/item 與可空的目前 `assignee_membership_id`，不得保存第二份 `status`。唯讀顯示狀態按此優先順序由同 run 的事實推導：存在終局排除證據 → 已排除；存在目前有效已提交 `annotation_record` → 已完成；受派者空值 → 未指派；存在目前受派者已儲存但未提交的草稿 → 草稿中；其餘 → 已指派待處理。`annotation_record` 自身生命週期仍為 `saved | submitted | abandoned`；舊草稿在停用、移除或重派的同一資料庫交易轉 `abandoned`，已提交紀錄保留，排除證據終局且不以空受派者代替。API／前端只接收此查詢投影，寫入與授權仍按即時 membership、run 和 slot 判定。

#### Scenario: AC-3.50 狀態優先序與草稿隔離

- **GIVEN** 同一 assignment 存在草稿、已提交紀錄、空受派者或終局排除的組合
- **WHEN** 查詢工作位顯示狀態或重派 slot
- **THEN** 依排除、提交、未指派、目前草稿與待處理的順序推導唯一狀態，舊草稿成為 abandoned，已提交與排除證據保留

### Requirement: AC-3.48 回執逐位元一致

48. **AC-3.48**（v10.0.0，issue #1160）：**Given** 同一 sealed version 和 seed 選出一組公開 item ID，**When** 發布 Dry 或 Official run，**Then** `task_run_item.list_position` 的有序 UUID 清單形成 `label-suite-run-items-v1` UTF-8 規範位元組，`selected_item_digest` 為完整位元組的 SHA-256 十六進位，私有不可覆寫 `selection_manifest_ref` 回執讀回與 SQL 清單逐位元一致；回執與標記者資料均無 hidden answer、`declared_split`、受限 `source_ref` 或 gold/test 標記（FR-010f）。

#### Scenario: AC-3.48 逐位元回執

- **GIVEN** 已知公開 item 清單與順序
- **WHEN** 發布並讀回回執
- **THEN** 位元組和 SHA-256 與 SQL 清單一致，私有資料不存在於回執

### Requirement: AC-3.49 重試與失敗恢復

49. **AC-3.49**（v10.0.0，issue #1160）：**Given** 合法發布命令與固定冪等鍵，**When** 同 key／同摘要重送、物件寫入或讀回驗證失敗、DB 回滾、提交結果不明，或已提交回執後來缺失／摘要不符，**Then** 已提交重送只回原 run／snapshot 且不重新抽樣，異摘要拒絕；物件失敗不提交 DB，回滾不留下可見的部分發布；不明提交先查 DB 冪等鍵，壞回執拒絕讀取並告警，無引用殘留物只在租約與引用檢查後清理（FR-010f-6）。

#### Scenario: AC-3.49 安全重試

- **GIVEN** 發布命令可能重送或在提交附近故障
- **WHEN** 同 key 重送、外部物件失敗或提交結果不明
- **THEN** 依正典冪等鍵回原 run 或拒絕，無可見半套資料或靜默回執替換

### Requirement: AC-3.50 唯讀狀態優先序

50. **AC-3.50**（v10.0.0，issue #1160）：**Given** 同一 assignment 曾有已儲存草稿、已提交紀錄、空受派者或終局排除的不同組合，**When** 查詢工作位顯示狀態，**Then** 依排除 → 已提交 → 未指派 → 目前受派者草稿 → 已指派待處理的順序得出唯一狀態，assignment 無獨立 `status`；重派會將舊未提交草稿轉 `abandoned`，不改已提交或排除證據（FR-010f-7）。

#### Scenario: AC-3.50 終局排除優先

- **GIVEN** 工作位有終局排除且受派者為空
- **WHEN** 查詢顯示狀態
- **THEN** 顯示已排除而非未指派，且沒有持久化 assignment status

### Requirement: SC-059 清單一致與資料隔離

- **SC-059**（v10.0.0，issue #1160）：通過 AC-3.48：同一有序公開 item 清單的 `label-suite-run-items-v1` 規範位元組、`selected_item_digest` 與私有回執讀回 100% 相同；抽樣、回執與標記者回應的 hidden answer／split／受限來源洩漏數為 0。

#### Scenario: SC-059 驗證回執與隱私

- **GIVEN** 一組公開 item 清單
- **WHEN** 比對 SQL、回執與標記者回應
- **THEN** 規範位元組一致且私有資料洩漏數為零

### Requirement: SC-060 發布失敗與冪等

- **SC-060**（v10.0.0，issue #1160）：通過 AC-3.49：相同 key／摘要的重送新增 run、snapshot、assignment、transition 數皆為 0；物件失敗、跨版本或 DB 回滾後可見部分發布數為 0；不明提交不重抽，壞回執拒絕讀取並告警，清理不刪除已引用物件。SQLite／PostgreSQL 與物件儲存實作須另以失敗注入驗證，本次文件檢查不等於實測通過。

#### Scenario: SC-060 故障不宣稱成功

- **GIVEN** 並行重試、回執失敗或資料庫故障
- **WHEN** 執行發布與恢復
- **THEN** 不建立重複或部分發布，壞回執拒絕讀取

### Requirement: SC-061 工作位狀態正典

- **SC-061**（v10.0.0，issue #1160）：通過 AC-3.50：排除、已提交、未指派、已儲存草稿、已指派待處理五類交錯輸入皆得到唯一且按優先序一致的顯示狀態；assignment 持久化 `status` 欄數為 0，已提交／排除證據於重派後遺失數為 0。

#### Scenario: SC-061 狀態只由事實推導

- **GIVEN** 五類交錯工作位事實
- **WHEN** 查詢狀態並重派受派者
- **THEN** 每個 slot 只有唯一正確狀態，且無獨立持久化 status

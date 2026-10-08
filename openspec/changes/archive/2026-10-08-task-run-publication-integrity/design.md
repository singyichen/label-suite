# Task/run 發布完整性設計

## 目標

使已提交任務必有同任務的初始 config／guideline 指標；發布成功的 run-item SQL 清單與私有不可變回執逐位元一致，相同命令重試只回原 run；失敗不得留下可見半套發布資料，assignment 顯示狀態不得與標記紀錄或終局排除證據分歧。對應 014 `## 功能目標` 中的執行控制、進度與角色唯讀邊界。

## D1. 初建循環參照與 013 PATCH

`specs/task-management/013-task-new/spec.md` FR-006a 原已要求 task、建立者 membership、初始 config／guideline 與啟動設定同交易。預配置三個 UUID 後，候選 `task.current_config_version_id`、`current_guideline_version_id` 為非空；`(task.id,current_config_version_id)` 與 `(task.id,current_guideline_version_id)` 分別參照同任務版本表的複合候選鍵，採 `DEFERRABLE INITIALLY DEFERRED`，於提交時拒絕缺列或跨 task 版本。這只指定既有原子建立在循環 FK 下的實作精度，013 v8.3.1 以 PATCH 釐清，不另開 013 delta。`current_run_cycle_id` 因初建尚無 cycle 而維持可空；SQLite 每連線 FK 開啟與 Alembic 升降仍待實作驗證。

## D2. 回執格式與交易邊界

`task_run_item` 的 `(run_id,list_position)` 是順序正典。規範位元組固定以 UTF-8 寫 `label-suite-run-items-v1\n`，其後每個小寫帶連字號 UUID 加 `\n`；`selected_item_digest` 為完整位元組 SHA-256 十六進位。`selection_manifest_ref` 是私有、不可覆寫的內容定址物件鍵，不是客戶端 URL，回執不含答案、split、受限來源或 gold/test 標記。

服務先驗證權限並固定發布目標：Dry 以同任務 `(cycle_no,round_no)` 定址且重試沿用相同 `trial_round_id`，Official 以該任務唯一正式發布定址。依目標及 key 查已提交請求須先於會因首次發布而改變的狀態門檻與抽樣；新發布才驗證狀態與版本。Dry 的部分唯一索引是 `(task_id,trial_round_id,key)`，Official 是 `(task_id,key)`，不同 Dry 回合可重用 key。新發布寫入回執後讀回驗證位元組、摘要及持久性，再於單一 DB 交易寫入 cycle／round、snapshot 引用、run、run-item、候選 reviewer、assignment、狀態轉換與稽核。外部物件寫入不屬 DB ACID 交易；回執失敗不提交 DB，DB 回滾可留無引用物件但不可留下可見 run。

相同 key 與正規化命令摘要回原 run／snapshot，不重新抽樣；異摘要拒絕。提交結果不明時先查 DB 冪等鍵，已提交回執缺失或摘要不符則拒絕讀取並告警；只能由 SQL 清單重建相同位元組進行受控修復。無引用物件清理須超過交易與重試保護期、無活躍寫入租約且 DB 確認無引用；不可刪已引用物件。

## D3. Assignment 唯讀狀態

`task_annotation_assignment` 只存穩定 slot、run/item 與可空的目前受派 membership，不存 `status`。顯示優先序為：終局排除 → 已排除；目前有效已提交 `annotation_record` → 已完成；受派者為空 → 未指派；目前受派者已儲存草稿 → 草稿中；其餘 → 已指派待處理。`annotation_record` 自身維持 `saved | submitted | abandoned` 生命週期。停用、移除或重派在同一 DB 交易中把舊未提交草稿轉 `abandoned`，保留已提交紀錄與終局排除證據；API／前端只接收授權後的唯讀投影。

## D4. 刪除、保留與驗證界線

候選 task/run 關聯普通硬刪先採 `RESTRICT` 或等效拒絕，避免消除標記與稽核責任鏈。ADR-032 的稽核事件最低一曆年不是 task/run、答案與物件的最長保存期限；各資料類別保留上限與匿名化順序須於 migration 前另行裁決。文件與 NoteCraft 驗證只證實候選描述一致，不能代替 SQLite／PostgreSQL migration、競爭及物件失敗注入測試。

## 憲章檢查

- **Generalization-First**：格式按公開 UUID 清單定義，與 task outputs 無關。
- **Data Fairness／Security**：manifest、API 投影與標記者路徑均排除私有答案、split、來源及 gold/test 提示。
- **Test-First**：Red 測試先於正典與候選字典 Green 提交；不以修改測試放寬契約。
- **Database／No Silent Failure**：DB 原子提交、讀回驗證、壞回執拒絕及告警有明確失敗邊界。
- **Retention**：普通刪除限制與無引用物件清理分開；保存期限不憑稽核最低一年自行推定。

# Task/run 發布完整性候選設計（issue #1160）

## 目的與範圍

MVP 的任務建立與 Dry／Official 發布需留下可重現且相互一致的 task、版本、run、公開資料項目及標記工作位。此切片只定正典契約、未部署欄位字典和 NoteCraft 說明；不新增 ORM、migration、API 或資料庫實測。資料集分析 016／017 的報告表依既有 MVP 裁決延後。

成功條件：已提交任務必有同任務的初始 config／guideline 指標；發布成功後資料庫中的 run-item 清單與私有不可變 manifest 回執可逐位元驗證；相同發布請求重試不重新抽樣；標記工作位的顯示狀態不與標記紀錄或終局排除證據分歧。任一失敗不得留下可見的半套發布資料，標記者不得取得答案、split 或受限來源。

## 現況與選擇

| 議題 | 已有契約與缺口 | 採用方向 |
|---|---|---|
| 任務初建循環 FK | 013 FR-006a 要求 task、兩個版本和建立者 membership 同交易；task 字典暫將兩個當前版本指標列可空，無法在 DB 層排除已提交孤兒 task | 預配置三個 UUID，task 兩指標改為非空；兩組同任務複合 FK 採 `DEFERRABLE INITIALLY DEFERRED`。交易內先插 task，再插兩版本與 membership，提交時驗證 |
| Manifest 回執 | 014 FR-010f 規定 run-item 為成員正典，外部清單為審計回執；FR-010f-6 的「同交易」尚未區分外部物件與資料庫 | 先寫並驗證私有、不可覆寫的內容定址物件，後於一個 DB 交易提交其引用與所有發布列；失敗物件由延後清理處理，不能稱物件儲存和 DB 為同一 ACID 交易 |
| Assignment 狀態 | `task_annotation_assignment.status` 值域待決，且 `annotation_record.status` 和排除列已保存事實 | 不持久化第二份 assignment 狀態；由受派者、目前標記紀錄及排除列推導唯讀顯示狀態 |

## 初建任務與候選約束

先配置 `task.id`、`task_config_version.id`、`task_guideline_version.id`。`task.current_config_version_id` 與 `current_guideline_version_id` 均為非空；`(task.id,current_config_version_id)` 與 `(task.id,current_guideline_version_id)` 分別參照版本表同序唯一鍵，FK 延後到交易提交檢查。版本列的 `task_id` 反向 FK 可同樣延後。`current_run_cycle_id` 因初建沒有 cycle，仍可空。建立者 membership 與兩個版本都在同一交易；缺少任一列或跨 task 版本時提交失敗。PostgreSQL 的 migration 建表順序及 SQLite 每連線 `PRAGMA foreign_keys=ON`、循環建表、Alembic downgrade 均留待獨立雙庫 Red／Green 驗證。官方 [SQLite FK 文件](https://www.sqlite.org/foreignkeys.html)及 [PostgreSQL CREATE TABLE 文件](https://www.postgresql.org/docs/current/sql-createtable.html)均允許延後 FK 檢查；文件可行性不代替專案 migration 成功。

## 發布回執與失敗恢復

公開清單的規範位元組版本為 `label-suite-run-items-v1`：UTF-8、第一行固定為 `label-suite-run-items-v1\n`，之後按 `task_run_item.list_position` 逐行寫小寫帶連字號的 UUID 與 `\n`，沒有其他空白或欄位。`selected_item_digest` 是這份完整位元組的 SHA-256 十六進位字串，`selection_manifest_ref` 是私有 content-addressed 物件鍵而非客戶端可取用 URL。回執不得包含 hidden answer、gold/test 標記、`declared_split` 或受限 `source_ref`。

授權服務鎖定 task／目前版本後，先以 task、發布目標與 key 查已提交發布：相同正規化命令摘要回原 run／snapshot，異摘要拒絕；不能由重試重新抽樣。新發布依正典選出公開 ID 並先寫 write-once 回執，讀回驗證位元組、摘要與持久性；再由同一 DB 交易建立 cycle／round（視情況）、snapshot 引用、run、run-item、候選 reviewer、assignment、狀態轉換及稽核事件。資料庫提交後才對請求宣稱成功。回執寫入失敗則 DB 不提交；DB 回滾可能留下無引用物件。清理工作僅在超過交易／重試保護期、確認無活躍寫入租約且 DB 無引用時刪除；不得刪任何已引用物件。提交結果不明時先查 DB 冪等鍵，既存回執缺失或摘要不符時拒絕讀取並告警，由 SQL 正典重建相同位元組作受控修復，不能靜默換清單。

## Assignment 唯讀狀態

一個 `task_annotation_assignment` 保留穩定 ID、run/item/slot 與可空的目前受派 membership，不保存 `status` 欄。顯示狀態依以下優先順序推導：存在終局 `task_annotation_exclusion` → 已排除；存在目前已提交 `annotation_record` → 已完成；受派者空值 → 未指派；存在目前已儲存紀錄 → 草稿中；其餘 → 已指派待處理。`annotation_record` 自身的 `saved | submitted | abandoned` 仍是標記內容生命週期正典。停用或重派時，服務鎖定工作位，在同一交易將舊未提交草稿轉 `abandoned`、更新受派者並保留已提交紀錄；排除是另一個不可撤回的終局證據，不以空受派者代替。對前端/API 的狀態回應是查詢投影，授權仍按即時 membership 與 run 判定。

## 刪除、保留與驗證邊界

普通刪除先採 `RESTRICT`／等效拒絕，不用 cascade 或 `SET NULL` 消除 run、標記及稽核責任鏈；退回 draft 僅關閉 cycle 並保留歷史。這不是無限期保存許可。ADR-032 的稽核事件最低一曆年不自動成為 task/run、答案及檔案的最長期限；資料類別保存上限、刪除或匿名化請求、受限資產及被引用物件的清理順序，須由產品／隱私政策另行裁決，再啟動 migration。此切片不將該政策勾成完成。

先以分檔 Red 測試鎖定 013／014 正典、字典與 NoteCraft 的一致性，再寫 OpenSpec delta、驗證並 archive／Source-Verify。全圖因移除 assignment 的冗餘 `status` 欄，預期由 38 表／328 欄變為 38 表／327 欄；單欄 FK 數不變。最後檢查來源、plugin schema/build、Project SDD lint、正典版本／ID／Changelog、實際 Wiki／Diagram。所有結果仍是候選規劃，雙庫約束和物件儲存失敗模式要在獨立實作測試確認。

# Design: mvp-export-record-contract

## Goal

從 issue #1160 的匯出需求產生可稽核、可保留原檔的候選資料模型，消除 014 的單一 run／跨 run 及「快照重算／逐字元相同」衝突。

## 資料與寫入契約

`task_export` 一列是一個匯出請求與一份原始檔案；`task_export_run` 以 `(export_id,run_id)` 作複合 PK，`position` 正整數且同 export 唯一。`task_id` 在關聯表保留以供兩端同 task 複合 FK，是明示的完整性冗餘。run 的 dataset/config/schema/guideline/snapshot 版本沿已釘住的 run／cycle 解析，寫入檔案的 `manifest.runs[]`；不在子表重複保存版本欄。版本化條件快照保存有序 `selected_runs[]`，每項含階段與釘住身分，共用篩選在頂層 `filters`；混合階段時頂層 `run_stage` 必須為 `all`，不能用單一試標或正式標記值代替逐 run 階段。`scope_label`／`export_type` 另存顯示 metadata。

第一次匯出依驗證過的快照選資料，按共用序列化器產生檔案，先驗證結果完整性，再原子登記受限物件、SHA-256、大小、原檔名與 `ready`。`pending → processing → ready | failed` 的請求以 `(task_id,requested_by_user_id,request_idempotency_key)` 防重送；摘要涵蓋任務、請求人、格式／版本、有序 run、篩選、語言及序列／切詞選項，不含伺服器產生的時間與產物資料。先驗授權再查重，worker 依匯出 ID 重試。`expires_at`、`revoked_at` 分開表示時限與即時撤銷，不能以狀態字串假裝已刪除外部物件。背景工作需按後端憲法另留嘗試紀錄與失敗原因，是否共用 job 基礎設施由 runtime 切片決定。

重新下載只讀原歷史列及原始產物，重新檢查目前授權、來源／任務範圍、未過期未撤銷、物件存在與 SHA-256；不得讀當前 UI filter、當前標記結果或重新呼叫切詞器，也不建立新歷史列。歷史快照供審計／重製驗證，不能取代保存原檔。產物 30 日，歷史 metadata 一年；過期、失權、來源刪除或校驗失敗應拒絕下載且回繁體中文原因，不回內部路徑或私有資料。

`json` 維持 `{manifest,items[]}`；`json-min` 格式 v2 為 `{manifest,rows[]}`，使零列也有請求人與版本 metadata。格式欄及 `export_format_version` 一起寫入歷史；舊 v1 原檔在期限內按原 bytes 下載，不轉換。新詞級匯出缺切詞引擎 `engine`／`version` 仍在產生前阻擋，已保存且有效的原檔不受之後引擎移除影響。

## 類型、雙庫與安全

主鍵 UUID，時間 UTC；PostgreSQL 用 `uuid`、`jsonb`、`timestamptz`，SQLite Lite 用相容 UUID／JSON／UTC adapter，且每連線開啟 FK。複合 FK 父端先建同序 UNIQUE。初期索引只設 task 歷史、run 反查與唯一鍵；條件快照不預設 JSON 索引。外部 object ref 僅內部服務可見；任何匯出不讀 `dataset_item_private.hidden_answer`、未提交審核草稿或隱藏 split。現行 NoteCraft 只能畫單欄 FK，複合限制須在 Wiki 文字與未來 migration 測試核對。

## 驗證與回滾

先修正 014 FR／AC／SC 與格式常數、版本及 Changelog，再更新候選字典、來源檢查與 NoteCraft。OpenSpec 結構、Project SDD lint、來源／圖一致性及 archive Source-Verify 分開驗證。此 change 無 runtime 寫入；將來 migration 與 API 另按 Red／Green、升降版及 SQLite／PostgreSQL 實測交付。撤回規劃須同步修正所有衍生文件。

## Constitution Check

| 原則 | 對應 |
|---|---|
| III／XI. 公平與安全 | 只由授權投影產檔，歷史下載仍須當下授權；私有答案與草稿不進檔案或快照。 |
| XIV／XVI. Lineage／Integrity | 有序逐 run manifest、格式版本、原始 bytes 與 digest 保存身份及內容。 |
| XV. 權限 | `dataset.export` 與 task 範圍每次重驗，歷史請求人不自動賦權。 |
| XVIII／XX. 部署與來源 | 規劃不稱部署；正典優先、後續獨立 migration 與雙庫驗收。 |

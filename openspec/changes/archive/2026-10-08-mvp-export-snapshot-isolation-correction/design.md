# Design: mvp-export-snapshot-isolation-correction

## Goal

讓 014 匯出契約的「接受請求」與「讀取結果」各有精確時間，並使隔離開啟時的明確跨階段封裝不被誤認為混合結果。

## 時間與狀態

`task_export.requested_at` 於請求獲接受時以完整精度 UTC 固定，代表歷史列建立／排序的接受時間。`conditions_snapshot` 在同一接受階段保存已驗證的命令、共通篩選、語言／序列選項與有序 `selected_runs[]`，接受後不可變。它不含稍後才會產生的 `exported_at`。正規化命令摘要亦不含伺服器生成時間及產物資料。

候選 `task_export.exported_at` 是獨立可空欄位。worker 在一致的結果讀取快照中決定此時間，使用同一快照建構 `manifest.exported_at`、原始檔名與原始位元組；零列匯出亦適用。內容、答案隔離與完整性驗證成功後，將 `exported_at`、受限物件參照、原始檔名、SHA-256、位元組數與 `ready` 狀態作為一個原子完成邊界固定。可在產物寫入與資料庫提交間使用暫存物件及補償清理，但不得留下可下載的部分產物。實際資料庫與物件儲存協調方法留待 runtime change 決定。

`ready` 之前的 worker 嘗試失敗時，可依原本的 `conditions_snapshot` 重新讀取較晚的一致快照，並以該次成功快照時間產檔；不得更新 `requested_at`、`conditions_snapshot` 或建立第二筆歷史列。`ready` 後任何同鍵重送或 worker 重試只交付既有原始產物，不再查詢目前標記／審核結果。歷史下載仍按原有 `dataset.export`、任務範圍、期限、撤銷與 SHA-256 規則讀原檔。

## 隔離與逐 run 身分

FR-009a 的明確選取允許一份原檔同時封裝 Dry Run 與 Official Run，與 `isolation_enabled = true` 相容。封裝只是同一下載容器，`manifest.runs[]` 與 `selected_runs[]` 保持選取順序和各 run 釘住版本，每列保存 `run_id`／`run_stage`。每個 run 的內容按自己的資料範圍查詢，不可與其他 run 的列合併、聚合、去重或改寫來源階段。同 cycle item 不重疊的唯一性約束維持不變。若使用者真的停用隔離，仍走風險警告、二次確認及審計；明確跨階段封裝本身不觸發停用。

## 方案取捨與邊界

沿用單一 `requested_at` 並把它寫入 manifest 無法表達背景工作實際讀到的內容時點；把 `exported_at` 放進接受時快照又會迫使重試改寫不可變條件。因此採兩個時間、接受條件與產物完成資料分離。此 change 更新正典及 OpenSpec delta；候選字典、ER JSON、checker 與測試由各自擁有人處理，已封存的舊 change 和 derived view 留給正規 archive/write-back 流程。

## 驗證

先確認既有 Red 測試在正典修改前失敗，再驗證正典對時間、重試、逐 run 隔離的 assertions 轉 Green；資料字典檢查在其擁有人修正前仍可 Red。另執行 OpenSpec schema validation、Project SDD lint 與差異檢查。Source-Verify/write-back 僅在 archive 時，由主 session 檢查正典版本、Changelog、delta ID 與 derived view 的逐條引用。

## Constitution Check

- III／XV：混合封裝不擴大授權或答案可見性；每次下載重新驗權。
- XIV／XVI：實際讀取快照時間與原始產物及逐 run 版本對齊。
- XXVIII：`ready` 前後的重試語意可分辨，失敗不留可下載殘件。

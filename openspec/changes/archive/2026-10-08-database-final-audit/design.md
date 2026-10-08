# MVP 試標結果與任務稽核資料落點設計

## 目標

為 014 的試標 IAA 完成閘門提供不可混淆的持久化結果，並讓任務狀態與隔離設定異動只有一份可依任務查詢的稽核事實。此設計服務 014 SC-062／SC-063，候選表與 NoteCraft 不代表已部署。

## D1. 試標結果

一個 `task_trial_round` 最多有一份 `task_trial_iaa_result`。結果列保存 `trial_round_id`、`result_schema_version`、`algorithm_version`、`input_digest`、`result_payload`、`computed_at`；原始答案或受限來源不得寫入。計算完成交易核對該回合所有非 `IAA_GATE_EXCLUDED_TYPES` 輸出都有數值或 `De = 0` 的明確無法計算結果，插入結果列並將 round 改為 `done`。`pending`／`failed` 沒有可被當作完成的結果；重試失敗回合不創建新 round。數值與門檻的演算法仍只依 017 FR-039。

## D2. 任務稽核事件

修訂 ADR-022 與 ADR-032 的舊專表承諾，將 `RunStateTransition` 和 `IsolationAuditLog` 定義為 `audit_events` 的受授權投影。每次狀態異動插入一筆 `task.status_changed`，每次隔離設定實際變化插入一筆 `task.isolation_changed`；在 domain 更新的同一交易提交或回滾。摘要按 action 固定 allowlist，只含前後狀態／布林、必要原因碼與轉換來源；人員 actor／任務／時間由稽核表欄位提供，不接收客戶端自稱 system actor。非空 `audit_events.task_id` 指向 `task.id`，多型 target 仍由授權服務驗證，不畫假 FK。

## D3. 留存與驗證

候選 FK 普通硬刪先採 RESTRICT。ADR-032 稽核下限為一曆年、匯出原檔期限 30 日及 metadata 一年；其餘資料類別的上限、匿名化和外部物件清理順序必須由產品／隱私政策決定。來源字典與 NoteCraft 用檢查器比對表、欄、型別、PK、單欄 FK；雙庫 migration、併發、答案隔離 API 及清理故障是獨立實作驗證。

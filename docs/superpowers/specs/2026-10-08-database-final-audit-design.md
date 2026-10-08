# MVP 資料落點終驗設計（issue #1160）

## 目的與界線

將 MVP 正典所需保存的事實逐一對應到候選資料表、受控 JSON、受限物件或查詢投影，並讓 NoteCraft Wiki／Diagram 與六份實體字典一致。這仍是**未部署規劃**：不建立 ORM、migration、API，也不以 SQLite／PostgreSQL 實測已通過作結論。資料集分析 016／017 的專用報告、品質排名與異常偵測表依 MVP 範圍裁決延後；014／ADR-022 已要求的試標 IAA 完成閘門仍在 MVP 範圍。

成功條件是：每項需保存的 MVP 事實都能追到一個唯一權威落點；每張候選表能回指正典；所有候選單欄 FK 都有真實父表與型別；複合 FK、受限資料、保留政策和未定事項不被圖面的線或徽章誤表為已部署。

## 方案比較與選擇

| 缺口 | 可行方式 | 選擇與原因 |
|---|---|---|
| 試標 IAA 結果來源 | 每次讀取時從不可變來源重算；或保存每回合結果 | 新增一對一 `task_trial_iaa_result` 候選表。014 的 `done` 同時要求所有需計算輸出有確定結果；保存演算法版本、輸入摘要與逐輸出結果，讓重試、稽核和狀態閘門有可查證據。它只承接任務試標，不是延後的 016／017 分析報告。 |
| 任務狀態及隔離設定稽核 | 各建專表；或投影共用稽核事件 | 採 `audit_events` 的型別化事件。每次狀態變化正好一筆 `task.status_changed`；每次隔離設定實際變化正好一筆 `task.isolation_changed`。與 domain 寫入同一 DB 交易，欄位採 action 對應的經驗證 allowlist；不另存重複的領域稽核表。此選擇需修訂 Accepted ADR-022／032 與 014，不能僅改圖。 |
| 任務稽核作用域 | 保持無 FK；或連到已定 UUID task 主鍵 | `audit_events.task_id` 保留可空，但非空時設 `FK → task.id` 及反查索引；系統事件仍可沒有 task。普通刪除先採 RESTRICT，正式清理方式由保存政策裁決。 |
| 保留／刪除／匿名化 | 臆定各類期限；或先列依賴與裁決責任 | 列資料類別矩陣及已存在最低期限，不設定未經產品／隱私政策確認的上限。普通硬刪先維持 RESTRICT／等效拒絕，不能把它理解為永久保存授權。 |

## 試標 IAA 結果契約

`task_trial_iaa_result` 一列只屬一個 `task_trial_round`：`trial_round_id` 同時是非空 PK 與 FK；另有 `result_schema_version`、`algorithm_version`、`input_digest`、`result_payload`、`computed_at`。`result_payload` 是經 registry／Pydantic 驗證的受控 JSON；按該回合釘住的 task config 輸出鍵逐項記錄指標、確定的數值或 `De = 0` 的「無法計算」原因，禁止從輸入答案或測試集私有欄位複製原文。`input_digest` 指向明確版本的標記來源集合與排除規則，避免把後來修改的來源當成當時結果。精確 JSON schema、摘要規範位元組和演算法版本字串在 runtime 前另定，候選圖不得宣稱已實作。

回合建立時為 `pending` 且沒有結果列；失敗記 `failed`，不留可被誤認為成功的結果；僅在同一交易驗證所有 `IAA_GATE_EXCLUDED_TYPES` 以外的輸出都有數值或 `De = 0` 結果，寫入完整結果列後，才把 `task_trial_round.iaa_computation_status` 改成 `done`。重試 `failed → pending`，不建新回合；`done` 不覆寫，日後若需重算另行定版本流程。正式發布及新增下一試標回合都讀最新回合 `done` 且可核對該結果列；數值未達標仍只是顧問警示。計算規則仍由 dataset-017 FR-039 定義，不在本設計重寫。

## 稽核事件與物理 FK

`task.status_changed` 的 allowlist 摘要包含 `from_status`、`to_status`、觸發來源及必要的轉換原因碼；`task.isolation_changed` 包含 `from_isolation_enabled`、`to_isolation_enabled` 與二次確認的固定原因碼。操作者、任務、時間與事件 ID 由 `audit_events` 的既有欄位提供；`actor_user_id` 可空只適用受信系統動作，不能由客戶端指定。兩類事件都在狀態／設定變化的同一 DB 交易插入，失敗時一起回滾；純讀取或值未變不建事件。UI 所稱 `RunStateTransition`、`IsolationAuditLog` 改為受授權查詢投影，不能再承諾第二份持久化紀錄。人員、任務和多型目標的刪除語意沿用 ADR-032 的責任鏈：非空 `task_id` 是真 FK，多型 `(target_type,target_id)` 仍由寫入時驗證，無假 FK 線。

## 總帳、驗證與剩餘決策

新增「需求／資料落點／來源／反向表證據／狀態」稽核矩陣，涵蓋 account/admin、dataset、task/run、工時、annotation/review、匯出與稽核的 MVP 保存事實。六份字典的 §3 是欄型唯一來源，NoteCraft 由字典投影；一個表在矩陣可對多條 FR，但不能有無來源的表。`ReviewAssignment`、`WorkLogEntry`、`DisputeItem` 及報表數字仍為推導，不因此建表。機械檢查負責表、欄、型別、nullability、PK、單欄 FK 與摘要計數；複合 FK、跨表資格及敏感讀權另由字典與未來 DB／API 測試驗。

保存政策矩陣至少分開帳號與工作階段、稽核、公開項目、私有答案與原始來源、task/run／標記／審核責任鏈、工時、指引資產、manifest 回執及匯出原檔／metadata。已定下限或期限僅照正典列示：共用稽核至少一曆年、匯出原檔完成後 30 日、匯出歷史 metadata 一年；其餘上限、刪除或匿名化請求、外部物件清理與 FK `ON DELETE` 最終動作標為產品／隱私裁決，並在開始 migration 前封閉。`item_key` 精確編碼、dataset manifest 位元組、config／guideline 資產保留等仍是獨立實作前決策，不以通過 ER renderer 視為完成。

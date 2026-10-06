# Design: task-config-version-contract

## Goal and ownership

Issue #1160 需要讓後續 run 能追溯任務建立時通過驗證的完整 config/schema。此 change 只承載 `specs/task-management/013-task-new/spec.md` v8.3.0 的建立契約：不可變版本 1、建立者 `project_leader` membership、初始指引與啟動設定的原子建立，以及既有建立請求冪等性。014 的 draft 編輯與 cycle 釘選、015 的標記／審核消費由各自的相依 change 擁有；本文件不建立第二份行為正典。

`task_config_version`、`task_membership` 與 `task_guideline_version` 在此是候選關聯責任名稱，**未部署**。本 change 不指定實體欄位字典、FK、索引或 SQL 實作；014 的 14 張候選表及完整 run 生命週期詳見 `task-run-identity-contract`，不在此重複。

## Immutable version origin

依 013 FR-006 與 `TaskConfig`，建立任務時先由保留的 `OUTPUT_TYPE_REGISTRY` 定義驗證完整 config，包含 `input_type`、`outputs[]` 與 `field_role_map`。第一次成功驗證後，同一不可變列保存完整 config 與內嵌 label-schema snapshot，以 `config_version_id` 識別，`version_no = schema_version_no = 1`。同任務版本序號為正整數且唯一；歷史列不可被後續編輯覆寫。

`schema_digest` 由釘住的 `schema_registry_version` 下正規化的 outputs／field roles 計算，該 registry version 的驗證定義必須保留，讓歷史版本仍可解析。013 FR-006／AC-4.5 已裁定：014 FR-014 的後續 draft 完整 config 儲存每次建立新不可變列，`version_no` 與 `schema_version_no` 同步遞增並保持相等；只改非 schema 設定也增加版本，而 digest 可以相同。因此下游引用的是精確 `config_version_id`，不能把 digest 相等視為同一版本，或以任務的目前 config 取代歷史版本。draft 編輯的授權、狀態與儲存流程仍由 014 決定。

## Creation transaction and retries

依 013 FR-006a／FR-006c 與 AC-4.3，task、建立者的 `project_leader` membership、初始 TaskConfig、初始 TaskGuidelineConfig 內容版本，以及 Step 3 啟動設定在同一交易提交；Step 4 留空仍建立初始指引版本。任一步失敗時全部回滾，不能留下孤兒 task 或缺少 leader／config 的任務。`force_guideline` 是顯示政策，不是指引內容版本，後續版本觸發規則屬 014 FR-017a。

依 013 FR-006d、AC-4.4／AC-4.6、SC-006，同一建立者對 `task.create` 在 `IDEMPOTENCY_WINDOW_HOURS` 內以相同 `Idempotency-Key` 和相同正規化請求內容重送，經目前授權檢查後回傳原 `task_id`，不新增 membership、config 或指引版本；同 key 異內容回報衝突，不能將原 task 當作此次請求的成功結果。原有 task.create 權限判定仍由 013 FR-001a 管轄。這裡記錄設計不變量，不新增 API payload、儲存形狀或錯誤 envelope。

## Cross-change contracts

| 相依 change／正典 | 本設計交出的契約 |
|---|---|
| `task-run-identity-contract`／`specs/task-management/014-task-detail/spec.md` FR-010f、FR-014 | 014 可在 draft 另存完整 config；首次 Dry 開啟 cycle 時釘住同 task 的確切不可變 `config_version_id`。已發布 run 不改讀 task 目前版本。 |
| `annotation-run-identity-contract`／`specs/annotation/015-annotation-workspace/spec.md` FR-051、FR-066、FR-093 | 015 以穩定 run／assignment 消費 014 的版本與指引釘選；013 不定義其提交、審核或權限投影。 |
| `specs/dataset/021-dataset-ingestion-and-lineage/spec.md` FR-005／FR-010 | dataset 公開 item、私有答案與 sealed version 的邊界由 dataset owner 管理；013 config 不攜入 hidden answer 或私有 `declared_split`。 |

這三份 OpenSpec change 分別只鏡射一份 owning spec；013 的初始版本先於 014 的 run 釘選，015 再消費該身分鏈。Accepted ADR-022 擁有 task 狀態轉換。`docs/superpowers/specs/2026-10-06-task-run-identity-design.md` 是 DBA 裁決背景，不凌駕正典。

## Later verification and rollout boundary

本次只做文件與來源定位，沒有 ORM、migration、API、資料搬遷、ER 投影或已部署 Schema。後續資料庫切片需以獨立 Red／Green 證據在 SQLite Lite 與 PostgreSQL production 各自驗證：版本號正整數與同 task 唯一、`schema_version_no = version_no`、同 task 版本參照、建立交易全成或全退、冪等重送與併發競爭、registry 定義保留及 digest 重現。SQLite 每連線 FK 啟用、PostgreSQL 鎖與交易衝突、JSON/JSONB 差異均不能由純文件檢查代替。migration 的 upgrade、downgrade、roundtrip 與 API 安全測試須另立實作任務。

本 change 的驗證先確認 013 FR-006／FR-006a／FR-006c／FR-006d、AC-4.3～4.6、SC-006、`TaskConfig`／`TaskGuidelineConfig` 均可在 v8.3.0 正典定位，OpenSpec delta 只鏡射這些條文；再分別執行 OpenSpec schema validation、Project SDD lint 與適用 code/test gate。archive 前完成 Source-Verify，archive 後逐條核對 derived view 的正典引用可定位。文件完成不代表資料庫行為已測或 change 已封存。

## Risks and rollback

若下游用 digest 當版本鍵，相同 schema 的非 schema 設定修改會被誤合併；若只讀 task 目前 config，舊 run 無法重現。精確版本 ID 與 014 的 cycle pin 是後續設計約束。撤回此規劃時以文件修訂或 revert commit 同步檢查 013／014／015、OpenSpec delta／derived view、版本與 Changelog；沒有部署資料可 downgrade 或刪除。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| II. Generalization-First | 同一 registry-driven 版本機制適用任意合法 `outputs[]` 組合。 |
| III. Data Fairness | 只保存建立者確認的 config／schema；dataset 私有答案及 split 不進標記者可讀契約。 |
| XIV／XVI. Lineage and Reproducibility | 完整不可變版本、釘住且保留的 registry 定義，以及精確版本 ID 支援歷史 run 重現。 |
| XV. RBAC | 建立者 leader membership 與 task 同交易；建立授權仍依 013 FR-001a。 |
| XVIII. Deployment Safety、XX. Source of Truth | 候選關聯未部署；013 owning spec 優先，雙資料庫實測與 migration 另行處理。 |

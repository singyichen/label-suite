# 規格狀態索引

> **用途**：作為所有功能規格流程狀態的單一真實來源（Single Source of Truth）。
> **更新規則**：當建立新的 spec 產物、開啟分支，或功能被封存時，需更新本表。
> **封存規則**：功能實作合併至 `main` 後，執行 `mv specs/[module]/NNN-feature specs/_archive/NNN-feature`，並將 Status 更新為 `archived`。

## 狀態說明

| Status | 說明 |
|--------|------|
| `spec-ready` | 已有 `spec.md`，尚未開始 planning |
| `plan-ready` | 已建立 `plan.md`，尚未拆解 tasks |
| `tasks-ready` | 已建立 `tasks.md`，尚未開始實作 |
| `in-progress` | 實作分支進行中 |
| `review` | PR 已開啟，等待合併 |
| `done` | 已合併至 `main`，尚未封存 |
| `archived` | 已移至 `specs/_archive/` |
| `deferred` | 已有 `spec.md`，但依目前 prototype / IA baseline 暫緩實作 |

---

## 功能流程（已存在 Spec 檔案）

| ID | 功能 | 模組 | 狀態 | 分支 | 備註 |
| --- | --- | --- | --- | --- | --- |
| foundation-000 | Foundation — 工程基準與共同約束 | foundation | `plan-ready` | `feat/foundation/000-foundation` | spec v1.12.2；FR-001~131；SC-001~045；plan v2.0.0（Foundation-Core）；Observability 延後 |
| account-001 | Login — Email / Password | account | `plan-ready` | `feat/account/001-login-email-password` | spec v1.2.2；規格狀態：Clarified |
| account-002 | Login — Google SSO | account | `spec-ready` | `feat/account/002-login-google-sso` | spec v1.2.2；規格狀態：Clarified |
| account-003 | Register — Email / Password | account | `spec-ready` | `feat/account/003-register-email-password` | spec v1.2.3；規格狀態：Clarified |
| account-004 | Forgot / Reset Password | account | `spec-ready` | `feat/account/004-forgot-reset-password` | spec v1.1.2；規格狀態：Clarified |
| account-005 | Profile Settings | account | `spec-ready` | `feat/account/005-profile-settings` | spec v1.2.9；規格狀態：Clarified |
| admin-006 | User Management | admin | `spec-ready` | `feat/admin/006-user-management` | spec v1.0.8；規格狀態：Clarified |
| admin-007 | Role & Permission Settings | admin | `spec-ready` | `feat/admin/007-role-settings` | spec v1.1.4；規格狀態：Draft |
| dashboard-012 | Dashboard | dashboard | `spec-ready` | `feat/dashboard/012-dashboard` | spec v1.3.28；規格狀態：Clarified |
| shared-008 | Shared Sidebar Navbar | shared | `spec-ready` | `feat/shared/008-sidebar-navbar-shared` | spec v1.3.9；規格狀態：Clarified |
| shared-018 | Help Button — 平台說明入口 | shared | `deferred` | `feat/shared/018-help-button` | spec v1.1.1；最新 sidebar prototype baseline 尚未提供 Help button / Help modal |
| annotation-015 | Annotation List + Workspace | annotation | `spec-ready` | `feat/annotation/015-annotation-workspace` | spec v1.4.11；規格狀態：Draft |
| task-management-010 | Task List | task-management | `spec-ready` | `feat/task-management/010-task-list` | spec v1.3.8；規格狀態：Draft |
| task-management-013 | New Task (+ Config Builder) | task-management | `spec-ready` | `feat/task-management/013-task-new` | spec v4.1.0；規格狀態：Draft；Step 1 分類／回歸輸出改為 taxonomy metadata 驅動的 radio 單選，序列維持 checkbox 多選 |
| task-management-014 | Task Detail (incl. task-member-management/work-log) | task-management | `spec-ready` | `feat/task-management/014-task-detail` | spec v1.7.15；規格狀態：Draft |
| dataset-016 | Dataset Analysis List + Stats Tab | dataset | `in-progress` | `feat/dataset/016-dataset-analysis-list` | spec v1.3.1；規格狀態：In Progress |
| dataset-017 | Dataset Quality Tab (IAA / Anomaly Detection) | dataset | `spec-ready` | `feat/dataset/017-dataset-analysis-detail` | spec v1.4.5；規格狀態：Draft |

---

## 待辦清單（Spec 檔案尚未建立／需重建）

| ID | 功能 | 目標模組 | 規劃備註 |
|---|------|----------|----------|
| — | — | — | — |

---

## 變更紀錄

| 日期 | 更新內容 |
|------|----------|
| 2026-07-23 | `task-management-013` spec 更新至 v4.2.1：設定優先 Step 2 新增「標記設定」小標並與「標記預覽」維持相同樣式及頂端對齊；共通 Bypass schema toggle 與前一欄位保留 12px token-based 群組間距；同步 FR-003a-3、FR-003j、SC-003h／SC-003k 與 prototype 驗收，`outputs[]` 契約及下游規格不變，狀態維持 `spec-ready`。 |
| 2026-07-22 | `task-management-013` spec 更新至 v4.2.0：單一標籤 Step 2 改由 `step2Layout` registry metadata 啟用設定優先版面，桌面採設定左／預覽右、1100px 以下改為上下排列；範本／上傳與 Code 整合為下方單一工具卡並降低 Code 高度；其他輸出維持原狀，prototype 與 SC-003k 測試同步，狀態維持 `spec-ready`。 |
| 2026-07-22 | `task-management-013` spec 更新至 v4.1.0：Step 1 分類（單一標籤／多標籤）與回歸（單維度／多維度）輸出改為組內 radio 單選，選擇語意由 taxonomy `outputSelection` metadata 驅動；序列維持 checkbox 多選、跨大分類仍可多選；prototype 與 SC-002e 測試同步，狀態維持 `spec-ready`。 |
| 2026-07-22 | `task-management-013` spec 更新至 v4.0.0：從新增任務 Step 1／Step 2 與 registry 移除 `entity_relation`、`boundary`；將 `span`、`relation_triple`、`token_class` config key 破壞性遷移為 `entity_recognition`、`relation_identification`、`sequence_tagging`，不保留相容別名，並同步顯示名稱、taxonomy、config 範例、prototype、visual overview 與回歸測試；狀態維持 `spec-ready`。 |
| 2026-07-15 | `task-management-013` spec 同步至 v3.4.3：純 `relation_triple` 僅保留既有實體唯讀高亮、關係建構器與三元組列表，不顯示 Span 編輯介面或 `source_output`；只有明確選擇 `span + relation_triple` 才啟用整合實體編輯並輸出 `source_output: span`；同步驗收情境、功能需求、registry 契約、產品 taxonomy 與範例 task config；狀態維持 `spec-ready`。 |
| 2026-07-15 | `task-management-013` spec 同步至 v3.4.2：新增 `rendersInputPreview` registry UI metadata；`span`、`relation_triple`、`entity_relation` 與相關複合任務不再重複顯示通用輸入區，`token_class`、`boundary` 維持既有顯示；補齊驗收情境、介面與行為規則、邊界情況、FR-003g-3、關鍵實體、下游相依性與 SC-003j；狀態維持 `spec-ready`。 |
| 2026-07-13 | `task-management-013` spec 同步至 v3.4.1：Boundary 預覽新增依 `boundary_types` 順序配置的類型色系、SVG 剪刀與類型首字縮寫、完整類型可存取名稱、已標記切點防遮蔽間距，以及 `sentence`／`paragraph` 階層式即時切割結果；補齊預覽互動表、邊界情況、FR-003d-2 與 SC-003i；狀態維持 `spec-ready`。 |
| 2026-07-06 | `task-management-013` spec 更新至 v3.2.0：每個輸出類型新增獨立「無法判定 (Bypass)」選項——registry 共通欄位 `allow_bypass`（預設開啟）、預覽 Bypass 勾選項與互斥清空停用行為、整合預覽（span + relation_triple）前綴勾選項與連鎖停用邊界（新增 FR-003j、SC-003h）；prototype 同步；狀態維持 `spec-ready`。 |
| 2026-07-06 | `task-management-013` spec 同步至 v3.1.7（PR #93 合併）：資料列來源偵測與髒 JSON 解析、預覽 Modal 回退鏈、循序關係三元組建構器、來源切換不相容提示等 prototype 行為入 spec；狀態維持 `spec-ready`（實作尚未開始，不觸發封存）。 |
| 2026-06-09 | Update account-001 plan to v2.0.0: full alignment with plan-template v1.13.6; status confirmed `plan-ready`. |
| 2026-06-09 | Update foundation-000 plan to v2.0.0: aligned with plan-template v1.13.6 (major structural update). |
| 2026-06-05 | foundation-000 plan v1.0.0 created (Foundation-Core): plan-ready; scope F-01~F-10, F-13, F-16, F-18; Observability/Celery deferred; health check endpoint added. |
| 2026-06-04 | Update foundation-000 to spec v1.12.0: pagination switched from page/page_size to limit/offset; PaginatedResponse next_offset added. |
| 2026-06-03 | Update foundation-000 to spec v1.11.5: SC-045 naming change applied. |
| 2026-06-03 | Update foundation-000 to spec v1.11.4: add ADR-024 upstream dependency (tiered database strategy — SQLite quick start / PostgreSQL production). |
| 2026-06-02 | Update foundation-000 to spec v1.11.3: address PR review-resolve findings — replace Django-specific override_settings in SC-036 with FastAPI-compatible pytest monkeypatch / dependency_overrides; realign branch field to feat/foundation/000-foundation per naming convention. |
| 2026-06-02 | Update foundation-000 to spec v1.11.2: address PR code review findings — fix FR-040 parenthetical self-contradiction, add ADR-022 upstream dependency, backfill SC-029~031 changelog attribution. |
| 2026-06-01 | Update foundation-000 to spec v1.11.1: apply independent-review corrections — clarify FR-117/FR-078 CSRF coexistence, add explicit operation_id= guidance to FR-120, add FR-040/FR-088 supersede notes, fix SC-034/SC-041 three-viewport contradiction, add CSRF test attribution to SC-036, add metrics grep pattern to SC-022, add Celery headers assert to SC-039, add bootstrap CI check path to SC-045. |
| 2026-06-01 | Update foundation-000 to spec v1.11.0 on `feat/foundation-spec-review-fixes`: resolve sub-agent review findings for ErrorResponse P0 contract, Celery baseline, CSRF, restricted-client safety, API versioning/idempotency, REST non-CRUD patterns, frontend gates, correlation, metrics naming, local bootstrap, and expanded CI success criteria. |
| 2026-05-29 | Update foundation-000 to spec v1.10.0: add Prometheus / Grafana / Sentry observability baseline, FR-091~100, SC-021~028, and ADR-018/019/020 dependencies. |
| 2026-05-29 | Update foundation-000 to spec v1.7.0: add architecture background mapping SRP/OCP/LSP/ISP/DIP/CARP/LKP to Foundation constraints. |
| 2026-05-29 | Update foundation-000 to spec v1.1.0: add F-21 Backend Layering (FR-060~062), F-22 Frontend Vertical Slice (FR-063~065), Filtering/Sorting convention (FR-059), SC-009/010. |
| 2026-05-29 | Add foundation-000 Foundation Spec v1.0.0 (spec-ready); 20 constraints FR-001~058; ADR-021/022 created. |
| 2026-05-28 | Update account-001 status to `plan-ready`. |
| 2026-05-22 | `admin-006` User Management spec 更新至 v1.0.8；同步最新 prototype 的列內「異動紀錄」icon、目標帳號異動紀錄 drawer、空狀態、i18n 與行動版 bottom sheet 行為。 |
| 2026-05-22 | `admin-006` User Management 經 `/speckit.clarify` 更新至 spec v1.0.7；補齊啟用帳號、seeder/最後 active super_admin 保護、自停用導頁、帳號管理審計與設定密碼信寄送失敗不建立帳號規則。 |
| 2026-05-22 | `account-005` Profile Settings 經 `/speckit.clarify` 更新至 spec v1.2.9；補齊頭像、通知偏好、Email 驗證 session、驗證信重送與 pending Email 規則。 |
| 2026-05-21 | 依各 `spec.md` 檔頭同步 `STATUS.md`：更新功能分支為 `feat/[module]/NNN-feature` 格式、補齊 spec 版本與規格狀態；`shared-018` 標記為 `deferred`，`dataset-016` 保持 `in-progress`。 |
| 2026-05-19 | 依最新 prototype 同步 IA 與相關 spec：task-new 4 steps、task-detail 5 tabs、dataset `/dataset-analysis` 入口、admin `role-settings.html` 獨立頁；shared-018 標記為 deferred。 |
| 2026-05-15 | 新增 `shared-018` Help Button spec（`specs/shared/018-help-button/spec.md`）；狀態設為 `spec-ready`。 |
| 2026-05-12 | `task-management-014` spec 更新至 v1.7.6；Overview「任務狀態與執行控制」移除 stage banner 內額外的目前任務階段標題與描述，僅保留判定列。 |
| 2026-05-11 | `task-management-014` spec 更新至 v1.7.5；Overview「任務狀態與執行控制」統整目前任務階段與正式標記判定資訊架構，prototype 同步移除獨立正式標記判定卡。 |
| 2026-05-06 | `task-management-014` 狀態更新為 `in-progress`，分支為 `fix/task-detail-annotation-results-layout`；spec 同步目前 `annotation-results` prototype 的摘要頂對齊、detail row metadata 群組與 scroll container 邊界規則。 |
| 2026-04-30 | `dataset-016` 狀態更新為 `in-progress`，分支為 `feat/dataset-analysis-table-refresh`；spec 同步目前 prototype 的 table layout、篩選器、分頁與 URL query 保留行為。 |
| 2026-04-24 | 重命名 dataset spec 資料夾為 `016-dataset-analysis-list`、`017-dataset-analysis-detail`；同步對齊 IA 的 `dataset-analysis-list` 與 `/dataset-analysis-detail/:task_id` 命名。 |
| 2026-04-24 | 新增 `dataset-016` 與 `dataset-017` 規格檔（IA v1.3.1 重建）；狀態更新為 `spec-ready`，並自 backlog 移除。 |
| 2026-04-23 | 新增 `annotation-015` 規格檔（`specs/annotation/015-annotation-workspace/spec.md`）；狀態更新為 `spec-ready`，並自 backlog 移除。 |
| 2026-04-20 | 新增 `task-management-010`、`task-management-013`、`task-management-014` 規格檔；狀態更新為 `spec-ready`，並自 backlog 移除。 |
| 2026-04-16 | 新增 `admin-006` 與 `admin-007` 規格檔（IA v7 重建）；狀態更新為 `spec-ready`，並自 backlog 移除。 |
| 2026-04-16 | 已同步 STATUS 與目前 repository 狀態：自 active pipeline 移除已刪除 spec 項目、加入 `shared-001`，並將 `006/007/010/013/014/015/016/017` 移至 backlog 等待重建。 |
| 2026-04-15 | 將 `001/002/003/004/012` 狀態由 `spec-ready` 更新為 `in-progress`；分支設定為 `feat/dashboard-012-spec-simplify`；並同步備註與最新 account/dashboard spec 及 IA 對齊進度。 |

---

## 封存紀錄

> 功能資料夾移至 `specs/_archive/` 後，請在此新增紀錄。

| # | 功能 | 封存日期 | 合併 PR |
|---|------|----------|---------|
| — | — | — | — |

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
| dashboard-012 | Dashboard | dashboard | `in-progress` | `feat/dashboard-output-types` | spec v2.0.2；規格狀態：In Progress；各角色任務摘要依 `outputs[].type` 順序顯示多 tag；Annotator／Reviewer prototype 皆完整呈現 T001–T013，並以獨立 task／sample／compatibility route 導向對應角色介面；13 筆僅為安全示例，第 14 筆合法組合仍可 config-driven 呈現；正式 membership 與 014／015 consumer 邊界不變 |
| shared-008 | Shared Sidebar Navbar | shared | `spec-ready` | `feat/shared/008-sidebar-navbar-shared` | spec v1.3.9；規格狀態：Clarified |
| shared-018 | Help Button — 平台說明入口 | shared | `deferred` | `feat/shared/018-help-button` | spec v1.1.1；最新 sidebar prototype baseline 尚未提供 Help button / Help modal |
| annotation-015 | Annotation List + Workspace | annotation | `in-progress` | `feat/regression-slider-ui` | spec v1.7.0；規格狀態：Draft；VA Annotator 介面採雙列彩色滑桿、跟隨數值標籤與可直接輸入小數的右側欄位 |
| task-management-010 | Task List | task-management | `in-progress` | `feat/task-detail-config-sync` | spec v2.0.2；規格狀態：In Progress；列表改由 `outputs[].type` 顯示多 tag，提供 registry-driven 8 輸出類型 membership 篩選與 `limit`／`offset` 分頁；13 筆示例 seed 統一以 `status = draft` 起始（014 draft 編輯情境），非 draft 行為由測試合成任務驗收；012 Dashboard 與 016 list 已同步，015／017 consumer 仍延後 |
| task-management-013 | New Task (+ Config Builder) | task-management | `in-progress` | `fix/free-text-preview-card-title` | spec v6.6.0；規格狀態：Draft；`free_text` 預覽移除輸出卡片標題（`hidePreviewTitle`）與兩條內部分隔線，說明欄位 helper text 改為 tooltip（`hintAsTooltip`）；Step 1 選擇狀態明確為 `selected_categories[]` + `input_type` + `selectedOutputTypes[]`，一對一產生 `outputs[].type`；010／012／016 consumer 已同步輸出類型展示；正式 Annotation Workspace 及 014／017 consumer 仍延後 |
| task-management-014 | Task Detail (incl. task-member-management/work-log) | task-management | `in-progress` | `feat/task-detail-config-sync` | spec v2.0.0；規格狀態：Draft；ADR-029 outputs[] 遷移 + 與 013 Step 1/2 完全同步：共用 `OUTPUT_TYPE_REGISTRY` 設定引擎（task-config.\* 共用檔），「基本資料」／「標記設定」編輯與 task-new Step 1/2 同構；匯出 `task_type` 由 outputs[] 推導 legacy enum、`sequence_labeling_subtype` 固定空字串；13 筆 seed 統一 draft 基準 |
| dataset-016 | Dataset Analysis List | dataset | `in-progress` | `feat/dataset-analysis-output-types` | spec v2.0.0；規格狀態：In Progress；列表以 `outputs[].type` 顯示多 tag，提供 8 類 membership 篩選、13 筆非上限示例與 `limit`／`offset`；017 detail consumer 仍延後 |
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
| 2026-07-31 | `task-management-013` 更新至 v6.6.0（`fix/free-text-preview-card-title`）：`free_text` 的「輸入區說明」／「作答區說明」helper text 改為欄位標題旁實心圓形「?」按鈕的 tooltip（registry `hintAsTooltip: true`，hover／focus 顯示），泡泡樣式對齊 MASTER.md §Tooltip（深色、觸發點上方、帶箭頭），樣式集中於共用 `task-config.css` 並移除頁內重複定義，task-new／task-detail 抽樣筆數提示同步套用；014 標記設定編輯模式經共用引擎同步生效。 |
| 2026-07-31 | `task-management-013` 更新至 v6.5.0（`fix/free-text-preview-card-title`）：`free_text` 於 `OUTPUT_TYPE_REGISTRY` 宣告 `hidePreviewTitle: true`，Step 2 標記預覽不再顯示輸出卡片的「自由文字」標題，並移除預覽內兩條分隔線（Evidence 區塊後、Input 內容卡與作答區之間），區塊間距改以 spacing 維持；014 Overview「標記設定」編輯模式經共用引擎（task-config.\*）同步生效，014 spec 以 parity 引用不需個別修改。更新驗收情境 26、FR-003d-10 與 Prototype Playwright 斷言。 |
| 2026-07-31 | `task-management-014` 更新至 v2.0.0 並於 `feat/task-detail-config-sync` 進入 `in-progress`：任務詳情自 legacy `task_type` 枚舉遷移至 ADR-029 `categories[] + input_types[] + outputs[]` 組合模型，與 013 共用設定引擎與 `OUTPUT_TYPE_REGISTRY`；「基本資料」編輯改為 Step 1 同構（資料集檔案列＋欄位角色表＋三組 chips）、「標記設定」編輯改為 Step 2 同構（每 output 一個 accordion＋同源預覽＋YAML/JSON code 區）；FR-014k–u 汰換為 FR-014k/l/l-1/l-2/m/n，AspectListTaskConfig／SentencePairsTaskConfig 併入 registry 驅動之 OutputConfig；匯出 `task_type` 改由 outputs[] 推導 legacy enum。同步 `task-management-010` v2.0.2：13 筆示例 seed 統一 `status = draft` 起始。 |
| 2026-07-29 | `dashboard-012` 更新至 v2.0.2：記錄 legacy `localStorage` 鍵 `labelsuite.activeTaskType` 的過渡性寫入——Dashboard 為目前唯一寫入者（010 v2.0.0 已移除），值僅取自獨立 `task_type` compatibility 欄位，014／015 遷移完成後一併移除。原 `feat/task-output-type-list` 分支依 PR 大小規範拆分為 `feat/task-list-output-types`（010／013）、`feat/dataset-analysis-output-types`（016）、`feat/dashboard-output-types`（012）三個堆疊 PR。 |
| 2026-07-29 | `dashboard-012` 更新至 v2.0.1：Annotator 與 Reviewer prototype 場景皆補齊 T001–T013 完整清單，每筆保留獨立 task ID、可操作 sample 與明確 compatibility route，可分別載入標記／審核介面；13 筆仍只作 prototype 驗收基線，正式產品依 membership 顯示且不限制未來任務數量或輸出組合。 |
| 2026-07-29 | `dashboard-012` 更新至 v2.0.0 並於 `feat/task-output-type-list` 進入 `in-progress`：四種有任務角色的 Dashboard 任務摘要改由 `outputs[].type` 依序顯示一至多個 registry-driven tag，涵蓋 8 個合法 key、複合輸出、zh/en、可存取名稱與手機換行；13 筆 fixture 僅為安全 summary metadata 的 prototype 基線，第 14 筆任意合法組合不需新增 renderer 分支，並明訂答案資料不得暴露。同步 `task-management-013` v6.4.3；014／015／017 consumer 延後範圍不變，legacy `task_type` 僅保留為獨立 routing compatibility 欄位。 |
| 2026-07-29 | `dataset-016` 更新至 v2.0.0 並於 `feat/task-output-type-list` 同步 prototype：資料集分析列表改以 `outputs[].type` 顯示一至多個唯讀 tag，下拉由 registry 提供 8 個輸出類型並採 membership 篩選，URL 分頁改為 `limit`／`offset`；13 份 example-data fixture 僅為可驗收示例，不構成任務數量或合法組合上限，並新增資料載入失敗、權限過濾、14th-task 泛化與三個 RWD viewport 驗收。同步 `task-management-010` v2.0.1、`task-management-013` v6.4.2 的下游界線；017 detail consumer 仍延後。 |
| 2026-07-29 | `task-management-010` 更新至 v2.0.0 並於 `feat/task-output-type-list` 進入 `in-progress`：任務列表由固定 `task_type` 遷移為 `outputs[].type` 多 tag，輸出類型下拉由 registry 提供 8 個合法 key 並採 membership 篩選，URL 分頁改為 `limit`／`offset`；以 13 份 example-data fixture 建立 prototype mapping／命中數基線、複合 tag 與第 14 筆合法任務泛化驗收，明訂示例不得限制未來任務或暴露答案內容。`task-management-013` 釐清 Step 1 狀態為 `selected_categories[]` + `input_type` + `selectedOutputTypes[]` 並更新至 v6.4.1；014／015／016／017 consumer 同步仍延後。 |
| 2026-07-28 | `task-management-013` 更新至 v6.4.0：Step 2 `sequence_tagging` 預覽將 Token 網格上方的字／詞切分規則說明改為顯示帶「原始文本」標題（英文 Text）、未經切分的原始輸入文本，文本不隨標記單位切換改變；通用輸入文字區塊標籤由 Input 欄位名稱改為「原始文本」，`item_pair` 於配對區塊上方顯示一次該標題並保留欄位名稱小標，互動圈選文本區與 `free_text` `input_instruction` 契約不變，整合預覽標題簡化為「整合預覽」；同步 prototype、visual overview 與 Playwright 測試，tokenization 契約與預標記驗證不變。 |
| 2026-07-28 | `task-management-013` 更新至 v6.3.0：`sequence_tagging` 新增獨立的標記單位設定 `tokenization.unit = character \| word`，設定面板依序顯示標記單位與標記方案；Step 2 預覽依選定單位即時重建字／詞 Token、更新規則說明並重新驗證可見預標記數量。`tokenization` 契約升級為 unit-based v2；正式 Annotation Workspace 及 014／016／017 consumer 維持延後。 |
| 2026-07-28 | `task-management-013` 更新至 v6.2.0：本次僅調整 New Task producer-side 的 `sequence_tagging` 設定與 Step 2 預覽；Token 固定採 language-aware v1（中文逐字、英文逐詞、標點獨立），方案保留 BIO／BIOES／IOB2 並新增 SINGLE，完整 tag 可精確套用且可見預標記數量不一致時阻擋。同步 example data、task config、taxonomy、visual overview 與 Playwright；正式 Annotation Workspace 及 014／016／017 consumer 留待後續一起調整。 |
| 2026-07-28 | `task-management-013` 更新至 v6.1.0 並進入 `in-progress`：Evidence 欄位新增全資料完整性結果與缺值阻擋；`free_text` 新增必要且支援 zh/en 預設的輸入區／作答區說明，設定值即時同步預覽與 Code，主要標題不再暴露原始 JSON key；舊 config 會補 instruction 並清除 v6.0.0 退役 key。Prototype 與 Playwright 回歸測試同步於 `feat/task-management/013-free-text-guidance`；014／015 consumer 契約留待後續同步。 |
| 2026-07-24 | `task-management-013` 更新至 v6.0.0：破壞性移除 `free_text.show_reference`、舊名 `show_reference_to_annotator` 與「顯示參考答案給標記者」設定；指定 Evidence 時，Step 2 依「背景參考 (Evidence) → Input → 回答框」顯示，回答區只保留「自由文字」標題，Output 角色資料直接預填回答框，未指定 Output 時保持空白。同步 producer-side prototype、Playwright、`rendersEvidencePreview` metadata 與 ground-truth 安全界線；014／015／017 consumer 同步維持延後。 |
| 2026-07-24 | `task-management-013` 更新至 v5.2.1：v5.1.0 階層選擇器攤平與保持開啟、v5.2.0 taxonomy 分支刪除確認改用 UXC-10 頁內 modal、v5.2.1 釐清下游延後範圍僅限 014／015／017 consumer 端（同步修正 ADR-029）。producer-side prototype 已於 `feat/hierarchical-multi-label-taxonomy` 實作（樹編輯器、攤平選擇器、刪除確認 modal、資料路徑與 `max_selections` 驗證），更正 v5.0.0 列「本階段不修改 prototype」的描述。 |
| 2026-07-24 | `task-management-013` 更新至 v5.0.0 並調整為 `spec-ready`：`multi_label.label_options` 改為 bounded recursive taxonomy，新增 `taxonomy-tree`、stable ID、leaf-only preview、flat／hierarchical shape-aware 正規化、8 層／500 節點／100 字元資源界線及 JSON/YAML、鍵盤、RWD 驗收規劃；保留原 flat fixture，另規劃 hierarchical fixture。014／015／017 consumer 顯示、提交與統計契約延後同步，本階段不修改 prototype 或程式碼。 |
| 2026-07-24 | `task-management-013` 更新至 v4.9.0：Step 2 的 `relation_types` 改為選填並預設空陣列；純關係與所有相關複合任務僅在存在語意類型標籤時顯示「類型」控制，純關係預覽移除重複標題；狀態維持 `in-progress`。 |
| 2026-07-23 | `task-management-013` 更新至 v4.7.0：單／多維度回歸設定統一為相同維度卡片與欄位排列；單維度固定一張且無新增／刪除，多維度保留卡片清單操作並移除外層「維度設定 *」重複標題，既有 config 與 `outputs[]` 契約不變。 |
| 2026-07-23 | `task-management-013` 更新至 v4.6.0、`annotation-015` 更新至 v1.7.0：右側 number input 採 `step="any"`，範圍內小數不再依 slider step 吸附；slider 仍依 task config step 微調，手動輸入僅依 min/max 校正。 |
| 2026-07-23 | `task-management-013` 更新至 v4.5.0、`annotation-015` 更新至 v1.6.0：回歸滑桿右側改為 number input，與滑塊及上方數值標籤雙向同步；完成輸入後依 min/max/step 校正並移動滑塊，資料契約不變。 |
| 2026-07-23 | `task-management-013` 更新至 v4.4.0、`annotation-015` 更新至 v1.5.0：單／多維度回歸統一採 range slider，數值即時跟隨滑塊顯示於正上方；多維度使用不同輔助色並保留文字辨識，annotation pending 樣本維持未評分契約。兩項進入 `feat/regression-slider-ui` prototype 實作，狀態更新為 `in-progress`。 |
| 2026-07-23 | `task-management-013` spec 更新至 v4.3.0：全部 8 種輸出類型、單一輸出及多輸出組合統一採 Step 2 設定優先版面（>1100px 設定左／預覽右，≤1100px 設定上／預覽下），左右小標同層級頂端對齊；範本／上傳與 Code 固定於下方共用單一外框及分隔線，Code 為 240px，各 output 的 Bypass 與前一 schema 欄位保留 12px。版面改為頁面層級共通契約；`outputs[]` 不變，已檢查下游 014–017 無需改版，狀態維持 `spec-ready`。 |
| 2026-07-23 | `task-management-013` spec 更新至 v4.2.1：設定優先 Step 2 新增「標記設定」小標並與「標記預覽」維持相同樣式及頂端對齊；共通 Bypass schema toggle 與前一欄位保留 12px token-based 群組間距；同步 FR-003a-3、FR-003j、SC-003h／SC-003k 與 prototype 驗收，`outputs[]` 契約及下游規格不變，狀態維持 `spec-ready`。 |
| 2026-07-22 | `task-management-013` spec 更新至 v4.2.0：導入 Step 2 設定優先響應式版面與下方整合設定檔工具卡初版；適用範圍後由 v4.3.0 統一為全部輸出類型及多輸出組合，狀態維持 `spec-ready`。 |
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

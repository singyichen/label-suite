# Issue #180 — W1 規格與架構盤點（senior-ba / senior-architect 視角）

> 產出者：sub-agent（規格與架構工作流）
> 範圍：issue #180 第 12.5 節 MUST READ 治理文件、feature specs、產品文件、關鍵 ADR；12.6 中 dataset 016/017 僅讀 membership／route／IAA summary badge／gate／返回入口 contract。
> 排除：`design/prototype/pages/dataset/**`、資料集分析演算法／UI／效能，以及 12.7 明確排除清單。
> 本文件**只盤點與標記，不裁決正典優先序**；所有衝突於「3. Spec Conflict 清單」中列出待決策問題，交由主 agent／team-lead 彙整後進入使用者 checkpoint。

---

## 0. 方法與涵蓋率聲明

- 治理文件、`specs/_shared/constants.md`、`specs/STATUS.md`、9 份核心 feature spec（001／006／007／008／010／012／013／014／015／000）、11 份關鍵 ADR（009/010/012/014/015/019/021/022/026/029/031）、9 份產品文件（README／prd／baseline-summary／impact-map／story-map／ia／functional-map／task-type-taxonomy／milestones／reviewer-model-redesign）、dataset 016/017 最小 interface contract 段落，以及 `.specify/memory/constitution.md`（tool cache，逐段抽樣核對與 `specs/_governance/constitution.md` 一致，未發現漂移）均已直接讀取並可用 grep 於原始檔案定位引文。
- ADR-001/003/004/005/011/016/018/020/024/025/028/030 與 013-email-service-resend 屬 12.6 CONDITIONAL（僅正式實作/DB/API/observability/security/UI contract 需要時讀），本輪未涉及對應主題，**未讀取**，不在本文件引用範圍內；如後續工作流需要，需另行讀取後補充。
- account 002/003/004/005 spec 僅做版本與檔頭健檢（見 1.3），未逐條讀取 FR（12.6 CONDITIONAL，本輪跨角色旅程使用預建帳號，不阻擋核心流程）。
- backend-constitution.md／frontend-constitution.md 僅讀檔頭與適用範圍聲明（本輪為 spec 層盤點，非實作審查）。

---

## 1. 正典文件清單

### 1.1 正典優先序（依 issue 12.1，本文件不裁決，僅標注位階）

1. Issue #180 已確認範圍與驗收要求
2. `AGENTS.md` 與專案 constitution
3. `specs/_governance/*.md`；`.specify/memory/*.md`（tool cache）
4. Accepted ADR（新 ADR 明確 supersede 舊 ADR 時採新版）
5. 各 feature `spec.md` 與 `specs/_shared/constants.md`
6. 最新產品決策文件（如 `docs/product/reviewer-model-redesign.md`）
7. Prototype 與既有 Playwright tests（實作／UX 證據，不可反向取代規格）

> 註：位階 5 與 6 的相對順序在 12.1 原文中列為 5 在前、6 在後，但 `docs/product/reviewer-model-redesign.md` 自述「影響 spec 014、015；下游 spec 017」且其五個決策已於 2026-08-18 全數併入 014/015 現行版本（`specs/STATUS.md` 對應 changelog）。換言之，reviewer-model-redesign.md 的決策**已經內化進 014/015 spec 本身**，位階 5 與 6 在本案例中不衝突；但若未來出現「redesign 文件已更新、spec 尚未同步」的情境，5 與 6 孰先必須由主 agent 明確裁決（見 3.9）。

### 1.2 治理文件（Governance）

| 文件 | 檔頭版本 | 狀態 | 與 STATUS.md 對應 | 漂移 | 正典位階 |
|---|---|---|---|---|---|
| `AGENTS.md` | 無版本號（持續更新） | — | 不適用 | 無 | 位階 2 |
| `specs/_governance/constitution.md` | v1.31.0（Ratified 2026-03-18 / Last Amended 2026-06-02） | Governance 正式版 | 不適用 | 無 | 位階 3 |
| `specs/_governance/backend-constitution.md` | 無版本號欄位（僅 Source of truth 清單） | — | 不適用 | 無（內容與 `.specify/memory/backend-constitution.md` 抽樣一致） | 位階 3 |
| `specs/_governance/frontend-constitution.md` | 無版本號欄位 | — | 不適用 | 無 | 位階 3 |
| `specs/_governance/testing-constitution.md` | 無版本號欄位 | — | 不適用 | 無 | 位階 3 |
| `.specify/memory/constitution.md` | tool cache，應與 `specs/_governance/constitution.md` 同步 | — | 不適用 | 未發現內容漂移（抽樣核對） | 位階 3（cache） |
| `specs/_shared/constants.md` | v1.2.0（2026-08-12） | Active | 不適用 | 無版本漂移；但文件本身**自述兩項待統一項**（見 3.10） | 位階 5 |
| `specs/STATUS.md` | 無獨立版本號；以逐日 changelog 累積 | Single Source of Truth（流程狀態） | 自身即基準 | 見 1.3 版本漂移清單 | 對照基準，非位階本身 |

### 1.3 Feature Specs（MUST READ）＋ STATUS.md 版本漂移核對

逐一以 `grep '^版本:\|^狀態:' specs/[module]/[NNN]/spec.md` 取得檔頭，與 `specs/STATUS.md` 表格逐列比對：

| Spec | 檔頭版本／狀態 | STATUS.md 記載版本 | 漂移 | 備註 |
|---|---|---|---|---|
| `foundation/000-foundation` | v1.12.2 / Draft | v1.12.2 | 無 | STATUS 標示 `plan-ready` |
| `account/001-login-email-password` | v1.2.3 / Clarified | v1.2.2 | **有漂移**（檔頭領先 STATUS 一個 patch） | |
| `account/002-login-google-sso` | v1.2.2 / Clarified | v1.2.2 | 無 | 檔頭有**重複 frontmatter 區塊**（見 1.4） |
| `account/003-register-email-password` | v1.2.6 / Clarified | v1.2.3 | **有漂移**（檔頭領先 3 個 patch） | |
| `account/004-forgot-reset-password` | v1.1.3 / Clarified | v1.1.2 | **有漂移** | |
| `account/005-profile-settings` | v1.2.9 / Clarified | v1.2.9 | 無 | |
| `admin/006-user-management` | v1.0.8 / Clarified | v1.0.8 | 無 | 檔頭有重複 frontmatter（v1.0.6 殘留於第二區塊） |
| `admin/007-role-settings` | v1.1.11 / Draft | v1.1.4 | **有漂移**（檔頭領先 7 個 patch） | |
| `shared/008-sidebar-navbar-shared` | v1.4.0 / Clarified | v1.4.0 | 無 | 檔頭有重複 frontmatter（v1.3.9 殘留） |
| `shared/018-help-button` | v1.1.1 / Deferred | v1.1.1 | 無 | |
| `dashboard/012-dashboard` | v2.0.2 / In Progress | v2.0.2 | 無 | |
| `task-management/010-task-list` | v2.0.2 / In Progress | v2.0.2 | 無 | |
| `task-management/013-task-new` | v6.9.1 / Draft | v6.9.0（備註另提及 v6.9.1 變更但表格主欄未更新） | **有漂移** | |
| `task-management/014-task-detail` | v2.6.0 / Draft | v2.6.0 | 無 | |
| `annotation/015-annotation-workspace` | v4.8.0 / Draft | v4.8.0 | 無 | |
| `dataset/016-dataset-analysis-list` | v2.1.0 / In Progress | v2.1.0 | 無 | 僅讀 12.6 最小 contract |
| `dataset/017-dataset-analysis-detail` | v2.1.0 / Draft | v2.1.0 | 無 | 僅讀 12.6 最小 contract |

**結論**：`specs/STATUS.md` 對 5 份 spec（account-001、account-003、account-004、admin-007、task-management-013）的版本欄位落後於 spec 檔頭本身，證實 issue 12.8「`specs/STATUS.md` 與多份 spec 檔頭的版本／狀態存在漂移」屬實（見 3.6）。account 系列漂移屬 CONDITIONAL 範圍（不阻擋本輪核心旅程），admin-007／task-management-013 建議一併修正（013 是 W1 核心旅程「建立任務」的直接來源 spec）。

### 1.4 文件品質觀察（非 spec 衝突，記錄供主 agent 判斷是否併入 issue）

`specs/account/002-login-google-sso/spec.md`、`specs/admin/006-user-management/spec.md`、`specs/admin/007-role-settings/spec.md`、`specs/account/003-register-email-password/spec.md`、`specs/account/004-forgot-reset-password/spec.md`、`specs/shared/008-sidebar-navbar-shared/spec.md` 的檔頭均出現**重複 frontmatter 區塊**（同一份檔案開頭出現兩次 `---\n功能分支...\n版本...\n狀態...\n---\n# 功能規格：...` 標題），第二區塊版本號多半落後於第一區塊。此為既有文件產生流程的殘留瑕疵（可能是版本 bump 時未清除舊 header），**不影響本輪核心旅程**（008 是 MUST READ 但其現行版本 v1.4.0 位於第一區塊、內容正確），但可能造成工具腳本（如自動化版本擷取）誤讀為「版本 A」。建議另立一個 `[Docs]` 類型 issue 統一清理，不建議阻擋 W1。

### 1.5 關鍵 ADR（MUST READ，均為 Accepted）

| ADR | 標題 | Status／Date | 與其他 ADR／constitution 的關係 |
|---|---|---|---|
| 009 | Testing Strategy — pytest + Playwright | Accepted / 2026-03-19 | E2E 位置定義為 `frontend/tests/`（見 3.4） |
| 010 | Config-Driven Task Architecture | Accepted / 2026-03-19；Amended 2026-06-02（ADR-029 evolves schema） | 位階 4；被 ADR-029 部分演化 |
| 012 | Frontend Testing Strategy — Vitest + RTL + Playwright | Accepted / 2026-04-03 | E2E 位置同樣為 `frontend/tests/`（見 3.4） |
| 014 | Prototype-Layer Playwright Testing | Accepted / 2026-04-07；Updated 2026-08-18（server 改為 `serve.mjs`） | prototype tests 位於 `design/prototype/tests/`，與正式 E2E 目錄無關，不在 3.4 衝突範圍內 |
| 015 | Role-Based Progressive Onboarding | Accepted / 2026-04-14 | 定義 onboarding segment ↔ role mapping，與跨角色旅程入口相關 |
| 019 | AI Traceability and Audit Logging | Accepted / 2026-05-29 | `ai_run` 記錄為 AI 輔助工作流的稽核；**不等同**於 issue 要求的「使用者操作審計軌跡可重建專案生命週期」（見 4.1，此為使用者行為 audit，ADR-019 專注於 AI 工作流 audit，兩者目的不同，不可互相取代） |
| 021 | JWT Authentication and Refresh Token Strategy | Accepted / 2026-05-29 | system role 存於 JWT（`user`／`super_admin`），task role 一律即時查詢 `task_membership`，不存於 JWT——這是原型層（query params 模擬）與正式 E2E（JWT/RBAC）分層驗證的關鍵依據（見 issue #180 第 6 節） |
| 022 | Task State Machine Implementation Location | Accepted / 2026-05-29 | 定義五態狀態機與 `official_run_in_progress → completed` 前置條件（見 3.5，此即已知缺口） |
| 026 | Two-Layer i18n Strategy | Accepted / 2026-06-04 | 前端 UI 字串 vs 後端 `detail` 訊息分層，未見與 spec 衝突 |
| 029 | Output-Type Composition Model | Accepted / 2026-06-29；Amended 2026-07-22、2026-07-24 | 以 `outputs[]` 取代固定 `TASK_TYPE_ENUM`；見 3.7 |
| 031 | Sequence Tagging Tokenization — Versioned Contract | Accepted / 2026-07-28 | tokenization 為標記資料契約一部分；013 v6.2.0/v6.3.0 已落地 producer-side，014/015/016/017 consumer 明確標示延後（未讀對應延後細節，屬 dataset-analysis 相關 016/017 部分不在本輪範圍） |

### 1.6 產品文件（MUST READ）

| 文件 | 版本 | 日期 | 狀態 | 與現行 spec 的時間關係 |
|---|---|---|---|---|
| `docs/product/README.md` | 無版本號 | — | 索引文件 | — |
| `docs/product/prd.md` | v1.0.0 | 2026-06-02 | Draft | **早於** reviewer-model-redesign.md（2026-08-14~18）與 014/015 現行版本，見 3.1 |
| `docs/product/baseline/product-baseline-summary.md` | v1.0.0 | 2026-04-14 | — | 早於上述所有審核模型變更 |
| `docs/product/impact-map/impact-map.md` | v1.1.0 | 2026-04-14 | — | 同上 |
| `docs/product/story-map/story-map.md` | v1.3.0 | 2026-04-14 | — | 同上；含「三步驟」與舊審核語意（見 3.1、3.2） |
| `docs/product/ia/information-architecture.md` | v1.4.3 | 2026-05-29 | — | 早於審核模型重構（P1~P5 於 2026-08-18 全數合併），dataset-analysis 章節仍用舊 `TASK_TYPE_ENUM`（見 3.7） |
| `docs/product/functional-map/functional-map.md` | v6 | 2026-05-19 | — | 未逐條核對內容（僅供 IA 上游來源，本輪未發現與核心旅程直接衝突之處） |
| `docs/product/functional-map/task-type-taxonomy.md` | 無獨立版本號 | — | — | 內容**已對齊** ADR-029 composable outputs 模型（見 3.7，非衝突文件） |
| `docs/product/milestones.md` | v1.0.1 | 2026-06-03 | — | 早於審核模型重構；狀態機圖示仍為五態未含 review/dispute/arbitration 細節（與 3.5 同一缺口的產品側回聲） |
| `docs/product/reviewer-model-redesign.md` | 無版本號；狀態「已完成（2026-08-18）」 | 2026-08-14 起草，2026-08-18 完成 | 已完成，P1~P5 全數合併 | 位階 6；**已內化進 014 v2.3.0~v2.6.0、015 v3.8.0~v4.8.0** |

### 1.7 Dataset 016/017 — 僅 12.6 最小 interface contract

| 文件 | 版本 | 讀取範圍 | 用途（本輪） |
|---|---|---|---|
| `specs/dataset/016-dataset-analysis-list/spec.md` | v2.1.0 | `TASK_ROLES_ALLOWED`、membership 語意（FR-002）、`IAA_BADGE_STATES`（FR-004A）、路由 `/dataset-analysis` | 確認 PL／Reviewer 從 task-detail／Dashboard 進入資料集分析的最小 gate 資訊可用 |
| `specs/dataset/017-dataset-analysis-detail/spec.md` | v2.1.0 | `OUTPUT_TYPE_IAA_REGISTRY`（gate 用主指標與門檻常數）、`IAA_GATE_EXCLUDED_TYPES = free_text`、`IAA_COMPOSITE_BADGE_FORMAT`（x/y 徽章）、Exit points（`annotation-results.md:453` 對應段落：雙 Tab 頁內切換／麵包屑返回任務列表／空狀態按鈕跳轉至 `task-detail`） | 確認「指標可用、負責人可判讀、可退回或進入正式回合」的最小 gate 契約存在且有明確返回入口 |

---

## 2. 生命週期節點 × 規格對照

依 issue 12.1／12.7 順序：建立專案 → 上傳資料 → 設定專案 → 成員管理 → 試標 → IAA gate → 正式標記 → 審核 → 仲裁 → 完成 → 匯出。

| 流程節點 | 角色 | 正典 Spec／FR／ADR | 可 grep 出處 | 判定 |
|---|---|---|---|---|
| 建立專案（四步驟精靈） | Project Leader | `013-task-new` `TASK_CREATION_STEPS = step-1-basic \| step-2-config-builder \| step-3-startup-settings \| step-4-guideline` | `specs/task-management/013-task-new/spec.md:53` | 一致（013 為權威，010/PRD/IA 對齊；story-map 過期，見 3.2） |
| 上傳資料＋欄位對應＋預覽 | Project Leader | 013 Step 1（資料集上傳、`field_role_map`）；014 FR-014h／FR-014k 要求 Overview 編輯模式沿用 013 Step 1 同構元件 | `specs/task-management/014-task-detail/spec.md:552,555` | 一致 |
| 設定專案（標籤／規則／指引） | Project Leader | 013 Step 2（`OUTPUT_TYPE_REGISTRY`）；014 FR-014l／FR-014l-1／FR-014l-2 要求 014 標記設定編輯與 013 Step 2 共用同一 registry/schema/config source-of-truth | `specs/task-management/014-task-detail/spec.md:556-558` | 一致 |
| 試標抽樣／最低標記員人數設定 | Project Leader | 014 FR-010／FR-010d／FR-010q（`sampling_value >= 1 且 < dataset_total`；`min_annotators >= 2`）；ADR-022 前置條件「≥ 2 annotators assigned」 | `specs/task-management/014-task-detail/spec.md:516,534`；`docs/adr/022-task-state-machine-location.md:85` | **待決策**——`min_annotators`（config 目標值）與 ADR-022「assigned 人數」（實際成員數）語意是否等價、由誰檢查發布前置條件未明確定義（見 3.9） |
| 成員管理（加入／啟用／停用／審核指派） | Project Leader | 014 FR-005～FR-005k（含 v2.4.0 新增審核指派區塊）；`TaskMember`／`ReviewAssignment` 實體（reviewer-model-redesign.md §7） | `specs/task-management/014-task-detail/spec.md:496-507`；`docs/product/reviewer-model-redesign.md:244-253` | 一致（014 v2.4.0 已落地 redesign 決策） |
| 審核設定（`min_reviewers`／指派方式／一致即定案／仲裁） | Project Leader | 014 FR-010s～FR-010s-2（僅存在於 task-detail，013 Step 3 刻意不含審核設定） | `specs/task-management/014-task-detail/spec.md:536-538`；`docs/product/reviewer-model-redesign.md:34`（「`task-new` Step 3 完全不加審核設定」定案） | 一致（013 範圍外為刻意決策，非缺漏） |
| 試標啟動＋標記員填答 | Annotator | 014 FR-013（`draft` 顯示「新增試標回合 R1」）；015 annotator 視角（AC-1.x 系列，草稿/提交/導覽） | `specs/task-management/014-task-detail/spec.md:542`；`specs/annotation/015-annotation-workspace/spec.md`（AC-1 系列） | 一致 |
| IAA gate（試標完成 → 等待確認 → 退回或進正式） | Project Leader | ADR-022 transition table（`dry_run_in_progress → waiting_iaa_confirmation`：全部試標提交且 IAA 已計算；`waiting_iaa_confirmation → official_run_in_progress`：PL 確認；`waiting_iaa_confirmation → draft`：PL 拒絕）；014 FR-008a（自動轉換條件）；dataset-017 `OUTPUT_TYPE_IAA_REGISTRY`（gate 用門檻） | `docs/adr/022-task-state-machine-location.md:83-91`；`specs/task-management/014-task-detail/spec.md:513`；`specs/dataset/017-dataset-analysis-detail/spec.md:73-91` | 一致（三份文件對齊，惟 dataset-017 詳細 UI 屬排除範圍，僅驗最小 gate） |
| 正式標記 | Annotator | 014 FR-010f-3（正式清單筆數＝`dataset_total - Σ 試標回合筆數`）；015 official_run 標記流程 | `specs/task-management/014-task-detail/spec.md:525` | 一致 |
| 審核（獨立逐標記員審核＋直接修正） | Reviewer | 015 FR-051～FR-053（`ReviewUnit` = `sample_id × annotator_id × run_type`；審核卡兩種 `run_type` 共用同一版面，同意→下一筆／不同意→當場改標） | `specs/annotation/015-annotation-workspace/spec.md:641,643`；`docs/product/reviewer-model-redesign.md:14,26` | 一致（015 現行版本已完全落地 redesign；**但 PRD/IA/story-map/impact-map 仍描述舊「通過/退回」聚合審核語意**，見 3.1） |
| 爭議聯集＋第三人仲裁 | Reviewer（第三人／仲裁者） | 015 FR-059（`DisputeItem` 逐項推導）、FR-060（仲裁資格＝`can_arbitrate` 旗標 AND 非當事人）、FR-061（逐項 A/B 仲裁版面＋多數決收斂）；014 FR-005k（成員管理爭議池列＋分派給仲裁者） | `specs/annotation/015-annotation-workspace/spec.md:664-681`；`specs/task-management/014-task-detail/spec.md:507` | 一致 |
| 完成（`completed`） | Project Leader（系統判定） | ADR-022（`official_run_in_progress → completed`：僅列「All official-run annotations submitted; final scores calculated」）；014 FR-013／邊界情況（僅提「Official Run 中存在未指派標記作業…未處理前不得標記為 completed」） | `docs/adr/022-task-state-machine-location.md:89`；`specs/task-management/014-task-detail/spec.md:464,542,352-353` | **Requirement Gap**——未見任一 spec／ADR 明確要求「必要 review unit 已定案、無未解決 dispute、必要仲裁已完成」為 `completed` 前置條件（見 3.5、4.1） |
| 匯出 | Project Leader／Reviewer（唯讀） | 014 FR-009／FR-009a／FR-010i／FR-010i-1／FR-010i-2（metadata、re-download 快照）；annotation-results tab 之匯出（FR-015e～FR-015l） | `specs/task-management/014-task-detail/spec.md:514,527-529,582-595` | 一致（匯出 metadata 契約完整，含 `applied_iaa_metrics`／`sample_snapshot_id`／排除紀錄摘要） |
| 跨頁狀態一致性（Dashboard／task-detail／annotation-list／annotation-results／匯出） | 全角色 | 014 v2.7.2 changelog：「統計與 Dashboard 同任務列項同一資料來源」；015 FR-056：reviewer 清單筆數「刻意與 `annotation-list` 的 `共 N 筆`（FR-055）一致，兩處必須相同」 | `specs/STATUS.md`（014 changelog v2.7.2 段落）；`specs/annotation/015-annotation-workspace/spec.md:653` | 一致（規則已在 spec 中明文要求同源，惟 Dashboard PL 視圖本身缺乏可直接判讀待辦 IAA 任務的入口，見 4.2） |

---

## 3. Spec Conflict 清單

以下逐項核實 issue 12.8 列出的已知風險，並列出額外發現之衝突。**本節僅列出雙方原文引文與待決策問題，不裁決優先序。**

### 3.1 Reviewer model 語意（PRD／IA／story-map／impact-map 舊語意 vs 014/015/reviewer-model-redesign 新語意）—— **屬實**

- **舊語意（多處）**：
  - `docs/product/prd.md:113`：「→ 通過 / 退回標記結果（附原因）；協助產出 Dry Run 標準答案」
  - `docs/product/prd.md:198`：「FR-AN07：Reviewer 在 `annotation-workspace` 可執行審核模式：通過 / 退回標記結果、修改或刪除錯誤標記」
  - `docs/product/ia/information-architecture.md:445`：「功能（Reviewer）：審查模式，可通過 / 退回標記結果、直接修改或刪除錯誤標記、協助產出 Dry Run 標準答案（多數決或手動確認）」
  - `docs/product/story-map/story-map.md:74-75,189,201-202,207,273`：「查閱已提交標記，執行抽查或全審」「看到待審 → 比對內容 → 通過 / 退回 → 填寫原因」
  - `docs/product/impact-map/impact-map.md:47,49`：「能查閱已提交的標記結果，執行抽查或全審」「能查看 IAA 報告，協助產生 Ground Truth」
- **新語意（現行權威）**：
  - `docs/product/reviewer-model-redesign.md:14`：「審核員與標記員看到相同的資料呈現，同意 → 直接下一筆、不同意 → 當場改標籤（明確否決『只有通過／退回按鈕』的設計）」
  - `specs/annotation/015-annotation-workspace/spec.md:641,643`（FR-051、FR-053）：審核單位＝樣本×標記員，逐標記員個別審核，無聚合通過/退回、無 dry_run 專屬共識合併模型
  - `specs/annotation/015-annotation-workspace/spec.md:64`：「**v4.0.0 廢止**：dry_run 不再產出樣本層級 gold，本常數與 `GoldRecord` 一併失效」——與 impact-map:49「協助產生 Ground Truth」直接矛盾
- **影響角色／節點**：Reviewer 全流程（審核、仲裁）、Project Leader（對審核模型的認知與驗收預期）
- **待決策**：PRD／IA／story-map／impact-map 是否需要一次性同步至現行 014/015/reviewer-model-redesign 語意？若在同步完成前即開始 Playwright 驗收文件撰寫，應以何者為準（issue 12.1 位階 5/6 vs 位階 6 產品全景文件的順位，見 1.1 附註）？

### 3.2 三步／四步建立任務流程 —— **屬實**

- **四步驟（多數且與 013 spec 一致）**：
  - `specs/task-management/013-task-new/spec.md:53`：`TASK_CREATION_STEPS = step-1-basic | step-2-config-builder | step-3-startup-settings | step-4-guideline`
  - `docs/product/prd.md:51`：「四步驟精靈建立任務（spec 013）」
  - `docs/product/prd.md:175`（FR-T01）：「`project_leader` 可透過四步驟精靈建立任務（基本資料 + 標記設定檔 + 啟動設定 + 標記說明）」
  - `docs/product/ia/information-architecture.md:46,125,312`：「四步驟建立流程」「分四步驟完成（Step 1 → Step 2 → Step 3 → Step 4）」
- **三步驟（過期）**：
  - `docs/product/story-map/story-map.md:43`：「三步驟精靈建立任務（基本資料 + Config Builder + 標記說明）」——缺少「啟動設定」（Step 3）
- **影響角色／節點**：Project Leader「建立專案」節點的 Playwright 驗收步驟數與畫面預期
- **待決策**：story-map.md 是否需版本 bump 更新為四步驟？（此項衝突內部一致性高，四步驟一方證據壓倒性更多，但仍需明確記錄決策而非靜默採用）

### 3.3 試標是否產生 gold 的規則 —— **現行 spec 內部已統一，但下游產品文件未同步**

- **現行規則（015 v4.0.0 起）**：`specs/annotation/015-annotation-workspace/spec.md:64`「dry_run 不再產出樣本層級 gold」；`docs/product/reviewer-model-redesign.md:27`「dry_run 不產 gold：試標的產出是 IAA 與每位標記員的被修改率；gold 只在正式標記產生」
- **未同步之處**：`docs/product/impact-map/impact-map.md:49`（Reviewer「協助產生 Ground Truth」，未區分 dry_run/official_run）
- **判定**：此為 3.1 的子集，非獨立衝突，但因 issue 12.8 單獨列出，於此重申：**spec 015 本身已無衝突**（已統一為「official_run 才產生 gold」），衝突僅存在於 spec 與尚未同步的產品全景文件之間。
- **待決策**：同 3.1。

### 3.4 正式 E2E 目錄：ADR-009／012／014 vs testing constitution —— **屬實**

- **ADR-009**：`docs/adr/009-testing-strategy.md:98`：「E2E (core user flows) | Playwright | `frontend/tests/` | PR and main branch」
- **ADR-012**：`docs/adr/012-frontend-testing-strategy.md:28`：「E2E (User Journey) | Playwright | Full user journeys across pages and roles | `frontend/tests/`」；並於 356-394 行列出完整 `frontend/tests/` 目錄結構與 5 個 IA journey spec 檔案
- **Testing Constitution**：`specs/_governance/testing-constitution.md:56`：「Frontend E2E tests must use Playwright under `e2e/[module]/`.」
- **ADR-014**：僅規範 prototype 層（`design/prototype/tests/`），與正式 E2E 目錄無關，**不構成本項衝突的第三方**，但 issue 12.8 提及需一併核對——已核對確認 ADR-014 不涉及 `frontend/tests/` vs `e2e/[module]/` 之爭。
- **影響角色／節點**：整個 issue #180 第 5、6 節「Playwright 文件與測試設計」「分層驗證範圍」——若不先決議目錄，正式全端 E2E 的檔案路徑規劃無法定案
- **待決策**：`frontend/tests/`（ADR-009/012，日期較早：2026-03-19／2026-04-03）或 `e2e/[module]/`（testing-constitution，日期未知但由主 constitution 引用 ADR-009/012/014 作為 source of truth，見 `specs/_governance/testing-constitution.md:3`）？注意 testing-constitution 開頭即聲明「Source of truth: ... ADR-009 ... ADR-012 ... ADR-014」，意味 testing-constitution 應該是這些 ADR 的**下游整理**而非另立新規則——目前卻與其聲明的來源直接矛盾，這本身就是一個需要澄清的治理完整性問題，不只是路徑選擇問題。

### 3.5 ADR-022 `completed` 前置條件未涵蓋 review／dispute／arbitration —— **屬實（Requirement Gap，見第 4 節）**

- **ADR-022 現行條件**：`docs/adr/022-task-state-machine-location.md:89`：「`official_run_in_progress` → `completed` | All official-run annotations submitted; final scores calculated」
- **014 spec 現行條件**：`specs/task-management/014-task-detail/spec.md:464`：「Official Run 中存在未指派標記作業：系統需提示 `project_leader` 重新指派或排除；未處理前不得將任務標記為 `completed`」——同樣只談「未指派標記作業」，未提及審核／爭議／仲裁完成度
- **issue #180 期望**：第 1 節第 49 行「建議至少包含正式標記完成、必要審核完成、無未解決歧異、必要仲裁完成及品質指標可用」；第 9 節第 196 行「所有正式 assignment 已提交、必要 review unit 已完成、無未解決 dispute 且必要仲裁完成後，專案才能進入完成狀態」
- **判定**：這不是「兩份文件互相矛盾」的 conflict，而是「兩份權威文件（ADR-022、014）在同一主題上皆未定義」的 gap——已移至第 4 節列為 Requirement Gap，此處僅標記其亦為 issue 12.8 已知風險項之一，並確認**現況核實無誤**。

### 3.6 `specs/STATUS.md` 與 spec 檔頭版本漂移 —— **屬實**

見 1.3 表格，5 份 spec 存在版本落差（account-001／003／004、admin-007、task-management-013）。**待決策**：是否於本輪一併修正 STATUS.md（屬輕量級 doc-only 修正，不影響本輪核心旅程判定，但可能誤導後續讀者判斷「最新版本」）。

### 3.7 固定 task type 文件 vs ADR-029 composable `outputs[]` 模型 —— **部分屬實，範圍侷限於 dataset-analysis 章節**

- **ADR-029 決策**：`docs/adr/029-output-type-composition.md:12-19,43-45`：以 `input_type + outputs[]` composable 模型取代固定 `TASK_TYPE_ENUM`
- **已對齊文件**：`docs/product/functional-map/task-type-taxonomy.md`（全文採三層 `task_category / input_type / output_type` 分類法，並在檔案開頭第 17 行明確記錄 `span → entity_recognition`、`relation_triple → relation_identification`、`token_class → sequence_tagging` 的技術識別碼遷移，**未見與 ADR-029 衝突**）
- **未對齊文件**：`docs/product/ia/information-architecture.md:474-486`——資料集分析（dataset-analysis）章節仍使用舊 `TASK_TYPE_ENUM` 五值（`single_sentence_classification`、`single_sentence_va_scoring`、`sequence_labeling`、`relation_extraction`、`sentence_pairs`）定義圖表類型與 IAA 主指標對照表
- **範圍澄清**：此衝突落在 dataset-analysis 主題內，而 issue #180 第 0 節明確排除「資料集分析模組」與「dataset 專屬 spec、圖表」的走查（12.7 亦排除 016/017 除最小 interface contract 外的內容）。**但 IA 文件本身是 12.5 MUST READ**，故此衝突仍記錄於此，僅標注其*修正範圍*屬於資料集分析模組、應留待該模組獨立盤點階段處理，不建議在本輪 W1 產生對應的資料集分析功能 issue（符合 issue 0 節「不因本輪走查結果新增或調整資料集分析功能 issue」的邊界）。
- **待決策**：IA §dataset-analysis 章節的 `TASK_TYPE_ENUM` → `OUTPUT_TYPE_KEYS` 同步，記錄為未來資料集分析模組盤點階段的已知待辦，不在本輪處置。

### 3.8 審核操作模型（直接修改 vs 通過／退回 vs 其他）—— 已併入 3.1，現況：**015 spec 本身無衝突**

015 現行版本（FR-053）已明確定義兩種 `run_type` 共用同一套「作答面板同時作為顯示與編輯用途＋Bypass 列通過/退回按鈕」模型，無「退回打回重做」的獨立語意層。此為 3.1 範疇內的產品文件同步問題，不重複列出。

### 3.9 最低標記員人數設定與狀態轉換前置條件 —— **屬實（語意銜接未明確）**

- **ADR-022**：`docs/adr/022-task-state-machine-location.md:85`：`draft → dry_run_in_progress` 前置條件為「**≥ 2 annotators assigned**」（實際成員指派數）
- **014 spec**：`specs/task-management/014-task-detail/spec.md:534`（FR-010q）：「`min_annotators >= 2`」為**設定欄位的合法值驗證規則**（IAA 抽樣分母目標值），非任務發布前置條件檢查
- **判定**：兩者談的是不同層面的「2」——ADR-022 講「任務目前有幾位 active annotator 成員」，014 FR-010q 講「`min_annotators` 這個設定欄位本身的合法輸入範圍」。**未見任何 FR 明確規定「當 active annotator 成員數 < `min_annotators` 時，阻擋『新增試標回合 R1』按鈕並顯示原因」**——014 FR-013（run 控制按鈕顯示邏輯）僅描述按鈕依任務狀態顯示，未描述其依成員數量的 disabled 條件；issue #180 第 2 節第 62 行要求「缺少必要資料、成員不足或設定不完整時，不可發布且須指出具體原因」。
- **影響角色／節點**：Project Leader「試標」節點發布前置檢查
- **待決策**：需要新增一條 FR 明確定義「active annotator 成員數 < `min_annotators` 時阻擋發布」的檢查與錯誤文案，並同步更新 ADR-022 使其「≥ 2 annotators assigned」與 014 的 `min_annotators` 欄位建立顯式引用關係（目前兩份文件各自定義「2」，無交叉引用）。

### 3.10 `specs/_shared/constants.md` 自述之待統一項（非新發現，隨附引用供追溯）

- `TASK_ROLES` 別名衝突：`specs/_shared/constants.md:78`：015 定義為 `annotator | reviewer` 子集，其餘 4 份（010/013/014/007）為 `project_leader | reviewer | annotator`——常數文件自身已標記為「屬子集，仍應改為引用本文件並於情境中限縮」，屬已追蹤的低嚴重度技術債，非本輪新增衝突。
- 同值異名：`TASK_STATUSES`（014）→ `TASK_STATUS_ENUM`；`RUN_TYPES`（015）→ `RUN_STAGE_ENUM`；`IAA_SUMMARY_STATES`（017）→ `IAA_BADGE_STATES`（`specs/_shared/constants.md:83`）——已追蹤，非本輪新增。

### 3.11 Testing constitution 與其聲明來源 ADR 的自我矛盾（新發現，衍生自 3.4 的治理完整性問題）

`specs/_governance/testing-constitution.md:3` 開頭聲明「Source of truth: ... `docs/adr/009-testing-strategy.md` ... `docs/adr/012-frontend-testing-strategy.md` ... `docs/adr/014-prototype-playwright-testing.md`」，但其第 VI 節（E2E Tests，line 56）給出的目錄規則與這三份 ADR 的內容直接相反（`e2e/[module]/` vs `frontend/tests/`）。**這不只是「兩個文件路徑不同」的表面衝突，而是「聲明繼承來源的下游文件推翻了其聲明的來源」的治理邏輯缺口**——若 testing-constitution 是刻意 supersede ADR-009/012 的路徑決策，缺少一份新 ADR 或 constitution changelog 記錄「為何從 `frontend/tests/` 改為 `e2e/[module]/`」；若非刻意，則是撰寫時的疏漏。**待決策**：需要一份 ADR 或治理 changelog 明確記錄此路徑變更的決策與理由，而不只是修正路徑字串本身。

---

## 4. Requirement Gap 清單

### 4.1 `completed` 狀態的完整前置條件未定義（Blocking 等級，影響「完成」節點的 Playwright 驗收設計）

- **現況**：ADR-022（`docs/adr/022-task-state-machine-location.md:89`）與 014 spec（`specs/task-management/014-task-detail/spec.md:464`）僅將「official-run 標記全數提交」列為 `completed` 前置條件；015 spec 定義了 `ReviewUnit`／`DisputeItem` 完整狀態機（`finalized`／`disputed` 等，見 2.）但**未見任何一份文件把「所有必要 `ReviewUnit` 已達 `finalized`」「無 `disputed` 未解決」「必要仲裁已完成」明確接回任務層級 `completed` 轉換條件**。
- **issue #180 期望**（第 1 節第 49 行、第 9 節第 196 行）明確要求此條件，證實這是產品意圖而非本文件臆測，但尚未落地為可驗收的 FR／ADR 條文。
- **影響**：Playwright 工作流（senior-qa）若要驗證「仲裁完成後任務才能進入 completed」，目前**沒有可引用的正典 FR／SC 編號**可供斷言依據；需要先產生 spec 決策（新增 FR 或修訂 ADR-022），才能定義對應 Given/When/Then。
- **建議處置**：依 issue 11 節 Finding→Issue 對應表，屬「Requirement gap 導致工作無法繼續」→ `Task` 類型（label `task`），需在正式開始 Playwright scenario 設計前，由主 agent／team-lead 提交產品決策 checkpoint。

### 4.2 Project Leader Dashboard 任務列項缺乏可直接判讀／執行的待辦入口

- **現況**：`specs/dashboard/012-dashboard/spec.md:226-241`（區塊 B「任務列表」欄位定義）明確列出 PL 任務列項僅含「任務名稱、任務摘要、badge 群組、完成率 progress bar」，**唯一操作是區塊層級的『查看全部』按鈕**（導向 `/task-list`，非特定任務）。相較之下，Annotator（`specs/dashboard/012-dashboard/spec.md:273,279-282`）與 Reviewer（同檔 315,321-323）皆有逐列「快速繼續」／「快速審核」CTA。
- **issue #180 第 8 節第 184 行**：「專案負責人看到等待 IAA 的項目時，應有直接可執行的待辦入口」——這是 UX 走查工作流的預期發現點，但**根源在 spec 012 本身尚未定義 PL 逐列 CTA**，不是 prototype 實作偏離 spec，而是 spec 尚未規範此行為。
- **判定**：`Spec-defined behavior 不足`（spec 目前刻意只有聚合入口，無逐列 CTA）——依 issue 12.7「prototype 尚未實作但 spec 已明確規範時，標記為『Spec-defined / Not implemented』」規則不適用（因為 spec 本身就沒有規範逐列 CTA，不是「spec 有、prototype 沒做」）；依「關鍵流程完全沒有規格...時，標記為 Requirement gap」規則，此為 **Requirement Gap**：012 spec 尚未定義「PL 任務列項需要依任務狀態（尤其 `waiting_iaa_confirmation`）提供對應的直接操作入口」這條需求。
- **建議處置**：`Feature Change`（`enhancement`）或 `Task`（若視為規格缺漏需先決策）——建議由 senior-uiux 工作流以 prototype 實測結果佐證後，交由 team-lead 決定 issue 類型。

### 4.3 013 Step 3（啟動設定）與試標發布之間，成員數量不足的具體阻擋規則未定義

延續 3.9，此處單獨列為 gap：issue #180 第 2 節第 62 行要求「成員不足...時，不可發布且須指出具體原因」，但 014 spec 中目前找不到一條 FR 明確描述「試標啟動按鈕在 active annotator 數 < `min_annotators`（或 ADR-022 講的『≥2』）時 disabled，並顯示具體缺口原因（例如：還差 N 位標記員）」。`specs/task-management/013-task-new/spec.md` 亦不含此規則（Step 3 刻意不涉及審核設定，但仍會設定 `min_annotators`——該欄位的下游強制檢查點應在 014，但 014 現有 FR 未涵蓋)。

### 4.4 使用者操作稽核軌跡（audit trail）可重建生命週期的正典來源未確認

issue #180 第 9 節第 198 行要求「audit log 可重建專案從建立到完成的主要操作歷程」。本輪讀取到的：
- ADR-019（AI Traceability and Audit Logging）——**明確針對 AI 輔助工作流**（Planner/Generator/Evaluator run 級別的 traceability），非使用者操作審計。
- 015 spec 的 `AnnotationHistoryItem`／`actor_id`（FR-050）——涵蓋標記／審核／仲裁層級的操作歷程，但屬 annotation 模組。
- 014 spec 的 `RunStateTransition`（ADR-022 定義）——涵蓋任務狀態轉換的審計記錄。
- **未見**一份整合性文件（spec 或 ADR）明確定義「使用者操作審計」的整體資料模型（例如：member 加入/移除、guideline 編輯、export 下載等操作是否都進入同一套可查詢的 audit trail）。目前的稽核紀錄分散在 `RunStateTransition`（狀態轉換）、`AnnotationHistoryItem`（標記/審核事件）、006 使用者管理的帳號操作審計（`specs/admin/006-user-management/spec.md` 提及「寫入審計紀錄」但未定義結構）三處，是否共用同一份 audit log 資料模型／查詢介面**未被任何單一文件宣告**。
- **建議處置**：`Spike`（`spike`）——需先確認 audit trail 是否需要新的整合 spec，或現有三處分散記錄已經足以拼湊出完整歷程（純後端資料模型問題，建議與 senior-sa／senior-architect 後續介面設計階段一併確認，不阻擋本輪 spec 盤點）。

---

## 5. 狀態與未解決事項

**狀態：DONE_WITH_CONCERNS**

### 未解決事項（需团隊決策，非本文件自行裁決）

1. 3.1／3.2／3.3：PRD／IA／story-map／impact-map／baseline-summary 五份產品全景文件均早於 reviewer-model-redesign.md（2026-08-14~18 完成）與 014/015 現行版本，尚未同步四步驟建立流程與新審核模型語意——需要決定是否／何時批次更新這批文件，以及在更新前，Playwright 驗收文件應明確聲明「以 013/014/015/reviewer-model-redesign 為準，PRD/IA/story-map/impact-map 該段落視為已知過期」。
2. 3.4／3.11：正式 E2E 目錄 `frontend/tests/`（ADR-009/012）vs `e2e/[module]/`（testing-constitution）——這是 issue 第 6 節「統一正式 E2E 測試目錄；目前 ADR 與 testing constitution 的路徑描述不一致，需在實作前決議」明確要求的決策點，且發現 testing-constitution 自我矛盾其聲明的 source-of-truth，需要一份新 ADR 或治理 changelog 才能真正解決（不只是選一個路徑）。
3. 3.7：IA 文件 dataset-analysis 章節的舊 `TASK_TYPE_ENUM` 已記錄，依 issue 邊界不在本輪處理，留待資料集分析模組獨立盤點階段。
4. 3.9／4.3：`min_annotators`（config 值）與 ADR-022「≥2 annotators assigned」（實際成員數）之間的檢查邏輯需要新增 FR 並建立兩份文件的交叉引用。
5. 4.1：`completed` 前置條件是本輪最關鍵的 Requirement Gap，直接阻擋「完成」生命週期節點的 Playwright Given/When/Then 設計；建議此項優先進入產品決策 checkpoint。
6. 4.2：PL Dashboard 待辦入口需要 senior-uiux 工作流的 prototype 實測結果交叉驗證後，才能確定是 Requirement Gap 還是可歸類為單純 UX finding。
7. 1.3：`specs/STATUS.md` 版本漂移清單（5 份 spec）建議一併輕量修正，不阻擋 W1 交付。
8. 12.6 CONDITIONAL 範圍中的 ADR-001/003/004/005/011/016/018/020/024/025/028/030 與 013-email-service-resend 本輪未讀取（依 issue 條件不適用於本輪主題），若後續工作流（尤其 senior-qa 的正式 E2E 設計）觸及對應主題，需要另行讀取後補充本文件或另立 addendum。

### 涵蓋率備註

- 12.5 MUST READ 清單中的治理文件、9 份核心 feature spec、11 份關鍵 ADR、9 份產品文件、AGENTS.md 均已直接讀取並可追溯引文。
- 12.6 中僅 dataset 016/017 依範圍讀取最小 interface contract；其餘 12.6 CONDITIONAL 文件（account 002-005 逐條 FR、admin 006/007 全文、ADR 條件清單、`.claude/` 規則與 skill 文件）僅作存在性確認或未讀取，不構成本文件結論的引用來源。
- 未執行 prototype 或 Playwright 測試操作（依任務邊界，屬其他 sub-agent 工作流範圍）。

# Label Suite — 產品需求文件（Product Requirements Document）

**版本：** 1.0.0
**日期：** 2026-06-02
**狀態：** Draft
**撰寫者：** Team Lead（基於 Research Phase 綜合）
**可追溯來源：**
- `specs/_governance/constitution.md` v1.29.1
- `docs/product/ia/information-architecture.md` v1.4.3
- `docs/product/story-map/story-map.md` v1.3.0
- `docs/product/impact-map/impact-map.md` v1.1.0
- `docs/product/functional-map/functional-map.md` v6
- `docs/product/functional-map/task-type-taxonomy.md`
- `docs/product/baseline/product-baseline-summary.md` v1.0.0
- `docs/thesis/outline.zh-TW.md`
- `specs/STATUS.md`
- `README.md`

---

## 1. Executive Summary（產品摘要）

Label Suite 是一套**以設定檔驅動（Config-Driven）的通用型 NLP 資料標記與自動評估平台**，以學術 NLP 實驗室為主要目標群體。本系統作為碩士論文 Demo Paper 的核心研究成果，旨在解決現有標記工具（如 Label Studio）對非工程背景研究人員門檻過高、工作流程碎片化，以及缺乏內建資料集品質可視性等痛點。

Label Suite 的核心價值主張在於：研究人員只需撰寫一份簡單的 YAML/JSON 設定檔，即可在不修改任何核心程式碼的情況下，啟動涵蓋分類、VA 評分、序列標記、關係抽取及句對任務等多種 NLP 任務類型的標記流程。同時，系統將任務配置、Dry Run 驗證、正式標記、審核協作，以及資料集統計分析整合於單一入口，取代過往研究團隊需手動串接多個工具的低效流程。

本論文的學術貢獻聚焦於三個面向：（1）配置驅動架構使標記任務的通用性與可重複使用性成為可能；（2）Dry Run / Official Run 機制確保標記流程的可重現性與資料公平性；（3）內建資料集分析（#Sentence、#Token、#Label 統計與 IAA 指標）讓研究人員在標記階段即可持續監控資料品質，無需另行撰寫分析腳本。

---

## 2. 產品目標與成功指標（Product Goals & Success Metrics）

### 2.1 研究目標

| 目標 | 說明 | 可量化指標 |
|------|------|-----------|
| G-01 | 實作可展示的 Demo Paper 系統 | 完成 R1（Demo Core）功能集，可執行完整標記閉環 demo |
| G-02 | 驗證配置驅動通用性 | 透過單一 Config 支援 ≥ 5 種 NLP 任務類型，無需修改核心程式碼 |
| G-03 | 降低標記任務啟動成本 | 初始化任務所需操作步驟數 < Label Studio 同任務步驟數（量化對比） |
| G-04 | 內建資料集分析 | #Sentence、#Token、#Label 統計精確度與手算結果誤差 ≤ 0 |
| G-05 | 高使用者滿意度 | SUS 問卷（5~10 位實驗室成員）整體易用性評分目標達 ≥ 75 分 |
| G-06 | Demo Paper 論文可重現性 | 系統 demo video 可展示 2~3 個完整使用情境 |

### 2.2 Demo Paper 論文貢獻視角

| 論文貢獻 | 系統功能對應 |
|---------|------------|
| C-01：配置驅動通用型標記平台 | Config Builder（spec 013）+ task type registry + foundation spec |
| C-02：整合一體化標記工作流 | 任務建立 → Dry Run → IAA → Official Run → 匯出（specs 013, 014, 015） |
| C-03：內建資料集分析功能 | Dataset Stats（spec 016）+ Quality Monitor（spec 017） |
| C-04：降低進入門檻 | 四步驟精靈建立任務（spec 013）+ 直覺式標記介面（spec 015） |

---

## 3. 使用者角色與核心旅程（User Roles & Journeys）

### 3.1 雙層角色模型

本系統採用雙層角色設計（來源：`information-architecture.md` §1）：

**系統角色（平台層級，儲存於 JWT）**

| 識別碼 | 名稱 | 職責 | 取得方式 |
|--------|------|------|----------|
| `user` | 平台成員 | 使用平台所有功能、建立任務、被邀請加入任務 | 自行註冊後自動取得 |
| `super_admin` | 系統管理員 | 平台維護、跨專案使用者管理 | Super Admin 指派 |

**任務角色（任務層級，儲存於 `task_membership` 表）**

| 識別碼 | 名稱 | 職責 | 取得方式 |
|--------|------|------|----------|
| `project_leader` | 專案負責人 | 建立任務、設定流程、指派成員、主導 Dry/Official Run、匯出結果 | 建立任務時自動取得 |
| `reviewer` | 審核員 | 審查標記結果、協助產出標準答案、查看品質報告 | 由 `project_leader` 指派 |
| `annotator` | 標記員 | 執行標記作業（試標/正式標）、查看個人進度 | 由 `project_leader` 指派 |

> 重要原則：同一使用者可在任務 A 擔任 `project_leader`，同時在任務 B 擔任 `annotator`。任務角色不依賴系統角色繼承。

### 3.2 Project Leader（專案負責人）核心旅程

```
登入 → Dashboard 查看任務概況
→ 新增任務（Step 1 基本資料 + 上傳資料集）
→ Config Builder（Step 2 設定 task_type + label schema）
→ 啟動設定（Step 3 設定抽樣）
→ 標記說明（Step 4 選填）
→ task-detail：成員管理 tab — 搜尋平台成員 / Email 邀請，指派 reviewer / annotator
→ 概覽 tab — 點擊「新增試標回合 R1」發布 Dry Run（鎖定樣本快照）
→ 等待所有 annotator 完成試標
→ Dashboard badge 通知：前往 dataset-analysis/quality tab 查看 IAA
→ [IAA ≥ 目標] 發布 Official Run；[IAA < 目標] 退回 draft 重設並再試標
→ 等待 Official Run 完成
→ task-detail 標記結果 tab：匯出 JSON / JSON-MIN
```

### 3.3 Annotator（標記員）核心旅程

```
登入 / 收到任務指派通知
→ Dashboard 查看待標記任務（Dry Run 或 Official Run）
→ 點擊「開始 / 繼續標記」→ annotation-list 清單頁
→ 點擊單筆資料 → annotation-workspace
→ 依 task_type 執行標記（分類 / 回歸 / 序列標記 / 關係抽取）
→ 草稿自動儲存；提交並載入下一筆
→ 全部完成 → 回到清單，樣本狀態更新為已提交
```

### 3.4 Reviewer（審核員）核心旅程

```
登入
→ Dashboard 查看待審任務
→ annotation-list（審核清單）→ annotation-workspace（審核模式）
→ 通過 / 退回標記結果（附原因）；協助產出 Dry Run 標準答案
→ dataset-analysis stats tab：查看統計總覽
→ dataset-analysis quality tab：查看 IAA 報告 / 異常偵測
```

### 3.5 Super Admin（系統管理員）核心旅程

```
登入（系統角色：super_admin）
→ Dashboard（Super Admin 視角：平台使用者統計 / 全平台任務概況）
→ 系統管理 → user-management：建立 / 停用帳號、指派 super_admin 角色
→ 系統管理 → role-settings：檢視角色權限矩陣
```

---

## 4. 功能需求（Functional Requirements）

> 說明：P0 = 必須（上線前阻塞）/ P1 = 重要（Demo 必要）/ P2 = 次要（R3 或未來）
> 各 FR 的 Spec 可追溯至 `specs/STATUS.md` 及對應 spec 目錄

### 4.1 模組：foundation（工程基準）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-F01 | 系統必須提供統一的 REST API 版本前綴（`/api/v1/`），所有端點均需遵守 | P0 | foundation-000 |
| FR-F02 | 所有 API 錯誤回應必須使用共用 `ErrorResponse` schema（`detail` 欄位） | P0 | foundation-000 |
| FR-F03 | 所有 API 回應必須帶有 `request_id` / `correlation_id`，並記錄於結構化日誌 | P0 | foundation-000 |
| FR-F04 | 所有列表端點必須支援分頁（最大 page size：100），禁止無界查詢 | P0 | foundation-000 |
| FR-F05 | Backend 採用 service layer 架構；狀態機轉換邏輯必須置於 service layer | P0 | ADR-022 |
| FR-F06 | Frontend 採用 vertical feature slice 架構；shared/ 須符合「被 ≥ 2 個模組引用」規則 | P0 | ADR-011 |
| FR-F07 | Config-driven 架構：新增任務類型不得修改核心 service 程式碼，必須透過 registry/schema 擴充 | P0 | ADR-010 |
| FR-F08 | 所有 task config 必須透過 Pydantic schema 在建立時驗證，無效 config 拒絕建立 | P0 | foundation-000 |
| FR-F09 | 系統必須整合 Prometheus / Grafana 指標收集與 Sentry 錯誤追蹤 | P1 | ADR-018/019/020 |
| FR-F10 | 所有背景任務（Celery）必須記錄 attempt number / start time / status / error / duration | P1 | foundation-000 |

### 4.2 模組：account（帳號模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-A01 | 使用者可透過 Email + Password 登入；登入成功後系統發放 access token（httpOnly cookie，15 分鐘）與 refresh token（httpOnly cookie，7 天滑動） | P0 | spec 001；ADR-021 |
| FR-A02 | Access token 過期時，前端自動靜默呼叫 `/auth/refresh` 重新取得 token，不中斷使用者操作 | P0 | spec 001；ADR-021 |
| FR-A03 | 使用者可透過 Google OAuth 2.0 登入（SSO） | P2 | spec 002 |
| FR-A04 | 使用者可以 Email + Password 自行註冊；建立後立即取得 `user` 系統角色，無需審核 | P1 | spec 003 |
| FR-A05 | 使用者可申請忘記密碼；系統透過 Resend 寄送重設連結（不揭露 Email 是否存在） | P2 | spec 004 |
| FR-A06 | 使用者可在個人設定頁修改姓名、上傳頭像、變更 Email（含驗證流程）、修改密碼、設定外觀偏好（跟隨系統 / 淺色 / 深色）及通知偏好 | P2 | spec 005 |
| FR-A07 | 使用者登出時，後端立即撤銷 refresh token，清除 cookie | P0 | ADR-021 |
| FR-A08 | 系統角色（`user` / `super_admin`）儲存於 JWT payload；任務角色（`project_leader` / `reviewer` / `annotator`）不儲存於 JWT，由 `task_membership` 表決定 | P0 | ADR-021；IA §1 |

### 4.3 模組：dashboard（儀表板）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-D01 | 儀表板依使用者系統角色與任務角色動態顯示對應視圖（一般使用者 / Project Leader / Annotator / Reviewer / Super Admin 共 5 種） | P0 | spec 012 |
| FR-D02 | Dry Run 全員完成時，Dashboard 待處理事項區顯示 badge 提醒 `project_leader` | P1 | spec 012；IA §4 |
| FR-D03 | Super Admin 視圖顯示平台使用者統計（總用戶、PL/Annotator/Reviewer 數量）及全平台任務概況 | P2 | spec 012 |
| FR-D04 | 語言切換（ZH / EN）於所有登入後頁面即時生效，不重新載入頁面 | P1 | spec 012；IA §2.1 |

### 4.4 模組：task-management（任務管理模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-T01 | `project_leader` 可透過四步驟精靈建立任務（基本資料 + 標記設定檔 + 啟動設定 + 標記說明），建立完成後自動取得任務 `project_leader` 角色 | P0 | spec 013 |
| FR-T02 | Config Builder 提供視覺化（Visual 模式，預設）與原始碼（Code 模式）兩種設定介面，兩者可互相切換 | P0 | spec 013；IA §4 |
| FR-T03 | Config Builder 必須支援：單句分類（含多標籤）、單句評分 / 回歸、句對任務、序列標記（NER / Aspect）、關係抽取（含 Triple）五種任務類型 | P0 | spec 013；task-type-taxonomy |
| FR-T04 | 新增任務類型必須透過 registry / schema 擴充，不修改 Step 1~4 核心流程 | P0 | ADR-010；constitution 原則 II |
| FR-T05 | 任務列表頁顯示使用者有成員資格的任務（`super_admin` 顯示全平台任務），支援搜尋與狀態篩選 | P1 | spec 010 |
| FR-T06 | 任務詳情頁提供「任務概覽」、「標記結果」、「標記進度」、「工時紀錄」、「成員管理」五個 tab | P1 | spec 014 |
| FR-T07 | 任務狀態機：`draft → dry_run_in_progress → waiting_iaa_confirmation → official_run_in_progress → completed`；非法轉換在 service layer 拒絕 | P0 | ADR-022；spec 014 |
| FR-T08 | 每次任務狀態轉換必須寫入 `RunStateTransition` 審計紀錄（`from_status` / `to_status` / `triggered_by` / `triggered_at`） | P0 | ADR-022 |
| FR-T09 | 首次發布 Dry Run 時，系統鎖定不可變的樣本快照（`sample_snapshot_id`）；Dry Run 與 Official Run 切分依據此快照，不得於 workspace 端重新抽樣 | P0 | spec 014；ADR-022；constitution 原則 III |
| FR-T10 | `project_leader` 可在成員管理 tab 搜尋平台成員或以 Email 邀請，指派 `reviewer` / `annotator` 任務角色 | P1 | spec 014 |
| FR-T11 | 標記結果 tab 提供 JSON / JSON-MIN 格式匯出，並記錄匯出歷程 | P1 | spec 014 |
| FR-T12 | 任務刪除採軟刪除（soft delete），從預設列表隱藏，不物理刪除 | P1 | spec 010；IA §4 |

### 4.5 模組：annotation（標記任務模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-AN01 | Annotator 可從 Dashboard 或 Navbar 進入 `annotation-list`，查看被指派的任務與資料清單 | P0 | spec 015 |
| FR-AN02 | 標記作業頁（`annotation-workspace`）依 `task_type` config 動態渲染標記介面，不硬編碼任務邏輯 | P0 | spec 015；ADR-010 |
| FR-AN03 | 標記進度即時更新（已標記數量 / 本輪總量 / 階段），草稿自動儲存，離開後可繼續 | P0 | spec 015 |
| FR-AN04 | Dry Run 模式：所有 annotator 標記相同樣本，結果不計入正式資料集 | P0 | spec 015；constitution 原則 III |
| FR-AN05 | Official Run 模式：每位 annotator 分配不重疊的資料（依樣本快照切分） | P0 | spec 015 |
| FR-AN06 | Annotator 介面的 Ground Truth 答案永不暴露（Data Fairness）；Reviewer 可見但 Annotator 不可見 | P0 | constitution 原則 III / NON-NEGOTIABLE |
| FR-AN07 | Reviewer 在 `annotation-workspace` 可執行審核模式：通過 / 退回標記結果、修改或刪除錯誤標記 | P1 | spec 015 |
| FR-AN08 | 右欄「說明與檔案」在每筆標記頁必須持續可見，翻頁時不收起或清空 | P0 | spec 015；IA §4 |
| FR-AN09 | `annotation-workspace` 必須記錄標記歷程（History），Reviewer 可追溯每筆的修改紀錄 | P1 | spec 015 |

### 4.6 模組：dataset（資料集分析模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-DS01 | 資料集分析模組入口（`/dataset-analysis`）列出使用者具 `project_leader` 或 `reviewer` 角色的任務 | P1 | spec 016 |
| FR-DS02 | 統計總覽 tab（`?tab=stats`）顯示共用指標：Sentence 數量、Token 數量、整體完成率 | P1 | spec 016 |
| FR-DS03 | 統計總覽依 `task_type` 動態顯示特定指標（分類：標籤分佈 + 共現矩陣；VA 評分：Valence/Arousal 分佈；序列標記：Entity 類型分佈；關係抽取：Triple 統計；句對：分佈統計） | P1 | spec 016；functional-map |
| FR-DS04 | 品質監控 tab（`?tab=quality`）依 `task_type` 顯示對應 IAA 指標：分類任務使用 Krippendorff's Alpha（nominal）；VA 評分使用 ICC；序列標記使用 Pairwise Entity-level F1；關係抽取使用 Pairwise Triple-level F1；句對任務使用 sentence-pair agreement metrics | P1 | spec 017；IA §4 |
| FR-DS05 | 品質監控 tab 提供異常偵測（標記速度異常、離群標記值）、標記一致性偏離分析（1.5x STD / 2x STD）、標記員個別速度與 IAA 比較 | P2 | spec 017 |

### 4.7 模組：admin（系統管理模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-AD01 | 使用者管理頁（`user-management`）僅 `super_admin` 可存取，可查看所有平台使用者、建立 / 停用帳號、指派系統角色（`user` / `super_admin`） | P2 | spec 006 |
| FR-AD02 | 角色權限設定頁（`role-settings`）顯示系統角色與任務角色的功能存取矩陣 | P2 | spec 007 |
| FR-AD03 | 任務成員（`annotator` / `reviewer`）的指派由 `task-detail` 的成員管理 tab 管理，不在 `user-management` 處理 | P0 | IA §4；product-baseline |
| FR-AD04 | 破壞性管理操作（批量停用帳號等）必須留下審計日誌 | P1 | constitution 原則 XV |

### 4.8 模組：shared（共用元件）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-SH01 | 側邊欄 Navbar（Sidebar）提供 L0 主導覽：儀表板、任務管理、標記作業、資料集分析、系統管理、個人設定；角色可見性依系統角色與任務角色 gating | P0 | spec 008；IA §2.1 |
| FR-SH02 | Desktop（> MOBILE_BP）採左側固定 Sidebar；Mobile（<= MOBILE_BP）採頂部品牌列 + 底部橫向主導覽 | P1 | spec 008；IA §2.1 |
| FR-SH03 | 系統管理導覽項（`user-management`）僅 `super_admin` 可見 | P0 | IA §2.1 §C |

---

## 5. 非功能需求（Non-Functional Requirements）

### 5.1 效能（Performance）

| NFR-ID | 描述 | 目標值 | 來源 |
|--------|------|--------|------|
| NFR-P01 | 核心標記與標注操作 API P95 回應時間 | ≤ 500ms | constitution 原則 VIII |
| NFR-P02 | Frontend Lighthouse Performance 分數（核心頁面，Desktop） | ≥ 80 | constitution 原則 VIII |
| NFR-P03 | 頁面 First Contentful Paint（FCP） | ≤ 3s | constitution 原則 VIII |
| NFR-P04 | 使用者互動的視覺回饋延遲 | ≤ 100ms | constitution 原則 VIII |
| NFR-P05 | 所有列表端點支援分頁（max page size：100），禁止無界查詢 | N/A | constitution 原則 VIII |
| NFR-P06 | 禁止服務層程式碼中出現 N+1 查詢 | N/A | constitution 原則 VIII |

### 5.2 安全（Security）

| NFR-ID | 描述 | 來源 |
|--------|------|------|
| NFR-S01 | Access Token 儲存於 `httpOnly` cookie（不可被 JS 讀取），防止 XSS 竊取 | ADR-021；constitution 原則 XI |
| NFR-S02 | Refresh Token 每次使用後輪換（one-time use），並存於 DB，支援即時撤銷 | ADR-021 |
| NFR-S03 | CORS 設定禁止使用 `allow_origins=["*"]`，必須明確列出允許的 origin | constitution 原則 XI；CLAUDE.md |
| NFR-S04 | 所有使用者輸入必須驗證與清理（Pydantic 於後端；TypeScript type guard 於前端） | constitution 原則 XI |
| NFR-S05 | 測試集答案（ground truth）、評分內部資料永不透過 API 回應或前端狀態暴露給 annotator | constitution 原則 III / NON-NEGOTIABLE |
| NFR-S06 | 密鑰、憑證不得寫入程式碼或 repository，必須使用環境變數 | CLAUDE.md |
| NFR-S07 | 安全敏感路徑（auth / permission / 資料存取）的測試必須涵蓋非授權存取路徑 | constitution 原則 XI |

### 5.3 可存取性（Accessibility）

| NFR-ID | 描述 | 來源 |
|--------|------|------|
| NFR-A01 | UI 必須符合 WCAG 2.1 AA 標準 | constitution 原則 VII |
| NFR-A02 | 所有互動元素必須可透過鍵盤操作，並由螢幕閱讀器正確宣告 | constitution 原則 VII |
| NFR-A03 | 語言切換不觸發頁面重新載入，即時更新文案與 `aria-label` | spec 008；IA §2.1 |

### 5.4 國際化（i18n）

| NFR-ID | 描述 | 來源 |
|--------|------|------|
| NFR-I01 | 前端使用 i18n namespace 管理翻譯（例：`t('task-management:config_builder.label_name')`） | frontend/CLAUDE.md |
| NFR-I02 | 每個模組各自維護翻譯檔（`frontend/src/locales/zh-TW/[module].json` 與 `frontend/src/locales/en/[module].json`） | frontend/CLAUDE.md |
| NFR-I03 | UI 語言目前支援 Traditional Chinese（ZH）與 English（EN）；Demo 以 ZH 為主要展示語言 | impact-map；story-map |

### 5.5 可靠性（Reliability）

| NFR-ID | 描述 | 來源 |
|--------|------|------|
| NFR-R01 | 後端 pytest 測試覆蓋率 ≥ 80%；關鍵路徑（auth / permission / scoring）≥ 90% branch coverage | constitution 原則 IV；backend/CLAUDE.md |
| NFR-R02 | 長時間 annotation 作業（30~90 分鐘）中，Token 自動靜默刷新，不中斷工作 | ADR-021 |
| NFR-R03 | 背景任務（Celery）在失敗後必須可重試或可恢復，不靜默丟棄 | constitution 原則 XVIII |

---

## 6. 架構約束（Architecture Constraints）

以下約束來自 ADR 及 Constitution，均屬硬性不可違背規則：

### 6.1 技術選型（已決策，不可更改）

| 層級 | 技術 | ADR |
|------|------|-----|
| Frontend | React + TypeScript + Vite | ADR-004 |
| Backend | FastAPI（Python）+ uv | ADR-003；ADR-002 |
| Database | PostgreSQL | ADR-005 |
| Cache / Queue | Redis | ADR-006 |
| Async Tasks | Celery | ADR-007 |
| Container | Docker Compose | ADR-008 |
| Email | Resend | ADR-013 |
| Component Library | shadcn/ui + Storybook | ADR-016 |
| Observability | Prometheus + Grafana + Sentry | ADR-018/019/020 |
| CI/CD | Docker Compose + Nginx + GitHub Actions | ADR-023 |
| E2E Testing | Playwright | ADR-009/014 |
| Auth | JWT（httpOnly cookie）+ Refresh Token | ADR-021 |

### 6.2 架構設計約束

| 約束 | 說明 | 來源 |
|------|------|------|
| C-AR01 | Config-Driven（NON-NEGOTIABLE）：核心程式碼不得有 `if task_type ==` 分支；新任務類型只需 config | ADR-010；constitution 原則 II |
| C-AR02 | Task 狀態機邏輯只在 service layer（`task_service.py`）實作；不在 route 或 ORM model 層 | ADR-022 |
| C-AR03 | 雙層角色模型：JWT 只含系統角色；任務角色由 `task_membership` API 按需取得 | ADR-021；IA §1 |
| C-AR04 | Frontend vertical slice 架構：feature module 不得直接引用其他 feature 的內部 hooks / stores / types | ADR-011 |
| C-AR05 | `shared/` admission rule：只有被 ≥ 2 個不同 feature module 引用的檔案才可放入 `shared/` | ADR-011 |
| C-AR06 | Task Role 授權使用 `useTaskRole(taskId)`（TanStack Query 從 API 取得），不依賴 JWT 繼承 | ADR-021；frontend/CLAUDE.md |
| C-AR07 | 資料庫禁止無外鍵約束；唯一性約束（如「每位 annotator 每筆 item 只能一份提交」）必須由 DB unique constraint 強制，不只靠 application 檢查 | Backend Constitution VI |
| C-AR08 | 所有 cache 條目必須在寫入時宣告明確 TTL；無 TTL 的 cache 條目不允許 | Backend Constitution VII |
| C-AR09 | 測試絕對禁止使用生產資料、真實使用者資料或真實標記 ground truth | Testing Constitution XI / NON-NEGOTIABLE |

### 6.3 開發流程約束

| 約束 | 說明 |
|------|------|
| 禁止直接 commit / push 到 `main` | 必須建立功能分支，開 PR 後合併 |
| 禁止 `pip install` / `npm install` | 使用 `uv add` / `pnpm add` |
| 禁止 commit message / PR description 含中文 | 英文唯一，符合 CLAUDE.md 規範 |
| TDD 強制要求 | 寫實作前必須先寫失敗測試 |
| Quality Gate | 每次 merge 前必須通過 ruff / mypy --strict / tsc --noEmit / ESLint / pytest |

---

## 7. 範疇外（Out of Scope）

以下功能明確排除在本 Demo Paper 範疇之外，來源：`impact-map.md` §Out of Scope、`thesis/outline.zh-TW.md`：

| 項目 | 排除理由 |
|------|---------|
| UI 批次資料匯入精靈 | Demo Paper 階段由後端直接操作資料匯入 |
| AI 輔助標記建議（LLM 標注輔助） | 已列入 Future Work（論文第六章 §6.3） |
| 大規模並發壓力測試 | 系統定位為研究原型，非生產規模服務 |
| 混合任務類型（同一筆同時做分類 + 序列標記） | task-type-taxonomy §5 標記為「尚未展開」 |
| 標準格式資料匯出（CoNLL / BIO / JSON-L） | 已列入 Future Work |
| 多語言介面（英文以外） | Demo 唯一目標語言為繁體中文；英文翻譯已預留但非 Demo 展示重點 |
| 公開 API 或第三方整合 | Demo Paper 範疇以展示系統能力為主 |
| 手機原生 App | 系統為 Web 應用，RWD 支援行動裝置瀏覽器 |

---

## 8. 開放問題（Open Questions）

下列問題尚未在現有文件中有明確定義，需使用者確認後才能推進對應 spec：

| QID | 問題 | 影響範圍 | 需確認對象 |
|-----|------|---------|-----------|
| Q-01 | Help Button（spec 018）目前標記為 `deferred`，是否確認排除於 Demo Paper 範疇？ | shared 模組 | 論文作者 |
| Q-02 | 句對任務（`sentence_pairs`）的 demo dataset 與使用情境是否已確定？目前 spec 013 / 015 / 017 已將句對納入 config、workspace 與品質分析範圍 | spec 013 / 015 / 017 | 論文作者 |
| Q-03 | 資料集匯入目前僅支援 txt / csv / tsv / json（spec 013）。是否有其他格式需求（如 JSONL）？ | spec 013 | 論文作者 |
| Q-04 | SUS 問卷的受試者招募策略（5~10 位實驗室成員），目前 user study 的計畫時程是否確定？ | R2/R3 驗收 | 指導教授 / 論文作者 |
| Q-05 | `annotation-workspace` 中「標記說明強制顯示」（spec 013/015）的確認狀態是否需要持久化至 DB？若使用者換瀏覽器，應重新顯示還是跳過？ | spec 015 | 論文作者 |
| Q-06 | Official Run 完成後，`project_leader` 匯出 JSON / JSON-MIN 的格式定義是否需要正式 ADR？目前 spec 014 提及但未有詳細 schema 文件 | spec 014 / export | 論文作者 |

---

## 變更紀錄

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.0.0 | 2026-06-02 | 初始版本；依 research phase 綜合結果建立，彙整產品目標、使用者旅程、功能需求、非功能需求、架構約束、範疇外與開放問題 |

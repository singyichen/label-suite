# Label Suite — 產品需求文件（Product Requirements Document）

**版本：** 1.3.0
**日期：** 2026-10-13
**狀態：** Draft
**撰寫者：** Team Lead（基於 Research Phase 綜合）
**可追溯來源：**
- `specs/_governance/constitution.md` v1.33.0
- `docs/product/ia/information-architecture.md` v1.5.2
- `docs/product/story-map/story-map.md` v1.5.1
- `docs/product/impact-map/impact-map.md` v1.3.0
- `docs/product/functional-map/functional-map.md`（探索性輔助視圖，非行為權威）
- `docs/product/functional-map/task-type-taxonomy.md`（輸出 taxonomy 導覽）
- `docs/product/baseline/product-baseline-summary.md`（Agent 快速導覽，非 feature SSOT）
- `docs/thesis/outline.zh-TW.md`
- `specs/STATUS.md`
- `README.md`

> 本文件是單一產品級需求總結，不是 feature 行為、工程治理或 ADR 的單一真實來源；行為以對應 active spec 為準，交付狀態以 [`specs/STATUS.md`](../../specs/STATUS.md) 為準，工程約束與已接受決策分別回鏈 Constitution 與 ADR。

---

## 1. Executive Summary（產品摘要）

Label Suite 是一套**以設定檔驅動（Config-Driven）的通用型 NLP 資料標記與自動評估平台**，以學術 NLP 實驗室為主要目標群體。本系統作為碩士論文 Demo Paper 的核心研究成果，旨在解決現有標記工具（如 Label Studio）對非工程背景研究人員門檻過高、工作流程碎片化，以及缺乏內建資料集品質可視性等痛點。

Label Suite 的核心價值主張在於：研究人員以 `input_type + outputs[] + field_role_map` 設定可組合的標記任務；現行 registry 提供八種輸出 key，並可由設定擴充而不修改核心流程。同時，系統將任務配置、Dry Run 驗證、正式標記、審核協作，以及資料集統計分析整合於單一入口，取代過往研究團隊需手動串接多個工具的低效流程。

本論文的學術貢獻聚焦於三個面向：（1）配置驅動架構使標記任務的通用性與可重複使用性成為可能；（2）Dry Run / Official Run 機制確保標記流程的可重現性與資料公平性；（3）內建資料集分析（#Sentence、#Token、#Label 統計與 IAA 指標）讓研究人員在標記階段即可持續監控資料品質，無需另行撰寫分析腳本。

---

## 2. 產品目標與成功指標（Product Goals & Success Metrics）

### 2.1 研究目標

| 目標 | 說明 | 可量化指標 |
|------|------|-----------|
| G-01 | 實作可展示的 Demo Paper 系統 | 完成 R1（Demo Core）功能集，可執行完整標記閉環 demo |
| G-02 | 驗證配置驅動通用性 | 透過單一 Config 支援至少五種研究示例，無需修改核心程式碼；此為研究指標，不是固定任務類型 enum |
| G-03 | 降低標記任務啟動成本 | 初始化任務所需操作步驟數 < Label Studio 同任務步驟數（量化對比） |
| G-04 | 內建資料集分析 | #Sentence、#Token、#Label 統計精確度與手算結果誤差 ≤ 0 |
| G-05 | 高使用者滿意度 | SUS 問卷（5~10 位實驗室成員）整體易用性評分目標達 ≥ 75 分 |
| G-06 | Demo Paper 論文可重現性 | 系統 demo video 可展示 2~3 個完整使用情境 |

### 2.2 Demo Paper 論文貢獻視角

| 論文貢獻 | 系統功能對應 |
|---------|------------|
| C-01：配置驅動通用型標記平台 | Config Builder（spec 013）+ outputs[] registry（ADR-029）+ foundation spec |
| C-02：整合一體化標記工作流 | 任務建立 → Dry Run → IAA → Official Run → 匯出（specs 013, 014, 015） |
| C-03：內建資料集分析功能 | Dataset Stats（spec 016）+ Quality Monitor（spec 017） |
| C-04：降低進入門檻 | 四步驟精靈建立任務（spec 013）+ 直覺式標記介面（spec 015） |

---

## 3. 使用者角色與核心旅程（User Roles & Journeys）

### 3.1 雙層角色模型

本系統採用雙層角色設計（來源：`information-architecture.md` §1）：

**系統角色（平台層級）**

| 識別碼 | 名稱 | 職責 | 取得方式 |
|--------|------|------|----------|
| `user` | 平台成員 | 使用平台所有功能、建立任務、被邀請加入任務 | 自行註冊後自動取得 |
| `super_admin` | 系統管理員 | 平台維護、跨專案使用者管理 | Super Admin 指派 |

**任務角色（任務層級）**

| 識別碼 | 名稱 | 職責 | 取得方式 |
|--------|------|------|----------|
| `project_leader` | 專案負責人 | 建立任務、設定流程、指派成員、主導 Dry/Official Run、匯出結果 | 建立任務時自動取得 |
| `reviewer` | 審核員 | 逐標記員審核標記結果、不一致時直接修正標籤、查看品質報告 | 由 `project_leader` 指派 |
| `annotator` | 標記員 | 執行標記作業（試標/正式標）、查看個人進度 | 由 `project_leader` 指派 |

> 重要原則：同一使用者可在任務 A 擔任 `project_leader`，同時在任務 B 擔任 `annotator`。任務角色不依賴系統角色繼承。

### 3.2 Project Leader（專案負責人）核心旅程

```
登入 → Dashboard 查看任務概況
→ 新增任務（Step 1 基本資料 + 上傳資料集）
→ Config Builder（Step 2 設定輸入／輸出組合與 output schemas）
→ 啟動設定（Step 3 設定抽樣）
→ 標記說明（Step 4 選填）
→ task-detail：成員管理 tab — 搜尋平台成員 / Email 邀請，指派 reviewer / annotator
→ 概覽 tab — 點擊「新增試標回合 R1」發布 Dry Run（鎖定樣本快照）
→ 本回合標註提交、必要審核與必要仲裁全部完成（含例外池清空）→ 自動進入 `waiting_iaa_confirmation`（014 FR-008a）
→ Dashboard badge 通知：前往 dataset-analysis/quality tab 查看 IAA（IAA 計算就緒後才可開始正式標記或新增下一回合）
→ 依逐型 IAA 與目標決定發布 Official Run 或新增下一試標回合（014 FR-013）；IAA 未達目標僅為顧問性警示，不阻擋任一選項
→ 等待 Official Run 全數提交
→ Reviewer 逐 review unit 審核；不一致時直接修正，爭議交由合格且非當事仲裁者處理
→ 所有 review unit 定案、無未解爭議、應仲裁項目完成且品質指標可用後，任務進入 `completed`
→ task-detail 標記結果 tab：在 `completed` 後匯出 JSON / JSON-MIN
```

### 3.3 Annotator（標記員）核心旅程

```
登入 / 收到任務指派通知
→ Dashboard 查看待標記任務（Dry Run 或 Official Run）
→ 點擊「開始 / 繼續標記」→ annotation-list 清單頁
→ 點擊單筆資料 → annotation-workspace
→ 依 outputs[] 組合執行標記（分類 / 回歸 / 實體辨識 / 關係識別 / 序列標記 等）
→ 草稿自動儲存；提交並載入下一筆
→ 全部完成 → 回到清單，樣本狀態更新為已提交
```

### 3.4 Reviewer（審核員）核心旅程

```
登入
→ Dashboard 查看待審任務
→ annotation-list（審核清單）→ annotation-workspace（審核模式）
→ 以樣本 × 標記員 × run 的 review unit 逐筆審核：一致或修正後定案；無法決定則進入爭議池，由合格且非當事人的仲裁者處理
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
>
> **編號說明：** 本章 `FR-A01`、`FR-T03` 這類編號是 **PRD 能力編號**，只用來在產品層列舉能力，**不是 spec 的 FR**（spec 的 FR 如 `spec 014 FR-008a`）。本章描述僅為一句話能力陳述，不構成行為契約；需求內容、完成條件與例外一律以 §4.0 規格索引連到的 spec 為準，兩者不一致時以 spec 為準（見 [`decision-log.md`](./decision-log.md)）。

### 4.0 規格索引

下表為 `specs/` 現存的 22 份 spec（不含 `specs/_archive/` 與 `specs/_governance/`）；交付狀態不在此複製，以 [`specs/STATUS.md`](../../specs/STATUS.md) 對應 ID 列為準，spec 版本亦以各 spec 檔頭為準。

| spec ID | 模組 | 主要角色 | 一句話簡述 | spec | 交付狀態 |
|---|---|---|---|---|---|
| foundation-000 | foundation | 開發者、QA、reviewer | 讓團隊依同一套工程基準設計與實作模組 | [spec](../../specs/foundation/000-foundation/spec.md) | [STATUS：`foundation-000`](../../specs/STATUS.md) |
| foundation-001 | foundation | 維護者、開發 agent | 讓維護者在合併前偵測 SDD 文件漂移 | [spec](../../specs/foundation/001-project-sdd-lint/spec.md) | [STATUS：`foundation-001`](../../specs/STATUS.md) |
| foundation-002 | foundation | 維護者 | 讓維護者判斷使用者路徑圖是否過期 | [spec](../../specs/foundation/002-user-path-map-freshness-check/spec.md) | [STATUS：`foundation-002`](../../specs/STATUS.md) |
| account-001 | account | 使用者 | 讓使用者以 Email 與密碼登入 | [spec](../../specs/account/001-login-email-password/spec.md) | [STATUS：`account-001`](../../specs/STATUS.md) |
| account-002 | account | 使用者 | 讓使用者看到 Google SSO 入口並預留整合 | [spec](../../specs/account/002-login-google-sso/spec.md) | [STATUS：`account-002`](../../specs/STATUS.md) |
| account-003 | account | 訪客 | 讓訪客以 Email 與密碼註冊帳號 | [spec](../../specs/account/003-register-email-password/spec.md) | [STATUS：`account-003`](../../specs/STATUS.md) |
| account-004 | account | 使用者 | 讓使用者忘記密碼時能重設密碼 | [spec](../../specs/account/004-forgot-reset-password/spec.md) | [STATUS：`account-004`](../../specs/STATUS.md) |
| account-005 | account | 使用者 | 讓使用者管理個人資料、Email 與密碼 | [spec](../../specs/account/005-profile-settings/spec.md) | [STATUS：`account-005`](../../specs/STATUS.md) |
| account-020 | account | 使用者 | 讓使用者在多裝置維持安全的登入工作階段 | [spec](../../specs/account/020-auth-session-security/spec.md) | [STATUS：`account-020`](../../specs/STATUS.md) |
| admin-006 | admin | super_admin | 讓超管管理平台帳號與邀請 | [spec](../../specs/admin/006-user-management/spec.md) | [STATUS：`admin-006`](../../specs/STATUS.md) |
| admin-007 | admin | super_admin | 讓超管檢視並維護角色權限矩陣 | [spec](../../specs/admin/007-role-settings/spec.md) | [STATUS：`admin-007`](../../specs/STATUS.md) |
| dashboard-012 | dashboard | 所有角色 | 讓使用者依角色掌握任務進度與待辦 | [spec](../../specs/dashboard/012-dashboard/spec.md) | [STATUS：`dashboard-012`](../../specs/STATUS.md) |
| shared-008 | shared | 所有登入使用者 | 讓使用者從共用側欄切換各模組 | [spec](../../specs/shared/008-sidebar-navbar-shared/spec.md) | [STATUS：`shared-008`](../../specs/STATUS.md) |
| shared-018 | shared | 所有登入使用者 | 讓使用者從平台內取得說明 | [spec](../../specs/shared/018-help-button/spec.md) | [STATUS：`shared-018`](../../specs/STATUS.md) |
| shared-019 | shared | 所有登入使用者 | 讓使用者同時保留多頁檢視並快速切換 | [spec](../../specs/shared/019-workspace-tabs/spec.md) | [STATUS：`shared-019`](../../specs/STATUS.md) |
| annotation-015 | annotation | annotator、reviewer、仲裁者 | 讓標記員標記、審核員與仲裁者審核並收斂爭議 | [spec](../../specs/annotation/015-annotation-workspace/spec.md) | [STATUS：`annotation-015`](../../specs/STATUS.md) |
| task-management-010 | task-management | user、super_admin | 讓使用者搜尋與篩選自己的任務 | [spec](../../specs/task-management/010-task-list/spec.md) | [STATUS：`task-management-010`](../../specs/STATUS.md) |
| task-management-013 | task-management | project_leader | 讓專案負責人以四步驟精靈建立任務 | [spec](../../specs/task-management/013-task-new/spec.md) | [STATUS：`task-management-013`](../../specs/STATUS.md) |
| task-management-014 | task-management | project_leader、reviewer | 讓負責人管理成員、回合並匯出結果 | [spec](../../specs/task-management/014-task-detail/spec.md) | [STATUS：`task-management-014`](../../specs/STATUS.md) |
| dataset-016 | dataset | project_leader、reviewer | 讓負責人與審核員挑選要分析的任務 | [spec](../../specs/dataset/016-dataset-analysis-list/spec.md) | [STATUS：`dataset-016`](../../specs/STATUS.md) |
| dataset-017 | dataset | project_leader、reviewer | 讓負責人與審核員查看統計與資料品質 | [spec](../../specs/dataset/017-dataset-analysis-detail/spec.md) | [STATUS：`dataset-017`](../../specs/STATUS.md) |
| dataset-021 | dataset | project_leader、維護者 | 讓建立者追溯資料集版本並保護測試集答案 | [spec](../../specs/dataset/021-dataset-ingestion-and-lineage/spec.md) | [STATUS：`dataset-021`](../../specs/STATUS.md) |

### 4.1 模組：foundation（工程基準）

Foundation 提供可擴充、可觀測與安全的共同能力；API、資料模型、架構分層與技術選型等可變工程契約以 `foundation-000`、Constitution 與 ADR 為準，不在本文件複製。

### 4.2 模組：account（帳號模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-A01 | 使用者可用 Email + Password 安全登入並維持受保護的工作階段 | P0 | spec 001；spec 020 FR-002、FR-003；ADR-021 |
| FR-A02 | 工作階段更新不得不必要中斷使用者操作 | P0 | spec 020 FR-003～FR-005；ADR-021 |
| FR-A03 | Google SSO 僅為可操作入口與未來整合預留（no-op），不宣告 OAuth 已可登入 | P2 | spec 002 |
| FR-A04 | Email／Password 註冊目前為前端互動 prototype；完整行為以 spec 003 為準 | P1 | spec 003 |
| FR-A05 | 忘記密碼目前為前端互動 prototype；完整行為以 spec 004 為準 | P2 | spec 004 |
| FR-A06 | 使用者可在個人設定頁管理自己的個人資料與帳號安全設定 | P2 | spec 005 FR-001 |
| FR-A07 | 使用者登出後，其登入工作階段隨即失效 | P0 | spec 020 FR-008；ADR-021 |
| FR-A08 | 系統角色與任務角色採雙層模型；具體授權契約以 shared constants 與對應 spec 為準 | P0 | ADR-021；IA §1 |

### 4.3 模組：dashboard（儀表板）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-D01 | 儀表板依使用者的系統角色與任務角色顯示對應視圖 | P0 | spec 012 FR-001、FR-001B |
| FR-D02 | 試標回合完成後，Dashboard 提醒 `project_leader` 前往處理；完成條件以 spec 014 為準 | P1 | spec 012；spec 014 FR-008a；IA §4 |
| FR-D03 | Super Admin 視圖提供平台層級的使用者與任務概況 | P2 | spec 012 FR-002、FR-008E |
| FR-D04 | 使用者可在登入後頁面切換介面語言（ZH / EN） | P1 | spec 012；spec 008 FR-009；IA §2.1 |

### 4.4 模組：task-management（任務管理模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-T01 | `project_leader` 可透過四步驟精靈建立任務，並自動成為該任務的 `project_leader` | P0 | spec 013 FR-001 |
| FR-T02 | Config Builder 提供可理解的設定與預覽方式，細節以 spec 013 為準 | P0 | spec 013；IA §4 |
| FR-T03 | Config Builder 以 `input_type` 與可組合的 `outputs[]` 定義任務，取代固定任務類型 enum；可用輸出類型以 spec 013 registry 為準 | P0 | spec 013；ADR-029；task-type-taxonomy |
| FR-T04 | 新增任務類型必須透過 registry / schema 擴充，不修改 Step 1~4 核心流程 | P0 | ADR-010；constitution 原則 II |
| FR-T05 | 任務列表頁顯示使用者可見的任務，並支援搜尋與篩選 | P1 | spec 010 FR-002、FR-004 |
| FR-T06 | 任務詳情頁以分頁整合單一任務的設定、成員、進度、結果與工時 | P1 | spec 014 FR-003 |
| FR-T07 | 任務依固定生命週期推進；各狀態與完成條件以 spec 014／ADR-022 為準 | P0 | spec 014 FR-008；ADR-022 |
| FR-T08 | 流程狀態與回合需可追溯，Dry Run 與 Official Run 保持可重現且資料公平 | P0 | ADR-022；Constitution 原則 III |
| FR-T10 | `project_leader` 可邀請平台成員加入任務，並指派 `reviewer` / `annotator` 角色 | P1 | spec 014 FR-005 |
| FR-T11 | `project_leader` 可匯出標記結果，系統保留匯出歷程 | P1 | spec 014 FR-009、FR-021 |
| FR-T12 | 任務刪除採軟刪除（soft delete），從預設列表隱藏，不物理刪除 | P1 | spec 010；IA §4 |

### 4.5 模組：annotation（標記任務模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-AN01 | Annotator 可進入 `annotation-list`，查看被指派的任務與資料清單 | P0 | spec 015 FR-001 |
| FR-AN02 | 標記作業頁依已發布 TaskConfig 的 `outputs[]` registry 動態渲染，不硬編碼任務邏輯 | P0 | spec 015；ADR-010 |
| FR-AN03 | 標記員可保存草稿，離開後能從上次進度繼續標記 | P0 | spec 015 FR-013 |
| FR-AN04 | Dry Run 的標記結果不計入正式資料集 | P0 | spec 015 FR-012；constitution 原則 III |
| FR-AN05 | Official Run 中每位 annotator 分到彼此不重疊的資料 | P0 | spec 015 FR-011 |
| FR-AN06 | Annotator 介面及其可見資料不得包含 test-set ground truth | P0 | Constitution 原則 III / NON-NEGOTIABLE；spec 015 |
| FR-AN07 | Reviewer 以 review unit 審核、可直接修正；爭議由合格且非當事人的仲裁者處理，完整規則以 spec 015 為準 | P1 | spec 015 |
| FR-AN08 | 標記頁的「說明與檔案」須持續可見 | P0 | spec 015 FR-019；IA §4 |
| FR-AN09 | `annotation-workspace` 必須記錄標記歷程（History），Reviewer 可追溯每筆的修改紀錄 | P1 | spec 015 |

### 4.6 模組：dataset（資料集分析模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-DS01 | 資料集分析入口列出使用者可分析的任務 | P1 | spec 016 FR-001、FR-002 |
| FR-DS02 | 統計總覽 tab 提供任務的共用規模與進度指標 | P1 | spec 017 FR-008 |
| FR-DS03 | 統計總覽依 `outputs[].type` 逐型顯示 | P1 | spec 017 FR-009 |
| FR-DS04 | 品質監控逐型提供 IAA 指標；指標與門檻以 spec 017 registry 為準 | P1 | spec 017 FR-012 |
| FR-DS05 | 品質監控提供資料品質觀察；異常與比較規則以 spec 017 為準 | P2 | spec 017 |

### 4.7 模組：admin（系統管理模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-AD01 | `super_admin` 可在 `user-management` 管理平台帳號與系統角色 | P2 | spec 006 FR-002、FR-003 |
| FR-AD02 | `super_admin` 可檢視並維護系統角色與任務角色的功能存取矩陣 | P2 | spec 007 FR-001、FR-003 |
| FR-AD03 | 任務成員（`annotator` / `reviewer`）的指派由 `task-detail` 的成員管理 tab 管理，不在 `user-management` 處理 | P0 | IA §4；product-baseline |
| FR-AD04 | 破壞性管理操作（批量停用帳號等）必須留下審計日誌 | P1 | constitution 原則 XV |

### 4.8 模組：shared（共用元件）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-SH01 | 側邊欄提供 L0 主導覽，可見項目依角色決定 | P0 | spec 008 FR-002；IA §2.1 |
| FR-SH02 | 桌面與行動裝置採不同的導覽版型 | P1 | spec 008；IA §2.1 |
| FR-SH03 | 系統管理導覽項僅 `super_admin` 可見 | P0 | spec 008 FR-003；IA §2.1 §C |
| FR-SH04 | 登入後頁面提供工作頁籤列，讓使用者同時保留多頁檢視狀態 | P2 | spec 019 FR-001；IA §2.1 §E |

---

## 5. 非功能需求（Non-Functional Requirements）

產品必須維持可用、可存取、可國際化、安全且可重現；測試集答案（ground truth）不得向 annotator 或其可見資料暴露。量化門檻、實作選擇、測試與安全控制由對應 feature spec、Constitution 與 ADR 管理。

現有 UI 的繁體中文／英文切換屬範圍內契約；Demo 不新增第三種以上語言或翻譯營運流程。

---

## 6. 範疇外（Out of Scope）

以下功能明確排除在本 Demo Paper 範疇之外，來源：`impact-map.md` §Out of Scope、`thesis/outline.zh-TW.md`：

| 項目 | 排除理由 |
|------|---------|
| UI 批次資料匯入精靈 | Demo Paper 階段由後端直接操作資料匯入 |
| AI 輔助標記建議（LLM 標注輔助） | 已列入 Future Work（論文第六章 §6.3） |
| 大規模並發壓力測試 | 系統定位為研究原型，非生產規模服務 |
| 標準格式資料匯出（CoNLL / BIO / JSON-L） | 已列入 Future Work |
| 第三種以上的介面語言與翻譯營運流程 | 現有繁中／英文切換已在範圍內，擴大語言營運不屬本 Demo |
| 公開 API 或第三方整合 | Demo Paper 範疇以展示系統能力為主 |
| 手機原生 App | 系統為 Web 應用，RWD 支援行動裝置瀏覽器 |

---

## 7. 開放問題（Open Questions）

下列問題最初為 PRD 撰寫時尚未定義的項目；已有正典答案者於「狀態」欄標示並附來源，未標示者仍待確認。本表不更動原 QID 編號與問題文字：

| QID | 問題 | 影響範圍 | 需確認對象 | 狀態與來源 |
|-----|------|---------|-----------|-----------|
| Q-01 | Help Button（spec 018）目前標記為 `deferred`，是否確認排除於 Demo Paper 範疇？ | shared 模組 | 論文作者 | 已暫緩：`specs/STATUS.md` 中 `shared-018` 為 `deferred`；`information-architecture.md` 記載 018「deferred，尚非目前交付能力」。是否永久排除仍待論文作者確認 |
| Q-02 | 項目對型任務（`input_type = item_pair`）的 demo dataset 與使用情境是否已確定？目前 spec 013 / 015 / 017 已將 item_pair 輸入類型納入 config、workspace 與品質分析範圍 | spec 013 / 015 / 017 | 論文作者 | 已解：`docs/product/example-data/nli.json`（`Premise`／`Hypothesis`）為項目對示例資料，spec 013 定義 `TASK_INPUT_TYPES = single_item | item_pair` |
| Q-03 | UI 資料集上傳目前僅接受 JSON；若需要 JSONL 或其他格式，必須先變更 spec 013。 | spec 013 | 論文作者 | 已解：spec 013 `DATASET_UPLOAD_FORMATS = json`、FR-002a 僅接受 `.json`；其他格式須先變更 spec 013 |
| Q-04 | SUS 問卷的受試者招募策略（5~10 位實驗室成員），目前 user study 的計畫時程是否確定？ | R2/R3 驗收 | 指導教授 / 論文作者 | 待確認：`docs/product/milestones.md` 僅記「User Study 的招募與 SUS 問卷需提前規劃時程」，未見確定時程 |
| Q-05 | `annotation-workspace` 中「標記說明強制顯示」（spec 013/015）的確認狀態是否需要持久化至 DB？若使用者換瀏覽器，應重新顯示還是跳過？ | spec 015 | 論文作者 | 部分已解：spec 013 SC-006a 以「同一使用者」為單位，首次進入顯示、確認後不重複；跨瀏覽器是否持久化至 DB 條文未規定，仍待確認 |
| Q-06 | Official Run 完成後，`project_leader` 匯出 JSON / JSON-MIN 的格式定義是否需要正式 ADR？目前 spec 014 提及但未有詳細 schema 文件 | spec 014 / export | 論文作者 | 部分已解：spec 014 已定義 JSON／JSON-MIN 格式（`EXPORT_JSON_MIN_SHAPE`、FR-021）；是否另立 ADR 仍待論文作者確認 |

---

## 變更紀錄

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.0.0 | 2026-06-02 | 初始版本；依 research phase 綜合結果建立，彙整產品目標、使用者旅程、功能需求、非功能需求、架構約束、範疇外與開放問題 |
| 1.1.0 | 2026-08-19 | 同步審核員模型（逐標記員審核 + 當場直接修正 + 爭議池第三人仲裁，取代通過/退回聚合語意）、gold 語意（僅 Official Run 審核定案後產生）、輸出類型改為 `input_type` + `outputs[]` 組合模型（取代固定任務類型 enum）；依 issue #202 |
| 1.2.0 | 2026-08-19 | 建立產品文件治理：將可變技術契約回鏈 feature specs／Constitution／ADR，校正組態、審核、資料安全與 IAA 摘要，新增 Agent Context Contract 與 decision log 入口 |
| 1.2.1 | 2026-10-06 | 同步可追溯來源版本（constitution、IA、story map、impact map）；FR-D02 試標完成通知改對齊 014 FR-008a v5.0.0（issue #1157） |
| 1.2.2 | 2026-10-06 | 新增 FR-SH04 工作頁籤導覽（spec 019 v1.2.0）；IA 參照改 v1.5.2、story map 參照改 v1.5.1（issue #1157） |
| 1.3.0 | 2026-10-13 | 新增 §4.0 規格索引（22 份 spec）並說明 PRD 能力編號（`FR-A01` 等）不是 spec FR；§4 各模組描述收斂為一句話能力陳述並補 spec FR 指標；FR-T06 分頁描述、FR-AD02 角色矩陣描述改對齊 spec 014 v12 與 spec 007；§7 Q-01～Q-06 標註現況與來源（issue #1315） |

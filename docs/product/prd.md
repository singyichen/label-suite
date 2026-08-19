# Label Suite — 產品需求文件（Product Requirements Document）

**版本：** 1.2.0
**日期：** 2026-08-19
**狀態：** Draft
**撰寫者：** Team Lead（基於 Research Phase 綜合）
**可追溯來源：**
- `specs/_governance/constitution.md` v1.31.0
- `docs/product/ia/information-architecture.md` v1.5.0
- `docs/product/story-map/story-map.md` v1.4.0
- `docs/product/impact-map/impact-map.md` v1.2.0
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
→ 等待所有 annotator 完成試標
→ Dashboard badge 通知：前往 dataset-analysis/quality tab 查看 IAA
→ 依逐型 IAA 與目標確認是否發布 Official Run；未達條件時回到可調整狀態並再試標
→ 等待 Official Run 完成
→ task-detail 標記結果 tab：匯出 JSON / JSON-MIN
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

### 4.1 模組：foundation（工程基準）

Foundation 提供可擴充、可觀測與安全的共同能力；API、資料模型、架構分層與技術選型等可變工程契約以 `foundation-000`、Constitution 與 ADR 為準，不在本文件複製。

### 4.2 模組：account（帳號模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-A01 | 使用者可透過 Email + Password 安全登入並維持受保護的工作階段 | P0 | spec 001；ADR-021 |
| FR-A02 | 工作階段更新不得不必要中斷使用者操作 | P0 | spec 001；ADR-021 |
| FR-A03 | Google SSO 僅為可操作入口與未來整合預留（no-op），不宣告 OAuth 已可登入 | P2 | spec 002 |
| FR-A04 | Email／Password 註冊目前為前端互動 prototype；完整行為以 spec 003 為準 | P1 | spec 003 |
| FR-A05 | 忘記密碼目前為前端互動 prototype；完整行為以 spec 004 為準 | P2 | spec 004 |
| FR-A06 | 使用者可在個人設定頁修改姓名、上傳頭像、變更 Email（含驗證流程）、修改密碼、設定外觀偏好（跟隨系統 / 淺色 / 深色）及通知偏好 | P2 | spec 005 |
| FR-A07 | 使用者登出時，後端立即撤銷 refresh token，清除 cookie | P0 | ADR-021 |
| FR-A08 | 系統角色與任務角色採雙層模型；具體授權契約以 shared constants 與對應 spec 為準 | P0 | ADR-021；IA §1 |

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
| FR-T02 | Config Builder 提供可理解的設定與預覽方式，細節以 spec 013 為準 | P0 | spec 013；IA §4 |
| FR-T03 | Config Builder 必須支援以 `input_type`（`single_item` / `item_pair`）與可組合的 `outputs[]`（`single_label`、`multi_label`、`single_dim`、`multi_dim`、`entity_recognition`、`relation_identification`、`sequence_tagging`、`free_text`）定義任務，取代固定任務類型 enum | P0 | spec 013；ADR-029；task-type-taxonomy |
| FR-T04 | 新增任務類型必須透過 registry / schema 擴充，不修改 Step 1~4 核心流程 | P0 | ADR-010；constitution 原則 II |
| FR-T05 | 任務列表頁顯示使用者有成員資格的任務（`super_admin` 顯示全平台任務），支援搜尋與狀態篩選 | P1 | spec 010 |
| FR-T06 | 任務詳情頁提供「任務概覽」、「標記結果」、「標記進度」、「工時紀錄」、「成員管理」五個 tab | P1 | spec 014 |
| FR-T07 | 任務生命週期為 `draft → dry_run_in_progress → waiting_iaa_confirmation → official_run_in_progress → completed`；完成需有正式提交、定案 review unit、無未解爭議、所需仲裁完成與品質指標可用；完整規則以 spec 014／ADR-022 為準 | P0 | ADR-022；spec 014 |
| FR-T08 | 流程狀態與回合需可追溯，Dry Run 與 Official Run 保持可重現且資料公平 | P0 | ADR-022；Constitution 原則 III |
| FR-T10 | `project_leader` 可在成員管理 tab 搜尋平台成員或以 Email 邀請，指派 `reviewer` / `annotator` 任務角色 | P1 | spec 014 |
| FR-T11 | 標記結果 tab 提供 JSON / JSON-MIN 格式匯出，並記錄匯出歷程 | P1 | spec 014 |
| FR-T12 | 任務刪除採軟刪除（soft delete），從預設列表隱藏，不物理刪除 | P1 | spec 010；IA §4 |

### 4.5 模組：annotation（標記任務模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-AN01 | Annotator 可從 Dashboard 或 Navbar 進入 `annotation-list`，查看被指派的任務與資料清單 | P0 | spec 015 |
| FR-AN02 | 標記作業頁依已發布 TaskConfig 的 `outputs[]` registry 動態渲染，不硬編碼任務邏輯 | P0 | spec 015；ADR-010 |
| FR-AN03 | 標記進度即時更新（已標記數量 / 本輪總量 / 階段），草稿自動儲存，離開後可繼續 | P0 | spec 015 |
| FR-AN04 | Dry Run 模式：所有 annotator 標記相同樣本，結果不計入正式資料集 | P0 | spec 015；constitution 原則 III |
| FR-AN05 | Official Run 模式：每位 annotator 分配不重疊的資料（依樣本快照切分） | P0 | spec 015 |
| FR-AN06 | Annotator 介面及其可見資料絕不包含 test-set ground truth；official run 的 gold 僅能在授權審核／仲裁定案後產生與存取 | P0 | Constitution 原則 III / NON-NEGOTIABLE |
| FR-AN07 | Reviewer 以 review unit 審核、可直接修正；爭議由合格且非當事人的仲裁者處理，完整規則以 spec 015 為準 | P1 | spec 015 |
| FR-AN08 | 右欄「說明與檔案」在每筆標記頁必須持續可見，翻頁時不收起或清空 | P0 | spec 015；IA §4 |
| FR-AN09 | `annotation-workspace` 必須記錄標記歷程（History），Reviewer 可追溯每筆的修改紀錄 | P1 | spec 015 |

### 4.6 模組：dataset（資料集分析模組）

| FR-ID | 描述 | 優先級 | Spec 來源 |
|-------|------|--------|-----------|
| FR-DS01 | 資料集分析模組入口（`/dataset-analysis`）列出使用者具 `project_leader` 或 `reviewer` 角色的任務 | P1 | spec 016 |
| FR-DS02 | 統計總覽 tab（`?tab=stats`）顯示共用指標：Sentence 數量、Token 數量、整體完成率 | P1 | spec 016 |
| FR-DS03 | 統計總覽依 `outputs[].type` 逐型顯示，複合任務逐型彙整 | P1 | spec 016 |
| FR-DS04 | 品質監控的 IAA 指標與預設門檻取自 spec 017 的 registry；`free_text` output 的自動 IAA 為 `not_applicable`，混合任務的其他 outputs 仍逐型套用該 registry | P1 | spec 017 |
| FR-DS05 | 品質監控提供資料品質觀察；異常與比較規則以 spec 017 為準 | P2 | spec 017 |

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

下列問題尚未在現有文件中有明確定義，需使用者確認後才能推進對應 spec：

| QID | 問題 | 影響範圍 | 需確認對象 |
|-----|------|---------|-----------|
| Q-01 | Help Button（spec 018）目前標記為 `deferred`，是否確認排除於 Demo Paper 範疇？ | shared 模組 | 論文作者 |
| Q-02 | 項目對型任務（`input_type = item_pair`）的 demo dataset 與使用情境是否已確定？目前 spec 013 / 015 / 017 已將 item_pair 輸入類型納入 config、workspace 與品質分析範圍 | spec 013 / 015 / 017 | 論文作者 |
| Q-03 | UI 資料集上傳目前僅接受 JSON；若需要 JSONL 或其他格式，必須先變更 spec 013。 | spec 013 | 論文作者 |
| Q-04 | SUS 問卷的受試者招募策略（5~10 位實驗室成員），目前 user study 的計畫時程是否確定？ | R2/R3 驗收 | 指導教授 / 論文作者 |
| Q-05 | `annotation-workspace` 中「標記說明強制顯示」（spec 013/015）的確認狀態是否需要持久化至 DB？若使用者換瀏覽器，應重新顯示還是跳過？ | spec 015 | 論文作者 |
| Q-06 | Official Run 完成後，`project_leader` 匯出 JSON / JSON-MIN 的格式定義是否需要正式 ADR？目前 spec 014 提及但未有詳細 schema 文件 | spec 014 / export | 論文作者 |

---

## 變更紀錄

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.0.0 | 2026-06-02 | 初始版本；依 research phase 綜合結果建立，彙整產品目標、使用者旅程、功能需求、非功能需求、架構約束、範疇外與開放問題 |
| 1.1.0 | 2026-08-19 | 同步審核員模型（逐標記員審核 + 當場直接修正 + 爭議池第三人仲裁，取代通過/退回聚合語意）、gold 語意（僅 Official Run 審核定案後產生）、輸出類型改為 `input_type` + `outputs[]` 組合模型（取代固定任務類型 enum）；依 issue #202 |
| 1.2.0 | 2026-08-19 | 建立產品文件治理：將可變技術契約回鏈 feature specs／Constitution／ADR，校正組態、審核、資料安全與 IAA 摘要，新增 Agent Context Contract 與 decision log 入口 |

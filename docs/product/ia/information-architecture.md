# Label Suite — 資訊架構

> **用途：** 作為 SDD 開發的參考基準。每份 `spec.md` 撰寫前，應先對照本文件確認頁面歸屬、使用者角色、進入條件與導覽關係。
>
> **基礎來源：** [`functional-map.md`](../functional-map/functional-map.md)
> **版本：** v7（2026-04-05）

---

## 1. 使用者角色

本系統採用**雙層角色模型**：系統角色（System Role）決定平台存取權；任務角色（Task Role）決定任務內的操作權限。

### 系統角色（System Role）— JWT 單值，平台層級

| 角色 | 識別碼 | 主要職責 | 指派方式 |
|------|--------|----------|----------|
| 平台成員 | `user` | 使用平台所有功能、建立任務、被邀請加入任務 | 自行註冊後自動取得 |
| 系統管理員 | `super_admin` | 平台維護、跨專案使用者管理、系統角色指派 | Super Admin 指派 |

> **新使用者預設狀態：** 任何人皆可透過 Google SSO 登入或 Email / Password 自行註冊（`/register`）進入系統，帳號建立後**立即取得 `user` 系統角色**，無需等待審核。

### 任務角色（Task Role）— `task_membership` 表，任務層級

| 任務角色 | 識別碼 | 職責 | 指派方式 |
|----------|--------|------|----------|
| 專案負責人 | `project_leader` | 管理任務設定、指派成員、發布 Dry Run / Official Run、匯出資料 | 建立任務時**自動指派**給任務建立者 |
| 審核員 | `reviewer` | 審查標記結果、協助產出標準答案、查看品質報告 | 由任務 `project_leader` 指派 |
| 標記員 | `annotator` | 執行標記作業（試標 / 正式標）、查看個人進度 | 由任務 `project_leader` 指派 |

> **Task Role 重點：** 同一使用者可在任務 A 擔任 `project_leader`，同時在任務 B 擔任 `annotator`。任務層級的授權透過查詢 `task_membership(task_id, user_id, task_role)` 表決定，不依賴 JWT 系統角色。系統角色不再有繼承關係。

---

## 2. 頁面清單與角色存取矩陣

| 頁面 ID | 頁面名稱 | 所屬模組 | user（系統）| super_admin | 任務角色限制 | 備註 |
|---------|----------|----------|:----------------:|:-----------:|-------------|------|
| `login` | 登入頁 | 帳號模組 | ✅ | ✅ | — | 未登入入口；含「前往註冊」連結 |
| `register` | 自行註冊頁 | 帳號模組 | ✅ | ✅ | — | 未登入可進入；填寫名稱、Email、密碼，建立後立即取得 `user` 系統角色 |
| `forgot-password` | 忘記密碼頁 | 帳號模組 | ✅ | ✅ | — | 未登入可進入；填寫 Email，系統寄送重設連結（Resend）|
| `reset-password` | 重設密碼頁 | 帳號模組 | ✅ | ✅ | — | 未登入可進入；prototype 預設 `valid` 並可切換 `expired/used` 狀態，錯誤時引導回 `forgot-password` |
| `profile` | 個人設定頁 | 帳號模組 | ✅ | ✅ | — | |
| `dashboard` | 儀表板 | — | ✅ | ✅ | — | 內容依任務角色動態調整 |
| `task-list` | 任務列表頁 | 任務管理模組 | ✅ | ✅ | — | 僅顯示自己有成員資格的任務 |
| `task-new` | 新增任務頁 | 任務管理模組 | ✅ | ✅ | — | 建立後自動成為任務 `project_leader` |
| `task-detail` | 任務詳情頁 | 任務管理模組 | ✅ | ✅ | `project_leader` 或 `reviewer`（任務） | 含任務成員管理（僅該任務 `project_leader` 可異動）；`annotator` 不得進入，只能從 dashboard 進入 annotation-workspace |
| `annotation-workspace` | 標記作業頁 | 標記任務模組 | ✅ | ✅ | `annotator` 或 `reviewer`（任務）| 模式依任務角色切換 |
| `dataset-stats` | 統計總覽頁 | 資料集分析模組 | ✅ | ✅ | `project_leader` 或 `reviewer`（任務）| |
| `dataset-quality` | 品質監控頁 | 資料集分析模組 | ✅ | ✅ | `project_leader` 或 `reviewer`（任務）| |
| `user-management` | 使用者管理頁 | 系統管理模組 | ❌ | ✅ | — | 平台級系統角色管理 |
| `role-settings` | 角色權限設定頁 | 系統管理模組 | ❌ | ✅ | — | |

---

## 2.1 Sidebar Navbar（跨模組共用）

> 本節定義「登入後」全站共用的側欄導覽 IA。未登入頁（`login` / `register` / `forgot-password` / `reset-password`）不使用 Sidebar，僅保留品牌列與語言切換。

### A. 導覽層級模型

| 層級 | 說明 | 例子 |
|------|------|------|
| L0 | 全域主導覽（Sidebar Navbar） | 儀表板、任務管理、標記作業、資料集分析、系統管理、個人設定 |
| L1 | 模組入口頁（Landing） | `task-list`、`annotation-workspace`、`dataset-stats`、`user-management` |
| L2 | 模組內次層頁（Contextual Navigation） | `task-new` / `task-detail`、`dataset-quality`、`role-settings` |

### B. L0 主導覽群組（Sidebar）

| 群組 | 導覽項 | 目標頁 | 所屬模組 |
|------|--------|--------|----------|
| Core | 儀表板 | `dashboard` | dashboard |
| Work | 任務管理 | `task-list` | task-management |
| Work | 標記作業 | `annotation-workspace` | annotation |
| Work | 資料集分析 | `dataset-stats` | dataset |
| Admin | 系統管理 | `user-management` | admin |
| Account | 個人設定 | `profile` | account |

> `annotation-workspace`、`dataset-stats`、`dataset-quality`、`task-detail` 皆屬「任務上下文頁」，進入時若缺少任務上下文（task_id / membership）需導回對應 Landing（通常為 `task-list` 或 `dashboard`）。

### C. 角色可見性矩陣（L0）

| 導覽項 | user（系統） | super_admin | 任務角色 gating 規則 |
|--------|:-------------:|:-----------:|----------------------|
| 儀表板（`dashboard`） | ✅ | ✅ | 無 |
| 任務管理（`task-list`） | ✅ | ✅ | 無 |
| 標記作業（`annotation-workspace`） | ✅ | ✅ | 需為當前任務 `annotator` 或 `reviewer`，否則導回 `dashboard` |
| 資料集分析（`dataset-stats`） | ✅ | ✅ | 需為當前任務 `project_leader` 或 `reviewer` |
| 系統管理（`user-management`） | ❌ | ✅ | 僅 `super_admin` 可見 |
| 個人設定（`profile`） | ✅ | ✅ | 無 |

### D. Active 狀態規則（L0 與 L2）

| 目前頁面 | L0 Active 項 | L2 / 頁內次導覽規則 |
|----------|-------------|----------------------|
| `dashboard` | 儀表板 | 依角色顯示對應區塊（User / PL / Annotator / Reviewer / Super Admin） |
| `profile` | 個人設定 | 個人資料 / 密碼設定 / 角色資訊（頁內錨點） |
| `task-list` | 任務管理 | 任務列表篩選（狀態 / 搜尋） |
| `task-new` | 任務管理 | Step 1 / Step 2 / Step 3 精靈導覽 |
| `task-detail` | 任務管理 | 任務資訊 / 任務成員管理 / 發布控制 / 匯出 / 任務內工時檢視 |
| `annotation-workspace` | 標記作業 | Annotator / Reviewer 模式切換（依任務角色） |
| `dataset-stats` | 資料集分析 | 指標分頁（共用指標 + task_type 特定指標） |
| `dataset-quality` | 資料集分析 | IAA / 異常偵測 / 速度統計 |
| `user-management` | 系統管理 | 使用者列表 / 帳號管理 |
| `role-settings` | 系統管理 | 角色權限矩陣設定 |

### E. Desktop / Mobile 導覽 IA

| 規格 | Desktop（`> MOBILE_BP`） | Mobile（`<= MOBILE_BP`） |
|------|---------------------------|---------------------------|
| 導覽型態 | 左側固定 Sidebar | 上方品牌列 + 下方橫向主導覽 |
| 可見資訊 | Logo、語言切換、L0 項目、使用者資訊、登出 | Logo、語言切換、使用者名稱、登出、L0 精簡主導覽 |
| Active 呈現 | 左側 item 高亮 + `aria-current` | 底部 item 高亮 + `aria-current` |
| 內容區避讓 | 內容區向右避讓 Sidebar 寬度 | 內容區需避讓頂部與底部導覽高度 |

### F. 模組導覽責任分工（資訊架構層）

| 模組 | L0 責任 | L2 / 內部導覽責任 |
|------|---------|--------------------|
| account | 提供 `profile` 入口與一致 user chip | profile 頁內分段（個人資料 / 密碼 / 角色） |
| dashboard | 提供全站入口與角色落地 | 角色視圖切換（由資料驅動，不新增 L0 項） |
| task-management | 任務主流程入口（`task-list`） | 新增任務精靈、任務詳情、任務成員管理、任務內工時檢視 |
| annotation | 標記/審查入口（需任務上下文） | Annotator/Reviewer 模式切換與提交路徑 |
| dataset | 分析入口（需任務上下文） | `stats` ↔ `quality` 雙頁切換 |
| admin | 平台管理入口（僅 super_admin） | 使用者管理 ↔ 角色權限設定 |

### G. 一致性原則（Navbar IA Contract）

- 同一語系下，`dashboard` 與 `profile` 的 Sidebar Navbar 結構、順序、命名與互動位置必須一致。
- 新增模組時僅能擴充 L0 導覽項，不得覆寫既有項目的語意。
- 任務上下文頁不得直接成為跨任務全域入口；L0 入口永遠指向該模組 Landing。
- 權限不足時採「可見但導回＋提示」或「直接隱藏」策略，需在 spec 明確定義，不可混用。

---

## 3. 頁面導覽結構圖

```mermaid
flowchart TD
  subgraph 未登入
    LOGIN["🔐 login\n登入頁"]
    REGISTER["📝 register\n自行註冊頁"]
    FORGOT["✉️ forgot-password\n忘記密碼頁"]
    RESET["🔑 reset-password\n重設密碼頁"]
  end

  subgraph 登入後可見
    DASH["🏠 dashboard\n儀表板"]
    PROFILE["👤 profile\n個人設定頁"]
  end

  subgraph 任務管理模組["任務管理模組（所有平台成員）"]
    TLIST["task-list\n任務列表頁"]
    TNEW["task-new\n新增任務頁"]
    TDETAIL["task-detail\n任務詳情頁"]
  end

  subgraph 標記任務模組["標記任務模組（任務角色：annotator / reviewer）"]
    ANNOT["annotation-workspace\n標記作業頁\n（Dry Run / Official Run）"]
  end

  subgraph 資料集分析模組["資料集分析模組（任務角色：project_leader / reviewer）"]
    STATS["dataset-stats\n統計總覽頁"]
    QUALITY["dataset-quality\n品質監控頁\n（IAA / 異常偵測）"]
  end

  subgraph 系統管理模組["系統管理模組（Super Admin）"]
    USERS["user-management\n使用者管理頁"]
    ROLES["role-settings\n角色權限設定頁"]
  end

  LOGIN -->|"登入成功"| DASH
  LOGIN -->|"前往註冊"| REGISTER
  LOGIN -->|"忘記密碼"| FORGOT
  FORGOT -->|"寄送重設連結"| RESET
  RESET -->|"重設成功"| LOGIN
  REGISTER -->|"註冊成功（自動取得 user 角色）"| DASH
  DASH --> PROFILE
  DASH --> TLIST
  DASH --> ANNOT
  DASH --> STATS
  DASH -->|IAA 待確認| QUALITY
  DASH --> USERS

  TLIST --> TNEW
  TLIST --> TDETAIL
  DASH -->|Reviewer 唯讀| TDETAIL
  TDETAIL -->|指派 Dry Run| ANNOT
  TDETAIL -->|指派 Official Run| ANNOT
  ANNOT -->|Dry Run 全員完成\n→ Dashboard badge 通知| DASH
  ANNOT -->|Official Run 完成標記| TDETAIL

  USERS --> ROLES

  STATS --> QUALITY
```

---

## 4. 模組詳細說明

### 帳號模組

#### `login` 登入頁
- **進入方式：** 未登入時唯一可見頁面；所有未授權跳轉均導回此頁
- **功能：** Google SSO 入口、Email / Password 登入、「前往註冊」連結（→ `register`）
- **語言切換：** 導覽列語言按鈕採單一語言代碼顯示（`ZH` 或 `EN`），切換後即時更新文案與 `aria-label`
- **離開方式：** 登入成功 → `dashboard`

#### `register` 自行註冊頁
- **進入方式：** `login` → 「前往註冊」連結；未登入時可直接訪問
- **功能：** 填寫名稱、Email、密碼，建立 Email / Password 帳號；建立後自動取得 `user` 系統角色
- **語言切換：** 導覽列語言按鈕採單一語言代碼顯示（`ZH` 或 `EN`），切換後即時更新文案與 `aria-label`
- **離開方式：** 註冊成功 → `dashboard`；取消 → `login`

#### `forgot-password` 忘記密碼頁
- **進入方式：** `login` → 「忘記密碼」連結；未登入時可直接訪問
- **功能：** 填寫 Email 送出後顯示通用成功提示（不揭露 Email 是否存在）；prototype 以成功面板模擬寄信結果
- **語言切換：** 導覽列語言按鈕採單一語言代碼顯示（`ZH` 或 `EN`），切換後即時更新文案與 `aria-label`
- **離開方式：** 送出後停留並顯示「若 Email 存在，重設信已寄出」（不揭露 Email 是否存在）；「返回登入」→ `login`

#### `reset-password` 重設密碼頁
- **進入方式：** 正式流程由 Email 重設連結進入；prototype 可直接開啟頁面並透過狀態切換模擬 token 情境
- **功能：** 輸入並確認新密碼；prototype 支援 `valid / expired / used` 三種 token 狀態切換，用於驗證成功與錯誤路徑
- **語言切換：** 導覽列語言按鈕採單一語言代碼顯示（`ZH` 或 `EN`），切換後即時更新文案與 `aria-label`
- **離開方式：** 重設成功 → `login`；token 無效或已過期 → 顯示錯誤並提示重新申請 → `forgot-password`

#### `profile` 個人設定頁
- **進入方式：** Navbar 使用者頭像 → `profile`
- **功能：** 修改姓名、修改聯絡方式、修改密碼、查看角色
- **語言切換：** 導覽列語言按鈕採單一語言代碼顯示（`ZH` 或 `EN`），切換後即時更新文案與 `aria-label`
- **離開方式：** 儲存成功 → 停留；取消 → `dashboard`

---

### 儀表板

#### `dashboard` 儀表板
- **進入方式：** 登入後預設落地頁；Navbar Logo 點擊
- **離開方式：** 導覽列 → 各模組；卡片快捷入口 → 對應頁面

**角色分流邏輯（與 spec 012 一致）：**
- 先讀取 `system role`
  - `super_admin`：顯示 Super Admin Dashboard
  - `user`：再讀取 `task_membership` 判斷主視圖
    - 無任務關係：一般使用者 Dashboard
    - 有 `project_leader` 任務：Project Leader Dashboard
    - 有 `annotator` 任務：Annotator Dashboard
    - 有 `reviewer` 任務：Reviewer Dashboard
- 若 `role` 無效：導回 `/login`
- **備註：** 當 `user` 同時具多種 task role 時，依產品規則選擇單一主視圖呈現（不再採區塊拼接）

**一般使用者視角（`user` + 無任務關係）：**
- **歡迎區塊：** 歡迎文案 +「建立第一個任務」主 CTA
- **指標卡（4 張）：** 目前角色、我建立的任務、我被指派的任務、我被指派的審核
- **引導區塊：** 3 張角色轉換引導卡（Project Leader / Annotator / Reviewer）

**Project Leader 視角（任務角色：`project_leader`）：**
- **任務概況：** 總任務、進行中、等待 IAA 確認、速度異常
- **任務列表：** 任務名稱、摘要、Task Type / Run Type / Status badge、進度條、查看全部

**Annotator 視角（任務角色：`annotator`）：**
- **標記概況：** 待標記、今日完成、平均速度
- **任務列表：** 任務名稱、進度摘要、Task Type / Run Type / Status badge、進度條、快速繼續

**Reviewer 視角（任務角色：`reviewer`）：**
- **審核概況：** 待審總數、今日已審、IAA 摘要
- **任務列表：** 任務名稱、審查摘要、Task Type / Run Type / Status badge、進度條、快速審核

**Super Admin 視角（系統角色：`super_admin`）：**
- **平台使用者統計：** 總用戶、專案負責人、標記員、審核員
- **任務概況：** 總任務、進行中、等待 IAA 確認、速度異常
- **最近提醒：** 系統提醒清單
- **任務列表：** 任務名稱、摘要、Task Type / Run Type / Status badge、進度條、查看全部

**導覽與語言切換（RWD）：**
- `> MOBILE_BP`：左側側邊欄；語言切換按鈕位於品牌列（Logo + Label Suite）右側，顯示單一語言代碼（`ZH` 或 `EN`）
- `<= MOBILE_BP`：側邊欄轉底部橫向導覽；頂部品牌列保留語言切換、當前人員名稱與登出按鈕
- 語言切換需即時更新文案與可存取屬性（`aria-label` / `title`），不重新載入頁面

---

### 任務管理模組

#### `task-list` 任務列表頁
- **進入方式：** Navbar → 任務管理
- **功能：** 顯示所有任務（含狀態 badge）、搜尋 / 篩選、進入任務詳情
- **空狀態（尚未建立任何任務）：** 說明文字 + 「建立第一個任務」按鈕（→ `task-new`）
- **離開方式：** 點選任務 → `task-detail`；「新增任務」按鈕 → `task-new`

#### `task-new` 新增任務頁
- **進入方式：** `task-list` → 新增任務
- **流程：** 分三步驟完成（Step 1 → Step 2 → Step 3）
- **Step 1 — 基本資料：**
  - 填寫任務名稱
  - 上傳資料集（txt / csv / tsv / json）
  - 選擇任務類型（決定 Step 2 的 Config Builder 內容）
- **Step 2 — Config Builder（介面輔助設定，無需手寫 config）：**
  - 提供「從範本開始」入口：常用任務類型的預設 config（如三分類情感、NER 醫療實體），可直接套用後微調，降低設定門檻
  - **Visual 模式（預設）：**
    - **分類任務：** 新增 / 編輯標籤清單（Label Name + 說明），支援多標籤 / 單標籤切換
    - **評分 / 回歸任務：** 設定分數範圍（最小值 / 最大值）、刻度單位、介面顯示方式（滑桿 / 數字輸入 / 選項按鈕）
    - **句對任務：** 選擇關係類型（相似度 / 蘊含 / 自訂），設定評分或分類標籤
    - **序列標記（NER）：** 新增 / 編輯實體類型清單（Entity Name + 顏色 + 說明）
    - **關係抽取：** 設定實體類型清單（同 NER）+ 關係類型清單（Relation Name + 說明），標記介面呈現 Entity List / Relation Type / Triple List 三區
  - **Code 模式（進階）：** 直接檢視 / 編輯系統產生的 YAML/JSON config 原始碼，供技術人員驗證或手動調整；Visual 與 Code 模式可互相切換
- **Step 3 — 標記說明（選填）：**
  - 上傳標記範本 / 說明文件（PDF / 圖片 / 文字），顯示於 `annotation-workspace` 的「說明與範例」區
  - 可設定「開始標記前強制顯示」：Annotator 每次進入任務時先跳出說明 modal，確認後才進入標記介面
- **任務類型（共 5 種 `task_type`）：**
  - 單句分類（Classification）
  - 單句評分 / 回歸（Scoring / Regression）
  - 句對任務（相似度 / 蘊含）
  - 序列標記（NER、詞性標記）
  - 關係抽取（Entity + Relation + Triple）
- **空狀態：** 不適用（此頁為建立流程，永遠有內容）
- **任務建立完成：** 系統自動在 `task_membership` 建立一筆紀錄，任務建立者的任務角色設為 `project_leader`
- **離開方式：** 建立成功 → `task-detail`；取消 → `task-list`

#### `task-detail` 任務詳情頁
- **進入方式：** `task-list` 點選任務（有任務成員資格的使用者皆可進入）
- **任務狀態轉換：**
  - `草稿` → `Dry Run 進行中` → `等待 IAA 確認` → `Official Run 進行中` → `已完成`
  - **Dry Run 完成通知：** 當所有標記員完成 Dry Run 後，系統自動切換狀態至「等待 IAA 確認」，並在 Dashboard 待處理事項區新增 badge 提醒任務 `project_leader`
- **功能（任務角色：project_leader）：**
  - 查看任務設定與任務類型
  - 任務成員管理（內嵌於 `task-detail`）：
    - 從現有平台 `user` 名單中加入成員到目前任務
    - 指派 / 調整任務角色（`reviewer` 或 `annotator`）
    - 移除任務成員或停用其在該任務中的參與狀態
  - 發布試標（Dry Run）：選取共用樣本集（建議 20 句），發布給所有任務標記員
  - 發布正式標記（Official Run）：在 IAA 達標（≥ 0.8）後啟動，分派不重疊資料給各標記員
  - 查看標記進度（各標記員完成數 / 速度）
  - 查看任務內工時紀錄（僅該任務成員範圍）
  - 匯出標記結果（JSON / JSON-MIN）
- **功能（任務角色：reviewer）：** 唯讀視角；指派、發布、匯出等操作按鈕隱藏
- **功能（任務角色：annotator）：** 不可進入任務詳情，僅能從 dashboard 進入 annotation-workspace
- **資料隔離原則：** Dry Run 資料與 Official Run 資料必須隔離，不得混入正式標記集
- **離開方式：** 返回 → `task-list`；匯出為頁面內操作（Toast 提示下載），不觸發頁面跳轉

#### `task-member-management` 任務成員管理（內嵌於 `task-detail`）
- **定位：** `task-detail` 的內嵌管理區塊，不作為獨立 Sidebar 項目
- **進入方式：** `task-list` → `task-detail` → 任務成員管理（任務 `project_leader`）
- **功能：**
  - 檢視目前任務成員清單（含角色與狀態）
  - 從平台一般使用者名單加入成員到目前任務
  - 指派或調整任務角色（`annotator` / `reviewer`）
  - 移除成員或停用其在「目前任務」的參與
- **限制：**
  - `project_leader` 僅能管理自己所屬任務的成員，不得跨任務異動
  - 成員角色為任務層級，不影響系統角色（`user` / `super_admin`）

#### `task-work-log` 任務工時紀錄（內嵌於 `task-detail`）
- **定位：** `task-detail` 的內嵌檢視區塊，不作為獨立 Sidebar 項目
- **進入方式：** `task-list` → `task-detail` → 工時紀錄分頁
- **功能：**
  - 查看該任務成員的工時與標記活動紀錄（日期、時長、完成筆數、平均速度）
  - 依成員、日期區間、任務階段（Dry Run / Official Run）篩選
  - 顯示任務整體與成員個別統計，用於排班與進度判斷
- **權限：**
  - `project_leader`：可查看該任務所有成員工時
  - `reviewer` / `annotator`：僅可查看自己在該任務的工時
  - 非該任務成員不得查看
- **離開方式：** 返回 `task-detail` 其他分頁或返回 `task-list`

---

### 標記任務模組

#### `annotation-workspace` 標記作業頁
- **進入方式（Annotator）：** `dashboard` 任務卡片「開始 / 繼續標記」按鈕；快速繼續按鈕
- **進入方式（Reviewer）：** `dashboard` 待審查任務列表中的任務卡；Navbar → 標記審查
- **兩種模式（run_type）：**
  - **Dry Run（試標）：** 所有標記員標記相同樣本，結果不計入正式資料，用於計算 IAA 與討論標記準則
  - **Official Run（正式標記）：** 每位標記員分配不重疊的資料，結果計入正式資料集
- **功能（Annotator）：** 標記操作區、說明與範例（側欄）、進度指示器（即時顯示完成數）、儲存 / 提交
  - **標記說明強制顯示：** 若 Project Leader 在任務設定中啟用，Annotator 每次進入任務前會先看到說明 modal，確認後才進入標記介面
- **功能（Reviewer）：** 審查模式，可通過 / 退回標記結果、直接修改或刪除錯誤標記、協助產出 Dry Run 標準答案（多數決或手動確認）
- **標記歷程（History）：** 每筆資料的所有標記修改紀錄（誰、何時、改成什麼），Reviewer 可追溯標記變更歷程
- **離開方式：** 提交 → 停留（下一筆）或返回 `dashboard`；中途離開 → 自動儲存草稿

---

### 資料集分析模組

> 本模組依任務類型動態調整顯示內容。所有頁面均以當前任務的 `task_type` 作為分析維度切換依據。

#### `dataset-stats` 統計總覽頁
- **進入方式：** Navbar → 資料集分析 → 統計總覽
- **共用指標（所有任務）：** Sentence 數量、Token 數量、整體完成率
- **任務類型特定指標：**
  - **分類任務：** 各標籤次數 / 比例長條圖、多標籤共現矩陣
  - **評分 / 回歸任務：** 分數分佈直方圖、平均值 / 標準差 / 中位數
  - **序列標記（NER）：** 實體類型分佈、每句平均實體數、Entity span 長度分佈
  - **關係抽取：** 實體類型分佈 + 關係類型分佈、Triple 數量統計
  - **句對任務：** 依標籤或分數呈現（同分類 / 評分）
- **空狀態（尚無標記資料）：** 說明文字「尚無標記資料，請先發布 Dry Run」，次要按鈕「前往任務詳情」（→ `task-detail`）
- **離開方式：** 切換至 `dataset-quality`

#### `dataset-quality` 品質監控頁
- **進入方式：** `dataset-stats` 切換；Navbar 直接進入；或 Dashboard 待處理事項區「IAA 待確認」連結（Project Leader）
- **IAA 計算方法（依任務類型）：**
  - **分類任務：** Cohen's Kappa（兩人）/ Fleiss' Kappa（多人），目標 ≥ 0.8
  - **評分 / 回歸任務：** Krippendorff's Alpha、Pearson / Spearman 相關係數
  - **序列標記（NER）：** Entity-level F1（標記員兩兩比較）
  - **關係抽取：** Triple-level agreement（Entity + Relation 完全一致才算匹配）
  - **句對任務：** 同分類或評分（依 config 類型）
- **異常偵測（所有任務）：** 標記速度異常（過快 / 過慢）、離群標記值
- **標記員個別速度統計**
- **空狀態（Dry Run 尚未完成）：** 說明文字「IAA 報告將在 Dry Run 完成後產生」，次要按鈕「前往任務詳情」（→ `task-detail`）
- **離開方式：** 返回 `dataset-stats`

---

### 系統管理模組

> 本模組僅 `super_admin` 可存取。`project_leader` 的任務成員異動在 `task-detail` 的「任務成員管理」內進行。

#### `user-management` 使用者管理頁
- **進入方式：** Navbar → 系統管理 → 使用者管理
- **功能：** 查看所有平台使用者（跨專案）、新增 / 編輯 / 停用帳號、指派**系統**角色（`user` / `super_admin`）；`project_leader` / `reviewer` / `annotator` 為任務角色，於 `task-detail` 管理，不在此頁指派
- **空狀態（尚無任何使用者）：** 說明文字「尚未建立任何使用者帳號」 + 「新增第一位使用者」按鈕
- **離開方式：** 點選角色設定 → `role-settings`

#### `role-settings` 角色權限設定頁
- **進入方式：** `user-management` → 角色設定
- **功能：** 檢視並維護角色權限矩陣；系統角色為 `user` / `super_admin`，任務角色為 `project_leader` / `reviewer` / `annotator`
- **離開方式：** 儲存 → `user-management`

---

## 5. 核心使用者旅程

### 旅程 A — 完整專案生命週期（Project Leader 視角）

```mermaid
sequenceDiagram
  participant AN as Annotator
  participant LOGIN as login
  participant DASHBOARD as dashboard
  participant PL as Project Leader
  participant TN as task-new
  participant TD as task-detail
  participant AW as annotation-workspace
  participant DQ as dataset-quality

  PL->>LOGIN: 登入（Google SSO 或 Email）
  LOGIN-->>DASHBOARD: 導向儀表板頁
  PL->>TN: 上傳資料集 + 設定任務類型
  TN-->>TD: 建立成功，跳轉詳情頁（PL 自動取得 project_leader 角色）
  PL->>TD: 在任務成員管理中選取平台使用者並加入任務，指派任務角色
  AN->>LOGIN: 自行以 Google SSO 登入（首次，自動取得 user 角色）
  LOGIN-->>DASHBOARD: 導向儀表板頁
  TD-->>AN: 取得任務角色（annotator / reviewer）
  PL->>TD: 發布 Dry Run（共同樣本 ~20 句）
  Note over AW: 所有標記員標記相同樣本
  AW-->>TD: 任務狀態切換 → 等待 IAA 確認
  TD-->>PL: Dashboard 待處理事項 badge：「Dry Run 已全員完成」
  PL->>DQ: 從 badge 連結進入，查看 IAA 結果
  alt IAA ≥ 0.8
    PL->>TD: 確認標記準則，發布 Official Run
    Note over AW: 各標記員分配不重疊資料
    AW-->>TD: 標記進度更新
    PL->>TD: 全部完成後，匯出標記結果（JSON / JSON-MIN）
  else IAA < 0.8
    PL->>DQ: 查看差異報告，召開討論修正準則
    PL->>TD: 重新發布 Dry Run
  end
```

### 旅程 B — 標記員完成標記作業

```mermaid
sequenceDiagram
  participant AN as Annotator
  participant D as dashboard
  participant AW as annotation-workspace

  AN->>D: 登入後查看待標記任務（Dry Run 或 Official Run）
  AN->>AW: 點擊任務卡片進入標記頁
  loop 逐筆標記
    AN->>AW: 完成當筆標記
    AW-->>AN: 自動儲存 + 即時更新完成數
  end
  AN->>AW: 全部完成 → 提交
  AW-->>D: 跳轉回儀表板，任務狀態更新為 Submitted
```

### 旅程 C — 審核員審查並查看品質報告

> 審核員（`reviewer`）是任務角色（task role），透過 `task_membership` 表在任務層級指派，與系統角色（system role）無關、無繼承關係。同一使用者可在同一任務同時被指派為 `project_leader` 與 `reviewer`，但這是兩筆獨立的 `task_membership` 記錄，而非角色繼承。

```mermaid
sequenceDiagram
  participant R as Reviewer
  participant AW as annotation-workspace
  participant DS as dataset-stats
  participant DQ as dataset-quality

  R->>AW: 進入審查模式，逐筆審核
  R->>AW: 通過 / 退回標記結果
  Note over AW: Dry Run 階段：協助產出標準答案（多數決 / 手動確認）
  R->>DS: 查看統計總覽（Sentence / Token / Label 分佈）
  R->>DQ: 查看 IAA 報告與異常偵測結果
```

### 旅程 D — Super Admin 使用者管理

```mermaid
sequenceDiagram
  participant SA as Super Admin
  participant UM as user-management
  participant RS as role-settings

  SA->>UM: 查看所有使用者帳號
  SA->>UM: 新增平台成員帳號（user）
  SA->>UM: 指派系統角色（user / super_admin）
  SA->>RS: 調整角色功能存取範圍
  Note over SA: 任務成員（annotator/reviewer）由 Project Leader 在 task-detail 內管理
```

---

## 6. 與 SDD 的對應關係

每次執行 `/speckit.specify` 前，對照以下欄位確認範圍：

| SDD 問題 | 本文件對應位置 |
|----------|----------------|
| 這個 spec 屬於哪個模組？ | § 4 模組詳細說明 |
| 哪些角色會用到這個功能？ | § 2 頁面清單與角色存取矩陣 |
| 這個頁面從哪裡進入？ | § 4 各頁面「進入方式」 |
| 完成後去哪裡？ | § 4 各頁面「離開方式」 |
| 這個功能跑完整 user journey 是什麼？ | § 5 核心使用者旅程 |
| 有沒有跨模組的資料依賴？ | § 3 頁面導覽結構圖 |

---

## 7. Spec 清單

### 拆分原則

| 原則 | 說明 |
|------|------|
| **獨立可測試** | 該 spec 完成後能獨立驗收，不依賴其他 spec |
| **同一操作流程** | 多個頁面屬於同一個連續操作（如精靈步驟），合為一個 spec |
| **多角色整合** | 同一頁面不同角色視圖若共用大量邏輯，合為一個 spec，以角色分 User Story |

> **注意：** 此清單為實際建立的 spec 檔案清單，以 `specs/STATUS.md` 為真值。  
> 各 spec 的詳細開發狀態（branch、進行中、已完成）請查 `specs/STATUS.md`。

**開發批次：**

- **P1 — 基礎建設**（001–010 + 012 + Shared）：帳號系統、角色管理、共用導覽、儀表板，所有功能的前提
- **P2 — 核心功能**（013–017）：任務建立到標記完整流程、資料集分析

### Spec 清單

#### shared

| # | Spec 名稱 | 頁面 / 範圍 | 模組 | 複雜度 | 批次 | 狀態 |
| --- | ----------- | ------------ | ------ | -------- | ------ | ------ |
| 008 | Sidebar Navbar 共用規格 | 所有登入後頁面（shared layout） | shared | ★★☆☆☆ | P1 | 🔄 進行中 |

#### account

| # | Spec 名稱 | 頁面 / 範圍 | 模組 | 複雜度 | 批次 | 狀態 |
| --- | ----------- | ------------ | ------ | -------- | ------ | ------ |
| 001 | 登入 — Email/Password + 頁面 UI | `login` | account | ★☆☆☆☆ | P1 | 🔄 進行中 |
| 002 | 登入 — Google SSO 整合 | `login` | account | ★★☆☆☆ | P1 | 🔄 進行中 |
| 003 | 自行註冊（Email/Password） | `register` | account | ★☆☆☆☆ | P1 | 🔄 進行中 |
| 004 | 忘記密碼 / 重設密碼（Resend） | `forgot-password` · `reset-password` | account | ★★☆☆☆ | P1 | 🔄 進行中 |
| 005 | 個人設定（資料編輯 + 修改密碼） | `profile` | account | ★☆☆☆☆ | P1 | ⬜ 待做 |

#### dashboard

| # | Spec 名稱 | 頁面 / 範圍 | 模組 | 複雜度 | 批次 | 狀態 |
| --- | ----------- | ------------ | ------ | -------- | ------ | ------ |
| 012 | 儀表板（全角色：User / PL / Annotator / Reviewer / Super Admin） | `dashboard` | dashboard | ★★★☆☆ | P1 | 🔄 進行中 |

#### task-management

| # | Spec 名稱 | 頁面 / 範圍 | 模組 | 複雜度 | 批次 | 狀態 |
| --- | ----------- | ------------ | ------ | -------- | ------ | ------ |
| 010 | 任務列表（搜尋、篩選、空狀態） | `task-list` | task-management | ★★☆☆☆ | P1 | ⬜ 待做 |
| 013 | 新增任務（Step 1–3 + Config Builder 全任務類型） | `task-new` | task-management | ★★★★☆ | P2 | ⬜ 待做 |
| 014 | 任務詳情（成員管理 / 可加入成員名單 / Dry Run / Official Run / 工時紀錄 / 匯出） | `task-detail` | task-management | ★★★★☆ | P2 | ⬜ 待做 |

#### annotation

| # | Spec 名稱 | 頁面 / 範圍 | 模組 | 複雜度 | 批次 | 狀態 |
| --- | ----------- | ------------ | ------ | -------- | ------ | ------ |
| 015 | 標記作業（Annotator / Reviewer 模式，全任務類型） | `annotation-workspace` | annotation | ★★★★☆ | P2 | ⬜ 待做 |

#### dataset

| # | Spec 名稱 | 頁面 / 範圍 | 模組 | 複雜度 | 批次 | 狀態 |
| --- | ----------- | ------------ | ------ | -------- | ------ | ------ |
| 016 | 統計總覽（共用指標 + 任務類型特定） | `dataset-stats` | dataset | ★★★★☆ | P2 | ⬜ 待做 |
| 017 | 品質監控（IAA / 異常偵測 / 速度統計，全任務類型） | `dataset-quality` | dataset | ★★★★☆ | P2 | ⬜ 待做 |

#### admin

| # | Spec 名稱 | 頁面 / 範圍 | 模組 | 複雜度 | 批次 | 狀態 |
| --- | ----------- | ------------ | ------ | -------- | ------ | ------ |
| 006 | 使用者列表與管理 | `user-management` | admin | ★★☆☆☆ | P1 | ⬜ 待做 |
| 007 | 角色權限設定 | `role-settings` | admin | ★★☆☆☆ | P1 | ⬜ 待做 |

> 狀態標示：⬜ 待做 · 🔄 進行中 · ✅ 完成　　批次：P1 基礎建設 · P2 核心功能

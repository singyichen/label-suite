# 功能規格：Dashboard — 儀表板

**功能分支**：`012-dashboard`
**建立日期**：2026-04-05
**版本**：1.3.21
**狀態**：Clarified
**需求來源**：最新原型 [`design/prototype/pages/dashboard/dashboard.html`](../../../design/prototype/pages/dashboard/dashboard.html)

## 規格常數

- `MOBILE_BP = 767px`
- `RWD_VIEWPORTS = 375px / 768px / 1440px`

## Process Flow

```mermaid
sequenceDiagram
    actor 使用者
    participant 瀏覽器
    participant authStore
    participant membership as task_membership

    使用者->>瀏覽器: 登入後進入 /dashboard
    瀏覽器->>authStore: 讀取 system role

    alt role = super_admin
        authStore-->>瀏覽器: 顯示 Super Admin Dashboard
    else role = user
        瀏覽器->>membership: 讀取使用者任務關係
        membership-->>瀏覽器: 回傳任務角色與任務數據
        alt 尚無任務（未建立且未被指派）
            瀏覽器-->>使用者: 顯示一般使用者 Dashboard
        else 有 project_leader 任務
            瀏覽器-->>使用者: 顯示 Project Leader Dashboard
        else 有 annotator 任務
            瀏覽器-->>使用者: 顯示 Annotator Dashboard
        else 有 reviewer 任務
            瀏覽器-->>使用者: 顯示 Reviewer Dashboard
        end
    else role 無效
        authStore-->>瀏覽器: 導向 /login
    end

    使用者->>瀏覽器: 點擊語言切換
    瀏覽器-->>使用者: 切換 zh-TW / en 文案與 aria/title

    使用者->>瀏覽器: 點擊登出
    瀏覽器-->>使用者: 導向 ../account/login.html（原型）
```

| 步驟 | 角色 | 動作 | 系統回應 |
|------|------|------|---------|
| 1 | 使用者 | 登入後進入 `/dashboard` | 系統讀取 `system role` |
| 2 | 系統 | `role = super_admin` | 顯示 Super Admin Dashboard |
| 3 | 系統 | `role = user` | 讀取任務關係，決定顯示一般使用者 / PL / Annotator / Reviewer 視圖 |
| 4 | 使用者 | 點擊語言切換 | 切換 zh-TW / en，更新文案與可存取屬性 |
| 5 | 使用者 | 點擊登出 | 導向 `../account/login.html`（原型導頁） |
| 6 | 使用者 | 切換語言後導向其他頁再返回 | 維持同語系，不回退預設語言 |

---

## 使用者情境與測試 *(必填)*

### Dashboard 頁首區塊（M3）

**頁首定義（需與原型一致）**：

- 主標題：`儀表板`
- 副標題：`掌握任務進度與團隊協作狀態`
- 位置：位於主內容區最上方，顯示於場景模式控制區（Scenario Controls）之前

**頁首行為規則**：

- 頁首區塊不隨角色視圖切換而隱藏，於所有 Dashboard 視圖固定顯示。
- 語言切換時，主標題與副標題必須即時切換（zh-TW / en）。

### User Story 1 — 一般使用者儀表板（優先級：P1）

`user` 登入後，若尚未建立任務且未被指派任務，顯示一般使用者視圖。

**此優先級原因**：這是新使用者第一個會遇到的情境，需明確指引下一步。

**獨立測試方式**：以無任務關係的 `user` 登入，確認顯示「三張行動入口卡」與「三條最短成功路徑」。

**驗收情境**：

1. **Given** `role = user` 且無任何任務關係，**When** 進入 `/dashboard`，**Then** 顯示區塊標題「開始你的第一個工作流程」。
2. **Given** 同上，**When** 檢視首頁行動入口，**Then** 顯示 3 張卡片：建立標記專案、進行資料標記、進行品質審核，且各卡均有清楚 CTA。
3. **Given** 同上，**When** 檢視成功路徑區塊，**Then** 顯示 3 條路徑（負責人/標記員/審核員），且每條路徑皆有 5~8 個 onboarding steps（本版為 5 步）。

**首頁行動入口定義（需與原型一致）**：

- 區塊標題：`開始你的第一個工作流程`
- 區塊副標：`從三個行動入口開始，快速達成第一個可交付成果`
- 行動卡 A：
  - 標題：`建立標記專案`
  - 內文：`上傳資料、設定標籤規則、指派團隊成員。`
  - CTA：`建立第一個任務`
- 行動卡 B：
  - 標題：`進行資料標記`
  - 內文：`查看待辦任務，完成資料標記並提交結果。`
  - CTA：`前往標記入口`
- 行動卡 C：
  - 標題：`進行品質審核`
  - 內文：`檢查標記內容、退回修正或通過資料。`
  - CTA：`前往審核入口`

**最短成功路徑定義（需與原型一致）**：

- 區塊標題：`三條最短成功路徑`
- 區塊副標：`照著這三條路徑走，你可以快速完成第一次上手。`
- 路徑 A：`負責人路徑：建立任務成功`（5 步）
  - 建立任務 → 上傳資料 → 設定規則 → 指派人員 → 啟動任務
- 路徑 B：`標記員路徑：完成第一筆標記`（5 步）
  - 進入待辦 → 閱讀規則 → 完成首筆 → 提交 → 確認完成 1 筆
- 路徑 C：`審核員路徑：完成第一筆審核`（5 步）
  - 進入待審 → 比對規範 → 標記修正點 → 通過或退回 → 確認完成 1 筆

**行為規則**：

- 當使用者符合一般使用者條件（無任務關係）時，三張行動入口卡與三條最短成功路徑必須同時顯示。
- 語言切換時，兩個區塊標題/副標、三張行動卡（標題/內文/CTA）與三條路徑步驟文案都必須即時切換。
- 三張行動卡 CTA 必須可追蹤點擊事件，並保留後續綁定實際路由的擴充空間。

---

### User Story 2 — Super Admin 儀表板（優先級：P1）

Super Admin 登入後看到平台層級總覽，用於掌握整體人員、任務與風險提醒。

**此優先級原因**：平台管理者需要第一時間掌握全局狀態。

**獨立測試方式**：以 Super Admin 身分登入，確認只顯示 Super Admin 版面，且包含規定區塊與欄位。

**驗收情境**：

1. **Given** `role = super_admin`，**When** 進入 `/dashboard`，**Then** 顯示平台使用者統計（總用戶、專案負責人、標記員、審核員）。
2. **Given** `role = super_admin`，**When** 進入 `/dashboard`，**Then** 顯示任務概況（總任務、進行中、等待 IAA 確認、速度異常）。
3. **Given** `role = super_admin`，**When** 檢視任務列表，**Then** 每列包含名稱、摘要、Task Type badge、Annotation Stage badge、狀態 badge、進度條。

**系統管理員介面定義（需與原型一致）**：

- 區塊 A：`平台使用者統計`
  - 副標：`系統概況`
  - 指標卡（4 張）：
    - `總用戶`
    - `專案負責人`
    - `標記員`
    - `審核員`
- 區塊 B：`任務概況`
  - 副標：`所有項目統計`
  - 指標卡（4 張）：
    - `總任務`
    - `進行中`
    - `等待 IAA 確認`
    - `速度異常`
- 區塊 C：`最近提醒`
  - 副標：`系統通知`
  - 清單列項：
    - 提醒標題（例如：`NER Benchmark`）
    - 提醒內容（例如：`IAA 已達 0.81，待確認後啟動`）
- 區塊 D：`任務列表`
  - 副標：`進行中的所有項目`
  - 右上操作：`查看全部` 按鈕
  - 任務列項欄位：
    - 任務名稱
    - 任務摘要（專案負責人 / 審核員 / 標記員人數 / 完成率）
    - badge 群組（Task Type、Annotation Stage、Status）
    - 完成率 progress bar

**系統管理員區塊行為規則**：

- 四個主要區塊（A/B/C/D）在 `super_admin` 視圖中必須同時可見。
- `查看全部` 為任務列表主操作按鈕，文字必須可 i18n 切換。
- 語言切換時，區塊標題/副標、提醒文字、任務列表標題與按鈕、badge 文字都必須即時切換。

---

### User Story 3 — Project Leader 儀表板（優先級：P1）

`user` 在任務中建立任務後成為 Project Leader，登入後看到任務管理導向儀表板。

**此優先級原因**：Project Leader 是任務推進關鍵角色。

**獨立測試方式**：以有 `project_leader` 任務關係的 `user` 登入，確認顯示 PL 版面。

**驗收情境**：

1. **Given** `role = user` 且有 `project_leader` 任務，**When** 進入 `/dashboard`，**Then** 顯示任務概況（總任務、進行中、等待 IAA 確認、速度異常）。
2. **Given** 同上，**When** 檢視任務列表，**Then** 每列包含任務名稱、摘要、Task Type badge、Annotation Stage badge、狀態 badge、進度條。

**專案負責人介面定義（需與原型一致）**：

- 區塊 A：`任務概況`
  - 副標：`所有項目統計`
  - 指標卡（4 張）：
    - `總任務`
    - `進行中`
    - `等待 IAA 確認`
    - `速度異常`
- 區塊 B：`任務列表`
  - 副標：`進行中的所有項目`
  - 右上操作：`查看全部` 按鈕
  - 任務列項欄位：
    - 任務名稱
    - 任務摘要（審核員 / 標記員人數 / 完成率）
    - badge 群組（Task Type、Annotation Stage、Status）
    - 完成率 progress bar

**專案負責人區塊行為規則**：

- 在 `project_leader` 視圖中，區塊 A 與區塊 B 必須同時可見。
- `查看全部` 為任務列表主操作按鈕，文字必須可 i18n 切換。
- 語言切換時，區塊標題/副標、任務摘要、badge 文案必須即時切換。

---

### User Story 4 — Annotator 儀表板（優先級：P1）

`user` 被指派為標記員後，登入時看到個人作業導向儀表板。

**此優先級原因**：Annotator 的主流程是快速回到標記工作。

**獨立測試方式**：以有 `annotator` 任務關係的 `user` 登入，確認顯示 Annotator 版面。

**驗收情境**：

1. **Given** `role = user` 且有 `annotator` 任務，**When** 進入 `/dashboard`，**Then** 顯示標記概況（待標記、今日完成、平均速度）。
2. **Given** 同上，**When** 檢視任務列表，**Then** 每列包含名稱、進度摘要、badge、進度條與「快速繼續」按鈕。
3. **Given** 位於標記員任務列表且點擊某任務列的非 CTA 區域，**When** 系統導頁，**Then** 需進入該任務對應的 `annotation-list`，並帶入該任務 `task_id`、`role=annotator`、`run_type` 與 `task_type`。
4. **Given** 位於標記員任務列表且點擊某任務 `快速繼續`，**When** 系統導頁，**Then** 需進入該任務對應的 `annotation-workspace`，並帶入該任務最新未完成 sample 的 `sample_id`。

**標記員介面定義（需與原型一致）**：

- 區塊 A：`標記概況`
  - 副標：`我的標記進度與待處理任務`
  - 指標卡（3 張）：
    - `待標記`
    - `今日完成`
    - `平均速度`
- 區塊 B：`任務列表`
  - 副標：`我的進行中任務`
  - 任務列項欄位：
    - 任務名稱
    - 進度摘要（完成率 / 今日完成數 / 平均速度）
    - badge 群組（Task Type、Annotation Stage、Status）
    - 操作按鈕：`快速繼續`
    - 完成率 progress bar

**標記員區塊行為規則**：

- 在 `annotator` 視圖中，區塊 A 與區塊 B 必須同時可見。
- 每個任務列項都必須包含 `快速繼續` CTA。
- 點擊任務列中除 `快速繼續` 以外的區域時，必須帶入被點擊任務上下文（`task_id`、`role=annotator`、`run_type`、`task_type`）導向 `annotation-list`。
- 點擊 `快速繼續` 必須帶入被點擊任務上下文（`task_id`、`role=annotator`、最新未完成 sample 的 `sample_id`）導向標記作業頁。
- 語言切換時，區塊標題/副標、指標標籤、任務摘要、按鈕、badge 文案必須即時切換。

---

### User Story 5 — Reviewer 儀表板（優先級：P1）

`user` 被指派為審核員後，登入時看到審查導向儀表板。

**此優先級原因**：Reviewer 需要快速定位待審任務。

**獨立測試方式**：以有 `reviewer` 任務關係的 `user` 登入，確認顯示 Reviewer 版面。

**驗收情境**：

1. **Given** `role = user` 且有 `reviewer` 任務，**When** 進入 `/dashboard`，**Then** 顯示審核概況（待審總數、今日已審、IAA 摘要）。
2. **Given** 同上，**When** 檢視任務列表，**Then** 每列包含名稱、審查摘要、badge、進度條與「快速審核」按鈕。
3. **Given** 位於審核員任務列表且點擊某任務列的非 CTA 區域，**When** 系統導頁，**Then** 需進入該任務對應的 `annotation-list`，並帶入該任務 `task_id`、`role=reviewer`、`run_type` 與 `task_type`。
4. **Given** 位於審核員任務列表且點擊某任務 `快速審核`，**When** 系統導頁，**Then** 需進入該任務對應的 `annotation-workspace`，並帶入該任務最新未完成 sample 的 `sample_id`。

**審核員介面定義（需與原型一致）**：

- 區塊 A：`審核概況`
  - 副標：`我的審查進度與待處理項目`
  - 指標卡（3 張）：
    - `待審總數`
    - `今日已審`
    - `IAA 摘要`
- 區塊 B：`任務列表`
  - 副標：`我的待審任務`
  - 任務列項欄位：
    - 任務名稱
    - 審查摘要（待審筆數 / 進度 / IAA）
    - badge 群組（Task Type、Annotation Stage、Status）
    - 操作按鈕：`快速審核`
    - 完成率 progress bar

**審核員區塊行為規則**：

- 在 `reviewer` 視圖中，區塊 A 與區塊 B 必須同時可見。
- 每個任務列項都必須包含 `快速審核` CTA。
- 點擊任務列中除 `快速審核` 以外的區域時，必須帶入被點擊任務上下文（`task_id`、`role=reviewer`、`run_type`、`task_type`）導向 `annotation-list`。
- 點擊 `快速審核` 必須帶入被點擊任務上下文（`task_id`、`role=reviewer`、最新未完成 sample 的 `sample_id`）導向標記作業頁。
- 語言切換時，區塊標題/副標、指標標籤、任務摘要、按鈕、badge 文案必須即時切換。

---

### 邊界情況

- 角色值不存在或不在允許清單時？→ 導向 `/login`。
- `role = user` 且同時有多種任務角色時？→ 依產品規則決定優先顯示順序（本版先以單一主視圖呈現）。
- 某文字 key 在 i18n 缺漏時？→ 保留原本 DOM 文字，不中斷頁面互動。
- 行動版（`<= MOBILE_BP`）時導覽列如何呈現？→ 由側邊欄轉為底部橫向導覽。

---

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：系統必須依登入者 `system role` 與任務關係渲染對應 Dashboard。
- **FR-001A**：`/dashboard` 必須顯示頁首標題區塊，包含主標題「儀表板」與副標題「掌握任務進度與團隊協作狀態」，並置於場景模式控制區之前。
- **FR-002**：`super_admin` 必須顯示 Super Admin Dashboard。
- **FR-003**：`user` 且尚無任務關係時，必須顯示一般使用者 Dashboard。
- **FR-004**：`user` 建立任務後（具 `project_leader` 任務關係）必須顯示 Project Leader Dashboard。
- **FR-005**：`user` 被指派標記後（具 `annotator` 任務關係）必須顯示 Annotator Dashboard。
- **FR-006**：`user` 被指派審核後（具 `reviewer` 任務關係）必須顯示 Reviewer Dashboard。
- **FR-007**：一般使用者 Dashboard 必須包含首頁流程入口區塊，標題為 `開始你的第一個工作流程`，副標為 `從三個行動入口開始，快速達成第一個可交付成果`。
- **FR-007A**：首頁流程入口區塊必須包含 3 張行動卡：`建立標記專案`、`進行資料標記`、`進行品質審核`，且每張卡均包含標題、說明文字、CTA。
- **FR-007B**：三張行動卡 CTA 必須分別提供：建立任務入口、標記入口、審核入口。
- **FR-007C**：一般使用者 Dashboard 必須包含最短成功路徑區塊，標題為 `三條最短成功路徑`，副標為 `照著這三條路徑走，你可以快速完成第一次上手。`。
- **FR-007D**：最短成功路徑區塊必須包含 3 條路徑：負責人（建立任務成功）、標記員（完成第一筆標記）、審核員（完成第一筆審核）。
- **FR-007E**：每條最短成功路徑必須包含 5~8 個 onboarding steps（本版原型固定顯示 5 步）。
- **FR-007F**：一般使用者視圖的流程入口與最短成功路徑相關文案在 zh-TW / en 語言切換時必須即時同步更新。
- **FR-008**：Super Admin Dashboard 必須包含：平台使用者統計、任務概況、最近提醒、任務列表。
- **FR-008A**：Super Admin Dashboard 的「平台使用者統計」必須包含 4 張指標卡：總用戶、專案負責人、標記員、審核員。
- **FR-008B**：Super Admin Dashboard 的「任務概況」必須包含 4 張指標卡：總任務、進行中、等待 IAA 確認、速度異常。
- **FR-008C**：Super Admin Dashboard 的「最近提醒」必須以清單呈現，且每項包含提醒標題與提醒內容。
- **FR-008D**：Super Admin Dashboard 的「任務列表」必須顯示「查看全部」按鈕，且每列包含名稱、摘要、3 種 badge 與 progress bar。
- **FR-009**：Project Leader Dashboard 必須包含：任務概況、任務列表。
- **FR-009A**：Project Leader Dashboard 的「任務概況」必須包含 4 張指標卡：總任務、進行中、等待 IAA 確認、速度異常。
- **FR-009B**：Project Leader Dashboard 的「任務列表」必須顯示「查看全部」按鈕，且按鈕文字可 i18n 切換。
- **FR-009C**：Project Leader Dashboard 的「任務列表」每列必須包含任務名稱、任務摘要、3 種 badge 與 progress bar。
- **FR-010**：Annotator Dashboard 必須包含：標記概況、任務列表、快速繼續按鈕。
- **FR-010A**：Annotator Dashboard 的「標記概況」必須包含 3 張指標卡：待標記、今日完成、平均速度。
- **FR-010B**：Annotator Dashboard 的任務列表每列必須包含進度摘要、`快速繼續` 按鈕、3 種 badge 與 progress bar。
- **FR-010B1**：點擊 Annotator 任務列中除 `快速繼續` 按鈕以外的區域時，系統必須以該列任務上下文導向 `annotation-list`（至少包含 `task_id`、`role=annotator`、`run_type`、`task_type`）。
- **FR-010C**：點擊 Annotator 任務列 `快速繼續` 時，系統必須以該列任務上下文導向 `annotation-workspace`（至少包含 `task_id`、`role=annotator`、該任務最新未完成 sample 的 `sample_id`）。
- **FR-011**：Reviewer Dashboard 必須包含：審核概況、任務列表、快速審核按鈕。
- **FR-011A**：Reviewer Dashboard 的「審核概況」必須包含 3 張指標卡：待審總數、今日已審、IAA 摘要。
- **FR-011B**：Reviewer Dashboard 的任務列表每列必須包含審查摘要、`快速審核` 按鈕、3 種 badge 與 progress bar。
- **FR-011B1**：點擊 Reviewer 任務列中除 `快速審核` 按鈕以外的區域時，系統必須以該列任務上下文導向 `annotation-list`（至少包含 `task_id`、`role=reviewer`、`run_type`、`task_type`）。
- **FR-011C**：點擊 Reviewer 任務列 `快速審核` 時，系統必須以該列任務上下文導向 `annotation-workspace`（至少包含 `task_id`、`role=reviewer`、該任務最新未完成 sample 的 `sample_id`）。
- **FR-012**：所有任務列表列項都必須包含 badge（Task Type / Annotation Stage / 狀態）與 progress bar。
- **FR-013**：頁面必須支援 zh-TW / en 語言切換，且切換不需重載。
- **FR-014**：語言切換後必須同步更新文字節點與可存取屬性（如 `aria-label`、`title`）。
- **FR-014A**：Dashboard 語言狀態必須跨頁持久化；導向 `/profile` 或 account 頁面後再返回，需沿用同語系。
- **FR-015**：頁面必須顯示使用者資訊區塊（頭像、名稱、角色）與登出操作。
- **FR-016**：若角色值無效，系統必須導向 `/login`。
- **FR-017**：頁面必須具備響應式設計，支援至少 `RWD_VIEWPORTS`。
- **FR-0170**：在 `> MOBILE_BP` 時，主導覽必須維持左側側邊欄呈現（品牌、主導覽、語言切換、使用者資訊與登出）。
- **FR-0170A**：在 `> MOBILE_BP` 時，語言切換按鈕必須顯示於品牌列（Logo + Label Suite）右側，並以單一語言代碼（`ZH` 或 `EN`）呈現。
- **FR-017A**：在 `<= MOBILE_BP` 時，導覽必須由側邊欄轉為固定於頁面底部的橫向導覽（4 個主項目等寬呈現，避免文字垂直斷行）。
- **FR-017B**：在 `<= MOBILE_BP` 時，內容區需預留底部導覽高度，避免任一面板或按鈕被底部導覽遮擋。
- **FR-017C**：在 `<= MOBILE_BP` 時，頁面頂部必須保留品牌列（Logo + Label Suite 字樣），不得因底部導覽而移除。
- **FR-017D**：在 `<= MOBILE_BP` 時，登出按鈕必須顯示於頂部品牌列最右側，且需支援 i18n 的 `aria-label` 與 `title`。
- **FR-017E**：在 `<= MOBILE_BP` 時，頂部品牌列必須顯示當前人員名稱與 i18n 語言切換按鈕（例如 `ZH` 或 `EN`）；語言切換按鈕需可即時切換語系。
- **FR-017F**：在 `<= MOBILE_BP` 時，系統管理員任務列表單列需改為垂直堆疊（任務摘要在上、badge 群組在下），避免文字被水平擠壓造成異常換行。

### User Flow & Navigation

```mermaid
flowchart LR
    login["/login"]
    dashboard["/dashboard"]
    user["一般使用者 Dashboard"]
    sa["Super Admin Dashboard"]
    pl["Project Leader Dashboard"]
    an["Annotator Dashboard"]
    rv["Reviewer Dashboard"]
    logout["../account/login.html"]

    login -->|登入成功| dashboard
    dashboard -->|role=super_admin| sa
    dashboard -->|role=user 且無任務關係| user
    dashboard -->|role=user 且建立任務| pl
    dashboard -->|role=user 且被指派標記| an
    dashboard -->|role=user 且被指派審核| rv
    user -->|登出| logout
    sa -->|登出| logout
    pl -->|登出| logout
    an -->|登出| logout
    rv -->|登出| logout
```

| From | Trigger | To |
|------|---------|-----|
| `/dashboard` | `role=super_admin` | Super Admin Dashboard |
| `/dashboard` | `role=user` 且無任務關係 | 一般使用者 Dashboard |
| `/dashboard` | `role=user` 且有 `project_leader` 任務關係 | Project Leader Dashboard |
| `/dashboard` | `role=user` 且有 `annotator` 任務關係 | Annotator Dashboard |
| `/dashboard` | `role=user` 且有 `reviewer` 任務關係 | Reviewer Dashboard |
| 任一 Dashboard | 點擊登出 | `../account/login.html`（原型） |

**Entry points**：`/dashboard`（登入後）。
**Exit points**：登出導向 `../account/login.html`。

### 關鍵實體

- **SystemRole**：系統角色。允許值：`user`、`super_admin`。
- **TaskRole**：任務角色。允許值：`project_leader`、`annotator`、`reviewer`。
- **MembershipSummary**：儀表板判斷摘要，包含：建立任務數、被指派標記數、被指派審核數。
- **LanguageState**：當前語言狀態。關鍵欄位：`lang`（`zh` / `en`）、`storage_key = labelsuite.lang`。
- **DashboardViewModel（原型）**：畫面展示資料，包含 metrics、task list、badge、progress、action label。

---

## 規格相依性 *(本功能依賴其他規格，或被其他規格依賴時填寫)*

### 上游（本規格依賴的規格）

| 規格編號 | 功能 | 本規格需要的內容 |
|---------|------|----------------|
| 001 | Login — Email / Password | 已登入狀態與 `system role` |
| 008 | Shared Sidebar Navbar | 全站語言持久化契約（跨頁維持同語系） |

### 下游（依賴本規格的規格）

| 規格編號 | 功能 | 依賴本規格的內容 |
|---------|------|----------------|
| 013 | New Task | 「建立第一個任務」入口語意與建立後角色轉換 |
| 015 | Annotation Workspace | Annotator / Reviewer 快速操作入口語意 |

---

## 成功標準 *(必填)*

- **SC-001**：`super_admin` 與 `user` 可正確進入對應 Dashboard 類型。
- **SC-002**：`user` 的四種狀態（無任務 / PL / Annotator / Reviewer）皆符合各自區塊定義。
- **SC-003**：一般使用者 Dashboard 顯示「開始你的第一個工作流程」區塊標題與副標，且文案符合規格。
- **SC-004**：一般使用者 Dashboard 完整顯示 3 張行動入口卡（建立標記專案 / 進行資料標記 / 進行品質審核），且每張卡均有對應 CTA。
- **SC-004A**：一般使用者 Dashboard 完整顯示 3 條最短成功路徑，且每條路徑顯示 5 個 onboarding steps，內容符合本規格定義。
- **SC-005**：Super Admin Dashboard 完整顯示 4 個主要區塊（平台使用者統計、任務概況、最近提醒、任務列表）且欄位符合規格。
- **SC-006**：語言切換可於 1 秒內完成主要文案與 aria/title 更新（不重新整理頁面）。
- **SC-006A**：切換語言後導向 `/profile` 或 account 頁面再返回 `/dashboard`，語系需維持一致。
- **SC-007**：在 `RWD_VIEWPORTS` 視窗寬度下均無版型破版。
- **SC-008**：Project Leader Dashboard 完整顯示任務概況與任務列表，且「查看全部」按鈕、指標與列項欄位符合規格。
- **SC-009**：Annotator Dashboard 完整顯示標記概況與任務列表，且每列皆有「快速繼續」按鈕。
- **SC-010**：Reviewer Dashboard 完整顯示審核概況與任務列表，且每列皆有「快速審核」按鈕。
- **SC-011**：Prototype 頁面（`design/prototype/pages/*.html`）不得引用失效影像資源；檢查結果應無 `<img>` / `background-image` 失效來源。
- **SC-012**：在手機版（`<= MOBILE_BP`）檢視 Super Admin 任務列表時，任務名稱與摘要可正常閱讀，badge 區塊不擠壓文字且無破版。
- **SC-013**：在桌面版（`> MOBILE_BP`）檢視時，主導覽維持左側側邊欄，且不出現底部導覽覆蓋內容的情況。
- **SC-014**：Dashboard 頁首區塊固定顯示於所有角色視圖上方，並正確顯示主標「儀表板」與副標「掌握任務進度與團隊協作狀態」。
- **SC-015**：Annotator/Reviewer 視圖點擊任務列 `快速繼續/快速審核` 後，必須導向對應任務的 `annotation-workspace`，且帶入正確 `task_id`、`role`、`sample_id` query（`sample_id` 為該任務最新未完成 sample）。
- **SC-016**：Annotator/Reviewer 視圖點擊任務列非 `快速繼續/快速審核` 區域後，必須導向對應任務的 `annotation-list`，且帶入正確 `task_id`、`role`、`run_type`、`task_type` query。

---

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.3.21 | 2026-04-23 | 同步任務列雙路徑契約：Annotator/Reviewer 點擊卡片非 CTA 區域導向 `annotation-list`，僅 `快速繼續/快速審核` 直達 `annotation-workspace`（更新 User Story、FR-010B1/FR-011B1、SC-016） |
| 1.3.20 | 2026-04-23 | 同步快速入口導頁契約：`快速繼續/快速審核` 必須帶入最新未完成 sample 的 `sample_id` 直達 `annotation-workspace`（更新 User Story、FR-010C/FR-011C、SC-015） |
| 1.3.19 | 2026-04-23 | 移除一般使用者首頁「開始第一筆標記/審核」導頁規範；改以 Annotator/Reviewer 任務列表 `快速繼續/快速審核` 導向對應任務工作區 |
| 1.3.18 | 2026-04-23 | 同步原型：一般使用者 workflow CTA 已綁定 annotation workspace，新增 `role=annotator/reviewer` 導頁契約與驗收 |
| 1.3.17 | 2026-04-22 | 介面詞彙統一：Dashboard 任務列表相關規格統一使用 `Annotation Stage` |
| 1.3.16 | 2026-04-18 | 調整一般使用者「三條最短成功路徑」副標文案為更易讀的使用者語句，並同步更新 FR 條文 |
| 1.3.15 | 2026-04-18 | 一般使用者首頁改版為「行動入口 + 三條最短成功路徑」：移除角色導向引導卡，新增三張任務入口卡與三條 5 步 onboarding 路徑，並更新 FR/SC 對齊原型 |
| 1.3.14 | 2026-04-16 | 新增跨頁語言持久化規範：Dashboard 切換語言後導向 profile/account 再返回需維持同語系 |
| 1.3.13 | 2026-04-16 | 同步 dashboard M3：新增頁首標題區塊規範（主標「儀表板」/副標「掌握任務進度與團隊協作狀態」），補充對應 FR 與成功標準 |
| 1.3.12 | 2026-04-15 | 語言切換顯示格式改為單一代碼（`ZH`/`EN`），並補充桌面版位置規範：按鈕位於品牌列右側 |
| 1.3.11 | 2026-04-15 | 抽出響應式規格常數（`MOBILE_BP`、`RWD_VIEWPORTS`），統一取代重複的 768px 條文 |
| 1.3.10 | 2026-04-15 | 補充桌面版導覽規範：`>768px` 維持左側側邊欄，並新增對應成功標準 |
| 1.3.9 | 2026-04-15 | 修正系統管理員手機版任務卡排版規範：任務摘要與 badge 改為垂直堆疊，避免文字擠壓 |
| 1.3.8 | 2026-04-15 | 手機版頂部 Logo 列新增人員名稱與 i18n 語言切換按鈕，並同步補充 RWD 規格條文 |
| 1.3.7 | 2026-04-15 | 手機版登出按鈕移至頂部 Logo 列右側，並補齊 i18n 屬性規範 |
| 1.3.6 | 2026-04-15 | 手機版導覽規格改為底部橫向導覽，並保留頂部品牌列；補強 RWD 遮擋規範與 prototype 破圖檢查標準 |
| 1.3.5 | 2026-04-15 | 專案負責人任務列表新增「查看全部」按鈕，並同步更新介面定義、FR、SC |
| 1.3.4 | 2026-04-15 | 一般使用者指標卡順序調整：將「目前角色」移至最左，並同步更新驗收與 FR 條文 |
| 1.3.3 | 2026-04-15 | 補強剩餘角色頁面規格：Project Leader / Annotator / Reviewer 的介面定義、行為規則、FR 與 SC 細化 |
| 1.3.2 | 2026-04-15 | 補強系統管理員介面規格：區塊/指標/任務列表欄位、區塊行為規則、FR 與 SC 細化 |
| 1.3.1 | 2026-04-15 | 補強一般使用者引導區塊規格：標題/副標、三張引導卡文案、顯示與 i18n 行為規則、驗收標準 |
| 1.3.0 | 2026-04-15 | 同步原型：新增一般使用者情境與「我被指派的審核」，並更新角色分流模型（system role + task role） |
| 1.2.0 | 2026-04-15 | 移除角色場景切換需求，改為登入角色分流；補強四角色畫面定義細節 |
| 1.1.0 | 2026-04-15 | 調整為與 001 spec 相近寫法，保留精簡範圍並對齊最新 dashboard 原型 |
| 1.0.0 | 2026-04-15 | Dashboard 精簡版初稿 |

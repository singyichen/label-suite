# 功能規格：Dashboard — 儀表板

**功能分支**：`012-dashboard`
**建立日期**：2026-04-05
**最後更新**：2026-04-14
**狀態**：Draft
**需求來源**：[`docs/product/README.md`](../../../docs/product/README.md) 定義的產品文件基線：Product Baseline Summary · Story Map · Information Architecture · Functional Map

---

## Scope Alignment

### R1 必做範圍

依產品基線，`012 Dashboard` 屬於 **R1 — Demo Core**，核心責任是：

- 依 `system role` 正確 dispatch 至對應 dashboard
- 顯示各角色的任務清單 / 進度 / 待處理事項摘要
- 與 `001 Login`、`013 New Task`、`015 Annotation Workspace` 串成最小可展示流程

### R2 / R3 延伸整合

下列導頁與資料整合屬於後續 release 延伸，不得作為 `012` 在 R1 驗收的阻塞條件：

- `009 Work Log`
- `014 Task Detail`
- `016 Dataset Stats`
- `017 Dataset Quality`
- `006 User Management`
- `005 Profile Settings`

本 spec 會保留這些延伸整合的欄位與畫面註記，但須明確標示為 `Post-R1`。

---

## Process Flow

```mermaid
sequenceDiagram
    actor 使用者
    participant 瀏覽器
    participant authStore
    participant 後端API as 後端 API

    使用者->>瀏覽器: 導向 /dashboard
    瀏覽器->>authStore: 讀取 role（JWT）

    alt role 未知 / 無效
        authStore-->>瀏覽器: 清除 JWT session 並導向 /login（invalid session）
    else role = super_admin
        authStore-->>瀏覽器: 渲染 SuperAdminDashboard
        瀏覽器->>後端API: GET /admin/stats（Dashboard payload：角色統計、任務摘要、待處理項、全平台進度摘要）
        後端API-->>瀏覽器: 平台儀表板聚合資料
    else role = user
        authStore-->>瀏覽器: 渲染 UserDashboard
        瀏覽器->>後端API: GET /users/me/tasks（task_membership 清單）
        後端API-->>瀏覽器: task_membership 清單
        瀏覽器->>後端API: GET /dashboard/user-summary（依角色彙整的 Dashboard 摘要）
        後端API-->>瀏覽器: 使用者儀表板聚合資料
        瀏覽器->>瀏覽器: 依任務角色動態渲染內容區塊
    end
```

| 步驟 | 角色 | 動作 | 系統回應 |
|------|------|------|---------|
| 1 | 使用者 | 導向 `/dashboard` | 前端從 `authStore` 讀取 System Role（`role`）|
| 2a | RoleGuard | `role` 未知 / 無效 | 清除 JWT session 並導向 `/login`（invalid session，防止無窮重導）|
| 2b | 前端 | `role = super_admin` | 渲染 `SuperAdminDashboard`，呼叫 `/admin/stats` 取得平台儀表板聚合資料 |
| 2c | 前端 | `role = user` | 渲染 `UserDashboard`，先呼叫 `/users/me/tasks` 取得 `task_membership`，再呼叫 `/dashboard/user-summary` 取得各角色區塊摘要 |
| 3 | 前端 | 收到 `task_membership` 與儀表板聚合資料 | 依各任務的 `task_role` 動態渲染對應內容區塊（Project Leader / Reviewer / Annotator）|
| 4 | 使用者 | 點擊卡片 / 快捷連結 | 導向對應模組頁面 |

---

## 使用者情境與測試 *(必填)*

### User Story 1 — Super Admin 檢視平台總覽（優先級：P1）

Super Admin 登入後看到平台總覽儀表板：平台使用者各角色帳號數量、所有任務列表（名稱、類型、狀態、完成率）、全平台標記進度摘要，以及需關注的任務待處理項。若平台剛部署尚無資料，顯示空狀態說明；若 `user-management` 已在後續 release 上線，則顯示「管理使用者」快捷按鈕。

**此優先級原因**：Super Admin Dashboard 是首次部署後管理員唯一的操作入口，必須在任何其他功能開放前提供基本的平台狀態可見性。

**獨立測試方式**：以 `super_admin` 帳號登入，驗證系統渲染 `SuperAdminDashboard`，確認平台使用者統計數字與任務列表正確顯示；新部署環境下確認空狀態與「管理使用者」按鈕。

**驗收情境**：

1. **Given** `role = super_admin` 的已登入使用者，**When** 導向 `/dashboard`，**Then** 系統渲染 `SuperAdminDashboard`，顯示平台使用者快覽（各角色帳號數）。
2. **Given** 平台已有任務資料的 Super Admin，**When** 檢視儀表板，**Then** 顯示所有任務列表，每筆含任務名稱、任務類型、當前狀態、整體完成率進度條，以及全平台標記進度摘要。
3. **Given** 剛部署的 Super Admin（無任務與使用者資料），**When** 導向 `/dashboard`，**Then** 顯示空狀態說明文字「平台尚未有任何資料」；若 `user-management` 可用，則加顯示「管理使用者」次要按鈕（Post-R1）。

---

### User Story 2 — User 無任務空狀態引導（優先級：P1）

擁有 `user` 系統角色但目前尚無任何任務成員資格的使用者，登入後看到空狀態說明與引導連結。因平台成員可自行建立任務，空狀態需提供「建立第一個任務」主要入口；若後續 release 的個人頁 / 工時頁可用，可再提供次要操作入口。

**此優先級原因**：空狀態是首次使用者或尚未被指派任務時的常見情境，提供明確引導可降低使用者困惑，但不影響核心標記流程。

**獨立測試方式**：以無任何任務成員資格的 `user` 帳號登入，確認儀表板顯示空狀態訊息（不顯示空白任務列表），且「建立第一個任務」可正確導向 `/task-new`。

**驗收情境**：

1. **Given** 尚無任何任務成員資格的 `user` 使用者，**When** 導向 `/dashboard`，**Then** 顯示空狀態說明文字「目前尚無任務，建立第一個任務或等待被邀請加入任務」，不顯示空白任務列表。
2. **Given** 空狀態的 `user` 使用者，**When** 點擊「建立第一個任務」，**Then** 導向 `/task-new`。
3. **Given** 空狀態的 `user` 使用者，**When** 系統已啟用 Post-R1 導頁擴充，**Then** 可額外顯示「查看個人工時紀錄」與「編輯個人資料」次要按鈕。

---

### User Story 3 — User 以 project_leader 角色檢視任務進度（優先級：P2）

擁有 `user` 系統角色且在至少一項任務中持有 `project_leader` 任務角色的使用者，登入後可在儀表板看到其負責任務的總覽卡、待處理事項提醒（IAA 待確認 / Dry Run 全員完成），以及標記員進度區。

**此優先級原因**：Project Leader 是任務生命週期的核心管理者，儀表板必須提供即時的任務狀態與待處理提醒，但因需要任務資料存在才能驗證，優先級次於基本登入流程。

**獨立測試方式**：以持有 project_leader task_role 的 `user` 帳號登入，確認 UserDashboard 正確渲染任務總覽卡、待處理事項區與標記員進度區；若 Post-R1 品質頁已啟用，再驗證 IAA 待確認連結可導向 `/dataset-quality/:taskId`。

**驗收情境**：

1. **Given** 在任務 A 持有 `project_leader` 任務角色的使用者，**When** 導向 `/dashboard`，**Then** 顯示任務 A 的任務總覽卡（名稱、類型、狀態、整體完成率進度條）。
2. **Given** 任務 A 的 Dry Run 已全員完成的 project_leader，**When** 檢視儀表板，**Then** 待處理事項區顯示「Dry Run 已全員完成，請啟動 Official Run」提醒。
3. **Given** 任務 A 有 IAA 結果待確認的 project_leader，**When** 檢視儀表板，**Then** 待處理事項區顯示 IAA 待確認提醒；若 `dataset-quality` 已在 Post-R1 上線，則提供快速連結至 `/dataset-quality/:taskId`。

---

### User Story 4 — User 以 annotator 角色檢視已指派任務（優先級：P2）

擁有 `user` 系統角色且已被指派至少一項任務的使用者，登入後可在儀表板看到我的任務清單（分 Dry Run / Official Run 兩區）、個人進度摘要，以及「快速繼續」按鈕直接跳回上次未完成的任務。

**此優先級原因**：標記者每次登入的核心目標是繼續標記任務，儀表板必須在第一時間提供正確的任務狀態與進入點。

**獨立測試方式**：以有任務指派的 `user` 帳號登入，確認任務清單、完成進度數字與「快速繼續」按鈕正確顯示；點擊「快速繼續」確認導向 `/annotation-workspace/:taskId`。

**驗收情境**：

1. **Given** 已被指派任務的 `user` 使用者，**When** 導向 `/dashboard`，**Then** 顯示「我的任務列表」，分 Dry Run 與 Official Run 兩區，每筆顯示任務名稱、已完成數 / 總分配數、狀態（未開始 / 進行中 / 已提交）。
2. **Given** 已被指派任務的 `user` 使用者，**When** 檢視儀表板，**Then** 顯示個人進度摘要：跨任務今日完成總數、跨任務累計完成總數，以及各任務尚餘筆數。
3. **Given** 上次有未完成任務的 `user` 使用者，**When** 點擊「快速繼續」按鈕，**Then** 直接導向對應任務的 `/annotation-workspace/:taskId`。

---

### User Story 5 — User 以 reviewer 角色檢視待審查任務（優先級：P2）

擁有 `user` 系統角色且在至少一項任務中持有 `reviewer` 任務角色的使用者，登入後可在儀表板看到待審查任務列表、Dry Run IAA 摘要，以及快速進入審查按鈕；若目前無待審查任務則顯示空狀態與次要連結。

**此優先級原因**：Reviewer 的核心工作入口是 annotation-workspace 審查模式，儀表板提供任務導覽但不是唯一入口，故優先級次於 Annotator 的標記流程。

**獨立測試方式**：以持有 reviewer task_role 的 `user` 帳號登入，確認 UserDashboard 正確渲染待審查任務列表與 IAA 摘要；若 reviewer flow 已啟用，確認點擊任務卡可導向 `/annotation-workspace/:taskId` 審查模式；確認無任務時顯示空狀態。

**驗收情境**：

1. **Given** 在任務 A 持有 `reviewer` 任務角色的使用者，**When** 導向 `/dashboard`，**Then** 顯示任務 A 的待審查任務列表（任務名稱、待審核筆數、已審核 / 總筆數）。
2. **Given** 上述 reviewer，**When** reviewer flow 已在後續 release 啟用且點選任務 A 的任務卡，**Then** 直接進入 `/annotation-workspace/:taskId` 審查模式（任務 A）。
3. **Given** 任務 A Dry Run 進行中的 reviewer，**When** 檢視儀表板，**Then** Dry Run IAA 摘要顯示當前 IAA 分數與達標 / 未達標狀態。
4. **Given** 目前無待審查任務但仍具至少一個 reviewer 任務成員資格的 reviewer，**When** 導向 `/dashboard`，**Then** 顯示空狀態說明文字；若 `dataset-stats` 已在 Post-R1 上線，則顯示「查看最近任務統計報告」次要按鈕。

---

### 邊界情況

- `role` 為 JWT 中未定義的未知值時？→ 清除 JWT session 並導向 `/login`（invalid session）。
- `user` 使用者在不同任務中同時擔任 `project_leader` 與 `annotator` 任務角色時？→ `UserDashboard` 依各任務的 `task_role` 動態渲染各自的內容區塊，不合併顯示。多個任務角色區塊並存時，依優先順序垂直堆疊：`project_leader` Block 最上方，其次 `reviewer` Block，最後 `annotator` Block。
- `user` 使用者沒有任何任務成員資格，但仍有建立任務權限時？→ 顯示「建立第一個任務」主要 CTA，不得只顯示等待他人邀請。
- `/admin/stats`、`/users/me/tasks` 或 `/dashboard/user-summary` API 回應延遲或失敗時？→ 顯示 loading skeleton；若最終失敗則顯示錯誤提示，不渲染空的任務列表或空白統計卡。
- `user` 使用者曾有任務但所有任務均已完成時？→ 顯示任務列表（狀態「已提交 / 已完成」），不觸發空狀態。
- `reviewer` 使用者目前無待審查任務，但仍有歷史 reviewer 任務時？→ 顯示 Reviewer 空狀態；若 `dataset-stats` 已可用，則將「查看最近任務統計報告」導向最近有 reviewer activity 的任務 `/dataset-stats/:taskId`；若完全沒有任何 reviewer 任務，則不渲染 Reviewer Block。

---

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：`DashboardPage` 必須以 `role ===` 明確比對進行 role dispatch：`super_admin` → `SuperAdminDashboard`；`user` → `UserDashboard`；未知 / 無效值 → 清除 JWT session 並導向 `/login`。
- **FR-002**：只有 `role = super_admin` 的使用者 MUST 能看到 `SuperAdminDashboard`（平台使用者快覽、平台任務摘要、全平台進度摘要）— 由 RoleGuard 強制執行。
- **FR-003**：只有 `role = user` 的使用者 MUST 能看到 `UserDashboard` — 由 RoleGuard 強制執行。
- **FR-004**：`SuperAdminDashboard` 必須顯示平台使用者各角色帳號數量。
- **FR-005**：`SuperAdminDashboard` 必須顯示所有任務列表，每筆顯示：任務名稱、任務類型、當前狀態、整體完成率進度條，以及任務層級待處理項（例如 IAA 待確認）。
- **FR-006**：`UserDashboard` 必須先呼叫 `/users/me/tasks` 取得 `task_membership` 清單，再呼叫 `/dashboard/user-summary` 取得各角色區塊摘要與快速連結所需 `taskId`，並依各任務的 `task_role` 動態渲染對應內容區塊。
- **FR-007**：`UserDashboard` 中 `task_role = annotator` 的任務區塊必須顯示：我的任務列表（Dry Run / Official Run 分區，含任務名稱、已完成數 / 總分配數、assignment 狀態）、個人進度摘要（跨任務今日完成總數、跨任務累計完成總數、各任務剩餘筆數）、「快速繼續」按鈕（→ `/annotation-workspace/:taskId`）。
- **FR-008**：`UserDashboard` 無任務時（`role = user` 且尚無任何 `task_membership`）必須顯示空狀態訊息與「建立第一個任務」主要按鈕（→ `/task-new`）。
- **FR-009**：`SuperAdminDashboard` 無任何任務與使用者資料時必須顯示空狀態說明；若 `user-management` 已在 Post-R1 啟用，則可加上「管理使用者」次要按鈕（→ `/user-management`）。
- **FR-010**：儀表板所有 API 呼叫在回應期間必須顯示 loading skeleton；呼叫失敗時顯示錯誤提示，不渲染空內容。
- **FR-011**：儀表板頁面必須支援響應式設計（375px、768px、1440px）。
- **FR-012**：儀表板頁面必須支援 zh-TW / en 語言切換，與應用程式其他頁面一致。
- **FR-013**：`UserDashboard` 中 `task_role = project_leader` 的任務區塊必須顯示：任務總覽卡（任務名稱、任務類型、當前狀態、整體完成率進度條）、待處理事項區（IAA 結果待確認、Dry Run 已全員完成待啟動 Official Run）、標記員進度區（各標記員本任務完成數 / 今日完成數 / 平均速度，速度異常者依 `task.config.dashboard.velocity_alert_threshold` 規則標示警示），以及 IA 定義的系統公告區。
- **FR-014**：`UserDashboard` 中 `task_role = reviewer` 的任務區塊必須顯示：待審查任務列表、Dry Run IAA 摘要、快速進入審查入口；若 reviewer flow 已在後續 release 啟用，任務卡與快速入口才導向 `/annotation-workspace/:taskId` 審查模式。
- **FR-015**：`SuperAdminDashboard` 必須提供全平台標記進度摘要，以符合 IA / Functional Map 定義的「全局任務 + 標記員進度」視角。
- **FR-016**：所有導向 `009`、`014`、`016`、`017`、`006`、`005` 的快捷連結必須視為 `Post-R1` 整合；在目標頁面尚未上線時，不得成為 `012` 的阻塞驗收條件。

### API Contracts

- **API-001**：`GET /admin/stats` 必須回傳 Super Admin Dashboard 所需的完整聚合 payload，至少包含：`role_counts`（各 system role 帳號數）、`task_summaries[]`（`task_id`、`task_name`、`task_type`、`task_status`、`completion_rate`）、`platform_progress_summary`（全平台標記進度摘要）、`pending_actions[]`（如 `waiting_iaa` 任務提醒所需欄位）。
- **API-002**：`GET /users/me/tasks` 僅回傳使用者的 `task_memberships[]`（至少含 `task_id`、`task_role`），不得承載 Dashboard 專用聚合摘要。
- **API-003**：`GET /dashboard/user-summary` 必須回傳 User Dashboard 所需的聚合 payload，至少包含：`project_leader_blocks[]`、`reviewer_blocks[]`、`annotator_blocks[]`，以及所有快捷操作所需的 `task_id`、`run_type`、`review_mode` 等導頁資訊；其中 Post-R1 導頁資訊應可為 `null` 或 `disabled` 狀態。
- **API-004**：`GET /dashboard/user-summary` 回傳中的 Dashboard 聚合資料屬於唯讀摘要，不得回傳任何 annotator 不應看見的 test-set ground-truth answers，且 reviewer/PL 僅能收到其角色有權限存取的任務摘要。
- **API-005**：`GET /dashboard/user-summary` 中 reviewer 空狀態使用的 `recent_reviewer_task_id`，必須定義為「最近有 reviewer activity 的任務」；排序依 reviewer 最近一次審查活動時間遞減；若 `dataset-stats` 尚未上線，該欄位可回傳但前端不強制顯示導頁。
- **API-006**：`GET /dashboard/user-summary` 中 annotator 摘要必須同時提供跨任務統計（如 `today_completed_total`、`completed_total`）與任務別統計（如各 `task_id` 的 `remaining_count`）。

### User Flow & Navigation

> 每個 User Story 對應獨立的 flow 圖與畫面狀態清單，以利後續 wireframe 繪製時逐一對應每個畫面狀態。所有 flow 均以「`/login` 登入成功」為共同起點。

#### 系統角色 Dispatch（全域）

```mermaid
flowchart LR
    A(["/login 登入成功"]) --> B["/dashboard\nRoleGuard 讀取 role"]
    B -->|"role = super_admin"| C["SuperAdminDashboard"]
    B -->|"role = user"| D["UserDashboard\nGET /users/me/tasks\nGET /dashboard/user-summary"]
    B -->|"role 未知 / 無效"| E(["/login\n清除 JWT session"])
    D -->|"有 task_membership"| F["依 task_role 動態渲染各 Block"]
    D -->|"task_membership 為空"| G["空狀態"]
```

---

#### US1 — Super Admin 檢視平台總覽

```mermaid
flowchart TD
    A(["/login 登入成功"]) --> B["/dashboard — role = super_admin"]
    B --> C["SuperAdminDashboard — Skeleton\nGET /admin/stats 載入中"]
    C -->|"API 成功 + 有資料"| D["SuperAdminDashboard — 有資料\n平台使用者快覽\n全任務列表（名稱/類型/狀態/完成率）\n任務待處理項"]
    C -->|"API 成功 + 無任務與使用者"| E["SuperAdminDashboard — 空狀態\n『平台尚未有任何資料』\n[管理使用者] 次要按鈕（Post-R1）"]
    C -->|"API 失敗"| F["SuperAdminDashboard — 錯誤狀態\n錯誤提示，不渲染空卡片"]
    D -->|"點擊任務卡（Post-R1）"| H(["/task-detail/:taskId"])
    D -->|"點擊 IAA 待確認連結（Post-R1）"| I(["/dataset-quality/:taskId"])
    D -->|"點擊『前往使用者管理』（Post-R1）"| G(["/user-management"])
    E -->|"點擊『管理使用者』（Post-R1）"| G
```

**畫面狀態清單（wireframe 對應）：**

| 畫面狀態 | 需繪製 | 說明 |
|---------|:------:|------|
| `SuperAdminDashboard — Skeleton` | ✅ | 全頁骨架，卡片區顯示灰色佔位 |
| `SuperAdminDashboard — 有資料` | ✅ | 平台使用者快覽 + 全任務列表（名稱/類型/狀態/完成率）+ 全平台標記進度摘要 |
| `SuperAdminDashboard — 空狀態` | ✅ | 空狀態說明文字；若 Post-R1 已啟用 `user-management`，則顯示「管理使用者」次要按鈕 |
| `SuperAdminDashboard — 錯誤` | ✅ | 錯誤提示區塊，不渲染空白卡片 |

**Navigation 表：**

| From | Trigger | To |
|------|---------|-----|
| `SuperAdminDashboard — 有資料` | 「前往使用者管理」快捷連結（Post-R1） | `/user-management` |
| `SuperAdminDashboard — 有資料` | 點擊任務卡（Post-R1） | `/task-detail/:taskId`（對應任務）|
| `SuperAdminDashboard — 有資料` | IAA 待確認快速連結（Post-R1） | `/dataset-quality/:taskId`（對應任務）|
| `SuperAdminDashboard — 空狀態` | 「管理使用者」次要按鈕（Post-R1） | `/user-management` |

---

#### US2 — User 無任務空狀態引導

```mermaid
flowchart TD
    A(["/login 登入成功"]) --> B["/dashboard — role = user"]
    B --> C["UserDashboard — Skeleton\nGET /users/me/tasks + /dashboard/user-summary 載入中"]
    C -->|"回傳空 task_membership 清單"| D["UserDashboard — 空狀態\n『目前尚無任務，建立第一個任務或等待被邀請加入任務』\n[建立第一個任務]\n[查看個人工時紀錄 / 編輯個人資料（Post-R1）]"]
    C -->|"API 失敗"| G["UserDashboard — 錯誤狀態\n錯誤提示，不渲染空卡片"]
    D -->|"點擊『建立第一個任務』"| E(["/task-new"])
    D -->|"點擊『查看個人工時紀錄』（Post-R1）"| F(["/work-log"])
    D -->|"點擊『編輯個人資料』（Post-R1）"| G(["/profile"])
```

**畫面狀態清單（wireframe 對應）：**

| 畫面狀態 | 需繪製 | 說明 |
|---------|:------:|------|
| `UserDashboard — Skeleton` | ✅（共用）| 全頁骨架 |
| `UserDashboard — 空狀態` | ✅ | 空狀態插圖 + 說明文字 + 「建立第一個任務」主要按鈕；工時 / 個人資料為 Post-R1 次要按鈕 |

**Navigation 表：**

| From | Trigger | To |
|------|---------|-----|
| `UserDashboard — 空狀態` | 「建立第一個任務」主要按鈕 | `/task-new` |
| `UserDashboard — 空狀態` | 「查看個人工時紀錄」次要按鈕（Post-R1） | `/work-log` |
| `UserDashboard — 空狀態` | 「編輯個人資料」次要按鈕（Post-R1） | `/profile` |

---

#### US3 — User 以 project_leader 角色檢視任務進度

```mermaid
flowchart TD
    A(["/login 登入成功"]) --> B["/dashboard — role = user"]
    B --> C["UserDashboard — Skeleton\nGET /users/me/tasks + /dashboard/user-summary 載入中"]
    C -->|"回傳含 task_role=project_leader 的任務"| D["UserDashboard — PL Block\n任務總覽卡（名稱/類型/狀態/完成率）\n待處理事項區（IAA 待確認 badge / Dry Run 全員完成提醒）\n標記員進度區（完成數/今日數/速度/異常警示）"]
    D -->|"點擊 IAA 待確認快速連結（Post-R1）"| F(["/dataset-quality/:taskId（對應任務）"])
    D -->|"點擊任務卡（Post-R1）"| G(["/task-detail/:taskId（對應任務）"])
    D -->|"點擊待處理事項：啟動 Official Run（Post-R1）"| G
```

**畫面狀態清單（wireframe 對應）：**

| 畫面狀態 | 需繪製 | 說明 |
|---------|:------:|------|
| `UserDashboard — Skeleton` | ✅（共用）| 全頁骨架 |
| `UserDashboard — PL Block（有任務）` | ✅ | 任務總覽卡 + 待處理事項區（含 badge）+ 標記員進度區 + 系統公告區 |

**Navigation 表：**

| From | Trigger | To |
|------|---------|-----|
| `UserDashboard — PL Block` | 點擊任務卡（Post-R1） | `/task-detail/:taskId`（對應任務）|
| `UserDashboard — PL Block` | IAA 待確認快速連結（Post-R1） | `/dataset-quality/:taskId`（對應任務）|
| `UserDashboard — PL Block` | 待處理事項：啟動 Official Run（Post-R1） | `/task-detail/:taskId`（對應任務，Official Run tab）|

---

#### US4 — User 以 annotator 角色檢視已指派任務

```mermaid
flowchart TD
    A(["/login 登入成功"]) --> B["/dashboard — role = user"]
    B --> C["UserDashboard — Skeleton\nGET /users/me/tasks + /dashboard/user-summary 載入中"]
    C -->|"回傳含 task_role=annotator 的任務"| D["UserDashboard — Annotator Block\n我的任務列表（Dry Run / Official Run 分區）\n個人進度摘要（今日/累計/剩餘）\n[快速繼續] 按鈕"]
    D -->|"點擊『快速繼續』"| E(["/annotation-workspace/:taskId\n（上次未完成任務，含 task_id + run_type）"])
    D -->|"點擊任務卡"| F(["/annotation-workspace/:taskId\n（對應任務）"])
```

**畫面狀態清單（wireframe 對應）：**

| 畫面狀態 | 需繪製 | 說明 |
|---------|:------:|------|
| `UserDashboard — Skeleton` | ✅（共用，US2～US5 同一張）| 全頁骨架 |
| `UserDashboard — Annotator Block` | ✅ | 任務列表（Dry Run + Official Run）+ 進度摘要 + 快速繼續按鈕 |

**Navigation 表：**

| From | Trigger | To |
|------|---------|-----|
| `UserDashboard — Annotator Block` | 「快速繼續」按鈕 | `/annotation-workspace/:taskId`（上次未完成任務，帶 `task_id` + `run_type`）|
| `UserDashboard — Annotator Block` | 點擊任務卡 | `/annotation-workspace/:taskId`（對應任務）|

---

#### US5 — User 以 reviewer 角色檢視待審查任務

```mermaid
flowchart TD
    A(["/login 登入成功"]) --> B["/dashboard — role = user"]
    B --> C["UserDashboard — Skeleton\nGET /users/me/tasks + /dashboard/user-summary 載入中"]
    C -->|"回傳含 task_role=reviewer 且有待審查任務"| D["UserDashboard — Reviewer Block\n待審查任務列表（任務名稱/待審核數/已審核數）\nDry Run IAA 摘要（分數 + 達標/未達標）\n[快速進入審查] 按鈕"]
    C -->|"回傳 reviewer 但無待審查任務"| E["UserDashboard — Reviewer 空狀態\n說明文字\n[查看統計報告] 次要按鈕（Post-R1）"]
    D -->|"點擊任務卡（Post-R1 reviewer flow）"| F(["/annotation-workspace/:taskId\n（審查模式，對應任務）"])
    D -->|"點擊『快速進入審查』（Post-R1 reviewer flow）"| G(["/annotation-workspace/:taskId\n（審查模式，上次未完成任務）"])
    E -->|"點擊『查看最近任務統計報告』（Post-R1）"| H(["/dataset-stats/:taskId"])
```

**畫面狀態清單（wireframe 對應）：**

| 畫面狀態 | 需繪製 | 說明 |
|---------|:------:|------|
| `UserDashboard — Skeleton` | ✅（共用）| 全頁骨架 |
| `UserDashboard — Reviewer Block（有任務）` | ✅ | 待審查任務列表 + IAA 摘要區 + 快速進入審查按鈕 |
| `UserDashboard — Reviewer 空狀態` | ✅ | 空狀態說明文字 + 「查看統計報告」次要按鈕 |

**Navigation 表：**

| From | Trigger | To |
|------|---------|-----|
| `UserDashboard — Reviewer Block` | 點擊任務卡（Post-R1 reviewer flow） | `/annotation-workspace/:taskId`（審查模式，對應任務）|
| `UserDashboard — Reviewer Block` | 「快速進入審查」按鈕（Post-R1 reviewer flow） | `/annotation-workspace/:taskId`（審查模式，上次未完成任務）|
| `UserDashboard — Reviewer 空狀態` | 「查看最近任務統計報告」次要按鈕（Post-R1） | `/dataset-stats/:taskId` |

---

### Wireframe 畫面總覽

> 本節為所有需繪製 wireframe 畫面的集中索引，供繪圖前確認範圍、標注共用畫面、對應 Page 命名。
>
> **單一檔案**：所有畫面集中在一個 `.pen` 檔 `design/wireframes/pages/dashboard/dashboard.pen`，每個畫面狀態為檔案內的獨立 **Page**，不拆分為多個 `.pen` 檔。此設計對應路由結構（`/dashboard` 為單一路由），並與後續 `design/prototype/pages/dashboard/dashboard.html` 一一對應。
>
> **共用畫面**：標注「✦ 共用」的 Page 僅繪製一次，在各 US 流程中重複引用。
>
> **多角色並存**：同一 `user` 在不同任務中同時持有多個 task role（如 PL + Annotator + Reviewer），`UserDashboard` 以垂直堆疊方式渲染各 Block（順序：PL Block → Reviewer Block → Annotator Block）。此情境不需額外 Page，可在各 Block Page 下方標注說明即可。

#### 總計：11 張

| 角色 | 畫面數 |
|------|:------:|
| Super Admin（system role = `super_admin`） | 4 |
| User 共用 Skeleton（system role = `user`） | 1 |
| User — 錯誤狀態 | 1 |
| User — 無任務空狀態 | 1 |
| User — Project Leader Block | 1 |
| User — Annotator Block | 1 |
| User — Reviewer Block | 2 |
| **合計** | **11** |

---

#### SuperAdminDashboard — 4 張

> 觸發條件：`authStore.role === 'super_admin'`。由 RoleGuard 強制，`user` 無法存取。

| ID | 畫面狀態 | Page 名稱 | 對應 US | 需繪製內容 | 導出導航 |
|----|---------|----------|---------|-----------|---------|
| SA-1 | **Skeleton** | `SA-1 SuperAdmin Skeleton` | US1 | 全頁灰色骨架佔位：Header、使用者快覽卡區（灰塊 ×N）、任務列表區（灰色列 ×N）；無實際數字，無操作元件 | — |
| SA-2 | **有資料** | `SA-2 SuperAdmin 有資料` | US1 | ① 平台使用者快覽：各系統角色帳號數（`user_count`、`super_admin_count`）統計卡 ② 全任務列表：表格或卡片，每筆顯示任務名稱、任務類型（`classification` / `scoring` 等）、當前狀態（草稿 / Dry Run / IAA 確認 / Official Run / 已完成）、整體完成率進度條 ③ 全平台標記進度摘要：彙整各任務標記進度與異常提醒 ④ 任務層級待處理項：若有 IAA 結果待確認的任務，顯示提醒；若 Post-R1 目標頁可用，才顯示快速連結 | 「前往使用者管理」（Post-R1）→ `/user-management`；任務卡點擊（Post-R1）→ `/task-detail/:taskId`；IAA 快速連結（Post-R1）→ `/dataset-quality/:taskId` |
| SA-3 | **空狀態** | `SA-3 SuperAdmin 空狀態` | US1 | 空狀態插圖或圖示 + 說明文字「平台尚未有任何資料」；若 Post-R1 已啟用 `user-management`，則顯示「管理使用者」次要按鈕（outlined / ghost 樣式）；不顯示任何任務列表或統計卡 | 「管理使用者」（Post-R1）→ `/user-management` |
| SA-4 | **錯誤** | `SA-4 SuperAdmin 錯誤` | US1 | `/admin/stats` 呼叫失敗：錯誤提示區塊（icon + 說明文字 + 「重試」按鈕）；不渲染任何空白卡片或 placeholder 數字 | 「重試」→ 重新呼叫 `/admin/stats` |

---

#### UserDashboard — 共用畫面 — 2 張

> 觸發條件：`authStore.role === 'user'`，`GET /users/me/tasks` 載入中（Skeleton）或失敗（錯誤）。US2～US5 均共用此兩張畫面。

| ID | 畫面狀態 | Page 名稱 | 對應 US | 需繪製內容 | 導出導航 |
|----|---------|----------|---------|-----------|---------|
| U-0 | **Skeleton** ✦ 共用 | `U-0 User Skeleton` | US2、US3、US4、US5 | 全頁灰色骨架佔位：Header、內容區灰塊（高度模擬單一或多 Block 的大約佔位）；無實際數字，無 Block 標題，無操作元件 | — |
| U-7 | **錯誤** ✦ 共用 | `U-7 User 錯誤` | US2、US3、US4、US5 | `/users/me/tasks` 或 `/dashboard/user-summary` 呼叫失敗：錯誤提示區塊（icon + 說明文字 + 「重試」按鈕）；不渲染任何空白卡片或 placeholder 數字 | 「重試」→ 重新呼叫 `/users/me/tasks` 與 `/dashboard/user-summary` |

---

#### UserDashboard — US2 無任務空狀態 — 1 張

> 觸發條件：`/users/me/tasks` 回傳空清單（`task_membership` 為空）。

| ID | 畫面狀態 | Page 名稱 | 對應 US | 需繪製內容 | 導出導航 |
|----|---------|----------|---------|-----------|---------|
| U-1 | **空狀態** | `U-1 User 空狀態` | US2 | 空狀態插圖或圖示 + 說明文字「目前尚無任務，建立第一個任務或等待被邀請加入任務」+ 主要按鈕「建立第一個任務」（→ `/task-new`）；若 Post-R1 頁面可用，可追加「查看個人工時紀錄」（→ `/work-log`）、「編輯個人資料」（→ `/profile`）次要按鈕；不顯示任何任務列表或 Block | 「建立第一個任務」→ `/task-new`；「查看個人工時紀錄」（Post-R1）→ `/work-log`；「編輯個人資料」（Post-R1）→ `/profile` |

---

#### UserDashboard — US3 Project Leader Block — 1 張

> 觸發條件：`/users/me/tasks` 回傳至少一筆 `task_role = project_leader` 的任務成員資格。

| ID | 畫面狀態 | Page 名稱 | 對應 US | 需繪製內容 | 導出導航 |
|----|---------|----------|---------|-----------|---------|
| U-2 | **PL Block — 有任務** | `U-2 PL Block 有任務` | US3 | ① **任務總覽卡**：任務名稱、任務類型、當前狀態（badge）、整體完成率進度條 ② **待處理事項區**：IAA 結果待確認（badge；若 Post-R1 頁面可用才加快速連結）、Dry Run 已全員完成提醒（Post-R1 可導向啟動 Official Run）③ **標記員進度區**：各標記員本任務完成數 / 今日完成數 / 平均速度，速度異常者依 `task.config.dashboard.velocity_alert_threshold` 顯示警示圖示或醒目顏色標示 ④ **系統公告區**：平台公告或任務提醒 | IAA 待確認（Post-R1）→ `/dataset-quality/:taskId`；任務卡（Post-R1）→ `/task-detail/:taskId`；啟動 Official Run（Post-R1）→ `/task-detail/:taskId`（Official Run tab）|

---

#### UserDashboard — US4 Annotator Block — 1 張

> 觸發條件：`/users/me/tasks` 回傳至少一筆 `task_role = annotator` 的任務成員資格。

| ID | 畫面狀態 | Page 名稱 | 對應 US | 需繪製內容 | 導出導航 |
|----|---------|----------|---------|-----------|---------|
| U-4 | **Annotator Block** | `U-4 Annotator Block` | US4 | ① **我的任務列表**（分兩區）：Dry Run 區 + Official Run 區，每筆顯示任務名稱、已完成數 / 總分配數、assignment 狀態（未開始 / 進行中 / 已提交）② **個人進度摘要**：跨任務今日完成總數、跨任務累計完成總數、各任務剩餘筆數 ③ **「快速繼續」按鈕**（主要按鈕，導向上次未完成任務的 `/annotation-workspace/:taskId`，帶 `task_id` + `run_type` 參數）| 「快速繼續」→ `/annotation-workspace/:taskId`（上次未完成任務）；任務卡點擊 → `/annotation-workspace/:taskId`（對應任務）|

---

#### UserDashboard — US5 Reviewer Block — 2 張

> 觸發條件：`/users/me/tasks` 回傳至少一筆 `task_role = reviewer` 的任務成員資格。

| ID | 畫面狀態 | Page 名稱 | 對應 US | 需繪製內容 | 導出導航 |
|----|---------|----------|---------|-----------|---------|
| U-5 | **Reviewer Block — 有任務** | `U-5 Reviewer Block 有任務` | US5 | ① **待審查任務列表**：任務名稱、待審核筆數、已審核 / 總筆數；若 Post-R1 reviewer flow 可用，點擊任務卡 → `/annotation-workspace/:taskId`（審查模式）② **Dry Run IAA 摘要**：當前 IAA 分數（依任務類型顯示對應指標）+ 達標 / 未達標狀態（圖示或顏色）③ **「快速進入審查」按鈕**：Post-R1 reviewer flow 可用時導向上次未完成任務的審查模式 | 任務卡點擊（Post-R1 reviewer flow）→ `/annotation-workspace/:taskId`（審查模式）；「快速進入審查」（Post-R1 reviewer flow）→ `/annotation-workspace/:taskId`（審查模式，上次未完成）|
| U-6 | **Reviewer 空狀態** | `U-6 Reviewer 空狀態` | US5 | `reviewer` task_role 存在但目前無待審查任務：說明文字（無待審查任務）；若 Post-R1 `dataset-stats` 可用，再顯示「查看最近任務統計報告」次要按鈕（→ `/dataset-stats/:taskId`，其中 `taskId` 為最近有 reviewer activity 的任務）；不顯示任務列表或 IAA 摘要 | 「查看最近任務統計報告」（Post-R1）→ `/dataset-stats/:taskId` |

---

#### 畫面 ID 彙整索引

檔案：`design/wireframes/pages/dashboard/dashboard.pen`

| 畫面 ID | 角色 | 畫面狀態 | Page 名稱（dashboard.pen 內）|
|--------|------|---------|------------------------------|
| SA-1 | Super Admin | Skeleton | `SA-1 SuperAdmin Skeleton` |
| SA-2 | Super Admin | 有資料 | `SA-2 SuperAdmin 有資料` |
| SA-3 | Super Admin | 空狀態 | `SA-3 SuperAdmin 空狀態` |
| SA-4 | Super Admin | 錯誤 | `SA-4 SuperAdmin 錯誤` |
| U-0 | User（共用） | Skeleton | `U-0 User Skeleton` |
| U-7 | User（共用） | 錯誤 | `U-7 User 錯誤` |
| U-1 | User | 空狀態（無任務） | `U-1 User 空狀態` |
| U-2 | User / PL | PL Block — 有任務 | `U-2 PL Block 有任務` |
| U-4 | User / Annotator | Annotator Block | `U-4 Annotator Block` |
| U-5 | User / Reviewer | Reviewer Block — 有任務 | `U-5 Reviewer Block 有任務` |
| U-6 | User / Reviewer | Reviewer 空狀態 | `U-6 Reviewer 空狀態` |

### 關鍵實體

- **User（使用者）**：`authStore` 持有 `role`（System Role，JWT 單值：`super_admin` 或 `user`）。Dashboard role dispatch 以 `role` 為唯一依據，所有已註冊使用者均持有 `user` 系統角色。
- **TaskMembership（任務成員資格）**：`task_membership(task_id, user_id, task_role)` 表。`UserDashboard` 透過 `/users/me/tasks` 取得任務角色（`project_leader` / `reviewer` / `annotator`），再透過 `/dashboard/user-summary` 取得各區塊顯示摘要。Task Role 不存於 JWT，必須每次從 API 取得。
- **TaskSummaryCard（任務摘要卡）**：儀表板中每筆任務的顯示單元。

  | 欄位 | 來源 | 說明 |
  |------|------|------|
  | `task_id` | `task_membership` | 任務唯一識別碼 |
  | `task_name` | `tasks` 表 | 任務名稱 |
  | `task_type` | `tasks` 表 | 任務類型（`classification` / `scoring` 等）|
  | `task_status` | `tasks` 表 | 草稿 / Dry Run 進行中 / 等待 IAA 確認 / Official Run 進行中 / 已完成 |
  | `completion_rate` | 計算欄位 | 整體完成率（完成筆數 / 總分配筆數）|
  | `task_role` | `task_membership` 表 | 使用者在此任務的角色 |
  | `assigned_count` | `task_membership` 表 | 分配給此標記員的總筆數（Annotator 視角）|
  | `completed_count` | 標記記錄表 | 此標記員已完成筆數（Annotator 視角）|
  | `assignment_status` | 計算欄位 | 使用者在此任務中的個人狀態（未開始 / 進行中 / 已提交）|

- **PlatformStats（平台統計）**：Super Admin 專屬，由 `/admin/stats` 提供。欄位：各系統角色帳號數（`user_count`、`super_admin_count`）、全平台任務總數、`task_summaries[]`、`pending_actions[]`。
- **PlatformProgressSummary（全平台標記進度摘要）**：Super Admin 專屬，由 `/admin/stats` 提供。欄位：全平台待處理任務數、進行中任務數、異常速度提醒數或等價聚合欄位，用於對應 IA / Functional Map 的「全局任務 + 標記員進度」。
- **UserDashboardSummary（使用者儀表板摘要）**：User 專屬，由 `/dashboard/user-summary` 提供。欄位：`project_leader_blocks[]`、`reviewer_blocks[]`、`annotator_blocks[]`、`recent_reviewer_task_id`、annotator 跨任務統計欄位、快捷導頁目標。
- **DashboardActionTarget（儀表板導頁目標）**：快捷連結的導頁資訊。欄位：`task_id`、`run_type`（`dry_run` | `official_run` | `null`）、`review_mode`（boolean）、`source_block`（`super_admin` | `project_leader` | `reviewer` | `annotator`）。
- **ReviewerActivity（審查活動）**：reviewer 最近一次審查行為的摘要。欄位：`task_id`、`reviewed_at`，用於決定 reviewer 空狀態的最近任務排序。

---

## 成功標準 *(必填)*

- **SC-001**：`role = super_admin` 使用者導向 `/dashboard` 時，系統渲染 `SuperAdminDashboard` 且不顯示 `UserDashboard` 的任何內容。
- **SC-002**：`role = user` 使用者導向 `/dashboard` 時，系統渲染 `UserDashboard` 且不顯示 `SuperAdminDashboard` 的任何內容。
- **SC-003**：未知 / 無效 role 的使用者導向 `/dashboard` 時，清除 JWT session 並立即導向 `/login`，不渲染任何 dashboard 內容。
- **SC-004**：`UserDashboard` 的任務清單資料與後端 `task_membership` 一致，無多餘或遺漏任務。
- **SC-005**：API 呼叫失敗時儀表板顯示可辨識的錯誤提示，不渲染空白卡片或顯示 undefined / null 值。
- **SC-006**：儀表板頁面在視窗寬度 375px、768px、1440px 下均正確渲染，無版型破版。
- **SC-007**：儀表板頁面正確顯示 zh-TW 與 en 兩種語言；語言切換立即生效，不需重新載入頁面。
- **SC-008**：「快速繼續」按鈕導向正確的 `/annotation-workspace/:taskId`（任務 ID 與 run_type 參數正確）。
- **SC-009**：僅持有 `task_role = project_leader` 的使用者在 `UserDashboard` 看到任務總覽卡與標記員進度區，不顯示 annotator 或 reviewer 的任務區塊。
- **SC-010**：僅持有 `task_role = reviewer` 的使用者在 `UserDashboard` 看到待審查任務列表與 IAA 摘要，不顯示 annotator 或 project_leader 的任務區塊。
- **SC-011**：同時持有多個 task role 的使用者，各 task role 對應的任務區塊均正確獨立渲染，不互相合併或覆蓋。
- **SC-012**：Reviewer 空狀態的「查看最近任務統計報告」若已啟用，必須導向最近有 reviewer activity 的任務 `/dataset-stats/:taskId`，排序規則與 `ReviewerActivity.reviewed_at` 一致。
- **SC-013**：Annotator 摘要同時正確顯示跨任務統計（今日完成總數、累計完成總數）與任務別剩餘筆數，兩者皆可由測試資料驗證。
- **SC-014**：Project Leader 視角的速度異常警示依 `task.config.dashboard.velocity_alert_threshold` 正確計算與顯示；未設定 threshold 時不顯示警示。
- **SC-015**：`role = user` 且沒有任何 `task_membership` 的使用者，Dashboard 空狀態必須提供「建立第一個任務」主要 CTA，不得只呈現等待被邀請文案。
- **SC-016**：`SuperAdminDashboard` 必須顯示全平台標記進度摘要，以符合 IA / Functional Map 的 dashboard 定義。
- **SC-017**：所有 Post-R1 導頁未啟用時，Dashboard 仍可完整渲染 R1 核心內容，且不因缺少目標頁面而驗收失敗。

# Label Suite — 里程碑規劃（Milestone Plan）

**版本：** 2.0.0

**最後驗證：** 2026-08-19（17-spec inventory）

**文件定位：** Navigation；產品里程碑目標，不是 feature 行為或實作狀態正典

> [!IMPORTANT]
> [`specs/STATUS.md`](../../specs/STATUS.md) 是 feature pipeline 狀態的唯一來源。本頁的狀態只是一個有日期的摘要；issue、PR、prototype 或歷史計畫完成都不等於 feature 已交付。行為以 owner spec 為準，未解衝突見 [`decision-log.md`](./decision-log.md)。

---

## 2026-08-19 交付狀態摘要

本次直接核對 `STATUS.md` 的 17 份現存 spec：

| Pipeline 狀態 | 數量 | Spec |
|---|---:|---|
| `plan-ready` | 2 | foundation-000、account-001 |
| `in-progress` | 5 | dashboard-012、task-management-010／013／014、dataset-016 |
| `spec-ready` | 9 | account-002～005、admin-006～007、shared-008、annotation-015、dataset-017 |
| `deferred` | 1 | shared-018；不屬目前交付能力 |

規格成熟度表示 spec／plan／tasks／實作流程走到哪裡；產品里程碑表示希望可展示的能力與依賴。兩者不可互相推導。Foundation 目前是 `plan-ready`，而不是已完成的產品功能。

## 現行產品契約

- **任務建立與輸出**：四步建立流程目前只接受 JSON 資料集；任務由 `input_type + outputs[] + field_role_map` 組成。八個 output key 為 `sequence_tagging`、`entity_recognition`、`relation_identification`、`single_label`、`multi_label`、`single_dim`、`multi_dim`、`free_text`，正典見 [ADR-029](../adr/029-output-type-composition.md) 與 [013](../../specs/task-management/013-task-new/spec.md)。
- **生命週期**：`draft → dry_run_in_progress → waiting_iaa_confirmation → official_run_in_progress → completed`。完成前需正式標記全數提交、應完成 review unit 全數定案、無未解爭議、應仲裁項目完成，且品質指標可用；正典見 [ADR-022](../adr/022-task-state-machine-location.md) 與 [014](../../specs/task-management/014-task-detail/spec.md)。
- **審核與仲裁**：`ReviewUnit = sample × annotator × run`，狀態為 `pending | approved | modified | disputed | finalized`；差異形成 `DisputeItem`，由合格且非當事人的 arbiter 仲裁。隱藏的 test-set ground truth 不得提供給 annotator 或 reviewer；正典見 [015](../../specs/annotation/015-annotation-workspace/spec.md)。
- **品質分析**：依 `outputs[].type` 逐型統計與計算 IAA，複合任務逐型呈現；`free_text = not_applicable`，不計自動 IAA。指標與 threshold 只引用 [017 `OUTPUT_TYPE_IAA_REGISTRY`](../../specs/dataset/017-dataset-analysis-detail/spec.md)，本頁不複製技術表。
- **交付輸出**：Task Detail 匯出為 JSON／JSON-MIN；review、dispute、arbitration 與 lifecycle gate 都必須保留可追溯證據。

## 產品里程碑目標

下表描述成果門檻，不宣告實作已完成；每次 `STATUS.md` 變動後都需重新基準化。

| 里程碑 | 可展示成果 | Owner spec | 依賴與驗收證據 | 主要風險 |
|---|---|---|---|---|
| **M0** 工程基準 | 跨模組可依共同約束建置與驗證 | foundation-000 | Foundation plan 與成功標準 | 上游約束變動影響全線 |
| **M1** 帳號與導覽 | Email／Password 入口、共用導覽與角色 gating | 001、008 | 角色邊界與 zh/en、RWD 驗收 | 002 仍只是 Google SSO no-op 入口 |
| **M2** 任務入口 | 角色化 Dashboard 與任務列表 | 012、010 | membership、搜尋、篩選與多 output 標籤 | 依賴任務與成員資料一致性 |
| **M3** 任務建立 | 四步精靈建立可組合 output 任務 | 013 | JSON upload、8-key registry、config 驗證 | producer 與 consumer 同步漂移 |
| **M4** 標記作業 | 依 `outputs[]` 執行試標與正式標記 | 015 | 逐型作答、保存、提交與資料公平驗收 | 複合輸出與 tokenization 整合 |
| **M5** 任務協作 | 五 Tab、成員、完整 lifecycle、審核設定與匯出 | 014 | 五態轉換、完成 gate、JSON／JSON-MIN | 跨角色 gate 缺一不可完成 |
| **M6** 分析與品質 | 列表入口、逐 output 統計與 IAA | 016、017 | `x/y` gate、`free_text` 不適用、低一致樣本 | 小樣本與逐型指標誤讀 |
| **M7** 審核與管理 | ReviewUnit 審核、爭議仲裁、帳號與 Admin | 015、002～007 | DisputeItem、RBAC 與審計證據 | 仲裁資格與隱藏答案隔離 |
| **M8** Demo-ready | 端到端旅程與研究展示 | 上述 owner specs | 建立 → 試標／IAA → 正式標記 → 審核／仲裁 → completed → export | 研究時程不代表工程狀態 |

## 歷史附件：2026-06 技術實作計畫（Frozen）

> [!WARNING]
> 以下 v1.0.1 內容只保留作為當時的規劃與決策背景，**不是現行需求、實作狀態、開發指令或驗收清單**。其中 endpoint、store、hook、資料表、library、coverage、日期、舊型別與簡寫狀態均已被上方現行摘要及 owner specs 取代；不得用來判定 feature 已交付。

### 歷史 Milestone Details（里程碑詳述）

---

### M0 — Foundation（工程基準與 CI）

**目標描述**

建立所有功能模組必須遵守的工程基準：目錄結構、API 合約規範、後端分層、前端 vertical slice、Auth 骨架、Config-driven extensibility 契約、測試策略、CI quality gate，以及可觀測性（Prometheus / Sentry）整合。

**涵蓋 Spec（當時快照）：** `specs/foundation/000-foundation/spec.md` v1.11.3；當時記錄為 `in-progress`，現況已由上方摘要取代

**Definition of Done**

- [ ] FastAPI 專案骨架建立（`backend/app/` 目錄結構，含 `routes/` / `services/` / `repositories/` / `schemas/` / `dependencies/`）
- [ ] PostgreSQL 連線、Alembic migration 初始化
- [ ] Redis 連線、Celery worker 基本設定
- [ ] `/health` + `/metrics` 端點可用
- [ ] Prometheus 指標收集設定完成；Sentry DSN 整合
- [ ] React + Vite + TypeScript 前端骨架建立（feature vertical slice 目錄）
- [ ] CI pipeline：ruff + mypy --strict + tsc --noEmit + ESLint + pytest --cov 全數通過
- [ ] Docker Compose 可一鍵啟動完整開發環境
- [ ] Foundation spec 的所有 P0 FR 與 SC 驗收通過

**關鍵技術決策**

- Config-driven task registry 的骨架（task_type → config schema 映射）
- `ErrorResponse` 標準格式定義
- `request_id` middleware 確認
- Pydantic v2 BaseModel 規範（`model_validator` 驗證 task config）

**風險**

- Celery + Redis 在 Docker Compose 的網路設定較複雜，可能需要額外調試時間
- 當時 Foundation spec 若有重大修訂，會影響後續里程碑的介面設計；現行成熟度只查 `STATUS.md`

---

### M1 — Auth + Shared Sidebar

**目標描述**

實作 Email / Password 登入 / 登出機制（JWT httpOnly cookie + refresh token 輪換），以及跨模組共用的 Sidebar Navbar（Desktop + Mobile RWD）。

**涵蓋 Spec：** `specs/account/001-login-email-password/spec.md` v1.2.2（`plan-ready`）、`specs/shared/008-sidebar-navbar-shared/spec.md` v1.3.9（`spec-ready`）

**Definition of Done**

- [ ] `POST /api/v1/auth/login`：Email + Password 驗證，發放 access token（httpOnly cookie）+ refresh token（httpOnly cookie）
- [ ] `POST /api/v1/auth/refresh`：refresh token 輪換，重新發放 access token
- [ ] `POST /api/v1/auth/logout`：撤銷 refresh token，清除 cookie
- [ ] `GET /api/v1/auth/me`：回傳目前使用者 profile
- [ ] 前端 `useAuthStore`（Zustand）持有 `userId` 和 `role`（僅記憶體，不 persist）
- [ ] 401 自動靜默 refresh，失敗後導向 `/login`
- [ ] Sidebar Navbar Desktop 版（左側 Sidebar）+ Mobile 版（頂部品牌列 + 底部導覽）
- [ ] 角色可見性 gating：`user-management` 入口僅 `super_admin` 可見
- [ ] `pytest` unit + integration tests：登入成功 / 失敗 / token 過期 / refresh 輪換 / logout 撤銷路徑
- [ ] ruff / mypy --strict / tsc / ESLint 全通過

**關鍵技術決策**

- `SameSite=Lax` cookie 策略；本地開發使用 Vite proxy 解決跨域問題
- Refresh token grace period（30 秒）防止多 tab 並發刷新假陽性
- Zustand auth store 只持有 userId + role，不持久化到 localStorage

**風險**

- Google SSO（spec 002）在 M1 不在範圍；M7 僅交付 Google SSO 入口與 no-op 整合預留，真實 OAuth redirect / callback / token exchange / account linking 需另開或修訂 auth spec 後才可排入實作
- 本地開發的 CORS / cookie SameSite 設定通常容易出錯，需早期驗證

---

### M2 — Dashboard + 任務列表

**目標描述**

實作五角色動態儀表板（一般使用者 / Project Leader / Annotator / Reviewer / Super Admin），以及任務列表頁（搜尋、狀態篩選）。

**涵蓋 Spec：** `specs/dashboard/012-dashboard/spec.md` v1.3.28（`spec-ready`）、`specs/task-management/010-task-list/spec.md` v1.3.8（`spec-ready`）

**Definition of Done**

- [ ] Dashboard 依 `system_role` → `task_membership` 動態分流，顯示對應視角
- [ ] 五種 Dashboard 視圖均有對應後端 API（`GET /api/v1/dashboard/summary`）
- [ ] Dry Run 全員完成時 Dashboard badge 通知邏輯（即使在 M5 才有完整狀態機，此處先以 mock 示範）
- [ ] 任務列表：`GET /api/v1/tasks`（含分頁、狀態篩選、關鍵字搜尋）
- [ ] `user`（系統角色）只看自己有成員資格的任務；`super_admin` 看全平台
- [ ] 任務刪除（軟刪除）：`DELETE /api/v1/tasks/{task_id}`（僅 `project_leader` 與 `super_admin` 可執行；僅允許 `status = draft` 的任務；非 `draft` 或無權限的直接呼叫必須被拒絕）
- [ ] i18n 語言切換（ZH / EN）即時生效
- [ ] 前端 tsc / ESLint 通過；後端 ruff / mypy 通過

**關鍵技術決策**

- TanStack Query 用於 dashboard summary 的 server state 管理
- `useTaskRole(taskId)` hook 確立標準模式，後續模組統一使用

**風險**

- Dashboard 需要 `task_membership` API，而此時 task-detail 尚未完成；需以 mock data 或基本 task_membership 資料展示

---

### M3 — 新增任務（Config Builder）

**目標描述**

實作四步驟任務建立精靈，包含 Config Builder 視覺模式與 Code 模式，支援 8 種 registry-driven 輸出類型及多輸出組合。

**涵蓋 Spec：** `specs/task-management/013-task-new/spec.md` v4.3.0（`spec-ready`）

**Definition of Done**

- [ ] `POST /api/v1/tasks`：建立任務，task config 以 Pydantic 驗證，無效 config 回傳 422
- [ ] 建立後自動在 `task_membership` 建立一筆 `project_leader` 紀錄
- [ ] Config Builder 視覺模式：8 種輸出類型皆有 registry-driven UI 控制項，並支援多輸出組合
- [ ] Step 2 統一版面：大於 1100px 設定左／預覽右，1100px 以下設定上／預覽下；範本／上傳與 Code 共用單一外框
- [ ] Config Builder Code 模式：顯示 YAML / JSON，可手動編輯，與視覺模式雙向同步
- [ ] 範本選擇：常用任務類型預設 config 可直接套用後微調
- [ ] 步驟四標記說明：支援上傳 PDF / 圖片 / Markdown，設定「強制首次顯示」
- [ ] 資料集上傳（txt / csv / tsv / json）並顯示預覽
- [ ] output type registry：新增輸出類型不需修改 Step 1~4 核心路由
- [ ] Unit test：每種輸出類型的 config 驗證（合法 + 非法）覆蓋率 ≥ 90%

**關鍵技術決策**

- output type registry 的 Python 實作模式（dict of Pydantic validators or Protocol class）
- Config JSONB 儲存策略（PostgreSQL）
- Visual ↔ Code 模式切換不丟失資料的狀態管理設計

**風險**

- Config Builder 是整個系統中最複雜的前端 UI，五種 task_type 各有不同表單結構，需謹慎設計資料模型，避免後期需要大幅重構
- 若 task_type taxonomy 在開發中有變動，須更新 registry 和 Pydantic schema

---

### M4 — Annotation Workspace（Annotator 核心路徑）

**目標描述**

實作標記清單頁與標記作業頁（Annotator 模式），支援 Dry Run 與 Official Run 兩種標記模式，含草稿自動儲存與即時進度追蹤。

**涵蓋 Spec：** `specs/annotation/015-annotation-workspace/spec.md` v1.4.11（`spec-ready`，Annotator 部分）

**Definition of Done**

- [ ] `GET /api/v1/annotations/list`：列出使用者被指派的任務與資料（含分頁、篩選）
- [ ] `GET /api/v1/annotations/{annotation_id}`：取得單筆標記資料
- [ ] `POST/PUT /api/v1/annotations/{annotation_id}`：儲存草稿 / 提交標記
- [ ] annotation-workspace 依 `task_type` config 動態渲染標記介面（五種 task_type）
- [ ] 右欄「說明與檔案」持續可見（翻頁不清空）
- [ ] 即時進度條更新（已標記數 / 本輪總量）
- [ ] 「標記說明強制顯示」modal：首次進入顯示一次，確認後不再重複
- [ ] Ground truth 永不暴露給 Annotator（API 回應不含 ground truth 欄位）
- [ ] Mobile 版：底部抽屜顯示「說明與檔案」
- [ ] E2E Playwright tests：Annotator 完整標記流程（登入 → 清單 → 單筆標記 → 提交）

**關鍵技術決策**

- `annotation-workspace` 只讀取 `sample_snapshot_id` 對應的樣本，不允許在 workspace 端重新抽樣
- Data Fairness 強制執行：API response schema 的 `ground_truth` 欄位對 annotator 角色永不回傳

**風險**

- 五種 task_type 的標記介面在前端渲染邏輯複雜，需謹慎設計動態 widget 的 config → component 映射
- 草稿自動儲存（debounce）需注意競態條件（concurrent tab / rapid navigation）

---

### M5 — 任務管理完整協作流程

**目標描述**

實作任務詳情頁（五 Tab），包含完整任務狀態機（draft → dry_run → iaa → official → completed）、成員管理、工時紀錄及標記結果匯出。

**涵蓋 Spec：** `specs/task-management/014-task-detail/spec.md` v1.7.15（`spec-ready`）

**Definition of Done**

- [ ] 任務詳情五 Tab：任務概覽 / 標記結果 / 標記進度 / 工時紀錄 / 成員管理
- [ ] 任務狀態機五個狀態的 service layer 實作（`task_service.py`）
- [ ] 每次狀態轉換寫入 `run_state_transitions` 審計紀錄
- [ ] Dry Run 全員完成 → 自動切換至 `waiting_iaa_confirmation` → Dashboard badge 通知
- [ ] 樣本快照（`sample_snapshot_id`）在首次 Dry Run 時鎖定並不可變（`SAMPLE_SNAPSHOT_LOCK_EVENT = publish_dry_run`）；IAA 拒絕後保留原快照，需另建新 run 批次，不得清除既有快照（清除會破壞 Dry/Official 切分可重現性與匯出追溯性）
- [ ] 成員管理 tab：搜尋 + Email 邀請、指派任務角色
- [ ] 標記結果 tab：JSON / JSON-MIN 匯出，記錄匯出歷程
- [ ] 工時紀錄：`project_leader` 可依成員 / 日期 / 階段篩選；`reviewer` 只看自己
- [ ] 狀態機 unit tests：合法 / 非法轉換（當時規劃為 ≥ 90% 分支覆蓋率）
- [ ] Integration tests：Celery 任務派送在狀態轉換後被呼叫

**關鍵技術決策**

- `dispatch_side_effects` 設計為 idempotent-safe，Celery beat 掃描卡住的轉換
- `RunStateTransition` 與狀態更新在同一 DB transaction 中提交

**風險**

- 任務狀態機是整個後端最複雜的業務邏輯，pre-condition 檢查（IAA 門檻、annotator 數量）容易出現邊界案例
- Official Run 啟動時需要從樣本快照中切分出「排除 Dry Run 樣本」的剩餘資料

---

### M6 — 資料集分析 + 品質監控

**目標描述**

實作資料集分析模組：統計總覽（#Sentence / #Token / #Label）與品質監控（IAA 計算、異常偵測）。

**涵蓋 Spec：** `specs/dataset/016-dataset-analysis-list/spec.md` v1.3.1（`in-progress`）、`specs/dataset/017-dataset-analysis-detail/spec.md` v1.4.5（`spec-ready`）

**Definition of Done**

- [ ] `/dataset-analysis` 任務列表（依角色篩選、URL query 保留篩選條件）
- [ ] `/dataset-analysis-detail/:task_id?tab=stats`：共用指標 + 各 task_type 特定統計圖表
- [ ] `/dataset-analysis-detail/:task_id?tab=quality`：IAA 計算（五種 task_type，含 `sentence_pairs`）
- [ ] IAA 計算：
  - 分類任務：Krippendorff's Alpha（nominal）
  - VA 評分：ICC + Krippendorff's Alpha（interval）
  - 序列標記：Pairwise Entity-level F1（strict + partial overlap）
  - 關係抽取：Pairwise Triple-level F1
  - 句對任務：分類型使用 Krippendorff's Alpha（nominal）；評分型使用 ICC
- [ ] 異常偵測：標記速度異常、離群值（1.5x STD / 2x STD）
- [ ] 空狀態：Dry Run 未完成時顯示說明文字與導向按鈕
- [ ] IAA 結果不透過 API 暴露 ground truth 答案（Data Fairness）
- [ ] 統計精確性驗證測試：計算結果與手算基準誤差為 0

**關鍵技術決策**

- IAA 計算使用 Celery 背景任務（避免阻塞 API），結果快取至 Redis（設定明確 TTL）
- 統計圖表使用前端渲染（TanStack Query 取資料，recharts / D3 繪製）

**風險**

- 各 task_type 的 IAA 計算演算法差異較大，實作複雜度高，需充分單元測試
- 大量 annotation 資料的 IAA 計算效能需評估（是否需要分批 Celery 處理）

---

### M7 — Reviewer 審核 + 帳號完整 + Admin

**目標描述**

補齊 Reviewer 審核模式、帳號模組完整功能（Google SSO 入口預留 / Register / Forgot Password / Profile Settings），以及系統管理（User Management / Role Settings）。

**涵蓋 Spec：**
- annotation-015（Reviewer flow）
- account-002（Google SSO entrypoint / no-op integration reservation）
- account-003（Register Email/Password）
- account-004（Forgot/Reset Password）
- account-005（Profile Settings）
- admin-006（User Management）
- admin-007（Role Settings）

**Definition of Done**

- [ ] annotation-workspace Reviewer 模式：通過 / 退回 / 修改 / 刪除標記結果
- [ ] History panel：每筆標記的修改歷程追溯
- [ ] `POST /api/v1/auth/register`：Email 自行註冊，建立後自動取得 `user` 角色（**前置條件：** `specs/account/003-register-email-password/spec.md` 目前僅為前端互動原型，真實 `/auth/register` 尚未串接，進入 M7 前須先完成 spec 003 的 implementation-layer 升級）
- [ ] Forgot Password（Resend API 整合）：`POST /api/v1/auth/forgot-password`（**前置條件：** `specs/account/004-forgot-reset-password/spec.md` 目前為前端互動原型，真實 API 與 token 驗證尚未串接，進入 M7 前須先完成 spec 004 的 implementation-layer 升級）
- [ ] Reset Password：`POST /api/v1/auth/reset-password`（token 驗證 valid / expired / used 三狀態）
- [ ] Profile Settings：修改姓名 / 大頭照 / Email 變更（含驗證信）/ 密碼設定 / 外觀偏好 / 通知偏好
- [ ] `user-management`：`super_admin` 可查看所有使用者、建立 / 停用帳號、指派系統角色
- [ ] `role-settings`：顯示系統角色 / 任務角色功能矩陣（唯讀展示）
- [ ] Google SSO 入口（spec 002）：登入頁保留可存取、可國際化的 Google SSO 入口；維持 prototype no-op，不實作 OAuth redirect / callback / token exchange / account linking

**關鍵技術決策**

- Resend email service（ADR-013）整合
- 軟刪除帳號（停用）不物理刪除，保留資料完整性

**風險**

- Email 驗證流程（Profile Email 變更）涉及多個狀態（pending / verified），需注意 session 管理

---

### M8 — Demo-Ready（整合 + User Study）

**目標描述**

完成系統整合測試、SUS 問卷使用者研究、與 Label Studio 的量化對比實驗，以及論文 demo video 製作。

**Definition of Done**

- [ ] 完整 E2E Playwright 測試：R1 / R2 / R3 核心流程全通過（登入 → 建立任務 → 標記 → IAA → 匯出 → reviewer audit → quality report → super-admin user management → role-based denial）
- [ ] SUS 問卷：5~10 位實驗室成員完成測試，彙整結果（目標分數 ≥ 75）
- [ ] Label Studio 對比實驗：量化同一任務的操作步驟數與初始化時間
- [ ] 統計精確性驗證：#Sentence / #Token / #Label 與真實值誤差 = 0（至少兩個領域資料集）
- [ ] Demo 情境一：Config Builder 建立任務 → Dry Run → IAA 確認 → Official Run
- [ ] Demo 情境二：Annotator 完成標記 → 系統顯示即時進度與統計
- [ ] Demo 情境三：資料集分析頁展示 Label 分佈與 IAA 結果
- [ ] Demo video 錄製（含系統截圖）
- [ ] 所有 quality gate（ruff / mypy / tsc / ESLint / pytest）通過

**關鍵技術決策**

- 論文 demo video 的情境腳本需提前設計，確保展示的是系統的核心貢獻
- User Study 的招募與 SUS 問卷需提前規劃時程

**風險**

- User Study 結果若低於目標（< 75 分），需快速決定是否在論文截止前進行介面修改
- Demo video 製作本身可能耗時，需預留充裕緩衝時間

---

## Critical Path（關鍵路徑）

### 串行依賴鏈（Critical Path，不可並行）

```
M0 Foundation
→ M1 Auth + Sidebar         （需要 M0 的 DB + FastAPI 骨架）
→ M2 Dashboard + Task List  （需要 M1 的 Auth，任務列表需要 auth 驗證）
→ M3 New Task / Config Builder（需要 M2 的 Task API 基礎）
→ M4 Annotation Workspace   （需要 M3 的 Task 與 Config 結構）
→ M5 Task Detail / 狀態機   （需要 M4 的 Annotation API）
→ M6 Dataset Analytics      （需要 M5 的完整 annotation 資料）
→ M8 Demo-Ready             （需要 M6 + M7）
```

### 可並行執行的里程碑

| 並行組合 | 說明 |
|---------|------|
| M6 與 M7 並行 | M6（資料集分析）與 M7（Reviewer + Admin + 帳號完整）沒有強依賴，可在 M5 完成後同時推進 |
| M7 內部的 spec 並行 | account-003/004/005（帳號完整）與 admin-006/007（系統管理）可拆分為兩條並行實作線 |

### 里程碑時間軸（以研究規劃為基準）

```
2026-12  M0 Foundation
2027-01  M1 Auth + Sidebar
2027-02  M2 Dashboard + Task List
2027-03  M3 New Task / Config Builder（4 週，最高複雜度之一）
2027-04  M4 Annotation Workspace（4 週）
2027-05  M5 Task Detail / 狀態機（4 週）
2027-06  M6 Dataset Analytics（4 週）/ M7 Admin & 帳號完整（3 週，並行）
2027-07  [緩衝 / 整合修正]
2027-08  M8 Demo-Ready（3 週）
2027-12  Demo Paper 可展示截止目標
2028-01  論文撰寫啟動（Phase 4）
2028-04  Advisor review 結束 / 論文提交
```

> 注意：以上時間軸為估計值，實際進度以 `specs/STATUS.md` 的開發狀態為準。每個里程碑結束後應重新確認下一個里程碑的進入條件。

---

## 里程碑入場條件（Entry Criteria）

進入下一個里程碑前，前一個里程碑必須符合以下條件：

| 里程碑 | 進入前必須完成 |
|--------|--------------|
| 進入 M1 | M0 的所有 P0 FR 通過驗收，CI pipeline 綠燈，Docker Compose 一鍵啟動可用 |
| 進入 M2 | M1 的 Auth API（login / refresh / logout / me）與 Sidebar Navbar 通過 E2E 測試 |
| 進入 M3 | M2 的 Dashboard summary API 與任務列表 API 通過驗收 |
| 進入 M4 | M3 的 task 建立 API（含 config 驗證）與五種 task_type config schema 確認無誤 |
| 進入 M5 | M4 的 annotation 儲存 / 提交 API 與 workspace 動態渲染通過 E2E 測試 |
| 進入 M6 + M7 | M5 的任務狀態機（含 Dry Run / Official Run 轉換）與成員管理 API 通過驗收 |
| 進入 M8 | M6（統計 + IAA）與 M7（Reviewer + Admin + 帳號完整）均通過驗收 |

---

## 變更紀錄

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.0.1 | 2026-06-03 | 修正總週數為 33 週（加計 1 個月緩衝）對齊詳細時間軸；M2 DELETE 任務補齊 project_leader/super_admin + draft 限制；M5 sample_snapshot_id 改為不可變（IAA 拒絕後保留快照建新批次）；M7 register / forgot-password 加入 spec 003/004 implementation-layer 升級前置條件 |
| 1.0.0 | 2026-06-02 | 初始版本；依 research phase 綜合結果建立，基於 story-map R1/R2/R3 切片、specs/STATUS.md 現況、README Research Roadmap 時程 |

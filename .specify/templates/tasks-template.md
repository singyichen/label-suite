---
功能分支: feat/[module]/NNN-feature
建立日期: YYYY-MM-DD
版本: 1.23.0
狀態: Draft
---

> **⚠️ Deprecated（ADR-033，issue #294）**：本檔案僅保留為 historical、non-normative example。Active task generation uses `openspec/changes/<change>/tasks.md`、`openspec/config.yaml` 與 `specs/_governance/testing-constitution.md`；以下範例不定義現行 ownership、paths、gates 或 PR grouping。

# 任務：[功能名稱]

**輸入**: `specs/[module]/NNN-feature/` 下的設計文件
**前置條件**: plan.md（必填）、spec.md（必填）

## 格式：`[ID] [P?] [Story] 描述`

- **[P]**：可平行執行（不同檔案，無相依性）
- **[Story]**：對應的使用者故事（US1, US2, US3…）
- 描述中需包含確切的檔案路徑

---

<!--
  ============================================================================
  重要：以下任務僅為示例說明。

  /speckit.tasks 必須根據以下內容產生實際任務取代示例：
  - spec.md 中的使用者故事（包含其優先級 P1, P2, P3…）
  - plan.md 中的功能需求
  - spec.md 資料模型中的實體
  - spec.md API 契約中的端點

  任務必須依使用者故事分組，使每個故事可：
  - 獨立實作
  - 獨立測試
  - 作為 MVP 增量交付

  產生的 tasks.md 不得保留任何示例任務。
  ============================================================================
-->

## Phase 1：設置（共用基礎設施）

- [ ] T001 建立功能目錄結構（依 plan.md）
- [ ] T002 [P] 安裝所需套件（`pnpm add` / `uv add`）
- [ ] T003 [P] 設定 lint 與格式化工具

---

## Phase 2：基礎建設（阻塞前置條件）

**⚠️ 必須在任何使用者故事實作開始前完成**

### PR-FOUND-MIGRATION：資料庫 Migration（獨立 PR，最先合併）

- [ ] T004a 撰寫 Alembic migration `upgrade()`（含 plan.md DB index 分析所列的所有 index）— `backend/alembic/versions/xxxx_[feature].py`
- [ ] T004b 撰寫對應 `downgrade()`（不允許 `pass`，必須可逆）— `backend/alembic/versions/xxxx_[feature].py`
- [ ] T004c 驗證 migration 可循環：`uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`

> **PR 邊界**：T004a/b/c 合併為獨立 `PR-FOUND-MIGRATION`，PR description 必須含 Rollback Plan 欄位，不得與任何應用程式碼合併。`[Principle: XVIII]`

### PR-FOUND-BE-SCHEMA：後端 Schema 基礎建設（依賴 PR-FOUND-MIGRATION merged）

- [ ] T005 建立 Pydantic schemas — Base / Create / Update / Response（`backend/app/modules/[module]/schemas.py` 或 `schemas/[feature].py`，依 plan.md schema 層次與拆分慣例）

> **PR 邊界**：T005 作為獨立 `PR-FOUND-BE-SCHEMA`。`[Principle: X; Backend Constitution XIII]`

### PR-FOUND-BE-API：後端 API Skeleton 基礎建設（依賴 PR-FOUND-BE-SCHEMA merged）

- [ ] T006 建立 API route skeleton 含 auth dependency（`backend/app/modules/[module]/router.py`；若採拆分格式，需同步建立 `router/__init__.py` 集約器與 `router/[feature].py`，依 plan.md Auth Dependency 欄與拆分慣例）

> **PR 邊界**：T006 作為獨立 `PR-FOUND-BE-API`。FR-131 豁免：T006 是 skeleton-only（無實際業務邏輯）placeholder；.bru skeleton 由後續 PR-FOUND-BRUNO 補齊，**commit message 須包含** `FR-131-exempt: skeleton-only route`（pre-PR gate 以 commit message 偵測，非 PR description）。`[Principle: X; Backend Constitution XIII]`

### PR-FOUND-BRUNO：Bruno Collection 初始化與 Endpoint Skeleton（依賴 PR-FOUND-BE-API merged）

- [ ] T006b [P] 建立 Bruno 集合根目錄初始化檔案（僅首次建立時執行，已存在則略過）— `backend/bruno/bruno.json`、`backend/bruno/environments/local.bru`、`backend/bruno/environments/staging.bru`
- [ ] T006c [P] 為本功能各規劃端點建立 Bruno 請求 skeleton（依 plan.md API 清單逐一列出每個檔案，例如：`backend/bruno/[module]/[feature]/[endpoint1].bru`、`backend/bruno/[module]/[feature]/[endpoint2].bru`…）— skeleton only，每個 endpoint 對應一個 .bru 檔案

> **PR 邊界**：T006b/T006c 合計檔案數 = 3（bootstrap）+ N（endpoint 數量）。依 Principle X，3 個 bootstrap 檔案（`bruno.json` 與兩個 environment `.bru`）屬工具／專案設定檔，**不計入 ≤5 files gate**，實際計入者僅 N 個 endpoint skeleton。因此 N ≤ 5 時合併為單一 `PR-FOUND-BRUNO`；N > 5 時拆為 `PR-FOUND-BRUNO-INIT`（T006b，3 個 bootstrap 檔案）與 `PR-FOUND-BRUNO-SKEL`（T006c，每批 ≤ 5 個 .bru skeleton，必要時分多批）兩類獨立 PR。`[Principle: X; Backend Constitution XIII; Foundation FR-131]`

### PR-FOUND-FE-API：前端 API 基礎建設（依賴 PR-FOUND-FE-TYPES merged；可與 PR-FOUND-BE-* 並行）

- [ ] T007 [P] 建立前端 service 層與 queryKey factory（`frontend/src/features/[module]/services/[feature].ts`，依 plan.md TanStack Query 策略）
- [ ] T008 [P] 建立 MSW handler（`frontend/src/mocks/handlers/[feature].ts`）— Storybook、Vitest、本地開發共用

> **PR 邊界**：T007/T008 合併為獨立 `PR-FOUND-FE-API`（API service/query keys + MSW handlers）。`[Principle: X; Frontend Constitution XVI]`

### PR-FOUND-FE-ROUTING：前端路由基礎建設（可與 PR-FOUND-FE-API 並行）

- [ ] T009 [P] 註冊路由並設定 route guard（`frontend/src/routes/index.tsx` — 依 plan.md 路由分析；路徑常數定義於 `frontend/src/routes/paths.ts`）

> **PR 邊界**：T009 作為獨立 `PR-FOUND-FE-ROUTING`（router registration + route guard）。`[Principle: X; Frontend Constitution XVI]`

### PR-FOUND-FE-I18N：前端 i18n 基礎建設（可與 PR-FOUND-FE-API 並行）

- [ ] T010a [P] 新增 i18n keys — zh-TW（`frontend/src/locales/zh-TW/[module].json` — 依 plan.md i18n key 清單）
- [ ] T010b [P] 新增 i18n keys — en（`frontend/src/locales/en/[module].json` — 依 plan.md i18n key 清單）

> **PR 邊界**：T010a/T010b 合併為獨立 `PR-FOUND-FE-I18N`（i18n namespace files）。`[Principle: X; Frontend Constitution XVI; Testing Constitution II]`

### PR-FOUND-BE-I18N：後端 i18n 訊息基礎建設（可與 PR-FOUND-FE-I18N 並行；若本功能無新增後端訊息則跳過）

- [ ] T010d [P] 新增後端 i18n keys — zh-TW（`backend/app/i18n/zh_TW/[module].py` — 依 plan.md 後端 i18n key 清單）
- [ ] T010e [P] 新增後端 i18n keys — en（`backend/app/i18n/en/[module].py` — 依 plan.md 後端 i18n key 清單）

> **PR 邊界**：T010d/T010e 合併為獨立 `PR-FOUND-BE-I18N`（backend i18n message dict files）。各 API route 實作任務相依此 PR（訊息 key 必須先存在才能在 route handler 中引用）。`[Principle: X; ADR-026; Backend Constitution i18n]`

### PR-FOUND-FE-TYPES：前端 TypeScript 型別合約（需在 PR-FOUND-FE-API 之前合併）

- [ ] T010c 建立前端 TypeScript 型別合約（`frontend/src/features/[module]/types/[feature].ts`，依 plan.md 前端型別策略）

> **PR 邊界**：T010c 作為獨立 `PR-FOUND-FE-TYPES`（TypeScript type contracts — hand-written 或 generated API types，視 plan.md 前端型別策略決定）。`[Principle: X; Frontend Constitution XVI]`

### PR-FOUND-BE-CORE：後端 Core 基礎建設（可與 PR-FOUND-FE-* 並行）

- [ ] T011 [P] 確認 Exception class 已存在或建立（`backend/app/core/errors.py` — 依 plan.md Phase 0 Exception 設計）
- [ ] T012 [P] 設定環境與設定管理（`backend/app/core/config.py`）

> **PR 邊界**：T011/T012 合併為獨立 `PR-FOUND-BE-CORE`。`[Principle: X]`

**檢查點**：基礎建設完成 — 可開始實作使用者故事

---

## Phase 3：使用者故事 1 — [標題]（優先級：P1）🎯 MVP

**故事目標**：[此故事為使用者交付的價值。] → 追蹤至 [SC-XXX]（來自 spec.md 成功標準）

**獨立測試方式**：[如何獨立驗證此故事]

### 測試 ⚠️ 必須在任何實作前先撰寫且必須失敗

- [ ] T013a [P] [US1] Service 層單元測試（mock DB session，測試業務邏輯分支）— `backend/tests/[module]/test_[feature].py`
- [ ] T013b [US1] Route 層整合測試（httpx AsyncClient + real test DB，測試 auth / status code）— `backend/tests/[module]/test_[feature].py`（與 T013a 共用同一測試檔案，不可並行）
- [ ] T013c [US1] Permission negative test（未授權角色嘗試存取，驗證回 403 或 404）— `backend/tests/[module]/test_[feature].py`（與 T013a/T013b 共用同一測試檔案，不可並行）
- [ ] T014 [P] [US1] 前端元件測試（Testing Library，依 MSW handler mock API）— `frontend/src/features/[module]/__tests__/[Feature].test.tsx`
- [ ] T015 [P] [US1] Playwright E2E 測試（完整用戶流程）— `e2e/[module]/[feature].spec.ts`

### 實作（僅在測試失敗後進行）

#### PR-US1-BE-MODEL：後端資料模型實作

- [ ] T016 [P] [US1] 建立資料模型（`backend/app/modules/[module]/models.py`）— 含 relationship 與 Loading Strategy

> **PR 邊界**：T016 作為獨立 `PR-US1-BE-MODEL`。`[Principle: X; Backend Constitution XIII]`

#### PR-US1-BE-REPO：後端 Repository 實作

- [ ] T016b [US1] 實作 repository 層（`backend/app/modules/[module]/repository.py`；超過 300 行時改為 `repository/__init__.py` + `repository/[feature].py`）— 封裝所有 DB query，在此明確指定 `selectinload`/`joinedload` loading strategy；service 層透過 repository 存取資料，不直接操作 ORM

> **PR 邊界**：T016b 作為獨立 `PR-US1-BE-REPO`（依賴 PR-US1-BE-MODEL merged）。`[Principle: X; Backend Constitution XIII]`

#### PR-US1-BE-SERVICE：後端 Service 實作（含 service 測試）

- [ ] T017 [US1] 實作 service 層（`backend/app/modules/[module]/service.py`）— 呼叫 repository 方法，不直接操作 ORM 或指定 loading strategy（loading strategy 屬 repository 責任）

> **PR 邊界**：T013a（service 單元測試）+ T017 合併為獨立 `PR-US1-BE-SERVICE`（依賴 PR-US1-BE-REPO merged）。`[Principle: X; Backend Constitution XIII]`

#### PR-US1-BE-API：後端 API 實作（含 route / permission 測試）

- [ ] T018 [US1] 實作 API endpoint（`backend/app/modules/[module]/router.py`；若採拆分格式，需同步維護 `router/__init__.py` 集約器，依 plan.md 拆分慣例）— 含 auth dependency
- [ ] T018b [US1] 更新 Bruno collection（`backend/bruno/[module]/[feature]/[endpoint].bru`）— 含完整 body、auth cookie/session (ADR-021) 與 example response，對應 T018 實作的 endpoint（Foundation FR-131）

> **PR 邊界**：T013b/T013c（route integration + permission negative tests）+ T018/T018b 合併為獨立 `PR-US1-BE-API`。`[Principle: X; Backend Constitution XIII; Foundation FR-131]`

#### PR-US1-FE-COMPONENT：前端元件實作（含 component test + Storybook）

- [ ] T019 [US1] 建立前端元件（`frontend/src/features/[module]/components/[feature]/[Feature].tsx`）— 含 ARIA role、響應式
- [ ] T020 [P] [US1] 建立 Storybook stories（`frontend/src/features/[module]/components/[feature]/[Feature].stories.tsx`）— Default + 邊界狀態，args/argTypes/MSW decorator 齊備

> **PR 邊界**：T014（Vitest component test）+ T019/T020 合併為獨立 `PR-US1-FE-COMPONENT`。`[Principle: X; Frontend Constitution XVI]`

#### PR-US1-FE-PAGE：前端頁面組裝（含 E2E）

- [ ] T021 [US1] 實作前端頁面（`frontend/src/features/[module]/pages/[feature]/[Feature]Page.tsx`）— Page 層不寫 story

> **PR 邊界**：T015（Playwright E2E）+ T021 合併為獨立 `PR-US1-FE-PAGE`，與 `PR-US1-BE-*` 完全並行（無 breaking contract change 時）。`[Principle: X; Frontend Constitution XVI]`

**檢查點**：使用者故事 1 可獨立驗證

---

## Phase 4：使用者故事 2 — [標題]（優先級：P2）

**故事目標**：[此故事為使用者交付的價值。] → 追蹤至 [SC-XXX]（來自 spec.md 成功標準）

**獨立測試方式**：[如何獨立驗證此故事]

### 測試 ⚠️ 必須在任何實作前先撰寫且必須失敗

- [ ] T022a [US2] Service 層單元測試（mock DB session，測試業務邏輯分支）— `backend/tests/[module]/test_[feature].py`（擴充 US1 同檔案；不可與任何 T013/T022 並行）
- [ ] T022b [US2] Route 層整合測試（httpx AsyncClient + real test DB，測試 auth / status code）— `backend/tests/[module]/test_[feature].py`（擴充 US1 同檔案；不可並行）
- [ ] T022c [US2] Permission negative test（未授權角色嘗試存取，驗證回 403 或 404）— `backend/tests/[module]/test_[feature].py`（擴充 US1 同檔案；不可並行）
- [ ] T023 [US2] 前端元件測試（Testing Library，依 MSW handler mock API）— `frontend/src/features/[module]/__tests__/[Feature].test.tsx`（擴充 US1 同檔案；不可與 T014 並行）
- [ ] T024 [US2] Playwright E2E 測試（完整用戶流程）— `e2e/[module]/[feature].spec.ts`（擴充 US1 同檔案；不可與 T015 並行）

### 實作（僅在測試失敗後進行）

#### PR-US2-BE-MODEL：後端資料模型實作

- [ ] T025 [US2] 建立相關模型（含 Loading Strategy）— `backend/app/modules/[module]/models.py`（與 T016 共用同一檔案，不可並行）

> **PR 邊界**：T025 作為獨立 `PR-US2-BE-MODEL`。`[Principle: X; Backend Constitution XIII]`

#### PR-US2-BE-REPO：後端 Repository 實作

- [ ] T025b [US2] 擴充 repository 層（`backend/app/modules/[module]/repository.py`；超過 300 行時改為 `repository/__init__.py` + `repository/[feature].py`）— 新增 US2 所需 DB query 方法，明確指定 loading strategy

> **PR 邊界**：T025b 作為獨立 `PR-US2-BE-REPO`（依賴 PR-US2-BE-MODEL merged）。`[Principle: X; Backend Constitution XIII]`

#### PR-US2-BE-SERVICE：後端 Service 實作（含 service 單元測試）

- [ ] T026 [US2] 實作 service 層（呼叫 repository 方法，不直接操作 ORM）— `backend/app/modules/[module]/service.py`

> **PR 邊界**：T022a（service 單元測試）+ T026 合併為獨立 `PR-US2-BE-SERVICE`（依賴 PR-US2-BE-REPO merged）。`[Principle: X; Backend Constitution XIII]`

#### PR-US2-BE-API：後端 API 實作（含 route / permission 測試）

- [ ] T027 [US2] 實作 API endpoint（含 auth dependency）— `backend/app/modules/[module]/router.py`；若採拆分格式，需同步維護 `router/__init__.py` 集約器（依 plan.md 拆分慣例）
- [ ] T027b [US2] 更新 Bruno collection（`backend/bruno/[module]/[feature]/[endpoint].bru`）— 含完整 body、auth cookie/session (ADR-021) 與 example response，對應 T027 實作的 endpoint（Foundation FR-131）

> **PR 邊界**：T022b/T022c（route integration + permission negative tests）+ T027/T027b 合併為獨立 `PR-US2-BE-API`。`[Principle: X; Backend Constitution XIII; Foundation FR-131]`

#### PR-US2-FE-COMPONENT：前端元件實作（含 component test + Storybook）

- [ ] T028 [US2] 建立前端元件（含 ARIA role、響應式）— `frontend/src/features/[module]/components/[feature]/[Feature].tsx`
- [ ] T029 [P] [US2] 建立 Storybook stories — `frontend/src/features/[module]/components/[feature]/[Feature].stories.tsx`（Default + 邊界狀態，MSW decorator）

> **PR 邊界**：T023（Vitest component test）+ T028/T029 合併為獨立 `PR-US2-FE-COMPONENT`。`[Principle: X; Frontend Constitution XVI]`

#### PR-US2-FE-PAGE：前端頁面組裝（含 E2E）

- [ ] T030 [US2] 實作前端頁面 — `frontend/src/features/[module]/pages/[feature]/[Feature]Page.tsx`

> **PR 邊界**：T024（Playwright E2E）+ T030 合併為獨立 `PR-US2-FE-PAGE`，與 `PR-US2-BE-*` 完全並行（無 breaking contract change 時）。`[Principle: X; Frontend Constitution XVI]`

**檢查點**：使用者故事 1 與 2 皆可獨立驗證

---

## Phase N：優化與跨層面關注點

- [ ] TXXX [P] 更新文件 `[Principle: I]`
- [ ] TXXX 程式碼清理 — 移除 debug `print` / `console.log` `[Principle: V]`
- [ ] TXXX UI 一致性審查（對照 MASTER.md tokens 與 prototype 畫面）`[Principle: VII]`
- [ ] TXXX 驗證 API P95 ≤ 500ms（`uv run locust -f tests/load/[feature].py --headless -u 50 -r 5 --run-time 30s`）且無無界查詢 `[Principle: VIII]`
- [ ] TXXX 安全性強化 — 驗證輸入、檢查 CORS 設定
- [ ] TXXX 執行 `touch specs/[module]/NNN-feature/.completed`

---

## 相依性

### 階段相依性

- **設置（Phase 1）**：無相依性 — 立即開始
- **基礎建設（Phase 2）**：依賴 Phase 1 — 阻塞所有使用者故事
- **使用者故事（Phase 3+）**：全部依賴 Phase 2；若團隊允許可平行執行，或按 P1 → P2 → P3 循序進行
- **優化（Phase N）**：依賴所有目標使用者故事完成

### 使用者故事內部排序

- 測試必須在任何實作開始前先撰寫且處於失敗狀態
- Model 任務 [P] 優先 → repository 層 → service 層 → API endpoint → 前端元件 → 頁面
- 在與其他故事整合前完成核心實作

### 平行化機會

- 所有 Phase 1 中標記 [P] 的任務可平行執行
- 所有 Phase 2 中標記 [P] 的任務可在階段內平行執行
- 同一使用者故事中所有標記 [P] 的測試可平行執行
- 同一使用者故事中所有標記 [P] 的 model 任務可平行執行
- 不同使用者故事可由不同團隊成員平行開發

## 平行執行範例

```
# 一起啟動可並行的基礎建設任務（Phase 2）：
Task: "在 frontend/src/locales/zh-TW/[module].json 新增 i18n keys（T010a）"
Task: "在 frontend/src/locales/en/[module].json 新增 i18n keys（T010b）"
# 注意：PR-FOUND-BE-SCHEMA（T005）必須在 PR-FOUND-BE-API（T006）之前合併
# 注意：PR-FOUND-FE-TYPES（T010c）必須在 PR-FOUND-FE-API（T007/T008）之前合併

# 在實作前一起啟動 US1 測試（同故事，不同檔案）：
Task: "在 backend/tests/unit/test_[feature].py 撰寫 service 層單元測試（T013a）"
Task: "在 frontend/src/features/[module]/__tests__/[Feature].test.tsx 撰寫前端元件測試（T014）"
Task: "在 e2e/[module]/[feature].spec.ts 撰寫 Playwright E2E 測試（T015）"
```

## 實作策略

### MVP 優先（僅使用者故事 1）

1. 完成 Phase 1：設置
2. 完成 Phase 2：基礎建設（**關鍵** — 阻塞所有使用者故事）
3. 完成 Phase 3：使用者故事 1
4. **停止並驗證**：獨立測試使用者故事 1
5. 若準備好則部署 / 展示

### 漸進交付

1. 設置 + 基礎建設 → 基底就緒
2. 加入使用者故事 1 → 獨立測試 → 部署 / 展示（MVP！）
3. 加入使用者故事 2 → 獨立測試 → 部署 / 展示
4. 加入使用者故事 3 → 獨立測試 → 部署 / 展示
5. 每個故事在不破壞前一個故事的情況下增加價值

### 團隊平行策略

當有多位開發者時：

1. 團隊一起完成設置 + 基礎建設
2. 基礎建設完成後，依使用者故事分工：
   - 開發者 A：使用者故事 1
   - 開發者 B：使用者故事 2
   - 開發者 C：使用者故事 3
3. 每個故事獨立完成並整合

---

## 任務產生規則

1. **從 spec.md 使用者故事**
   - 每個故事 → 一個 Phase（3, 4, …），各有測試 + 實作區塊
   - 所有任務標記 [USN]

2. **從 spec.md API 契約**
   - 每個 endpoint → 一個後端單元測試任務 [P] + 一個實作任務 + 一個 Bruno collection update 任務（Foundation FR-131）

3. **從 spec.md 資料模型**
   - 每個實體 → 一個模型建立任務 [P]
   - 查詢與關係 loading → repository 層任務（循序）
   - 業務規則與流程協調 → service 層任務（循序）

4. **從 plan.md 前端型別策略**
   - 有前端功能的 spec → 一個 TypeScript 型別合約任務（`frontend/src/features/[module]/types/[feature].ts`，手寫或 generated API types）
   - 此任務列於 Phase 2 `PR-FOUND-FE-TYPES`，不標記 [P]（PR-FOUND-FE-API 依賴此 PR 合併後才可開始；型別必須先存在，service 層才能 import）

5. **從 plan.md 切版分析**
   - 每個非 page 元件 → 元件實作任務 + Storybook story 任務 [P]（`.stories.tsx`）
   - Page 層元件 → 僅頁面組裝任務，不產生 story 任務
   - Story 任務需標記 [P]（與元件實作觸及不同檔案，可平行）

6. **從 plan.md 路由分析**
   - 每組新路由 → route 註冊任務（Phase 2，含 route guard 設定）

7. **從 plan.md i18n key 清單**
   - 每個 namespace → 兩個獨立 locales JSON 更新任務 [P]（T010a zh-TW + T010b en，各觸及一個檔案，Phase 2）
   - 各元件實作任務相依此任務（key 必須先存在才能在元件中使用）

8. **從 plan.md 後端 i18n key 清單**（若有新增後端 response 訊息）
   - 每個 module → 兩個獨立 Python dict 更新任務 [P]（T010d zh-TW + T010e en，各觸及一個檔案，Phase 2）
   - 各 API route 實作任務相依此任務（訊息 key 必須先存在才能在 route handler 中引用）

9. **從 plan.md DB index 分析**
   - 每個新 index → 在 migration 任務中一併處理（不另立任務）
   - 若有複合 index 或部分 index 等非常規策略 → 加入 Phase 2 備註說明理由

10. **排序規則**
   - 設置 → 基礎建設（含 migration + route + i18n + types）→ 每個 US（測試 → 實作 + story）→ 優化
   - 相依性阻塞平行執行

## 定義完成（適用所有任務）

任務標記完成前，以下所有指令必須通過（exit 0）：

```bash
# Backend（從 backend/ 執行）
uv run pytest tests/ -q
uv run pytest --cov=app tests/ -q        # coverage check
uv run mypy .
uv run ruff check . && uv run ruff format --check .
# 含 @pytest.mark.security 標記的安全洩漏測試必須全數通過

# Frontend（從 frontend/ 執行）
pnpm tsc --noEmit
pnpm lint
pnpm test
pnpm exec playwright test                # E2E gate
```

加上：`/speckit.analyze` 回報零發現。

---

## 驗證清單

在標記任務完成前進行驗證：

- [ ] 所有使用者故事都有對應的 Phase，包含測試 + 實作
- [ ] 所有測試都列在對應的實作任務之前
- [ ] 標記 [P] 的平行任務確實觸及不同檔案
- [ ] 每個 artifact-producing 任務都指定了確切的檔案路徑；command-only verification 任務需標明驗證命令且可不觸及檔案
- [ ] 所有基礎建設任務（Phase 2）都標記為阻塞
- [ ] Migration 任務含 T004a / T004b（downgrade）/ T004c（循環驗證）三項
- [ ] Phase 2 有 MSW handler 任務（Storybook + Vitest 共用）
- [ ] 路由分析的每組路由都有對應的 route 註冊任務（含 route guard）
- [ ] i18n key 清單的每個 namespace 都有兩個獨立 locales JSON 更新任務（T010a zh-TW + T010b en，各觸及一個檔案）
- [ ] 每個 US 的後端測試含 service 單元 / route 整合 / permission negative 三層
- [ ] 每個 US 有前端 Vitest 元件測試任務（`.test.tsx`）
- [ ] 每個非 page 前端元件都有對應的 `.stories.tsx` 任務（含 MSW decorator 需求）
- [ ] Story 任務涵蓋 Default + 邊界狀態（Empty / Loading / Error）
- [ ] 優化階段包含文件、清理、安全性與效能（含 P95 量測工具）檢查
- [ ] 每個使用者故事 Phase 的故事目標皆追蹤至至少一個 SC-ID（來自 spec.md 成功標準）
- [ ] Phase 2 拆分為 PR-FOUND-MIGRATION / PR-FOUND-BE-SCHEMA / PR-FOUND-BE-API / PR-FOUND-BRUNO（或 N > 5 時拆為 PR-FOUND-BRUNO-INIT + PR-FOUND-BRUNO-SKEL）/ PR-FOUND-BE-CORE / PR-FOUND-FE-API / PR-FOUND-FE-ROUTING / PR-FOUND-FE-I18N / PR-FOUND-BE-I18N（條件性，若本功能有新增後端訊息）/ PR-FOUND-FE-TYPES 九至十一個獨立 PR 邊界
- [ ] Phase 2 有前端 TypeScript 型別合約任務（`frontend/src/features/[module]/types/[feature].ts`），且其 PR 邊界（PR-FOUND-FE-TYPES）早於 services / components 任務
- [ ] Migration PR 邊界（PR-FOUND-MIGRATION）不含任何應用程式碼，且 PR description 模板含 Rollback Plan 欄位
- [ ] 每個 US Phase 的實作區塊含 PR-USN-BE-MODEL / PR-USN-BE-REPO / PR-USN-BE-SERVICE / PR-USN-BE-API 以及 PR-USN-FE-COMPONENT / PR-USN-FE-PAGE 邊界標記
- [ ] 每個 PR 邊界觸及檔案數 ≤ 5 個、diff ≤ 300 行（兩者皆依 Principle X 排除測試、lockfile、產生檔、工具／專案設定檔、空或僅 re-export 的 `__init__.py`/`index.ts`，以及 `specs/**`／`openspec/**`）
- [ ] 每個 `PR-USN-BE-API` 含對應的 Bruno `.bru` 更新任務（Foundation FR-131）；`PR-FOUND-BRUNO` 含 T006b（集合初始化）與 T006c（endpoint skeleton，每個 .bru 檔案逐一明列）兩項 Bruno 任務，且與 `PR-FOUND-BE-API`（T006 route skeleton）分為兩個獨立 PR 邊界；若功能端點數 N > 5，T006b/T006c 進一步拆為 `PR-FOUND-BRUNO-INIT`（3 個 bootstrap 檔案）與 `PR-FOUND-BRUNO-SKEL`（每批 ≤ 5 個 .bru skeleton）

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.23.0 | 2026-08-26 | 同步 Constitution v1.33.0（issue #424）：PR 規模門檻的檔案數與行數改為只計算手寫生產程式碼，共用同一份排除清單；PR-FOUND-BRUNO 邊界原本依賴「3+2=5 恰好達上限」的推算，因 bootstrap 設定檔被排除而重算為 N ≤ 5 |
| 1.22.5 | 2026-08-25 | 驗證清單的 mypy 指令由 `uv run mypy app/ --strict` 校準為 `uv run mypy .`，對齊 CLAUDE.md、CI 與正典 spec v1.12.3 的 SC-002（本樣板依 ADR-033 已 Deprecated，此處僅同步指令措辭，未改動任務粒度規則） |
| 1.22.4 | 2026-06-05 | 任務相依順序與驗證清單補齊 Repository 層：Model → Repository → Service → API，並要求每個 US Phase 含 PR-USN-BE-REPO |
| 1.22.3 | 2026-06-05 | 後端 schema、route、model、service 任務路徑改為 `backend/app/modules/[module]/{schemas,router,models,service}/[feature].py`，對齊 module-first 與 feature 分檔規則 |
| 1.22.2 | 2026-06-05 | Bruno skeleton 與 update 任務路徑改為 `backend/bruno/[module]/[feature]/<api>.bru`，對齊模組 → 功能 → API 分層追蹤 |
| 1.22.1 | 2026-06-04 | 修正 Phase 2 邊界數量驗證文字，納入 PR-FOUND-BRUNO 於端點數 N > 2 時拆為 PR-FOUND-BRUNO-INIT / PR-FOUND-BRUNO-SKEL 的條件性增加，總數由九至十個調整為九至十一個 |
| 1.22.0 | 2026-06-04 | 新增 PR-FOUND-BE-I18N Phase 2 邊界（T010d zh-TW + T010e en），確保後端 app/i18n/ 訊息檔案在功能新增 API response 訊息時由 /speckit.tasks 產出；任務產生規則新增第 8 條（後端 i18n key 清單 → 兩個獨立任務）；驗證清單更新至九至十個邊界（PR-FOUND-BE-I18N 為條件性）；對齊 ADR-026 |
| 1.21.0 | 2026-06-04 | PR-FOUND-BRUNO 邊界規則加入端點數 N > 2 時的拆分策略（BRUNO-INIT/BRUNO-SKEL），避免超出 ≤5 files gate |
| 1.20.0 | 2026-06-04 | 任務產生規則 §2 加入 Bruno collection update 任務（每個 endpoint → 後端測試 + 實作 + Bruno update，Foundation FR-131） |
| 1.19.0 | 2026-06-04 | 將 T006b/T006c 從 PR-FOUND-BE-API 拆出為獨立 PR-FOUND-BRUNO 邊界，避免突破 ≤5 files gate；T018b/T027b 的 auth 描述由 auth header 改為 auth cookie/session (ADR-021) |
| 1.18.0 | 2026-06-03 | 拆分 T006b 為 T006b（集合初始化，明列 bruno.json + environments/*.bru）與 T006c（endpoint skeleton，每個 .bru 逐一明列）；更新 PR-FOUND-BE-API 邊界與驗證清單，對齊 testing-constitution Rule II（每個 artifact-producing 任務必須列出所有產出檔案） |
| 1.17.0 | 2026-06-03 | （版本號保留，與 1.16.0 合併）|
| 1.16.0 | 2026-06-03 | 移除 T010c 的 [P] marker（PR-FOUND-FE-TYPES 必須在 PR-FOUND-FE-API 之前合併，service 層依賴型別先存在）；更新 PR-FOUND-FE-API 標頭明示依賴 FE-TYPES；修正平行執行範例（移除誤導性的 schema+API route 並行示範）；補齊 US2 完整測試層（T022a service / T022b route / T022c permission / T023 FE component）並重新編號 US2 實作任務（T025–T030）；更新 Task Generation Rule §4 說明 |
| 1.15.0 | 2026-06-03 | 移除 T005（PR-FOUND-BE-SCHEMA）的 [P] marker（依賴 migration PR 合併，有未完成相依性）；加入 PR-FOUND-FE-TYPES 邊界（T010c）建立前端 TypeScript 型別合約，Task Generation Rule §4 補充型別策略，驗證清單補齊；移除 T013c 的 [P] marker（與 T013b 同檔案，不可平行） |
| 1.14.0 | 2026-06-03 | 修正 Phase 2 與 US2 任務編號順序，移除 schema-dependent API task 的 parallel marker，補齊 migration downgrade 與 routing 任務的具體檔案路徑 |
| 1.13.0 | 2026-06-03 | 將 user-story 前端 component/page/story/test 任務由目錄或泛稱改為具體檔案路徑，對齊 testing-constitution Rule II 的 one-file task 要求 |
| 1.12.0 | 2026-06-03 | 拆分後端 foundation 與 user-story PR 邊界（schema/model/service/API route 分離），拆分前端 user-story PR 邊界（component+test+Storybook 與 page+E2E 分離），並允許 command-only verification 任務不觸及檔案 |
| 1.11.0 | 2026-06-03 | 將 PR-FOUND-FE 拆分為 PR-FOUND-FE-API、PR-FOUND-FE-ROUTING、PR-FOUND-FE-I18N，避免 service/MSW/router/i18n 基礎建設合併到同一 review unit，對齊 frontend-constitution Rule XVI |
| 1.10.0 | 2026-06-03 | T010 拆為 T010a（zh-TW）與 T010b（en）兩個獨立任務（各觸及一個檔案），對齊 testing-constitution Rule II（Task Decomposition For Testability）；更新 PR-FOUND-FE 邊界清單、任務產生規則 §6、驗證清單 |
| 1.9.0 | 2026-06-02 | Phase 2 拆分為三個獨立 PR 邊界（PR-FOUND-MIGRATION / PR-FOUND-BE / PR-FOUND-FE）；Phase 3/4 實作區塊加入 PR-USN-BE / PR-USN-FE 邊界標記；驗證清單新增四項 PR 粒度檢查；對齊 constitution v1.30.0 Principle I、X、XVIII |
| 1.8.1 | 2026-05-28 | 將 **Story Goal** 改為 **故事目標**（中文化）；驗證清單用詞同步 |
| 1.8.0 | 2026-05-28 | 每個 Phase 的「目標」改為「Story Goal → 追蹤至 SC-XXX」格式；驗證清單加入 SC-ID 追蹤性檢查 |
| 1.7.0 | 2026-05-27 | senior-backend + senior-frontend 評估後補全：T004 拆為 T004a/b/c（downgrade + 循環驗證）；加入 T008 MSW handler 任務、T011 Exception class 任務；Phase 3 測試拆為 service / route / permission negative / Vitest 四層；實作任務加入 Loading Strategy 和 ARIA 說明；Storybook 任務標注 MSW decorator 需求；Phase N P95 驗證加工具；驗證清單加 5 項新檢查 |
| 1.6.0 | 2026-05-27 | Phase 2 加入 route 註冊任務與 i18n JSON 任務；任務產生規則新增第 5–8 條（路由、i18n、DB index、排序）；驗證清單加入 migration index、route、i18n 三項檢查 |
| 1.5.0 | 2026-05-27 | Phase 3/4 加入 Storybook story 任務（[P]，.stories.tsx）；任務產生規則新增第 4 條（切版分析 → story 任務）；驗證清單加入 story 完整性檢查 |
| 1.4.0 | 2026-05-27 | Add global Definition of Done section with verification commands before validation checklist |
| 1.3.0 | 2026-05-22 | 對齊 spec 實例格式：改為 --- frontmatter + 中文 H1，全面中文化章節標題與說明文字 |
| 1.2.0 | 2026-05-21 | Add HTML meta-comment, T008/T009 foundational tasks, intra-US ordering rules, parallel opportunities, Implementation Strategy section |
| 1.1.0 | 2026-05-21 | Add Execution Flow, Dependencies, Parallel Example, Task Generation Rules, Validation Checklist; strengthen TDD gate language |
| 1.0.1 | 2026-05-21 | Align task paths with module-based SDD directory structure |
| 1.0.0 | — | Initial spec |

---
功能分支: feat/[module]/NNN-feature
建立日期: YYYY-MM-DD
版本: 1.16.0
狀態: Draft
---

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

- [ ] T004a 撰寫 Alembic migration `upgrade()`（含 plan.md DB index 分析所列的所有 index）— `backend/migrations/versions/xxxx_[feature].py`
- [ ] T004b 撰寫對應 `downgrade()`（不允許 `pass`，必須可逆）— `backend/migrations/versions/xxxx_[feature].py`
- [ ] T004c 驗證 migration 可循環：`uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`

> **PR 邊界**：T004a/b/c 合併為獨立 `PR-FOUND-MIGRATION`，PR description 必須含 Rollback Plan 欄位，不得與任何應用程式碼合併。`[Principle: XVIII]`

### PR-FOUND-BE-SCHEMA：後端 Schema 基礎建設（依賴 PR-FOUND-MIGRATION merged）

- [ ] T005 建立 Pydantic schemas — Base / Create / Update / Response（`backend/app/schemas/[feature].py`，依 plan.md schema 層次設計）

> **PR 邊界**：T005 作為獨立 `PR-FOUND-BE-SCHEMA`。`[Principle: X; Backend Constitution XIII]`

### PR-FOUND-BE-API：後端 API Skeleton 基礎建設（依賴 PR-FOUND-BE-SCHEMA merged）

- [ ] T006 建立 API route skeleton 含 auth dependency（`backend/app/api/routes/[feature].py`，依 plan.md Auth Dependency 欄）

> **PR 邊界**：T006 作為獨立 `PR-FOUND-BE-API`。`[Principle: X; Backend Constitution XIII]`

### PR-FOUND-FE-API：前端 API 基礎建設（依賴 PR-FOUND-FE-TYPES merged；可與 PR-FOUND-BE-* 並行）

- [ ] T007 [P] 建立前端 service 層與 queryKey factory（`frontend/src/features/[module]/services/[feature].ts`，依 plan.md TanStack Query 策略）
- [ ] T008 [P] 建立 MSW handler（`frontend/src/mocks/handlers/[feature].ts`）— Storybook、Vitest、本地開發共用

> **PR 邊界**：T007/T008 合併為獨立 `PR-FOUND-FE-API`（API service/query keys + MSW handlers）。`[Principle: X; Frontend Constitution XVI]`

### PR-FOUND-FE-ROUTING：前端路由基礎建設（可與 PR-FOUND-FE-API 並行）

- [ ] T009 [P] 註冊路由並設定 route guard（`frontend/src/router/index.tsx` — 依 plan.md 路由分析）

> **PR 邊界**：T009 作為獨立 `PR-FOUND-FE-ROUTING`（router registration + route guard）。`[Principle: X; Frontend Constitution XVI]`

### PR-FOUND-FE-I18N：前端 i18n 基礎建設（可與 PR-FOUND-FE-API 並行）

- [ ] T010a [P] 新增 i18n keys — zh-TW（`frontend/src/locales/zh-TW/[module].json` — 依 plan.md i18n key 清單）
- [ ] T010b [P] 新增 i18n keys — en（`frontend/src/locales/en/[module].json` — 依 plan.md i18n key 清單）

> **PR 邊界**：T010a/T010b 合併為獨立 `PR-FOUND-FE-I18N`（i18n namespace files）。`[Principle: X; Frontend Constitution XVI; Testing Constitution II]`

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

- [ ] T013a [P] [US1] Service 層單元測試（mock DB session，測試業務邏輯分支）— `backend/tests/unit/test_[feature].py`
- [ ] T013b [P] [US1] Route 層整合測試（httpx AsyncClient + real test DB，測試 auth / status code）— `backend/tests/integration/test_[feature].py`
- [ ] T013c [US1] Permission negative test（未授權角色嘗試存取，驗證回 403 或 404）— `backend/tests/integration/test_[feature].py`
- [ ] T014 [P] [US1] 前端元件測試（Testing Library，依 MSW handler mock API）— `frontend/src/features/[module]/__tests__/[Feature].test.tsx`
- [ ] T015 [P] [US1] Playwright E2E 測試（完整用戶流程）— `e2e/[module]/[feature].spec.ts`

### 實作（僅在測試失敗後進行）

#### PR-US1-BE-MODEL：後端資料模型實作

- [ ] T016 [P] [US1] 建立資料模型（`backend/app/models/[feature].py`）— 含 relationship 與 Loading Strategy

> **PR 邊界**：T016 作為獨立 `PR-US1-BE-MODEL`。`[Principle: X; Backend Constitution XIII]`

#### PR-US1-BE-SERVICE：後端 Service 實作（含 service 測試）

- [ ] T017 [US1] 實作 service 層（`backend/app/services/[feature].py`）— 明確指定 `selectinload`/`joinedload`

> **PR 邊界**：T013a（service 單元測試）+ T017 合併為獨立 `PR-US1-BE-SERVICE`。`[Principle: X; Backend Constitution XIII]`

#### PR-US1-BE-API：後端 API 實作（含 route / permission 測試）

- [ ] T018 [US1] 實作 API endpoint（`backend/app/api/routes/[feature].py`）— 含 auth dependency

> **PR 邊界**：T013b/T013c（route integration + permission negative tests）+ T018 合併為獨立 `PR-US1-BE-API`。`[Principle: X; Backend Constitution XIII]`

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

- [ ] T022a [US2] Service 層單元測試（mock DB session，測試業務邏輯分支）— `backend/tests/unit/test_[feature].py`（擴充 US1 同檔案；不可與 T013a 並行）
- [ ] T022b [US2] Route 層整合測試（httpx AsyncClient + real test DB，測試 auth / status code）— `backend/tests/integration/test_[feature].py`（擴充 US1 同檔案；不可與 T013b 並行）
- [ ] T022c [US2] Permission negative test（未授權角色嘗試存取，驗證回 403 或 404）— `backend/tests/integration/test_[feature].py`（擴充 US1 同檔案）
- [ ] T023 [US2] 前端元件測試（Testing Library，依 MSW handler mock API）— `frontend/src/features/[module]/__tests__/[Feature].test.tsx`（擴充 US1 同檔案；不可與 T014 並行）
- [ ] T024 [US2] Playwright E2E 測試（完整用戶流程）— `e2e/[module]/[feature].spec.ts`（擴充 US1 同檔案；不可與 T015 並行）

### 實作（僅在測試失敗後進行）

#### PR-US2-BE-MODEL：後端資料模型實作

- [ ] T025 [P] [US2] 建立相關模型（含 Loading Strategy）— `backend/app/models/[feature].py`

> **PR 邊界**：T025 作為獨立 `PR-US2-BE-MODEL`。`[Principle: X; Backend Constitution XIII]`

#### PR-US2-BE-SERVICE：後端 Service 實作（含 service 單元測試）

- [ ] T026 [US2] 實作 service 層（明確指定 relationship loading）— `backend/app/services/[feature].py`

> **PR 邊界**：T022a（service 單元測試）+ T026 合併為獨立 `PR-US2-BE-SERVICE`。`[Principle: X; Backend Constitution XIII]`

#### PR-US2-BE-API：後端 API 實作（含 route / permission 測試）

- [ ] T027 [US2] 實作 API endpoint（含 auth dependency）— `backend/app/api/routes/[feature].py`

> **PR 邊界**：T022b/T022c（route integration + permission negative tests）+ T027 合併為獨立 `PR-US2-BE-API`。`[Principle: X; Backend Constitution XIII]`

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
- Model 任務 [P] 優先 → service 層 → API endpoint → 前端元件 → 頁面
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
   - 每個 endpoint → 一個後端單元測試任務 [P] + 一個實作任務

3. **從 spec.md 資料模型**
   - 每個實體 → 一個模型建立任務 [P]
   - 關係 → service 層任務（循序）

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

8. **從 plan.md DB index 分析**
   - 每個新 index → 在 migration 任務中一併處理（不另立任務）
   - 若有複合 index 或部分 index 等非常規策略 → 加入 Phase 2 備註說明理由

9. **排序規則**
   - 設置 → 基礎建設（含 migration + route + i18n + types）→ 每個 US（測試 → 實作 + story）→ 優化
   - 相依性阻塞平行執行

## 定義完成（適用所有任務）

任務標記完成前，以下所有指令必須通過（exit 0）：

```bash
# Backend（從 backend/ 執行）
uv run pytest tests/ -q
uv run pytest --cov=app tests/ -q        # coverage check
uv run mypy app/ --strict
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
- [ ] Phase 2 拆分為 PR-FOUND-MIGRATION / PR-FOUND-BE-SCHEMA / PR-FOUND-BE-API / PR-FOUND-BE-CORE / PR-FOUND-FE-API / PR-FOUND-FE-ROUTING / PR-FOUND-FE-I18N / PR-FOUND-FE-TYPES 八個獨立 PR 邊界
- [ ] Phase 2 有前端 TypeScript 型別合約任務（`frontend/src/features/[module]/types/[feature].ts`），且其 PR 邊界（PR-FOUND-FE-TYPES）早於 services / components 任務
- [ ] Migration PR 邊界（PR-FOUND-MIGRATION）不含任何應用程式碼，且 PR description 模板含 Rollback Plan 欄位
- [ ] 每個 US Phase 的實作區塊含 PR-USN-BE-MODEL / PR-USN-BE-SERVICE / PR-USN-BE-API 以及 PR-USN-FE-COMPONENT / PR-USN-FE-PAGE 邊界標記
- [ ] 每個 PR 邊界觸及檔案數 ≤ 5 個（不含測試時 diff ≤ 300 行）

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
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

---
功能分支: feat/[module]/NNN-feature
建立日期: YYYY-MM-DD
版本: 1.0.0
狀態: Draft
---

# 任務：[功能名稱]

**輸入**: `specs/[module]/NNN-feature/` 下的設計文件
**前置條件**: plan.md（必填）、spec.md（必填）

## 執行流程

```
1. 從功能規格目錄載入 plan.md
   → 若未找到：ERROR "No implementation plan found"
   → 萃取：技術堆疊、架構層、受影響檔案
2. 載入 spec.md
   → 萃取：使用者故事 → 對應至 Phase 3/4/...
   → 萃取：API 契約 → 契約測試任務
   → 萃取：資料模型 → model/schema 任務
3. 依類別產生任務：
   → Phase 1：設置（共用基礎設施、套件）
   → Phase 2：基礎建設（schema、routes skeleton、service 層）
   → Phase 3+：每個使用者故事一個 phase（測試優先，再實作）
   → Phase N：優化（文件、清理、安全性、效能）
4. 套用任務規則：
   → 不同檔案 = 標記 [P] 平行執行
   → 相同檔案 = 循序執行（不標記 [P]）
   → 測試必須在實作前（TDD）
   → 每個任務以 [USN] 標記對應的使用者故事
5. 循序編號任務（T001, T002…）
6. 產生相依性圖
7. 驗證任務完整性（見驗證清單）
8. 返回：SUCCESS（任務準備好進入 /speckit.implement）
```

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

- [ ] T004 建立資料庫 schema 與 migration
- [ ] T005 [P] 建立 Pydantic schemas（`backend/app/schemas/[feature].py`）
- [ ] T006 [P] 建立 API route skeleton（`backend/app/api/routes/[feature].py`）
- [ ] T007 建立前端 service 層（`frontend/src/features/[module]/services/[feature].ts`）
- [ ] T008 [P] 設定錯誤處理與日誌基礎設施（`backend/app/core/errors.py`）
- [ ] T009 [P] 設定環境與設定管理（`backend/app/core/config.py`）

**檢查點**：基礎建設完成 — 可開始實作使用者故事

---

## Phase 3：使用者故事 1 — [標題]（優先級：P1）🎯 MVP

**目標**：[此故事交付的內容]

**獨立測試方式**：[如何獨立驗證此故事]

### 測試 ⚠️ 必須在任何實作前先撰寫且必須失敗

- [ ] T010 [P] [US1] 後端單元測試（`backend/tests/unit/test_[feature].py`）
- [ ] T011 [P] [US1] Playwright E2E 測試（`frontend/tests/[module]/[feature].spec.ts`）

### 實作（僅在測試失敗後進行）

- [ ] T012 [P] [US1] 建立資料模型（`backend/app/models/[feature].py`）
- [ ] T013 [US1] 實作 service 層（`backend/app/services/[feature].py`）
- [ ] T014 [US1] 實作 API endpoint（`backend/app/api/routes/[feature].py`）
- [ ] T015 [US1] 建立前端元件（`frontend/src/features/[module]/components/[feature]/`）
- [ ] T016 [US1] 實作前端頁面（`frontend/src/features/[module]/pages/[feature]/`）

**檢查點**：使用者故事 1 可獨立驗證

---

## Phase 4：使用者故事 2 — [標題]（優先級：P2）

**目標**：[此故事交付的內容]

**獨立測試方式**：[如何獨立驗證此故事]

### 測試 ⚠️ 必須在任何實作前先撰寫且必須失敗

- [ ] T020 [P] [US2] 後端單元測試
- [ ] T021 [P] [US2] Playwright E2E 測試

### 實作（僅在測試失敗後進行）

- [ ] T022 [P] [US2] 建立相關模型
- [ ] T023 [US2] 實作 service 層
- [ ] T024 [US2] 實作 API endpoint
- [ ] T025 [US2] 建立前端元件與頁面

**檢查點**：使用者故事 1 與 2 皆可獨立驗證

---

## Phase N：優化與跨層面關注點

- [ ] TXXX [P] 更新文件 `[Principle: I]`
- [ ] TXXX 程式碼清理 — 移除 debug `print` / `console.log` `[Principle: V]`
- [ ] TXXX UI 一致性審查（對照 MASTER.md tokens 與 prototype 畫面）`[Principle: VII]`
- [ ] TXXX 驗證 API P95 ≤ 500ms 且無無界查詢 `[Principle: VIII]`
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
# 一起啟動基礎建設任務（Phase 2）：
Task: "在 backend/app/schemas/[feature].py 建立 Pydantic schemas"
Task: "在 backend/app/api/routes/[feature].py 建立 API route skeleton"

# 在實作前一起啟動 US1 測試：
Task: "在 backend/tests/unit/test_[feature].py 撰寫後端單元測試"
Task: "在 frontend/tests/[module]/[feature].spec.ts 撰寫 Playwright E2E 測試"
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

4. **排序規則**
   - 設置 → 基礎建設 → 每個 US（測試 → 實作）→ 優化
   - 相依性阻塞平行執行

## 定義完成（適用所有任務）

任務標記完成前，以下所有指令必須通過（exit 0）：

```bash
# Backend（從 backend/ 執行）
uv run pytest tests/ -q
uv run mypy app/ --strict
uv run ruff check . && uv run ruff format --check .

# Frontend（從 frontend/ 執行）
pnpm tsc --noEmit
pnpm lint
pnpm test
```

加上：`/speckit.analyze` 回報零發現。

---

## 驗證清單

在標記任務完成前進行驗證：

- [ ] 所有使用者故事都有對應的 Phase，包含測試 + 實作
- [ ] 所有測試都列在對應的實作任務之前
- [ ] 標記 [P] 的平行任務確實觸及不同檔案
- [ ] 每個任務都指定了確切的檔案路徑
- [ ] 所有基礎建設任務（Phase 2）都標記為阻塞
- [ ] 優化階段包含文件、清理、安全性與效能檢查

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.4.0 | 2026-05-27 | Add global Definition of Done section with verification commands before validation checklist |
| 1.3.0 | 2026-05-22 | 對齊 spec 實例格式：改為 --- frontmatter + 中文 H1，全面中文化章節標題與說明文字 |
| 1.2.0 | 2026-05-21 | Add HTML meta-comment, T008/T009 foundational tasks, intra-US ordering rules, parallel opportunities, Implementation Strategy section |
| 1.1.0 | 2026-05-21 | Add Execution Flow, Dependencies, Parallel Example, Task Generation Rules, Validation Checklist; strengthen TDD gate language |
| 1.0.1 | 2026-05-21 | Align task paths with module-based SDD directory structure |
| 1.0.0 | — | Initial spec |

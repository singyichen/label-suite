---
功能分支: feat/foundation/000-foundation
建立日期: 2026-05-29
版本: 1.0.0
狀態: Draft
---

# 工程基準規格：Foundation — 跨模組共同約束

## 功能目標

本規格定義 Label Suite 所有功能模組的工程基準（Engineering Baseline）。在任何 feature spec 進入實作之前，工程師必須能回答「這個功能依賴哪些共同約束？」並在本規格中找到明確答案。

**需求來源**：Information Architecture v1.4.3 §6.1 Foundation Spec 關係；五名跨領域專家代理評估（2026-05-29）

---

## 輸入與產生規則

**輸入描述**：依 IA v1.4.3 §6.1 定義，Foundation Spec 作為所有 feature spec 的上游工程基準，涵蓋架構邊界、API 慣例、錯誤格式、測試策略、task config extensibility、安全約束。

**產生規格時必須遵守**：

1. 本規格不描述單一使用者頁面或功能旅程；所有約束均以「系統行為」為陳述主語。
2. 每項約束均標記優先級（P0/P1/P2）與下游影響範圍。
3. 所有 FR-* 以「系統必須」開頭；SC-* 必須可透過 pytest / mypy / tsc / ruff 或明確的整合測試驗證。
4. 本規格與 Constitution 衝突時，Constitution 為最高準則。
5. 本規格與個別 feature spec 衝突時，本規格優先；feature spec 須更新以符合本規格。

**已釐清事項**：

- Foundation Spec 不取代 IA，也不定義單一頁面 UX。
- `foundation` 不在 speckit 的標準 module 清單中；本規格以直接建目錄方式建立，不透過 `create-new-feature.sh`。
- 所有 ADR 決策（ADR-021 JWT 策略、ADR-022 State Machine 位置）已在本規格引用前先行記錄。

---

## 規格常數

- `ACCESS_TOKEN_TTL = 15 分鐘`
- `REFRESH_TOKEN_TTL = 7 天（sliding）`
- `MIN_ANNOTATORS_FOR_DRY_RUN = 2`
- `API_VERSION_PREFIX = /api/v1`
- `PAGINATION_DEFAULT_PAGE_SIZE = 20`
- `PAGINATION_MAX_PAGE_SIZE = 100`
- `IAA_ALGORITHM_CLASSIFICATION = Krippendorff's Alpha`
- `IAA_ALGORITHM_SCORING = ICC`
- `IAA_ALGORITHM_SPAN = Pairwise F1`
- `MOBILE_BP = 767px`（唯一斷點，解決 account-001 / annotation-015 / shared-008 的三處分散定義）
- `LOCALSTORAGE_LANG_KEY = labelsuite.lang`（唯一宣告，解決 account-001 / shared-008 的初始化重疊）
- `LOCALSTORAGE_TASK_TYPE_KEY = labelsuite.activeTaskType`（唯一宣告，解決 annotation-015 / shared-008 的重複定義）

---

## P0 — 阻擋所有功能實作的核心約束

> 以下六項是所有 feature spec 進入 Generator 階段的前提。

### F-01：API 合約基準（P0）

**目標**：確保前後端所有 API 以一致的結構溝通，讓任何模組可獨立開發而不產生契約衝突。

**約束情境 1 — 請求 / 回應格式**：

1. **Given** 任何 API 端點接收請求，**When** 請求格式有誤，**Then** 系統必須回傳 `422 Unprocessable Entity`，body 符合 `ErrorResponse` schema（欄位：`detail`）。
2. **Given** 任何 list 端點，**When** 回傳多筆資料，**Then** 必須使用 `PaginatedResponse[T]` wrapper（欄位：`items`, `total`, `page`, `page_size`）。
3. **Given** 任何 create 端點成功，**When** 資源建立完成，**Then** 回傳 `201 Created` + `Location` header 指向新資源 URI。

**約束情境 2 — 路由命名**：

1. **Given** 任何新 API 端點，**When** 命名路由，**Then** 路徑格式必須為 `{API_VERSION_PREFIX}/[module]/[resource]`，resource 使用複數名詞。
2. **Given** 權限不足的請求，**When** 資源存在但使用者無權，**Then** 回傳 `404 Not Found`（不得洩漏資源存在）。

### 功能需求

- **FR-001**：所有 API 端點的 request body 必須以 Pydantic schema（`app/schemas/`）驗證。
- **FR-002**：所有 API 端點必須聲明 `response_model=`；不得直接回傳 ORM 物件。
- **FR-003**：所有 list 端點必須支援 `page` 與 `page_size` 查詢參數，預設值分別為 `1` 與 `PAGINATION_DEFAULT_PAGE_SIZE`，上限為 `PAGINATION_MAX_PAGE_SIZE`。
- **FR-004**：所有路由必須透過 `APIRouter` 以 module prefix 與 tags 組織；不得在 `main.py` 直接定義業務路由。

---

### F-02：雙層角色模型（P0）

**目標**：在所有功能模組中，系統角色與任務角色嚴格分離，避免權限升級與跨任務資料洩漏。

**約束情境 1 — 系統角色**：

1. **Given** 使用者登入成功，**When** 系統核發 JWT，**Then** payload 必須包含 `sub`（user_id）、`role`（`user` | `super_admin`）、`iat`、`exp`，且任務角色不得出現在 JWT 中。
2. **Given** 受保護路由收到請求，**When** 驗證通過，**Then** `current_user` dependency 必須注入，不得有任何路由繞過此依賴。

**約束情境 2 — 任務角色**：

1. **Given** 使用者進入任何任務相關頁面，**When** 前端需要判斷任務角色，**Then** 必須透過 `GET /api/v1/tasks/{task_id}/membership` 取得，不得從 JWT 或 localStorage 推斷。
2. **Given** 任務操作請求（非 admin），**When** 後端執行任務相關 CRUD，**Then** 必須先驗證 `task_membership`，不得僅靠系統角色判斷。

### 功能需求

- **FR-005**：JWT payload 僅包含 `sub`、`role`、`iat`、`exp`；task role 不得進入 JWT。
- **FR-006**：所有任務範疇操作必須在路由或 `permissions.py` 中驗證 `task_membership`；CRUD helpers 不得內嵌權限邏輯。
- **FR-007**：`DashboardPage` 以明確的 `role ===` 判斷分派；未知 role 必須清除 session 並導頁至 `/login`。

---

### F-03：JWT + Refresh Token 端對端認證（P0）

**目標**：保護所有受保護端點，同時確保標記者長工作段（30–90 分鐘）不因 token 過期中斷。

> 完整決策見 [ADR-021](../../../docs/adr/021-jwt-refresh-token-auth.md)。

**約束情境 1 — Token 核發與儲存**：

1. **Given** 登入成功，**When** 系統核發 token，**Then** access token（TTL = `ACCESS_TOKEN_TTL`）與 refresh token（TTL = `REFRESH_TOKEN_TTL`）均以 `httpOnly; Secure; SameSite=Lax` cookie 傳送；不得以 JSON body 或 localStorage 傳遞 token。
2. **Given** refresh token 使用一次，**When** `/auth/refresh` 成功，**Then** 舊 refresh token 必須立即作廢（one-time use rotation）。

**約束情境 2 — 前端靜默更新**：

1. **Given** API 呼叫收到 `401`，**When** 前端 middleware 觸發，**Then** 自動呼叫 `/auth/refresh` 一次並重試原請求；若 refresh 失敗，導頁至 `/login`。
2. **Given** 使用者登出，**When** `/auth/logout` 呼叫成功，**Then** `refresh_tokens` 表對應 row 必須被 soft-delete；cookie 清除。

### 功能需求

- **FR-008**：系統必須維護 `refresh_tokens` 資料表（`user_id`, `token_hash`, `expires_at`, `revoked_at`）以支援 token 撤銷。
- **FR-009**：Zustand `useAuthStore` 僅保存解碼後的 JWT claims（記憶體），不得持久化至 `localStorage`。
- **FR-010**：`/auth/refresh` 必須實作 refresh token rotation；偵測到 reuse attack（已作廢 token 被使用）時，撤銷該使用者的所有 token。

---

### F-04：Task Type Registry（P0）

**目標**：確保平台永遠不含 `if task_type ==` 的硬編碼分支，使新 task type 僅需新增 config，不需修改核心程式碼。

> 完整決策見 [ADR-010](../../../docs/adr/010-config-driven-architecture.md)。

**約束情境 1 — 新增 task type**：

1. **Given** 研究者提供新的 task config YAML，**When** 透過 task 建立 API 上傳，**Then** 系統以 Pydantic schema 驗證；驗證通過才寫入 DB（JSONB）；驗證失敗回傳 `422`，不建立任何資料。
2. **Given** 核心服務需要依 task_type 決定行為，**When** 程式碼中出現任何 `if task_type ==`，**Then** 此行為視為違規，Evaluator 必須在 `speckit.analyze` 中偵測並阻擋。

**約束情境 2 — Metric Registry**：

1. **Given** config 引用一個 metric，**When** task 建立時，**Then** 系統必須在 `metrics/registry.py` 中找到對應的 metric 實作；找不到則回傳 `422`。

### 功能需求

- **FR-011**：task config schema 以 Pydantic 定義並存於 `app/schemas/task_config.py`；支援的 task type：`single_sentence_classification` / `single_sentence_va_scoring` / `sequence_labeling` / `relation_extraction` / `sentence_pairs`。
- **FR-012**：所有 metric 實作統一註冊於 `app/metrics/registry.py`；config 中引用的 metric key 必須在 registry 中存在。
- **FR-013**：前端 task type 相關的 UI 元件必須以 `TASK_TYPE_REGISTRY`（Widget Registry 模式）驅動，不得以 `if/switch` 硬編碼 task type 渲染邏輯。

---

### F-05：安全基準（P0）

**目標**：為所有模組建立最低安全標準，消除 OWASP Top 10 中與本系統相關的風險。

**約束情境 1 — 輸入驗證**：

1. **Given** 任何來自使用者的輸入，**When** 傳入後端，**Then** 必須經過 Pydantic schema 驗證；原始值不得直接進入 SQL 查詢或回應 body。
2. **Given** 前端渲染使用者產生的內容，**When** 輸出至 DOM，**Then** 不得使用 `dangerouslySetInnerHTML`，所有插值必須透過 React 的預設 escaping。

**約束情境 2 — CORS**：

1. **Given** 後端 CORS 設定，**When** 設定 `allow_origins`，**Then** 不得使用 `["*"]`；必須明確列出允許的 origin（由環境變數注入）。

### 功能需求

- **FR-014**：所有環境變數（DB URL、JWT secret、cookie secret）必須透過 `.env` 注入，不得 hardcode 在 source 中。
- **FR-015**：CORS `allow_origins` 以環境變數 `ALLOWED_ORIGINS`（逗號分隔）設定；`ALLOWED_ORIGINS=*` 在 production 環境下視為 CI 失敗。
- **FR-016**：所有 SQL 操作必須透過 SQLAlchemy ORM 或 parameterized query；不得 string-concatenate SQL。

---

### F-06：Definition of Done（P0）

**目標**：統一所有 sprint 的完成標準，確保每次交付都通過相同的品質閘門。

**約束情境 1 — Evaluator 閘門**：

1. **Given** 任何 feature 的 Generator 階段完成，**When** Evaluator 執行驗證，**Then** 下列所有指令必須 exit 0 才視為完成：
   - `uv run pytest tests/ -q`
   - `uv run mypy app/ --strict`
   - `uv run ruff check . && uv run ruff format --check .`
   - `pnpm tsc --noEmit`
   - `pnpm lint`
   - `pnpm test`
2. **Given** 任何單一驗證指令 exit non-zero，**When** Evaluator 回報，**Then** sprint 視為失敗；必須停止並向使用者回報確切錯誤，不得繼續下一個 spec item。

**約束情境 2 — TDD 前提**：

1. **Given** Generator 準備實作一個 FR，**When** 開始寫程式碼，**Then** 必須先寫失敗測試，確認測試失敗後才寫實作；不得在無測試的情況下提交實作程式碼。

### 功能需求

- **FR-017**：每個 feature spec 必須包含對應的測試計畫（backend: `tests/[module]/test_[file].py`；frontend: `src/[module]/__tests__/[file].test.tsx`）。
- **FR-018**：新增程式碼不得降低整體測試覆蓋率；auth、permissions、score calculation 等關鍵路徑需 ≥ 90% branch coverage。
- **FR-019**：每個 PR 開啟前必須執行 `/speckit.analyze` 且回報零發現。

---

## P1 — 阻擋 P2 功能的次核心約束

> 以下六項必須在任何 P2 功能進入 Generator 前完成。

### F-07：Task State Machine（P1）

**目標**：確保任務狀態轉換的唯一入口在 service 層，所有轉換皆可稽核。

> 完整決策見 [ADR-022](../../../docs/adr/022-task-state-machine-location.md)。

**約束情境**：

1. **Given** 任何觸發任務狀態轉換的操作，**When** 業務邏輯執行，**Then** 必須透過 `app/services/task_service.transition_task_status()` 進行；route handler 不得直接修改 `task.status`。
2. **Given** 狀態轉換嘗試，**When** 目標狀態不在 `ALLOWED_TRANSITIONS[current]` 中，**Then** 回傳 `InvalidTransitionError`（`422`），且資料庫 `task.status` 不得改變。
3. **Given** 任何成功的狀態轉換，**When** DB commit 完成，**Then** `run_state_transitions` 表必須有對應記錄（`from_status`, `to_status`, `triggered_by`, `triggered_at`）。

### 功能需求

- **FR-020**：`ALLOWED_TRANSITIONS` 靜態 dict 定義於 `app/services/task_service.py`；任何新的 transition 需同時更新此 dict 和本規格。
- **FR-021**：`dispatch_side_effects`（Celery 派送、通知）必須在 DB commit 之後執行；若 Celery dispatch 失敗，task 狀態已轉換（idempotent recovery 由 Celery beat 負責）。

---

### F-08：Sample Snapshot 不可變性（P1）

**目標**：防止試標（Dry Run）樣本與正式標記（Official Run）樣本交叉污染，保護資料公平性。

**約束情境**：

1. **Given** 任務首次發布試標（`draft → dry_run_in_progress`），**When** `sample_snapshot_id` 為 `None`，**Then** 系統建立 `sample_snapshot` 並寫入 `task.sample_snapshot_id`。
2. **Given** 任務已有 `sample_snapshot_id`，**When** 任何後續操作，**Then** `task.sample_snapshot_id` 不得被覆寫；service 層必須在寫入前檢查並拋出 `ImmutableFieldError`。
3. **Given** 試標被拒絕（`waiting_iaa_confirmation → draft`），**When** 任務回到 draft 狀態，**Then** `sample_snapshot_id` 必須保留原值，不得清空。

### 功能需求

- **FR-022**：`sample_snapshot_id` 欄位設為 DB-level constraint：建立後不可 UPDATE（PostgreSQL `GENERATED ALWAYS` 或 application-level guard）。
- **FR-023**：Dry Run 的標記資料必須存於獨立資料表或以 `run_type = 'dry_run'` 區隔，不得與 Official Run 資料合併計算 IAA 或匯出。

---

### F-09：DB 完整性（P1）

**目標**：確保所有跨 module 的資料一致性由資料庫約束（而非應用程式邏輯）強制執行。

**約束情境**：

1. **Given** 任何外鍵關係（如 `annotation.task_id → tasks.id`），**When** 父記錄被刪除，**Then** 必須依預定的 cascade 規則處理（`ON DELETE CASCADE` 或 `RESTRICT`），不得留下孤立記錄。
2. **Given** 任何需要唯一性的業務規則（如每位標記者每份樣本只能有一份標記），**When** 重複插入，**Then** DB unique constraint 必須攔截，不依賴應用層檢查。

### 功能需求

- **FR-024**：所有資料表以 Alembic migration 管理；不得手動修改 DB schema。
- **FR-025**：所有外鍵必須在 migration 中顯式聲明；`nullable` 預設為 `False`，需要 nullable 的欄位須在 spec 中說明原因。
- **FR-026**：測試環境使用真實 PostgreSQL 測試 DB（`tests/conftest.py` session fixture）；不得以 mock 替代 ORM 層。

---

### F-10：資料公平性（P1）

**目標**：在任何路徑上，標記者端不得取得 ground truth、評分鍵或 test-set 答案。

> 這是 Constitution Principle III (Data Fairness) 的工程實作，NON-NEGOTIABLE。

**約束情境**：

1. **Given** 任何標記者角色（`annotator`）的 API 請求，**When** 回傳標記任務資料，**Then** 回應 body 不得包含以下欄位：`ground_truth`、`score_key`、`answer`、`label_answer`、任何帶有 `_key`、`_truth`、`_answer` 後綴的欄位。
2. **Given** Evaluator 執行 `/speckit.analyze`，**When** 掃描 response schema，**Then** 任何 annotator-facing endpoint 的 `response_model` 出現上述欄位，視為 P0 blocking 發現。
3. **Given** 匯出功能被呼叫，**When** 請求者角色為 `annotator`，**Then** 匯出結果不得包含 ground truth 欄位；`project_leader` / `reviewer` 才可取得完整匯出。

### 功能需求

- **FR-027**：所有 annotator-facing response schema 必須繼承自 `AnnotatorSafeBaseSchema`（系統定義的 mixin，自動排除 sensitive 欄位）。
- **FR-028**：`AnnotatorSafeBaseSchema` 的 field exclusion list 必須在本規格的 Changelog 中記錄；任何新增 sensitive 欄位須同步更新 exclusion list。

---

### F-11：前端型別契約（P1）

**目標**：確保所有模組的前端共用型別有唯一 source of truth，消除三處已知的分散定義。

**約束情境**：

1. **Given** 前端需要使用 `MOBILE_BP` 斷點，**When** 引入值，**Then** 必須從 `shared/constants/breakpoints.ts` 引入；不得在 feature 目錄中重新定義。
2. **Given** 前端需要讀寫 `labelsuite.lang`，**When** 操作 localStorage，**Then** 必須使用 `shared/utils/locale-storage.ts` 的封裝 helper；不得直接呼叫 `localStorage.setItem/getItem`。
3. **Given** 前端需要讀寫 `labelsuite.activeTaskType`，**When** 操作 localStorage，**Then** 同上，透過 `shared/utils/task-storage.ts` 封裝。
4. **Given** 任何 feature module 新增共用型別，**When** 判斷是否放入 `shared/`，**Then** 必須被兩個以上不同 feature module 直接 import 才可進入 `shared/`（ADR-011 shared/ admission rule）。

### 功能需求

- **FR-029**：`MOBILE_BP = 767` 定義於 `shared/constants/breakpoints.ts`；現有的三處分散定義（account-001、annotation-015、shared-008）在各自進入實作時必須移除並改用此常數。
- **FR-030**：`LOCALSTORAGE_LANG_KEY`、`LOCALSTORAGE_TASK_TYPE_KEY` 定義於 `shared/constants/storage-keys.ts`。
- **FR-031**：TypeScript strict mode 必須開啟；不得使用 `any` 型別；`interface` 用於 props，`type` 用於 union/intersection。

---

### F-12：測試層次分工（P1）

**目標**：確保三個測試層（unit / integration / E2E）各司其職，避免重複覆蓋造成維護成本。

**約束情境**：

1. **Given** 需要測試 API 端點的路由邏輯，**When** 撰寫測試，**Then** 使用 `pytest-asyncio` + 真實測試 DB（不 mock ORM）。
2. **Given** 需要測試前端元件，**When** 撰寫測試，**Then** 使用 Vitest + Testing Library，以 `msw` mock API 邊界；不得 mock React 元件或 hook。
3. **Given** 需要測試完整使用者旅程，**When** 撰寫 E2E，**Then** 使用 Playwright；每個 spec 覆蓋一條使用者旅程（login → action → assertion）；不得混合多條旅程。

### 功能需求

- **FR-032**：測試檔案目錄鏡射 source 結構：backend `tests/[module]/test_[file].py`；frontend `src/[module]/__tests__/[file].test.tsx`；E2E `e2e/[module]/[page].spec.ts`。
- **FR-033**：Snapshot tests 禁止使用（frontend）。
- **FR-034**：Integration tests 以 `@pytest.mark.integration` 標記，可在 fast run 中跳過。
- **FR-035**：Factory helpers 定義於 `tests/factories/`；不得在 test body 內大量構建資料。

---

## P2 — 補充性約束（不阻擋 P0/P1 實作）

### F-13：統一錯誤格式（P2）

**功能需求**：

- **FR-036**：所有 API 錯誤回應使用 `ErrorResponse` schema：`{ "detail": string | ErrorDetail[] }`。
- **FR-037**：前端 TanStack Query 的 `onError` handler 必須解析 `ErrorResponse.detail` 並顯示給使用者；不得顯示原始 stack trace 或 HTTP status code。
- **FR-038**：`400 Bad Request`（業務規則）與 `422 Unprocessable Entity`（schema 驗證失敗）語意不得混用。

---

### F-14：Celery Task 合約（P2）

**功能需求**：

- **FR-039**：每個 Celery task 必須宣告 `name`（`tasks.[module].[task_name]`）、`bind=True`、`max_retries`、`default_retry_delay`。
- **FR-040**：Celery task 的 idempotency：以 `task_id + run_type` 作為冪等 key，重複呼叫不產生重複計算。
- **FR-041**：IAA 計算 task 完成後必須回寫 `iaa_results` 表；若計算失敗，`task.status` 不得停在 `dry_run_in_progress`（必須有 fallback 狀態或重試機制）。

---

### F-15：Logging / Correlation（P2）

**功能需求**：

- **FR-042**：每個 HTTP request 必須生成唯一 `correlation_id`（UUID v4），注入至 response header `X-Correlation-ID` 和 log context。
- **FR-043**：結構化日誌格式（JSON）：必須包含 `timestamp`、`level`、`correlation_id`、`user_id`（若已認證）、`message`。
- **FR-044**：AI 輔助評分操作必須寫入 `ai_audit_log`（ADR-019），包含 `model_version`、`input_hash`、`output_hash`、`triggered_by`。

---

### F-16：即時通知合約（P2）

**功能需求**：

- **FR-045**：通知事件類型（`task_status_changed` / `iaa_ready` / `annotation_completed` / `official_run_completed`）定義於 `app/notifications/event_types.py`；不得在各模組分散定義。
- **FR-046**：前端使用 WebSocket 或 Server-Sent Events 訂閱通知；連線斷線後必須有自動重連邏輯（exponential backoff，最大 3 次）。

---

### F-17：匯出工作流程（P2）

**功能需求**：

- **FR-047**：匯出操作必須非同步執行（Celery task）；前端以 polling 或 WebSocket 取得匯出完成通知。
- **FR-048**：匯出檔案生成後存於暫存儲存（S3 / 本地 `/tmp`）；URL 以 signed URL 形式提供，有效期 15 分鐘。
- **FR-049**：`annotator` 角色的匯出不得包含 ground truth 欄位（與 FR-027 / FR-028 對應）。

---

### F-18：前端共用基礎設施（P2）

**功能需求**：

- **FR-050**：`shared/` 下的元件必須通過 Storybook 文件驗收（ADR-016）；新增共用元件需同時新增 `.stories.tsx`。
- **FR-051**：全域 CSS 變數（顏色、字型、間距）定義於 `shared/styles/tokens.css`；feature module 不得 hardcode 設計 token 值。
- **FR-052**：i18n namespace 以 module 為單位分割（`t('[module]:key')`）；`shared/` 使用 `common` namespace。

---

### F-19：效能基準（P2）

**功能需求**：

- **FR-053**：所有 list API 必須支援資料庫層分頁（`LIMIT/OFFSET` 或 cursor-based）；不得在應用層 fetch-all 後切片。
- **FR-054**：所有涉及外鍵關聯的查詢必須使用 SQLAlchemy `selectinload` 或 `joinedload`；避免 N+1 查詢（mypy + sqlalchemy-stubs 靜態檢查）。
- **FR-055**：前端 bundle 初始載入 < 200 KB gzip（由 Vite bundle analyzer 驗證）。

---

### F-20：快取安全性（P2）

**功能需求**：

- **FR-056**：Redis key 命名格式：`{app}:{module}:{entity_id}:{field}`（防止 key collision）。
- **FR-057**：含有使用者個人資料或標記結果的 Redis key TTL 不得超過 `ACCESS_TOKEN_TTL`（15 分鐘）；到期後 client 必須從 DB 重取。
- **FR-058**：任何快取 invalidation 邏輯必須在 service 層（與 DB write 同一 transaction context）執行，不得依賴前端觸發。

---

## 規格相依性

### 上游（本規格依賴的規格）

| 文件 | 說明 |
|------|------|
| [Constitution](../../_governance/constitution.md) | Principle II Generalization-First、Principle III Data Fairness（NON-NEGOTIABLE） |
| [ADR-010](../../../docs/adr/010-config-driven-architecture.md) | Config-driven task architecture |
| [ADR-011](../../../docs/adr/011-frontend-source-structure.md) | Vertical feature slicing、shared/ admission rule |
| [ADR-021](../../../docs/adr/021-jwt-refresh-token-auth.md) | JWT + Refresh Token 策略 |
| [ADR-022](../../../docs/adr/022-task-state-machine-location.md) | Task state machine 位置 |
| [ADR-019](../../../docs/adr/019-ai-traceability-audit-logging.md) | AI audit log schema |
| [IA v1.4.3](../../../docs/product/ia/information-architecture.md) | §6.1 Foundation Spec 關係 |

### 下游（依賴本規格的規格）

| 規格編號 | 功能 | 依賴的 Foundation 約束 |
|---------|------|----------------------|
| account-001 | Login Email / Password | F-03 JWT、F-05 安全基準、F-11 型別契約（MOBILE_BP、LANG_KEY） |
| account-002~005 | 帳號功能 | F-02 雙層角色、F-03 JWT |
| admin-006~007 | 使用者/角色管理 | F-02 雙層角色、F-06 DoD |
| shared-008 | Sidebar Navbar | F-11 型別契約（MOBILE_BP、LANG_KEY、TASK_TYPE_KEY） |
| dashboard-012 | Dashboard | F-02 雙層角色（`role ===` dispatch） |
| task-management-013~014 | 任務建立/詳情 | F-04 Task Type Registry、F-07 State Machine、F-08 Snapshot 不可變性 |
| annotation-015 | 標記工作區 | F-10 資料公平性、F-04 Task Type Registry、F-11 型別契約（TASK_TYPE_KEY） |
| dataset-016~017 | 資料集分析 | F-08 Snapshot 不可變性、F-10 資料公平性、F-09 DB 完整性 |

---

## 成功標準

- **SC-001**：`uv run pytest tests/ -q` exit 0，且覆蓋率不降低。
- **SC-002**：`uv run mypy app/ --strict` exit 0；不得有 `# type: ignore` 出現在非第三方 stub 缺失的場合。
- **SC-003**：`pnpm tsc --noEmit` exit 0；`any` 型別為零。
- **SC-004**：`uv run ruff check .` exit 0；無任何 `if task_type ==` 出現在 `app/services/` 或 `app/routers/`（由 ruff custom rule 或 grep CI check 驗證）。
- **SC-005**：任何 annotator-facing response schema 不得包含 `ground_truth`、`score_key`、`answer` 欄位（由 `/speckit.analyze` 掃描驗證）。
- **SC-006**：`MOBILE_BP` 在 `shared/constants/breakpoints.ts` 外不得出現數值 `767`（由 grep CI check 驗證）。
- **SC-007**：`refresh_tokens` 資料表存在，且 `token_hash` 有 unique index（由 Alembic migration 驗證）。
- **SC-008**：`ALLOWED_TRANSITIONS` dict 在 `task_service.py` 中定義，覆蓋所有 5 個狀態節點（由 unit test 驗證）。

---

## 審查與驗收清單

### 內容品質

- [x] 功能目標已明確陳述（工程基準、受益者為所有 feature module、現階段優先原因：account-001 即將進入實作）。
- [x] 規格聚焦系統可觀察行為與工程約束，已引用 ADR 作為決策依據；不含框架設定細節。
- [x] 所有必填章節已完成。
- [x] 無未解決的待釐清標記殘留。
- [x] 所有 FR-* 與 SC-* 可測試且明確。
- [x] 成功標準可量化（exit code、grep count、coverage threshold）。
- [x] 範圍已明確界定（工程基準，非頁面功能）。

### Label Suite 合規性

- [x] task 行為以 config-driven 方式定義（F-04）。
- [x] annotator 端資料安全已明確約束（F-10）。
- [x] 上游 ADR 與 IA 均已引用且版本一致。
- [x] 下游規格相依性已完整列出（14 個 feature specs）。
- [x] MOBILE_BP、LANG_KEY、TASK_TYPE_KEY 三個分散定義已收斂至唯一宣告位置。

### 執行狀態

- [x] 輸入描述已解析（IA v1.4.3 §6.1 + 五名代理評估）。
- [x] 20 個評估項目（P0×6 + P1×6 + P2×8）全數納入 FR-001 ~ FR-058。
- [x] 兩個 ADR 缺口（021 JWT、022 State Machine）已先行補齊。

---

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.0.0 | 2026-05-29 | Initial spec：20 項評估結果（P0×6 + P1×6 + P2×8）轉為 58 個功能需求；同步新增 ADR-021 / ADR-022 |

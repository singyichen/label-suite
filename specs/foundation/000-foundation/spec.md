---
功能分支: feat/foundation/000-foundation
建立日期: 2026-05-29
版本: 1.2.0
狀態: Draft
---

# 工程架構基準：Foundation — 跨模組共同約束

## 功能目標

本規格定義 Label Suite 所有功能模組必須遵守的工程架構基準。它服務 backend、frontend、QA 與 reviewer，使任何 feature spec 在進入實作前，都能依同一套 API、分層架構、型別、安全、測試與可觀測性規則設計。

本規格不定義單一業務流程、頁面旅程、任務狀態、演算法選型或資料生命週期。這些內容必須由各 feature spec 或 ADR 定義，並只能依本規格提供的工程邊界實作。

**需求來源**：Information Architecture v1.4.3 §6.1 Foundation Spec 關係；Constitution v1.29.1；REST API design best practices（resource naming、versioning、filtering、pagination、cacheability、security、idempotence、input validation）。

---

## 範圍界定

### 本規格負責

1. 前後端專案目錄與模組邊界。
2. REST API 合約、錯誤格式、版本與 HTTP 語意。
3. Backend route / service / CRUD / schema / migration 分層。
4. Frontend feature vertical slice、shared admission rule、型別與狀態管理基準。
5. Auth、permission hook、CORS、secret、input validation、安全回應。
6. Config-driven extensibility 的工程契約。
7. 測試策略、CI quality gates、可觀測性與背景任務通用規則。

### 本規格不負責

1. 具體任務狀態節點與轉換，例如 dry run、official run、IAA confirmation。
2. 具體資料生命週期，例如 sample snapshot 建立、保留、不可變規則。
3. 具體演算法選型，例如 IAA / scoring algorithm。
4. 具體通知事件名稱、匯出流程步驟、dashboard 分派邏輯。
5. 單一頁面 UX、wireframe、prototype 或文案。

上述內容若需要規範，必須放在對應 module spec，例如 `task-management`、`annotation`、`dataset`、`admin` 或獨立 ADR。

---

## 輸入與產生規則

**產生 feature spec 時必須遵守**：

1. Feature spec 不得覆寫本規格的工程邊界；若有衝突，必須先更新 foundation 或 ADR。
2. Feature spec 可定義業務流程，但必須以本規格的 route/service/schema/test/security 契約落地。
3. 每項工程約束均標記優先級（P0/P1/P2）與可驗證方式。
4. 所有 FR-* 以「系統必須」開頭；SC-* 必須可透過 pytest / mypy / tsc / ruff / ESLint / Playwright / CI script 或明確整合測試驗證。
5. 本規格與 Constitution 衝突時，Constitution 為最高準則。

---

## 架構常數

- `API_VERSION_PREFIX = /api/v1`
- `PAGINATION_DEFAULT_PAGE_SIZE = 20`
- `PAGINATION_MAX_PAGE_SIZE = 100`
- `ACCESS_TOKEN_TTL = 15 分鐘`
- `REFRESH_TOKEN_TTL = 7 天（sliding）`
- `MOBILE_BP = 767px`
- `LOCALSTORAGE_LANG_KEY = labelsuite.lang`

業務常數不得放入本節。任務狀態、演算法、run type、匯出保留時間、通知事件名稱等，由 owning feature spec 或 ADR 定義。

---

## P0 — 阻擋所有功能實作的核心約束

### F-01：REST API 合約基準（P0）

**目標**：確保前後端所有 API 以一致、可版本化、可測試的 HTTP 契約溝通。

**約束情境 1 — Resource-based URI**：

1. **Given** 任何新 API 端點，**When** 命名路由，**Then** 系統必須使用 `{API_VERSION_PREFIX}/[module]/[resources]` 格式，resource 使用複數名詞。
2. **Given** 任何 API 端點，**When** route 表達業務動作，**Then** 系統必須優先使用 HTTP method 和 resource state 表達，不得以動詞式 URI 取代資源設計，除非 feature spec 記錄理由。
3. **Given** API contract 需要 breaking change，**When** 舊 client 會被破壞，**Then** 系統必須新增 API version 或提供明確 migration path，不得 silently 改變既有 response shape。

**約束情境 2 — Request / Response**：

1. **Given** 任何 API 端點接收 request body，**When** 請求格式有誤，**Then** 系統必須回傳 `422 Unprocessable Entity`，body 符合 `ErrorResponse` schema。
2. **Given** 任何 create 端點成功，**When** 資源建立完成，**Then** 系統必須回傳 `201 Created` 並提供 `Location` header 指向新資源 URI。
3. **Given** 任何 delete 端點成功且不回傳 body，**When** 資源刪除或標記刪除完成，**Then** 系統必須回傳 `204 No Content`。
4. **Given** 權限不足的請求，**When** 回傳資源存在性會造成資料洩漏，**Then** 系統必須回傳 `404 Not Found`。

**約束情境 3 — Collection 查詢**：

1. **Given** 任何 list 端點，**When** 回傳多筆資料，**Then** 系統必須使用 `PaginatedResponse[T]` wrapper，欄位包含 `items`、`total`、`page`、`page_size`。
2. **Given** list 端點支援排序，**When** client 傳入 `?sort=[field]&order=[asc|desc]`，**Then** 系統必須依指定欄位排序；不支援欄位回傳 `400 Bad Request`。
3. **Given** list 端點支援篩選，**When** client 傳入不支援的 filter key，**Then** 系統必須回傳 `400 Bad Request`，不得 silently ignore。
4. **Given** response 可被安全快取，**When** 系統回應，**Then** 系統必須明確設定 cache header；含個人資料或權限相關資料的 response 必須設定 `Cache-Control: no-store` 或等效限制。

### 功能需求

- **FR-001**：系統必須讓所有 API request body 以 Pydantic schema（`app/schemas/`）驗證。
- **FR-002**：系統必須讓所有 API route 聲明 `response_model=`；不得直接回傳 ORM 物件。
- **FR-003**：系統必須讓所有 list 端點支援 `page` 與 `page_size`，預設值為 `1` 與 `PAGINATION_DEFAULT_PAGE_SIZE`，上限為 `PAGINATION_MAX_PAGE_SIZE`。
- **FR-004**：系統必須透過 `APIRouter` 以 module prefix 與 tags 組織路由；不得在 `main.py` 直接定義業務路由。
- **FR-005**：系統必須以 `ALLOWED_SORT_FIELDS` / `ALLOWED_FILTER_FIELDS` 或等效 schema 明確宣告每個 list 端點允許的排序與篩選欄位。
- **FR-006**：系統必須在 API response 中使用正確 HTTP status code；`400` 表示 request 語意或業務規則錯誤，`401` 表示未認證，`403` 表示已認證但不可授權且不需隱藏資源存在，`404` 表示不存在或必須隱藏存在性，`422` 表示 schema validation 錯誤。

---

### F-02：Backend 分層架構（P0）

**目標**：確保 backend 各層職責清晰分離，讓 route、service、CRUD helper、schema 均可獨立測試，並避免業務規則散落於 HTTP 層或 DB 操作層。

**約束情境 1 — 層次職責**：

1. **Given** 任何 API route handler，**When** 實作行為，**Then** 系統必須將 route handler 限定為：parse request → authorize dependency → call service → serialize response。
2. **Given** 任何 route handler，**When** 需要資料存取，**Then** 系統不得在 route handler 中直接呼叫 `db.execute()`、`db.get()`、`db.query()` 或組合 SQL。
3. **Given** 任何 CRUD helper，**When** 實作資料操作，**Then** 系統必須限制它只處理單一資源的 DB CRUD；不得包含權限判斷、跨資源 workflow、background job dispatch 或通知。
4. **Given** 任何跨資源規則、狀態變更或 side effect，**When** 實作位置被決定，**Then** 系統必須放在 `app/services/[module].py` 或明確命名的 service package。

**約束情境 2 — Schema 分離**：

1. **Given** 任何資源的 create 或 update 操作，**When** 定義 Pydantic schema，**Then** 系統必須分離 input schema 與 output schema，不得共用同一 class。
2. **Given** ORM model 需要對外回傳，**When** route 指定 response model，**Then** 系統必須使用 response schema，不得以 ORM model class 作為 `response_model`。

### 功能需求

- **FR-007**：系統必須遵循 `app/routers/`、`app/services/`、`app/crud/`、`app/schemas/`、`app/models/`、`app/core/` 的 backend 分層。
- **FR-008**：系統必須讓 route handler 只負責 HTTP 邊界，不得承載業務規則或資料存取細節。
- **FR-009**：系統必須讓 service 層成為跨資源規則、權限協調、transaction boundary、side effect dispatch 的唯一入口。
- **FR-010**：系統必須讓 CRUD helper 不含業務判斷、權限判斷或 side effects。
- **FR-011**：系統必須將 request schema 與 response schema 分開定義；共用欄位只能以 base class 或 mixin 提取。

---

### F-03：Frontend Vertical Slice 架構（P0）

**目標**：強制前端以 feature module 為邊界隔離程式碼，讓每個 module 可獨立開發、測試與替換，同時防止 `shared/` 成為無邊界依賴區。

**約束情境 1 — Module 目錄結構**：

1. **Given** 任何 feature module 新增檔案，**When** 決定放置路徑，**Then** 系統必須放在 `frontend/src/features/[module]/{components/,hooks/,pages/,services/,types/,__tests__/}` 其中之一。
2. **Given** 單一 module 的內部 helper，**When** 尚未被兩個以上 module 使用，**Then** 系統必須保留在該 module 內，不得提前移入 `shared/`。

**約束情境 2 — 跨模組邊界**：

1. **Given** 任何 feature module 需要使用另一 feature module 的邏輯，**When** 決定 import 路徑，**Then** 系統不得直接 import `features/[otherModule]/` 內部路徑。
2. **Given** 候選 `shared/` 元件或 helper，**When** 評估是否移入 `shared/`，**Then** 系統必須確認它已被至少兩個不同 feature module 直接使用，且不依賴特定 domain。

### 功能需求

- **FR-012**：系統必須禁止 feature-to-feature direct imports。
- **FR-013**：系統必須讓 `shared/` 僅包含跨兩個以上 feature module 使用且 domain-neutral 的程式碼。
- **FR-014**：系統必須以 ESLint rule、dependency-cruiser 或等效 CI check 驗證 frontend module boundary。
- **FR-015**：系統必須讓 shared UI component 具備 Storybook story，至少涵蓋 Default 與適用的 Empty、Loading、Error、Disabled 狀態。

---

### F-04：Auth / Permission / Session 基準（P0）

**目標**：建立一致的認證與授權邊界，避免 token 洩漏、權限升級與跨資源資料洩漏。

**約束情境 1 — JWT 與 Refresh Token**：

1. **Given** 登入成功，**When** 系統核發 token，**Then** 系統必須以 `httpOnly; Secure; SameSite=Lax` cookie 傳送 access token 與 refresh token。
2. **Given** JWT payload 被建立，**When** 系統寫入 claims，**Then** payload 只能包含認證必要 claims，例如 `sub`、system-level `role`、`iat`、`exp`；不得包含 resource-scoped permission 或 task-scoped role。
3. **Given** refresh token 使用一次，**When** `/auth/refresh` 成功，**Then** 系統必須旋轉 refresh token 並立即作廢舊 token。
4. **Given** refresh token reuse 被偵測，**When** 已作廢 token 再次被使用，**Then** 系統必須撤銷該使用者仍有效的 refresh tokens。

**約束情境 2 — Permission Boundary**：

1. **Given** 任何受保護 API route，**When** request 進入，**Then** 系統必須透過 authentication dependency 注入 current user，不得繞過。
2. **Given** 任何 resource-scoped operation，**When** 後端執行授權，**Then** 系統必須在 route dependency 或 service 層驗證該 resource 的 membership / permission，不得只依賴 system role。
3. **Given** 前端需要判斷 resource-scoped permission，**When** 渲染功能入口，**Then** 系統必須透過 API 取得 permission，不得從 JWT 或 localStorage 推斷。

### 功能需求

- **FR-016**：系統必須維護 `refresh_tokens` 資料表或等效 persistence，欄位至少包含 `user_id`、`token_hash`、`expires_at`、`revoked_at`。
- **FR-017**：系統必須讓 frontend auth store 僅保存非敏感 session state；不得將 raw token 持久化至 localStorage。
- **FR-018**：系統必須讓 resource permission checks 位於 route dependency 或 service 層；CRUD helper 不得內嵌權限邏輯。
- **FR-019**：系統必須對 unauthorized、forbidden、resource-hidden 三種情境撰寫測試。

---

### F-05：Security Baseline（P0）

**目標**：為所有模組建立最低安全標準，消除與本系統相關的 OWASP Top 10 風險。

**約束情境**：

1. **Given** 任何來自使用者、檔案、外部服務或 query string 的輸入，**When** 傳入後端，**Then** 系統必須經過 schema validation 或明確 parser 驗證。
2. **Given** 任何 SQL 操作，**When** 需要查詢或更新資料，**Then** 系統必須使用 SQLAlchemy ORM、SQLAlchemy Core parameterized expression 或 parameterized query，不得 string-concatenate SQL。
3. **Given** 前端渲染使用者產生內容，**When** 輸出至 DOM，**Then** 系統不得使用 `dangerouslySetInnerHTML`，除非 feature spec 記錄 sanitization strategy 並有安全測試。
4. **Given** 後端 CORS 設定，**When** 設定 `allow_origins`，**Then** 系統不得使用 `["*"]`；允許清單必須由環境變數注入。
5. **Given** production 環境，**When** 系統處理 authentication 或 sensitive data，**Then** 系統必須要求 TLS termination，並不得透過非安全 cookie 傳送 session credential。

### 功能需求

- **FR-020**：系統必須透過 `.env` 或部署環境注入 DB URL、JWT secret、cookie secret、CORS origins；不得 hardcode secrets。
- **FR-021**：系統必須以 `ALLOWED_ORIGINS` 設定 CORS；`ALLOWED_ORIGINS=*` 在 production 視為 CI 或 startup failure。
- **FR-022**：系統必須在 startup validation 檢查必要環境變數；缺失或非法值必須 fail fast。
- **FR-023**：系統必須禁止 committed debug `print` / `console.log`。

---

### F-06：Config-driven Extensibility（P0）

**目標**：確保平台新增 task type、label widget、metric、review flow 或其他 domain variation 時，優先透過 config / registry 擴展，不修改核心流程分支。

**約束情境**：

1. **Given** feature spec 新增 domain variation，**When** 核心服務需要依 variation 決定行為，**Then** 系統必須使用 config schema、registry、strategy map 或 plugin boundary，不得在核心 route/service 寫入 `if [domain_type] == ...` 分支。
2. **Given** config 引用 registry key，**When** 建立或更新資源，**Then** 系統必須驗證該 key 存在；找不到則回傳 `422`。
3. **Given** frontend 需要依 config 渲染不同 UI，**When** 選擇 component，**Then** 系統必須使用 widget registry 或 mapping；不得以 feature-local `if/switch` 硬編碼 domain type。

### 功能需求

- **FR-024**：系統必須以 Pydantic schema 驗證 domain config，驗證通過後才可 persistence。
- **FR-025**：系統必須將 registry 定義放在 owning module 或 shared extension point，並由 tests 驗證未知 key 會失敗。
- **FR-026**：系統必須在 CI 或 `/speckit.analyze` 中掃描核心 route/service，阻擋硬編碼 domain type 分支。

---

## P1 — 跨模組品質與可維護性約束

### F-07：資料安全與 Annotator-safe Contract（P1）

**目標**：把 Constitution 的資料公平性轉為可驗證的 API 安全契約，但不在 foundation 定義具體標記流程。

**約束情境**：

1. **Given** API response 會被 annotator-facing client 使用，**When** schema 被定義，**Then** 系統不得包含 ground truth、answer key、internal scoring metadata 或可推導 test item identity 的欄位。
2. **Given** response schema 新增 sensitive 欄位，**When** 該 schema 可能被 annotator-facing endpoint 使用，**Then** 系統必須在 owning feature spec 記錄 exclusion rule 並新增 regression test。

### 功能需求

- **FR-027**：系統必須提供 `AnnotatorSafeBaseSchema` 或等效 schema boundary，供 annotator-facing response model 使用。
- **FR-028**：系統必須以 tests 或 analyzer 掃描 annotator-facing response schema，阻擋 `ground_truth`、`score_key`、`answer`、`label_answer`、`*_key`、`*_truth`、`*_answer` 等欄位。

---

### F-08：Persistence / Migration 基準（P1）

**目標**：確保資料一致性由 migration 與 DB constraint 支撐，不依賴分散的應用層假設。

**約束情境**：

1. **Given** 任何資料表變更，**When** schema 被修改，**Then** 系統必須透過 Alembic migration 管理；不得手動修改 DB schema。
2. **Given** 任何外鍵關係，**When** migration 被建立，**Then** 系統必須顯式聲明 foreign key、index 與 delete behavior。
3. **Given** 任何唯一性不變式，**When** 重複資料被寫入，**Then** 系統必須以 DB unique constraint 或 partial unique index 攔截，不只依賴 application check。
4. **Given** 欄位需要 nullable，**When** migration 與 model 被定義，**Then** feature spec 或 migration comment 必須說明原因。

### 功能需求

- **FR-029**：系統必須讓所有 DB schema changes 經 Alembic migration。
- **FR-030**：系統必須讓所有 foreign keys 在 migration 中顯式聲明。
- **FR-031**：系統必須讓測試環境使用真實 PostgreSQL 或與 production 行為一致的 DB 測試容器；不得以 mock 取代 ORM integration tests。

---

### F-09：Frontend 型別、狀態與資料取得基準（P1）

**目標**：確保 frontend 型別、local state、server state 與 localStorage 有一致 source of truth。

**約束情境**：

1. **Given** 前端需要共用 breakpoint，**When** 引入 `MOBILE_BP`，**Then** 系統必須從 `shared/constants/breakpoints.ts` 引入。
2. **Given** 前端需要讀寫 localStorage，**When** 操作 persisted preference，**Then** 系統必須透過 shared helper 封裝；不得在 feature code 直接散落 raw key。
3. **Given** 前端處理 server state，**When** 需要 cache、refetch、mutation，**Then** 系統必須使用 TanStack Query 或指定 data fetching boundary，不得以多個 feature-local stores 複製 server data。
4. **Given** TypeScript 型別被定義，**When** code review 或 CI 執行，**Then** 系統不得出現 `any`。

### 功能需求

- **FR-032**：系統必須將 `MOBILE_BP = 767` 定義於 `frontend/src/shared/constants/breakpoints.ts`。
- **FR-033**：系統必須將 `LOCALSTORAGE_LANG_KEY` 定義於 `frontend/src/shared/constants/storage-keys.ts`，並透過 helper 使用。
- **FR-034**：系統必須開啟 TypeScript strict mode；不得使用 `any` 型別。
- **FR-035**：系統必須使用 `interface` 定義 component props，使用 `type` 定義 union / intersection。

---

### F-10：測試層次分工（P1）

**目標**：確保 unit / integration / E2E 各司其職，避免測試重複、過度 mock 或缺少核心路徑驗證。

**約束情境**：

1. **Given** 需要測試 backend service 或 API route，**When** 撰寫測試，**Then** 系統必須使用 pytest；API integration tests 必須走真實 DB transaction。
2. **Given** 需要測試 frontend component，**When** 撰寫測試，**Then** 系統必須使用 Vitest + Testing Library，並以 MSW mock API 邊界。
3. **Given** 需要測試完整使用者旅程，**When** 撰寫 E2E，**Then** 系統必須使用 Playwright；每個 spec 聚焦一條主要旅程。
4. **Given** Generator 準備實作任何 behavior，**When** 開始寫實作程式碼，**Then** 系統必須先寫失敗測試，確認失敗後才實作。

### 功能需求

- **FR-036**：系統必須讓測試檔案鏡射 source 結構：backend `tests/[module]/test_[file].py`；frontend `src/features/[module]/__tests__/[file].test.tsx`；E2E `e2e/[module]/[flow].spec.ts`。
- **FR-037**：系統必須禁止 frontend snapshot tests。
- **FR-038**：系統必須以 `@pytest.mark.integration` 標記 backend integration tests。
- **FR-039**：系統必須將 factory helpers 定義於 `tests/factories/` 或 feature-local test factory；不得在 test body 內大量手寫資料。

---

## P2 — 補充性工程約束

### F-11：統一錯誤與前端錯誤處理（P2）

### 功能需求

- **FR-040**：系統必須讓所有 API 錯誤回應使用 `ErrorResponse` schema：`{ "detail": string | ErrorDetail[] }`。
- **FR-041**：系統必須讓 frontend error boundary 或 TanStack Query error handler 解析 `ErrorResponse.detail`，不得顯示 raw stack trace、raw SQL error 或未處理的 HTTP client object。
- **FR-042**：系統必須記錄 internal error detail 至 server log，但 user-facing response 不得洩漏 secret、token、SQL、filesystem path 或 sensitive payload。

---

### F-12：Background Job 合約（P2）

### 功能需求

- **FR-043**：系統必須讓每個 background job 宣告 stable name、retry policy、timeout、idempotency key 與 failure handling strategy。
- **FR-044**：系統必須讓 background job 的 side effects 可重試或可恢復；重複執行不得產生重複資料或重複通知。
- **FR-045**：系統必須讓 background job status 可觀測，至少包含 `queued`、`running`、`succeeded`、`failed` 或 owning feature spec 定義的等效狀態。

---

### F-13：Logging / Correlation / Audit（P2）

### 功能需求

- **FR-046**：系統必須為每個 HTTP request 生成唯一 `correlation_id`（UUID v4），注入 response header `X-Correlation-ID` 和 log context。
- **FR-047**：系統必須使用結構化日誌格式，至少包含 `timestamp`、`level`、`correlation_id`、`user_id`（若已認證）、`message`。
- **FR-048**：系統必須讓 security-sensitive 或 state-changing action 產生 audit event；具體事件與欄位由 owning feature spec 定義。

---

### F-14：Performance Baseline（P2）

### 功能需求

- **FR-049**：系統必須讓所有 list API 使用資料庫層分頁（`LIMIT/OFFSET` 或 cursor-based），不得在應用層 fetch-all 後切片。
- **FR-050**：系統必須讓涉及外鍵關聯的查詢明確選擇 loading strategy，例如 `selectinload`、`joinedload` 或 projection query，避免 N+1。
- **FR-051**：系統必須讓 frontend 非關鍵 routes code split；initial bundle 不得載入所有 feature modules。
- **FR-052**：系統必須讓長時間操作在 100ms 內提供 loading / pending state。

---

### F-15：Cache Safety（P2）

### 功能需求

- **FR-053**：系統必須讓 Redis 或其他 cache key 使用命名空間格式：`{app}:{module}:{entity_id}:{field}` 或 owning service 定義的等效格式。
- **FR-054**：系統必須讓含個人資料、標記結果或權限結果的 cache 設定短 TTL，且不得超過 access token TTL，除非 feature spec 提供安全理由。
- **FR-055**：系統必須讓 cache invalidation 位於 service 層或 background job boundary，不得依賴 frontend 觸發。

---

## 規格相依性

### 上游（本規格依賴的規格）

| 文件 | 說明 |
|------|------|
| [Constitution](../../_governance/constitution.md) | Generalization-First、Data Fairness、Security、Code Quality、CI/CD |
| [ADR-010](../../../docs/adr/010-config-driven-architecture.md) | Config-driven task architecture |
| [ADR-011](../../../docs/adr/011-frontend-source-structure.md) | Vertical feature slicing、shared/ admission rule |
| [ADR-021](../../../docs/adr/021-jwt-refresh-token-auth.md) | JWT + Refresh Token 策略 |
| [IA v1.4.3](../../../docs/product/ia/information-architecture.md) | §6.1 Foundation Spec 關係 |

### 下游（依賴本規格的規格）

| 規格類型 | 依賴的 Foundation 約束 |
|---------|----------------------|
| account | F-01 REST API、F-04 Auth、F-05 Security、F-09 Frontend 型別 |
| dashboard | F-03 Frontend Vertical Slice、F-04 Permission、F-09 Frontend state |
| task-management | F-01 REST API、F-02 Backend 分層、F-06 Config-driven、F-08 Persistence |
| annotation | F-03 Frontend Vertical Slice、F-06 Config-driven、F-07 Data Safety、F-10 Testing |
| dataset | F-01 REST API、F-08 Persistence、F-14 Performance |
| annotator-management | F-04 Permission、F-05 Security、F-13 Audit |
| admin | F-04 Permission、F-05 Security、F-13 Audit |

---

## 成功標準

- **SC-001**：`uv run pytest tests/ -q` exit 0，且覆蓋率不降低。
- **SC-002**：`uv run mypy app/ --strict` exit 0；不得有非必要 `# type: ignore`。
- **SC-003**：`uv run ruff check .` exit 0；無 debug `print`。
- **SC-004**：`pnpm tsc --noEmit` exit 0；`any` 型別為零。
- **SC-005**：`pnpm lint` exit 0；frontend module boundary 無違規。
- **SC-006**：所有 list API response 使用 `PaginatedResponse[T]` 或 feature spec 明確核准的 cursor response。
- **SC-007**：`app/routers/` 下不得出現直接 `db.execute()`、`db.get()`、`db.query()` 呼叫。
- **SC-008**：核心 route/service 不得出現 hardcoded domain type 分支，例如 `if task_type == ...` 或 `switch (taskType)`。
- **SC-009**：annotator-facing response schema 不得包含 `ground_truth`、`score_key`、`answer`、`label_answer`、`*_key`、`*_truth`、`*_answer`。
- **SC-010**：`MOBILE_BP` 在 `frontend/src/shared/constants/breakpoints.ts` 外不得重新宣告數值 `767`。

---

## 審查與驗收清單

### 內容品質

- [x] 功能目標已明確陳述為工程架構基準。
- [x] 已移除具體業務流程、任務狀態、IAA 演算法、sample snapshot lifecycle、通知事件與匯出步驟。
- [x] 已保留 Constitution 要求的 config-driven extensibility 與 annotator-safe data contract。
- [x] 已納入 REST API resource naming、versioning、filtering、pagination、cacheability、security、idempotence、input validation 原則。
- [x] 所有 FR-* 與 SC-* 可測試且明確。

### Label Suite 合規性

- [x] feature module 邊界清楚，禁止跨 feature imports。
- [x] backend route/service/crud/schema 分層清楚。
- [x] task/domain variation 以 config / registry 擴展，禁止核心硬編碼。
- [x] annotator-facing API 不得暴露答案或評分鍵。
- [x] security、testing、CI gates 與 Constitution 一致。

---

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.2.0 | 2026-05-29 | 將 foundation spec 重構為純工程架構基準；移除 Dry Run、IAA、sample snapshot、task state machine、匯出流程與通知事件等業務規範；補強 REST API design principles、backend/frontend architecture、config-driven extensibility、data safety、testing、observability、performance、cache safety |
| 1.1.0 | 2026-05-29 | 補全三處缺口：F-01 新增 Filtering/Sorting 約定（FR-059）；F-21 Backend 分層架構（FR-060~062）；F-22 Frontend Vertical Slice 結構（FR-063~065）；新增 SC-009/SC-010 |
| 1.0.0 | 2026-05-29 | Initial spec：20 項評估結果（P0×6 + P1×6 + P2×8）轉為 58 個功能需求；同步新增 ADR-021 / ADR-022 |

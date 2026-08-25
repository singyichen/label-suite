# foundation/000-foundation Specification

## Purpose
Label Suite 的工程基線能力：所有功能模組共同依賴的跨模組 API envelope、設定驗證、安全原語、資料庫 session 契約、前端 scaffold 與本機 bootstrap。本文件是正典 `specs/foundation/000-foundation/spec.md`（v1.12.4）的 derived view —— 以下每條需求皆引用既有正典 FR/SC ID；本變更僅實作，不改動其正典措辭。範圍：Foundation-Core，依 `specs/foundation/000-foundation/plan.md` v2.0.0（Observability 延後）。

## Requirements

### Requirement: 統一 API 錯誤 envelope
所有 API 錯誤回應必須使用 `ErrorResponse` schema `{ "detail": string | ErrorDetail[] }`，其中 `ErrorDetail` 帶有 `loc`、`msg`、`type`、`error_code`；FastAPI 例外處理器、Pydantic 驗證錯誤與應用程式錯誤必須輸出同一 schema。每個路由必須宣告 `response_model=`，且絕不直接回傳 ORM 物件。（正典：FR-002、FR-115、FR-116；SC-035）

#### Scenario: 驗證錯誤使用 envelope
- **WHEN** 請求未通過 Pydantic schema 驗證
- **THEN** API 回應 `422`，body 為 `ErrorResponse`，其 `detail` 各項皆帶 `loc`、`msg`、`type`

#### Scenario: 應用程式錯誤使用 envelope
- **WHEN** 已註冊的例外處理器處理應用程式錯誤
- **THEN** 回應 body 為 `ErrorResponse`，而非 FastAPI 預設錯誤格式

### Requirement: 分頁列表契約
列表端點必須接受 `limit`（ge=1、le=`PAGINATION_MAX_LIMIT`）與 `offset`（ge=0），並以 `PaginatedResponse[T]` 回應，內含 `items`、`total`、`limit`、`offset`、`has_more`、`total_pages`、`next_offset`，全部由 `total`/`limit`/`offset` 推導，不得額外查詢資料庫。`offset` 達到或超過 `total` 時必須回傳空 `items` 陣列與 `has_more: false`，而非 `404`。（正典：FR-003、FR-068、FR-069）

#### Scenario: 分頁推導欄位
- **WHEN** 以 total=25、limit=10、offset=10 組出分頁回應
- **THEN** `has_more` 為 `true`、`total_pages` 為 `3`、`next_offset` 為 `20`

#### Scenario: offset 超過 total
- **WHEN** 列表請求的 `offset` ≥ `total`
- **THEN** 回應為 `200`，`items` 為空且 `has_more: false`

### Requirement: 啟動期設定驗證
後端必須僅從環境變數載入所有機密與環境相依設定（DB URL、CORS origins，以及未來的 JWT/cookie 機密），於啟動時驗證，缺漏或非法值必須 fail fast（非零結束碼）。production 環境必須拒絕 `ALLOWED_ORIGINS=*`。（正典：FR-020、FR-021、FR-022）

#### Scenario: 缺少必要變數
- **WHEN** 應用程式在缺少必要環境變數的情況下啟動
- **THEN** 啟動在服務任何請求之前即以驗證錯誤中止

#### Scenario: 拒絕萬用字元 CORS
- **WHEN** production 設定指定 `ALLOWED_ORIGINS=*`
- **THEN** 啟動驗證失敗

### Requirement: 資料庫 session 與 migration 基線
後端必須提供 async database engine 與擁有交易邊界（begin/commit/rollback）的 `get_db` 依賴、metadata 定義 `ix`/`uq`/`ck`/`fk`/`pk` 命名慣例的 `DeclarativeBase`，以及經 `run_sync` 支援 async engine 且採用可讀 migration 檔名模板的 Alembic。本機預設資料庫必須為 SQLite，PostgreSQL 經 `DATABASE_URL` 切換（ADR-024）。（正典：FR-072、FR-074、FR-104、FR-107）

#### Scenario: 套用命名慣例
- **WHEN** 由共用 metadata 產生 constraint
- **THEN** 其名稱遵循宣告的慣例，而非無名 constraint

#### Scenario: 資料庫層級切換
- **WHEN** `DATABASE_URL` 指向 PostgreSQL 而非預設 SQLite
- **THEN** 同一套 session factory 與 migrations 無需修改即可運作

### Requirement: 密碼雜湊原語
後端必須將密碼雜湊集中於安全模組，採 bcrypt 且 cost factor ≥ 12，提供 hash 與 verify 操作；不得使用弱雜湊（MD5、SHA-1、未加鹽 SHA-256）。（正典：FR-080）

#### Scenario: 往返驗證
- **WHEN** 密碼經雜湊後以相同明文驗證
- **THEN** 驗證成功

#### Scenario: 拒絕錯誤密碼
- **WHEN** 以不同明文執行驗證
- **THEN** 回傳 false

### Requirement: 請求關聯
後端必須為每個 HTTP 請求產生唯一的 `correlation_id`（UUID v4），注入 `X-Correlation-ID` 回應標頭，並納入該請求的日誌 context。（正典：FR-046）

#### Scenario: 回應帶關聯 ID
- **WHEN** 處理任何 HTTP 請求
- **THEN** 回應的 `X-Correlation-ID` 帶有 UUID v4 值

#### Scenario: 日誌帶關聯 ID
- **WHEN** 請求日誌 middleware 記錄一筆請求
- **THEN** 日誌紀錄包含與回應標頭相同的 `correlation_id`

### Requirement: Health check 端點
後端必須提供 `GET /api/v1/health` 作為公開、免認證端點，回傳 `200` 與 `HealthResponse`（`status`、`version`），並經由模組套件內的 `APIRouter` 掛載而非寫在 `main.py`。OpenAPI docs 必須在開發環境啟用，在 production 由 `ENABLE_OPENAPI_DOCS`（預設停用）控制。（正典：FR-002、FR-004、FR-007、FR-070）

#### Scenario: Health check 成功
- **WHEN** 客戶端不帶憑證呼叫 `GET /api/v1/health`
- **THEN** 回應為 `200`，帶 `status` 與 `version` 欄位

#### Scenario: production 預設隱藏 docs
- **WHEN** 應用程式於 production 執行且未設定 `ENABLE_OPENAPI_DOCS`
- **THEN** 不提供 `/docs` 與 `/redoc`

### Requirement: 具模組邊界的前端 scaffold
前端必須為 Vite + React + TypeScript strict 專案，採 vertical slice 組織：`features/` 模組之間不得互相 import 內部檔案、`shared/` 僅收納 2 個以上 feature 共用的領域中立程式碼，且 lint 層檢查必須擋下邊界違規。元件必須為 function component + hooks，props 與 handler 皆須明確型別。（正典：FR-012、FR-013、FR-014、FR-057、FR-108）

#### Scenario: 擋下邊界違規
- **WHEN** 某 feature 模組 import 另一個 feature 的內部檔案
- **THEN** lint 邊界檢查失敗

#### Scenario: 型別檢查閘門
- **WHEN** 對 scaffold 執行 `tsc --noEmit`
- **THEN** 於 strict mode 下 exit 0

### Requirement: 前端共用 API 基礎設施
前端必須提供可讀取回應 `X-Correlation-ID` 的型別化 API client、retry callback 對認證錯誤回傳 false 的 TanStack Query client，以及集中於共用常數模組的 query keys（不得出現行內 query-key 字串陣列）。（正典：FR-046；SC-019、SC-020）

#### Scenario: 認證錯誤不重試
- **WHEN** 查詢以 HTTP 401 失敗
- **THEN** query client 不重試該請求

#### Scenario: 關聯 ID 可讀取
- **WHEN** API 回應包含 `X-Correlation-ID`
- **THEN** client 將該值暴露給呼叫端

### Requirement: 前端 health check 頁面
前端必須提供公開的 `/health-check` 路由，呼叫 health 端點並渲染 Loading、Success（狀態文字）、Error（行內錯誤文字）三態。此頁為內部工程驗證頁，豁免 Storybook、i18n 與響應式需求。（正典：plan.md §Phase 1.3；FR-108）

#### Scenario: 渲染成功狀態
- **WHEN** 頁面掛載且 health API 回傳 `200`
- **THEN** 渲染狀態文字

#### Scenario: 渲染網路錯誤
- **WHEN** health API 無法連線
- **THEN** 渲染行內錯誤訊息

### Requirement: 可重現的本機 bootstrap
Repo 必須提供可重現的本機 bootstrap 契約：涵蓋所有必要變數的 `.env.example`、供 CI／整合測試的 PostgreSQL Docker Compose profile、seed 資料策略 stub，以及能證明後端與前端可啟動且 health check 通過的驗證腳本（或文件化指令清單）。Bruno collection 骨架（`backend/bruno/`，含 `bruno.json`、local environment 與 health 請求）必須隨 health 路由一併進版。（正典：FR-130、FR-131；SC-045）

#### Scenario: bootstrap 驗證
- **WHEN** 開發者在乾淨 checkout 上遵循 bootstrap 契約
- **THEN** 驗證指令確認後端 health 端點有回應

#### Scenario: Bruno 請求存在
- **WHEN** health 路由落地
- **THEN** `backend/bruno/foundation/000-foundation/get-health.bru` 存在並描述該請求

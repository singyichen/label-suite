# Design: implement-foundation-core

## Context（脈絡）

本變更的常設架構文件是 `specs/foundation/000-foundation/plan.md`（v2.0.0，依 ADR-033 Open Questions 裁決永久保留為基線）。目錄佈局、Phase 0 技術決策、schema 階層、API 端點清單、前端 slice 分析與測試情境都已定案於該文件。本 design.md 不重述 —— 只記錄變更層級的契約與 plan 留白的少數決策；因本變更引入 API 契約與 DB session 基線，design.md 為強制產出。

現況：`backend/`、`frontend/` 目錄皆不存在；CI 已有 path-gated 的 backend／frontend jobs；`design/prototype/` 下的 prototype 是 UX 參照，本變更不動。

## Goals / Non-Goals（目標／非目標）

**目標：**

- 可執行的 FastAPI 後端骨架與 Vite/React 前端骨架，經 `GET /api/v1/health` 端到端串通。
- 每一項跨模組契約（error envelope、分頁、設定驗證、correlation、命名慣例）都完全依正典 FR 措辭實作，且各有測試證明。
- 新機器可照做的 bootstrap 契約（FR-130）。

**非目標：**

- 不含認證端點、領域模組、Celery、Prometheus/Grafana/Sentry（Foundation-Observability 後續處理）、`RestrictedClientSafeBaseSchema`（隨第一個承載資料的模組）、OpenAPI-to-TypeScript codegen（隨 account/001 第一個真實 API 啟用 —— 先以 `frontend/src/shared/types/` 手寫暫代型別）。

## API Contract（API 契約 —— 強制章節：本變更引入 API 基線）

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/api/v1/health` | 無（公開） | — | `200 HealthResponse { status: str, version: str }` | 非預期失敗回 `ErrorResponse` |

共用 schemas（位於 `backend/app/schemas/common.py`，皆繼承 `AppBaseModel`）：

- `ErrorDetail { loc: list[str|int]|None, msg: str, type: str, error_code: str|None }`（FR-116）
- `ErrorResponse { detail: str | list[ErrorDetail] }`（FR-115）
- `PaginatedResponse[T] { items: list[T], total: int, limit: int, offset: int, has_more: bool, total_pages: int, next_offset: int|None }`（FR-068/069）；TypeVar 泛型，衍生欄位由 total/limit/offset 計算。
- `HealthResponse { status: str, version: str }`

DB schema 影響：無 —— 尚無領域資料表；Alembic 已接妥（async `run_sync`、命名慣例 metadata、可讀檔名模板），`versions/` 為空。

## Decisions（決策）

1. **SQLite 預設／PostgreSQL 經 `DATABASE_URL`**（ADR-024）。替代案 —— 本機僅走 Docker PostgreSQL —— 否決：墊高 bootstrap 門檻；session factory 與 migrations 皆與層級無關。
2. **`get_db` 擁有交易邊界**（FR-072 方案 B）：依賴函式負責 begin/commit/rollback；service 層在出現跨 service 交易需求前不碰 session 生命週期。替代案 —— 各 service 顯式 `async with db.begin()` —— 延後至第一個多寫入流程的模組。
3. **Correlation middleware 每請求產生 UUID v4**（依 FR-046 原文；不沿用 inbound 值 —— 以正典措辭為準）。使用標準函式庫 `uuid4`，無外部依賴。
4. **標準 `logging` + JSON formatter** 而非 structlog（plan Phase 0）：依賴最少；日後 Observability 若需要，替換範圍侷限在單一模組。
5. **直接使用 `bcrypt` 套件**（cost 12，FR-080）而非 passlib：passlib 對新版 bcrypt 已乏維護；輔助函式只存在於 `app/core/security.py`，選型被封裝。
6. **health 模組僅含 `router.py`**（plan 複雜度追蹤）：無 service／repository —— 沒有可編排的邏輯；加空層違反 Simplicity First。
7. **前端邊界以 ESLint 規則在 scaffold PR 落地**（FR-014 最低限度：禁 feature 互 import 與 `shared/`→`features/`）；dependency-cruiser 日後可加，不影響契約。
8. **Bruno 骨架隨 health 路由 PR 進版**（FR-131 主規則，非骨架豁免條款）：collection scaffold 極小，避免一個只裝 `.bru` 檔的後續 PR。

## Risks / Trade-offs（風險／取捨）

- [backend／frontend jobs 首次真實執行可能暴露 workflow 設定漂移] → 第一個後端 PR 保持最小（僅 schemas + 測試），讓 CI 問題對上最小 diff；僅當 job 本身壞掉才在同 PR 修 workflow，否則另開 PR。
- [uv／pnpm lockfile 首次進版；本機 Node／Python 版本不一] → 以 `pyproject.toml`（`requires-python`）與 `package.json`（`engines`）釘版本，寫入 bootstrap 契約的 `.env.example`／README 段落。
- [stacked PR 系列在 review 期間可能漂離 `main`] → 每個 PR 獨立保持綠燈；依 repo 既有 stacked-PR 程序逐次 rebase。
- [pilot 雙寫（derived view vs 正典 spec）漂移] → archive 步驟執行採用計畫中的明確漂移檢查清單（derived view 不得殘留 delta 標題；FR-ID 交叉 grep）。

## Migration Plan（遷移計畫）

Greenfield —— 無可遷移之物。回滾 = revert 對應 PR；尚無資料或部署面。

## Open Questions（未決問題）

- 無阻塞項。`ENABLE_OPENAPI_DOCS` 預設矩陣（dev 開／prod 關）已編入 settings 並有測試；更細節的部署差異等第一個部署目標出現再談（不在本範圍）。

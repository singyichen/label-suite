---
對應 Spec: specs/foundation/000-foundation/spec.md
---

# Proposal: implement-foundation-core

## Why（為什麼）

Label Suite 的所有功能模組（account、task-management、annotation、dataset、admin）都被正典 Foundation spec（`specs/foundation/000-foundation/spec.md`，v1.12.2，2026-06 起即為 `spec-ready`）定義的工程基線擋住：目前 repo 尚無任何 `backend/` 或 `frontend/` 生產程式碼，只有靜態 prototype。實作 Foundation-Core 會把 spec 中的跨模組契約（API envelope、分層、安全、設定驗證、health check、前端 scaffold、bootstrap）落成可執行的程式碼，讓各功能模組的 spec 得以在其上開工。

本變更同時是 **OpenSpec Phase 4 pilot**（issue #356，維護者裁決 2026-08-25）：完整演練 propose → apply → archive 迴圈，包含 derived view 雙寫與正典 spec 回寫閘門。

## What Changes（改什麼）

範圍依常設架構計畫 `specs/foundation/000-foundation/plan.md`（v2.0.0，Foundation-Core：F-01–F-10、F-13、F-16、F-18；Observability F-17 延後至後續 Foundation-Observability 變更）：

- **後端核心 schemas 與設定**（`backend/app/`）：`AppBaseModel`（FR-103）、`ErrorDetail`/`ErrorResponse`（FR-115、FR-116）、含 `next_offset`/`has_more`/`total_pages` 的 `PaginatedResponse[T]`（FR-068、FR-069）、Pydantic Settings 啟動即 fail-fast 驗證（FR-020、FR-022）與 `ALLOWED_ORIGINS` 防護（FR-021）。
- **後端 DB 與 session**：async engine + 統一交易邊界的 `get_db` 依賴（FR-072）、含命名慣例的 `DeclarativeBase`（FR-104）、以 `run_sync` 接上 async 的 Alembic（FR-074）、可讀性 migration 檔名模板（FR-107）；本階段尚無任何領域資料表。
- **後端安全與 middleware**：bcrypt 雜湊／驗證輔助函式，cost ≥ 12（FR-080）、correlation-ID middleware（FR-046）與結構化請求日誌；統一例外處理器一律輸出 `ErrorResponse`（FR-115）。
- **後端 health 端點**：以 `APIRouter` 模組結構提供 `GET /api/v1/health`（FR-004、FR-007），`response_model=HealthResponse`（FR-002），並附 Bruno collection 骨架 `backend/bruno/`（FR-131）與僅限開發環境的 `/docs` 開關（FR-070）。
- **前端 scaffold**（`frontend/`）：Vite + React + TypeScript strict 專案，含 ESLint 邊界規則（FR-014）、vertical-slice 佈局 `features/` + `shared/` 收納規則（FR-013）、function component + hooks 基線（FR-108）。
- **前端共用基礎設施**：可讀取 `X-Correlation-ID` 的型別化 `api-client`、對認證錯誤不重試的 TanStack Query client（SC-020）、`QUERY_KEYS` 常數（SC-019）、`shared/types/` 內手寫的暫代 API 型別（FR-071 延後至首次 OpenAPI 匯出）。
- **前端 health check 頁面**：`HealthCheckPage`（路由 `/health-check`，公開，Loading／Success／Error 三態）作為端到端串接證明；依 plan.md §Phase 1.3 豁免 Storybook／i18n。
- **DevOps bootstrap**：`docker-compose.yml`（PostgreSQL 供 CI／整合測試）、`.env.example`、verify-bootstrap 腳本，落實可重現的本機 bootstrap 契約（FR-130）；SQLite 快速上手依 ADR-024。

正典需求文字不變：本變更是**實作**既有 FR；archive 時正典 spec 只做版本升級 + Changelog 條目記錄實作狀態（依 ADR-033 回寫規則），不新增需求措辭。

## Capabilities（能力）

### New Capabilities（新增能力）

- `foundation/000-foundation`：工程基線能力（正典 `specs/foundation/000-foundation/spec.md` 的 derived view）。`openspec/specs/` 目前為空，故就 derived view 視角而言屬新能力；delta 中每一條需求皆引用既有正典 FR/SC ID —— 本變更未發明任何新 ID。

### Modified Capabilities（修改能力）

_無 —— 尚無既存 derived capability，正典需求措辭亦無變動。_

## Impact（影響）

- **新增頂層目錄**：`backend/`（FastAPI + uv）、`frontend/`（Vite + React + pnpm）—— monorepo 首批生產程式碼。
- **CI**：後端 jobs（pytest、mypy --strict、ruff、pip-audit）與前端 jobs（tsc、lint、vitest、pnpm audit）已以 path-gated 形式存在於 `.github/workflows/`，將首次真正執行；每個 CI job 在 CLAUDE.md 保有對應本機指令。
- **依賴**：後端經 `uv add`（fastapi、pydantic-settings、sqlalchemy[asyncio]、aiosqlite、asyncpg、alembic、bcrypt，測試用 httpx/pytest）；前端經 `pnpm add`（react、react-router、@tanstack/react-query、vitest、testing-library、msw）。禁止 `pip install`／`npm install`。
- **不動**：`design/prototype/**`（prototype 維持為 UX 參照）、`specs/**`（直到 archive 回寫）、Observability stack（延後）、Celery（延後）。
- **PR 拆分計畫**：實作以 plan.md §Phase 2 里程碑為界的 stacked PR 系列落地（PR-FOUND-BE1…BE4、FE1…FE3、DEVOPS、BRUNO），每個 PR 控制在 ≤ 5 檔／≤ 300 行（測試除外）或明確說明理由 —— 見 tasks.md。變更容器（本資料夾）隨第一個 PR 進版，隨最後一個 PR archive。

## Constitution Check（憲法檢查）

依 `specs/_governance/constitution.md` 對本變更相關之設計期原則逐項檢查：

- **II. Generalization-First（不可協商）** —— Foundation-Core 不含任何 task-type 邏輯；config-driven 擴充點僅為契約（FR-024–FR-026 的落實隨第一個領域模組進場）。範圍內不存在硬編碼 task 判別。✅
- **III. Data Fairness（不可協商）** —— 未觸及任何資料集或 gold-label 資料；`RestrictedClientSafeBaseSchema`（F-07）不在 Foundation-Core 範圍，延後至第一個承載資料的模組。✅
- **IV. Test-First** —— tasks.md 中每個實作任務前都有失敗測試任務（pytest／Vitest／MSW）；TDD 順序已編入 tasks.md。✅
- **V. Code Quality & Simplicity** —— health 模組僅含 `router.py`（plan.md 複雜度追蹤：刻意省略 service／repository 層 —— 尚無領域邏輯）。✅
- **VI. English-First** —— 所有程式碼、註解、commit、PR 內文皆為英文。✅
- **XI. Security & Privacy Baseline（不可協商）** —— 機密僅走環境變數（FR-020）、production 啟動即拒絕 `ALLOWED_ORIGINS=*`（FR-021）、bcrypt cost ≥ 12（FR-080）；尚無認證端點，rate limiting（FR-079）隨 account/001 進場。✅
- **X. Change Scope Discipline** —— 如上 PR 拆分計畫；每個 PR 單一目的且守住規模上限。✅
- **XVII. CI/CD Quality Gates** —— 每個任務須通過 CLAUDE.md 驗證指令（exit 0）；CI jobs 以 `backend/**`／`frontend/**` path-gated。✅
- **XIX. Environment & Configuration Integrity** —— `.env.example` + 啟動 fail-fast 驗證（FR-022）；SQLite／PostgreSQL 分層依 ADR-024。✅
- **XX. Source of Truth & Contract Governance** —— 正典維持為 `specs/foundation/000-foundation/spec.md`；archive 回寫做版本升級 + Changelog（ADR-033 Rule 1）；derived view 標頭載明正典路徑與 FR ID。✅

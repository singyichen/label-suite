# Tasks: implement-foundation-core

PR 拆分計畫（依 config 任務粒度規則明示）：下方每個 `## N.` 群組即一個 stacked PR（`PR-FOUND-*` 邊界），分支依 repo 命名規則（`feat/foundation-core-*`）；每個 PR 獨立保持綠燈並控制在 ≤ 5 個生產檔／≤ 300 行（測試除外），或自帶明確理由（專案 scaffolding 檔屬設定檔，計入但無邏輯）。每個群組內部遵守 TDD 順序：失敗測試任務先於實作任務；任務僅在其標明的驗證指令 exit 0 時才算完成。後端指令一律於 `backend/` 以 `uv run` 執行；前端於 `frontend/` 以 `corepack pnpm` 執行。

派工標記：每個任務尾綴唯一 `[@agent-name]` 標籤，對應 `.claude/agents/` 的 agent；`[@main]` 保留給主 session 親自執行的任務（openspec CLI 工作流、PR 操作、archive 回寫）。預設全序列執行；跨群組平行性與依賴以各群組下方的引用區塊說明。

## 1. PR-FOUND-BE1 —— 後端專案 + 核心 schemas 與設定

- [x] 1.1 以 uv 建立 `backend/` 骨架（`pyproject.toml` 含 `requires-python`、fastapi、pydantic-settings，dev 依賴 pytest/httpx；`app/__init__.py`、`tests/`）；驗證：`uv run pytest tests/ -q` 可執行（收集 0 個測試、exit 0）且 `uv run ruff check .` exit 0 `[@senior-backend]`
- [ ] 1.2 撰寫失敗測試 `tests/core/test_schemas.py`：`AppBaseModel` 的 model_config、`ErrorDetail`/`ErrorResponse` 欄位、`PaginatedResponse[T]` 衍生欄位 `has_more`/`total_pages`/`next_offset`（含 offset ≥ total ⇒ 空頁語意）；驗證：於 1.3 前確認測試為紅 `[@senior-backend]`
- [ ] 1.3 實作 `app/schemas/common.py`（`AppBaseModel`、`ErrorDetail`、`ErrorResponse`、泛型 `PaginatedResponse[T]`、`HealthResponse`）；驗證：`uv run pytest tests/core/test_schemas.py -q` 綠且 `uv run mypy app/ --strict` exit 0 `[@senior-backend]`
- [ ] 1.4 撰寫失敗測試 `tests/core/test_config.py`：缺必要環境變數即 fail-fast；production 模式拒絕 `ALLOWED_ORIGINS=*`；驗證：於 1.5 前確認為紅 `[@senior-backend]`
- [ ] 1.5 實作 `app/core/config.py`（pydantic-settings `Settings`、啟動驗證含萬用字元 CORS 防護、`ENABLE_OPENAPI_DOCS` 預設矩陣）；驗證：`uv run pytest tests/core/ -q` 綠 + mypy + ruff 皆 exit 0 `[@senior-backend]`

> 依賴：1.1 → 1.2 → 1.3 → 1.4 → 1.5 序列（TDD 紅綠成對）。本組全數 `[@senior-backend]`；是整條後端鏈的起點，無前置依賴。

## 2. PR-FOUND-BE2 —— 後端 DB 與 session 基線

- [ ] 2.1 撰寫失敗測試 `tests/db/test_session.py`：`get_db` yield async session 並負責 commit/rollback；`tests/db/test_naming.py`：metadata 命名慣例涵蓋 ix/uq/ck/fk/pk；驗證：先確認為紅 `[@senior-dba]`
- [ ] 2.2 實作 `app/db/base.py`（DeclarativeBase + 命名慣例）與 `app/db/session.py`（由 `DATABASE_URL` 建 async engine、SQLite 預設、`get_db` 依賴）；驗證：db 測試綠 + mypy strict `[@senior-dba]`
- [ ] 2.3 接上 Alembic：`alembic.ini`（可讀檔名模板）、`alembic/env.py` async `run_sync` 模式、空的 `versions/`；驗證：`uv run alembic upgrade head` 對 SQLite exit 0 `[@senior-dba]`

> 依賴：依賴第 1 組（`Settings` 提供 `DATABASE_URL`）；2.1 → 2.2 → 2.3 序列。本組全數 `[@senior-dba]`（schema 層 base／session／migration 同一人維護，避免跨 agent 交接）。

## 3. PR-FOUND-BE3 —— 後端安全與 middleware

- [ ] 3.1 撰寫失敗測試 `tests/core/test_security.py`：bcrypt 雜湊／驗證往返、錯誤密碼負向案例、cost ≥ 12；驗證：先確認為紅 `[@senior-backend]`
- [ ] 3.2 實作 `app/core/security.py`（bcrypt hash/verify 輔助函式）；驗證：security 測試綠 + mypy strict `[@senior-backend]`
- [ ] 3.3 撰寫失敗測試 `tests/middleware/test_correlation.py`：每個回應皆帶 UUID v4 `X-Correlation-ID`；日誌紀錄含同一 id；驗證：先確認為紅 `[@senior-backend]`
- [ ] 3.4 實作 `app/middleware/`（correlation middleware + 以標準 logging 輸出 JSON 請求日誌）與輸出 `ErrorResponse` 的統一例外處理器；驗證：middleware 測試綠，且 SC-035 處理器測試（自訂例外 ⇒ `ErrorResponse`，非 FastAPI 預設格式）通過 `[@senior-backend]`

> 依賴：依賴第 1 組（schemas／Settings）；不依賴第 2 組資料表，但 stacked 鏈順序為 2 → 3。3.1 → 3.2 與 3.3 → 3.4 兩對 TDD 序列。

## 4. PR-FOUND-BE4 —— health 端點 + 應用組裝 + Bruno

- [ ] 4.1 撰寫失敗測試 `tests/core/test_health.py`：`GET /api/v1/health` ⇒ 200 `HealthResponse`；回應帶 `X-Correlation-ID`；422 路徑回 `ErrorResponse`；production 模式未設 `ENABLE_OPENAPI_DOCS` 時 docs 停用；驗證：先確認為紅 `[@senior-backend]`
- [ ] 4.2 實作 `app/modules/health/router.py`（僅 router 的模組）、`app/api/v1/router.py`、`app/main.py`（app factory 串接 settings／middleware／handlers／docs 開關）；驗證：`uv run pytest tests/ -q`、mypy strict、ruff 皆 exit 0 `[@senior-backend]`
- [ ] 4.3 加入 Bruno 骨架 `backend/bruno/`（`bruno.json`、`environments/local.bru`、`foundation/000-foundation/get-health.bru` 含範例回應）；驗證：檔案存在且 get-health.bru 描述該請求（FR-131 主規則 —— 與路由同 PR）`[@senior-backend]`

> 依賴：依賴第 1–3 組全部（app factory 組裝所有前置件）；4.1 → 4.2 → 4.3 序列。

## 5. PR-FOUND-FE1 —— 前端專案 scaffold

- [ ] 5.1 建立 `frontend/` 骨架（Vite + React + TS strict：`package.json` 含 `engines`、`vite.config.ts`、`tsconfig.json`、`eslint.config.js` 含禁止 feature→feature 與 shared→features import 的邊界規則、`src/` vertical-slice 骨架 `features/`+`shared/`）；驗證：`corepack pnpm tsc --noEmit` 與 `corepack pnpm lint` exit 0 `[@senior-frontend]`
- [ ] 5.2 加入證明邊界規則會觸發的 lint fixture（在 test-only 檔放暫時性違規 import，以 ESLint 結束碼斷言後移除，或保留為 lint 測試）；驗證：邊界違規被回報，且乾淨狀態 lint 綠 `[@senior-frontend]`

> 依賴：與後端鏈（第 1–4 組）**零檔案交集，可平行**（`[@senior-frontend]` ∥ `[@senior-backend]`；health 契約已凍結於 design.md，前端測試以 MSW mock，不需等後端程式碼）。平行派工時以 worktree 隔離前端軌，避免與後端軌同時寫入 repo。5.1 → 5.2 序列。

## 6. PR-FOUND-FE2 —— 前端共用基礎設施

- [ ] 6.1 撰寫失敗測試 `src/shared/__tests__/api-client.test.ts`（client 暴露回應的 `X-Correlation-ID`）與 `query-client.test.ts`（401 ⇒ 不重試，SC-020）；驗證：先確認為紅（Vitest）`[@senior-frontend]`
- [ ] 6.2 實作 `shared/api/api-client.ts`、`shared/api/query-client.ts`、`shared/constants/query-keys.ts`（`QUERY_KEYS.health.status`，SC-019）、`shared/types/api.ts` 暫代型別；驗證：`corepack pnpm test` 綠 + tsc + lint exit 0 `[@senior-frontend]`

> 依賴：依賴第 5 組；與後端鏈可平行（同第 5 組說明）。6.1 → 6.2 序列。

## 7. PR-FOUND-FE3 —— 前端 health check 頁面

- [ ] 7.1 以 MSW 撰寫失敗元件測試 `src/features/health/__tests__/HealthCheckPage.test.tsx`：成功渲染狀態文字；網路錯誤渲染行內錯誤；載入中顯示 "Checking..."；驗證：先確認為紅 `[@senior-frontend]`
- [ ] 7.2 實作 `features/health/HealthCheckPage.tsx` + 公開 `/health-check` 路由組合；驗證：元件測試綠 + tsc + lint exit 0 `[@senior-frontend]`

> 依賴：依賴第 6 組；與後端鏈可平行（同第 5 組說明）。7.1 → 7.2 序列。

## 8. PR-FOUND-DEVOPS —— bootstrap 契約

- [ ] 8.1 加入 `docker-compose.yml`（PostgreSQL profile 供 CI／整合測試）、涵蓋 `app/core/config.py` 所有必要變數的 `.env.example`、seed 策略 stub；驗證：`docker compose config` exit 0 且以腳本比對 `.env.example` 鍵與 Settings 欄位一致 `[@senior-devops]`
- [ ] 8.2 加入 `scripts/verify-bootstrap.sh`（啟動後端、curl `/api/v1/health`、回報 pass/fail）並文件化 bootstrap 指令清單；驗證：在乾淨 checkout 以 SQLite 預設執行該腳本 exit 0（SC-045／FR-130）`[@senior-devops]`

> 依賴：8.1 依賴 1.5（`.env.example` 需比對 `Settings` 欄位）；8.2 依賴第 4 組（health 端點需可啟動）。與前端軌可平行。8.1 → 8.2 序列。

## 9. 整合驗證與 pilot 收尾（隨最後一個 PR 進版）

- [ ] 9.1 端到端檢查：後端啟動、前端 dev server 啟動、`/health-check` 頁面顯示來自真實 API 的狀態；驗證：手動確認並記錄於 PR body `[@senior-qa]`
- [ ] 9.2 執行完整驗證矩陣（後端 pytest/mypy/ruff；前端 tsc/lint/test）並確認每個 stacked PR 的 CI 綠燈；驗證：全部 exit 0 `[@senior-qa]`
- [ ] 9.3 歸檔變更（`/opsx:archive`）：回寫正典 `specs/foundation/000-foundation/spec.md`（版本升級 + Changelog 條目記錄 Foundation-Core 實作）、產生 derived view、執行 pilot 漂移檢查清單（derived capability 標頭載明正典路徑與 FR ID；不殘留 delta 標題；FR-ID 交叉 grep）；驗證：`openspec validate` exit 0 且 issue #356 的採用計畫 Pilot 驗收清單已打勾 `[@main]`

> 依賴：9.1 依賴第 1–8 組全部；9.2 依賴 9.1；9.3 依賴 9.2（archive 是最後動作，由主 session 執行 openspec CLI 工作流與正典回寫）。

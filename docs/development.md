# 本機開發指南

把 Label Suite 在本機跑起來所需要的一切：環境需求、一次性設定、日常開發指令、
整合測試與 seed 資料。

> 本文件同時是 foundation spec FR-130「可重現本機 bootstrap 契約」的指令面，
> 見〈[Bootstrap 契約驗證](#bootstrap-契約驗證fr-130sc-045)〉一節。

## 前置需求

| 工具 | 用途 | 安裝 |
|------|------|------|
| [uv](https://docs.astral.sh/uv/) | 後端套件與指令執行 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| [pnpm](https://pnpm.io/) | 前端套件 | `corepack enable && corepack prepare pnpm@latest --activate` |
| Node.js 20 | 前端 runtime（`frontend/package.json` 的 `engines` 與 `.npmrc` 的 `engine-strict=true` 會擋掉不符版本） | nvm 或官方安裝檔 |
| Docker（選用） | 只有要跑 PostgreSQL 整合測試時才需要 | Docker Desktop |

## 一次性設定

```bash
bash scripts/init.sh
```

會做三件事：把 `.env.example` 複製成 `backend/.env`（已存在則跳過）、檢查 uv 與
pnpm、在 `backend/` 跑 `uv sync`、在 `frontend/` 跑 `pnpm install`。

> `.env` 放在 `backend/` 而不是 repo 根目錄：`Settings` 的 `env_file=".env"`
> 是相對於行程工作目錄解析的（`backend/app/core/config.py`），而所有後端指令都
> 從 `backend/` 執行。放在根目錄不會被任何程式讀到。

## 日常開發指令

```bash
# 後端 dev server（app/main.py 只導出 create_app factory，故必須加 --factory）
cd backend && uv run uvicorn app.main:create_app --factory --reload

# 前端 dev server
cd frontend && pnpm dev

# Prototype 靜態站（產品畫面）
./scripts/serve-prototype.sh          # 預設 http://localhost:8888
./scripts/serve-prototype.sh 9000     # 自訂 port
```

| 服務 | 網址 |
|------|------|
| 後端 API | `http://127.0.0.1:8000/api/v1` |
| 後端 API 文件 | `http://127.0.0.1:8000/docs` |
| 前端 | `http://localhost:5173` |
| Prototype | `http://localhost:8888` |

前端 health check 頁面位於 `/health-check`，會呼叫真實後端 API（`api-client.ts`
直接打 `http://localhost:8000/api/v1`，沒有 Vite proxy，所以後端必須同時起著，
且 `ALLOWED_ORIGINS` 要包含前端來源）。

> **產品畫面在 prototype，不在 `frontend/`。** `frontend/` 目前是 Foundation-Core
> 交付的骨架，只有 `/health-check` 一條路由；任務清單、task-new、標註工作區、
> 審核員面板等畫面都還在 `design/prototype/`，尚未移植。要瀏覽產品畫面請起
> prototype 站，入口是 `index.html`（導覽頁）與 `components-showcase.html`
> （設計系統 living styleguide）。
>
> 請用 `scripts/serve-prototype.sh`，不要用 `python3 -m http.server`——後者的
> per-connection threading 在平行負載下會間歇性掉 socket，害不相關的測試 flake
> （`design/prototype/README.md`）。該腳本轉呼叫 `design/prototype/tests/serve.mjs`，
> 與 Playwright 測試用的是同一支 server，預覽與測試不會漂移。

## Bootstrap 契約驗證（FR-130／SC-045）

```bash
bash scripts/verify-bootstrap.sh
```

確認 bootstrap 契約檔案齊全、啟動後端、對 `GET /api/v1/health` 發出請求，
並在結束時關閉伺服器。exit 0 代表這份 checkout 可以啟動。乾淨 checkout 不需要
資料庫或容器——`Settings.database_url` 預設指向本機 SQLite 檔，health 路由也不
碰資料庫。

可用環境變數覆寫：`VERIFY_BOOTSTRAP_PORT`（預設 `8765`）、
`VERIFY_BOOTSTRAP_TIMEOUT`（預設 `30` 秒）。

## PostgreSQL（整合測試用）

`docker-compose.yml` 的唯一服務放在 `ci` profile 底下，所以不帶 profile 的
`docker compose up` 不會啟動任何東西。要跑對真實 PostgreSQL 的整合測試
（FR-031）時：

```bash
docker compose --profile ci up -d
cd backend && DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/label_eval_test uv run pytest
```

映像檔、帳密與資料庫名稱刻意與 `.github/workflows/ci.yml` 的 `postgres` service
container 一致，本機綠燈與 CI 綠燈才會指向同一個目標。

資料存在具名 volume `postgres_ci_data`，會跨多次 `up` 保留。要回到全新資料庫
（例如上一輪整合測試留下的資料在干擾判讀）：

```bash
docker compose --profile ci down -v
```

## Seed 資料

```bash
bash scripts/seed.sh
```

目前是 stub：Foundation-Core 尚未有任何 domain model 或 Alembic migration，沒有
資料可以 seed。腳本會明講自己未實作並以 exit 0 結束，細節見該檔頭部註解。

## 驗證命令

完整的後端／前端／prototype 驗證命令矩陣見 [CLAUDE.md](../CLAUDE.md) 的
「Verification Commands」章節。

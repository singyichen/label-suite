# Label Suite 部署指南

> **狀態**：前後端尚未實作，本文件描述「先建部署骨架」的完整流程。
> 部署骨架不依賴應用程式碼——先用佔位映像（placeholder image）驗證整條部署路徑，
> 之後前後端完成時只需替換 image 名稱與掛上真實設定。
>
> 架構決策依據：[ADR-008（Docker Compose 容器化）](../adr/008-containerization-docker-compose.md)、
> [ADR-023（Docker Compose + Nginx 部署）](../adr/023-cicd-docker-compose-nginx-deployment.md)。

---

## 目錄

0. [部署進度檢查表（即時更新）](#0-部署進度檢查表即時更新)
1. [為什麼可以在實作前先做部署](#1-為什麼可以在實作前先做部署)
2. [環境總覽](#2-環境總覽)
3. [Phase 1 — 在 Mac 上建立 Ubuntu VM（Multipass）](#3-phase-1--在-mac-上建立-ubuntu-vmmultipass)
4. [Phase 2 — VM 初始化（Docker Engine + Host-level Nginx）](#4-phase-2--vm-初始化docker-engine--host-level-nginx)
5. [Phase 3 — TLS 憑證（mkcert）](#5-phase-3--tls-憑證mkcert)
6. [Phase 4 — Compose 部署骨架（佔位映像）](#6-phase-4--compose-部署骨架佔位映像)
7. [Phase 5 — 驗證清單](#7-phase-5--驗證清單)
8. [前後端實作完成後的接軌步驟](#8-前後端實作完成後的接軌步驟)
9. [正式環境部署（dell-7820）](#9-正式環境部署dell-7820)
10. [常見問題](#10-常見問題)
11. [對 Mac 主機的影響、隔離性與完全移除](#11-對-mac-主機的影響隔離性與完全移除)
12. [CI/CD 自動部署（GitHub Actions）](#12-cicd-自動部署github-actions)

---

## 0. 部署進度檢查表（即時更新）

> 本節是整份文件所有**可執行步驟**的即時進度。標注 **🧑** 的項目需要系統密碼或瀏覽器操作，
> 由使用者執行；其餘由 Claude 執行並即時打勾。最後更新：2026-07-07。

### Phase 1 — Mac 端準備（§3、§5.1）

- [x] 安裝 mkcert（`brew install mkcert`）
- [x] 簽發三張憑證：staging / portainer / grafana（`~/certs/label-suite/`，效期至 2028-10）
- [x] 🧑 `mkcert -install` 將 CA 加入系統信任（需密碼）
- [x] 🧑 安裝 Multipass（`brew install multipass`，需密碼；v1.16.3）
- [x] 建立 VM（`multipass launch 24.04 --name label-suite-staging --cpus 4 --memory 4G --disk 40G`）
- [x] 確認 VM IPv4：**192.168.252.2**
- [ ] （選用）加入 SSH 公鑰供標準 `ssh` / VS Code Remote-SSH 使用（§3.4）

### Phase 2 — VM 初始化（§4）

- [x] 安裝 Docker Engine（官方 apt 來源；29.6.1 + Compose v5.3.0）
- [x] `ubuntu` 使用者加入 `docker` 群組
- [x] 安裝 host-level Nginx（1.24.0）
- [x] 建立 `/data/label-suite/staging/` 資料目錄結構

### Phase 3 — TLS 與網域（§5）

- [x] 🧑 Mac `/etc/hosts` 加入三筆 `.test` 網域 → `192.168.252.2`（2026-07-07 完成）
      穩健寫法（先補換行，避免黏行）：
      `sudo sh -c 'printf "\n192.168.252.2  staging.label-suite.test portainer.label-suite.test grafana.label-suite.test\n" >> /etc/hosts'`
- [x] 憑證傳入 VM `/etc/nginx/certs/`（含私鑰權限 600）

### Phase 4 — 部署服務（§6）

- [x] 建立 compose 目錄：`docker-compose.yml` + `.env`（隨機密碼，VM 內生成）+ `prometheus.yml`
- [x] 監控資料目錄權限（prometheus→65534、grafana→472）
- [x] `docker compose up -d` — 7 個服務全部 running/healthy
- [x] 部署 Portainer（獨立 tooling Compose 專案）
- [x] 🧑 Portainer 首次登入建立管理員帳號（2026-07-07 完成；見下方 setup token 說明）
- [x] 設定 host-level Nginx：staging / portainer / grafana 三個 server block + 預設站台移除
      （注意：Ubuntu 24.04 的 nginx 1.24 不支援 `http2 on;`，實機使用 `listen 443 ssl http2;`）
- [x] 🧑 Grafana 首次登入、新增 Prometheus datasource、匯入 dashboard 9628 / 763
      （2026-07-07：PostgreSQL dashboard 確認顯示真實數據，version 16.14.0；admin 密碼在 VM 的 `.env`）
      注意：新版 Grafana 匯入路徑為 Dashboards → 右上 **New ▾ → Import**，
      匯入時必須在 `DS_PROMETHEUS` 下拉選 `prometheus` 資料源

### Phase 5 — 驗證（§7）

- [x] §7 驗證清單——curl 可驗證項目全數通過（2026-07-07；瀏覽器項目待 /etc/hosts 後確認）

### Phase 6 — CI/CD 自動部署（§12；公開 repo + 嚴格緩解方案）

- [x] 建立分支 `ci/deploy-develop-automation`
- [x] deploy 設定納入版控：`deploy/develop/`（compose + prometheus + env.example）+ `deploy/nginx/`（三個 server block）+ `deploy/README.md`
- [x] 新增 `.github/workflows/deploy-develop.yml`（只綁 push、self-hosted runner、`install` 同步保留 `.env`、健康檢查重試）
- [x] VM 內安裝 self-hosted runner（2026-07-07；runner 2.335.1 ARM64，name `label-suite-develop-vm`，label `deploy-develop`，systemd 服務 online）
- [x] repo 安全設定：fork PR 核准政策收緊為 `all_external_contributors`；workflow 預設權限 `read`（2026-07-07）
- [x] 推送分支並開 PR：[#98](https://github.com/singyichen/label-suite/pull/98)（合併到 main 後才會實際觸發自動部署）

---

## 1. 為什麼可以在實作前先做部署

部署基礎設施與應用程式碼是兩條獨立的工作線。以下項目**完全不需要**前後端程式碼即可建立並驗證：

| 項目 | 驗證方式 |
|------|----------|
| Ubuntu VM 環境 | VM 可開機、可 SSH、Docker 可運作 |
| Host-level Nginx 拓撲 | 依 `server_name` 路由到不同 loopback 埠 |
| TLS 終止與 HTTP→HTTPS 轉址 | 瀏覽器顯示 🔒、`curl -I http://…` 回 301 |
| Compose 專案隔離（staging/prod） | 兩個 Compose 專案各自的網路、volume、埠不互相干擾 |
| PostgreSQL / Redis 服務 | 容器啟動、資料持久化、健康檢查通過 |
| 反向代理 header 傳遞 | 佔位服務回顯 `X-Forwarded-Proto` 等 header |

先建好這條路的好處：前後端完成後的「首次部署」從高風險事件變成例行替換 image tag 的操作，
且 Nginx 設定檔、TLS 流程、環境隔離策略都已在本機 VM 演練過，可近乎直接搬到正式主機。

---

## 2. 環境總覽

| 環境 | 分級 | 位置 | 用途 | TLS 來源 |
|------|------|------|------|----------|
| 本機開發 | develop | Mac 上直接 `docker compose up` | 日常開發迭代 | 無（HTTP） |
| **本機部署演練 VM**（本文件重點） | **develop（部署演練）** | Mac 上的 Multipass Ubuntu VM | 部署流程演練、正式環境設定檔的試驗場 | mkcert（本機信任 CA） |
| Staging | staging | `dell-7820`（與 production 同機、隔離 Compose 專案） | 上線前驗證 | Cloudflare Origin CA |
| Production | production | `dell-7820` | 正式服務 | Cloudflare Origin CA（Full strict） |

> **⚠️ 本文件 Phase 1–5 建立的是 develop 層級的部署演練環境**，不是 ADR-023 定義的 staging。
> 它模擬 `dell-7820` 的角色（Docker Engine + host-level Nginx 的 Ubuntu 伺服器），
> 但以下產物**僅限演練、一律不可晉升**到 staging / production：
>
> - **憑證與私鑰**（mkcert 為本機開發 CA，正式環境用 Cloudflare Origin CA）
> - **Docker image**（本機建置為 arm64；staging/production 只接受 CI 建置的 amd64 不可變 tag）
> - **`.env` 內容**（密碼、金鑰各環境獨立產生，絕不共用）
> - **資料**（VM 內資料視為可拋棄；亦不得將正式資料匯入 VM）
>
> **可以晉升的只有設定檔的「結構」**：Nginx server block、Compose 拓撲、目錄佈局——
> 在這裡驗證過的設計搬到正式機時，只需更換憑證來源、網域與 IP 白名單。
>
> 文件中 VM 與 Compose 專案沿用 `label-suite-staging` 命名是刻意的：演練的對象就是
> staging 的設定結構，命名一致才能讓設定檔近乎原樣搬移；網域用 `.test` TLD 已足以
> 區隔演練與正式環境（正式環境為真實網域）。

### 架構限制（重要）

Mac 為 Apple Silicon（arm64），VM 原生虛擬化也是 arm64；正式主機 `dell-7820` 為 x86_64。

- ✅ **部署流程、Nginx 設定、TLS、環境隔離**：架構無關，VM 演練結果可信。
- ⚠️ **Docker 映像**：本機建置的 arm64 image 不能推到正式機使用。正式 image 必須由 CI 建置
  `linux/amd64`，或本機用 `docker buildx build --platform linux/amd64` 交叉編譯。
- ❌ **不要**在 Mac 上跑 x86_64 VM——QEMU 全模擬速度慢到不可用。

---

## 3. Phase 1 — 在 Mac 上建立 Ubuntu VM（Multipass）

### 3.1 安裝 Multipass 並建立 VM

```bash
# 安裝 Multipass（安裝程式需要密碼）
brew install multipass

# 將 mkcert 的 CA 加入系統信任
mkcert -install

# 16GB RAM 的 Mac 建議配置：4 核 / 4GB / 40GB
multipass launch 24.04 --name label-suite-staging --cpus 4 --memory 4G --disk 40G
```

### 3.2 確認 VM 資訊

```bash
multipass info label-suite-staging
# 記下 IPv4（通常為 192.168.64.x），後續 /etc/hosts 與 mkcert 會用到
```

### 3.3 常用操作

```bash
multipass shell label-suite-staging    # 進入 VM
multipass stop  label-suite-staging    # 停止（釋放記憶體）
multipass start label-suite-staging    # 啟動
multipass transfer <本機檔案> label-suite-staging:<VM 路徑>   # 傳檔
```

> **注意**：Multipass 預設 NAT 網路下，VM 的 IP 在 Mac 重開機後可能改變。
> 若 IP 變了，同步更新 Mac 的 `/etc/hosts`（見 Phase 3）。

### 3.4 SSH 連線與部署狀態查看

`multipass shell` 底層即為 SSH，零設定可用；標準 `ssh` 指令需一次性加入自己的公鑰：

```bash
# 一次性設定：把 Mac 的公鑰加進 VM（沒有金鑰先 ssh-keygen -t ed25519）
multipass exec label-suite-staging -- bash -c \
  "echo '$(cat ~/.ssh/id_ed25519.pub)' >> ~/.ssh/authorized_keys"

# 之後即可標準 SSH 連線（也可供 VS Code Remote-SSH 使用）
ssh ubuntu@<VM_IP>
```

查看 Docker 部署狀態的常用指令（VM 內，或透過 `multipass exec` 遠端執行）：

```bash
docker compose -f /data/label-suite/staging/compose/docker-compose.yml ps       # 服務狀態與健康檢查
docker compose -f /data/label-suite/staging/compose/docker-compose.yml logs -f  # 追蹤日誌
docker stats                                                                    # 資源使用
```

> 用標準 SSH 管理 VM 的操作模式，與日後管理正式機 `dell-7820` 完全相同，可視為維運流程的預演。

---

## 4. Phase 2 — VM 初始化（Docker Engine + Host-level Nginx）

以下指令全部在 VM 內執行（`multipass shell label-suite-staging`）。

### 4.1 安裝 Docker Engine（官方 apt 來源）

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 讓 ubuntu 使用者免 sudo 執行 docker（重新登入後生效）
sudo usermod -aG docker ubuntu
```

### 4.2 安裝 Host-level Nginx

依 ADR-023：host-level Nginx 直接裝在主機上（不在任何 Compose stack 內），
獨佔 80/443，依 `server_name` 路由到各 Compose 專案綁定的 loopback 埠。

```bash
sudo apt-get install -y nginx
```

### 4.3 建立資料目錄（比照正式機的 `/data/label-suite/` 結構）

```bash
sudo mkdir -p /data/label-suite/staging/{compose,postgres,redis,uploads,prometheus,grafana}
sudo chown -R ubuntu:ubuntu /data/label-suite
```

---

## 5. Phase 3 — TLS 憑證（mkcert）

本機 VM 無公網 IP 與網域，Let's Encrypt HTTP-01 無法使用。採 **mkcert**：
在 Mac 上建立本機信任的 CA，簽出的憑證在這台 Mac 的瀏覽器會顯示正常 🔒，
可完整演練 HTTPS、secure cookie、HSTS 行為。

### 5.1 Mac 端：簽發憑證

```bash
brew install mkcert
mkcert -install    # 將本機 CA 加入系統信任儲存區（會要求密碼）

mkdir -p ~/certs/label-suite
cd ~/certs/label-suite
mkcert staging.label-suite.test
# 產出 staging.label-suite.test.pem（憑證）與 staging.label-suite.test-key.pem（私鑰）
```

### 5.2 Mac 端：設定 `/etc/hosts`

```bash
# <VM_IP> 換成 multipass info 查到的 IPv4
echo "<VM_IP>  staging.label-suite.test" | sudo tee -a /etc/hosts
```

### 5.3 傳憑證進 VM

```bash
multipass transfer ~/certs/label-suite/staging.label-suite.test.pem     label-suite-staging:/tmp/
multipass transfer ~/certs/label-suite/staging.label-suite.test-key.pem label-suite-staging:/tmp/
```

VM 內：

```bash
sudo mkdir -p /etc/nginx/certs
sudo mv /tmp/staging.label-suite.test*.pem /etc/nginx/certs/
sudo chmod 600 /etc/nginx/certs/staging.label-suite.test-key.pem
```

### 5.4 正式環境的對應做法

| 環境 | 憑證來源 | 說明 |
|------|----------|------|
| 本機 VM | mkcert | 僅這台 Mac 信任；私鑰不需保密到正式等級 |
| Staging / Production | Cloudflare Origin CA | 依 ADR-023 使用 Full (strict)；瀏覽器端 TLS 由 Cloudflare 管理 |
| 備選（有真實網域時） | Let's Encrypt DNS-01（certbot + Cloudflare API token） | 主機不需對外公開即可簽發，並可演練自動續期 |

---

## 6. Phase 4 — Compose 部署骨架（佔位映像）

在前後端實作完成前，用佔位映像撐起完整拓撲。佔位映像的職責是「證明路由與網路正確」。

> **與 ADR-024 三個 Compose 檔的對應關係**：
> [ADR-024](../adr/024-database-quickstart-sqlite-tiered.md) 規定 repo 根目錄提供
> `docker-compose.yml`（SQLite 快速啟動）、`docker-compose.prod.yml`（PostgreSQL 完整棧）、
> `docker-compose.dev.yml`（開發熱重載）三個檔案。
> **本文件的 VM / staging / production 部署一律對應 `docker-compose.prod.yml` 剖面**——
> SQLite 快速啟動僅供單人本機評估與論文 Demo，不得用於 staging 或 production
> （ADR-005 的 PostgreSQL 要求對部署環境仍具約束力）。
> 下方骨架即為 prod 剖面的前身；實作 PR 建立 `docker-compose.prod.yml` 後，本節內容應併入該檔。

### 6.1 檔案位置

VM 內 `/data/label-suite/staging/compose/`：

```text
compose/
  docker-compose.yml
  .env                 # 不進版控；由部署環境提供
```

### 6.2 `docker-compose.yml`（骨架版）

```yaml
name: label-suite-staging   # Compose 專案名稱，隔離網路與 volume 命名空間

services:
  # 佔位：之後換成正式 frontend+nginx image（ADR-023 中 Compose 內的 nginx 服務）
  edge:
    image: traefik/whoami    # 回顯請求 header 的極小服務，驗證代理鏈路用
    ports:
      - "127.0.0.1:8080:80"  # 只綁 loopback；對外一律經 host-level Nginx
    restart: unless-stopped

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /data/label-suite/staging/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - /data/label-suite/staging/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

`.env` 範例（實際值不進版控）：

```dotenv
POSTGRES_DB=label_suite
POSTGRES_USER=label_suite
POSTGRES_PASSWORD=<隨機產生>
```

啟動：

```bash
cd /data/label-suite/staging/compose
docker compose up -d
docker compose ps    # 所有服務應為 healthy / running（骨架三個；含監控棧為七個）
```

### 6.3 （選用）Portainer — Docker 視覺化管理介面

Portainer 提供網頁介面查看容器狀態、日誌、資源使用，可取代大部分 SSH + CLI 的日常巡檢。

**安全前提**：Portainer 掛載 `/var/run/docker.sock`，等於整台主機 Docker 的 root 級控制權，
因此必須只綁 loopback、經 host-level Nginx + TLS 對外，絕不可直接發布到對外埠。

Portainer 是主機層工具（管理所有 Compose 專案），自成一個 Compose 專案，
放在 `/data/label-suite/tooling/portainer/compose/docker-compose.yml`：

```yaml
name: label-suite-tooling

services:
  portainer:
    image: portainer/portainer-ce:lts
    ports:
      - "127.0.0.1:9443:9443"   # 只綁 loopback；Portainer 自帶自簽 HTTPS
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /data/label-suite/tooling/portainer/data:/data
    restart: unless-stopped
```

```bash
sudo mkdir -p /data/label-suite/tooling/portainer/{compose,data}
sudo chown -R ubuntu:ubuntu /data/label-suite/tooling
cd /data/label-suite/tooling/portainer/compose
docker compose up -d
```

Mac 端補一張憑證與 hosts 記錄：

```bash
cd ~/certs/label-suite
mkcert portainer.label-suite.test
# 傳進 VM 的 /etc/nginx/certs/（同 5.3 的做法）
echo "<VM_IP>  portainer.label-suite.test" | sudo tee -a /etc/hosts
```

VM 內新增 Nginx server block `/etc/nginx/sites-available/portainer`：

```nginx
server {
    listen 443 ssl http2;   # Ubuntu 24.04 的 nginx 1.24 不支援獨立的 `http2 on;` 指令
    server_name portainer.label-suite.test;

    ssl_certificate     /etc/nginx/certs/portainer.label-suite.test.pem;
    ssl_certificate_key /etc/nginx/certs/portainer.label-suite.test-key.pem;

    location / {
        proxy_pass https://127.0.0.1:9443;
        proxy_ssl_verify off;              # 上游為 Portainer 自簽憑證
        proxy_set_header Host $host;
        # 容器 console / 即時日誌需要 WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/portainer /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

之後在 Mac 瀏覽器開 `https://portainer.label-suite.test` 即可。

> **注意**：Portainer 首次啟動後有時效限制——必須在數分鐘內完成管理員帳號設定，
> 逾時會鎖定（頁面轉到 `/timeout.html`），需重啟容器後重試：
> `docker restart label-suite-tooling-portainer-1`。
>
> **Setup token（Portainer 2.27+ 新增）**：首次建立管理員帳號時，除了帳密還需填入一組
> **setup token**，它印在容器啟動日誌裡，且**每次重啟都會重新產生**。取得方式：
>
> ```bash
> docker logs label-suite-tooling-portainer-1 2>&1 | grep -o 'setup_token=[a-f0-9]*' | tail -1
> ```
>
> 密碼要求至少 12 字元。若不想使用 setup token，可在 compose 的 portainer command 加
> `--no-setup-token` 停用（僅建議在受信任的本機演練環境）。
>
> **免 Nginx 的替代方式**：SSH 通道 `ssh -N -L 9443:127.0.0.1:9443 ubuntu@<VM_IP>`，
> 再開 `https://localhost:9443`（會有自簽憑證警告，屬預期）。
>
> **正式機（dell-7820）**：同樣模式可沿用，但介面必須限制在管理 IP／校園 VPN 之後，
> 且不可經 Cloudflare 對公網發布。

### 6.4 監控棧（Prometheus + Grafana，依 ADR-018）

[ADR-018](../adr/018-observability-prometheus-grafana.md) 的基線監控棧**不依賴前後端程式碼**，
骨架階段即可部署並看到真實資料：PostgreSQL 與 Redis 的健康指標現在就有；
FastAPI / Celery 的應用指標等後端實作後補上 scrape job 即可。

在 §6.2 的 `docker-compose.yml` 中加入四個服務（依 ADR-023 拓撲，監控服務屬於各環境自己的 Compose 專案）：

```yaml
  prometheus:
    image: prom/prometheus:latest
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
    ports:
      - "127.0.0.1:9090:9090"   # 只綁 loopback；除錯用 SSH 通道即可，不經 Nginx 對外
    volumes:
      - /data/label-suite/staging/compose/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - /data/label-suite/staging/prometheus:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_SERVER_ROOT_URL: https://grafana.label-suite.test
    ports:
      - "127.0.0.1:3000:3000"   # 只綁 loopback；經 host-level Nginx 對外
    volumes:
      - /data/label-suite/staging/grafana:/var/lib/grafana
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    environment:
      DATA_SOURCE_NAME: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable
    restart: unless-stopped
    # 不發布任何埠：只在 Compose 內部網路供 Prometheus 抓取

  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      REDIS_ADDR: redis://redis:6379
    restart: unless-stopped
```

`.env` 增加一行：

```dotenv
GRAFANA_ADMIN_PASSWORD=<隨機產生>
```

`prometheus.yml`（放在 compose 目錄旁）：

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: postgres
    static_configs:
      - targets: ["postgres-exporter:9187"]

  - job_name: redis
    static_configs:
      - targets: ["redis-exporter:9121"]

  # 後端實作完成後解除註解（ADR-018 應用指標）
  # - job_name: backend
  #   static_configs:
  #     - targets: ["backend:8000"]
```

資料目錄權限（兩個服務以非 root 使用者執行）：

```bash
sudo chown -R 65534:65534 /data/label-suite/staging/prometheus   # prometheus 以 nobody 執行
sudo chown -R 472:472     /data/label-suite/staging/grafana      # grafana 以 uid 472 執行
```

Grafana 對外路由（同 Portainer 模式）：Mac 端 `mkcert grafana.label-suite.test`、
`/etc/hosts` 加一筆，VM 內新增 server block：

```nginx
server {
    listen 443 ssl http2;   # Ubuntu 24.04 的 nginx 1.24 不支援獨立的 `http2 on;` 指令
    server_name grafana.label-suite.test;

    ssl_certificate     /etc/nginx/certs/grafana.label-suite.test.pem;
    ssl_certificate_key /etc/nginx/certs/grafana.label-suite.test-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        # Grafana Live 需要 WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

首次登入 Grafana（admin / `.env` 中的密碼）後：

1. 新增 Prometheus datasource，URL 填 `http://prometheus:9090`
2. 匯入現成 dashboard 驗證資料流：PostgreSQL（ID `9628`）、Redis（ID `763`）
3. ADR-018 規劃的四張正式 dashboard（Service Overview / Worker Queue / Database / Cache）
   等應用指標接上後再建

> **正式機（dell-7820）**：Grafana 介面同樣不可經 Cloudflare 公開，
> 限制在管理 IP／校園 VPN 之後；Prometheus 與 exporter 一律不對外。

### 6.5 Host-level Nginx 設定

VM 內 `/etc/nginx/sites-available/label-suite-staging`：

```nginx
# HTTP → HTTPS 轉址
server {
    listen 80;
    server_name staging.label-suite.test;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;   # Ubuntu 24.04 的 nginx 1.24 不支援獨立的 `http2 on;` 指令
    server_name staging.label-suite.test;

    ssl_certificate     /etc/nginx/certs/staging.label-suite.test.pem;
    ssl_certificate_key /etc/nginx/certs/staging.label-suite.test-key.pem;

    # 路由到 staging Compose 專案綁定的 loopback 埠
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # /metrics 不對外（ADR-023 路由契約）
    location /metrics {
        deny all;
        return 404;
    }
}
```

啟用：

```bash
sudo ln -s /etc/nginx/sites-available/label-suite-staging /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. Phase 5 — 驗證清單

全部通過才算部署骨架完成：

- [x] Mac 瀏覽器開 `https://staging.label-suite.test` 顯示安全標示且無憑證警告
      （2026-07-07 實測通過；Chrome 117+ 以「調整鈕」圖示取代舊鎖頭，無紅色「不安全」即為受信任）
- [x] 頁面（whoami 回顯）顯示 `X-Forwarded-Proto: https`、`Host: staging.label-suite.test`（2026-07-07）
- [x] `curl -I http://staging.label-suite.test` 回 `301` 且 `Location` 為 https（2026-07-07）
- [x] `curl -sk https://staging.label-suite.test/metrics` 回 `404`（2026-07-07）
- [x] Mac 直接連 `http://<VM_IP>:8080` **連不上**（服務只綁 loopback，未繞過 Nginx）（2026-07-07）
- [x] `docker compose ps` 中 postgres 與 redis 為 `healthy`（2026-07-07）
- [x] `docker compose down && docker compose up -d` 後 PostgreSQL 資料仍在（volume 持久化）
      （2026-07-07：寫入 42 → down/up → 讀回 42）
- [x] VM 重開機（`multipass restart`）後所有服務自動恢復（`restart: unless-stopped` + Nginx systemd）
      （2026-07-07：8 容器全部自動恢復，HTTPS 回 200）
- [ ] （若安裝 Portainer）`https://portainer.label-suite.test` 可登入，能看到 `label-suite-staging` 專案的容器與日誌（登入待使用者建立管理員帳號）；`https://<VM_IP>:9443` 直連**連不上**（✓ 2026-07-07）
- [x] （若部署監控棧）`https://grafana.label-suite.test` 可登入（✓ 2026-07-07）；Prometheus targets：`postgres`、`redis` 兩個 job 為 **UP**（✓ 2026-07-07）；匯入的 PostgreSQL（9628，version 16.14.0）與 Redis（763）dashboard 皆顯示真實數據（✓ 2026-07-07）
- [x] （若部署監控棧）`http://<VM_IP>:9090`、`http://<VM_IP>:3000` 直連**連不上**（僅 loopback）（2026-07-07）

---

## 8. 前後端實作完成後的接軌步驟

骨架驗證通過後，接上真實應用只需以下替換：

1. **移除佔位服務** `edge`，換成 ADR-023 拓撲中的正式服務：
   - `nginx`（Compose 內）：serve React 靜態檔 + 反代 `/api/` 到 backend，綁 `127.0.0.1:8080`
   - `backend`：FastAPI（uvicorn）
   - `worker`：Celery worker（與 backend 同 image）
2. **Image 來源**：本機 VM 測試可用本機建置的 arm64 image；
   staging/production 一律使用 CI 建置並推上 registry 的 **amd64 不可變 tag**（commit SHA）。
3. **資料庫遷移**：部署流程中加入明確的 migration 步驟（`alembic upgrade head`），在 backend 滾動前執行。
4. **健康檢查**：`/health` 路由接上真實 backend 後，加入 Nginx 與 uptime 檢查。
5. **觀測服務**：監控棧已於骨架階段部署（§6.4）；此時解除 `prometheus.yml` 中 backend
   scrape job 的註解，並依 ADR-018 建立四張正式 dashboard（`/metrics` 維持不對外）。
6. **Host Nginx** 增加路由：`/assets/` 長效快取、`/api/` 明確代理、SPA fallback——
   本機 VM 驗證過的設定即為正式機設定的底稿。
   另須**封鎖 source map 公開存取**（`location ~ \.map$ { deny all; }`）——
   source map 由 CI 上傳至 Sentry（ADR-020），不得經靜態伺服器對外（ADR-023 明文要求）。
7. **環境變數清單**（`.env`，依各 ADR 彙整；值一律由部署環境注入，不進版控）：
   - `DATABASE_URL` — 指向 PostgreSQL 即啟用 production 剖面（ADR-024）
   - `JWT_SECRET`（ADR-021）
   - `RESEND_API_KEY` — 且寄件位址 `no-reply@<domain>` 需先在 Resend 完成網域驗證；
     開發／VM 環境可用沙箱位址 `onboarding@resend.dev`（ADR-013）
   - `SENTRY_DSN` — backend 與 worker 共用；frontend 的 DSN 於 build 時注入（ADR-020）
   - `GRAFANA_ADMIN_PASSWORD`、`POSTGRES_*`（§6.2、§6.4 已列）

---

## 9. 正式環境部署（dell-7820）

完整決策見 [ADR-023](../adr/023-cicd-docker-compose-nginx-deployment.md)，此處摘要操作差異：

| 項目 | 本機 VM | dell-7820 |
|------|---------|-----------|
| TLS | mkcert | Cloudflare Origin CA（Full strict），Cloudflare 管理瀏覽器端憑證 |
| 網域 | `staging.label-suite.test`（/etc/hosts） | `staging.<domain>` 與 `<domain>`（Cloudflare DNS） |
| Image | 本機 arm64 可 | 僅 registry 上 CI 建置的 amd64 不可變 tag |
| 入站限制 | 無 | 僅允許 Cloudflare IP 範圍與管理 IP 連 443 |
| 環境數 | staging 一套 | staging + production 兩套隔離 Compose 專案（8080 / 8081，皆綁 loopback） |
| Staging 存取控制 | 無 | Cloudflare Access／校園 VPN／HTTP basic auth 擇一 |

發佈流程（摘自 ADR-023，正式機必守）：

1. 合併至 release branch → CI 建置不可變 image 並推上 registry
2. 部署該 tag 至 staging → 跑 smoke test（登入、任務列表、標記工作區、API health、migration 驗證）
3. 人工核准 → 以**同一個 tag** 部署 production（不得重建或重新 tag）
4. 驗證 production 健康檢查與關鍵流程
5. 回滾 = 把 Compose override 改回前一個 image tag 重啟

**備份提醒**（ADR-023）：正式機備份寫入 `/data/label-suite/prod/backups/`，
但**僅存於主資料磁碟的備份不足以災難復原**——必須另外複製到其他主機或外部儲存。
備份目的地與保存策略屬 ADR-023 的待決事項，上線前必須定案。

---

## 10. 常見問題

**Q：VM 的 IP 換了，網站連不上？**
`multipass info label-suite-staging` 查新 IP，更新 Mac 的 `/etc/hosts`。

**Q：瀏覽器顯示憑證不受信任？**
確認 `mkcert -install` 已執行過（CA 進入系統信任儲存區），且憑證的網域與網址完全一致。
mkcert 憑證只在執行過 `mkcert -install` 的機器上受信任——其他裝置連入必然出現警告，屬預期行為。

**Q：可以把 mkcert 憑證拿到正式機用嗎？**
不行。mkcert 是本機開發 CA，正式環境依 ADR-023 使用 Cloudflare Origin CA。

**Q：Mac 重開機後 VM 沒有自動啟動？**
Multipass 預設不自動啟動 VM，手動 `multipass start label-suite-staging`；
VM 內的 Docker 服務與 Nginx 會隨 VM 開機自動恢復。

**Q：16GB 的 Mac 同時跑 VM 和本機開發會不會太吃緊？**
VM 配 4GB 尚有餘裕；若同時跑本機 Docker Desktop 與大量開發工具導致吃緊，
可將 VM 降為 `multipass set local.label-suite-staging.memory=3G` 或不用時 `multipass stop`。

---

## 11. 對 Mac 主機的影響、隔離性與完全移除

本節回答兩個問題：**任一步驟中途失敗會不會破壞 Mac 現有環境？VM 是否完全隔離？**

### 11.1 逐步驟的主機影響分析

整份流程中，**只有 Phase 1 與 Phase 3 的少數指令會改動 Mac 本身**；
Phase 2、4、5 的全部內容（apt、Docker Engine、Nginx、chown、Compose、Portainer、監控棧）
都在 VM 內執行，失敗的最壞情況一律是「刪掉 VM 重來」，Mac 不受影響。

| 步驟（Mac 端） | 對主機的改動 | 中途失敗的後果 | 復原方式 |
|----------------|--------------|----------------|----------|
| `brew install multipass` | 安裝 multipassd 常駐服務 | 安裝不完整，無其他副作用 | `brew uninstall multipass` |
| `multipass launch` | 在 multipassd 資料目錄建立 VM 磁碟檔（40G 為上限的稀疏檔，實際用多少長多少） | 留下半成品 VM 映像 | `multipass delete <name> --purge` |
| `brew install mkcert` | 安裝單一執行檔 | 無 | `brew uninstall mkcert` |
| `mkcert -install` | **將本機開發 CA 加入 macOS 鑰匙圈信任**（唯一有安全意涵的主機改動） | 密碼未輸入則什麼都不會發生（原子操作） | `mkcert -uninstall` |
| `/etc/hosts` 追加 | 檔尾加一行文字 | 只是多一行；`.test` 為保留 TLD，不可能遮蔽任何真實網域 | 刪除該行 |
| `multipass transfer` / `ssh-keygen` | 純檔案複製／在 `~/.ssh` 產生金鑰 | 無 | 不需復原 |

**結論：沒有任何步驟的失敗會破壞 Mac 既有環境。**
所有主機端改動都是「加法」（新增服務、新增信任、新增一行 hosts），
沒有一步會修改或刪除 Mac 上既存的檔案、服務或設定；且每一項都有單指令的乾淨復原。

兩個常見疑慮的釐清：

- **與 Mac 上既有 Docker Desktop 的關係**：完全無關。VM 內的 Docker Engine 是獨立 daemon，
  Portainer 掛載的 `docker.sock` 也是 VM 內的 socket，管不到 Mac 的 Docker。
- **埠衝突**：不存在。本文件不使用任何 port forwarding，所有服務經 VM 自己的 IP 存取，
  Mac 的 80/443/3000/9090/9443 全程不被佔用。

### 11.2 隔離性評估

| 隔離面 | 程度 | 說明 |
|--------|------|------|
| CPU／核心 | ✅ 完全 | 硬體虛擬化（Virtualization.framework），VM 跑自己的 Linux 核心 |
| 檔案系統 | ✅ 完全 | VM 磁碟是 Mac 上的單一映像檔；本文件**不使用** `multipass mount`，VM 讀不到 Mac 的任何檔案 |
| 記憶體 | ✅ 完全（配額共享） | VM 上限 4G；只有資源壓力問題，無資料互通 |
| 網路 | ⚠️ **非完全隔離** | NAT（vmnet，192.168.64.0/24）：VM 可主動連外、連區網、連 Mac（gateway 192.168.64.1）。這是演練環境的合理取捨，但表示 VM 不是氣隙環境 |
| 信任鏈 | ⚠️ 刻意打通 | mkcert CA 讓 Mac 信任 VM 端的憑證——這是功能需求，但 CA 私鑰（`mkcert -CAROOT` 目錄）等同「這台 Mac 的 TLS 信任」，不可外流、不可提交版控 |

實務結論：**檔案系統與核心層面是完全隔離的**——VM 內任何失敗（包含 `rm -rf`、
Docker 弄壞、Nginx 設錯）都出不了那顆磁碟映像檔。非完全隔離的只有網路平面
（NAT 可主動連外）與 mkcert 信任鏈（刻意建立、可隨時撤銷）。

### 11.3 完全移除（恢復 Mac 原狀）

```bash
# 1. 刪除 VM（含磁碟映像）
multipass delete label-suite-staging --purge

# 2. 撤銷 mkcert CA 信任並刪除 CA 私鑰
mkcert -uninstall
rm -rf "$(mkcert -CAROOT)"

# 3. 移除 /etc/hosts 的演練網域
sudo sed -i '' '/label-suite\.test/d' /etc/hosts

# 4. 移除工具本體（若不再需要）
brew uninstall multipass mkcert
```

執行完畢後，Mac 回到部署演練開始前的狀態，無任何殘留。

---

## 12. CI/CD 自動部署（GitHub Actions）

> 現況：`ci.yml`（檢查與測試，前後端未實作的 job 自動跳過）與
> `deploy-prototype.yml`（prototype 推 main 即自動部署到 GitHub Pages）已存在。
> 本節規劃**應用本體**的自動部署，對齊 [ADR-023](../adr/023-cicd-docker-compose-nginx-deployment.md) 的 CI/CD 流程。

### 12.1 關鍵限制與解法：self-hosted runner

GitHub 雲端 runner **連不進部署目標**——Mac 上的 VM 在 NAT 私網內，
`dell-7820` 未來也在校園網路內、且入站已限制為 Cloudflare IP。

解法：在部署目標主機內安裝 **GitHub Actions self-hosted runner**。
Runner 以純出站長輪詢向 GitHub 拉任務，**不需要任何入站埠**，
與本文件「服務只綁 loopback、不對外開埠」的安全姿態完全相容。
VM 演練用的 runner 設定流程，日後在 `dell-7820` 原樣重做一次即可。

VM 內安裝（runner 註冊指令與 token 從 GitHub repo → Settings → Actions → Runners 取得）：

```bash
mkdir ~/actions-runner && cd ~/actions-runner
# 下載與 config.sh 指令依 GitHub 頁面提供的為準（選 Linux ARM64）
./config.sh --url https://github.com/singyichen/label-suite --token <TOKEN> \
  --labels deploy-develop --unattended
sudo ./svc.sh install && sudo ./svc.sh start   # 註冊為 systemd 服務，開機自動恢復
```

### 12.2 觸發對應（分支 → 環境）

| 觸發 | 動作 | 目標環境 | 人工介入 |
|------|------|----------|----------|
| Pull Request | CI 檢查（現有 `ci.yml`） | 無部署 | — |
| push 到 `main` | 建置 image → 推 registry → **自動部署** | develop（VM）／日後 staging | 無 |
| tag `v*` | 以 staging 驗證過的**同一個 image tag** 部署 | production（dell-7820） | GitHub Environments 人工核准 |

「推上去就自動部署、不需手動」適用於 develop／staging；
**production 保留人工核准**是 ADR-023 的明文要求（staging 驗證 → 核准 → 同 tag 晉升），不隨自動化取消。

### 12.3 部署 workflow 骨架

骨架階段（尚無應用 image）的自動部署 = 同步 compose／Nginx 設定 + `docker compose up -d`。
`.github/workflows/deploy-develop.yml`：

```yaml
name: Deploy to develop VM

on:
  push:
    branches: [main]
    paths: ['deploy/**']        # 部署設定進 repo 後，只在相關變更時觸發

concurrency:
  group: deploy-develop
  cancel-in-progress: false     # 部署不可中斷，排隊執行

jobs:
  deploy:
    runs-on: [self-hosted, deploy-develop]   # 跑在 VM 內的 runner 上
    steps:
      - uses: actions/checkout@v4
      - name: Sync compose config
        run: |
          rsync -a --delete deploy/develop/ /data/label-suite/staging/compose/
      - name: Deploy
        run: |
          cd /data/label-suite/staging/compose
          docker compose pull
          docker compose up -d --remove-orphans
      - name: Health check
        run: |
          sleep 5
          curl -fsk https://staging.label-suite.test/ > /dev/null
```

前提：compose 與 Nginx 設定需入版控（建議 repo 內新增 `deploy/develop/`），
`.env` 仍留在 VM 上不進 repo。前後端實作後，前面再加 build + push image 的 job，
部署 job 改為 pull 指定 tag。

### 12.4 安全注意（repo 將開源，必讀）

Self-hosted runner + 公開 repo 的組合有已知風險：fork 的 PR 若能在 runner 上執行程式碼，
等於讓陌生人進到你的 VM／正式機。必守三條：

1. 部署 workflow **只綁 `push`／`tag` 事件，絕不綁 `pull_request`**（上方骨架已遵守）
2. repo Settings → Actions：fork PR 一律需要核准才能跑 workflow
   （Require approval for all outside collaborators）
3. production 部署包在 GitHub **Environment** 裡，設定 required reviewers 與 secrets 隔離

### 12.5 分支策略：不需要 dev 分支

維持現行 **trunk-based**（feature branch → PR → `main`）即可，理由：

- 「develop／staging／production」是**環境**概念，不是**分支**概念——
  環境對應由 §12.2 的觸發規則（main push vs. tag）解決，不需要多一條長存分支
- SDD 管線（Speckit）依 feature branch 名稱解析 spec，加一層 `dev` 中繼分支
  會讓每個 feature 多一次 merge、且 `dev` 與 `main` 會逐漸漂移，單人開發沒有對應收益
- ADR-023 的「release branch」語意由 `main` + `v*` tag 滿足：
  main 永遠可部署（自動進 develop/staging），tag 標記晉升 production 的時點

# deploy/

部署設定（納入版控，供 CI/CD 自動部署與可重現性）。機密（`.env`）不在此，僅存於部署主機。

完整說明見 [docs/deployment/deployment.md](../docs/deployment/deployment.md)。

```text
deploy/
  develop/
    docker-compose.yml   # develop 部署演練骨架（佔位 edge + postgres/redis + 監控棧）
    prometheus.yml       # Prometheus scrape 設定
    env.example          # .env 範本（實際 .env 只存在於部署主機）
  nginx/                 # host-level Nginx server blocks（依 server_name 路由）
    label-suite-staging
    portainer
    grafana
```

## 自動部署流程

`.github/workflows/deploy-develop.yml`：push 到 `main` 且變更 `deploy/develop/**` 時，
VM 內的 self-hosted runner 同步 compose 設定 → `docker compose pull` → `up -d` → 健康檢查。

- 只綁 `push`，不綁 `pull_request`（公開 repo 安全緩解）
- 保留部署主機上的 `.env`（同步時排除）
- Nginx server block 變更需手動套用（較少變動，不納入自動流程）

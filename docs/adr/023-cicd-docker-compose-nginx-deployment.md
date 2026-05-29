# ADR-023: CI/CD Deployment with Docker Compose and Nginx

**Status**: Accepted
**Date**: 2026-05-29

## Context

Label Suite already standardizes application packaging around Docker and Docker Compose in ADR-008. The next deployment decision is how CI/CD should deliver the built system to a running environment without introducing unnecessary orchestration complexity.

The production-like deployment must support:

- React static assets served efficiently.
- FastAPI API traffic routed behind a stable public entrypoint.
- WebSocket or streaming-compatible proxy settings when future annotation workflows need them.
- Celery worker, PostgreSQL, Redis, Prometheus, Grafana, and Sentry-related configuration as separate services.
- TLS termination and HTTP-to-HTTPS redirect at the edge.
- Cloudflare-managed public TLS in front of the origin server.
- Reproducible staging and production deployments from the same Compose model used locally.

Project constraints:

- Solo/small-team operation; the deployment path must be understandable and maintainable without a platform team.
- Current scale does not justify Kubernetes as the default production runtime.
- CI/CD should promote immutable container images, not rebuild unknown code on the server.
- Secrets must be injected by the deployment environment and never committed to the repository.
- The deployment baseline should use widely adopted tools so future hosting options remain flexible.

### Candidates Evaluated

| Option | CI/CD Fit | Runtime Complexity | Reverse Proxy | Portability | Fit |
|--------|:---------:|:------------------:|:-------------:|:-----------:|:---:|
| **Docker Compose + Nginx** | High | Low | Excellent | High | High |
| Docker Compose + Traefik | High | Medium | Excellent | High | Medium |
| Kubernetes + Ingress | High | High | Excellent | High | Medium |
| Platform-as-a-Service only | Medium | Low | Provider-managed | Medium | Medium |
| Bare VM with systemd services | Medium | Medium | Manual | Low | Low |

**Traefik rejected as default**: Traefik is a strong reverse proxy, especially for dynamic service discovery, but Label Suite does not currently need automatic routing discovery. Nginx is simpler for static frontend serving, explicit API proxying, and common hosting documentation.

**Kubernetes rejected as default**: Kubernetes remains a future migration path, but it adds cluster management, manifests, ingress controllers, secrets management, and operational concepts that are not justified for the MVP and thesis/demo deployment stage.

**Platform-as-a-Service only rejected as default**: A PaaS can be useful later, but making it the baseline would reduce reproducibility and tie deployment behavior to provider-specific buildpacks, networking, and service integrations.

**Bare VM with systemd services rejected**: Running Python, Node, PostgreSQL, Redis, and workers directly on the host loses the reproducibility and isolation established by ADR-008.

## Decision

Use **Docker Compose** as the default deployment runtime and **Nginx** as the public reverse proxy and static frontend server.

The CI/CD pipeline builds and publishes versioned container images. Deployment environments pull those images and run them through Compose using environment-specific configuration.

Use **Cloudflare** as the public DNS, CDN, and TLS edge for production-facing environments when available. Cloudflare handles browser-facing TLS certificates and edge redirects. Nginx remains the origin entrypoint behind Cloudflare and must still enforce origin-side security headers, routing, and private service isolation.

### Deployment Topology

```yaml
services:
  nginx:
    # public entrypoint, TLS termination, static frontend, API proxy

  backend:
    # FastAPI application server

  worker:
    # Celery worker using the backend image

  postgres:
    # PostgreSQL, or replaced by a managed database in production

  redis:
    # Redis broker/cache, or replaced by managed Redis in production

  prometheus:
    # metrics collection from ADR-018

  grafana:
    # dashboards from ADR-018
```

Nginx is responsible for:

- serving the built React frontend
- routing `/api/` traffic to the FastAPI backend
- routing health check paths to the appropriate service
- terminating origin TLS when traffic arrives from Cloudflare or when TLS is not handled by another trusted load balancer
- enforcing request size, timeout, compression, and cache policies
- blocking public access to source maps unless explicitly needed for a private environment

### Cloudflare TLS Policy

Production should use Cloudflare with **Full (strict)** TLS mode:

- browser to Cloudflare: Cloudflare-managed public certificate
- Cloudflare to origin Nginx: valid origin certificate, such as a Cloudflare Origin CA certificate or another trusted certificate
- HTTP to HTTPS redirect: enforced at Cloudflare and mirrored at Nginx for direct-origin safety
- HSTS: enabled only after HTTPS behavior is verified in staging

Do not use Cloudflare **Flexible** TLS because it sends unencrypted HTTP from Cloudflare to the origin and breaks security assumptions for secure cookies, forwarded protocol, and backend URL generation.

Origin access should be restricted where hosting allows it:

- allow inbound HTTPS only from Cloudflare IP ranges and operator management IPs
- do not expose backend, PostgreSQL, Redis, Prometheus, or Grafana directly to the public internet
- keep `/metrics` private and unavailable through public Cloudflare routes

Cloudflare may cache static frontend assets under `/assets/`, but it must not cache authenticated API responses, annotation pages containing user-specific state, or any route that can expose task data.

### CI/CD Flow

The baseline pipeline is:

1. Run backend checks with `uv run pytest`, `uv run ruff check .`, and `uv run mypy .`.
2. Run frontend checks with `pnpm tsc --noEmit`, `pnpm lint`, and relevant Playwright tests.
3. Build backend and frontend Docker images.
4. Tag images with the commit SHA and, for releases, a semantic release tag.
5. Push images to the selected container registry.
6. Deploy by updating the Compose environment to reference the new immutable image tags.
7. Run database migrations as an explicit deployment step before or during backend rollout.
8. Verify health checks before promoting the deployment.

CI must not deploy images tagged only as `latest`. `latest` can exist for convenience, but staging and production Compose files must pin immutable tags.

### Environment Strategy

| Environment | Compose File | Image Source | Data Services |
|-------------|--------------|--------------|---------------|
| Local | `docker-compose.yml` | locally built images | local containers |
| CI | workflow services / Compose | test images | disposable containers |
| Staging | deployment Compose override | registry images by SHA | managed or persistent containers |
| Production | deployment Compose override | registry images by release tag or SHA | managed preferred, container fallback allowed |

Production may replace PostgreSQL and Redis containers with managed services without changing the application container model. When managed services are used, Compose should keep only application, worker, proxy, and observability services.

### On-Premises Server Strategy

Production is expected to run on university-provided on-premises hardware. The deployment model should assume the system may run behind campus networking and Cloudflare rather than on a managed cloud platform.

Recommended server roles:

| Host | Role | Rationale |
|------|------|-----------|
| `dell-7820` (`<primary-server-ip>`) | Primary application and data server | 192 GB RAM and 7.3 TB `/data` disk are better suited for PostgreSQL, Redis persistence, uploads, backups, and the core Compose stack. |
| `as-1` (`<gpu-worker-ip>`) | Optional GPU worker server | NVIDIA L40S 46 GB x 2 is valuable for AI evaluator, local model, embedding, or batch NLP workloads. It should not be the default primary data server because its available disk is smaller. |
| `msi` / `asus` | Optional staging or additional worker hosts | Useful later if staging must be physically separated from production or if non-critical worker capacity is needed. |

The initial production deployment should use `dell-7820` as the main server. `as-1` should be added only when GPU-backed workflows are needed. GPU workers should connect to the same Redis broker using a dedicated queue, for example:

- `default`
- `scoring`
- `gpu_ai`

The persistent data root on the primary server should be:

```text
/data/label-suite/
  prod/
    compose/
    postgres/
    redis/
    uploads/
    backups/
    prometheus/
    grafana/
  staging/
    compose/
    postgres/
    redis/
    uploads/
    prometheus/
    grafana/
```

Production data and staging data must use separate Compose project names, Docker networks, volumes, database credentials, Redis instances, upload directories, and environment files. Staging must never point at the production PostgreSQL database, Redis broker, or upload directory.

### Staging and Production Policy

Use three deployment levels:

| Level | Purpose | Data |
|-------|---------|------|
| Local development | Developer iteration and feature work | local disposable or fixture data |
| Staging | Production-like validation before release | non-production test data only |
| Production | Real users, real annotation data, and official tasks | protected production data |

Staging is required before production deployment. At the beginning, staging and production may run on the same physical `dell-7820` host as two isolated Compose projects:

```text
https://staging.<domain>
https://<domain>
```

A single **host-level Nginx** (installed directly on `dell-7820`, not inside any Compose stack) binds to host ports 80 and 443 and routes by `server_name` to the respective Compose stack's internal port (e.g., staging Compose exposes port 8080, production Compose exposes port 8081 — both bound to `127.0.0.1` only). This avoids port conflicts: only one process owns the public ports, and each Compose stack's Nginx listens on a distinct loopback port. Cloudflare should define separate DNS records and cache rules for staging and production. Staging should be access-restricted through Cloudflare Access, campus VPN, HTTP basic auth, or another explicit control.

The release flow is:

1. Merge to the release branch.
2. CI builds immutable Docker images and pushes them to the registry.
3. Deploy the image tag to staging.
4. Run smoke tests against staging, including login, task list, annotation workspace load, API health, and migration verification.
5. Require manual approval for production.
6. Deploy the same image tag to production.
7. Verify production health checks and key user flows.

The production deployment must use the same image tag validated in staging. Rebuilding or retagging between staging and production is not allowed.

### Nginx Routing Contract

Use explicit route ownership:

| Public Path | Target | Notes |
|-------------|--------|-------|
| `/` | frontend static assets | SPA fallback to `index.html` |
| `/assets/` | frontend static assets | long-lived immutable caching |
| `/api/` | backend service | preserve host and forwarding headers |
| `/health` | Nginx or backend health | used by uptime checks |
| `/metrics` | not public | expose only on private network |

Nginx must forward standard proxy headers:

- `Host`
- `X-Real-IP`
- `X-Forwarded-For`
- `X-Forwarded-Proto`
- `CF-Connecting-IP` when traffic arrives through Cloudflare

The backend must trust forwarded headers only from the known proxy/network boundary. When Cloudflare is enabled, real client IP handling should prefer Cloudflare-provided headers at Nginx, then pass a normalized client IP to the backend.

### Secrets and Configuration

Secrets must be supplied by the deployment environment:

- CI/CD secret store
- server-side `.env` file outside the repository
- cloud secret manager
- Docker secrets, if supported by the selected runtime

Do not commit production values for database URLs, Redis URLs, JWT secrets, Sentry DSNs, email API keys, TLS private keys, Cloudflare API tokens, Cloudflare Origin CA private keys, or registry credentials.

The repository may include `.env.example` files and non-sensitive defaults only.

### Rollback Strategy

Rollback is image-tag based:

- keep the previous deployed image tag available in the registry
- update the deployment Compose override back to the previous tag
- restart affected services with Compose
- run rollback migrations only when explicitly prepared and tested

Database migrations must be backward-compatible whenever possible so application rollback does not require immediate data rollback.

## Consequences

### Easier

- CI/CD uses the same container model as local development and integration testing.
- Nginx provides a widely understood production entrypoint for static assets, API proxying, TLS, compression, and cache headers.
- Cloudflare provides managed public TLS, DNS, CDN behavior for static assets, and an additional edge security layer.
- Deployment remains viable on a single VM, Docker host, or small cloud instance without Kubernetes.
- Staging and production can start on the same physical server while remaining isolated by Compose project, hostname, data root, and credentials.
- GPU capacity can be introduced incrementally through dedicated worker queues without moving the primary application and database.
- Immutable image tags make deployment and rollback traceable.
- Managed PostgreSQL or Redis can be adopted without changing the application image strategy.

### Harder

- Compose-based production does not provide Kubernetes-style scheduling, self-healing, or horizontal autoscaling.
- Server provisioning, registry authentication, TLS certificates, and secret injection still need operational discipline.
- Cloudflare introduces a second proxy boundary, so TLS mode, cache rules, real client IP forwarding, and origin access controls must be configured deliberately.
- Running staging and production on the same physical host still leaves shared hardware risk; disk, power, kernel, or host-level Docker failures can affect both environments.
- Production backups must be copied off the primary data disk or to another host; backups stored only under `/data/label-suite/prod/backups` are not sufficient for disaster recovery.
- Zero-downtime deployment is limited unless the host runs parallel Compose projects or an external load balancer.
- Nginx configuration becomes part of the deployment contract and must be tested when routes, upload limits, or streaming behavior change.
- Database migrations require a deliberate deployment step and rollback plan.

## Deferred Decisions

- Exact CI/CD provider: GitHub Actions is expected but not mandated by this ADR.
- Container registry choice: GitHub Container Registry, Docker Hub, or cloud-provider registry.
- Origin TLS certificate automation: Cloudflare Origin CA, Certbot, Caddy sidecar, cloud load balancer, or managed certificate service.
- Cloudflare cache and WAF rule set.
- Backup destination and retention policy for on-premises production data.
- Blue-green or rolling deployment mechanism for zero-downtime releases.
- Whether production observability runs on the same host or a separate monitoring host.

## Relationship to Other ADRs

- [ADR-008](008-containerization-docker-compose.md): establishes Docker and Docker Compose as the containerization baseline.
- [ADR-018](018-observability-prometheus-grafana.md): monitoring services can be deployed through the same Compose runtime.
- [ADR-020](020-application-error-tracking-sentry.md): frontend source maps must be uploaded during CI/CD and blocked from public Nginx serving.
- [ADR-021](021-jwt-refresh-token-auth.md): cookie and forwarded-protocol behavior depend on the Nginx proxy boundary.

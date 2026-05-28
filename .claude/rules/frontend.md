# Frontend Rules

## Architecture Principles

> **Decision:** Vertical feature slicing — see [ADR-011](docs/adr/011-frontend-source-structure.md).

**`shared/` admission rule:** A file belongs in `shared/` only if directly imported by **two or more different feature modules**.

**State management:** TanStack Query for all API/server state; Zustand for auth token/user/role and UI globals (never API response data); `useState` for local component state.

**Role model:** Two-layer. **System role** (JWT): `user` | `super_admin` | `null`. **Task role** (from `task_membership` API per task): `project_leader` | `reviewer` | `annotator` — not stored in JWT. `DashboardPage` dispatches with explicit `role ===` checks; unknown role clears session and redirects to `/login`. Task pages additionally check membership via `useTaskRole(taskId)`.

**Localization:** Namespaced per module — e.g. `t('task-management:config_builder.label_name')`. Files at `locales/zh-TW/[module].json` and `locales/en/[module].json`.

## TypeScript Code Style

- No `any` types (strict mode enforced)
- Use `interface` for props, `type` for union/intersection types
- Prefer functional components + hooks

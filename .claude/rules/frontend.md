---
paths:
  - "frontend/**"
---

# Frontend Rules

## Architecture Principles

> **Decision:** Vertical feature slicing — see [ADR-011](docs/adr/011-frontend-source-structure.md).

**`shared/` admission rule:** A file belongs in `shared/` only if directly imported by **two or more different feature modules**.

**State management:** TanStack Query for all API/server state; Zustand for auth token/user/role and UI globals (never API response data); `useState` for local component state.

**Role model:** Two-layer. **System role** (JWT): `user` | `super_admin` | `null`. **Task role** (from `task_membership` API per task): `project_leader` | `reviewer` | `annotator` — not stored in JWT. `DashboardPage` dispatches with explicit `role ===` checks; unknown role clears session and redirects to `/login`. Task pages additionally check membership via `useTaskRole(taskId)`.

**Localization:** Namespaced per module — e.g. `t('task-management:config_builder.label_name')`. Files at `src/locales/zh-TW/[module].json` and `src/locales/en/[module].json`. Scope: UI strings only (labels, titles, button text, empty states, client-side validation). **Do not** add backend `detail` strings to locale files — backend response messages are pre-localized via `Accept-Language` (ADR-026); render `error.response?.data?.detail` directly.

## Icons

> **Decision:** Lucide as sole icon library — see [ADR-030](../../docs/adr/030-icon-library-lucide.md).

- [Lucide](https://lucide.dev/) is the **only** icon library — use the `lucide-react` package (`pnpm add lucide-react`); do not add Heroicons, react-icons, Font Awesome, or any other icon set
- Never use emojis or hand-drawn inline SVGs as icons; if Lucide lacks a needed icon, surface it instead of drawing one
- Prototype assets at `design/prototype/assets/icons/` follow the same Lucide visual grammar (24×24, 2px stroke, `currentColor`)

## TypeScript Code Style

- No `any` types (strict mode enforced)
- Use `interface` for props, `type` for union/intersection types
- Prefer functional components + hooks

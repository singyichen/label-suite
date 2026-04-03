# ADR-011: Frontend Source Directory Structure — Vertical Feature Slicing

**Status**: Accepted
**Date**: 2026-04-03

## Context

The frontend needs a source directory convention before implementation begins. The project has 14 pages across 6 modules, 4 user roles with role-specific views, bilingual support (zh-TW / en), and a complex annotation workspace with config-driven task types.

Two primary strategies were evaluated:

### Option A — Horizontal Slicing (layer-based)

```
src/
├── components/   ← all components
├── hooks/        ← all hooks
├── services/     ← all API calls
├── stores/       ← all state
└── pages/        ← all pages
```

Code is organized by its *technical role*. A feature is spread across every top-level folder.

### Option B — Vertical Feature Slicing (selected)

```
src/
├── features/
│   ├── task-management/   ← all task-management code
│   └── annotation/        ← all annotation code
└── shared/                ← cross-feature shared code only
```

Code is organized by the *business feature it belongs to*. Each feature folder is self-contained.

### Why Horizontal Was Rejected

Modifying a single feature (e.g., adding a field to the task creation form) requires touching `components/`, `hooks/`, `services/`, and `pages/` simultaneously. As the project grows to 14+ pages, each horizontal layer accumulates unrelated files, making it harder to reason about what belongs together. The cognitive cost of "file hunting across layers" grows with every feature added.

### Additional Factors Favoring Vertical

- **Agent Team ownership**: Each `FrontendAgent` in the SDD Agent Team workflow owns one `features/[module]/` directory. Vertical slicing eliminates cross-agent file conflicts.
- **SDD alignment**: One spec (`/speckit.specify`) corresponds to one feature module. Vertical slicing makes this mapping explicit in the directory structure.
- **Feature deletion**: Removing a feature means deleting one folder, not hunting across all layers.
- **Complexity containment**: The annotation workspace and ConfigBuilder are internally complex sub-systems. Vertical slicing lets them grow without polluting shared layers.

## Decision

Use **vertical feature slicing** as the primary organizing principle, with a minimal `shared/` horizontal layer for code that is genuinely used by two or more features.

### Directory Structure

```
frontend/src/
│
├── features/                     # Vertical axis — one folder per IA module
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── components/
│   │   │   ├── leader/
│   │   │   ├── annotator/
│   │   │   └── reviewer/
│   │   ├── hooks/
│   │   └── services/
│   ├── task-management/
│   │   ├── TaskListPage.tsx
│   │   ├── TaskNewPage.tsx
│   │   ├── TaskDetailPage.tsx
│   │   ├── components/
│   │   │   └── ConfigBuilder/    # complex sub-module, nested folder
│   │   ├── hooks/
│   │   └── services/
│   ├── annotation/
│   │   ├── AnnotationWorkspacePage.tsx
│   │   ├── components/
│   │   │   ├── workspace/
│   │   │   │   └── task-types/   # config-driven widgets per task_type
│   │   │   └── review/
│   │   ├── hooks/
│   │   └── services/
│   ├── dataset/
│   │   ├── DatasetStatsPage.tsx
│   │   ├── DatasetQualityPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── annotator-management/
│   │   ├── AnnotatorListPage.tsx
│   │   ├── AnnotatorNewPage.tsx
│   │   ├── WorkLogPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── admin/
│       ├── UserManagementPage.tsx
│       ├── RoleSettingsPage.tsx
│       ├── components/
│       ├── hooks/
│       └── services/
│
├── shared/                       # Horizontal axis — cross-feature only
│   ├── ui/                       # Primitive components: Button, Input, Badge, Modal, Toast
│   ├── layout/                   # Navbar, Sidebar, BottomTabBar, PageShell
│   ├── api/                      # Axios instance + interceptors (JWT attach, 401 handling)
│   ├── stores/                   # Zustand: authStore (token/user), uiStore (lang, sidebar)
│   ├── hooks/                    # useMediaQuery, useToast
│   ├── types/                    # Domain types mirroring backend Pydantic schemas
│   └── utils/                    # cn() (clsx + tailwind-merge), formatDate()
│
├── locales/                      # i18n — namespaced per feature module
│   ├── zh-TW/
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── dashboard.json
│   │   ├── task-management.json
│   │   ├── annotation.json
│   │   ├── dataset.json
│   │   ├── annotator-management.json
│   │   └── admin.json
│   └── en/
│       └── (same structure)
│
└── router/
    ├── index.tsx                 # Route definitions with lazy() per feature
    └── guards/
        ├── AuthGuard.tsx         # Unauthenticated → redirect /login
        └── RoleGuard.tsx         # Unauthorized role → redirect /
```

### Rule for `shared/` vs `features/`

A file belongs in `shared/` if and only if it is **directly imported by two or more different feature modules**. Everything else stays inside its feature folder.

| Example | Location |
|---------|----------|
| `Button` | `shared/ui/` — used by all features |
| `Navbar` | `shared/layout/` — used by all features |
| `TaskStatusBadge` | `features/task-management/components/` — only used there |
| `ConfigBuilder` | `features/task-management/components/ConfigBuilder/` |
| `useAnnotation` | `features/annotation/hooks/` — only used there |
| `Task` type | `shared/types/task.ts` — imported by task-management, dashboard, dataset |

### State Management Layers

| Layer | Tool | What It Manages |
|-------|------|-----------------|
| Server state | TanStack Query | All API data: fetching, caching, mutations |
| Global client state | Zustand | Auth token/user, UI preferences (language, sidebar) |
| Local UI state | `useState` / `useReducer` | Component-level ephemeral state |

Zustand stores must **not** hold API response data — that is TanStack Query's responsibility.

### Dashboard Role Dispatch

The dashboard renders entirely different content per role. The `DashboardPage` component dispatches to role-specific sub-components rather than embedding role conditions inline:

```tsx
// features/dashboard/DashboardPage.tsx
export default function DashboardPage() {
  const { role } = useAuthStore()
  if (role === 'project_leader') return <LeaderDashboard />
  if (role === 'annotator')      return <AnnotatorDashboard />
  if (role === 'reviewer')       return <ReviewerDashboard />
  return <AdminDashboard />
}
```

Each `*Dashboard` component lives in `features/dashboard/components/[role]/`.

### Routing and Code Splitting

Each feature module is lazy-loaded at the route level:

```tsx
// router/index.tsx
{ path: '/tasks', element: lazy(() => import('../features/task-management/TaskListPage')) }
```

Access control uses two guard components composed as route wrappers:
- `AuthGuard` — blocks unauthenticated users at the outer layer
- `RoleGuard` — blocks unauthorized roles per route group

### Localization Namespace Convention

Translation keys are namespaced per feature to avoid loading the entire translation corpus upfront and to prevent key collisions:

```
t('task-management:config_builder.label_name')
t('annotation:submit_button')
t('common:save')
```

## Consequences

### Easier
- Modifying a feature requires entering one folder — all related components, hooks, and API calls are co-located.
- Each Agent Team member (FrontendAgent) has a clear, non-overlapping file ownership boundary.
- Adding a new feature means creating a new folder under `features/` with no changes to existing features.
- `shared/` remains small because the admission rule is strict — only code imported by 2+ features qualifies.
- i18n namespacing per feature avoids one monolithic translation file.
- Deleting a feature is a single `rm -rf features/[module]/`.

### Harder
- Developers must resist the temptation to "temporarily" place feature-specific code in `shared/` to avoid the decision of where it belongs.
- Truly shared types (e.g., `Task`) require discipline to keep in `shared/types/` rather than duplicating across features.

### Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| Horizontal slicing | Modifying one feature requires touching multiple top-level folders; layers grow unboundedly |
| Next.js App Router file conventions | Rejected at the framework level (see ADR-004); not applicable to Vite SPA |
| Full Feature Slice Design (FSD) | FSD's `widgets/` and `entities/` layers add classification overhead not justified at this project scale |

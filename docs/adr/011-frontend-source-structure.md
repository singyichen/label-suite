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
frontend/
├── src/
│   │
│   ├── main.tsx                      # Entry point: ReactDOM.createRoot, providers (QueryClientProvider,
│   │                                 #   RouterProvider, i18next init). No business logic here.
│   │
│   ├── features/                     # Vertical axis — one folder per IA module
│   │   ├── account/                  # 帳號模組: login + profile (auth flow AND account management)
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── components/           # LoginForm, GoogleSSOButton, ProfileForm, AvatarUpload
│   │   │   ├── hooks/                # useLogin, useGoogleSSO, useProfile
│   │   │   └── services/             # authApi.ts (POST /auth/*), profileApi.ts (PATCH /users/me)
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── leader/           # LeaderDashboard.tsx, TaskOverviewCard.tsx, AnnotatorProgressArea.tsx
│   │   │   │   ├── annotator/        # AnnotatorDashboard.tsx, MyTaskList.tsx, ProgressSummary.tsx
│   │   │   │   ├── reviewer/         # ReviewerDashboard.tsx, PendingReviewList.tsx, IAACard.tsx
│   │   │   │   └── super-admin/      # SuperAdminDashboard.tsx, PlatformUserSummary.tsx
│   │   │   ├── hooks/                # useDashboard.ts
│   │   │   └── services/             # dashboardApi.ts
│   │   ├── task-management/
│   │   │   ├── TaskListPage.tsx
│   │   │   ├── TaskNewPage.tsx
│   │   │   ├── TaskDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ConfigBuilder/    # Complex sub-module — see Config-Driven Widget section below
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── VisualMode/
│   │   │   │   │   └── CodeMode/
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   └── TaskStatusBadge.tsx
│   │   │   ├── hooks/                # useTaskList.ts, useTaskForm.ts
│   │   │   └── services/             # taskApi.ts
│   │   ├── annotation/
│   │   │   ├── AnnotationWorkspacePage.tsx
│   │   │   ├── components/
│   │   │   │   ├── workspace/
│   │   │   │   │   ├── AnnotationArea.tsx
│   │   │   │   │   ├── ProgressIndicator.tsx
│   │   │   │   │   ├── InstructionModal.tsx
│   │   │   │   │   └── task-types/   # Config-driven widgets — see Config-Driven Widget section below
│   │   │   │   │       ├── registry.ts
│   │   │   │   │       ├── ClassificationWidget.tsx
│   │   │   │   │       ├── ScoringWidget.tsx
│   │   │   │   │       ├── NERWidget.tsx
│   │   │   │   │       ├── RelationWidget.tsx
│   │   │   │   │       └── SentencePairWidget.tsx
│   │   │   │   └── review/           # ReviewPanel.tsx, HistoryDrawer.tsx
│   │   │   ├── hooks/                # useAnnotation.ts, useReviewMode.ts
│   │   │   └── services/             # annotationApi.ts
│   │   ├── dataset/
│   │   │   ├── DatasetStatsPage.tsx
│   │   │   ├── DatasetQualityPage.tsx
│   │   │   ├── components/           # stats/ charts, quality/ IAA + anomaly components
│   │   │   ├── hooks/
│   │   │   └── services/             # datasetApi.ts
│   │   ├── annotator-management/
│   │   │   ├── AnnotatorListPage.tsx
│   │   │   ├── AnnotatorNewPage.tsx
│   │   │   ├── WorkLogPage.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── services/             # annotatorApi.ts
│   │   └── admin/
│   │       ├── UserManagementPage.tsx
│   │       ├── RoleSettingsPage.tsx
│   │       ├── components/
│   │       ├── hooks/
│   │       └── services/             # adminApi.ts
│   │
│   ├── shared/                       # Horizontal axis — cross-feature only (2+ features rule)
│   │   ├── ui/                       # Button, Input, Badge, Modal, Toast, Select (zero business logic)
│   │   ├── layout/                   # Navbar, Sidebar, BottomTabBar, PageShell
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance + JWT interceptors + 401 redirect
│   │   │   └── queryClient.ts        # TanStack QueryClient instance (new QueryClient())
│   │   ├── stores/                   # Zustand stores
│   │   │   ├── authStore.ts          # Current user, roles[], token
│   │   │   └── uiStore.ts            # Language preference, sidebar open state
│   │   ├── hooks/                    # useMediaQuery, useToast
│   │   ├── types/                    # Domain types mirroring backend Pydantic schemas
│   │   │   ├── user.ts               # User, Role
│   │   │   ├── task.ts               # Task, TaskType, TaskStatus
│   │   │   ├── annotation.ts         # Annotation, AnnotationItem
│   │   │   └── dataset.ts            # DatasetStats, QualityReport
│   │   └── utils/                    # cn() (clsx + tailwind-merge), formatDate()
│   │
│   ├── locales/                      # i18n — namespaced per feature module
│   │   ├── zh-TW/
│   │   │   ├── common.json
│   │   │   ├── account.json
│   │   │   ├── dashboard.json
│   │   │   ├── task-management.json
│   │   │   ├── annotation.json
│   │   │   ├── dataset.json
│   │   │   ├── annotator-management.json
│   │   │   └── admin.json
│   │   └── en/
│   │       └── (same structure)
│   │
│   └── router/
│       ├── index.tsx                 # Route definitions with lazy loading + Suspense
│       └── guards/
│           ├── AuthGuard.tsx         # Unauthenticated → redirect /login
│           └── RoleGuard.tsx         # Unauthorized role → redirect /
│
└── tests/                            # Playwright E2E tests — organized by user journey
    ├── auth/                         # login.spec.ts, google-sso.spec.ts
    ├── task-management/              # task-create.spec.ts, config-builder.spec.ts
    ├── annotation/                   # dry-run.spec.ts, official-run.spec.ts
    └── shared/                       # helpers, fixtures, page-object models
```

---

### Rule for `shared/` vs `features/`

A file belongs in `shared/` if and only if it is **directly imported by two or more different feature modules**. Everything else stays inside its feature folder. This rule applies equally to components, hooks, services, and types.

| Example | Location | Reason |
|---------|----------|--------|
| `Button` | `shared/ui/` | Used by all features |
| `Navbar` | `shared/layout/` | Used by all features |
| `Task` type | `shared/types/task.ts` | Imported by task-management, dashboard, dataset |
| `Annotation` type | `shared/types/annotation.ts` | Imported by annotation, dataset, task-management |
| `TaskStatusBadge` | `features/task-management/components/` | Only used within task-management |
| `ConfigBuilder` | `features/task-management/components/ConfigBuilder/` | Only used within task-new |
| `useAnnotation` | `features/annotation/hooks/` | Only used within annotation |
| `AnnotatorProgressRow` | `features/dashboard/components/leader/` | Only used in leader dashboard |

When a type or component starts in one feature and later needs to be used in a second feature, move it to `shared/` at that point. Do not pre-emptively place things in `shared/` in anticipation of future reuse.

---

### State Management Layers

| Layer | Tool | What It Manages |
|-------|------|-----------------|
| Server state | TanStack Query | All API data: fetching, caching, mutations |
| Global client state | Zustand | Auth token/user/roles, UI preferences (language, sidebar) |
| Local UI state | `useState` / `useReducer` | Component-level ephemeral state |

**Zustand stores must not hold API response data** — that is TanStack Query's responsibility.

**`QueryClient` placement:** The `QueryClient` instance lives in `shared/api/queryClient.ts` and is imported into `src/main.tsx` for the `<QueryClientProvider>`:

```tsx
// shared/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
export const queryClient = new QueryClient()

// src/main.tsx
import { queryClient } from './shared/api/queryClient'
root.render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
)
```

---

### Dashboard Role Dispatch

Users may hold multiple roles simultaneously (per IA specification). `authStore` stores a `roles` array, and `DashboardPage` selects the highest-privilege view:

```tsx
// shared/stores/authStore.ts
interface AuthState {
  user: User | null
  roles: Role[]          // e.g. ['project_leader', 'reviewer']
  token: string | null
}

// features/dashboard/DashboardPage.tsx
export default function DashboardPage() {
  const { roles } = useAuthStore()
  const has = (r: Role) => roles.includes(r)

  if (has('super_admin'))    return <SuperAdminDashboard />
  if (has('project_leader')) return <LeaderDashboard />
  if (has('reviewer'))       return <ReviewerDashboard />
  if (has('annotator'))      return <AnnotatorDashboard />
  // No recognised role — deny by default
  return <Navigate to="/login" replace />
}
```

Role sub-components and their file paths:

| Component | File |
|-----------|------|
| `SuperAdminDashboard` | `features/dashboard/components/super-admin/SuperAdminDashboard.tsx` |
| `LeaderDashboard` | `features/dashboard/components/leader/LeaderDashboard.tsx` |
| `ReviewerDashboard` | `features/dashboard/components/reviewer/ReviewerDashboard.tsx` |
| `AnnotatorDashboard` | `features/dashboard/components/annotator/AnnotatorDashboard.tsx` |

> **Security note:** The dispatch must be explicit for every known role with highest-privilege checked first. Unknown or empty `roles` redirects to `/login` (deny-by-default). Never use a catch-all fallback that renders privileged UI.

---

### Routing and Code Splitting

Each feature page is lazy-loaded at the route level. All lazy routes must be wrapped by a `<Suspense>` boundary — place a single boundary at the root layout level to avoid duplication:

```tsx
// src/main.tsx — single root Suspense boundary
root.render(
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={<PageLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  </QueryClientProvider>
)

// router/index.tsx — lazy() returns a component, wrap in JSX
import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

const TaskListPage  = lazy(() => import('../features/task-management/TaskListPage'))
const TaskNewPage   = lazy(() => import('../features/task-management/TaskNewPage'))
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGuard />,
    children: [
      { path: '/',       element: <DashboardPage /> },
      {
        element: <RoleGuard allow={['project_leader', 'super_admin']} />,
        children: [
          { path: '/tasks',     element: <TaskListPage /> },
          { path: '/tasks/new', element: <TaskNewPage /> },
        ],
      },
      // … other route groups
    ],
  },
])
```

`RoleGuard` receives an `allow` prop listing the roles permitted. It checks `roles.includes(r)` for any role in the allow list (any-of semantics), consistent with the multi-role model in `authStore`:

```tsx
// router/guards/RoleGuard.tsx
function RoleGuard({ allow }: { allow: Role[] }) {
  const { roles } = useAuthStore()
  const permitted = allow.some(r => roles.includes(r))
  return permitted ? <Outlet /> : <Navigate to="/" replace />
}
```

---

### Localization Namespace Convention

Translation keys are namespaced per feature module. Namespaces are loaded on demand using `i18next-http-backend`, which fetches `/locales/{lang}/{namespace}.json` only when the namespace is first accessed:

```ts
// src/main.tsx (i18next init)
i18n
  .use(Backend)           // i18next-http-backend
  .use(initReactI18next)
  .init({
    lng: 'zh-TW',
    fallbackLng: 'en',
    ns: ['common'],       // only common loaded eagerly
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
  })
```

Feature namespaces are declared at point of use:

```ts
// features/task-management/hooks/useTaskForm.ts
const { t } = useTranslation('task-management')
t('config_builder.label_name')

// features/annotation/components/workspace/AnnotationArea.tsx
const { t } = useTranslation('annotation')
t('submit_button')

// shared/ui/Button.tsx
const { t } = useTranslation('common')
t('save')
```

---

### Barrel File Policy

Feature modules must **not** expose barrel `index.ts` files. Internal imports within a feature use full relative paths. Only `shared/` sub-directories may expose a barrel for their public API:

```ts
// ✅ Correct — full path import within a feature
import { useTaskForm } from '../hooks/useTaskForm'

// ✅ Correct — barrel import from shared/
import { Button, Input } from '@/shared/ui'

// ❌ Wrong — barrel inside a feature leaks internals and hurts tree-shaking
// features/task-management/index.ts  ← do not create
```

This prevents Vite's bundler from treating an entire feature barrel as a single chunk, which defeats route-level code splitting.

---

### Config-Driven Task-Type Widget Registry

The annotation workspace renders different UI widgets per `task_type`, driven by the task config (see ADR-010). On the frontend, widgets are registered in a lookup table rather than using `switch` statements scattered across components:

```ts
// features/annotation/components/workspace/task-types/registry.ts
import type { TaskType } from '@/shared/types/task'
import type { ComponentType } from 'react'
import type { WidgetProps } from './types'

const WIDGET_REGISTRY: Record<TaskType, ComponentType<WidgetProps>> = {
  classification:  lazy(() => import('./ClassificationWidget')),
  scoring:         lazy(() => import('./ScoringWidget')),
  ner:             lazy(() => import('./NERWidget')),
  relation:        lazy(() => import('./RelationWidget')),
  sentence_pair:   lazy(() => import('./SentencePairWidget')),
}

export function getWidget(taskType: TaskType): ComponentType<WidgetProps> {
  return WIDGET_REGISTRY[taskType]
}
```

`AnnotationArea` resolves the widget at render time:

```tsx
// features/annotation/components/workspace/AnnotationArea.tsx
const Widget = getWidget(task.task_type)
return <Widget config={task.config} item={currentItem} onSubmit={handleSubmit} />
```

Each widget file is lazy-imported so only the widget for the active task type is downloaded. Adding a new `task_type` requires only: (1) creating a new `*Widget.tsx` file, and (2) adding one entry to `WIDGET_REGISTRY` — no other files change.

---

### Playwright Test Structure

E2E tests live in `frontend/tests/` organized by **user journey**, not by page or feature. A single user journey typically spans multiple features:

```
frontend/tests/
├── auth/
│   ├── login.spec.ts              # email/password login
│   └── google-sso.spec.ts         # Google OAuth flow
├── task-management/
│   ├── task-create.spec.ts        # leader creates task (steps 1–3)
│   └── config-builder.spec.ts     # config builder visual + code mode
├── annotation/
│   ├── dry-run.spec.ts            # annotator completes dry run
│   └── official-run.spec.ts       # annotator completes official run
├── dataset/
│   └── iaa-report.spec.ts         # reviewer checks IAA quality report
└── shared/
    ├── fixtures/                  # Playwright fixtures (authenticated sessions per role)
    └── page-objects/              # Page Object Models (LoginPage, DashboardPage, etc.)
```

Fixtures in `tests/shared/fixtures/` pre-authenticate sessions for each role so individual specs do not repeat login steps.

---

## Consequences

### Easier
- Modifying a feature requires entering one folder — all related components, hooks, services, and types are co-located.
- Each Agent Team member (FrontendAgent) has a clear, non-overlapping file ownership boundary.
- Adding a new feature means creating a new folder under `features/` with no changes to existing features.
- Adding a new task type requires only a new widget file + one registry entry (no conditional sprawl).
- `shared/` remains small because the admission rule is strict — only code imported by 2+ features qualifies.
- i18n namespaces are loaded on demand — initial bundle only includes `common.json`.
- Deleting a feature is a single `rm -rf features/[module]/`.

### Harder
- Developers must resist pre-emptively placing code in `shared/` before it is actually reused by a second feature.
- Moving a type or component from a feature into `shared/` when it gains a second consumer requires updating import paths — this is expected and intentional, not a defect.

### Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| Horizontal slicing | Modifying one feature requires touching multiple top-level folders; layers grow unboundedly |
| Next.js App Router file conventions | Rejected at the framework level (see ADR-004); not applicable to Vite SPA |
| Full Feature Slice Design (FSD) | FSD's `widgets/` and `entities/` layers add classification overhead not justified at this project scale |

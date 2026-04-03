# ADR-012: Frontend Testing Strategy — Vitest + RTL + Playwright

**Status**: Accepted
**Date**: 2026-04-03

## Context

ADR-009 defines the overall project testing strategy (pytest + Playwright), but covers the frontend only at the E2E layer. The frontend has unique testing requirements not addressed there:

- **Component-level logic** that is too granular for E2E (widget rendering, role dispatch, form validation)
- **Config-driven task-type widgets** that must be tested in isolation per `task_type`
- **Role-based access control** with `role: Role` (single-value enum per IA and JWT contract)
- **i18n namespace lazy-loading** that introduces async HTTP in the render path
- **TanStack Query cache** that must be isolated between tests
- **Axios interceptors** (JWT attach, 401 redirect) that interfere with component test assertions

This ADR defines the frontend-specific testing strategy that complements ADR-009.

---

## Decision

Use a **two-layer testing strategy** for the frontend:

| Layer | Tool | Scope | Location |
|-------|------|-------|----------|
| Component / Unit | Vitest + React Testing Library | Individual components, hooks, widget logic, role dispatch | Co-located with source: `*.test.tsx` next to `*.tsx` |
| E2E (User Journey) | Playwright | Full user journeys across pages and roles | `frontend/tests/` |

The two layers have complementary — not overlapping — responsibilities. Do not test pure UI logic in Playwright, and do not test multi-page user journeys in Vitest.

---

## Component Testing (Vitest + React Testing Library)

### Toolchain

| Package | Purpose |
|---------|---------|
| `vitest` | Test runner (Vite-native, fast, no config duplication) |
| `@testing-library/react` | Component mounting + DOM queries |
| `@testing-library/user-event` | Realistic user interaction simulation |
| `msw` | Mock Service Worker — intercepts HTTP at the network layer |
| `@testing-library/jest-dom` | Extended DOM matchers (`toBeInTheDocument`, `toHaveValue`, etc.) |

### Co-location Convention

Test files live next to the source file they test:

```
features/task-management/components/
├── TaskCard.tsx
├── TaskCard.test.tsx          ← component test
├── TaskStatusBadge.tsx
└── TaskStatusBadge.test.tsx

features/task-management/hooks/
├── useTaskList.ts
└── useTaskList.test.ts        ← hook test

shared/ui/
├── Button.tsx
└── Button.test.tsx
```

Hooks are tested with `renderHook` from React Testing Library. Use `createWrapper` (not `renderWithProviders`) as the `wrapper` option — `renderHook` expects a React component returning JSX, not a render result:

```ts
// features/task-management/hooks/useTaskList.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useTaskList } from './useTaskList'
import { createWrapper } from '@/tests/shared/utils/renderWithProviders'

test('fetches task list', async () => {
  const { result } = renderHook(() => useTaskList(), { wrapper: createWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toHaveLength(2)
})
```

### `renderWithProviders` — Test Isolation Helper

The module-level `queryClient` singleton in `shared/api/queryClient.ts` must **never** be used in tests. Each test creates a fresh `QueryClient` to prevent cache pollution between tests:

```tsx
// frontend/src/tests/shared/utils/renderWithProviders.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

// For component tests: renders ui inside providers, returns RTL RenderResult
export function renderWithProviders(
  ui: React.ReactElement,
  { role = 'annotator' as Role, route = '/' } = {}
) {
  const queryClient = makeTestQueryClient()
  useAuthStore.setState({ role, user: mockUser, token: 'test-token' })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// For renderHook: returns a React component (JSX), NOT a RenderResult.
// renderHook's `wrapper` option requires a component that accepts { children }
// and returns JSX — calling render() here would return RenderResult and break it.
export function createWrapper({ role = 'annotator' as Role, route = '/' } = {}) {
  const queryClient = makeTestQueryClient()
  useAuthStore.setState({ role, user: mockUser, token: 'test-token' })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}
```

### HTTP Mocking with `msw`

All API calls in component tests are intercepted by `msw` — the Axios interceptors in `shared/api/client.ts` must not fire during tests:

```ts
// frontend/src/tests/shared/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/tasks', () =>
    HttpResponse.json([{ id: '1', name: 'Sentiment Analysis', status: 'draft' }])
  ),
  http.get('/api/tasks/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Sentiment Analysis' })
  ),
  // … other routes
]

// frontend/src/tests/shared/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)

// vitest.setup.ts
import { server } from './src/tests/shared/mocks/server'
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

Override handlers per test to simulate error states or empty responses:

```ts
test('shows empty state when no tasks', async () => {
  server.use(http.get('/api/tasks', () => HttpResponse.json([])))
  renderWithProviders(<TaskListPage />)
  expect(await screen.findByText('建立第一個任務')).toBeInTheDocument()
})
```

### i18n in Component Tests

Do not load i18n namespace files from HTTP in tests. Configure i18next with inline resources:

```ts
// vitest.setup.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTW from '../locales/zh-TW/common.json'

i18n.use(initReactI18next).init({
  lng: 'zh-TW',
  resources: { 'zh-TW': { common: zhTW } },
  interpolation: { escapeValue: false },
})
```

For tests that require a specific feature namespace, import the JSON directly:

```ts
import taskManagement from '../locales/zh-TW/task-management.json'
i18n.addResourceBundle('zh-TW', 'task-management', taskManagement)
```

### Widget Testing Pattern

Each task-type widget is tested in isolation by constructing a `WidgetProps` stub. Because widgets are `lazy()`-loaded in production, tests import them directly (bypassing the registry):

```tsx
// features/annotation/components/workspace/task-types/ClassificationWidget.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClassificationWidget from './ClassificationWidget'
import type { WidgetProps } from './types'

const props: WidgetProps = {
  config: { labels: [{ name: 'Positive' }, { name: 'Negative' }] },
  item: { id: '1', text: '這個產品很棒' },
  onSubmit: vi.fn(),
  readOnly: false,
}

test('renders all labels', () => {
  render(<ClassificationWidget {...props} />)
  expect(screen.getByText('Positive')).toBeInTheDocument()
  expect(screen.getByText('Negative')).toBeInTheDocument()
})

test('calls onSubmit with selected label', async () => {
  render(<ClassificationWidget {...props} />)
  await userEvent.click(screen.getByText('Positive'))
  expect(props.onSubmit).toHaveBeenCalledWith({ label: 'Positive' })
})

test('disables interaction in readOnly mode', () => {
  render(<ClassificationWidget {...props} readOnly />)
  expect(screen.getByText('Positive').closest('button')).toBeDisabled()
})
```

### Dashboard Role Dispatch Test Matrix

`DashboardPage` dispatches based on the JWT `role` value (single enum). The dispatch selects which dashboard VIEW to render — it is separate from route-level access control (RoleGuard).

```tsx
// features/dashboard/DashboardPage.test.tsx
const cases = [
  { role: 'super_admin',    expected: 'SuperAdminDashboard' },
  { role: 'project_leader', expected: 'LeaderDashboard' },
  { role: 'reviewer',       expected: 'ReviewerDashboard' },
  { role: 'annotator',      expected: 'AnnotatorDashboard' },
  { role: null,             expected: 'redirect:/login' },   // unauthenticated
  { role: 'unknown_role',   expected: 'redirect:/login' },   // deny-by-default
]

test.each(cases)('role=$role renders $expected', ({ role, expected }) => {
  renderWithProviders(<DashboardPage />, { role })
  if (expected.startsWith('redirect:')) {
    expect(mockNavigate).toHaveBeenCalledWith(expected.replace('redirect:', ''), { replace: true })
  } else {
    expect(screen.getByTestId(expected)).toBeInTheDocument()
  }
})
```

### RoleGuard Inheritance Test Matrix

`RoleGuard` uses `ROLE_HIERARCHY` to resolve effective roles. Tests must cover both direct access and inherited access:

```tsx
// router/guards/RoleGuard.test.tsx
const cases = [
  // Direct access
  { role: 'annotator',      allow: ['annotator'],      permitted: true  },
  { role: 'reviewer',       allow: ['reviewer'],        permitted: true  },
  { role: 'project_leader', allow: ['project_leader'],  permitted: true  },
  { role: 'super_admin',    allow: ['super_admin'],     permitted: true  },
  // Inherited access — project_leader inherits reviewer
  { role: 'project_leader', allow: ['reviewer'],        permitted: true  },
  // Inherited access — super_admin inherits all
  { role: 'super_admin',    allow: ['annotator'],       permitted: true  },
  { role: 'super_admin',    allow: ['reviewer'],        permitted: true  },
  { role: 'super_admin',    allow: ['project_leader'],  permitted: true  },
  // Denied — no inheritance upward
  { role: 'annotator',      allow: ['reviewer'],        permitted: false },
  { role: 'reviewer',       allow: ['project_leader'],  permitted: false },
  { role: 'annotator',      allow: ['project_leader'],  permitted: false },
  // Boundary — null role denied
  { role: null,             allow: ['annotator'],       permitted: false },
]

test.each(cases)('role=$role allow=$allow → $permitted', ({ role, allow, permitted }) => {
  renderWithProviders(<RoleGuard allow={allow}><div>content</div></RoleGuard>, { role })
  if (permitted) {
    expect(screen.getByText('content')).toBeInTheDocument()
  } else {
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  }
})
```

---

## E2E Testing (Playwright)

### Playwright Fixture Pattern

Pre-authenticated sessions are built on Playwright's `test.extend` fixture API. Each fixture stores the browser storage state to skip the login UI:

```ts
// frontend/tests/shared/fixtures/index.ts
import { test as base } from '@playwright/test'

type Fixtures = {
  asProjectLeader: Page
  asAnnotator: Page
  asReviewer: Page
  asSuperAdmin: Page
}

export const test = base.extend<Fixtures>({
  asProjectLeader: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: 'tests/shared/fixtures/.auth/project-leader.json',
    })
    await use(await ctx.newPage())
    await ctx.close()
  },
  asAnnotator: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: 'tests/shared/fixtures/.auth/annotator.json',
    })
    await use(await ctx.newPage())
    await ctx.close()
  },
  asReviewer: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: 'tests/shared/fixtures/.auth/reviewer.json',
    })
    await use(await ctx.newPage())
    await ctx.close()
  },
  asSuperAdmin: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: 'tests/shared/fixtures/.auth/super-admin.json',
    })
    await use(await ctx.newPage())
    await ctx.close()
  },
})
```

Setup script at `tests/shared/fixtures/setup.ts` generates `.auth/*.json` files by logging in programmatically and saving storage state.

### E2E Coverage Matrix

The following spec files map 1-to-1 to the five IA user journeys. All five must be implemented before the project is considered E2E-tested:

| IA Journey | Spec File | Roles Needed | Priority |
|---|---|---|---|
| A — Project Leader full lifecycle | `task-management/task-lifecycle.spec.ts` | `asProjectLeader` | P1 |
| B — Annotator completes annotation | `annotation/dry-run.spec.ts`, `annotation/official-run.spec.ts` | `asAnnotator` | P1 |
| C — Reviewer audits + quality report | `dataset/reviewer-audit.spec.ts` | `asReviewer`, `asProjectLeader` | P1 |
| D — Super Admin user management | `admin/user-management.spec.ts` | `asSuperAdmin` | P2 |
| Account — login + profile | `auth/login.spec.ts`, `auth/google-sso.spec.ts` | `asUnauthenticated` | P1 |

Full `frontend/tests/` structure:

```
frontend/tests/
├── auth/
│   ├── login.spec.ts                  # email/password + error states
│   └── google-sso.spec.ts             # Google OAuth redirect flow
├── task-management/
│   ├── task-lifecycle.spec.ts         # Journey A: create → dry run → IAA → official run → export
│   ├── task-detail-states.spec.ts     # All 5 task status transitions + UI changes per state
│   └── config-builder.spec.ts         # Visual mode + Code mode per task_type
├── annotation/
│   ├── dry-run.spec.ts                # Annotator completes dry run; instruction modal
│   └── official-run.spec.ts           # Annotator completes official run; auto-save
├── dataset/
│   ├── stats.spec.ts                  # dataset-stats per task_type chart rendering
│   └── reviewer-audit.spec.ts         # Journey C: review + IAA report + anomaly detection
├── admin/
│   └── user-management.spec.ts        # Journey D: create user, assign role, disable account
└── shared/
    ├── fixtures/                      # Playwright fixture definitions + .auth/ storage states
    └── page-objects/                  # Page Object Models (one class per page)
        ├── LoginPage.ts
        ├── DashboardPage.ts
        ├── TaskDetailPage.ts
        └── AnnotationWorkspacePage.ts
```

### Task Status Machine Testing

`task-detail-states.spec.ts` must test every status transition independently, not only the happy path:

```ts
// frontend/tests/task-management/task-detail-states.spec.ts
test('draft state shows Publish Dry Run button, hides Export', async ({ asProjectLeader: page }) => {
  await page.goto('/tasks/task-draft-id')
  await expect(page.getByRole('button', { name: /publish dry run/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /export/i })).toBeHidden()
})

test('waiting-iaa state shows IAA badge and Go to Quality Report link', async ({ asProjectLeader: page }) => {
  await page.goto('/tasks/task-waiting-iaa-id')
  await expect(page.getByTestId('waiting-iaa-badge')).toBeVisible()
  await expect(page.getByRole('link', { name: /quality report/i })).toBeVisible()
})
```

API state is seeded via `msw` in the Playwright `page.route()` layer:

```ts
await page.route('/api/tasks/task-draft-id', route =>
  route.fulfill({ json: { id: 'task-draft-id', status: 'draft' } })
)
```

### Empty State Testing

Each page with a defined empty state (per IA) must have a dedicated empty state test. Use `page.route()` to return an empty array:

```ts
test('task-list shows empty state when no tasks', async ({ asProjectLeader: page }) => {
  await page.route('/api/tasks', route => route.fulfill({ json: [] }))
  await page.goto('/tasks')
  await expect(page.getByText('建立第一個任務')).toBeVisible()
  await page.getByRole('button', { name: '建立第一個任務' }).click()
  await expect(page).toHaveURL('/tasks/new')
})
```

Pages requiring empty state tests:

| Page | Empty Condition | Expected CTA |
|------|----------------|--------------|
| `task-list` | No tasks | → `task-new` |
| `dashboard` (leader) | No tasks | → `task-new` |
| `dashboard` (annotator) | No assigned tasks | → `profile` |
| `dashboard` (reviewer) | No pending reviews | → `dataset-stats` |
| `annotator-list` | No annotators | → `annotator-new` |
| `dataset-stats` | No annotation data | → `task-detail` |
| `dataset-quality` | Dry Run incomplete | → `task-detail` |
| `work-log` | No log entries | No CTA |

### Instruction Modal Testing

When a Project Leader enables forced instruction display, the annotator must see the modal before the workspace renders:

```ts
test('instruction modal blocks workspace entry when enabled', async ({ asAnnotator: page }) => {
  await page.route('/api/tasks/task-id/assignment', route =>
    route.fulfill({ json: { forceInstruction: true, instructionUrl: '/docs/guide.pdf' } })
  )
  await page.goto('/annotation/task-id')
  await expect(page.getByRole('dialog', { name: /標記說明/i })).toBeVisible()
  await expect(page.getByTestId('annotation-area')).toBeHidden()
  await page.getByRole('button', { name: /我已閱讀/i }).click()
  await expect(page.getByTestId('annotation-area')).toBeVisible()
})
```

### Role-Based Access Control Testing

`RoleGuard` boundary conditions must be tested at the E2E layer to confirm server-side redirect behaviour (not just hidden UI):

```ts
test('annotator navigating directly to /tasks is redirected to /', async ({ asAnnotator: page }) => {
  await page.goto('/tasks')
  await expect(page).toHaveURL('/')
})

test('unauthenticated user navigating to / is redirected to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/login')
})
```

---

## Consequences

### Easier
- Vitest runs entirely within Vite's transform pipeline — no separate Jest config; TypeScript path aliases (`@/shared/…`) resolve without extra setup.
- `msw` intercepts HTTP at the network level, so component tests are not aware of whether the app uses Axios, fetch, or TanStack Query — the HTTP contract is what is tested.
- Widget isolation tests are fast (< 50ms per test) and catch config-handling bugs before E2E.
- Pre-authenticated Playwright fixtures cut login time from every spec, reducing total E2E suite time.
- Empty state and status-machine tests via `page.route()` are deterministic — no dependency on seeded database state.

### Harder
- `msw` handlers must stay in sync with the actual FastAPI API contract. Stale handlers silently pass tests against a changed API — mitigated by running both layers in CI together.
- `renderWithProviders` must be updated whenever new global providers are added (e.g., a ThemeProvider).
- Playwright `.auth/` storage state files must be regenerated whenever the authentication flow changes.

### Relationship to ADR-009

ADR-009 defines the project-wide testing mandate (Red-Green-Refactor, 80% backend coverage, Playwright for core flows). ADR-012 is the frontend implementation of that mandate:

| ADR-009 Rule | ADR-012 Implementation |
|---|---|
| TDD — write tests before code | Vitest component tests written before component implementation |
| Playwright for core user flows | Five journey spec files mapping to IA journeys A–D |
| No mocking of real integrations | `msw` mocks HTTP, not internal modules — tests the real component code |

### Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| Jest instead of Vitest | Jest requires separate Babel/TS transform config duplicating Vite setup; Vitest reuses `vite.config.ts` directly |
| Cypress instead of Playwright | Playwright is already mandated by ADR-009; maintaining two E2E frameworks is YAGNI |
| No component testing layer (E2E only) | Widget logic and role dispatch have too many combinations to cover exhaustively in Playwright without unreasonable test runtime |
| `axios-mock-adapter` instead of msw | Couples tests to Axios implementation details; msw works at the network layer regardless of HTTP client |

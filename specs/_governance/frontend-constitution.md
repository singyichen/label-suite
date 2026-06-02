# Frontend Constitution

Source of truth: `specs/_governance/constitution.md`, `docs/adr/001-monorepo-structure.md`, `docs/adr/002-package-managers.md`, `docs/adr/004-frontend-framework-react-vite.md`, `docs/adr/009-testing-strategy.md`, `docs/adr/010-config-driven-architecture.md`, `docs/adr/011-frontend-source-structure.md`, `docs/adr/012-frontend-testing-strategy.md`, `docs/adr/014-prototype-playwright-testing.md`, `docs/adr/015-role-based-progressive-onboarding.md`, and `docs/adr/016-frontend-component-library-shadcn-storybook.md`.

## I. React 18 And Vite SPA

- The frontend is a React 18, TypeScript, and Vite single-page application.
- Use React functional components and hooks.
- Use React Router v6 for routing.
- Do not introduce SSR, Next.js, or a Node.js production runtime without a new ADR.
- Keep `src/main.tsx` limited to app bootstrapping and providers; no business logic belongs there.

## II. MVP And Simplicity

- Build the smallest usable UI that satisfies the current spec, prototype, and acceptance criteria.
- Do not add generalized UI frameworks, state machines, wrappers, or shared abstractions before repeated real use proves they are needed.
- Reuse existing shared components and design tokens before introducing new variants.
- Every interactive behavior must be observable and testable through component, E2E, or prototype tests.
- Prefer direct feature-local implementation until two or more feature modules actually need shared code.

## III. TypeScript Strictness

- TypeScript strict mode must remain enabled.
- `any` is prohibited (see main constitution Principle V). Use precise types, generics, discriminated unions, or `unknown` with narrowing.
- Frontend domain types must mirror backend API contracts.
- No committed `console.log`, debug traces, or dead experimental code.

## IV. Vertical Feature Slicing

- Feature modules live under `frontend/src/features/[module]/`.
- A feature must not import from another feature.
- Cross-feature code belongs in `frontend/src/shared/` only when imported by two or more distinct feature modules.
- Do not place code in `shared/` for speculative reuse.
- Each feature owns its components, hooks, services, tests, and feature-local types.

## V. Config-Driven Task UI

- Task behavior must be derived from task configuration.
- Do not hardcode task-specific logic in core frontend flows.
- Annotation widgets must be selected through config-driven registries or equivalent config-derived dispatch.
- Adding a new task type must not require changing unrelated core UI code.
- Task-type widgets must support tested loading, empty, read-only, disabled, error, and submission states where applicable.

## VI. State Management Boundaries

- TanStack Query owns server state: fetching, caching, invalidation, mutations, and optimistic updates.
- Zustand owns global client state only: auth user, auth token, role, language, sidebar, and durable UI preferences.
- Zustand must not store API response data.
- Local UI state belongs in `useState` or `useReducer`.
- The production `QueryClient` singleton lives in `shared/api/queryClient.ts` and must not be reused in tests.

## VII. UI System

- shadcn/ui components live in `frontend/src/shared/ui/`.
- Tailwind CSS must use project design tokens; hardcoded colors, spacing, and typography scales are not allowed when a token exists.
- New shared primitives require meaningful variants and accessibility states.
- Every non-page UI component must have a Storybook story covering at minimum the Default state and applicable boundary states: Empty, Loading, Error, and Disabled.
- Storybook stories are required for shared UI primitives with variants and annotation widgets with meaningful visual states.
- Stories are co-located as `Component.stories.tsx`.
- Storybook stories must be kept in sync with the component and may not be omitted after initial creation.

## VIII. Accessibility

- Prefer semantic HTML and accessible shadcn/Radix primitives.
- Interactive controls must be keyboard reachable and operable.
- Dialogs, menus, tabs, forms, and tables must expose correct names, roles, focus behavior, and disabled states.
- Form errors must be programmatically associated with fields.
- Do not rely on color alone to communicate status.
- Core flows should target WCAG 2.1 AA behavior.

## IX. i18n

- Use i18n namespace files under `frontend/src/locales/{zh-TW,en}/`.
- Namespaces follow feature modules plus `common`.
- Components must not hardcode user-facing strings except stable technical identifiers.
- Component tests must use inline or directly imported i18n resources, not HTTP-loaded namespaces.

## X. `data-testid` Contract

- `data-testid` values are a cross-layer selector contract across prototype HTML, React implementation, and Playwright tests.
- Names must be kebab-case and describe purpose or element type, such as `email-input`, `submit-btn`, or `error-banner`.
- Do not rename or remove a test id without updating prototype tests, React tests, and E2E tests together.
- Prototype HTML and its corresponding React implementation must share a consistent `data-testid` contract where semantic selectors are insufficient.
- `data-testid` values established in prototype specs are binding on the React implementation unless the deviation is explicitly documented.
- Prefer accessible locators in tests where possible; use `data-testid` for stable app-specific targets.

## XI. Testing And TDD

- Frontend work follows Red-Green-Refactor: write the failing test before implementation.
- Component and hook tests use Vitest and React Testing Library and are co-located with source.
- API interactions in component tests use MSW at the network boundary.
- E2E tests use Playwright under `frontend/tests/`.
- Core journeys, role guards, empty states, task status transitions, and annotation flows require Playwright coverage.
- Tests must use fresh QueryClient instances and isolated auth/store state.
- Prototype Playwright tests under `design/prototype/tests/` validate design-layer acceptance criteria and selector contracts.

## XII. Role-Aware UX And Security

- Dashboard dispatch must handle each known role explicitly.
- Route guards must use exact allow lists; no implicit role inheritance.
- Unknown, null, or unauthenticated roles must redirect to a safe route.
- Annotator-facing UI must never expose test-set answers, ground truth, or privileged evaluation data.
- Onboarding must be contextual, role-based, optional, and recoverable.

## XIII. Frontend Runtime Safety

- Async effects must guard against race conditions, stale responses, and updates after unmount.
- Network requests started by a component must be cancellable or safely ignored when the component is no longer active.
- Timers, subscriptions, observers, event listeners, workers, and object URLs must be cleaned up in the component cleanup phase.
- Long-lived pages must not allow unbounded memory growth from caches, arrays, maps, logs, closures, or retained DOM references.
- Components that fetch or subscribe to data must define loading, error, empty, retry, and cleanup behavior.
- Race-prone flows must include tests or documented verification covering rapid navigation, repeated actions, and overlapping requests.

## XIV. API Contract Consumption

- Frontend code must consume documented API contracts and must not rely on undocumented response fields.
- Frontend domain types must stay aligned with backend enums, status values, task types, role names, error codes, and workflow states.
- Contract changes must be backward-compatible unless explicitly declared breaking.
- Breaking contract changes require coordinated frontend, backend, migration, and test updates.
- Mock data, fixtures, prototypes, and MSW handlers must not define enum values or API shapes that conflict with the canonical contract.
- Generated types or contract tests must be used where practical to prevent silent drift.

## XV. Performance

- Use route-level lazy loading for feature pages where practical.
- Avoid unnecessary global state updates and broad re-renders.
- Use TanStack Query cache controls intentionally; do not refetch blindly.
- Large lists must be paginated or virtualized.
- Core pages must maintain Lighthouse Performance score of at least 80 on desktop.
- Page First Contentful Paint must not exceed 3s on a standard connection.
- User interaction must produce visible feedback within 100ms; longer operations must show an immediate loading state.
- Non-critical routes must use code splitting and lazy loading; the initial bundle must not load all modules upfront.
- Annotation workspace interactions must remain responsive under realistic task payloads.

## XVI. PR Boundaries

- Frontend layer concerns must be split into separate PRs: TypeScript types with i18n keys, API service with MSW handlers, components with tests and Storybook stories, and page assembly are each distinct review units.
- Backend and frontend PRs must be independent when no breaking API contract change is involved.
- When a breaking API contract change does occur, backend and frontend PRs must cross-reference each other.

## XVII. Commands

All frontend commands must run from `frontend/` and use `pnpm`.

```bash
pnpm dev
pnpm build
pnpm tsc --noEmit
pnpm lint
pnpm test
pnpm playwright test
pnpm storybook
pnpm build-storybook
pnpm add <package>
pnpm add -D <package>
pnpm dlx shadcn@latest add <component>
```

Do not use `npm install`. Do not modify dependency versions unless explicitly requested.

## XVIII. Governance

This frontend constitution refines but does not override `specs/_governance/constitution.md`. If this file conflicts with the main constitution, the main constitution wins. Changes to frontend architecture, framework, state management, component library, or testing strategy require an ADR or an amendment to an existing ADR before implementation.

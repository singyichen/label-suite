# ADR-004: Use React + Vite as Frontend Framework

**Status**: Accepted
**Date**: 2026-03-19

## Context

The frontend must provide an annotation workspace for NLP labeling tasks, a leaderboard view, and a submission interface. Key requirements:

- Component-based UI supporting configurable task templates (classification, regression, span labeling).
- TypeScript strict mode for type safety across the annotation interface.
- Fast development feedback loop (HMR).
- REST API integration with the FastAPI backend.
- E2E testable via Playwright.
- Appropriate for a small team (primarily one developer).

The backend is FastAPI (Python), exposing RESTful APIs — no SSR or BFF pattern is required.

### Candidates Evaluated

| Framework | SSR | Type Safety | Build Speed | Ecosystem | Complexity |
|-----------|:---:|:-----------:|:-----------:|:---------:|:----------:|
| **React + Vite** | SPA only | TypeScript strict | Fastest (ESBuild) | Largest | Low |
| Next.js (App Router) | SSR/SSG/CSR | TypeScript strict | Medium | Very Large | High |
| Nuxt.js | SSR/SSG/CSR | TypeScript | Medium | Large (Vue) | High |
| SvelteKit | SSR/SSG/CSR | TypeScript | Fast | Medium | Medium |

**Next.js rejected**: SSR and App Router complexity (Server Components, Server Actions) are unnecessary for a portal where all content is behind authentication. The added complexity of a Node.js runtime in production is not justified for a research Demo Paper system.

**Nuxt.js rejected**: Vue ecosystem, while capable, has a smaller pool of annotation/data UI component libraries compared to the React ecosystem.

**SvelteKit rejected**: Smaller ecosystem for complex data UI components; fewer resources for TypeScript strict mode patterns.

## Decision

Use **React 18 + Vite** as a Single Page Application (SPA).

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript (strict mode) |
| Package Manager | pnpm |
| Build Tool | Vite |
| Routing | React Router v6 |
| State Management | TanStack Query (server state) |
| Testing | Playwright (E2E) |
| Linting | ESLint + Prettier |

## Consequences

### Easier
- Vite provides near-instant HMR — the fastest development feedback loop in the frontend ecosystem.
- React's large ecosystem covers all UI needs: data tables, form builders, annotation widgets.
- SPA architecture maps naturally to the portal's auth-gated, app-like interaction model.
- TanStack Query handles API caching, refetching, and optimistic updates for labeling and leaderboard data.
- TypeScript strict mode catches contract mismatches with FastAPI Pydantic schemas early.
- Playwright E2E tests run against the compiled SPA without SSR complexity.
- No Node.js runtime required in production — Vite builds to static assets served by any CDN or Nginx.

### Harder
- No SSR — public-facing marketing pages (if added later) will have weaker SEO.
- CORS must be explicitly configured in FastAPI (`allow_origins` whitelist) since the SPA and API are on different origins in development.
- Routing is client-side only — the server must be configured to serve `index.html` for all routes (handled via Nginx / Vite dev server config).

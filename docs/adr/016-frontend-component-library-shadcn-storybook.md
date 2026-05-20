# ADR-016: Use shadcn/ui + Storybook for Frontend Component Library

**Status**: Accepted
**Date**: 2026-05-19

## Context

ADR-004 decided on React 18 + Vite + TypeScript but did not specify a UI component library. The annotation portal requires:

- Accessible, keyboard-navigable components (dialogs, tables, forms, tabs).
- Configurable task-type annotation widgets with many visual variants (`ClassificationWidget`, `NERWidget`, `RelationWidget`, etc.).
- A design token system compatible with `design/prototype/assets/tokens.css` — to be translated into `tailwind.config.ts` during React scaffolding.
- Component development in isolation — annotation widgets are complex enough to need documented visual states before backend integration.
- Single developer — zero-overhead library update strategy.

### UI Library Candidates

| Library | Source Model | Tailwind | Accessibility | Bundle Impact | Customization |
|---------|:-----------:|:--------:|:-------------:|:-------------:|:-------------:|
| **shadcn/ui** | Source code copied | Required | Radix UI primitives | Zero (tree-shaken) | Full (source) |
| MUI | npm dependency | No (emotion/sx) | Good | ~250 kB | Limited (theme) |
| Chakra UI | npm dependency | No (emotion) | Good | ~200 kB | Medium (theme tokens) |
| Ant Design | npm dependency | No | Good | ~500 kB | Complex |
| Radix UI (headless) | npm dependency | Manual | Excellent | Small | Full (manual) |

**MUI rejected**: Emotion CSS-in-JS runtime conflicts with Vite's compile-time optimization. Bundle size is large for an app where annotation workspace load time matters. Theming via `sx` prop diverges from the Tailwind conventions planned for this project.

**Chakra UI rejected**: Same CSS-in-JS runtime concern. Smaller component set.

**Ant Design rejected**: Enterprise-opinionated styling; heavy bundle; overlapping i18n config creates duplicate locale management alongside i18next.

**Radix UI headless rejected**: Valid but requires building all styling from scratch — duplicates work that shadcn/ui already provides on top of the same Radix primitives.

### Component Documentation Candidates

| Tool | React Support | Vite | Interactive | Dev-only |
|------|:------------:|:----:|:-----------:|:--------:|
| **Storybook** | First-class | `@storybook/react-vite` | Yes (controls, interactions) | Yes |
| Ladle | Good | First-class | Limited | Yes |
| Docz | Basic | Yes | No | Yes |

**Ladle rejected**: Smaller ecosystem; fewer addons. Not suitable for interaction testing on annotation widgets.

**Docz rejected**: Static documentation only; no interactive component controls.

## Decision

Use **shadcn/ui** as the component library and **Storybook 8** for component documentation.

| Concern | Decision |
|---------|---------|
| Component library | shadcn/ui (Radix base, Tailwind CSS) |
| CLI | `pnpm dlx shadcn@latest add <component>` |
| Component location | `frontend/src/shared/ui/` |
| Storybook runner | `@storybook/react-vite` (no separate Webpack config) |
| Story location | Co-located: `Component.stories.tsx` next to `Component.tsx` |
| Storybook scope | `shared/ui/` primitives + annotation task-type widget variants |

### shadcn/ui Integration

Components are added as source files to `frontend/src/shared/ui/` and can be edited directly. There is no npm runtime dependency to version-lock.

```
frontend/src/shared/ui/
├── button.tsx
├── dialog.tsx
├── table.tsx
├── badge.tsx
└── ...
```

When upgrading a component from upstream: `pnpm dlx shadcn@latest add <component> --dry-run` then `--diff` to review, then `--overwrite` only after confirming no local changes are lost.

### Storybook Scope

Stories are written only for components with meaningful visual variants. Annotation widgets are the primary target:

```
features/annotation/components/workspace/task-types/
├── ClassificationWidget.tsx
├── ClassificationWidget.stories.tsx   ← single_label, multi_label, readOnly states
├── NERWidget.tsx
├── NERWidget.stories.tsx              ← entity types, overlapping spans, readOnly
├── RelationWidget.tsx
└── RelationWidget.stories.tsx         ← relation types, empty graph, readOnly
```

`shared/ui/` primitive stories cover variant combinations (Button sizes/variants, Badge colors, Dialog with/without title).

## Consequences

### Easier
- shadcn/ui components are source files — customization is one file edit, not CSS specificity override chains.
- Tailwind CSS classes map directly from `tokens.css` design tokens; migration is a one-time `tailwind.config.ts` setup.
- Storybook isolates annotation widget development from API/data dependencies — widgets are built and validated before the backend is ready.
- Storybook serves as a living Demo Paper supplement: the component gallery demonstrates UI depth without requiring a live backend during presentation.
- Zero runtime bundle impact from shadcn: all styling is compiled Tailwind classes.

### Harder
- shadcn/ui requires Tailwind CSS as a hard dependency (not optional, unlike a pure CSS solution).
- Storybook is a separate dev server (`pnpm storybook`) and an additional CI step (`pnpm build-storybook`). CI runs it as a non-blocking check, not a PR gate.
- shadcn/ui components are snapshotted at install time — upstream fixes require running `add --diff` to selectively merge upstream changes. For MVP, this is acceptable.

### Relationship to ADR-004 and ADR-012

ADR-004 selected React 18 + Vite. This ADR adds Tailwind CSS as an additional dependency — fully compatible with the Vite SPA architecture but not mentioned in ADR-004.

ADR-012 defines Vitest + RTL for component testing. Storybook interaction tests are additive: they cover visual and interactive scenarios (NER span drag-selection, widget layout at varying viewport widths) that RTL cannot express. The two layers do not overlap.

# task-detail.html — Page-Scoped Specs

Task detail page (admin/leader view). Settings-tab components come from the shared task-config engine and are specced in `task-new.md`; annotation-result chips (`result-tag-*`, `ar-va-chip-*`, `ar-classif-chip`, `md-chip`) are specced in MASTER Dark Rules 7–8.

## Round Timeline (dry-run round history)

- **Item**: grid `118px minmax(0, 1fr) auto`, `gap: 14px`, `padding: 14px`, `var(--radius-md)` card on `var(--color-white)` with `var(--color-border)`.
- **Dot**: 18px circle, `border: 3px solid var(--color-white)`, built from semantic families so dark mode flips automatically:
  - default (in progress): `background: var(--color-primary)`, ring `0 0 0 2px rgba(99,102,241,0.16)`
  - `.failed`: `background: var(--color-error)`, ring `rgba(185,28,28,0.12)`
  - `.passed`: `background: var(--color-success)`, ring `rgba(21,128,61,0.14)`
- **Metric chip** (`round-metric-chip`): `padding: 4px 8px`, `border-radius: 999px`, `var(--color-white)` on `var(--color-border)`, `12px/600` in `var(--color-text-soft)`.

## Round Status Badge

Pill: `padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid transparent;`

| State | Text | Background | Border |
|-------|------|-----------|--------|
| `.failed` | `var(--color-error)` | `var(--color-error-bg)` | `var(--color-error-border)` |
| `.passed` | `var(--color-success)` | `var(--color-success-bg)` | `var(--color-success-border)` |
| `.in-progress` | `var(--color-primary)` | `var(--color-primary-soft-bg)` | `var(--color-primary-border)` |

Semantic token families only — no dark-mode overrides exist or are needed.

## Known deviation (follow-up)

The page ships a legacy run-badge alias pair used by the work-log stage column (`getWorkLogStageBadgeClass`):

```css
.badge-run-dry { color: var(--color-ink-muted); background: var(--color-slate-50); border-color: var(--color-border); }
.badge-run-official { color: var(--color-primary); background: var(--color-primary-soft-bg); border-color: var(--color-info-border); }
```

Both the names and the values drift from MASTER's canonical Run Mode Badge table (`badge-official` violet / `badge-dry-run` gray). Not covered by a #183 audit finding, so left as shipped by the task-management fix PRs; flagged for a follow-up rename + value alignment.

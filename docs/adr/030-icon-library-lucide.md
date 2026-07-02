# ADR-030: Icon Library — Lucide

**Status**: Accepted
**Date**: 2026-07-02

## Context

ADR-016 selected shadcn/ui as the frontend component library but did not specify an icon library. Design documents (`design/system/MASTER.md`) previously listed "Heroicons / Lucide" interchangeably, leaving the actual icon set ambiguous — an agent or developer reading different documents could reach different conclusions, producing visually inconsistent UI.

The project needs a single icon source because:

- The design system mandates one consistent icon set (pre-delivery checklist item).
- Prototype assets at `design/prototype/assets/icons/` already contain 28 Lucide-style SVGs (24×24, 2px stroke, `currentColor`), and the `label-suite-design` skill mandates Lucide for all prototypes and brand artifacts.
- Mixing icon sets with different stroke weights and corner radii breaks the Flat Design visual grammar.

### Candidates Evaluated

#### Option A — Lucide (selected)

Community fork of Feather Icons. 1,500+ icons, consistent 24×24 / 2px stroke grammar, `lucide-react` package with per-icon ESM exports (fully tree-shakeable). It is the default icon dependency of shadcn/ui — generated shadcn components already import from `lucide-react`. ISC license.

#### Option B — Heroicons

By the Tailwind team; good quality but a smaller set (~300 icons) and two visual variants (outline/solid) that invite inconsistent usage. Choosing it would also mean rewriting the icon imports shadcn/ui components ship with.

#### Option C — react-icons

Aggregator of many icon sets in one package. Explicitly enables mixing visual grammars — the exact problem this decision removes. Weaker tree-shaking story.

#### Option D — Font Awesome / Material Symbols

Distinct visual identities (filled, heavier grammar) that clash with the Feather-derived flat style already used in prototypes; Font Awesome's full set requires a paid tier.

## Decision

Use **Lucide** (<https://lucide.dev/>) as the **sole** icon library.

- Frontend imports icons only from the `lucide-react` package (installed via `pnpm add lucide-react` when the frontend is scaffolded).
- No other icon library may be added (Heroicons, react-icons, Font Awesome, Material Symbols, etc.).
- Emojis and hand-drawn inline SVGs are never used as icons — never invent a glyph that does not exist in Lucide; if Lucide lacks a needed icon, surface it rather than drawing one. Prototype HTML necessarily embeds icons as inline SVG markup (no npm at the design layer); that is allowed when each glyph reproduces an actual Lucide icon, per the `label-suite-design` skill.
- Prototype UI glyphs (`design/prototype/assets/icons/` and inline equivalents) continue to follow the Lucide visual grammar: 24×24 viewBox, 2px stroke, `currentColor`. Brand/logo marks (colored logos, banners, the Google SSO "G") are outside this rule — see Consequences.

## Consequences

### Easier

- Zero-friction alignment with shadcn/ui (ADR-016) — its components already depend on `lucide-react`.
- Single visual grammar across prototypes (`design/prototype/assets/icons/`) and production React code.
- Per-icon ESM imports keep the bundle minimal (only icons actually used are shipped).
- Reviews can mechanically reject any non-`lucide-react` icon import.

### Harder

- Icons missing from Lucide cannot be substituted from another set; the gap must be surfaced and resolved (e.g. request upstream or pick the closest Lucide icon).
- Brand/logo marks (e.g. third-party service logos) are out of Lucide's scope and need a separate decision if ever required.

### Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| Heroicons | Smaller set; outline/solid duality invites inconsistency; diverges from shadcn/ui default |
| react-icons | Encourages mixing icon grammars; weaker tree-shaking |
| Font Awesome / Material Symbols | Visual grammar clashes with Feather-derived flat style; licensing/weight concerns |

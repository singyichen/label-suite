# Pencil Wireframe Convention

Draw wireframes for Label Suite pages using the Pencil MCP tool.

## File Location

Each page wireframe is a separate `.pen` file:
```
design/wireframes/pages/[module]/[page-name].pen
```
Examples: `account/login.pen`, `task-management/task-new.pen`

Module names mirror `frontend/src/features/`:
`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `annotator-management` · `admin`

> `design/wireframes/index.pen` is for overview only — never place page frames inside it.

## Frame Layout (per Page)

There are three structural levels in every wireframe:

- **`.pen` file** — one file per route (e.g. `dashboard.pen` for `/dashboard`)
- **Page** — one Page per screen state within a `.pen` file (e.g. `SA-2 SuperAdmin 有資料`). The full Page list for each route is defined in the spec's `### Wireframe 畫面總覽` section.
- **Frame** — the layout elements drawn inside each Page, arranged as described below.

Each Page contains **3 frames** (Traditional Chinese only):

| Frame | x | y | Purpose |
|---|---|---|---|
| Desktop | `0` | `0` | Full page — desktop viewport |
| Mobile | `0` | `1000` | Full page — mobile viewport |
| Component | `0` | `1900` | Page-specific UI components |

**Draw order**: Desktop → Mobile → Component

> **EN localization is handled at the prototype stage**, not during wireframing. When building `design/prototype/pages/[module]/[page].html`, apply i18n keys from `frontend/src/locales/`. If a component is text-length-sensitive (e.g. narrow buttons, table columns), add an annotation in the Component frame noting potential EN overflow — no separate EN frame is required.

## Component Placement Rule

| Where | What goes here |
|---|---|
| `design/wireframes/design-system.pen` | Components used across multiple pages (Button states, Input, Toast, Navbar, etc.) |
| Page `.pen` Component frame (`x:6000+`) | Components unique to this page only |

> Rule of thumb: if the component could appear on any other page → `design-system.pen`.

## Mobile RWD Requirements

Mobile frames must implement **genuine RWD** — do NOT shrink the desktop layout.

| Desktop pattern | Mobile replacement |
|---|---|
| Sidebar navigation (`width: 224`) | Remove sidebar; use **bottom tab bar** (`height: 56`, `justifyContent: space_around`) |
| Large navbar padding (e.g. `padding: [0, 80]`) | Reduce to `padding: [0, 16]` |
| Multi-column layout | Collapse to single-column `fill_container` |
| Large card padding (e.g. `32`) | Reduce to `16` |
| Inline action buttons in wide rows | Stack vertically: metadata text above, full-width button (`width: fill_container`) below |

### Mobile canvas size: 390 × auto (iPhone 14 viewport)

1. Use `height: "fit_content(900)"` during drawing
2. After completion, run `snapshot_layout` on the Mobile frame
3. Set the frame to the snapshotted fixed height: `U("frameId", {height: N})`

After drawing, take a screenshot and verify: no element overflows, no sidebar visible, all text readable.

## Using the Design System

Before drawing any page, **always inspect `design-system.pen` first** and reuse its components.

### Step 1 — Read available components

Open `design/wireframes/design-system.pen` and call `get_editor_state` to list all reusable components. Current components include: `Button/Primary`, `Button/Secondary`, `Button/Ghost`, `Card/Default`, `Input/Default`, `Input/Focus`, `Modal/Default`.

Also inspect the full design-system frame for non-reusable patterns (Navbar, lang switcher, badges, etc.) via `batch_get`.

### Step 2 — Verify design-system imports are active

Design-system variables (`$color-*`, `$radius-*`, `$space-*`) only resolve if the page file has `design-system.pen` imported.

> ⚠️ **MCP Limitation**: `U(document, {imports:...})` does NOT work via Pencil MCP — it throws "Node 'document' not found!". Imports must be pre-configured by **copying from a file that already has them set** (see "Creating a New Wireframe File" below).

To check if the active file has design-system imports, call `get_variables` — if it returns the design-system token list, imports are active and you can use `$color-*` variables and `ref` components directly.

### Step 3 — Use `ref` to place design system components

When imports are active:

```javascript
// Use a design-system component by its ID
btn=I(card, { type:"ref", ref:"uKTJI" })          // Button/Primary
input=I(form, { type:"ref", ref:"UpTvQ" })         // Input/Default
card=I(main, { type:"ref", ref:"yziNu" })          // Card/Default
```

Override only the properties you need to change (text content, size, fill):
```javascript
U(btn+"/label", { content:"登入" })      // wireframes use Traditional Chinese only; EN localization is handled at prototype stage
```

### Step 4 — Fallback: use hardcoded token values if imports unavailable

If a file does NOT have design-system imports (e.g. copied from blank template), use these hardcoded values — they are the exact resolved values of design-system tokens:

| Token | Value | Usage |
|---|---|---|
| `$color-background` / `$color-surface` | `#F5F3FF` | Page background, card bg |
| `$color-white` | `#FFFFFF` | Navbar, card fill, input fill |
| `$color-text` | `#1E1B4B` | Primary text, labels |
| `$color-text-muted` | `#94A3B8` | Subtitles, placeholders, icons |
| `$color-ink` | `#1E1B4B` | Logo text |
| `$color-primary` | `#6366F1` | Links, active states |
| `$color-cta` | `#10B981` | Submit / call-to-action buttons |
| `$color-border` | `#E2E8F0` | Input stroke, card stroke, navbar stroke |
| `$radius-md` | `8` | Inputs, buttons |
| `$radius-lg` | `12` | Cards |
| `$space-sm` | `8` | Icon-text gap in lang switcher |

> **Design consistency rule**: All colors used in wireframes MUST match the token values above. Never use Tailwind slate / blue colors (`#0F172A`, `#1E40AF`, etc.) — they conflict with the design system.

### Step 5 — Page-specific components only in Component frame

If a UI pattern is **not** in design-system.pen and won't be reused elsewhere, build it in the page's Component frame. If it will appear on multiple pages, add it to design-system.pen first.

---

## Creating a New Wireframe File

**Always create the file at the correct path BEFORE opening it in Pencil.**

### Option A — Copy an existing page wireframe (REQUIRED when design-system variables are needed)

Copying an existing file **preserves its `imports` configuration**, which is the only way to enable `$color-*` variable resolution via MCP. Always prefer this option.

```bash
cp design/wireframes/pages/[module]/[existing-page].pen \
   design/wireframes/pages/[module]/[new-page].pen
```

**Which file to copy from:**

| Module | Copy from |
|---|---|
| `account` | `pages/account/login.pen` |
| `dashboard` | any existing `pages/dashboard/*.pen` |
| other modules | any existing `.pen` in the same module |

Then call `open_document` on the new file and overwrite all content with the new page's design.

### Option B — Copy the blank template (design-system variables NOT available)

Only use this when no existing file exists in any module. After creating the file, design-system variables will NOT work until you manually open the file in the Pencil desktop app and configure the import.

```bash
# Step 1 — locate the blank template (works on any machine)
TEMPLATE=$(find "$HOME" -name "pencil-new.pen" -path "*/highagency.pencil*" 2>/dev/null | head -1)

# Step 2 — copy it to the correct destination
TARGET="design/wireframes/pages/[module]/[page].pen"
cp "$TEMPLATE" "$TARGET"
```

After drawing, open the file in Pencil desktop app → set `imports` to `../../design-system.pen` → then run `replace_all_matching_properties` to update hardcoded colors to proper variable references.

> **Never** start drawing in `pencil-new.pen` with the intention of copying afterwards — the copy may happen before Pencil flushes to disk, causing data loss.

## Committing `.pen` Files

Pencil stores design changes in memory and flushes to disk asynchronously. **Always force a flush before committing.**

### Step 1 — Force flush by re-opening the file

After all `batch_design` work is done, call `open_document` with the same file path.
The call will likely time out — that is expected and fine. The timeout itself triggers Pencil to flush the in-memory state to disk:

```javascript
open_document("X:/mandy/label-suite/design/wireframes/pages/[module]/[page].pen")
// → MCP timeout error is OK — flush has occurred
```

### Step 2 — Verify and commit

```bash
git diff design/wireframes/pages/[module]/[page].pen
# Should show your changes. If empty, wait a moment and retry open_document.

git add design/wireframes/pages/[module]/[page].pen
git commit -m "..."
```

> Never commit a `.pen` file that `git diff` shows as unchanged — the on-disk version may be a stale snapshot.

## Key Rules

- `.pen` files are encrypted — **only operate via Pencil MCP tools**; never use `Read` / `Edit` / `Grep` on them
- Always draw Desktop before Mobile
- EN localization is handled at the prototype stage — do not draw EN frames in wireframes

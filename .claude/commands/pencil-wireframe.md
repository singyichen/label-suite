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

## 6-Frame Layout (per `.pen` file)

Frames are arranged in **3 rows** (device tier) × **2 columns** (ZH / EN), so each tier is visually grouped for easy review:

| Frame | x | y | Purpose |
|---|---|---|---|
| Desktop ZH | `0` | `0` | Full page — Traditional Chinese, desktop |
| Desktop EN | `1500` | `0` | Full page — English, desktop |
| Mobile ZH | `0` | `1000` | Full page — Traditional Chinese, mobile |
| Mobile EN | `500` | `1000` | Full page — English, mobile |
| Component ZH | `0` | `1900` | Page-specific UI components — ZH |
| Component EN | `900` | `1900` | Page-specific UI components — EN |

**Draw order**: Desktop ZH → Desktop EN → Mobile ZH → Mobile EN → Component ZH → Component EN

Keep structure symmetric between ZH and EN frames at each device tier.

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
2. After completion, run `snapshot_layout` on both ZH and EN mobile frames
3. Set both to the same fixed height (use the larger value): `U("frameId", {height: N})`
4. ZH and EN mobile frames **must have identical `width × height`**

After drawing, take a screenshot and verify: no element overflows, no sidebar visible, all text readable.

## Using the Design System

Before drawing any page, **always inspect `design-system.pen` first** and reuse its components.

### Step 1 — Read available components

Open `design/wireframes/design-system.pen` and call `get_editor_state` to list all reusable components. Current components include: `Button/Primary`, `Button/Secondary`, `Button/Ghost`, `Card/Default`, `Input/Default`, `Input/Focus`, `Modal/Default`.

### Step 2 — Import design-system.pen in the page file

Add an `imports` entry to the document so you can reference its components via `ref`:

```javascript
// In batch_design, set imports at document level
U(document, {
  imports: { "ds": "../../design-system.pen" }
})
```

The relative path is from the page file to design-system.pen. Example for `pages/account/login.pen`:
`../../design-system.pen`

### Step 3 — Use `ref` to place design system components

```javascript
// Use a design-system component by its ID
btn=I(card, { type:"ref", ref:"uKTJI" })          // Button/Primary
input=I(form, { type:"ref", ref:"UpTvQ" })         // Input/Default
card=I(main, { type:"ref", ref:"yziNu" })          // Card/Default
```

Override only the properties you need to change (text content, size, fill):
```javascript
U(btn+"/label", { content:"登入" })
```

### Step 4 — Page-specific components only in Component frame

If a UI pattern is **not** in design-system.pen and won't be reused elsewhere, build it in the page's Component frame (`x:6000+`). If it will appear on multiple pages, add it to design-system.pen first.

---

## Creating a New Wireframe File

**Always create the file at the correct path BEFORE opening it in Pencil.**

```bash
# Step 1 — locate the blank template (works on any machine)
TEMPLATE=$(find "$HOME" -name "pencil-new.pen" -path "*/highagency.pencil*" 2>/dev/null | head -1)

# Step 2 — copy it to the correct destination
TARGET="design/wireframes/pages/[module]/[page].pen"
cp "$TEMPLATE" "$TARGET"
```

Then call `open_document` with the full absolute path to `$TARGET` and begin designing.

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
- Always draw ZH frame first, then copy/adapt for EN
- Always draw Desktop before Mobile

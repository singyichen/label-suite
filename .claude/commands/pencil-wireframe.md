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

| Frame | x offset | Purpose |
|---|---|---|
| Desktop ZH | `x:0` | Full page — Traditional Chinese, desktop |
| Desktop EN | `x:1500` | Full page — English, desktop |
| Mobile ZH | `x:3000` | Full page — Traditional Chinese, mobile |
| Mobile EN | `x:4500` | Full page — English, mobile |
| Component ZH | `x:6000` | Page-specific UI components — ZH |
| Component EN | `x:7500` | Page-specific UI components — EN |

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

## Key Rules

- `.pen` files are encrypted — **only operate via Pencil MCP tools**; never use `Read` / `Edit` / `Grep` on them
- Always draw ZH frame first, then copy/adapt for EN
- Always draw Desktop before Mobile

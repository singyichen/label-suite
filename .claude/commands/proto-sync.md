---
description: Sync prototype HTML changes to corresponding spec.md — reads full prototype, compares with spec UI-related sections, updates spec to reflect functional changes while filtering out demo-specific content.
---

# Proto-Sync: Prototype → Spec Synchronization

After modifying prototype HTML files, this skill reads the full prototype and updates the corresponding spec's UI-related sections to stay consistent.

## User Input

```text
$ARGUMENTS
```

## Step 1 — Detect Modified Prototypes

Run `git diff --name-only HEAD` and `git diff --name-only --cached` and `git status --short` to find modified prototype files under `design/prototype/pages/`.

Include both staged and unstaged changes. Also include untracked new prototype files.

If `$ARGUMENTS` specifies a particular page (e.g., `task-new`), scope to that page only.

If no modified prototype files found, inform user and stop.

## Step 2 — Map Prototype → Spec

For each modified prototype file, derive the corresponding spec(s) using this priority order:

**2a. Exact-path search (primary).** Grep every `specs/**/spec.md` for the modified file's repo-relative path (e.g. `design/prototype/pages/account/login.html`) inside that spec's `## Prototype Traceability` table. A prototype file may legitimately map to **more than one spec** — collect every match, don't stop at the first:
- `design/prototype/pages/account/login.html` → both `001-login-email-password` (owns the Email/Password shell) and `002-login-google-sso` (owns the Google entry point) list this exact path
- `design/prototype/pages/account/forgot-password.html` and `reset-password.html` → both map to `004-forgot-reset-password` (multi-page single spec)
- `design/prototype/pages/account/profile.html` → `005-profile-settings`
- `design/prototype/pages/annotation/annotation-list.html` and `annotation-workspace.html` → both map to `015-annotation-workspace` (multi-page single spec)
- `design/prototype/pages/shared/sidebar.js` / `sidebar.css` → `008-sidebar-navbar-shared`, but this file is referenced by every module's shell page as a *shared component*, not owned by any of them — do not also attach findings to the consuming page's own spec unless the change is specific to that page's usage

**2b. Folder-suffix fallback.** If 2a finds no match (the spec predates its Prototype Traceability table, or the file is new), fall back to the legacy heuristic: scan `specs/[module]/` for the directory whose name ends with `-[page]` (the NNN prefix varies per feature).
```
design/prototype/pages/[module]/[page].html
  → specs/[module]/NNN-[page]/spec.md
```
Example: `task-management/task-new.html` → scan `specs/task-management/` → find `013-task-new/` → target is `specs/task-management/013-task-new/spec.md`.

**2c. No match found.** If neither 2a nor 2b resolves a spec, **stop and report the file to the user explicitly** — list it under a "無法映射" heading with the path searched. Never silently skip an unmapped file; an unreported skip looks identical to "nothing needed updating," which is the failure mode this step exists to prevent.

**Panel/partial files:** If the modified file is under `[page].panels/` or `[page].partials/`, map it to the parent page's spec (same resolution order: check if the specific partial path is listed in a Prototype Traceability table first, then fall back to the parent page's mapping).

## Step 3 — Read Full Sources

For each prototype-spec pair, read:
1. The **full prototype HTML file** (all lines)
2. The **full spec.md file** (all lines)
3. Any related **panel/partial HTML files** under `[page].panels/` or `[page].partials/` directories

## Step 4 — Extract Functional UI Information from Prototype

Analyze the prototype HTML and extract **functional UI information only**.

### EXTRACT (functional — goes into spec):

- **Component structure**: What UI elements exist and their hierarchy (cards, forms, modals, indicators, upload zones, previews, etc.)
- **Interactive behaviors**: Click handlers, navigation (e.g., step indicator clickable to jump), toggles, drag-drop, expand/collapse
- **Layout patterns**: Grid vs. single column, split panels, responsive breakpoint behaviors
- **Form elements**: Input types, validation rules, required/optional markers, character counters
- **State transitions**: Active/disabled/error/loading/empty/done states, when they trigger
- **Navigation flows**: Step transitions, which actions lead where, back/forward/cancel behavior
- **Conditional visibility**: Elements that show/hide based on state (e.g., cascade chip filtering)
- **Accessibility**: ARIA roles, semantic elements, keyboard navigation
- **Component interaction rules**: Which actions enable/disable other elements (e.g., "下一步 disabled until all required fields valid")

### IGNORE (demo-specific — do NOT put in spec):

- Hardcoded example text values (e.g., `例：新聞標題情感分類`, specific label names like `正面/負面`)
- Sample data in preview tables or lists
- Exact CSS values (pixels, colors, shadows, transitions) — these belong to the design system, not spec
- JavaScript variable names, function implementations, event handler internals
- CDN links, font imports, `<meta>` tags, `<script>` boilerplate
- CSS class names

## Step 5 — Compare with Spec & Identify Gaps

Compare the extracted functional information against ALL UI-related sections in the spec:

1. **介面定義** blocks within each 使用者故事
2. **行為規則** blocks within each 使用者故事
3. **Prototype 互動規格** sections
4. **功能需求 (FR-xxx)** entries that reference UI elements, interactions, or layout
5. **邊界情況** entries that involve UI presentation or user interaction

Categorize each finding:

| Category | Meaning | Action |
|----------|---------|--------|
| **NEW** | Prototype has functional behavior not described in spec | Add to spec |
| **CHANGED** | Prototype behavior differs from spec description | Update spec |
| **REMOVED** | Spec describes UI that no longer exists in prototype | Flag for user review |

Present a summary table of all findings BEFORE making any edits. Example:

```
| # | Category | Section | Description |
|---|----------|---------|-------------|
| 1 | NEW      | 介面定義 Step 1 | Step indicator 圈圈可點擊跳轉至已完成步驟 |
| 2 | CHANGED  | 行為規則 | 取消按鈕行為從導回 task-list 改為顯示確認視窗 |
| 3 | REMOVED  | FR-008  | Mobile 下 Step 2 不再使用 tab 切換 |
```

Ask user to confirm before proceeding to edits. User may remove items from the list.

## Step 6 — Update Spec

For each confirmed finding, update the spec:

### Writing rules:

- **Match spec's existing writing style** — use the same terminology, sentence structure, and level of detail as surrounding content
- **Describe user-observable behavior**, not implementation — write "使用者可點擊步驟圈圈跳轉至該步驟" not "step circle has onclick handler"
- **Reference spec constants** where applicable (e.g., `TASK_CREATION_STEPS`, `MOBILE_BP`)
- **Use Traditional Chinese** for all spec content (matching existing spec language)
- **For NEW items**: Insert at the most logical position within the relevant section; don't append randomly
- **For CHANGED items**: Edit in-place, preserving surrounding context
- **For REMOVED items**: Add `（已從 prototype 移除，待確認是否從 spec 移除）` annotation — never silently delete

### Section-specific guidance:

- **介面定義**: List UI elements with bullet points, describe what the user sees and can interact with
- **行為規則**: Describe conditional behaviors using "When X, Then Y" or "若...則..." patterns
- **Prototype 互動規格**: Describe the specific interaction — button states, validation triggers, enabled/disabled conditions
- **FR entries**: Keep the `FR-NNN` numbering scheme; new FR items get the next available number
- **邊界情況**: Describe what happens in edge/error scenarios

## Step 7 — Version Bump & Changelog

1. **Bump the patch version** in spec frontmatter (e.g., `2.3.0` → `2.3.1`)
2. **Add a changelog entry** at the bottom of the spec (or in the existing changelog section):

```markdown
### Changelog

- **v2.3.1** (YYYY-MM-DD)：prototype sync — <one-line summary of changes>
```

## Step 8 — Report

Output a final summary:

```
## Proto-Sync 完成

**Prototype**: design/prototype/pages/task-management/task-new.html
**Spec**: specs/task-management/013-task-new/spec.md
**Version**: 2.3.0 → 2.3.1

### 變更摘要
- ✅ NEW: <count> items added
- ✏️ CHANGED: <count> items updated
- ⚠️ REMOVED: <count> items flagged for review

### 詳細變更
1. ...
2. ...
```

## Constraints

- **Never modify non-UI sections** (流程圖, 規格相依性, 成功標準, 規格常數, 關鍵實體) unless a UI change directly requires it (e.g., a new entity type appears in the UI)
- **Never auto-delete spec content** — REMOVED items must be flagged, not deleted
- **Never add demo data to spec** — no hardcoded example values, sample text, or mock data
- **Never introduce implementation language** — no CSS class names, JS function names, or HTML tag specifics in spec
- **Preserve FR numbering** — when adding new FR items, find the next unused number in sequence
- **One prototype = one spec update** — if multiple prototypes changed, process each pair independently and update each spec separately

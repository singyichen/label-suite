---
description: Export a feature spec.md into a stakeholder-readable PRD view (HTML Artifact) — read-only rendering for professor/external review; spec.md stays the single source of truth.
---

# PRD Export: Spec → Stakeholder-Readable PRD View

Render an existing `spec.md` into a "construction blueprint"-grade PRD page for external readers (e.g., thesis advisor). This is a **read-only export view**: it never adds, rewrites, or reinterprets requirements. If the spec and the export ever disagree, the spec wins.

## User Input

```text
$ARGUMENTS
```

## Hard Rules

1. **Spec is the single source of truth.** Never write content back to `spec.md`, and never invent content missing from it. A section the spec does not define is rendered as `規格未定義` — flagged, not fabricated.
2. **Source-Verify gate.** Every number, threshold, and quoted rule in the export must be locatable via `grep -i <term>` in the source spec/plan. If not found, remove it.
3. **Language.** The exported PRD body is Traditional Chinese (audience: professor). File paths, identifiers, config keys, and API routes stay in English.
4. **No pipeline side effects.** This command does not change spec status, versions, or `specs/STATUS.md`.

## Step 1 — Resolve the Spec

`$ARGUMENTS` may be a spec path (`specs/task-management/013-task-new/spec.md`), a feature directory, or a `[module]/[feature]` shorthand.

- Shorthand: scan `specs/[module]/` for the directory ending in `-[feature]`.
- Not found in active specs → also scan `specs/_archive/` (merged features live there) and note "archived" in the export header.
- Still not found, or `$ARGUMENTS` empty and no unambiguous candidate → list available specs and ask the user; do not guess.

## Step 2 — Read Sources

- Read the full `spec.md`. Extract frontmatter `版本` and `狀態` — both appear in the export header.
- If `plan.md` exists in the same directory, read only its `技術脈絡` section for the 技術複雜度 (low/mid/high) label. No other plan content belongs in a PRD.

## Step 3 — Map Spec Sections → PRD Sections

| PRD section (rendered order) | Source | Notes |
|---|---|---|
| 產品概述與目標 | spec §功能目標 | plus 需求來源 line |
| 功能規格 | spec §功能需求 + §使用者情境與測試 | group FR-* under their user story; each block ends with its AC table |
| 驗收標準（AC） | spec 驗收情境 + §邊界情況 | Given/When/Then table with an Edge Case column; keep FR/SC/AC-N.N IDs for traceability |
| 畫面規格 | spec §畫面狀態規格 + §使用者流程與導頁 | six-state table per screen; missing section → `規格未定義` flag |
| 範圍外（Out of Scope） | spec §範圍外 | include 分期邊界 table when present |
| 路線圖與複雜度 | spec §範圍外 分期邊界 + plan 技術複雜度 | complexity level only — never man-day numbers, even if asked |
| 成功指標 | spec §成功標準 | keep SC-* IDs |

Skip spec-internal machinery (輸入與生成規則, 審查與驗收清單, 執行狀態, Changelog, 規格相依性) — those are pipeline artifacts, not PRD content. Tables are preferred over prose everywhere.

## Step 4 — Build and Publish the Artifact

1. Load the `artifact-design` skill, then build the page in the **session scratchpad** (never inside the repo) as an Artifact-ready fragment: no `<!DOCTYPE>`/`<html>`/`<head>`/`<body>` wrapper, inline `<title>` and `<style>`, light/dark theme via CSS custom properties (same token pattern as pr-flow Step 7).
2. **Header block (mandatory):** feature name · module · `本文件由 spec.md v<版本> 產生（<狀態>）· 以 spec 為準` · generation date. This line is what keeps the export honest — never omit it.
3. Style: design-doc look — white background, dark-gray text, one accent color, monospace only for paths/identifiers, generous whitespace.
4. Publish with the Artifact tool (favicon suggestion: 📋) and give the user the URL. On revision requests, edit the same file and republish — same path keeps the same URL.

## Step 5 — Report

Output: artifact URL · source spec path + version rendered · any `規格未定義` flags (these are candidate gaps to fix in the spec via the normal SDD pipeline, not in the export).

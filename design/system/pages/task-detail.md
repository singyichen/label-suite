# task-detail.html — Page-Scoped Specs

Task detail page (admin/leader view), six tabs: 概覽 · 設定 · 成員管理 · 標記進度 · 標記結果 · 工時紀錄 (FR-003). Settings-tab components come from the shared task-config engine and are specced in `task-new.md`; annotation-result chips (`result-tag-*`, `ar-va-chip-*`, `ar-classif-chip`, `md-chip`) are specced in MASTER Dark Rules 7–8. Flat design throughout: no shadows on any surface below.

## Task Header (FR-028)

Shared by all six tabs, above the tab bar (`.task-header`, `margin-bottom: var(--space-lg)`). Contains no CTA.

- **H1** (`.page-main-title`): task name, `var(--font-serif-display)`, `28px / 1.3 / 700`, `var(--color-ink)`, `margin: 0 0 4px`.
- **Status text** (`.task-header-status`): plain text at the H1's right on the same baseline row (`.task-header-row`: flex, `align-items: baseline`, `gap: var(--space-md)`, wraps), `13px`, `var(--color-text-soft)`. No pill, badge or background. It is the only stage text on the page (SC-019).
- **Breadcrumb** (`.breadcrumb`): below the H1 row, `任務管理 / {task_id}`, `13px`, `var(--color-text-soft)`, `gap: 6px`, `margin-bottom: 12px`; the root link uses `var(--color-primary)` (underline on hover); separator `/` uses `var(--color-ink-muted)` at `11px`.

## Tab Bar (FR-003)

Six-tab bar `.admin-tabs` (`role="tablist"`, arrow keys move between tabs): this is MASTER's Desktop Content Tabs pattern, unchanged — container `border-bottom: 2px solid var(--color-border)`, `margin-bottom: var(--space-lg)`; tab `padding: 10px 20px`, `14px/500`, `var(--color-text-soft)`; hover and active use `var(--color-primary)`, active adds a `2px var(--color-primary)` underline and `600` weight. Below 768px the bar scrolls horizontally (`overflow-x: auto`). `成員管理` is hidden for `reviewer` (FR-006).

## Settings Tab (FR-026)

- **Layout** (`.settings-layout`): grid `140px minmax(0, 1fr)`, `gap: 28px`. Left: plain-text section nav (`#settingsSectionNav`, `role="tablist"`, vertical, arrow keys); right: one visible section at a time.
- **Nav item** (`.settings-nav-item`): `padding: var(--space-sm) var(--space-md)`, `border-radius: 4px`, no border, transparent, `14px`, centered, `var(--color-ink-muted)`. Active (`aria-selected="true"`): `background: var(--color-white)`, `var(--color-ink)`, `600`.
- **Section card** (`.settings-section.panel`): `var(--color-white)` fill, `1px solid var(--color-border)`, `var(--radius-lg)`, `box-shadow: none`. View and edit states look the same. No pills, colored callouts, eyebrow labels, emoji or shadow.
- **Section header**: title `16px/600`; 「編輯」 is a text link (no border/background, `var(--color-primary)`, underline on hover).
- **Definition list** (`.kv-dl`): columns `160px minmax(0, 1fr)`; each key and value row has a `1px solid var(--color-border-muted)` bottom divider. The fixed label of the config-file row is 「設定檔」 (was 「設定檔版本」).
- **<768px**: `.settings-layout` collapses to one column (`gap: var(--space-md)`); the nav becomes a top horizontal row (`flex-direction: row`, `overflow-x: auto`, items `flex: 0 0 auto; white-space: nowrap`); the page must not overflow horizontally.

### Code mode (標記設定)

- The Code panel's button is labelled 「套用」 (`#saveCodeBtn`, `btn btn-secondary`, right-aligned in `.code-actions`). It only applies Code to Visual (Code→Visual) and never submits.
- Live validation: on a parse/schema error `#codeErrorBar` (`.code-error-bar`, `12px`, `var(--color-error)` text, `var(--radius-md)`) is shown and 「套用」 is disabled; fixing the content hides the bar and re-enables it.
- After a successful apply, a toast reads 「已套用至 Visual，請按儲存送出」.
- The only submit is the section header's 「儲存」; with unapplied Code edits it is blocked and shows the 「請先套用」 hint in `#settingsEditError`.

## Overview Tab (FR-027)

Original card look restored (2026-10-08 ruling). One white `.panel` card titled 「任務狀態與執行控制」, top to bottom:

1. **Stepper** (illustration only, `aria-hidden`, SC-019): `.status-stepper` of 22px dot nodes (`border: 2px solid var(--color-border)`, `var(--color-white)`) joined by 2px `.step-connector` lines (`var(--color-border)`); done = `var(--color-primary)` fill/connector; current = `var(--color-primary-soft-bg)` fill with a `4px var(--color-primary-soft-bg)` halo and bold `var(--color-primary)` label (`11px`). No status badge.
2. **Verdict box** (`.exec-stage-banner`): flat token fill — `var(--color-primary-soft-bg)` with `1px solid var(--color-primary-border)`, `var(--radius-lg)`, `padding: 14px 16px`; title `18px` `var(--color-ink)`, description `13px` `var(--color-text-soft)`.
3. **Number cards** (`.exec-round-grid`, auto-fit `minmax(140px, 1fr)`, `gap: 10px`): four cards 目前回合 / 最新 IAA / 已用試標 / 正式標記池; `var(--color-slate-50)` fill, `1px solid var(--color-border)`, `var(--radius-md)`; label `12px` `var(--color-text-soft)`, value `20px` `var(--color-ink)` with `tabular-nums`.
4. **Sample split**: `.split-bar` with `.split-legend-item` chips (dot + key + value, `13px`); colors per FR-010p.
5. **Criteria row** (`.exec-stop-row`): `.stop-pill` criteria pills on the left (`999px`, `12px/600`, `1px var(--color-border)` on `var(--color-white)`; `.passed` uses `--color-success` / `-bg` / `-border`; `.not-computable` uses `--color-warning` / `-bg` / `-border`); the primary CTA (`#publishActionRow`) sits on the right (`.exec-stop-actions`, `justify-content: flex-end`; the row wraps on narrow widths). The CTA uses the global `btn-primary` (`var(--color-cta)` fill, `var(--color-on-cta)` text); with several actions in a state only one is primary, the others are secondary.
6. **Round history table** (`.round-history-panel`: `var(--color-white)`, `1px var(--color-border)`, `var(--radius-lg)`, `padding: 16px`): `.round-table`, `13px`, `tabular-nums`, columns 回合 / 筆數 / 標記者 / IAA / Std / 結果 / 完成時間; header `12px/600` `var(--color-text-soft)`, rows divided by `1px solid var(--color-border)`. Result is colored text only (`.round-status-badge`, `700`): `.passed` `var(--color-success)`, `.failed` `var(--color-error)`, `.in-progress` `var(--color-primary)`. No pill, background or border; semantic tokens flip automatically in dark mode.

## Known deviation (follow-up)

The page ships a legacy run-badge alias pair used by the work-log stage column (`getWorkLogStageBadgeClass`):

```css
.badge-run-dry { color: var(--color-ink-muted); background: var(--color-slate-50); border-color: var(--color-border); }
.badge-run-official { color: var(--color-primary); background: var(--color-primary-soft-bg); border-color: var(--color-info-border); }
```

Both the names and the values drift from MASTER's canonical Run Mode Badge table (`badge-official` violet / `badge-dry-run` gray). Not covered by a #183 audit finding, so left as shipped by the task-management fix PRs; flagged for a follow-up rename + value alignment.

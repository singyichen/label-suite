# UX Conventions

> **Purpose:** Cross-feature behavioral patterns that every page must follow.
> MASTER.md defines how things *look*; this file defines how things *behave*.
> Individual specs reference these conventions by ID (e.g. UXC-01) instead of re-describing the same rules.

**Updated:** 2026-07-10

---

## Contents

**State** — [Create vs Edit Initialization](#uxc-01-create-vs-edit-initialization) · [Wizard State Persistence](#uxc-02-wizard-state-persistence) · [Unsaved Changes Protection](#uxc-03-unsaved-changes-protection)

**Forms** — [Validation Timing](#uxc-04-validation-timing) · [Error Presentation](#uxc-05-error-presentation) · [Submit Behavior](#uxc-06-submit-behavior)

**Feedback** — [Toast Duration](#uxc-07-toast-duration) · [Loading States](#uxc-08-loading-states) · [Empty States](#uxc-09-empty-states)

**Safety** — [Destructive Action Confirmation](#uxc-10-destructive-action-confirmation) · [Pagination & URL State](#uxc-11-pagination--url-state)

---

## State

### UXC-01: Create vs Edit Initialization

| Mode | Behavior |
|------|----------|
| **Create** (new resource) | Page always opens with a blank/default form. No residual data from prior sessions. |
| **Edit** (existing resource) | Page must load and display all current field values before the user can interact. |

- A "Create" page reached via navigation (not F5 reload) must clear any cached draft state.
- An "Edit" page must not render the form until the source data has loaded; show a loading skeleton until ready.

### UXC-02: Wizard State Persistence

Multi-step wizards (e.g. task-new) follow these rules:

| Trigger | Behavior |
|---------|----------|
| F5 / browser reload | Restore draft from session storage; resume at the same step with all filled data. |
| Fresh navigation (link, button, back/forward) | Clear session storage; start from step 1 with a blank form. |
| Successful submission | Clear session storage. |
| Tab close | Browser clears session storage automatically. |

Detection method: `performance.getEntriesByType('navigation')[0].type` — `reload` restores; `navigate` or `back_forward` clears.

### UXC-03: Unsaved Changes Protection

When `isDirty = true` (any field has been modified from its initial value):

| Trigger | Guard |
|---------|-------|
| In-app navigation (cancel button, sidebar link) | Show custom confirmation modal ("Unsaved changes will be lost"). |
| Browser navigation (F5, close tab, address bar) | Trigger `beforeunload` event (browser-native dialog). |

- The confirmation modal must offer **Stay** and **Leave** options.
- Choosing "Leave" clears draft state before navigating away.
- A freshly loaded form with no edits must NOT trigger any guard.

---

## Forms

### UXC-04: Validation Timing

| Moment | Behavior |
|--------|----------|
| On blur / on change | Validate the individual field; show inline error immediately if invalid. |
| On "Next" / "Submit" click | Validate all required fields; scroll to and focus the first error. |

- Do not validate on page load (no red errors before the user has interacted).
- Clear inline errors as soon as the user corrects the value (on input / on change).

### UXC-05: Error Presentation

All validation errors use a two-layer display:

1. **Inline message** — directly below the offending field, stating the field name and how to fix it.
2. **Toast summary** — at the top of the page, summarizing the count and nature of errors.

- Use semantic state colors: `color-error` text on `color-error-bg` background (see MASTER.md).
- Error messages must be actionable: "Task name is required" not "Invalid input".

### UXC-06: Submit Behavior

| Phase | Behavior |
|-------|----------|
| Click submit | Button enters loading state (spinner + disabled); prevent double submission. |
| Success | Navigate to target page; show success toast. |
| Failure | Keep the user on the current page with all inputs preserved; show error toast with reason. |

- Never clear form data on failure.
- Use idempotency keys for create operations to prevent duplicate resources on retry.

---

## Feedback

### UXC-07: Toast Duration

| Type | Auto-dismiss | User dismiss |
|------|-------------|--------------|
| Success | 3 seconds | Click to dismiss early |
| Info | 5 seconds | Click to dismiss early |
| Warning | 8 seconds | Click to dismiss early |
| Error | No auto-dismiss | Must click to dismiss |

- Only one toast visible at a time; new toast replaces the previous one.
- Toast position: top-center of the page.

### UXC-08: Loading States

| Scenario | Treatment |
|----------|-----------|
| Page initial load | Skeleton placeholder matching the expected layout. |
| Data fetch (table, list) | Skeleton rows or spinner within the content area. |
| Button action (submit, save) | Inline spinner within the button; button disabled. |

- Avoid full-page spinners; show skeleton in the specific region that is loading.
- Prevent layout shift: skeleton dimensions must match the loaded content dimensions.

### UXC-09: Empty States

| Scenario | Treatment |
|----------|-----------|
| No data exists yet (first use) | Friendly message + primary CTA to create the first item. |
| Filter/search returns zero results | "No matching results" message + option to clear filters. |

- Distinguish "no data" from "no matching results" — the user needs to know whether to create or adjust filters.
- Empty state CTA must navigate to the same target as the page's primary creation action.

---

## Safety

### UXC-10: Destructive Action Confirmation

Any action that is irreversible or removes user data requires a confirmation dialog:

| Element | Content |
|---------|---------|
| Title | Name the action ("Delete task", "Remove member") |
| Body | State the consequence ("This action cannot be undone") |
| Primary button | Confirm with the action verb ("Delete", "Remove"), styled as danger (red) |
| Secondary button | "Cancel", styled as neutral |

- Do not use generic "Are you sure?" without specifying what will happen.
- Keyboard: Enter confirms, Escape cancels.

### UXC-11: Pagination & URL State

- Use `limit` / `offset` parameters (not `page` / `page_size`) — per ADR and Foundation Spec convention.
- Sync filter, sort, and pagination state to URL query parameters so that:
  - F5 reload restores the same view.
  - Browser back/forward navigates filter history.
  - The URL is shareable.
- Reset `offset` to `0` when changing filters or sort order.

---

## How to Reference

In feature specs, reference by ID instead of re-describing:

```markdown
- 精靈狀態持久化遵循 UXC-02（Wizard State Persistence）。
- 表單驗證遵循 UXC-04（Validation Timing）與 UXC-05（Error Presentation）。
```

When a feature needs to **deviate** from a convention, the spec must explicitly state the deviation and the reason.

---

## Changelog

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2026-07-10 | Initial version — 11 conventions extracted from existing prototype patterns |

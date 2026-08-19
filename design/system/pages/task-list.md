# task-list.html — Page-Scoped Specs

Task list page. Badges, table, pagination, and modal all follow MASTER — this file only records the page's sanctioned exceptions.

## Local `:root` token block (sanctioned exception)

The page keeps a legacy local `:root` block duplicating `tokens.css` values even though `tokens.css` is linked in `<head>`. All values mirror the canonical tokens (the one divergence, `--z-modal: 500`, was fixed to `300` by the #183 task-management fix PR). Recorded by the audit as a cleanup-only exception: removing the block is deferred because it is inert while the values match, and deleting it touches every rule in the page for zero visual change.

## Badge naming

Run badges use the canonical MASTER classes (`badge-official` / `badge-dry-run` / `badge-run-unmaterialized`) since the #183 rename. Note the distinct `badge-dry-run-status` class is the *task status* badge ("dry run in progress", MASTER §Status Badges) — it is not a run-mode badge and keeps its name.

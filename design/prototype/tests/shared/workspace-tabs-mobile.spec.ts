/* RETIRED (issue #1099 G2, design.md "G2 — 總覽選單", MODIFIED FR-002):
 * every describe block this file used to contain targeted the mobile-only
 * "已開啟 N 頁" dropdown widget (`#workspaceTabMobileToggle` /
 * `[data-testid="workspace-tab-mobile-toggle"]` / `-mobile-dropdown` /
 * `-mobile-item` / `-mobile-item-close`), which G2's Green implementation
 * fully retires in favor of one shared overview-menu component used by
 * BOTH desktop and mobile (FR-023, FR-002 MODIFIED). None of those
 * selectors exist anywhere in `sidebar.js`/`sidebar.css` any longer, so
 * every test below would now fail for a reason unrelated to the behavior
 * it was meant to cover.
 *
 * Supersession map (not a silent deletion -- tasks.md 4.2):
 *   - "AC-6.1 mobile dropdown replaces the tab bar" (zh/en toggle-count
 *     text) -> superseded by
 *     `workspace-tabs-overview-menu.spec.ts`'s "mobile replacement"
 *     describe block ("the shared trigger shows the tab count").
 *   - "AC-6.2 clicking a mobile dropdown item" -> superseded by the same
 *     "mobile replacement" describe block ("tapping a non-active row
 *     switches to it and closes the menu").
 *   - "AC-6.3 / FR-015 no horizontal scroll with 8 tabs open" -> superseded
 *     by the same "mobile replacement" describe block ("375px with 8
 *     distinct tabs open: neither the page nor the menu overflows
 *     horizontally").
 *   - "mobile dropdown close affordance" (coordinator-directed, beyond
 *     literal AC-6.x text) -> superseded by
 *     `workspace-tabs-overview-menu.spec.ts`'s "FR-023 point 2 row
 *     structure" describe block ("closing a non-active row removes it
 *     without closing the menu or switching tabs"), which exercises the
 *     identical close-affordance behavior through the new shared
 *     component's testids. That test only runs at desktop viewport in the
 *     current Red suite, but renderWorkspaceTabOverviewMenu()'s row
 *     markup/behavior is identical for both variants (design.md G2: variant
 *     only changes the trigger/panel's outer positioning), so desktop
 *     coverage exercises the same code path mobile would.
 */

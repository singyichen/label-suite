(function () {
  var SYSTEM_ROLE_STORAGE_KEY = 'labelsuite.systemRole';
  var LANG_STORAGE_KEY = 'labelsuite.lang';
  var ACTIVE_TASK_TYPE_STORAGE_KEY = 'labelsuite.activeTaskType';
  var SIDEBAR_COLLAPSED_STORAGE_KEY = 'labelsuite.sidebarCollapsed';
  /* specs/shared/019-workspace-tabs/spec.md 規格常數 TAB_STORAGE_KEY. */
  var WORKSPACE_TAB_STORAGE_KEY = 'labelsuite.workspaceTabs';
  /* specs/shared/019-workspace-tabs/spec.md 規格常數 TAB_SCROLL_STORAGE_KEY
   * (G2b / AC-2.1 / FR-018 / FR-019): per-tab scroll position, keyed by
   * dedupeKey, kept separate from WORKSPACE_TAB_STORAGE_KEY. */
  var WORKSPACE_TAB_SCROLL_STORAGE_KEY = 'labelsuite.workspaceTabScroll';
  /* Implementation detail (not a spec constant): a one-shot flag set right
   * before an AC-3.5 rekey redirect so the destination tab's own
   * mountWorkspaceTabBar() run() knows to show the "switched tabs" notice
   * after its full-page navigation lands. */
  var WORKSPACE_TAB_REKEY_NOTICE_KEY = 'labelsuite.workspaceTabRekeyNotice';
  /* specs/shared/019-workspace-tabs/spec.md 規格常數 TAB_CAP (issue #1075
   * G2c-2 / FR-011 / AC-4.1 / AC-4.2): maximum simultaneously open tabs. */
  var TAB_CAP = 8;
  /* Implementation detail (not a spec constant), mirrors
   * WORKSPACE_TAB_REKEY_NOTICE_KEY above but for the distinct AC-4.2
   * "all 8 tabs unsaved, open blocked" notice. */
  var WORKSPACE_TAB_CAP_NOTICE_KEY = 'labelsuite.workspaceTabCapNotice';
  /* specs/shared/019-workspace-tabs/spec.md 規格常數 TAB_REOPEN_STORAGE_KEY /
   * TAB_REOPEN_CAP (issue #1099 G3 / FR-024): LIFO stack of closed/evicted
   * tabs, capped at 10 (oldest dropped via shift()). */
  var WORKSPACE_TAB_REOPEN_STORAGE_KEY = 'labelsuite.workspaceTabReopenStack';
  var TAB_REOPEN_CAP = 10;
  /* One-shot flag mirroring WORKSPACE_TAB_CAP_NOTICE_KEY above, for
   * close-all's (FR-025) skipped-count hint surviving the navigation to
   * the surviving tab the active one was closed in favor of. */
  var WORKSPACE_TAB_CLOSE_ALL_NOTICE_KEY = 'labelsuite.workspaceTabCloseAllNotice';
  /* AC-2.4: set right before the logout handler clears both keys above, so
   * the pagehide-driven scroll capture below (which fires during the
   * resulting navigation to the login page) does not recreate
   * TAB_SCROLL_STORAGE_KEY after it was just cleared. */
  var workspaceTabLoggingOut = false;

  /* FR-012 (issue #1075 G2c-1): the predicate a page (annotation-workspace,
   * task-new) registers via registerWorkspaceUnsavedPredicate() below --
   * a zero-arg function this module polls only at the pagehide moment
   * captureWorkspaceTabUnsavedState() runs. Pages that never register one
   * (e.g. dashboard) leave this null. */
  var workspaceUnsavedPredicate = null;
  function registerWorkspaceUnsavedPredicate(predicateFn) {
    workspaceUnsavedPredicate = predicateFn;
  }

  /* issue #1041: last-mounted taskRole, persisted at module scope so
   * applyGlobalLanguage() can re-resolve #navAnnotation's role-dependent
   * label on every language switch, not just at initial mount. */
  var currentTaskRole = null;

  function normalizeSystemRole(role) {
    return role === 'super_admin' ? 'super_admin' : 'user';
  }

  /* issue #932: derive the avatar chip's initials from the displayed user
   * name so every page shows the right letters, not just dashboard (which
   * overrides them explicitly via updateUserChip's avatarLabel option).
   * Zero-width characters (U+200B/U+200C/U+200D/U+FEFF) are stripped first
   * so a name made only of them still falls back to the "U" placeholder
   * instead of rendering an invisible initial (code review finding). */
  function computeAvatarInitials(name) {
    var cleaned = String(name || '').replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    var parts = cleaned.split(/\s+/).filter(function (part) {
      return part.length > 0;
    });
    if (parts.length === 0) return 'U';
    return parts.map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('');
  }

  /* issue #946: single source of truth for the userName default so
   * renderSidebar() and mountSidebar() never drift apart. */
  function resolveUserName(opts) {
    return opts.userName || 'Mandy Chen';
  }

  function readStoredSystemRole() {
    try {
      var value = window.localStorage.getItem(SYSTEM_ROLE_STORAGE_KEY);
      if (!value) return null;
      return normalizeSystemRole(value);
    } catch (error) {
      return null;
    }
  }

  function persistSystemRole(systemRole) {
    try {
      window.localStorage.setItem(SYSTEM_ROLE_STORAGE_KEY, normalizeSystemRole(systemRole));
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
  }

  function normalizeLang(lang) {
    return lang === 'en' ? 'en' : 'zh';
  }

  /* issue #811: single source for the two bypass-related vocabularies that
   * `無法判定` used to conflate -- the annotator's answer value
   * (`OutputAnswer.bypass`) and the reviewer's decision value
   * (`REVIEW_DECISIONS` `bypass`). All consumers read from here instead of
   * hardcoding either string (design.md D1/D2). */
  var BYPASS_WORDING = {
    zh: { answer: '無法判定 (Bypass)', decision: '無法裁決' },
    en: { answer: 'Unable to determine (Bypass)', decision: 'Cannot adjudicate' }
  };

  var shortcutI18n = {
    zh: {
      shortcutLabel: '快捷鍵',
      shortcutCloseAria: '關閉快捷鍵',
      shortcutSubtitle: '目前頁面可用快捷鍵',
      globalTitle: '全域',
      globalOpen: '開啟快捷鍵總覽',
      globalClose: '關閉視窗或取消選取',
      workspaceTitle: '標記作業',
      workspaceSave: '儲存草稿',
      workspaceSubmit: '提交目前標記',
      workspacePrevious: '上一筆',
      workspaceNext: '下一筆',
      tabsTitle: '頁籤',
      tabsSwitch: '切換至對應位置頁籤',
      tabsClose: '關閉作用中頁籤',
      tabsReopen: '重開剛關閉的頁籤',
      reviewTitle: '審核',
      reviewApprove: '通過目前結果',
      /* issue #596 (design.md 已確認決策 #1): 審核「退回」流程與 `R` 快捷鍵已
       * 廢除，`B`（無法判定）取而代之
       * （annotation-workspace.config.js setupReviewShortcuts()）。 */
      reviewBypass: BYPASS_WORDING.zh.decision,
      switchToDark: '切換為深色模式',
      switchToLight: '切換為淺色模式'
    },
    en: {
      shortcutLabel: 'Keyboard shortcuts',
      shortcutCloseAria: 'Close keyboard shortcuts',
      shortcutSubtitle: 'Available shortcuts for this page',
      globalTitle: 'Global',
      globalOpen: 'Open shortcut overview',
      globalClose: 'Close dialog or clear selection',
      workspaceTitle: 'Annotation workspace',
      workspaceSave: 'Save draft',
      workspaceSubmit: 'Submit current annotation',
      workspacePrevious: 'Previous sample',
      workspaceNext: 'Next sample',
      tabsTitle: 'Tabs',
      tabsSwitch: 'Switch to a tab by position',
      tabsClose: 'Close the active tab',
      tabsReopen: 'Reopen the most recently closed tab',
      reviewTitle: 'Review',
      reviewApprove: 'Approve current result',
      reviewBypass: BYPASS_WORDING.en.decision,
      switchToDark: 'Switch to dark mode',
      switchToLight: 'Switch to light mode'
    }
  };

  var notificationI18n = {
    zh: {
      bellAriaLabel: '通知',
      dropdownTitle: '通知',
      markAllRead: '全部標為已讀',
      emptyText: '目前沒有通知',
      eventAnnotationComplete: function (actor, task) { return actor + ' 已完成「' + task + '」的標記作業'; },
      eventReviewComplete: function (actor, task) { return actor + ' 已完成「' + task + '」的審核'; },
      eventDryRunAllDone: function (task) { return '「' + task + '」的試標已全部完成，可進入正式標記'; },
      eventFormalAnnotationAllDone: function (task) { return '「' + task + '」的正式標記已全部完成'; },
      eventAssignmentAnnotator: function (task) { return '你已被分配「' + task + '」的標記清單'; },
      eventAssignmentReviewer: function (task) { return '你已被分配「' + task + '」的審核清單'; }
    },
    en: {
      bellAriaLabel: 'Notifications',
      dropdownTitle: 'Notifications',
      markAllRead: 'Mark all as read',
      emptyText: 'No notifications',
      eventAnnotationComplete: function (actor, task) { return actor + ' completed annotation for "' + task + '"'; },
      eventReviewComplete: function (actor, task) { return actor + ' completed review for "' + task + '"'; },
      eventDryRunAllDone: function (task) { return 'All annotators completed dry run for "' + task + '"'; },
      eventFormalAnnotationAllDone: function (task) { return 'All annotators completed formal annotation for "' + task + '"'; },
      eventAssignmentAnnotator: function (task) { return 'You have been assigned an annotation list for "' + task + '"'; },
      eventAssignmentReviewer: function (task) { return 'You have been assigned a review list for "' + task + '"'; }
    }
  };

  function setTextById(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateShortcutHelpLanguage(lang) {
    var t = shortcutI18n[normalizeLang(lang)];
    ['shortcutHelpBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.setAttribute('aria-label', t.shortcutLabel);
      btn.setAttribute('title', t.shortcutLabel);
    });

    var closeBtn = document.getElementById('shortcutHelpCloseBtn');
    if (closeBtn) closeBtn.setAttribute('aria-label', t.shortcutCloseAria);

    setTextById('shortcutHelpTitle', t.shortcutLabel);
    setTextById('shortcutHelpSubtitle', t.shortcutSubtitle);
    setTextById('shortcutGlobalTitle', t.globalTitle);
    setTextById('shortcutGlobalOpen', t.globalOpen);
    setTextById('shortcutGlobalClose', t.globalClose);
    setTextById('shortcutWorkspaceTitle', t.workspaceTitle);
    setTextById('shortcutWorkspaceSave', t.workspaceSave);
    setTextById('shortcutWorkspaceSubmit', t.workspaceSubmit);
    setTextById('shortcutWorkspacePrevious', t.workspacePrevious);
    setTextById('shortcutWorkspaceNext', t.workspaceNext);
    setTextById('shortcutTabsTitle', t.tabsTitle);
    setTextById('shortcutTabsSwitch', t.tabsSwitch);
    setTextById('shortcutTabsClose', t.tabsClose);
    setTextById('shortcutTabsReopen', t.tabsReopen);
    setTextById('shortcutReviewTitle', t.reviewTitle);
    setTextById('shortcutReviewApprove', t.reviewApprove);
    setTextById('shortcutReviewBypass', t.reviewBypass);
    updateSidebarThemeToggleLanguage(lang);
  }

  function getStoredThemeChoice() {
    try {
      var value = window.localStorage.getItem('label-suite-theme');
      return value === 'dark' ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  function getResolvedTheme() {
    if (window.LabelSuiteTheme && typeof window.LabelSuiteTheme.getResolved === 'function') {
      return window.LabelSuiteTheme.getResolved();
    }
    var attr = document.documentElement.getAttribute('data-theme');
    return attr === 'dark' ? 'dark' : getStoredThemeChoice();
  }

  function setThemeChoice(choice) {
    if (window.LabelSuiteTheme && typeof window.LabelSuiteTheme.setChoice === 'function') {
      window.LabelSuiteTheme.setChoice(choice);
      syncSidebarThemeToggle();
      return;
    }
    try {
      window.localStorage.setItem('label-suite-theme', choice);
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
    document.documentElement.setAttribute('data-theme', choice === 'dark' ? 'dark' : 'light');
    syncSidebarThemeToggle();
  }

  function syncSidebarThemeToggle() {
    var resolved = getResolvedTheme();
    var nextChoice = resolved === 'dark' ? 'light' : 'dark';
    ['sidebarThemeToggleBtn', 'mobileThemeToggleBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.dataset.nextTheme = nextChoice;
      btn.classList.toggle('is-dark', resolved === 'dark');
    });
    updateSidebarThemeToggleLanguage(readStoredLang());
  }

  function updateSidebarThemeToggleLanguage(lang) {
    var t = shortcutI18n[normalizeLang(lang)];
    var resolved = getResolvedTheme();
    var label = resolved === 'dark' ? t.switchToLight : t.switchToDark;
    ['sidebarThemeToggleBtn', 'mobileThemeToggleBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  function keycap(label) {
    return '<span class="shortcut-keycap" data-testid="shortcut-keycap">' + label + '</span>';
  }

  function keyGroup(keys) {
    return '<dd class="shortcut-key-group">' + keys.map(keycap).join('') + '</dd>';
  }

  function readStoredLang() {
    try {
      var value = window.localStorage.getItem(LANG_STORAGE_KEY);
      return normalizeLang(value);
    } catch (error) {
      return 'zh';
    }
  }

  function persistLang(lang) {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, normalizeLang(lang));
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
  }

  function applyGlobalLanguage(lang, options) {
    var normalizedLang = normalizeLang(lang);
    var opts = options || {};
    var langCode = normalizedLang === 'zh' ? 'ZH' : 'EN';

    persistLang(normalizedLang);
    document.documentElement.lang = normalizedLang === 'zh' ? 'zh-TW' : 'en';

    var labelIds = Array.isArray(opts.labelIds) ? opts.labelIds : ['langLabel', 'mobileLangLabel'];
    labelIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = langCode;
    });

    if (typeof opts.langToggleAria === 'string') {
      var toggleIds = Array.isArray(opts.toggleIds) ? opts.toggleIds : ['langToggle', 'mobileLangToggle'];
      toggleIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.setAttribute('aria-label', opts.langToggleAria);
      });
    }

    updateShortcutHelpLanguage(normalizedLang);
    updateAdminSubmenuLanguage(normalizedLang);
    updateL0NavLanguage(normalizedLang);

    if (typeof opts.roleLabel === 'string') {
      var roleEl = document.getElementById('roleIndicator');
      if (roleEl) roleEl.textContent = opts.roleLabel;
    }

    return normalizedLang;
  }

  function readStoredActiveTaskType() {
    try {
      return window.localStorage.getItem(ACTIVE_TASK_TYPE_STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function persistActiveTaskType(taskType) {
    try {
      if (!taskType) {
        window.localStorage.removeItem(ACTIVE_TASK_TYPE_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(ACTIVE_TASK_TYPE_STORAGE_KEY, String(taskType));
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
  }

  function normalizeSidebarCollapsed(value) {
    return value === true || value === 'true' || value === '1';
  }

  function readStoredSidebarCollapsed() {
    try {
      return normalizeSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY));
    } catch (error) {
      return false;
    }
  }

  function persistSidebarCollapsed(collapsed) {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false');
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
  }

  function shouldEnableDesktopSidebarCollapse() {
    if (!window || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 769px)').matches;
  }

  function isDesktopViewport() {
    if (!window || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 768px)').matches;
  }

  function applySidebarCollapsed(collapsed) {
    var isCollapsed = normalizeSidebarCollapsed(collapsed) && shouldEnableDesktopSidebarCollapse();
    if (document && document.body) {
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    }
  }

  function isInteractiveSidebarTarget(target) {
    if (!target) return false;
    var element = target.nodeType === 1 ? target : target.parentElement;
    if (!element || !element.closest) return false;
    return !!element.closest('a, button, input, select, textarea, label, [contenteditable="true"], [role="button"], [data-no-sidebar-toggle="true"]');
  }

  function shouldHideAdminByRole(systemRole) {
    return systemRole !== 'super_admin';
  }

  /* Admin submenu (issue #725): the "System Administration" L0 item stays a
   * single item (spec 008 FR-002/FR-003A/SC-003 unchanged); on Desktop with
   * the sidebar expanded it additionally exposes a two-link submenu so
   * super_admin can reach role-settings without first landing on
   * user-management. Mobile and Desktop collapsed keep the prior
   * single-link behavior (FR-019D). */
  var ADMIN_USER_MANAGEMENT_FILE = 'user-management.html';
  var ADMIN_ROLE_SETTINGS_FILE = 'role-settings.html';

  var adminSubmenuI18n = {
    zh: { users: '使用者管理', roles: '角色設定' },
    en: { users: 'User Management', roles: 'Role Settings' }
  };

  /* issue #944: FR-020 / FR-020A -- resolves navAnnotation / roleIndicator
     from opts.taskRole at mount time, converging the reviewer-mode
     overrides that annotation-workspace.config.js previously patched in
     post-mount (issue #309, issue #931). */
  var taskRoleI18n = {
    zh: { reviewer: '審核員', project_leader: '專案負責人', annotationLabel: '審核作業', projectLeaderAnnotationLabel: '例外處置', annotator: '標記作業' },
    en: { reviewer: 'Reviewer', project_leader: 'Project leader', annotationLabel: 'Review', projectLeaderAnnotationLabel: 'Exception Disposition', annotator: 'Annotation' }
  };

  /* issue #1041 FR-021: the five non-annotation L0 labels' bilingual
     values, mirroring adminSubmenuI18n's shape. */
  var l0NavI18n = {
    zh: { navDashboard: '儀表板', navTaskManagement: '任務管理', navDataset: '資料集分析', navAdmin: '系統管理', navProfile: '個人設定' },
    en: { navDashboard: 'Dashboard', navTaskManagement: 'Task Management', navDataset: 'Dataset Analytics', navAdmin: 'System Administration', navProfile: 'Profile' }
  };

  function getRoleSettingsHref(adminHref) {
    if (!adminHref || adminHref.indexOf(ADMIN_USER_MANAGEMENT_FILE) === -1) return adminHref;
    return adminHref.replace(ADMIN_USER_MANAGEMENT_FILE, ADMIN_ROLE_SETTINGS_FILE);
  }

  function getCurrentAdminSubKey() {
    var path = window.location.pathname;
    if (path.indexOf(ADMIN_ROLE_SETTINGS_FILE) !== -1) return 'role-settings';
    if (path.indexOf(ADMIN_USER_MANAGEMENT_FILE) !== -1) return 'user-management';
    return null;
  }

  function updateAdminSubmenuLanguage(lang) {
    var translations = adminSubmenuI18n[normalizeLang(lang)];
    setTextById('navAdminSubUsersLabel', translations.users);
    setTextById('navAdminSubRolesLabel', translations.roles);
  }

  /* issue #1041 FR-021: re-resolves all six L0 labels on every language
     switch (not only at initial mount), mirroring updateAdminSubmenuLanguage()
     above. #navAnnotation's label depends on the last-mounted taskRole
     (currentTaskRole), mirroring navItems' annotation entry's ternary
     (renderSidebar() below). */
  function updateL0NavLanguage(lang) {
    var normalizedLang = normalizeLang(lang);
    var translations = l0NavI18n[normalizedLang];
    setTextById('navDashboard', translations.navDashboard);
    setTextById('navTaskManagement', translations.navTaskManagement);
    setTextById('navDataset', translations.navDataset);
    setTextById('navAdmin', translations.navAdmin);
    setTextById('navProfile', translations.navProfile);

    var taskRoleLabels = taskRoleI18n[normalizedLang];
    setTextById('navAnnotation',
      currentTaskRole === 'reviewer' ? taskRoleLabels.annotationLabel :
      currentTaskRole === 'project_leader' ? taskRoleLabels.projectLeaderAnnotationLabel :
      taskRoleLabels.annotator);
  }

  function isAdminSubmenuAvailable() {
    // Reuse the 769px desktop boundary (shouldEnableDesktopSidebarCollapse)
    // instead of isDesktopViewport()'s 768px: sidebar.css's mobile media query
    // is `max-width: 768px`, so at exactly 768px isDesktopViewport() would
    // report desktop while the CSS still force-hides the submenu, leaving the
    // trigger toggling an invisible menu instead of falling back to
    // data-admin-href (issue #725 PR review).
    return shouldEnableDesktopSidebarCollapse() && !document.body.classList.contains('sidebar-collapsed');
  }

  function setAdminSubmenuExpanded(trigger, submenu, expanded) {
    if (!trigger || !submenu) return;
    trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    submenu.classList.toggle('open', expanded);
    submenu.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  }

  function applySystemRole(systemRole) {
    var normalizedRole = normalizeSystemRole(systemRole);
    var adminItem = document.getElementById('navAdminItem');
    if (adminItem) {
      adminItem.classList.toggle('hidden', shouldHideAdminByRole(normalizedRole));
    }
    persistSystemRole(normalizedRole);
  }

  function navItem(config, activeNav) {
    var isActive = config.key === activeNav;
    var className = 'nav-link' + (isActive ? ' active' : '');
    var currentAttr = isActive ? ' aria-current="page"' : '';
    var idAttr = config.itemId ? ' id="' + config.itemId + '"' : '';
    var hiddenClass = config.hidden ? ' hidden' : '';

    return '' +
      '<a class="' + className + hiddenClass + '" href="' + config.href + '" title="' + config.defaultLabel + '" aria-label="' + config.defaultLabel + '"' + currentAttr + idAttr + '>' +
        config.icon +
        '<span id="' + config.labelId + '">' + config.defaultLabel + '</span>' +
      '</a>';
  }

  function adminNavGroup(config, activeNav) {
    var isActive = config.key === activeNav;
    var hiddenClass = config.hidden ? ' hidden' : '';
    var currentSub = getCurrentAdminSubKey();
    var usersCurrentAttr = currentSub === 'user-management' ? ' aria-current="page"' : '';
    var usersCurrentClass = currentSub === 'user-management' ? ' current' : '';
    var rolesCurrentAttr = currentSub === 'role-settings' ? ' aria-current="page"' : '';
    var rolesCurrentClass = currentSub === 'role-settings' ? ' current' : '';

    return '' +
      '<div class="nav-link-group' + hiddenClass + '" id="' + config.itemId + '">' +
        '<button type="button" class="nav-link' + (isActive ? ' active' : '') + '" id="navAdminTrigger" ' +
          'data-testid="admin-nav-trigger" data-admin-href="' + config.href + '" ' +
          'aria-haspopup="true" aria-expanded="false"' + (isActive ? ' aria-current="page"' : '') + ' ' +
          'title="' + config.defaultLabel + '" aria-label="' + config.defaultLabel + '">' +
          config.icon +
          '<span id="' + config.labelId + '">' + config.defaultLabel + '</span>' +
          /* Lucide "chevron-down" (https://lucide.dev/icons/chevron-down) */
          '<svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</button>' +
        '<div class="nav-submenu" id="navAdminSubmenu" data-testid="admin-nav-submenu" role="menu" aria-hidden="true" data-no-sidebar-toggle="true">' +
          '<a class="nav-sublink' + usersCurrentClass + '" id="navAdminSubUsers" data-testid="admin-nav-user-management-link" role="menuitem" href="' + config.href + '"' + usersCurrentAttr + '>' +
            '<span id="navAdminSubUsersLabel">使用者管理</span>' +
          '</a>' +
          '<a class="nav-sublink' + rolesCurrentClass + '" id="navAdminSubRoles" data-testid="admin-nav-role-settings-link" role="menuitem" href="' + config.roleSettingsHref + '"' + rolesCurrentAttr + '>' +
            '<span id="navAdminSubRolesLabel">角色設定</span>' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  // ── Workspace Tabs (issue #1075, specs/shared/019-workspace-tabs) ──────
  // Shell-level strip mounted above each page's content, inside <main>, by
  // mountWorkspaceTabBar() -- distinct from a page's own in-page "Desktop
  // Content Tabs" (see MASTER.md's terminology note). Covers US1-US8:
  // open/switch/dedupe/close/stage-badge, scroll/state restore, in-page
  // URL re-key, TAB_CAP eviction/block, unsaved-change guard, keyboard
  // shortcuts (Alt+1-8/Alt+W) and tab-bar arrow-key/Enter/Space focus
  // handling, the mobile "N tabs open" dropdown, and 403/404 panes
  // (task-detail.html). The shared-008 shortcut-overview entry and
  // canonical spec write-back land in the final sub-group (G3).
  function getWorkspacePageKind(pathname) {
    var file = pathname.split('/').pop() || '';
    return file.replace(/\.html$/, '') || 'unknown';
  }

  // FR-006 requires a *normalized* URL dedupe key for task-detail and every
  // other page kind, not a raw string match: sorts query params so two
  // navigations to the same resource with differently-ordered params
  // resolve to the same dedupe key.
  function normalizeWorkspaceSearch(search) {
    var params = new URLSearchParams(search);
    var keys = [];
    params.forEach(function (_, key) {
      if (keys.indexOf(key) === -1) keys.push(key);
    });
    keys.sort();
    var normalized = new URLSearchParams();
    keys.forEach(function (key) {
      params.getAll(key).forEach(function (value) { normalized.append(key, value); });
    });
    var str = normalized.toString();
    return str ? '?' + str : '';
  }

  // issue #1084: true when every param in `newSearch` also appears, with the
  // IDENTICAL value, in `oldSearch` -- i.e. newSearch only ever REMOVES
  // params relative to oldSearch, never adds or changes one. This is the
  // signature of a page's own default-value canonicalization (e.g.
  // task-detail.html stripping a default-valued `tab=overview`), not a real
  // in-page change: a real change always adds a param the mount-time URL
  // didn't have or changes one to a different value.
  // ponytail: "removal-only" is a heuristic proxy for "canonicalization,
  // not a user action" -- it also matches a genuine first user action that
  // happens to be a pure "clear filters" on a page mounted with a
  // non-default, bookmarked URL (removal-only but real), which would still
  // be skipped if it's also the page's first settle. Narrower than the gap
  // this guard fixes (needs a non-default mount URL AND a pure-removal
  // first action); revisit if a page hits it in practice.
  function isWorkspaceRemovalOnlySearch(newSearch, oldSearch) {
    var oldParams = new URLSearchParams(oldSearch);
    var sameOrRemovedOnly = true;
    new URLSearchParams(newSearch).forEach(function (value, key) {
      if (oldParams.get(key) !== value) sameOrRemovedOnly = false;
    });
    return sameOrRemovedOnly;
  }

  /* 頁面種類 → 去重鍵對照表 (spec 019 規格常數, Q3/Q8/Q16) -- the single
   * source of truth: annotation-workspace dedupes by task id + mode,
   * task-new is a singleton, every other page kind (including task-detail,
   * per Q16) dedupes by full normalized URL. */
  function computeWorkspaceDedupeInfo(loc) {
    var pageKind = getWorkspacePageKind(loc.pathname);
    var params = new URLSearchParams(loc.search);

    if (pageKind === 'task-new') {
      return { pageKind: pageKind, dedupeKey: 'task-new' };
    }
    if (pageKind === 'annotation-workspace') {
      var taskId = params.get('task_id') || '';
      var mode = params.get('role') === 'reviewer' ? 'review' : 'annotate';
      return {
        pageKind: pageKind,
        dedupeKey: 'annotation-workspace:' + taskId + ':' + mode,
        taskId: taskId,
        mode: mode
      };
    }

    var info = { pageKind: pageKind, dedupeKey: loc.pathname + normalizeWorkspaceSearch(loc.search) };
    if (pageKind === 'task-detail') {
      info.taskId = params.get('task_id') || '';
      // FR-010 / TAB_STAGE_BADGE: stage is a display-only concern, not part
      // of the dedupe key (FR-006 keys task-detail on full normalized URL).
      var apStage = params.get('ap_stage') || '';
      var roundMatch = /^r(\d+)$/.exec(apStage);
      if (roundMatch) {
        info.stageBadge = 'dry_run';
        info.stageRound = roundMatch[1];
      } else if (apStage === 'official') {
        info.stageBadge = 'official_run';
      }
    }
    return info;
  }

  function readWorkspaceTabState() {
    try {
      var raw = window.sessionStorage.getItem(WORKSPACE_TAB_STORAGE_KEY);
      if (!raw) return { tabs: [], activeIndex: -1 };
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tabs)) return { tabs: [], activeIndex: -1 };
      return {
        tabs: parsed.tabs,
        activeIndex: typeof parsed.activeIndex === 'number' ? parsed.activeIndex : -1
      };
    } catch (error) {
      return { tabs: [], activeIndex: -1 }; // sessionStorage unavailable/corrupt (private mode)
    }
  }

  function writeWorkspaceTabState(state) {
    try {
      window.sessionStorage.setItem(WORKSPACE_TAB_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
  }

  // FR-024 (issue #1099 G3): the reopen-closed-tab stack.
  function readWorkspaceTabReopenStack() {
    try {
      var raw = window.sessionStorage.getItem(WORKSPACE_TAB_REOPEN_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return []; // sessionStorage unavailable/corrupt (private mode)
    }
  }

  function writeWorkspaceTabReopenStack(stack) {
    try {
      window.sessionStorage.setItem(WORKSPACE_TAB_REOPEN_STORAGE_KEY, JSON.stringify(stack));
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
  }

  // Shared push point for closeWorkspaceTab()'s manual close, the TAB_CAP
  // eviction branch (FR-011), and close-all (FR-025) -- one cap/shift
  // implementation (AC-024.3), per design.md "## G3" DRY note.
  function pushWorkspaceTabToReopenStack(tabEntry) {
    var stack = readWorkspaceTabReopenStack();
    stack.push(tabEntry);
    if (stack.length > TAB_REOPEN_CAP) stack.shift();
    writeWorkspaceTabReopenStack(stack);
  }

  // FR-024/FR-024A: pops the most-recently-closed entry and either switches
  // to an existing dedupe-key match (FR-006, AC-024.4) or opens it as a new
  // tab, subject to the same TAB_CAP/eviction rules as any other open
  // (FR-011). Shared by the overview menu's "重開剛關閉的" button and the
  // Alt+Shift+T shortcut -- no second implementation (FR-024A point 3).
  function reopenWorkspaceTab(onMatch, onOpenNew) {
    var stack = readWorkspaceTabReopenStack();
    if (!stack.length) return;
    var entry = stack.pop();
    writeWorkspaceTabReopenStack(stack);
    var state = readWorkspaceTabState();
    for (var i = 0; i < state.tabs.length; i++) {
      if (state.tabs[i].dedupeKey === entry.dedupeKey) {
        onMatch(i);
        return;
      }
    }
    onOpenNew(entry);
  }

  // AC-2.1 / FR-019: scroll positions live in their own map (dedupeKey ->
  // scrollY), separate from WORKSPACE_TAB_STORAGE_KEY per FR-019.
  function readWorkspaceTabScrollState() {
    try {
      var raw = window.sessionStorage.getItem(WORKSPACE_TAB_SCROLL_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeWorkspaceTabScrollState(scrollState) {
    try {
      window.sessionStorage.setItem(WORKSPACE_TAB_SCROLL_STORAGE_KEY, JSON.stringify(scrollState));
    } catch (error) {
      // Ignore storage errors in prototype mode.
    }
  }

  // Captures the CURRENT document's own scroll position under a fixed
  // dedupeKey (the key this page was mounted with, not a re-read of
  // sessionStorage's activeIndex -- that can already have been mutated by
  // this same page's own activateWorkspaceTab()/the AC-3.5 rekey hook
  // before the pagehide listener below actually runs).
  function captureWorkspaceTabScroll(dedupeKey) {
    if (!dedupeKey) return;
    var scrollState = readWorkspaceTabScrollState();
    scrollState[dedupeKey] = window.scrollY;
    writeWorkspaceTabScrollState(scrollState);
  }

  // FR-012 (issue #1075 G2c-1): mirrors captureWorkspaceTabScroll() above --
  // same pagehide moment, same dedupeKey match against THIS tab's own
  // stored entry -- but persists into TAB_STORAGE_KEY's own
  // hasUnsavedChanges field (not the separate scroll map), per the
  // WorkspaceTab entity (spec.md 關鍵實體, hasUnsavedChanges). A tab whose
  // page never registered a predicate is left untouched.
  function captureWorkspaceTabUnsavedState(dedupeKey) {
    if (!dedupeKey || !workspaceUnsavedPredicate) return;
    var state = readWorkspaceTabState();
    for (var i = 0; i < state.tabs.length; i++) {
      if (state.tabs[i].dedupeKey === dedupeKey) {
        state.tabs[i].hasUnsavedChanges = !!workspaceUnsavedPredicate();
        writeWorkspaceTabState(state);
        return;
      }
    }
  }

  // Restores the now-active tab's own stored scroll position, if any.
  function restoreActiveWorkspaceTabScroll(state) {
    if (state.activeIndex < 0 || !state.tabs[state.activeIndex]) return;
    var dedupeKey = state.tabs[state.activeIndex].dedupeKey;
    var y = readWorkspaceTabScrollState()[dedupeKey];
    if (typeof y === 'number') window.scrollTo(0, y);
  }

  // FR-011 / AC-4.1: among `tabs`, the index of the tab with no unsaved
  // changes and the oldest `lastActiveAt` -- or -1 if every tab has unsaved
  // changes (AC-4.2).
  function findWorkspaceEvictionCandidateIndex(tabs) {
    var evictIndex = -1;
    var oldestAt = Infinity;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].hasUnsavedChanges === true) continue;
      var at = typeof tabs[i].lastActiveAt === 'number' ? tabs[i].lastActiveAt : 0;
      if (at < oldestAt) {
        oldestAt = at;
        evictIndex = i;
      }
    }
    return evictIndex;
  }

  // Switches to an existing dedupe-key match or inserts a new tab right of
  // the active one (FR-005, FR-008, Q19). `loc` must be a synchronous
  // snapshot, not a live window.location read: task-detail.html rewrites
  // its own URL via history.replaceState() later (FR-019).
  function syncCurrentPageIntoWorkspaceTabs(loc) {
    var state = readWorkspaceTabState();
    var info = computeWorkspaceDedupeInfo(loc);
    var tabEntry = {
      dedupeKey: info.dedupeKey,
      url: loc.pathname + loc.search,
      pageKind: info.pageKind,
      taskId: info.taskId || null,
      mode: info.mode || null,
      stageBadge: info.stageBadge || null,
      stageRound: info.stageRound || null
    };

    // FR-010/AC-1.6: a task-detail tab is only ever synced while that same
    // task-detail page is current, so window.LabelSuiteTaskListData (loaded
    // synchronously before DOMContentLoaded, see sidebar.js call site in
    // run()) is guaranteed populated for THIS taskId right now. Snapshot
    // both languages onto the tab entry so computeWorkspaceTabLabel() can
    // still render a name later, after navigating to a page (e.g.
    // account/profile.html) that provides no task-list data of its own.
    // Re-running this sync on every revisit/reload of the tab keeps the
    // snapshot fresh if the fixture name changes.
    if (tabEntry.pageKind === 'task-detail' && tabEntry.taskId) {
      var nameZh = resolveWorkspaceTaskName(tabEntry.taskId, 'zh');
      var nameEn = resolveWorkspaceTaskName(tabEntry.taskId, 'en');
      if (nameZh || nameEn) {
        tabEntry.taskName = { zh: nameZh, en: nameEn };
      }
    }

    var existingIndex = -1;
    for (var i = 0; i < state.tabs.length; i++) {
      if (state.tabs[i].dedupeKey === info.dedupeKey) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex === -1) {
      if (state.tabs.length >= TAB_CAP) {
        // ponytail: eviction candidate is judged once, synchronously, at
        // the moment the 9th tab is opened -- no continuous race
        // monitoring for a tab that goes dirty in the same tick (spec
        // 019 邊界情況, 已知簡化). Acceptable because `hasUnsavedChanges`
        // is itself only ever updated on `pagehide`, so no tab can change
        // dirtiness mid-judgment on this same synchronous call stack.
        var evictIndex = findWorkspaceEvictionCandidateIndex(state.tabs);
        if (evictIndex === -1) {
          // AC-4.2: all TAB_CAP tabs have unsaved changes -- block the open,
          // leave state untouched, and redirect back to the previously
          // active tab (if any).
          var activeTab = state.tabs[state.activeIndex];
          if (activeTab) {
            try {
              window.sessionStorage.setItem(WORKSPACE_TAB_CAP_NOTICE_KEY, '1');
            } catch (error) {
              // Ignore storage errors in prototype mode.
            }
            window.location.replace(activeTab.url);
          }
          return state;
        }
        pushWorkspaceTabToReopenStack(state.tabs[evictIndex]); // FR-024/AC-4.1-updated
        state.tabs.splice(evictIndex, 1);
        if (evictIndex <= state.activeIndex) state.activeIndex -= 1;
      }
      tabEntry.lastActiveAt = Date.now();
      var insertAt = state.activeIndex + 1;
      if (insertAt < 0) insertAt = 0;
      if (insertAt > state.tabs.length) insertAt = state.tabs.length;
      state.tabs.splice(insertAt, 0, tabEntry);
      state.activeIndex = insertAt;
    } else {
      // Carries over the prior lastActiveAt rather than re-stamping: this
      // branch also runs on a plain reload of the already-active tab (AC-2.3
      // regression coverage asserts byte-identical state across a reload),
      // not only on a genuine revisit. activateWorkspaceTab() below is the
      // one path that stamps recency for an explicit tab-bar switch.
      tabEntry.lastActiveAt = state.tabs[existingIndex].lastActiveAt;
      state.tabs[existingIndex] = tabEntry;
      state.activeIndex = existingIndex;
    }

    writeWorkspaceTabState(state);
    return state;
  }

  // issue #1099 G1: the six L0 sidebar nav icons (navItems below, ADR-030
  // Lucide/24x24/2px-stroke/currentColor), reused as workspace tabs'
  // per-page-kind icons. Single source of truth for the path markup so
  // navItems and workspaceTabIconFor() never carry two copies of the same
  // icon (DRY) -- each key's Lucide name is noted in its own comment.
  var WORKSPACE_NAV_ICON_PATHS = {
    dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>', // layout-dashboard
    'task-management': '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>', // circle-plus
    annotation: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', // pen-line
    dataset: '<path d="M3 3h18v18H3z"/><path d="M9 9h6v6H9z"/><path d="M3 9h6"/><path d="M15 9h6"/>', // layout-grid
    admin: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', // settings
    profile: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' // user
  };

  function workspaceNavIconSvg(navKey, className) {
    return '<svg class="' + className + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + WORKSPACE_NAV_ICON_PATHS[navKey] + '</svg>';
  }

  // 頁籤 pageKind → L0 導覽圖示 key 對照（design.md「G1 — 視覺對齊」決策表）：
  // 工作頁籤之「頁面種類」比 L0 類別更細，需要一個獨立於 navItems key 的對照。
  var WORKSPACE_TAB_ICON_NAV_KEY = {
    dashboard: 'dashboard',
    'task-list': 'task-management', 'task-new': 'task-management', 'task-detail': 'task-management',
    'annotation-workspace': 'annotation', 'annotation-list': 'annotation',
    'dataset-analysis-list': 'dataset', 'dataset-analysis-detail': 'dataset',
    'user-management': 'admin', 'role-settings': 'admin',
    profile: 'profile'
  };

  // 選擇器契約（workspace-tabs-visual.spec.ts 已鎖定）：插入之 <svg> 必須帶
  // class="workspace-tab-icon"，與 .workspace-tab-close 自身未加 class 的
  // <svg> 區隔。未對照到的 pageKind 退回 dashboard 圖示。
  function workspaceTabIconFor(pageKind) {
    var navKey = WORKSPACE_TAB_ICON_NAV_KEY[pageKind] || 'dashboard';
    return workspaceNavIconSvg(navKey, 'workspace-tab-icon');
  }

  var workspacePageKindI18n = {
    zh: {
      dashboard: '儀表板', 'task-list': '任務管理', 'task-new': '新增任務',
      'task-detail': '任務詳情', 'annotation-list': '標記清單',
      'dataset-analysis-list': '資料集分析', 'dataset-analysis-detail': '資料集分析',
      'user-management': '使用者管理', 'role-settings': '角色設定', profile: '個人設定'
    },
    en: {
      dashboard: 'Dashboard', 'task-list': 'Task Management', 'task-new': 'New Task',
      'task-detail': 'Task Detail', 'annotation-list': 'Annotation List',
      'dataset-analysis-list': 'Dataset Analytics', 'dataset-analysis-detail': 'Dataset Analytics',
      'user-management': 'User Management', 'role-settings': 'Role Settings', profile: 'Profile'
    }
  };

  var workspaceAnnotationModeI18n = {
    zh: { annotate: '標記作業', review: '審核作業' },
    en: { annotate: 'Annotation', review: 'Review' }
  };

  // Looks up a task-detail tab's task name by id from the CURRENT page's
  // own task-list.data.js global, never hardcoded (Generalization-First).
  function resolveWorkspaceTaskName(taskId, lang) {
    if (!taskId) return '';
    var data = window.LabelSuiteTaskListData;
    if (!data || !Array.isArray(data.tasks)) return '';
    for (var i = 0; i < data.tasks.length; i++) {
      if (data.tasks[i].id === taskId) {
        return lang === 'zh' ? (data.tasks[i].nameZh || '') : (data.tasks[i].nameEn || data.tasks[i].nameZh || '');
      }
    }
    return '';
  }

  // FR-010 / TAB_STAGE_BADGE (spec 019 規格常數): a task-detail tab's title
  // is its stage badge text plus the task name; every other page kind uses
  // its nav/admin-submenu label, falling back to the raw pageKind for an
  // unrecognized one instead of rendering nothing.
  function computeWorkspaceTabLabel(tab, lang) {
    var l = normalizeLang(lang);
    if (tab.pageKind === 'task-detail') {
      var stageText;
      if (tab.stageBadge === 'dry_run') {
        stageText = (l === 'zh' ? '試標 R' : 'Dry Run R') + (tab.stageRound || '');
      } else if (tab.stageBadge === 'official_run') {
        stageText = l === 'zh' ? '正式' : 'Official';
      } else {
        stageText = workspacePageKindI18n[l]['task-detail'];
      }
      // FR-010/AC-1.6: prefer a live lookup against the CURRENT page's own
      // task-list data (freshest when it happens to be available), then
      // fall back to the name snapshot stored on the tab itself at sync
      // time (so the name survives navigating to a page with no task-list
      // data), then to the bare taskId so two otherwise-unresolvable tabs
      // at the same stage are still distinguishable.
      var taskName = resolveWorkspaceTaskName(tab.taskId, l);
      if (!taskName && tab.taskName) {
        taskName = (l === 'zh' ? tab.taskName.zh : (tab.taskName.en || tab.taskName.zh)) || '';
      }
      if (!taskName && tab.taskId) {
        taskName = tab.taskId;
      }
      return taskName ? stageText + ' ' + taskName : stageText;
    }
    if (tab.pageKind === 'annotation-workspace') {
      return workspaceAnnotationModeI18n[l][tab.mode] || tab.pageKind;
    }
    return workspacePageKindI18n[l][tab.pageKind] || tab.pageKind;
  }

  var workspaceTabRekeyNoticeI18n = {
    zh: '已切換至既有頁籤',
    en: 'Switched to an existing tab'
  };

  // AC-3.5 / FR-007: a visible notice after an in-page URL change rekeys
  // into another already-open tab. Reuses task-detail.html's own #toast
  // element/markup (UXC-07 single-instance contract) rather than building a
  // second shell-level toast mechanism; a page without #toast is a no-op.
  function showWorkspaceTabRekeyNotice() {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var msg = document.getElementById('toastMsg');
    if (msg) msg.textContent = workspaceTabRekeyNoticeI18n[readStoredLang()];
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2400);
  }

  var workspaceTabCapNoticeI18n = {
    zh: '工作頁籤已達上限，請先儲存目前的變更',
    en: 'Workspace tab limit reached -- save your current changes first'
  };

  // AC-4.2 / FR-011: a visible notice after opening a 9th tab is blocked
  // because all TAB_CAP tabs have unsaved changes. Same #toast element/
  // mechanism as showWorkspaceTabRekeyNotice() above, distinct message.
  function showWorkspaceTabCapNotice() {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var msg = document.getElementById('toastMsg');
    if (msg) msg.textContent = workspaceTabCapNoticeI18n[readStoredLang()];
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2400);
  }

  var workspaceTabCloseAllSkippedNoticeI18n = {
    zh: function (count) { return count + ' 個頁籤有未儲存變更，未關閉'; },
    en: function (count) { return count + ' tab(s) have unsaved changes and were not closed'; }
  };

  // AC-025.1: a visible notice naming how many tabs close-all skipped
  // because they had unsaved changes. Same #toast element/mechanism as
  // showWorkspaceTabCapNotice() above, distinct message.
  function showWorkspaceTabCloseAllSkippedNotice(count) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var msg = document.getElementById('toastMsg');
    if (msg) msg.textContent = workspaceTabCloseAllSkippedNoticeI18n[readStoredLang()](count);
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2400);
  }

  function renderWorkspaceTabBar(container, state, onActivate, onClose) {
    while (container.firstChild) container.removeChild(container.firstChild);
    var lang = readStoredLang();
    state.tabs.forEach(function (tab, index) {
      var isActive = index === state.activeIndex;
      var label = computeWorkspaceTabLabel(tab, lang);

      var tabEl = document.createElement('div');
      tabEl.className = 'workspace-tab' + (isActive ? ' active' : '');
      tabEl.setAttribute('data-testid', 'workspace-tab');
      tabEl.setAttribute('role', 'tab');
      tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tabEl.setAttribute('tabindex', '0');
      tabEl.title = label; // issue #1099 G1: full untruncated label as a tooltip/accessible name once the label itself ellipsizes
      if (tab.stageBadge) tabEl.setAttribute('data-stage-badge', tab.stageBadge);
      tabEl.addEventListener('click', function () { onActivate(index); });
      // AC-8.2 (issue #1075 sub-group G2g): ArrowLeft/ArrowRight move focus
      // to the adjacent tab (wrap-around, ARIA APG tabs pattern) without
      // activating it; Enter/Space activate the focused tab, same as click.
      tabEl.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          var nextIndex = (index + 1) % state.tabs.length;
          container.children[nextIndex].focus();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          var prevIndex = (index - 1 + state.tabs.length) % state.tabs.length;
          container.children[prevIndex].focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate(index);
        }
      });

      tabEl.insertAdjacentHTML('beforeend', workspaceTabIconFor(tab.pageKind));

      var labelSpan = document.createElement('span');
      labelSpan.className = 'workspace-tab-label';
      labelSpan.textContent = label;
      tabEl.appendChild(labelSpan);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'workspace-tab-close';
      closeBtn.setAttribute('aria-label', (lang === 'zh' ? '關閉 ' : 'Close ') + label);
      closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      closeBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        onClose(index);
      });
      tabEl.appendChild(closeBtn);

      container.appendChild(tabEl);
    });

    // issue #1102: `.workspace-tab-bar` is `overflow-x: auto` but every
    // render above rebuilds the bar from scratch with `scrollLeft` left at
    // its default 0, regardless of where the active tab ends up sitting in
    // the (unscrolled) flex row. Bring the active tab fully into view
    // within the bar's OWN scroll box -- `scrollLeft` arithmetic only, never
    // `element.scrollIntoView()`, which can also scroll ancestor scroll
    // containers (the page/window), which AC-1.* here forbids. No-op when
    // the tab is already fully visible.
    var activeTabEl = container.children[state.activeIndex];
    if (activeTabEl) {
      var containerRect = container.getBoundingClientRect();
      var tabRect = activeTabEl.getBoundingClientRect();
      if (tabRect.left < containerRect.left) {
        container.scrollLeft -= (containerRect.left - tabRect.left);
      } else if (tabRect.right > containerRect.right) {
        container.scrollLeft += (tabRect.right - containerRect.right);
      }
    }
  }

  // FR-023 point 2 (issue #1099 G2a/G2b): the overview trigger's "N tabs
  // open" text, reused as the filter input's placeholder.
  function workspaceTabOverviewCountText(lang, count) {
    return normalizeLang(lang) === 'zh' ? ('已開啟 ' + count + ' 頁') : (count + ' tabs open');
  }

  // FR-023 point 2's bottom action slots (issue #1099 G2a desktop-only
  // subset): the "重開剛關閉的"/"全部關閉" pair. Behavior for both is G3
  // scope (FR-024/FR-025) -- this change only renders the structural text.
  var workspaceTabOverviewActionI18n = {
    zh: { reopen: '重開剛關閉的', closeAll: '全部關閉' },
    en: { reopen: 'Reopen closed tab', closeAll: 'Close all' }
  };

  // Mounts the bar as <main>'s first child, deferred to DOMContentLoaded:
  // mountSidebar() runs before <main> is parsed and before any page-data
  // <script> below it (e.g. task-list.data.js) has run.
  function mountWorkspaceTabBar() {
    // Captured synchronously, at mountSidebar() call time -- see
    // syncCurrentPageIntoWorkspaceTabs() for why this must not be a live
    // window.location read taken later (inside run()).
    var capturedLoc = { pathname: window.location.pathname, search: window.location.search };

    // Guards the replaceState patch below: sessionStorage's activeIndex
    // only correctly identifies THIS tab's own slot once run() (deferred to
    // DOMContentLoaded) has called syncCurrentPageIntoWorkspaceTabs() for
    // THIS page load. Before that, activeIndex is still whatever the
    // PREVIOUS page in this tab left behind. A page can call
    // history.replaceState() in its own early, still-synchronous script --
    // acting on it before this flag is set would read/write the wrong
    // tab's slot entirely (observed via issue-891-live-review-pools.spec.ts).
    var workspaceTabBarReady = false;

    // AC-2.1 / FR-019: this tab's own current dedupe key, shared between the
    // replaceState wrapper closure below and run()'s pagehide listener
    // closure further down. Assigned once at mount time in run() (see the
    // assignment near the pagehide listener), then re-assigned in the
    // no-collision branch of the replaceState wrapper whenever an in-page
    // replaceState() changes this tab's own dedupe key (issue #1084) -- so
    // pagehide always captures scroll/unsaved state under the SAME key the
    // next mount will look it up by, not a stale mount-time one.
    var workspaceActiveTabDedupeKey = null;

    // issue #1084: a page's OWN render functions can call replaceState()
    // redundantly right after workspaceTabBarReady flips true (e.g.
    // task-detail.html's initial render pass calls renderWorkLog() /
    // renderAnnotationProgress() / renderAnnotationResults() /
    // renderMemberManagement() for every tab regardless of which one is
    // active, and each ends with its own syncUrlToViewState() call) -- this
    // first post-ready settle can be a pure re-canonicalization of the SAME
    // state the tab already mounted with (e.g. stripping a default-valued
    // `tab=overview` the live address bar never showed as such at mount
    // time), not a real in-page change; syncing it would rewrite AC-3.5's
    // protected pre-switch entry before the user has done anything
    // (confirmed via a throwaway probe reproducing
    // workspace-tabs-rekey.spec.ts's own scenario -- see PR body). NOT every
    // page produces this bootstrap noise, though (measured: task-list.html,
    // dataset-analysis-detail.html, user-management.html,
    // annotation-list.html, dashboard.html all emit zero settles on a bare
    // load -- see PR body), so "first settle" alone cannot gate the sync:
    // for those pages the user's first real change IS the first settle.
    // Combined with isWorkspaceRemovalOnlySearch() below, only a first
    // settle that is ALSO removal-only (pure canonicalization) is skipped;
    // a first settle that adds or changes a param is synced like any other.
    var workspaceHasSyncedOwnEntryOnce = false;

    // AC-3.5 / FR-007 (Q18): a page's OWN history.replaceState() calls (e.g.
    // task-management-014 FR-019's in-page sub-tab/filter writes) may rekey
    // this tab's dedupe key onto one a DIFFERENT, already-open tab already
    // holds. Installed once, before any page-specific script can call
    // replaceState (sidebar.js loads first).
    //
    // A page like task-detail.html calls replaceState many times during its
    // OWN bootstrap as separate panels each normalize their slice of the URL
    // (observed via issue-891-live-review-pools.spec.ts: a single page load
    // cycles through several transient, not-yet-settled combinations of
    // `tab=`/`ap_stage=` before landing on its final URL). Reacting to each
    // call individually would (a) momentarily record a transient, non-final
    // URL as this tab's own identity, and (b) risk matching another tab's
    // dedupe key purely by transient coincidence, redirecting away from the
    // page mid-bootstrap. Debounce to the end of that burst (a 0ms timeout
    // still waits for the current synchronous call stack -- and any
    // same-tick chained replaceState calls -- to finish) and act once on
    // the final, settled URL.
    var nativeWorkspaceReplaceState = window.history.replaceState.bind(window.history);
    var workspaceReplaceStateSettleTimer = null;
    window.history.replaceState = function (replaceStateData, title, url) {
      nativeWorkspaceReplaceState(replaceStateData, title, url);
      if (!workspaceTabBarReady) return;
      if (workspaceReplaceStateSettleTimer) {
        clearTimeout(workspaceReplaceStateSettleTimer);
      }
      workspaceReplaceStateSettleTimer = setTimeout(function () {
        workspaceReplaceStateSettleTimer = null;
        var loc = { pathname: window.location.pathname, search: window.location.search };
        var info = computeWorkspaceDedupeInfo(loc);
        var state = readWorkspaceTabState();
        for (var i = 0; i < state.tabs.length; i++) {
          if (i !== state.activeIndex && state.tabs[i].dedupeKey === info.dedupeKey) {
            state.activeIndex = i;
            state.tabs[i].lastActiveAt = Date.now(); // FR-011/AC-4.1
            writeWorkspaceTabState(state);
            try {
              window.sessionStorage.setItem(WORKSPACE_TAB_REKEY_NOTICE_KEY, '1');
            } catch (error) {
              // Ignore storage errors in prototype mode.
            }
            window.location.replace(state.tabs[i].url); // AC-2.5: no history growth
            return;
          }
        }
        // No collision: FR-007/AC-3.5 only constrain the COLLIDING case
        // above (a tab B this tab's new URL happens to match must keep its
        // own pre-switch state) -- they say nothing about this tab's own
        // entry. AC-2.1 separately requires sub-tab/filter/page state to
        // survive a tab-bar switch away and back, so this tab's own stored
        // entry must be kept in sync with its latest in-page URL, not left
        // frozen at mount time (issue #1084). dedupeKey is updated here too,
        // not just url: syncCurrentPageIntoWorkspaceTabs() identifies "is
        // this tab already open" by matching the CURRENT URL's freshly
        // computed dedupe key against each stored tab's dedupeKey. Leaving
        // the stored dedupeKey stale would make a later remount of this same
        // URL look like a brand-new tab and insert a duplicate instead of
        // updating this slot.
        var activeTab = state.tabs[state.activeIndex];
        // See workspaceHasSyncedOwnEntryOnce's own declaration above (issue
        // #1084): only a FIRST settle that is ALSO removal-only (pure
        // canonicalization of the state already on this tab) is bootstrap
        // noise to skip -- a first settle that adds or changes a param is a
        // real in-page change and must be synced like any other.
        var activeTabQueryIndex = activeTab ? activeTab.url.indexOf('?') : -1;
        var isCanonicalizationOnlyFirstSettle = !workspaceHasSyncedOwnEntryOnce &&
          activeTab && isWorkspaceRemovalOnlySearch(loc.search, activeTabQueryIndex >= 0 ? activeTab.url.slice(activeTabQueryIndex) : '');
        workspaceHasSyncedOwnEntryOnce = true;
        if (activeTab && !isCanonicalizationOnlyFirstSettle) {
          activeTab.url = loc.pathname + loc.search;
          activeTab.dedupeKey = info.dedupeKey;
          activeTab.stageBadge = info.stageBadge || null;
          activeTab.stageRound = info.stageRound || null;
          writeWorkspaceTabState(state);
          // Keep the pagehide capture key (below) in step with this tab's
          // now-updated dedupeKey -- see the shared variable's declaration.
          workspaceActiveTabDedupeKey = info.dedupeKey;
        }
      }, 0);
    };

    function run() {
      var mainEl = document.querySelector('main');
      if (!mainEl) return;

      var existing = document.getElementById('workspaceTabBar');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      // issue #1098: a page's own content-width/padding class sometimes sits
      // directly ON <main> (e.g. dashboard.html's <main class="layout">,
      // profile.html's <main class="main-content">) instead of on an inner
      // <div> the way task-list.html already does it correctly. Detect that
      // inset via computed style and move the class onto a new inner wrapper
      // so <main> itself goes back to being a bare flex container and the bar
      // -- inserted as <main>'s own first child below -- is never subject to
      // that class's padding/max-width.
      var mainComputedStyle = window.getComputedStyle(mainEl);
      var mainHasInset = parseFloat(mainComputedStyle.paddingLeft) > 0 ||
        parseFloat(mainComputedStyle.paddingRight) > 0 ||
        parseFloat(mainComputedStyle.paddingTop) > 0 ||
        (mainComputedStyle.maxWidth && mainComputedStyle.maxWidth !== 'none');
      if (mainEl.className && mainHasInset) {
        var mainInnerWrap = document.createElement('div');
        mainInnerWrap.className = mainEl.className;
        while (mainEl.firstChild) mainInnerWrap.appendChild(mainEl.firstChild);
        mainEl.appendChild(mainInnerWrap);
        mainEl.removeAttribute('class');
        // Restore the bare flex-container behavior task-list.html's own
        // separate `main { flex: 1; ...}` tag rule already gives it -- this
        // page's class no longer provides that now that it moved to the
        // wrapper. `overflow-y: auto` is required, not cosmetic: without it
        // <main> never establishes a scroll container for the sticky bar's
        // `position: sticky` to resolve against, even though <main>'s own
        // scrollHeight equals its clientHeight here (nothing overflows
        // *inside* <main> -- the window/document is still what actually
        // scrolls, confirmed empirically, issue #1098 PR body's
        // scroll-measurement table). Removing this line reproduces the
        // exact pre-fix bug numbers on annotation-list/profile.
        mainEl.style.flex = '1';
        mainEl.style.display = 'flex';
        mainEl.style.flexDirection = 'column';
        mainEl.style.overflowY = 'auto';
        mainEl.style.minWidth = '0';
      }

      var barEl = document.createElement('div');
      barEl.id = 'workspaceTabBar';
      barEl.className = 'workspace-tab-bar';
      barEl.setAttribute('data-testid', 'workspace-tab-bar');
      barEl.setAttribute('role', 'tablist');
      barEl.setAttribute('aria-label', readStoredLang() === 'zh' ? '工作頁籤' : 'Workspace tabs');
      mainEl.insertBefore(barEl, mainEl.firstChild);

      // Cancel a flex-column <main>'s own `gap` (e.g. annotation-list.html)
      // so it isn't doubled above this new first child (shared-008 FR-017/SC-010).
      var mainRowGap = parseFloat(window.getComputedStyle(mainEl).rowGap);
      if (mainRowGap > 0) barEl.style.marginBottom = '-' + mainRowGap + 'px';

      function activateWorkspaceTab(index) {
        var state = readWorkspaceTabState();
        if (index === state.activeIndex) return;
        state.activeIndex = index;
        if (state.tabs[index]) state.tabs[index].lastActiveAt = Date.now(); // FR-011/AC-4.1
        writeWorkspaceTabState(state);
        // AC-2.5 / FR-017: tab-bar switches must not grow history.length --
        // .replace() is the full-navigation equivalent of replaceState().
        window.location.replace(state.tabs[index].url);
      }

      // AC-1.5 (provisional rule, spec 019 FR-009/Q7 -- finalized later by
      // a shared-008 MODIFIED change): closing the active tab moves focus
      // to the tab now to its right, or to its left if it was rightmost.
      // Closing a non-active tab never navigates; it only re-renders this
      // page's own bar with the (possibly shifted) active index.
      function closeWorkspaceTab(index) {
        var state = readWorkspaceTabState();
        var wasActive = index === state.activeIndex;
        // AC-4.3/FR-012: a background tab whose last-known state was
        // unsaved blocks the close instead of discarding it. FR-012
        // forbids a second confirmation mechanism here, so this is a
        // silent no-op -- the tab bar and storage stay exactly as they were.
        if (!wasActive && state.tabs[index] && state.tabs[index].hasUnsavedChanges) {
          return;
        }
        if (state.tabs[index]) pushWorkspaceTabToReopenStack(state.tabs[index]); // FR-024/AC-024.1
        state.tabs.splice(index, 1);
        if (state.tabs.length === 0) {
          state.activeIndex = -1;
          writeWorkspaceTabState(state);
          renderWorkspaceTabViews(state);
          return;
        }
        if (wasActive) {
          state.activeIndex = Math.min(index, state.tabs.length - 1);
          if (state.tabs[state.activeIndex]) state.tabs[state.activeIndex].lastActiveAt = Date.now(); // FR-011/AC-4.1
        } else if (index < state.activeIndex) {
          state.activeIndex -= 1;
        }
        writeWorkspaceTabState(state);
        if (wasActive) {
          // AC-2.5 / FR-017: see activateWorkspaceTab() above.
          window.location.replace(state.tabs[state.activeIndex].url);
        } else {
          renderWorkspaceTabViews(state);
        }
      }

      // FR-025: closes every tab without unsaved changes, pushing each to
      // the reopen stack (FR-024 point 1); skips dirty tabs and shows a
      // hint naming how many were skipped (AC-025.1). If the active tab is
      // among those closed, focus moves to a surviving (skipped) tab
      // (AC-025.2) -- shared-008 FR-022's neighbor rule degenerates here
      // since both neighbors may also be closed, so this picks any one
      // surviving tab, per design.md "## G3".
      function closeAllWorkspaceTabs() {
        var state = readWorkspaceTabState();
        var activeTab = state.tabs[state.activeIndex];
        var activeDedupeKey = activeTab ? activeTab.dedupeKey : null;
        var kept = [];
        var skippedCount = 0;
        state.tabs.forEach(function (tab) {
          if (tab.hasUnsavedChanges) {
            skippedCount += 1;
            kept.push(tab);
          } else {
            pushWorkspaceTabToReopenStack(tab); // FR-024 point 1 / FR-025 point 4
          }
        });
        state.tabs = kept;

        var activeKeptIndex = -1;
        for (var i = 0; i < kept.length; i++) {
          if (kept[i].dedupeKey === activeDedupeKey) { activeKeptIndex = i; break; }
        }

        if (activeKeptIndex !== -1 || !kept.length) {
          // Active tab survived (it was itself skipped) or nothing survived
          // -- either way, no navigation is needed.
          state.activeIndex = activeKeptIndex !== -1 ? activeKeptIndex : -1;
          writeWorkspaceTabState(state);
          if (skippedCount) showWorkspaceTabCloseAllSkippedNotice(skippedCount);
          renderWorkspaceTabViews(state);
          return;
        }

        // AC-025.2: the active tab was among those closed -- focus moves to
        // a surviving (skipped) tab via a full navigation away from here,
        // same mechanism as closeWorkspaceTab()'s wasActive branch.
        state.activeIndex = 0;
        kept[0].lastActiveAt = Date.now(); // FR-011/AC-4.1
        writeWorkspaceTabState(state);
        if (skippedCount) {
          try {
            window.sessionStorage.setItem(WORKSPACE_TAB_CLOSE_ALL_NOTICE_KEY, String(skippedCount));
          } catch (error) {
            // Ignore storage errors in prototype mode.
          }
        }
        window.location.replace(kept[0].url);
      }

      // FR-023/FR-023A/FR-023 MODIFIED (#1099 G2b): filter+keyboard model; retires the mobile-only dropdown (#1075 G2e).
      var overviewVariant = isDesktopViewport() ? 'desktop' : 'mobile';
      var overviewTriggerEl = null;
      var overviewMenuEl = null;
      var overviewListEl = null;
      var overviewFilterEl = null;

      function openOverviewMenu() {
        overviewMenuEl.classList.remove('hidden');
        overviewTriggerEl.setAttribute('aria-expanded', 'true');
        overviewFilterEl.value = '';
        renderWorkspaceTabOverviewMenu(readWorkspaceTabState());
        overviewFilterEl.focus();
      }

      function closeOverviewMenu() {
        overviewMenuEl.classList.add('hidden');
        overviewTriggerEl.setAttribute('aria-expanded', 'false');
      }

      // AC-023.3: non-matching rows (title/page-kind, never the URL) get a
      // `.hidden` class instead of being removed from the DOM.
      function renderWorkspaceTabOverviewMenu(state) {
        var lang = readStoredLang();
        var query = overviewFilterEl.value.toLowerCase();
        var triggerCountEl = overviewTriggerEl.querySelector('.workspace-tab-overview-trigger-count');
        if (triggerCountEl) triggerCountEl.textContent = workspaceTabOverviewCountText(lang, state.tabs.length);
        overviewFilterEl.placeholder = workspaceTabOverviewCountText(lang, state.tabs.length);
        if (overviewReopenBtn) overviewReopenBtn.disabled = readWorkspaceTabReopenStack().length === 0; // AC-024.5

        while (overviewListEl.firstChild) overviewListEl.removeChild(overviewListEl.firstChild);
        state.tabs.forEach(function (tab, index) {
          var isActive = index === state.activeIndex;
          var label = computeWorkspaceTabLabel(tab, lang);
          var secondary = workspacePageKindI18n[lang][tab.pageKind] || '';
          var matchesFilter = !query || label.toLowerCase().indexOf(query) !== -1 || secondary.toLowerCase().indexOf(query) !== -1;

          var itemEl = document.createElement('div');
          itemEl.className = 'workspace-tab-overview-item' + (isActive ? ' active' : '') + (matchesFilter ? '' : ' hidden');
          itemEl.setAttribute('data-testid', 'workspace-tab-overview-item');
          itemEl.setAttribute('aria-current', isActive ? 'true' : 'false');
          itemEl.setAttribute('aria-selected', 'false');
          itemEl.addEventListener('click', function () {
            closeOverviewMenu();
            activateWorkspaceTab(index);
          });

          itemEl.insertAdjacentHTML('beforeend', workspaceTabIconFor(tab.pageKind));

          var textWrap = document.createElement('div');
          textWrap.className = 'workspace-tab-overview-item-text';
          var labelSpan = document.createElement('span');
          labelSpan.className = 'workspace-tab-overview-item-label';
          labelSpan.textContent = label;
          textWrap.appendChild(labelSpan);
          if (secondary) {
            var secondarySpan = document.createElement('span');
            secondarySpan.className = 'workspace-tab-overview-item-secondary';
            secondarySpan.textContent = secondary;
            textWrap.appendChild(secondarySpan);
          }
          itemEl.appendChild(textWrap);

          var closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'workspace-tab-overview-item-close';
          closeBtn.setAttribute('data-testid', 'workspace-tab-overview-item-close');
          closeBtn.setAttribute('aria-label', (lang === 'zh' ? '關閉 ' : 'Close ') + label);
          closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
          closeBtn.addEventListener('click', function (event) {
            event.stopPropagation();
            closeWorkspaceTab(index);
          });
          itemEl.appendChild(closeBtn);

          overviewListEl.appendChild(itemEl);
        });
      }

      {
        overviewTriggerEl = document.createElement('button');
        overviewTriggerEl.type = 'button';
        overviewTriggerEl.className = 'workspace-tab-overview-trigger workspace-tab-overview-trigger--' + overviewVariant;
        overviewTriggerEl.setAttribute('data-testid', 'workspace-tab-overview-trigger');
        overviewTriggerEl.setAttribute('aria-haspopup', 'true');
        overviewTriggerEl.setAttribute('aria-expanded', 'false');
        overviewTriggerEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg><span class="workspace-tab-overview-trigger-count"></span>';
        overviewTriggerEl.addEventListener('click', function (event) {
          event.stopPropagation();
          if (overviewMenuEl.classList.contains('hidden')) {
            openOverviewMenu();
          } else {
            closeOverviewMenu();
          }
        });

        var existingOverviewMenu = document.getElementById('workspaceTabOverviewMenu');
        if (existingOverviewMenu && existingOverviewMenu.parentNode) {
          existingOverviewMenu.parentNode.removeChild(existingOverviewMenu);
        }
        overviewMenuEl = document.createElement('div');
        overviewMenuEl.id = 'workspaceTabOverviewMenu';
        overviewMenuEl.className = 'workspace-tab-overview-menu hidden';
        overviewMenuEl.setAttribute('data-testid', 'workspace-tab-overview-menu');

        overviewFilterEl = document.createElement('input');
        overviewFilterEl.type = 'text';
        overviewFilterEl.className = 'workspace-tab-overview-filter';
        overviewFilterEl.setAttribute('data-testid', 'workspace-tab-overview-filter');
        overviewFilterEl.addEventListener('input', function () {
          renderWorkspaceTabOverviewMenu(readWorkspaceTabState());
        });
        overviewFilterEl.addEventListener('keydown', function (event) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            var rows = Array.prototype.filter.call(overviewListEl.children, function (row) {
              return !row.classList.contains('hidden');
            });
            if (!rows.length) return;
            var current = -1;
            for (var i = 0; i < rows.length; i++) {
              if (rows[i].getAttribute('aria-selected') === 'true') { current = i; break; }
            }
            var next = event.key === 'ArrowDown' ? (current + 1) % rows.length : current === -1 ? rows.length - 1 : (current - 1 + rows.length) % rows.length;
            rows.forEach(function (row, rowIndex) {
              row.setAttribute('aria-selected', rowIndex === next ? 'true' : 'false');
            });
          } else if (event.key === 'Enter') {
            event.preventDefault();
            var highlighted = overviewListEl.querySelector('[aria-selected="true"]');
            if (highlighted) highlighted.click();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            closeOverviewMenu();
            overviewTriggerEl.focus();
          }
        });
        overviewMenuEl.appendChild(overviewFilterEl);

        overviewListEl = document.createElement('div');
        overviewListEl.className = 'workspace-tab-overview-list';
        overviewMenuEl.appendChild(overviewListEl);

        var overviewActionsEl = document.createElement('div');
        overviewActionsEl.className = 'workspace-tab-overview-actions';

        var overviewLang = readStoredLang();
        var overviewReopenBtn = document.createElement('button');
        overviewReopenBtn.type = 'button';
        overviewReopenBtn.className = 'workspace-tab-overview-reopen';
        overviewReopenBtn.setAttribute('data-testid', 'workspace-tab-overview-reopen');
        overviewReopenBtn.textContent = workspaceTabOverviewActionI18n[overviewLang].reopen;
        // AC-024.5: re-evaluated on every renderWorkspaceTabOverviewMenu()
        // call (see there), same as the trigger's own tab count.
        overviewReopenBtn.disabled = true;
        overviewReopenBtn.addEventListener('click', function () {
          reopenWorkspaceTab(
            function onMatch(index) { closeOverviewMenu(); activateWorkspaceTab(index); },
            function onOpenNew(entry) { closeOverviewMenu(); window.location.href = entry.url; }
          );
        });
        overviewActionsEl.appendChild(overviewReopenBtn);

        var overviewCloseAllBtn = document.createElement('button');
        overviewCloseAllBtn.type = 'button';
        overviewCloseAllBtn.className = 'workspace-tab-overview-close-all';
        overviewCloseAllBtn.setAttribute('data-testid', 'workspace-tab-overview-close-all');
        overviewCloseAllBtn.textContent = workspaceTabOverviewActionI18n[overviewLang].closeAll;
        overviewCloseAllBtn.addEventListener('click', function () {
          closeOverviewMenu();
          closeAllWorkspaceTabs();
        });
        overviewActionsEl.appendChild(overviewCloseAllBtn);

        overviewMenuEl.appendChild(overviewActionsEl);
        document.body.appendChild(overviewMenuEl);

        document.addEventListener('click', function (event) {
          if (overviewMenuEl.classList.contains('hidden')) return;
          if (overviewTriggerEl.contains(event.target)) return;
          if (overviewMenuEl.contains(event.target)) return;
          closeOverviewMenu();
        });

        // FR-002 MODIFIED: mobile mounts where #workspaceTabMobileToggle was.
        if (overviewVariant === 'mobile') {
          var overviewMobileAnchor = document.getElementById('mobileLogoutBtn');
          if (overviewMobileAnchor && overviewMobileAnchor.parentNode) {
            overviewMobileAnchor.parentNode.insertBefore(overviewTriggerEl, overviewMobileAnchor);
          }
        }
      }

      // Single call site for both the desktop bar and the overview menu,
      // so every state mutation below (initial mount, activate, close) keeps
      // both views in sync without duplicating this file's three existing
      // renderWorkspaceTabBar() call sites a second time over.
      function renderWorkspaceTabViews(state) {
        renderWorkspaceTabBar(barEl, state, activateWorkspaceTab, closeWorkspaceTab);
        // renderWorkspaceTabBar() above just wiped and rebuilt barEl's own
        // children from scratch -- re-append the (detached, not destroyed)
        // trigger node as barEl's last child every time, desktop only.
        if (overviewVariant === 'desktop') barEl.appendChild(overviewTriggerEl);
        renderWorkspaceTabOverviewMenu(state);
      }

      // AC-4.2: checked and consumed BEFORE syncCurrentPageIntoWorkspaceTabs()
      // below, which may itself set this same flag and redirect here --
      // reading it afterward, in that same synchronous call stack, would
      // consume it on the ORIGINATING page before the browser ever
      // navigates to this (the destination) page.
      try {
        if (window.sessionStorage.getItem(WORKSPACE_TAB_CAP_NOTICE_KEY)) {
          window.sessionStorage.removeItem(WORKSPACE_TAB_CAP_NOTICE_KEY);
          showWorkspaceTabCapNotice();
        }
      } catch (error) {
        // Ignore storage errors in prototype mode.
      }

      // AC-025.1: mirrors the WORKSPACE_TAB_CAP_NOTICE_KEY check above --
      // closeAllWorkspaceTabs() sets this right before navigating away from
      // the closed active tab to a surviving one, so the hint still shows
      // once that destination page mounts.
      try {
        var closeAllSkipped = window.sessionStorage.getItem(WORKSPACE_TAB_CLOSE_ALL_NOTICE_KEY);
        if (closeAllSkipped) {
          window.sessionStorage.removeItem(WORKSPACE_TAB_CLOSE_ALL_NOTICE_KEY);
          showWorkspaceTabCloseAllSkippedNotice(Number(closeAllSkipped));
        }
      } catch (error) {
        // Ignore storage errors in prototype mode.
      }

      var state = syncCurrentPageIntoWorkspaceTabs(capturedLoc);
      renderWorkspaceTabViews(state);
      restoreActiveWorkspaceTabScroll(state); // AC-2.1: restore on (re-)mount
      // Only now does state.activeIndex reliably identify THIS tab's own
      // slot -- safe for the replaceState patch above to act from here on.
      workspaceTabBarReady = true;

      // AC-2.1 / FR-019: capture this tab's own scroll position right before
      // it is navigated away from, however that navigation happens (a
      // tab-bar switch/close, a plain sidebar <a href> opening a new tab,
      // browser back/forward, or closing the browser tab) -- pagehide covers
      // all of them, unlike hooking activateWorkspaceTab()/closeWorkspaceTab()
      // alone, which only fires for already-open-tab switches. Keyed by THIS
      // page's own dedupeKey, fixed at mount time -- not re-read from
      // sessionStorage, which activateWorkspaceTab()/the rekey hook may
      // already have advanced to the destination tab's index by the time
      // pagehide actually fires.
      workspaceActiveTabDedupeKey = state.tabs[state.activeIndex] ? state.tabs[state.activeIndex].dedupeKey : null;
      window.addEventListener('pagehide', function () {
        if (workspaceTabLoggingOut) return; // AC-2.4: see declaration above.
        captureWorkspaceTabScroll(workspaceActiveTabDedupeKey);
        captureWorkspaceTabUnsavedState(workspaceActiveTabDedupeKey); // FR-012
      });
      try {
        if (window.sessionStorage.getItem(WORKSPACE_TAB_REKEY_NOTICE_KEY)) {
          window.sessionStorage.removeItem(WORKSPACE_TAB_REKEY_NOTICE_KEY);
          showWorkspaceTabRekeyNotice();
        }
      } catch (error) {
        // Ignore storage errors in prototype mode.
      }

      // FR-013/AC-5.3: narrower than isInteractiveSidebarTarget() -- the
      // spec names exactly input/textarea/contenteditable as the editable
      // targets that suppress this shortcut (a `role="tab"` tab-bar button
      // itself is not one of these, so it never collides).
      function isEditableWorkspaceTabTarget(target) {
        if (!target) return false;
        var element = target.nodeType === 1 ? target : target.parentElement;
        if (!element || !element.closest) return false;
        return !!element.closest('input, textarea, [contenteditable="true"]');
      }

      // AC-5.1/AC-5.2/AC-5.4: Alt+1...8 activates the tab at that position;
      // Alt+W closes the active tab. Uses event.code (Digit1...Digit8,
      // KeyW), not event.key, so macOS Option+digit special characters
      // aren't misread (AC-5.4).
      document.addEventListener('keydown', function (event) {
        // FR-024A: Alt+Shift+T, checked before the Alt-only guard below
        // (which explicitly excludes shiftKey for Alt+1...8/Alt+W).
        if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyT') {
          if (!isDesktopViewport()) return;
          if (isEditableWorkspaceTabTarget(event.target)) return;
          event.preventDefault();
          reopenWorkspaceTab(
            function onMatch(index) { closeOverviewMenu(); activateWorkspaceTab(index); },
            function onOpenNew(entry) { closeOverviewMenu(); window.location.href = entry.url; }
          );
          return;
        }
        if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (!isDesktopViewport()) return;
        if (isEditableWorkspaceTabTarget(event.target)) return;
        var digitMatch = /^Digit([1-8])$/.exec(event.code);
        if (digitMatch) {
          var index = Number(digitMatch[1]) - 1;
          if (readWorkspaceTabState().tabs[index]) {
            event.preventDefault();
            activateWorkspaceTab(index);
          }
          return;
        }
        if (event.code === 'KeyW') {
          event.preventDefault();
          closeWorkspaceTab(readWorkspaceTabState().activeIndex);
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }
  // ── End workspace tabs ──────────────────────────────────────────────────

  /* issue #946: returned markup leaves #userName/#userAvatar empty; a caller
   * must also call updateUserChip({ userName }) after inserting it into the
   * DOM, or those two nodes stay blank (mountSidebar() already does this). */
  function renderSidebar(options) {
    var opts = options || {};
    var activeNav = opts.activeNav || 'dashboard';
    var systemRole = normalizeSystemRole(
      opts.systemRole || readStoredSystemRole() || (opts.hideAdmin ? 'user' : 'super_admin')
    );
    var dashboardHref = opts.dashboardHref || '../dashboard/dashboard.html';
    var profileHref = opts.profileHref || '../account/profile.html';

    var taskHref = opts.taskHref || '../task-management/task-list.html';
    var storedTaskType = readStoredActiveTaskType();
    var annotationHref = opts.annotationHref || '../annotation/annotation-list.html';
    if (storedTaskType && annotationHref.indexOf('task_type=') === -1) {
      annotationHref += (annotationHref.indexOf('?') === -1 ? '?' : '&') + 'task_type=' + encodeURIComponent(storedTaskType);
    }
    var datasetHref = opts.datasetHref || '../dataset/dataset-analysis-list.html';
    var adminHref = opts.adminHref || '#';
    var roleSettingsHref = getRoleSettingsHref(adminHref);
    var brandHref = opts.brandHref || dashboardHref;
    var userName = resolveUserName(opts);
    var taskRole = opts.taskRole || null;
    currentTaskRole = taskRole;
    var taskRoleLabels = taskRoleI18n[readStoredLang()];
    var l0NavLabels = l0NavI18n[readStoredLang()];
    var roleIndicator = opts.roleIndicator || (
      taskRole === 'reviewer' ? taskRoleLabels.reviewer :
      taskRole === 'project_leader' ? taskRoleLabels.project_leader :
      '一般使用者'
    );

    var navItems = [
      {
        key: 'dashboard',
        href: dashboardHref,
        labelId: 'navDashboard',
        defaultLabel: l0NavLabels.navDashboard,
        icon: workspaceNavIconSvg('dashboard', 'nav-icon')
      },
      {
        key: 'task-management',
        href: taskHref,
        labelId: 'navTaskManagement',
        defaultLabel: l0NavLabels.navTaskManagement,
        icon: workspaceNavIconSvg('task-management', 'nav-icon')
      },
      {
        key: 'annotation',
        href: annotationHref,
        labelId: 'navAnnotation',
        defaultLabel: taskRole === 'reviewer' ? taskRoleLabels.annotationLabel :
          taskRole === 'project_leader' ? taskRoleLabels.projectLeaderAnnotationLabel :
          taskRoleLabels.annotator,
        icon: workspaceNavIconSvg('annotation', 'nav-icon')
      },
      {
        key: 'dataset',
        href: datasetHref,
        labelId: 'navDataset',
        defaultLabel: l0NavLabels.navDataset,
        icon: workspaceNavIconSvg('dataset', 'nav-icon')
      },
      {
        key: 'admin',
        href: adminHref,
        labelId: 'navAdmin',
        defaultLabel: l0NavLabels.navAdmin,
        itemId: 'navAdminItem',
        hidden: shouldHideAdminByRole(systemRole),
        roleSettingsHref: roleSettingsHref,
        icon: workspaceNavIconSvg('admin', 'nav-icon')
      },
      {
        key: 'profile',
        href: profileHref,
        labelId: 'navProfile',
        defaultLabel: l0NavLabels.navProfile,
        icon: workspaceNavIconSvg('profile', 'nav-icon')
      },
    ];

    var userChipHref = activeNav === 'profile' ? '#' : profileHref;
    var userChipAriaCurrent = activeNav === 'profile' ? ' aria-current="page"' : '';

    return '' +
      '<header class="navbar" role="banner">' +
        '<div class="brand-section">' +
          '<a class="navbar-brand" href="' + brandHref + '" aria-label="Label Suite 首頁">' +
            '<div class="navbar-logo" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<line x1="7" y1="7" x2="7.01" y2="7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
              '</svg>' +
            '</div>' +
            '<span class="navbar-wordmark">Label Suite</span>' +
          '</a>' +
          '<button class="lang-toggle" id="langToggle" data-testid="lang-toggle" aria-label="切換語言">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>' +
            '<span id="langLabel" data-testid="lang-label">ZH</span>' +
          '</button>' +
          '<button id="mobileLangToggle" class="mobile-lang-toggle" aria-label="切換語言">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>' +
            '<span id="mobileLangLabel">ZH</span>' +
          '</button>' +
          '<button id="mobileThemeToggleBtn" class="mobile-theme-toggle-btn" data-testid="mobile-theme-toggle" type="button" aria-label="切換為深色模式" title="切換為深色模式">' +
            '<svg data-theme-toggle-icon="moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' +
            '<svg data-theme-toggle-icon="sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>' +
          '</button>' +
          '<button id="mobileNotificationBellBtn" class="mobile-notification-bell-btn" type="button" aria-label="通知" title="通知" aria-haspopup="true" aria-expanded="false">' +
            '<span class="notif-bell-wrap">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>' +
              '<span id="mobileNotificationBadge" class="notif-badge hidden" aria-hidden="true"></span>' +
            '</span>' +
          '</button>' +
          '<button id="mobileLogoutBtn" class="mobile-top-logout" aria-label="登出" title="登出">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
          '</button>' +
        '</div>' +

        '<nav class="navbar-center" aria-label="Main navigation">' +
          navItems.map(function (item) {
            return item.key === 'admin' ? adminNavGroup(item, activeNav) : navItem(item, activeNav);
          }).join('') +
        '</nav>' +

        '<div class="nav-actions">' +
          '<div class="sidebar-utility-row" aria-label="全域工具">' +
            '<button id="shortcutHelpBtn" class="sidebar-utility-btn" data-testid="shortcut-help-button" type="button" aria-label="快捷鍵" title="快捷鍵">' +
              '<svg class="sidebar-utility-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01"/><path d="M10 9h.01"/><path d="M14 9h.01"/><path d="M18 9h.01"/><path d="M8 13h8"/></svg>' +
            '</button>' +
            '<button id="sidebarThemeToggleBtn" class="sidebar-utility-btn sidebar-theme-toggle-btn" data-testid="sidebar-theme-toggle" type="button" aria-label="切換為深色模式" title="切換為深色模式">' +
              '<svg class="sidebar-utility-icon" data-theme-toggle-icon="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' +
              '<svg class="sidebar-utility-icon" data-theme-toggle-icon="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>' +
            '</button>' +
            '<button id="notificationBellBtn" class="sidebar-utility-btn" type="button" aria-label="通知" title="通知" aria-haspopup="true" aria-expanded="false">' +
              '<span class="notif-bell-wrap">' +
                '<svg class="sidebar-utility-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>' +
                '<span id="notificationBadge" class="notif-badge hidden" aria-hidden="true"></span>' +
              '</span>' +
            '</button>' +
          '</div>' +
          '<div class="user-chip">' +
            '<a class="user-chip-profile" href="' + userChipHref + '" aria-label="前往個人設定"' + userChipAriaCurrent + '>' +
              /* issue #946: userName/its avatar initials are populated via
               * textContent by mountSidebar() after this markup is injected
               * with innerHTML, so a malicious userName can never be parsed
               * as markup here (see updateUserChip()). */
              '<div class="avatar" id="userAvatar" aria-hidden="true"></div>' +
              '<div class="user-info">' +
                '<span class="user-name" id="userName"></span>' +
                '<span class="user-role" id="roleIndicator" data-testid="role-indicator">' + roleIndicator + '</span>' +
              '</div>' +
            '</a>' +
            '<button id="logoutBtn" class="logout-btn" aria-label="登出" title="登出">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div id="shortcutHelpModal" class="shortcut-help-backdrop hidden" role="presentation">' +
          '<section class="shortcut-help-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcutHelpTitle">' +
            '<div class="shortcut-help-header">' +
              '<div>' +
                '<h2 id="shortcutHelpTitle">快捷鍵</h2>' +
                '<p id="shortcutHelpSubtitle">目前頁面可用快捷鍵</p>' +
              '</div>' +
              '<button id="shortcutHelpCloseBtn" class="shortcut-help-close" type="button" aria-label="關閉快捷鍵">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
              '</button>' +
            '</div>' +
            '<div class="shortcut-help-section">' +
              '<div class="shortcut-help-section-header">' +
                '<h3 id="shortcutGlobalTitle">全域</h3>' +
              '</div>' +
              '<dl class="shortcut-help-list">' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutGlobalOpen">開啟快捷鍵總覽</strong></dt>' + keyGroup(['?']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutGlobalClose">關閉視窗或取消選取</strong></dt>' + keyGroup(['ESC']) + '</div>' +
              '</dl>' +
            '</div>' +
            '<div class="shortcut-help-section">' +
              '<div class="shortcut-help-section-header">' +
                '<h3 id="shortcutWorkspaceTitle">標記作業</h3>' +
              '</div>' +
              '<dl class="shortcut-help-list">' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutWorkspaceSave">儲存草稿</strong></dt>' + keyGroup(['CTRL', 'CMD', 'S']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutWorkspaceSubmit">提交目前標記</strong></dt>' + keyGroup(['CTRL', 'CMD', 'ENTER']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutWorkspacePrevious">上一筆</strong></dt>' + keyGroup(['ALT', 'LEFT']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutWorkspaceNext">下一筆</strong></dt>' + keyGroup(['ALT', 'RIGHT']) + '</div>' +
              '</dl>' +
            '</div>' +
            '<div class="shortcut-help-section" data-testid="shortcut-help-section-tabs">' +
              '<div class="shortcut-help-section-header">' +
                '<h3 id="shortcutTabsTitle">頁籤</h3>' +
              '</div>' +
              '<dl class="shortcut-help-list">' +
                '<div class="shortcut-help-row" data-testid="shortcut-tabs-switch-row"><dt><strong id="shortcutTabsSwitch">切換至對應位置頁籤</strong></dt>' + keyGroup(['ALT', '1-8']) + '</div>' +
                '<div class="shortcut-help-row" data-testid="shortcut-tabs-close-row"><dt><strong id="shortcutTabsClose">關閉作用中頁籤</strong></dt>' + keyGroup(['ALT', 'W']) + '</div>' +
                '<div class="shortcut-help-row" data-testid="shortcut-tabs-reopen-row"><dt><strong id="shortcutTabsReopen">重開剛關閉的頁籤</strong></dt>' + keyGroup(['ALT', 'SHIFT', 'T']) + '</div>' +
              '</dl>' +
            '</div>' +
            '<div class="shortcut-help-section">' +
              '<div class="shortcut-help-section-header">' +
                '<h3 id="shortcutReviewTitle">審核</h3>' +
              '</div>' +
              '<dl class="shortcut-help-list">' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutReviewApprove">通過目前結果</strong></dt>' + keyGroup(['A']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutReviewBypass">' + BYPASS_WORDING.zh.decision + '</strong></dt>' + keyGroup(['B']) + '</div>' +
              '</dl>' +
            '</div>' +
          '</section>' +
        '</div>' +
      '</header>';
  }

  function mountSidebar(options) {
    var opts = options || {};
    var mountId = opts.mountId || 'sharedSidebarMount';
    var mountNode = document.getElementById(mountId);
    if (!mountNode) return;
    mountNode.innerHTML = renderSidebar(opts);
    // issue #946: userName must land in the DOM via textContent, not the
    // innerHTML string above, so a malicious userName can't be parsed as
    // markup. Reuses updateUserChip()'s existing safe-write path (DRY).
    updateUserChip({ userName: resolveUserName(opts) });
    applySystemRole(opts.systemRole || readStoredSystemRole() || (opts.hideAdmin ? 'user' : 'super_admin'));
    var initialCollapsed = typeof opts.sidebarCollapsed === 'boolean'
      ? opts.sidebarCollapsed
      : readStoredSidebarCollapsed();
    applySidebarCollapsed(initialCollapsed);
    updateShortcutHelpLanguage(readStoredLang());
    updateAdminSubmenuLanguage(readStoredLang());
    syncSidebarThemeToggle();
    mountWorkspaceTabBar();

    var loginHref = opts.loginHref || '../account/login.html';
    ['mobileLogoutBtn', 'logoutBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        // AC-2.4 / FR-018: clear both keys so the next login starts blank.
        workspaceTabLoggingOut = true;
        try {
          window.sessionStorage.removeItem(WORKSPACE_TAB_STORAGE_KEY);
          window.sessionStorage.removeItem(WORKSPACE_TAB_SCROLL_STORAGE_KEY);
          window.sessionStorage.removeItem(WORKSPACE_TAB_REOPEN_STORAGE_KEY); // MODIFIED FR-018 (issue #1099 G3)
        } catch (error) {
          // Ignore storage errors in prototype mode.
        }
        window.location.href = loginHref;
      });
    });

    var shortcutModal = document.getElementById('shortcutHelpModal');
    var shortcutCloseBtn = document.getElementById('shortcutHelpCloseBtn');
    var shortcutHelpInvoker = null;
    function openShortcutHelp() {
      if (!shortcutModal) return;
      shortcutHelpInvoker = document.activeElement;
      shortcutModal.classList.remove('hidden');
      if (shortcutCloseBtn) shortcutCloseBtn.focus();
    }
    function closeShortcutHelp() {
      if (!shortcutModal) return;
      shortcutModal.classList.add('hidden');
      if (shortcutHelpInvoker && typeof shortcutHelpInvoker.focus === 'function') {
        shortcutHelpInvoker.focus();
      }
      shortcutHelpInvoker = null;
    }

    ['shortcutHelpBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', openShortcutHelp);
    });
    ['sidebarThemeToggleBtn', 'mobileThemeToggleBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        setThemeChoice(btn.dataset.nextTheme === 'light' ? 'light' : 'dark');
      });
    });
    // ── Admin submenu (issue #725) ─────────────────────────────────
    var adminGroup = document.getElementById('navAdminItem');
    var adminTrigger = document.getElementById('navAdminTrigger');
    var adminSubmenu = document.getElementById('navAdminSubmenu');
    if (adminTrigger && adminSubmenu) {
      adminTrigger.addEventListener('click', function () {
        if (!isAdminSubmenuAvailable()) {
          window.location.href = adminTrigger.getAttribute('data-admin-href') || '#';
          return;
        }
        var willOpen = adminTrigger.getAttribute('aria-expanded') !== 'true';
        setAdminSubmenuExpanded(adminTrigger, adminSubmenu, willOpen);
      });
      document.addEventListener('click', function (event) {
        if (adminTrigger.getAttribute('aria-expanded') !== 'true') return;
        if (adminGroup && adminGroup.contains(event.target)) return;
        setAdminSubmenuExpanded(adminTrigger, adminSubmenu, false);
      });
    }
    // ── End admin submenu ───────────────────────────────────────────
    // ── Notification bell ────────────────────────────────────────
    var existingDropdown = document.getElementById('notificationDropdown');
    if (existingDropdown) existingDropdown.parentNode.removeChild(existingDropdown);

    var notifDropdownEl = document.createElement('div');
    notifDropdownEl.id = 'notificationDropdown';
    notifDropdownEl.className = 'notif-dropdown hidden';

    var notifHeaderDiv = document.createElement('div');
    notifHeaderDiv.className = 'notif-dropdown-header';
    var notifTitleSpan = document.createElement('span');
    notifTitleSpan.className = 'notif-dropdown-title';
    notifTitleSpan.id = 'notifDropdownTitle';
    notifTitleSpan.textContent = '通知';
    notifHeaderDiv.appendChild(notifTitleSpan);
    var notifMarkAllBtnEl = document.createElement('button');
    notifMarkAllBtnEl.id = 'notifMarkAllBtn';
    notifMarkAllBtnEl.className = 'notif-mark-all-btn';
    notifMarkAllBtnEl.type = 'button';
    notifMarkAllBtnEl.textContent = '全部標為已讀';
    notifHeaderDiv.appendChild(notifMarkAllBtnEl);
    notifDropdownEl.appendChild(notifHeaderDiv);

    var notifListDiv = document.createElement('div');
    notifListDiv.id = 'notificationList';
    notifListDiv.className = 'notif-list';
    notifDropdownEl.appendChild(notifListDiv);

    document.body.appendChild(notifDropdownEl);

    var notifBellBtn = document.getElementById('notificationBellBtn');
    var notifDropdown = document.getElementById('notificationDropdown');
    var notifBadge = document.getElementById('notificationBadge');
    var notifList = document.getElementById('notificationList');

    var mockNotifs = [
      {
        id: '1',
        type: 'annotation_complete',
        actorName: { zh: '陳小明', en: 'Alex Chen' },
        taskName: { zh: '任務 A', en: 'Task A' },
        time: { zh: '2 分鐘前', en: '2 minutes ago' },
        read: false
      },
      {
        id: '2',
        type: 'review_complete',
        actorName: { zh: '王大偉', en: 'David Wang' },
        taskName: { zh: '任務 A', en: 'Task A' },
        time: { zh: '15 分鐘前', en: '15 minutes ago' },
        read: false
      },
      {
        id: '3',
        type: 'dry_run_all_done',
        actorName: null,
        taskName: { zh: '任務 B', en: 'Task B' },
        time: { zh: '1 小時前', en: '1 hour ago' },
        read: false
      },
      {
        id: '4',
        type: 'formal_annotation_all_done',
        actorName: null,
        taskName: { zh: '任務 C', en: 'Task C' },
        time: { zh: '2 小時前', en: '2 hours ago' },
        read: true
      },
      {
        id: '5',
        type: 'assignment_created_annotator',
        actorName: null,
        taskName: { zh: '任務 D', en: 'Task D' },
        time: { zh: '3 小時前', en: '3 hours ago' },
        read: true
      },
      {
        id: '6',
        type: 'assignment_created_reviewer',
        actorName: null,
        taskName: { zh: '任務 E', en: 'Task E' },
        time: { zh: '4 小時前', en: '4 hours ago' },
        read: true
      }
    ];

    function getLocalizedValue(value, lang) {
      var normalizedLang = normalizeLang(lang);
      if (value && typeof value === 'object') {
        return value[normalizedLang] || value.zh || value.en || '';
      }
      return value || '';
    }

    function getNotifMessage(notif, lang) {
      var t = notificationI18n[normalizeLang(lang)];
      var actorName = getLocalizedValue(notif.actorName, lang);
      var taskName = getLocalizedValue(notif.taskName, lang);
      switch (notif.type) {
        case 'annotation_complete': return t.eventAnnotationComplete(actorName, taskName);
        case 'review_complete': return t.eventReviewComplete(actorName, taskName);
        case 'dry_run_all_done': return t.eventDryRunAllDone(taskName);
        case 'formal_annotation_all_done': return t.eventFormalAnnotationAllDone(taskName);
        case 'assignment_created_annotator': return t.eventAssignmentAnnotator(taskName);
        case 'assignment_created_reviewer': return t.eventAssignmentReviewer(taskName);
        default: return taskName;
      }
    }

    function renderNotifList(lang) {
      if (!notifList) return;
      while (notifList.firstChild) notifList.removeChild(notifList.firstChild);
      if (mockNotifs.length === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'notif-empty';
        emptyDiv.textContent = notificationI18n[normalizeLang(lang)].emptyText;
        notifList.appendChild(emptyDiv);
        return;
      }
      mockNotifs.forEach(function (n) {
        var isAssign = n.type === 'assignment_created_annotator' || n.type === 'assignment_created_reviewer';
        var itemDiv = document.createElement('div');
        itemDiv.className = 'notif-item' + (n.read ? ' is-read' : '');

        var iconSpan = document.createElement('span');
        iconSpan.className = 'notif-item-icon' + (isAssign ? ' notif-icon-assign' : ' notif-icon-check');
        // Lucide plus / check — static markup, no user data
        iconSpan.innerHTML = isAssign
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
        itemDiv.appendChild(iconSpan);

        var bodyDiv = document.createElement('div');
        bodyDiv.className = 'notif-item-body';
        var textP = document.createElement('p');
        textP.className = 'notif-item-text';
        textP.textContent = getNotifMessage(n, lang);
        bodyDiv.appendChild(textP);
        var timeSpan = document.createElement('span');
        timeSpan.className = 'notif-item-time';
        timeSpan.textContent = getLocalizedValue(n.time, lang);
        bodyDiv.appendChild(timeSpan);
        itemDiv.appendChild(bodyDiv);

        if (!n.read) {
          var dotSpan = document.createElement('span');
          dotSpan.className = 'notif-item-dot';
          dotSpan.setAttribute('aria-hidden', 'true');
          itemDiv.appendChild(dotSpan);
        }
        notifList.appendChild(itemDiv);
      });
    }

    function updateNotifBadge() {
      var unread = mockNotifs.filter(function (n) { return !n.read; }).length;
      var badgeText = unread > 9 ? '9+' : String(unread);
      [notifBadge, document.getElementById('mobileNotificationBadge')].forEach(function (el) {
        if (!el) return;
        if (unread > 0) {
          el.textContent = badgeText;
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      });
    }

    function setNotifBellsExpanded(expanded) {
      [notifBellBtn, document.getElementById('mobileNotificationBellBtn')].forEach(function (btn) {
        if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }

    function openNotifDropdown() {
      if (!notifDropdown || !notifBellBtn) return;
      var lang = readStoredLang();
      var t = notificationI18n[normalizeLang(lang)];
      var titleEl = document.getElementById('notifDropdownTitle');
      if (titleEl) titleEl.textContent = t.dropdownTitle;
      var markAllEl = document.getElementById('notifMarkAllBtn');
      if (markAllEl) markAllEl.textContent = t.markAllRead;
      renderNotifList(lang);
      notifDropdown.classList.remove('hidden');
      setNotifBellsExpanded(true);
    }

    function closeNotifDropdown() {
      if (!notifDropdown || !notifBellBtn) return;
      notifDropdown.classList.add('hidden');
      setNotifBellsExpanded(false);
    }

    [notifBellBtn, document.getElementById('mobileNotificationBellBtn')].forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
          closeNotifDropdown();
        } else {
          openNotifDropdown();
        }
      });
    });

    if (notifMarkAllBtnEl) {
      notifMarkAllBtnEl.addEventListener('click', function () {
        mockNotifs.forEach(function (n) { n.read = true; });
        renderNotifList(readStoredLang());
        updateNotifBadge();
      });
    }

    document.addEventListener('click', function (e) {
      if (!notifDropdown || notifDropdown.classList.contains('hidden')) return;
      if (notifBellBtn && notifBellBtn.contains(e.target)) return;
      if (notifDropdown.contains(e.target)) return;
      closeNotifDropdown();
    });

    updateNotifBadge();
    // ── End notification bell ────────────────────────────────────

    if (window.LabelSuiteTheme && typeof window.LabelSuiteTheme.onChange === 'function') {
      window.LabelSuiteTheme.onChange(syncSidebarThemeToggle);
    }
    if (shortcutCloseBtn) shortcutCloseBtn.addEventListener('click', closeShortcutHelp);
    if (shortcutModal) {
      shortcutModal.addEventListener('click', function (event) {
        if (event.target === shortcutModal) closeShortcutHelp();
      });
      shortcutModal.addEventListener('keydown', function (event) {
        if (event.key !== 'Tab') return;
        var focusables = shortcutModal.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    }
    document.addEventListener('keydown', function (event) {
      if (event.key === '?' && isDesktopViewport() && !isInteractiveSidebarTarget(event.target)) {
        event.preventDefault();
        openShortcutHelp();
      }
      if (event.key === 'Escape' && shortcutModal && !shortcutModal.classList.contains('hidden')) {
        closeShortcutHelp();
      }
      if (event.key === 'Escape' && adminTrigger && adminTrigger.getAttribute('aria-expanded') === 'true') {
        setAdminSubmenuExpanded(adminTrigger, adminSubmenu, false);
      }
    });

    var sidebarNode = mountNode.querySelector('.navbar');
    if (sidebarNode) {
      sidebarNode.addEventListener('click', function (event) {
        if (!shouldEnableDesktopSidebarCollapse()) return;
        if (isInteractiveSidebarTarget(event.target)) return;
        var nextCollapsed = !document.body.classList.contains('sidebar-collapsed');
        persistSidebarCollapsed(nextCollapsed);
        applySidebarCollapsed(nextCollapsed);
        if (nextCollapsed && adminTrigger && adminSubmenu) {
          setAdminSubmenuExpanded(adminTrigger, adminSubmenu, false);
        }
      });
    }

    if (window && window.addEventListener) {
      window.addEventListener('resize', function () {
        applySidebarCollapsed(readStoredSidebarCollapsed());
        if (adminTrigger && adminSubmenu && !isAdminSubmenuAvailable()) {
          setAdminSubmenuExpanded(adminTrigger, adminSubmenu, false);
        }
      });
    }
  }

  function updateUserChip(options) {
    var opts = options || {};
    if (typeof opts.userName === 'string') {
      var desktopName = document.getElementById('userName');
      if (desktopName) desktopName.textContent = opts.userName;
      if (typeof opts.avatarLabel !== 'string') {
        var syncedAvatar = document.getElementById('userAvatar');
        if (syncedAvatar) syncedAvatar.textContent = computeAvatarInitials(opts.userName);
      }
    }
    if (typeof opts.roleLabel === 'string') {
      var roleIndicator = document.getElementById('roleIndicator');
      if (roleIndicator) roleIndicator.textContent = opts.roleLabel;
    }
    if (typeof opts.avatarLabel === 'string') {
      var avatar = document.getElementById('userAvatar');
      if (avatar) avatar.textContent = opts.avatarLabel;
    }
  }

  window.LabelSuiteSharedSidebar = {
    renderSidebar: renderSidebar,
    mountSidebar: mountSidebar,
    setSystemRole: applySystemRole,
    getStoredSystemRole: readStoredSystemRole,
    getStoredLang: readStoredLang,
    setStoredLang: persistLang,
    setStoredActiveTaskType: persistActiveTaskType,
    getStoredActiveTaskType: readStoredActiveTaskType,
    setStoredSidebarCollapsed: persistSidebarCollapsed,
    getStoredSidebarCollapsed: readStoredSidebarCollapsed,
    applySidebarCollapsed: applySidebarCollapsed,
    applyGlobalLanguage: applyGlobalLanguage,
    updateUserChip: updateUserChip,
    registerWorkspaceUnsavedPredicate: registerWorkspaceUnsavedPredicate,
    BYPASS_WORDING: BYPASS_WORDING,
  };
})();

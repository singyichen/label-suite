(function () {
  var SYSTEM_ROLE_STORAGE_KEY = 'labelsuite.systemRole';
  var LANG_STORAGE_KEY = 'labelsuite.lang';
  var ACTIVE_TASK_TYPE_STORAGE_KEY = 'labelsuite.activeTaskType';
  var SIDEBAR_COLLAPSED_STORAGE_KEY = 'labelsuite.sidebarCollapsed';

  function normalizeSystemRole(role) {
    return role === 'super_admin' ? 'super_admin' : 'user';
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
      workspaceSubmit: '提交目前標註',
      workspacePrevious: '上一筆',
      workspaceNext: '下一筆',
      reviewTitle: '審核',
      reviewApprove: '通過目前結果',
      reviewReject: '退回目前結果',
      reviewApproveAll: '全部通過',
      reviewRejectAll: '全部退回',
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
      reviewTitle: 'Review',
      reviewApprove: 'Approve current result',
      reviewReject: 'Reject current result',
      reviewApproveAll: 'Approve all',
      reviewRejectAll: 'Reject all',
      switchToDark: 'Switch to dark mode',
      switchToLight: 'Switch to light mode'
    }
  };

  function setTextById(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateShortcutHelpLanguage(lang) {
    var t = shortcutI18n[normalizeLang(lang)];
    [
      'shortcutHelpBtn',
      'mobileShortcutHelpBtn'
    ].forEach(function (id) {
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
    setTextById('shortcutReviewTitle', t.reviewTitle);
    setTextById('shortcutReviewApprove', t.reviewApprove);
    setTextById('shortcutReviewReject', t.reviewReject);
    setTextById('shortcutReviewApproveAll', t.reviewApproveAll);
    setTextById('shortcutReviewRejectAll', t.reviewRejectAll);
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

  function applySidebarCollapsed(collapsed) {
    var isCollapsed = normalizeSidebarCollapsed(collapsed) && shouldEnableDesktopSidebarCollapse();
    if (document && document.body) {
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    }
  }

  function isInteractiveSidebarTarget(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('a, button, input, select, textarea, label, [role="button"], [data-no-sidebar-toggle="true"]');
  }

  function shouldHideAdminByRole(systemRole) {
    return systemRole !== 'super_admin';
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
    var brandHref = opts.brandHref || dashboardHref;
    var mobileUserName = opts.mobileUserName || 'Mandy Chen';
    var userName = opts.userName || 'Mandy Chen';
    var roleIndicator = opts.roleIndicator || '一般使用者';

    var navItems = [
      {
        key: 'dashboard',
        href: dashboardHref,
        labelId: 'navDashboard',
        defaultLabel: '儀表板',
        icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>'
      },
      {
        key: 'task-management',
        href: taskHref,
        labelId: 'navTaskManagement',
        defaultLabel: '任務管理',
        icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>'
      },
      {
        key: 'annotation',
        href: annotationHref,
        labelId: 'navAnnotation',
        defaultLabel: '標記作業',
        icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
      },
      {
        key: 'dataset',
        href: datasetHref,
        labelId: 'navDataset',
        defaultLabel: '資料集分析',
        icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h18v18H3z"/><path d="M9 9h6v6H9z"/><path d="M3 9h6"/><path d="M15 9h6"/></svg>'
      },
      {
        key: 'admin',
        href: adminHref,
        labelId: 'navAdmin',
        defaultLabel: '系統管理',
        itemId: 'navAdminItem',
        hidden: shouldHideAdminByRole(systemRole),
        icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
      },
      {
        key: 'profile',
        href: profileHref,
        labelId: 'navProfile',
        defaultLabel: '個人設定',
        icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
      }
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
          '<span id="mobileUserName" class="mobile-user-name">' + mobileUserName + '</span>' +
          '<button id="mobileLangToggle" class="mobile-lang-toggle" aria-label="切換語言">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>' +
            '<span id="mobileLangLabel">ZH</span>' +
          '</button>' +
          '<button id="mobileShortcutHelpBtn" class="mobile-shortcut-help-btn" data-testid="mobile-shortcut-help-button" aria-label="快捷鍵" title="快捷鍵">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01"/><path d="M10 9h.01"/><path d="M14 9h.01"/><path d="M18 9h.01"/><path d="M8 13h8"/></svg>' +
          '</button>' +
          '<button id="mobileThemeToggleBtn" class="mobile-theme-toggle-btn" data-testid="mobile-theme-toggle" type="button" aria-label="切換為深色模式" title="切換為深色模式">' +
            '<svg data-theme-toggle-icon="moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' +
            '<svg data-theme-toggle-icon="sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>' +
          '</button>' +
          '<button id="mobileLogoutBtn" class="mobile-top-logout" aria-label="登出" title="登出">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
          '</button>' +
        '</div>' +

        '<nav class="navbar-center" aria-label="Main navigation">' +
          navItems.map(function (item) { return navItem(item, activeNav); }).join('') +
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
          '</div>' +
          '<div class="user-chip">' +
            '<a class="user-chip-profile" href="' + userChipHref + '" aria-label="前往個人設定"' + userChipAriaCurrent + '>' +
              '<div class="avatar" id="userAvatar" aria-hidden="true">U</div>' +
              '<div class="user-info">' +
                '<span class="user-name" id="userName">' + userName + '</span>' +
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
                '<div class="shortcut-help-row"><dt><strong id="shortcutWorkspaceSubmit">提交目前標註</strong></dt>' + keyGroup(['CTRL', 'CMD', 'ENTER']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutWorkspacePrevious">上一筆</strong></dt>' + keyGroup(['ALT', 'LEFT']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutWorkspaceNext">下一筆</strong></dt>' + keyGroup(['ALT', 'RIGHT']) + '</div>' +
              '</dl>' +
            '</div>' +
            '<div class="shortcut-help-section">' +
              '<div class="shortcut-help-section-header">' +
                '<h3 id="shortcutReviewTitle">審核</h3>' +
              '</div>' +
              '<dl class="shortcut-help-list">' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutReviewApprove">通過目前結果</strong></dt>' + keyGroup(['A']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutReviewReject">退回目前結果</strong></dt>' + keyGroup(['R']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutReviewApproveAll">全部通過</strong></dt>' + keyGroup(['SHIFT', 'A']) + '</div>' +
                '<div class="shortcut-help-row"><dt><strong id="shortcutReviewRejectAll">全部退回</strong></dt>' + keyGroup(['SHIFT', 'R']) + '</div>' +
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
    applySystemRole(opts.systemRole || readStoredSystemRole() || (opts.hideAdmin ? 'user' : 'super_admin'));
    var initialCollapsed = typeof opts.sidebarCollapsed === 'boolean'
      ? opts.sidebarCollapsed
      : readStoredSidebarCollapsed();
    applySidebarCollapsed(initialCollapsed);
    updateShortcutHelpLanguage(readStoredLang());
    syncSidebarThemeToggle();

    var loginHref = opts.loginHref || '../account/login.html';
    ['mobileLogoutBtn', 'logoutBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        window.location.href = loginHref;
      });
    });

    var shortcutModal = document.getElementById('shortcutHelpModal');
    var shortcutCloseBtn = document.getElementById('shortcutHelpCloseBtn');
    function openShortcutHelp() {
      if (!shortcutModal) return;
      shortcutModal.classList.remove('hidden');
      if (shortcutCloseBtn) shortcutCloseBtn.focus();
    }
    function closeShortcutHelp() {
      if (!shortcutModal) return;
      shortcutModal.classList.add('hidden');
    }

    ['shortcutHelpBtn', 'mobileShortcutHelpBtn'].forEach(function (id) {
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
    if (window.LabelSuiteTheme && typeof window.LabelSuiteTheme.onChange === 'function') {
      window.LabelSuiteTheme.onChange(syncSidebarThemeToggle);
    }
    if (shortcutCloseBtn) shortcutCloseBtn.addEventListener('click', closeShortcutHelp);
    if (shortcutModal) {
      shortcutModal.addEventListener('click', function (event) {
        if (event.target === shortcutModal) closeShortcutHelp();
      });
    }
    document.addEventListener('keydown', function (event) {
      if (event.key === '?' && !isInteractiveSidebarTarget(event.target)) {
        event.preventDefault();
        openShortcutHelp();
      }
      if (event.key === 'Escape' && shortcutModal && !shortcutModal.classList.contains('hidden')) {
        closeShortcutHelp();
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
      });
    }

    if (window && window.addEventListener) {
      window.addEventListener('resize', function () {
        applySidebarCollapsed(readStoredSidebarCollapsed());
      });
    }
  }

  function updateUserChip(options) {
    var opts = options || {};
    if (typeof opts.userName === 'string') {
      var desktopName = document.getElementById('userName');
      var mobileName = document.getElementById('mobileUserName');
      if (desktopName) desktopName.textContent = opts.userName;
      if (mobileName) mobileName.textContent = opts.userName;
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
  };
})();

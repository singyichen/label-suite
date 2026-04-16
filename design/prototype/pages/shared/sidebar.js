(function () {
  var SYSTEM_ROLE_STORAGE_KEY = 'labelsuite.systemRole';

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
      '<a class="' + className + hiddenClass + '" href="' + config.href + '"' + currentAttr + idAttr + '>' +
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
    var loginHref = opts.loginHref || '../account/login.html';
    var taskHref = opts.taskHref || '#';
    var annotationHref = opts.annotationHref || '#';
    var datasetHref = opts.datasetHref || '#';
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
            '<button class="lang-toggle" id="langToggle" data-testid="lang-toggle" aria-label="切換語言">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>' +
              '<span id="langLabel" data-testid="lang-label">ZH</span>' +
            '</button>' +
            '<span id="mobileUserName" class="mobile-user-name">' + mobileUserName + '</span>' +
            '<button id="mobileLangToggle" class="mobile-lang-toggle" aria-label="切換語言">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>' +
              '<span id="mobileLangLabel">ZH</span>' +
            '</button>' +
            '<button id="mobileLogoutBtn" class="mobile-top-logout" onclick="window.location.href=\'' + loginHref + '\'" aria-label="登出" title="登出">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
            '</button>' +
          '</a>' +
        '</div>' +

        '<nav class="navbar-center" aria-label="Main navigation">' +
          navItems.map(function (item) { return navItem(item, activeNav); }).join('') +
        '</nav>' +

        '<div class="nav-actions">' +
          '<div class="user-chip">' +
            '<a class="user-chip-profile" href="' + userChipHref + '" aria-label="前往個人設定"' + userChipAriaCurrent + '>' +
              '<div class="avatar" id="userAvatar" aria-hidden="true">U</div>' +
              '<div class="user-info">' +
                '<span class="user-name" id="userName">' + userName + '</span>' +
                '<span class="user-role" id="roleIndicator" data-testid="role-indicator">' + roleIndicator + '</span>' +
              '</div>' +
            '</a>' +
            '<button id="logoutBtn" class="logout-btn" onclick="window.location.href=\'' + loginHref + '\'" aria-label="登出" title="登出">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
            '</button>' +
          '</div>' +
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

    // The brand wrapper is an anchor. Prevent language toggles from bubbling
    // into anchor navigation when clicked.
    ['langToggle', 'mobileLangToggle', 'mobileLogoutBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
      });
    });
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
    updateUserChip: updateUserChip,
  };
})();

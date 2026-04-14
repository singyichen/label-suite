/**
 * Prototype Navigation Bar
 *
 * Injects a fixed role-switcher bar at the top of every prototype page.
 * Not part of the real product — purely a demo navigation aid.
 *
 * Usage: <script src="../../shared/proto-bar.js"></script>
 * (adjust relative path per page depth)
 */

(function () {
  const ROLES = [
    { key: 'project_leader', labelZh: '專案負責人', emoji: '👑' },
    { key: 'annotator',      labelZh: '標註員',     emoji: '✏️' },
    { key: 'reviewer',       labelZh: '審核員',     emoji: '🔍' },
    { key: 'super_admin',    labelZh: '系統管理員', emoji: '⚙️' },
  ];

  const BAR_CSS = `
    #proto-bar {
      position: fixed; top: 0; left: 0; right: 0; height: 36px;
      background: #fef9c3; border-bottom: 1.5px solid #fde047;
      display: flex; align-items: center; gap: 8px; padding: 0 16px;
      z-index: 9999; font-family: 'Inter', system-ui, sans-serif;
      font-size: 12px; color: #713f12; user-select: none;
    }
    #proto-bar .proto-badge {
      background: #fde047; border-radius: 4px; padding: 2px 7px;
      font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
      font-size: 10px; flex-shrink: 0;
    }
    #proto-bar .proto-divider {
      width: 1px; height: 18px; background: #fde047; flex-shrink: 0;
    }
    #proto-bar .proto-label { flex-shrink: 0; font-weight: 500; }
    #proto-bar .proto-role-btns { display: flex; gap: 4px; flex-wrap: wrap; }
    #proto-bar .proto-role-btn {
      border: 1.5px solid transparent; border-radius: 5px;
      padding: 2px 9px; cursor: pointer; font-family: inherit;
      font-size: 12px; font-weight: 500; background: transparent;
      color: #713f12; transition: background 0.12s, border-color 0.12s;
      white-space: nowrap;
    }
    #proto-bar .proto-role-btn:hover  { background: #fef08a; border-color: #ca8a04; }
    #proto-bar .proto-role-btn.active { background: #ca8a04; color: #fff; border-color: #ca8a04; }
    #proto-bar .proto-logout {
      margin-left: auto; border: 1.5px solid #ca8a04; border-radius: 5px;
      padding: 2px 9px; cursor: pointer; font-family: inherit;
      font-size: 12px; font-weight: 500; background: transparent;
      color: #92400e; transition: background 0.12s; flex-shrink: 0;
    }
    #proto-bar .proto-logout:hover { background: #fef08a; }
    body.proto-bar-active { padding-top: 36px !important; }
    body.proto-bar-active > [role="banner"] { top: 36px !important; }
  `;

  function currentRole() {
    return sessionStorage.getItem('proto_role');
  }

  function switchRole(roleKey) {
    sessionStorage.setItem('proto_role', roleKey);
    window.location.reload();
  }

  /** Resolve login.html path relative to the current page */
  function loginUrl() {
    const path = window.location.pathname;
    const pagesIdx = path.indexOf('/pages/');
    if (pagesIdx === -1) return '#';
    const afterPages = path.slice(pagesIdx + '/pages/'.length);
    const depth = afterPages.split('/').length - 1;
    return '../'.repeat(depth) + 'account/login.html';
  }

  function el(tag, cls) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function inject() {
    const role = currentRole();
    if (!role) return;

    const styleTag = document.createElement('style');
    styleTag.textContent = BAR_CSS;
    document.head.appendChild(styleTag);

    const bar = el('div');
    bar.id = 'proto-bar';

    const badge = el('span', 'proto-badge');
    badge.textContent = 'Prototype';

    const divider = el('span', 'proto-divider');

    const label = el('span', 'proto-label');
    label.textContent = '視角：';

    const btnGroup = el('div', 'proto-role-btns');
    ROLES.forEach(r => {
      const btn = el('button', 'proto-role-btn' + (r.key === role ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-pressed', r.key === role ? 'true' : 'false');
      btn.textContent = r.emoji + ' ' + r.labelZh;
      btn.dataset.role = r.key;
      btn.addEventListener('click', () => switchRole(r.key));
      btnGroup.appendChild(btn);
    });

    const logoutBtn = el('button', 'proto-logout');
    logoutBtn.type = 'button';
    logoutBtn.textContent = '← 返回登入';
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('proto_role');
      window.location.href = loginUrl();
    });

    bar.appendChild(badge);
    bar.appendChild(divider);
    bar.appendChild(label);
    bar.appendChild(btnGroup);
    bar.appendChild(logoutBtn);

    document.body.insertAdjacentElement('afterbegin', bar);
    document.body.classList.add('proto-bar-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

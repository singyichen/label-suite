(function (global) {
  'use strict';

  var dashboard = global.LabelSuiteDashboard;
  if (!dashboard || !dashboard.data || !dashboard.i18n) return;
  if (!dashboard.data.roleLists
    || !dashboard.data.roleLists.annotator
    || !dashboard.data.roleLists.reviewer) return;

  var data = dashboard.data;
  var i18n = dashboard.i18n;
  var lang = global.LabelSuiteSharedSidebar.getStoredLang();
  var scenario = 'user';

  /* FR-018/FR-019: task_membership load simulation. Real duration is
     arbitrary (prototype has no backend); short enough to stay
     unobtrusive, long enough for the skeleton to be observable. */
  var MEMBERSHIP_LOAD_DELAY_MS = 400;
  var membershipState = 'loading';

  var RUN_TYPE_CLASS = {
    official_run: 'badge-official',
    dry_run: 'badge-dry-run',
  };
  var STATUS_CLASS = {
    in_progress: 'badge-info',
    waiting_confirmation: 'badge-warning',
    continue: 'badge-info',
    resume: 'badge-warning',
    pending_review: 'badge-warning',
  };

  /* Issue #187: sort control for the Annotator/Reviewer task lists.
     'progress' is the only structured numeric field the assignment seed
     model (dashboard.assignments.js) exposes -- there is no separate
     "last submission time" or "pending review count" field (those only
     ever appear embedded inside the localized `detail` text), so only a
     progress-based key is offered here. */
  var taskListSort = { annotator: 'default', reviewer: 'default' };
  var SORT_COMPARATORS = {
    progress_desc: function (a, b) {
      return (Number(b.progress) || 0) - (Number(a.progress) || 0);
    },
    progress_asc: function (a, b) {
      return (Number(a.progress) || 0) - (Number(b.progress) || 0);
    },
  };

  function sortEntries(entries, sortKey) {
    var comparator = SORT_COMPARATORS[sortKey];
    return comparator ? entries.slice().sort(comparator) : entries;
  }

  function localizedText(source) {
    return (source && (source[lang] || source.zh || source.en)) || '';
  }

  function t(key) {
    var dictionary = i18n[lang] || i18n.zh;
    return dictionary[key] || key;
  }

  function tNested(group, key) {
    var dictionary = i18n[lang] || i18n.zh;
    var nested = dictionary[group] || {};
    return nested[key] || key;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildMap(items, keyName) {
    var map = Object.create(null);
    items.forEach(function (item) {
      if (item && item[keyName]) map[item[keyName]] = item;
    });
    return map;
  }

  function scenarioToSystemRole(scenarioKey) {
    return scenarioKey === 'super_admin_data' ? 'super_admin' : 'user';
  }

  function scenarioToAvatarLabel(scenarioKey) {
    var map = {
      user: 'U',
      super_admin_data: 'SA',
      project_leader: 'PL',
      annotator: 'A',
      reviewer: 'R',
    };
    return map[scenarioKey] || 'U';
  }

  function syncSidebarIdentity() {
    var roleLabel = t('scenarioPills')[scenario] || t('scenarioPills').user;
    global.LabelSuiteSharedSidebar.updateUserChip({
      roleLabel: roleLabel,
      avatarLabel: scenarioToAvatarLabel(scenario),
    });
  }

  function getOutputTypeLabel(meta) {
    return lang === 'en' ? meta.en : meta.zh;
  }

  function renderOutputTags(task, outputTypeMap) {
    var labels = [];
    var tags = task.outputTypes.map(function (outputType) {
      var meta = outputTypeMap[outputType];
      var label = meta ? getOutputTypeLabel(meta) : outputType;
      var badgeClass = meta
        ? meta.badgeClass
        : 'badge-task-type-default';
      labels.push(label);
      return '<span class="badge output-type-tag '
        + escapeHtml(badgeClass)
        + '">'
        + escapeHtml(label)
        + '</span>';
    }).join('');
    var typeSeparator = lang === 'en' ? ', ' : '、';
    var ariaLabel = t('outputTypeGroupAriaTpl')
      .replace('{types}', labels.join(typeSeparator));
    return '<div class="output-type-tags" role="group" aria-label="'
      + escapeHtml(ariaLabel)
      + '">'
      + tags
      + '</div>';
  }

  function getRunTypeText(entry) {
    return localizedText(entry.runTypeText)
      || tNested('runTypeLabel', entry.runType);
  }

  function getStatusText(entry) {
    return localizedText(entry.statusText)
      || tNested('statusLabel', entry.status);
  }

  function getActionText(entry, role) {
    return localizedText(entry.actionText)
      || tNested('actionLabel', role);
  }

  function getTaskTitle(task) {
    return lang === 'en' ? task.nameEn : task.nameZh;
  }

  function createTaskCard(entry, task, role, index, outputTypeMap) {
    var isInteractive = role === 'annotator' || role === 'reviewer';
    var cardClass = 'list-item' + (isInteractive ? ' role-task-card' : '');
    /* role=button + tabindex mirror the pending-IAA stat pattern
       (issue #186): the row click must stay keyboard operable
       (issue #311). aria-label gives the row an accessible name (the
       task title) without swallowing the inner quick-action button's
       own name into the row's computed name. */
    var interactiveAttributes = isInteractive
      ? ' data-role="' + escapeHtml(role)
        + '" data-task-index="' + String(index) + '"'
        + ' role="button" tabindex="0"'
        + ' aria-label="' + escapeHtml(getTaskTitle(task)) + '"'
      : '';
    var slotId = entry.slotId || '';
    var titleId = slotId ? ' id="' + escapeHtml(slotId + 'Title') + '"' : '';
    var detailId = slotId ? ' id="' + escapeHtml(slotId + 'Detail') + '"' : '';
    var runTypeId = slotId ? ' id="' + escapeHtml(slotId + 'RunType') + '"' : '';
    var statusId = slotId ? ' id="' + escapeHtml(slotId + 'Badge') + '"' : '';
    var runTypeClass = entry.runTypeClass
      || RUN_TYPE_CLASS[entry.runType]
      || 'badge-dry-run';
    var statusClass = entry.statusClass
      || STATUS_CLASS[entry.status]
      || 'badge-info';
    var progress = Math.max(0, Math.min(100, Number(entry.progress) || 0));
    var actionMarkup = '';

    if (isInteractive) {
      actionMarkup =
        '<div class="task-item-actions">'
        + '<button class="btn btn-primary role-task-action-btn"'
        + ' data-role="' + escapeHtml(role) + '"'
        + ' data-task-index="' + String(index) + '">'
        + escapeHtml(getActionText(entry, role))
        + '</button>'
        + '</div>';
    }

    return '<div class="' + cardClass + '"'
      + ' data-example-task-id="' + escapeHtml(task.id) + '"'
      + interactiveAttributes
      + '>'
      + '<div class="task-item-header">'
      + '<div class="task-item-summary">'
      + '<span' + titleId + ' class="list-item-title">'
      + escapeHtml(getTaskTitle(task))
      + '</span>'
      + '<span' + detailId + ' class="list-item-detail">'
      + escapeHtml(localizedText(entry.detail))
      + '</span>'
      + '</div>'
      + '<div class="task-item-meta">'
      + '<div class="task-item-badges">'
      + renderOutputTags(task, outputTypeMap)
      + '<span' + runTypeId + ' class="badge '
      + escapeHtml(runTypeClass) + '">'
      + escapeHtml(getRunTypeText(entry))
      + '</span>'
      + '<span' + statusId + ' class="badge '
      + escapeHtml(statusClass) + '">'
      + escapeHtml(getStatusText(entry))
      + '</span>'
      + '</div>'
      + actionMarkup
      + '</div>'
      + '</div>'
      + '<div class="progress" style="margin-top: 10px;">'
      + '<span style="width: ' + String(progress) + '%;"></span>'
      + '</div>'
      + '</div>';
  }

  /* Reviewer entries may pin a reviewer identity (review-flow demo tasks
     enter as the can_arbitrate reviewer, FR-060); annotation-list forwards
     it into every workspace link (FR-049). Absent -> param stays absent and
     both pages fall back to the same default roster identity. */
  /* Issue #449: the reviewer quick-review target is DERIVED from the live
     review-unit state for the signed-in reviewer instead of the
     dashboard.assignments.js `latestUnfinishedSampleId` seed, which always
     pointed at the task's first dataset record -- already finalized on most
     tasks, so the CTA opened a read-only card. Priority and eligibility live
     in annotation-workspace.data.js (the same enumeration the card summary
     counts); this only forwards the signed-in reviewer. */
  function nextActionableUnit(entry) {
    var workspaceData = global.LabelSuiteAnnotationWorkspaceData;
    if (!workspaceData || !workspaceData.findNextActionableReviewUnit) return null;
    return workspaceData.findNextActionableReviewUnit(
      entry.exampleTaskId,
      entry.runType,
      entry.reviewerId || workspaceData.DEFAULT_REVIEWER_ID
    );
  }

  function identityQuery(role, entry) {
    return role === 'reviewer' && entry.reviewerId
      ? '&reviewer_id=' + encodeURIComponent(entry.reviewerId)
      : '';
  }

  /* `notice` surfaces WHY the list was opened when the caller wanted the
     workspace but had nothing to open (issue #449); annotation-list renders
     the matching empty state. Absent for a plain list click. */
  function openAnnotationList(role, entry, notice) {
    global.LabelSuiteAnalytics.track('prototype_cta_clicked', {
      cta: role === 'annotator'
        ? 'annotator_task_list_open'
        : 'reviewer_task_list_open',
      run_type: entry.runType,
      task_role: role,
      lang: lang,
      scenario: scenario,
    });
    /* task_type is the independent legacy routing compatibility field
       (spec 012 FR-010B1/FR-011B1, issue #311): sourced from the
       annotationTaskType assignment seed, never derived from outputs[].
       annotation-list resolves the task from task_id and ignores it. */
    var listUrl = '../annotation/annotation-list.html?task_id='
      + encodeURIComponent(entry.exampleTaskId || '')
      + '&role=' + encodeURIComponent(role)
      + '&run_type=' + encodeURIComponent(entry.runType || '')
      + '&task_type=' + encodeURIComponent(entry.annotationTaskType || '')
      + identityQuery(role, entry)
      + (notice ? '&notice=' + encodeURIComponent(notice) : '');
    global.location.href = listUrl;
  }

  function openAnnotationWorkspace(role, entry) {
    global.LabelSuiteAnalytics.track('prototype_cta_clicked', {
      cta: role === 'annotator'
        ? 'annotator_quick_continue'
        : 'reviewer_quick_review',
      run_type: entry.runType,
      task_role: role,
      lang: lang,
      scenario: scenario,
    });
    var sampleId = entry.latestUnfinishedSampleId || '';
    var annotatorId = '';
    if (role === 'reviewer') {
      var unit = nextActionableUnit(entry);
      /* Nothing this reviewer may act on: the list states that outright.
         Falling back to the seed's first record would reopen the very
         read-only unit this CTA exists to skip past (issue #449). */
      if (!unit) {
        openAnnotationList(role, entry, 'no_actionable_review');
        return;
      }
      sampleId = unit.sampleId;
      annotatorId = unit.annotatorId;
    }
    if (!sampleId) {
      openAnnotationList(role, entry);
      return;
    }
    var workspaceUrl = '../annotation/annotation-workspace.html?task_id='
      + encodeURIComponent(entry.exampleTaskId || '')
      + '&sample_id=' + encodeURIComponent(sampleId)
      + '&role=' + encodeURIComponent(role)
      + '&run_type=' + encodeURIComponent(entry.runType || '')
      + identityQuery(role, entry)
      /* A review unit is sample x annotator, so the annotator the target
         unit belongs to has to travel with it -- without it the workspace
         resolves the default annotator and opens a different unit. */
      + (annotatorId ? '&annotator_id=' + encodeURIComponent(annotatorId) : '');
    global.location.href = workspaceUrl;
  }

  function bindRoleTaskEvents(container, role, entries) {
    if (role !== 'annotator' && role !== 'reviewer') return;
    Array.prototype.forEach.call(
      container.querySelectorAll('.role-task-card'),
      function (card) {
        function openList() {
          var target = entries[Number(card.dataset.taskIndex)];
          if (target) openAnnotationList(role, target);
        }
        card.addEventListener('click', openList);
        card.addEventListener('keydown', function (event) {
          /* Only react to keys on the card itself: keydown bubbling up
             from the inner quick-action button must keep its native
             workspace routing (issue #311). */
          if (event.target !== card) return;
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            openList();
          }
        });
      }
    );
    Array.prototype.forEach.call(
      container.querySelectorAll('.role-task-action-btn'),
      function (button) {
        button.addEventListener('click', function (event) {
          event.stopPropagation();
          var target = entries[Number(button.dataset.taskIndex)];
          if (target) openAnnotationWorkspace(role, target);
        });
      }
    );
  }

  /* Issue #450: a reviewer card's summary and progress bar are DERIVED from
     the live review-unit state (annotation-workspace.data.js
     computeReviewSummary -- the single formula source shared with
     annotation-list), so finishing a review updates the card instead of
     leaving the seed's prebuilt string contradicting the unit rows. Tasks
     with no stored review-unit state have nothing to derive and keep their
     seeded illustrative summary. Applied before sortEntries() so the
     progress sort orders by the same number the card shows. */
  function deriveReviewerEntry(entry) {
    var workspaceData = global.LabelSuiteAnnotationWorkspaceData;
    if (!workspaceData || !workspaceData.computeReviewSummary) return entry;
    var summary = workspaceData.computeReviewSummary(entry.exampleTaskId, entry.runType);
    if (!summary.derivable) return entry;
    var derived = {};
    Object.keys(entry).forEach(function (key) { derived[key] = entry[key]; });
    derived.detail = workspaceData.formatReviewSummary(summary, entry.iaa);
    derived.progress = summary.coveragePct;
    return derived;
  }

  function renderTaskList(containerId, listKey, role, sortKey) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var taskMap = buildMap(data.tasks, 'id');
    var outputTypeMap = buildMap(data.outputTypes, 'key');
    var sourceEntries = data.roleLists[listKey] || [];
    if (role === 'reviewer') sourceEntries = sourceEntries.map(deriveReviewerEntry);
    var entries = sortEntries(sourceEntries, sortKey);
    var markup = entries.map(function (entry, index) {
      var task = taskMap[entry.exampleTaskId];
      if (!task || !Array.isArray(task.outputTypes)) return '';
      return createTaskCard(entry, task, role, index, outputTypeMap);
    }).join('');
    if (!markup) {
      markup = '<p class="list-empty" data-testid="task-list-empty">'
        + escapeHtml(t('taskListEmpty'))
        + '</p>';
    }
    container.innerHTML = markup;
    bindRoleTaskEvents(container, role, entries);
  }

  function renderTaskLists() {
    renderTaskList('adminTaskList', 'admin', 'super_admin');
    renderTaskList(
      'plTaskList',
      'projectLeader',
      'project_leader'
    );
    renderTaskList(
      'annotatorTaskList',
      'annotator',
      'annotator',
      taskListSort.annotator
    );
    renderTaskList(
      'reviewerTaskList',
      'reviewer',
      'reviewer',
      taskListSort.reviewer
    );
  }

  function bindSortSelect(selectId, role) {
    var select = document.getElementById(selectId);
    if (!select) return;
    select.addEventListener('change', function () {
      taskListSort[role] = select.value;
      global.LabelSuiteAnalytics.track('prototype_cta_clicked', {
        cta: role === 'annotator'
          ? 'annotator_task_list_sorted'
          : 'reviewer_task_list_sorted',
        sort_key: select.value,
        task_role: role,
        lang: lang,
        scenario: scenario,
      });
      renderTaskLists();
    });
  }

  function openTaskList(taskRole, status, keyword) {
    var systemRole = taskRole === 'super_admin'
      ? 'super_admin'
      : 'user';
    global.LabelSuiteSharedSidebar.setSystemRole(systemRole);
    var url = '../task-management/task-list.html?task_role='
      + encodeURIComponent(taskRole);
    if (status) url += '&status=' + encodeURIComponent(status);
    if (keyword) url += '&keyword=' + encodeURIComponent(keyword);
    global.location.href = url;
  }

  function bindPendingIaaStatEvent(elementId, taskRole) {
    var element = document.getElementById(elementId);
    if (!element) return;
    function activate() {
      global.LabelSuiteAnalytics.track('prototype_cta_clicked', {
        cta: 'pending_iaa_stat_clicked',
        task_role: taskRole,
        lang: lang,
        scenario: scenario,
      });
      openTaskList(taskRole, 'waiting_iaa_confirmation');
    }
    element.addEventListener('click', activate);
    element.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        activate();
      }
    });
  }

  function applyLang(language) {
    var nextLang = language === 'en' ? 'en' : 'zh';
    var dictionary = i18n[nextLang];
    lang = global.LabelSuiteSharedSidebar.applyGlobalLanguage(nextLang, {
      langToggleAria: dictionary.langToggleAria,
    });
    document.title = dictionary.pageTitle;

    ['logoutBtn', 'mobileLogoutBtn'].forEach(function (id) {
      var button = document.getElementById(id);
      if (!button) return;
      button.setAttribute('aria-label', dictionary.logoutAria);
      button.setAttribute('title', dictionary.logoutTitle);
    });

    syncSidebarIdentity();
    Array.prototype.forEach.call(
      document.querySelectorAll('.scenario-pill'),
      function (pill) {
        var key = pill.dataset.scenario;
        if (dictionary.scenarioPills[key]) {
          pill.textContent = dictionary.scenarioPills[key];
        }
      }
    );
    Object.keys(dictionary).forEach(function (key) {
      if (typeof dictionary[key] !== 'string') return;
      var element = document.getElementById(key);
      if (element) element.textContent = dictionary[key];
    });
    renderTaskLists();
  }

  function handleLangToggle(source) {
    var previousLang = lang;
    applyLang(lang === 'zh' ? 'en' : 'zh');
    global.LabelSuiteAnalytics.track('prototype_lang_switched', {
      source: source,
      from_lang: previousLang,
      to_lang: lang,
      scenario: scenario,
    });
  }

  function applyScenario(nextScenario) {
    scenario = nextScenario;
    Array.prototype.forEach.call(
      document.querySelectorAll('.scenario-pill'),
      function (item) {
        item.classList.toggle(
          'active',
          item.dataset.scenario === scenario
        );
      }
    );
    global.LabelSuiteSharedSidebar.setSystemRole(
      scenarioToSystemRole(scenario)
    );
    syncSidebarIdentity();
    Array.prototype.forEach.call(
      document.querySelectorAll('.view'),
      function (view) {
        view.classList.remove('is-active');
      }
    );
    var targetView = document.getElementById('view-' + scenario);
    if (targetView) targetView.classList.add('is-active');
  }

  function syncScenarioToUrl() {
    var url = new URL(global.location.href);
    if (scenario === 'user') {
      url.searchParams.delete('scenario');
    } else {
      url.searchParams.set('scenario', scenario);
    }
    global.history.replaceState(null, '', url.toString());
  }

  /* FR-018/FR-019: toggles the Skeleton / error-state / real-content
     sections. Only one is ever visible; the real content stays hidden
     until membershipState reaches 'ready'. */
  function renderMembershipState() {
    var skeleton = document.getElementById('dashboardSkeleton');
    var errorState = document.getElementById('dashboardErrorState');
    var contentGrid = document.getElementById('contentGrid');
    if (!skeleton || !errorState || !contentGrid) return;

    /* Error-state text (#errorLoadTitle/#errorLoadDesc/#errorRetryLabel)
       is already set by applyLang()'s generic id-matching loop, called
       unconditionally at init -- no separate text assignment needed here. */
    skeleton.classList.toggle('hidden', membershipState !== 'loading');
    errorState.classList.toggle('hidden', membershipState !== 'error');
    contentGrid.classList.toggle('hidden', membershipState !== 'ready');
  }

  /* Runs the rest of init() once task_membership is confirmed ready --
     these steps depend on the scenario/task data becoming visible. */
  function onMembershipReady() {
    global.LabelSuiteSharedSidebar.setSystemRole(
      scenarioToSystemRole(scenario)
    );
    applyScenarioFromUrl();
    Array.prototype.forEach.call(
      document.querySelectorAll('.scenario-pill'),
      function (pill) {
        pill.disabled = false;
      }
    );
  }

  function loadMembership() {
    var requestedView = new URL(global.location.href).searchParams.get('view');
    membershipState = 'loading';
    renderMembershipState();

    if (requestedView === 'skeleton') return; /* stays loading forever, for deterministic testing */

    global.setTimeout(function () {
      membershipState = requestedView === 'error' ? 'error' : 'ready';
      renderMembershipState();
      if (membershipState === 'ready') onMembershipReady();
    }, MEMBERSHIP_LOAD_DELAY_MS);
  }

  function bindRetryButton() {
    var retryButton = document.getElementById('errorRetryLabel');
    if (!retryButton) return;
    retryButton.addEventListener('click', function () {
      global.LabelSuiteAnalytics.track('prototype_dashboard_membership_retry', {});
      /* Retry always succeeds (matches task-list.html's retry precedent --
         demonstrates recovery rather than re-running the same failure). */
      membershipState = 'ready';
      renderMembershipState();
      onMembershipReady();
    });
  }

  function applyScenarioFromUrl() {
    var requested = new URL(global.location.href)
      .searchParams.get('scenario');
    if (!requested || requested === scenario) return;
    if (!document.getElementById('view-' + requested)) return;
    applyScenario(requested);
  }

  function bindScenarioEvents() {
    Array.prototype.forEach.call(
      document.querySelectorAll('.scenario-pill'),
      function (pill) {
        pill.addEventListener('click', function () {
          var previousScenario = scenario;
          applyScenario(pill.dataset.scenario);
          syncScenarioToUrl();
          global.LabelSuiteAnalytics.track(
            'prototype_scenario_switched',
            {
              from_scenario: previousScenario,
              to_scenario: scenario,
              lang: lang,
            }
          );
        });
      }
    );
  }

  function bindStaticEvents() {
    document.getElementById('langToggle').addEventListener(
      'click',
      function () {
        handleLangToggle('desktop_toggle');
      }
    );
    document.getElementById('mobileLangToggle').addEventListener(
      'click',
      function () {
        handleLangToggle('mobile_toggle');
      }
    );
    document.getElementById('ctaLeaderBtn').addEventListener(
      'click',
      function () {
        global.LabelSuiteSharedSidebar.setSystemRole('user');
        global.location.href = '../task-management/task-new.html';
      }
    );
    document.getElementById('ctaAnnotatorBtn').addEventListener(
      'click',
      function () {
        openAnnotationList('annotator', data.roleLists.annotator[0]);
      }
    );
    document.getElementById('ctaReviewerBtn').addEventListener(
      'click',
      function () {
        openAnnotationList('reviewer', data.roleLists.reviewer[0]);
      }
    );
    document.getElementById('adminViewAllBtn').addEventListener(
      'click',
      function () {
        openTaskList('super_admin');
      }
    );
    document.getElementById('plViewAllBtn').addEventListener(
      'click',
      function () {
        openTaskList('project_leader');
      }
    );
    bindPendingIaaStatEvent('adminPendingIaaValue', 'super_admin');
    bindPendingIaaStatEvent('plPendingIaaValue', 'project_leader');
    bindSortSelect('annotatorSortSelect', 'annotator');
    bindSortSelect('reviewerSortSelect', 'reviewer');
  }

  function getTrackingContext() {
    return { lang: lang, scenario: scenario };
  }

  function init() {
    global.LabelSuiteAnalytics.init({ page: 'dashboard' });
    bindScenarioEvents();
    bindStaticEvents();
    global.LabelSuiteAnalytics.bindClickTracks(
      [
        {
          id: 'ctaLeaderBtn',
          eventName: 'prototype_cta_clicked',
          extra: { cta: 'create_first_task' },
        },
        {
          id: 'adminViewAllBtn',
          eventName: 'prototype_cta_clicked',
          extra: { cta: 'admin_view_all_tasks' },
        },
        {
          id: 'plViewAllBtn',
          eventName: 'prototype_cta_clicked',
          extra: { cta: 'project_leader_view_all_tasks' },
        },
        {
          id: 'logoutBtn',
          eventName: 'prototype_logout_clicked',
          extra: { source: 'desktop' },
        },
        {
          id: 'mobileLogoutBtn',
          eventName: 'prototype_logout_clicked',
          extra: { source: 'mobile' },
        },
      ],
      getTrackingContext
    );
    global.LabelSuiteAnalytics.trackPageView(
      'dashboard',
      getTrackingContext
    );
    /* Static chrome (title, sidebar labels, hidden task lists) translates
       immediately so there's no flash of the wrong language once the
       skeleton clears; role/scenario setup waits for onMembershipReady. */
    applyLang(lang);
    bindRetryButton();
    loadMembership();
  }

  dashboard.renderTaskLists = renderTaskLists;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}(window));

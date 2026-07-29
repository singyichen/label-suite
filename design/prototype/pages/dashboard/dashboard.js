(function (global) {
  'use strict';

  var dashboard = global.LabelSuiteDashboard;
  if (!dashboard || !dashboard.data || !dashboard.i18n) return;

  var data = dashboard.data;
  var i18n = dashboard.i18n;
  var lang = global.LabelSuiteSharedSidebar.getStoredLang();
  var scenario = 'user';

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
    var ariaLabel = t('outputTypeGroupAriaTpl')
      .replace('{types}', labels.join('、'));
    if (lang === 'en') {
      ariaLabel = t('outputTypeGroupAriaTpl')
        .replace('{types}', labels.join(', '));
    }
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
    var interactiveAttributes = isInteractive
      ? ' data-role="' + escapeHtml(role)
        + '" data-task-index="' + String(index) + '"'
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

  function setActiveTaskType(taskType) {
    if (
      global.LabelSuiteSharedSidebar
      && typeof global.LabelSuiteSharedSidebar.setStoredActiveTaskType
        === 'function'
    ) {
      global.LabelSuiteSharedSidebar.setStoredActiveTaskType(taskType);
      return;
    }
    try {
      global.localStorage.setItem(
        'labelsuite.activeTaskType',
        String(taskType)
      );
    } catch (error) {
      // Storage is optional in the static prototype.
    }
  }

  function openAnnotationList(role, entry) {
    setActiveTaskType(entry.annotationTaskType);
    global.LabelSuiteAnalytics.track('prototype_cta_clicked', {
      cta: role === 'annotator'
        ? 'annotator_task_list_open'
        : 'reviewer_task_list_open',
      task_type: entry.annotationTaskType,
      run_type: entry.runType,
      task_role: role,
      lang: lang,
      scenario: scenario,
    });
    var listUrl = '../annotation/annotation-list.html?role='
      + encodeURIComponent(role)
      + '&task_id=' + encodeURIComponent(entry.navigationTaskId || '')
      + '&task_type=' + encodeURIComponent(entry.annotationTaskType || '')
      + '&run_type=' + encodeURIComponent(entry.runType || '');
    if (entry.subType) {
      listUrl += '&sub_type=' + encodeURIComponent(entry.subType);
    }
    global.location.href = listUrl;
  }

  function openAnnotationWorkspace(role, entry) {
    setActiveTaskType(entry.annotationTaskType);
    global.LabelSuiteAnalytics.track('prototype_cta_clicked', {
      cta: role === 'annotator'
        ? 'annotator_quick_continue'
        : 'reviewer_quick_review',
      task_type: entry.annotationTaskType,
      run_type: entry.runType,
      task_role: role,
      lang: lang,
      scenario: scenario,
    });
    var sampleId = entry.latestUnfinishedSampleId || '';
    if (!sampleId) {
      openAnnotationList(role, entry);
      return;
    }
    var workspaceUrl = '../annotation/annotation-workspace.html?task_id='
      + encodeURIComponent(entry.navigationTaskId || '')
      + '&sample_id=' + encodeURIComponent(sampleId)
      + '&role=' + encodeURIComponent(role)
      + '&run_type=' + encodeURIComponent(entry.runType || '')
      + '&task_type=' + encodeURIComponent(entry.annotationTaskType || '');
    if (entry.subType) {
      workspaceUrl += '&sub_type=' + encodeURIComponent(entry.subType);
    }
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

  function renderTaskList(containerId, listKey, role) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var taskMap = buildMap(data.tasks, 'id');
    var outputTypeMap = buildMap(data.outputTypes, 'key');
    var entries = data.roleLists[listKey] || [];
    container.innerHTML = entries.map(function (entry, index) {
      var task = taskMap[entry.exampleTaskId];
      if (!task || !Array.isArray(task.outputTypes)) return '';
      return createTaskCard(entry, task, role, index, outputTypeMap);
    }).join('');
    bindRoleTaskEvents(container, role, entries);
  }

  function renderTaskLists() {
    renderTaskList('adminTaskList', 'admin', 'super_admin');
    renderTaskList(
      'plTaskList',
      'projectLeader',
      'project_leader'
    );
    renderTaskList('annotatorTaskList', 'annotator', 'annotator');
    renderTaskList('reviewerTaskList', 'reviewer', 'reviewer');
  }

  function openTaskList(taskRole) {
    var systemRole = taskRole === 'super_admin'
      ? 'super_admin'
      : 'user';
    global.LabelSuiteSharedSidebar.setSystemRole(systemRole);
    global.location.href = '../task-management/task-list.html?task_role='
      + encodeURIComponent(taskRole);
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

  function bindScenarioEvents() {
    Array.prototype.forEach.call(
      document.querySelectorAll('.scenario-pill'),
      function (pill) {
        pill.addEventListener('click', function () {
          var previousScenario = scenario;
          Array.prototype.forEach.call(
            document.querySelectorAll('.scenario-pill'),
            function (item) {
              item.classList.remove('active');
            }
          );
          pill.classList.add('active');
          scenario = pill.dataset.scenario;
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
    global.LabelSuiteSharedSidebar.setSystemRole(
      scenarioToSystemRole(scenario)
    );
    applyLang(lang);
    Array.prototype.forEach.call(
      document.querySelectorAll('.scenario-pill'),
      function (pill) {
        pill.disabled = false;
      }
    );
    document.documentElement.dataset.dashboardReady = 'true';
  }

  dashboard.renderTaskLists = renderTaskLists;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}(window));

(function (global) {
  'use strict';

  var I18N = global.LabelSuiteDatasetAnalysisI18N;
  var model = global.LabelSuiteDatasetAnalysisModel;
  if (!I18N || !model || !global.LabelSuiteDatasetAnalysisView) return;

  var state = model.state;
  var toastTimer = null;
  var searchDebounceTimer = null;
  var view = null;

  function t(key) {
    var dictionary = I18N[state.lang] || I18N.zh;
    return dictionary[key] || key;
  }

  function tNested(group, key) {
    var dictionary = I18N[state.lang] || I18N.zh;
    var nested = dictionary[group] || {};
    return nested[key] || key;
  }

  /* Auto-dismiss per UXC-07: Error never auto-dismisses (manual close only). */
  var TOAST_DURATIONS = { success: 3000, info: 5000, warning: 8000, error: 0 };

  function showToast(message, variant) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var messageElement = document.getElementById('toastMsg');
    if (messageElement) messageElement.textContent = message;
    var v = TOAST_DURATIONS.hasOwnProperty(variant) ? variant : 'success';
    toast.className = 'toast toast-' + v + ' visible';
    global.clearTimeout(toastTimer);
    if (TOAST_DURATIONS[v] > 0) {
      toastTimer = global.setTimeout(function () {
        toast.classList.remove('visible');
      }, TOAST_DURATIONS[v]);
    }
  }

  function hideToast() {
    var toast = document.getElementById('toast');
    if (toast) toast.classList.remove('visible');
    global.clearTimeout(toastTimer);
  }

  function getTrackingContext() {
    return {
      lang: state.lang,
      task_count: state.loadFailed ? 0 : model.getFilteredTasks(tNested).length,
      keyword: state.keyword,
      output_type: state.outputType,
      iaa_status: state.iaaStatus,
      limit: state.limit,
      offset: state.offset,
      load_failed: state.loadFailed,
    };
  }

  function trackAnalytics(eventName, extra) {
    if (!global.LabelSuiteAnalytics) return;
    var payload = getTrackingContext();
    var additions = extra || {};
    Object.keys(additions).forEach(function (key) {
      payload[key] = additions[key];
    });
    global.LabelSuiteAnalytics.track(eventName, payload);
  }

  function syncUrl() {
    var params = new URLSearchParams();
    if (state.keyword) params.set('keyword', state.keyword);
    if (state.outputType) params.set('output_type', state.outputType);
    if (state.iaaStatus) params.set('iaa_status', state.iaaStatus);
    if (state.limit !== 20) params.set('limit', String(state.limit));
    if (state.offset > 0) params.set('offset', String(state.offset));

    var nextUrl = global.location.pathname;
    if (params.toString()) nextUrl += '?' + params.toString();
    global.history.replaceState(null, '', nextUrl);
  }

  function applyLang(language) {
    state.lang = language === 'en' ? 'en' : 'zh';
    document.documentElement.lang = state.lang === 'zh' ? 'zh-TW' : 'en';
    document.title = t('docTitle');

    [
      'pageTitle',
      'pageSubtitle',
      'clearFiltersLabel',
      'thTaskName',
      'thTaskType',
      'thCompletion',
      'thIaaStatus',
      'thRole',
      'navDashboard',
      'navTaskManagement',
      'navAnnotation',
      'navDataset',
      'navAdmin',
      'navProfile',
    ].forEach(function (id) {
      view.setTextContent(id, t(id));
    });

    if (global.LabelSuiteSharedSidebar) {
      global.LabelSuiteSharedSidebar.applyGlobalLanguage(state.lang, {
        langToggleAria: t('langToggleAria'),
        roleLabel: t('roleIndicatorLabel'),
      });
    }

    var toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.setAttribute('aria-label', t('toolbarAriaLabel'));
    var taskTable = document.getElementById('taskTable');
    if (taskTable) taskTable.setAttribute('aria-label', t('tableAriaLabel'));

    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.placeholder = t('searchPlaceholder');
      searchInput.setAttribute('aria-label', t('searchAriaLabel'));
      searchInput.value = state.keyword;
    }

    var outputTypeFilter = document.getElementById('outputTypeFilter');
    if (outputTypeFilter) {
      outputTypeFilter.setAttribute('aria-label', t('outputTypeFilterAria'));
      var outputTypeOptions = [
        { value: '', label: t('allOutputTypes') },
      ];
      model.outputTypes.forEach(function (outputType) {
        outputTypeOptions.push({
          value: outputType.key,
          label: state.lang === 'en' ? outputType.en : outputType.zh,
        });
      });
      view.replaceSelectOptions(
        outputTypeFilter,
        outputTypeOptions,
        state.outputType
      );
    }

    var iaaStatusFilter = document.getElementById('iaaStatusFilter');
    if (iaaStatusFilter) {
      iaaStatusFilter.setAttribute('aria-label', t('iaaStatusFilterAria'));
      view.replaceSelectOptions(
        iaaStatusFilter,
        t('iaaStatusOptions'),
        state.iaaStatus
      );
    }

    var pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) pageSizeSelect.setAttribute('aria-label', t('pageSizeAria'));
    var previousButton = document.getElementById('prevPageBtn');
    if (previousButton) previousButton.setAttribute('aria-label', t('prevPageAria'));
    var nextButton = document.getElementById('nextPageBtn');
    if (nextButton) nextButton.setAttribute('aria-label', t('nextPageAria'));

    view.render();
  }

  function handleLanguageToggle(source) {
    var previousLanguage = state.lang;
    applyLang(state.lang === 'zh' ? 'en' : 'zh');
    trackAnalytics('prototype_lang_switched', {
      source: source,
      from_lang: previousLanguage,
      to_lang: state.lang,
    });
  }

  function clearFilters() {
    global.clearTimeout(searchDebounceTimer);
    state.keyword = '';
    state.outputType = '';
    state.iaaStatus = '';
    state.offset = 0;

    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    trackAnalytics('prototype_dataset_analysis_filters_cleared');
    applyLang(state.lang);
  }

  function bindEvents() {
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function (event) {
        var nextKeyword = event.target.value;
        global.clearTimeout(searchDebounceTimer);
        searchDebounceTimer = global.setTimeout(function () {
          state.keyword = nextKeyword;
          state.offset = 0;
          trackAnalytics('prototype_dataset_analysis_search_changed', {
            keyword: state.keyword,
          });
          view.render();
        }, 300);
      });
    }

    var outputTypeFilter = document.getElementById('outputTypeFilter');
    if (outputTypeFilter) {
      outputTypeFilter.addEventListener('change', function (event) {
        state.outputType = event.target.value;
        state.offset = 0;
        trackAnalytics('prototype_dataset_analysis_filter_changed', {
          filter: 'output_type',
          value: state.outputType || '__all__',
        });
        view.render();
      });
    }

    var iaaStatusFilter = document.getElementById('iaaStatusFilter');
    if (iaaStatusFilter) {
      iaaStatusFilter.addEventListener('change', function (event) {
        state.iaaStatus = event.target.value;
        state.offset = 0;
        trackAnalytics('prototype_dataset_analysis_filter_changed', {
          filter: 'iaa_status',
          value: state.iaaStatus || '__all__',
        });
        view.render();
      });
    }

    var clearFiltersButton = document.getElementById('clearFiltersBtn');
    if (clearFiltersButton) clearFiltersButton.addEventListener('click', clearFilters);

    var previousButton = document.getElementById('prevPageBtn');
    if (previousButton) {
      previousButton.addEventListener('click', function () {
        if (state.offset <= 0) return;
        state.offset = Math.max(0, state.offset - state.limit);
        trackAnalytics('prototype_dataset_analysis_page_changed', {
          source: 'prev',
          to_page: Math.floor(state.offset / state.limit) + 1,
        });
        view.render();
      });
    }

    var nextButton = document.getElementById('nextPageBtn');
    if (nextButton) {
      nextButton.addEventListener('click', function () {
        var total = model.getFilteredTasks(tNested).length;
        if (state.offset + state.limit >= total) return;
        state.offset += state.limit;
        trackAnalytics('prototype_dataset_analysis_page_changed', {
          source: 'next',
          to_page: Math.floor(state.offset / state.limit) + 1,
        });
        view.render();
      });
    }

    var pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', function (event) {
        var nextLimit = Number.parseInt(event.target.value, 10);
        state.limit = model.VALID_LIMITS.indexOf(nextLimit) !== -1
          ? nextLimit
          : 20;
        state.offset = 0;
        trackAnalytics('prototype_dataset_analysis_limit_changed', {
          limit: state.limit,
          offset: state.offset,
        });
        view.render();
      });
    }

    var languageToggle = document.getElementById('langToggle');
    if (languageToggle) {
      languageToggle.addEventListener('click', function () {
        handleLanguageToggle('desktop');
      });
    }
    var mobileLanguageToggle = document.getElementById('mobileLangToggle');
    if (mobileLanguageToggle) {
      mobileLanguageToggle.addEventListener('click', function () {
        handleLanguageToggle('mobile');
      });
    }

    var toastCloseButton = document.getElementById('toastClose');
    if (toastCloseButton) toastCloseButton.addEventListener('click', hideToast);
  }

  function init() {
    model.parseInitialState(global.location.search);
    view = global.LabelSuiteDatasetAnalysisView.create({
      model: model,
      t: t,
      tNested: tNested,
      showToast: showToast,
      trackAnalytics: trackAnalytics,
      syncUrl: syncUrl,
    });
    global.render = view.render;
    bindEvents();

    var initialLanguage = global.LabelSuiteSharedSidebar
      && typeof global.LabelSuiteSharedSidebar.getStoredLang === 'function'
      ? global.LabelSuiteSharedSidebar.getStoredLang()
      : 'zh';
    applyLang(initialLanguage);

    if (global.LabelSuiteAnalytics) {
      global.LabelSuiteAnalytics.init({ page: 'dataset-analysis-list' });
      global.LabelSuiteAnalytics.trackPageView(
        'dataset-analysis-list',
        getTrackingContext
      );
    }
  }

  global.state = state;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}(window));

(function (global) {
  'use strict';

  var IAA_BADGE_CLS = {
    pass: 'badge-iaa-pass',
    pending: 'badge-iaa-pending',
    fail: 'badge-iaa-fail',
    not_started: 'badge-iaa-not-started',
  };
  var ROLE_BADGE_CLS = {
    project_leader: 'badge-role-pl',
    reviewer: 'badge-role-rev',
  };
  var VALID_IAA_STATUSES = Object.keys(IAA_BADGE_CLS);
  var VALID_MEMBERSHIP_ROLES = Object.keys(ROLE_BADGE_CLS);
  var KNOWN_MEMBERSHIP_ROLES = VALID_MEMBERSHIP_ROLES.concat('annotator');
  var VALID_LIMITS = [20, 50, 100];

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isValidOutputType(item) {
    return item
      && isNonEmptyString(item.key)
      && isNonEmptyString(item.zh)
      && isNonEmptyString(item.en)
      && (typeof item.badgeClass === 'undefined' || typeof item.badgeClass === 'string');
  }

  function buildOutputTypeMap(outputTypes) {
    var map = Object.create(null);
    for (var index = 0; index < outputTypes.length; index += 1) {
      var item = outputTypes[index];
      if (!isValidOutputType(item) || map[item.key]) return null;
      map[item.key] = item;
    }
    return map;
  }

  function isValidTask(task, outputTypeMap) {
    return task
      && isNonEmptyString(task.id)
      && isNonEmptyString(task.nameZh)
      && isNonEmptyString(task.nameEn)
      && isNonEmptyString(task.sourceFile)
      && Array.isArray(task.outputTypes)
      && task.outputTypes.length > 0
      && task.outputTypes.every(function (outputType) {
        return isNonEmptyString(outputType) && !!outputTypeMap[outputType];
      })
      && typeof task.completionRate === 'number'
      && Number.isFinite(task.completionRate)
      && task.completionRate >= 0
      && task.completionRate <= 100
      && VALID_IAA_STATUSES.indexOf(task.iaaStatus) !== -1
      && KNOWN_MEMBERSHIP_ROLES.indexOf(task.membershipRole) !== -1;
  }

  function cloneOutputType(item) {
    return {
      key: item.key,
      zh: item.zh,
      en: item.en,
      badgeClass: item.badgeClass || 'badge-task-type-default',
    };
  }

  function cloneTask(task) {
    return {
      id: task.id,
      nameZh: task.nameZh,
      nameEn: task.nameEn,
      sourceFile: task.sourceFile,
      outputTypes: task.outputTypes.slice(),
      completionRate: task.completionRate,
      iaaStatus: task.iaaStatus,
      membershipRole: task.membershipRole,
    };
  }

  var sourceData = global.LabelSuiteDatasetAnalysisListData;
  var outputTypeMap = sourceData && Array.isArray(sourceData.outputTypes)
    && sourceData.outputTypes.length > 0
    ? buildOutputTypeMap(sourceData.outputTypes)
    : null;
  var dataReady = !!outputTypeMap
    && Array.isArray(sourceData.tasks)
    && sourceData.tasks.every(function (task) {
      return isValidTask(task, outputTypeMap);
    });
  var outputTypes = dataReady
    ? sourceData.outputTypes.map(cloneOutputType)
    : [];

  if (dataReady) {
    outputTypeMap = buildOutputTypeMap(outputTypes);
  } else {
    outputTypeMap = Object.create(null);
  }

  var state = {
    lang: 'zh',
    tasks: dataReady ? sourceData.tasks.map(cloneTask) : [],
    keyword: '',
    outputType: '',
    iaaStatus: '',
    limit: 20,
    offset: 0,
    loadFailed: !dataReady,
  };

  function getOutputTypeMeta(outputType) {
    return outputTypeMap[outputType] || null;
  }

  function getOutputTypeLabel(outputType) {
    var meta = getOutputTypeMeta(outputType);
    if (!meta) return outputType;
    return state.lang === 'en' ? meta.en : meta.zh;
  }

  function getTaskSearchText(task, translateNested) {
    var outputKeys = Array.isArray(task.outputTypes) ? task.outputTypes : [];
    var outputLabels = outputKeys.map(getOutputTypeLabel);

    return [
      task.id,
      task.nameZh,
      task.nameEn,
      outputKeys.join(' '),
      outputLabels.join(' '),
      task.iaaStatus,
      translateNested('iaaBadge', task.iaaStatus),
      task.membershipRole,
      translateNested('roleLabel', task.membershipRole),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function getFilteredTasks(translateNested) {
    var tasks = state.tasks.filter(function (task) {
      return VALID_MEMBERSHIP_ROLES.indexOf(task.membershipRole) !== -1;
    });

    if (state.outputType) {
      tasks = tasks.filter(function (task) {
        return Array.isArray(task.outputTypes)
          && task.outputTypes.indexOf(state.outputType) !== -1;
      });
    }

    if (state.iaaStatus) {
      tasks = tasks.filter(function (task) {
        return task.iaaStatus === state.iaaStatus;
      });
    }

    if (state.keyword.trim()) {
      var keyword = state.keyword.trim().toLowerCase();
      tasks = tasks.filter(function (task) {
        return getTaskSearchText(task, translateNested).indexOf(keyword) !== -1;
      });
    }

    return tasks;
  }

  function getVisiblePaginationPages(totalPages, currentPage) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, function (_, index) {
        return index + 1;
      });
    }

    var interiorStart = Math.max(2, currentPage - 2);
    var interiorEnd = Math.min(totalPages - 1, interiorStart + 4);
    interiorStart = Math.max(2, interiorEnd - 4);

    var pages = [1];
    for (var pageNumber = interiorStart; pageNumber <= interiorEnd; pageNumber += 1) {
      pages.push(pageNumber);
    }
    pages.push(totalPages);
    return pages;
  }

  function parseInitialState(search) {
    var params = new URLSearchParams(search);
    var requestedOutputType = params.get('output_type') || '';
    var requestedIaaStatus = params.get('iaa_status') || '';
    var rawLimit = params.get('limit') || '';
    var requestedLimit = /^[0-9]+$/.test(rawLimit)
      ? Number.parseInt(rawLimit, 10)
      : NaN;
    var rawOffset = params.get('offset') || '';
    var requestedOffset = /^[0-9]+$/.test(rawOffset)
      ? Number.parseInt(rawOffset, 10)
      : 0;

    state.keyword = params.get('keyword') || '';
    if (params.get('view') === 'empty') state.tasks = [];
    state.outputType = outputTypeMap[requestedOutputType]
      ? requestedOutputType
      : '';
    state.iaaStatus = VALID_IAA_STATUSES.indexOf(requestedIaaStatus) !== -1
      ? requestedIaaStatus
      : '';
    state.limit = VALID_LIMITS.indexOf(requestedLimit) !== -1
      ? requestedLimit
      : 20;
    state.offset = requestedOffset;
  }

  global.LabelSuiteDatasetAnalysisModel = {
    IAA_BADGE_CLS: IAA_BADGE_CLS,
    ROLE_BADGE_CLS: ROLE_BADGE_CLS,
    VALID_LIMITS: VALID_LIMITS,
    outputTypes: outputTypes,
    state: state,
    getOutputTypeMeta: getOutputTypeMeta,
    getOutputTypeLabel: getOutputTypeLabel,
    getFilteredTasks: getFilteredTasks,
    getVisiblePaginationPages: getVisiblePaginationPages,
    parseInitialState: parseInitialState,
  };
}(window));

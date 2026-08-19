(function (global) {
  'use strict';

  function createView(options) {
    var model = options.model;
    var state = model.state;
    var t = options.t;
    var tNested = options.tNested;

    function setTextContent(id, text) {
      var element = document.getElementById(id);
      if (element) element.textContent = text;
    }

    function createTaskRow(task) {
      var row = document.createElement('tr');
      row.className = 'task-row';
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.dataset.sourceFile = task.sourceFile;

      var taskName = state.lang === 'en' ? task.nameEn : task.nameZh;
      var outputLabels = task.outputTypes.map(model.getOutputTypeLabel);
      row.setAttribute(
        'aria-label',
        taskName + ' — ' + t('outputTypeGroupAriaTpl').replace('{types}', outputLabels.join(', '))
      );

      var nameCell = document.createElement('td');
      nameCell.className = 'task-name-cell';
      nameCell.textContent = taskName;

      var outputCell = document.createElement('td');
      outputCell.className = 'output-type-cell';
      var outputGroup = document.createElement('div');
      outputGroup.className = 'output-type-tags';
      outputGroup.setAttribute('role', 'group');
      outputGroup.setAttribute(
        'aria-label',
        t('outputTypeGroupAriaTpl').replace('{types}', outputLabels.join(', '))
      );

      task.outputTypes.forEach(function (outputType, index) {
        var meta = model.getOutputTypeMeta(outputType);
        var tag = document.createElement('span');
        tag.className = 'badge output-type-tag '
          + (meta ? meta.badgeClass : 'badge-task-type-default');
        tag.textContent = outputLabels[index];
        outputGroup.appendChild(tag);
      });
      outputCell.appendChild(outputGroup);

      var completionCell = document.createElement('td');
      completionCell.className = 'completion-cell';
      var completionSection = document.createElement('div');
      completionSection.className = 'completion-section';
      var completionLabel = document.createElement('div');
      completionLabel.className = 'completion-label';
      var completionLabelText = document.createElement('span');
      completionLabelText.textContent = t('completionLabel');
      var completionValue = document.createElement('strong');
      completionValue.textContent = task.completionRate + '%';
      completionLabel.appendChild(completionLabelText);
      completionLabel.appendChild(completionValue);
      completionSection.appendChild(completionLabel);

      var progressTrack = document.createElement('div');
      progressTrack.className = 'progress-track';
      progressTrack.setAttribute('role', 'progressbar');
      progressTrack.setAttribute('aria-label', t('completionLabel'));
      progressTrack.setAttribute('aria-valuenow', String(task.completionRate));
      progressTrack.setAttribute('aria-valuemin', '0');
      progressTrack.setAttribute('aria-valuemax', '100');
      var progressFill = document.createElement('div');
      progressFill.className = 'progress-fill'
        + (task.completionRate >= 100 ? ' complete' : '');
      progressFill.style.width = task.completionRate + '%';
      progressTrack.appendChild(progressFill);
      completionSection.appendChild(progressTrack);
      completionCell.appendChild(completionSection);

      var iaaCell = document.createElement('td');
      var iaaBadge = document.createElement('span');
      iaaBadge.className = 'badge '
        + (model.IAA_BADGE_CLS[task.iaaStatus] || 'badge-iaa-not-started');
      iaaBadge.textContent = tNested('iaaBadge', task.iaaStatus);
      iaaCell.appendChild(iaaBadge);

      var roleCell = document.createElement('td');
      roleCell.className = 'role-cell';
      var roleBadge = document.createElement('span');
      roleBadge.className = 'badge '
        + (model.ROLE_BADGE_CLS[task.membershipRole] || 'badge-role-rev');
      roleBadge.textContent = tNested('roleLabel', task.membershipRole);
      roleCell.appendChild(roleBadge);

      row.appendChild(nameCell);
      row.appendChild(outputCell);
      row.appendChild(completionCell);
      row.appendChild(iaaCell);
      row.appendChild(roleCell);

      function openStats() {
        options.trackAnalytics('prototype_dataset_card_clicked', {
          task_id: task.id,
          iaa_status: task.iaaStatus,
        });
        options.showToast(t('toastNavigating'));
        global.setTimeout(function () {
          global.location.href = './dataset-analysis-detail.html?task_id='
            + encodeURIComponent(task.id)
            + '&tab=stats';
        }, 220);
      }

      row.addEventListener('click', openStats);
      row.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openStats();
        }
      });
      return row;
    }

    function createEmptyRow(noResults) {
      var row = document.createElement('tr');
      row.className = 'empty-row';
      var cell = document.createElement('td');
      cell.className = 'empty-row-cell';
      cell.colSpan = 5;
      var wrap = document.createElement('div');
      wrap.className = 'empty-row-wrap';
      var title = document.createElement('p');
      title.className = 'empty-title';
      title.id = 'emptyTitle';
      title.textContent = noResults ? t('emptyNoResultsTitle') : t('emptyTitle');
      var description = document.createElement('p');
      description.className = 'empty-desc';
      description.id = 'emptyDesc';
      description.textContent = noResults
        ? t('emptyNoResultsDesc')
        : t('emptyDesc');

      wrap.appendChild(title);
      wrap.appendChild(description);
      cell.appendChild(wrap);
      row.appendChild(cell);
      return row;
    }

    function createErrorRow() {
      var row = document.createElement('tr');
      row.className = 'error-row';
      var cell = document.createElement('td');
      cell.className = 'empty-row-cell';
      cell.colSpan = 5;
      var wrap = document.createElement('div');
      wrap.className = 'empty-row-wrap';
      var title = document.createElement('p');
      title.className = 'error-title';
      title.textContent = t('errorLoadTitle');
      var description = document.createElement('p');
      description.className = 'error-desc';
      description.textContent = t('errorLoadDesc');
      var retryButton = document.createElement('button');
      retryButton.className = 'clear-btn';
      retryButton.type = 'button';
      retryButton.textContent = t('errorRetryLabel');
      retryButton.addEventListener('click', function () {
        global.location.reload();
      });

      wrap.appendChild(title);
      wrap.appendChild(description);
      wrap.appendChild(retryButton);
      cell.appendChild(wrap);
      row.appendChild(cell);
      return row;
    }

    function updatePagination(total, currentPage, totalPages) {
      setTextContent(
        'paginationInfo',
        t('paginationTpl')
          .replace('{total}', String(total))
          .replace('{page}', String(currentPage))
          .replace('{totalPages}', String(totalPages))
      );

      var pageSizeSelect = document.getElementById('pageSizeSelect');
      if (pageSizeSelect) {
        pageSizeSelect.value = String(state.limit);
        Array.prototype.forEach.call(pageSizeSelect.options, function (option) {
          option.textContent = option.value + t('pageSizeLabel');
        });
      }

      var previousButton = document.getElementById('prevPageBtn');
      var nextButton = document.getElementById('nextPageBtn');
      if (previousButton) previousButton.disabled = state.offset <= 0;
      if (nextButton) nextButton.disabled = state.offset + state.limit >= total;

      var controls = document.getElementById('paginationControls');
      if (!controls || !nextButton) return;
      Array.prototype.forEach.call(
        controls.querySelectorAll('[data-page], .page-ellipsis'),
        function (node) {
          node.remove();
        }
      );

      if (state.loadFailed || total === 0) return;
      model.getVisiblePaginationPages(totalPages, currentPage).forEach(function (pageNumber) {
        if (pageNumber === 'ellipsis') {
          var gap = document.createElement('span');
          gap.className = 'page-ellipsis';
          gap.textContent = '…';
          gap.setAttribute('aria-hidden', 'true');
          nextButton.insertAdjacentElement('beforebegin', gap);
          return;
        }
        var button = document.createElement('button');
        button.className = 'page-btn' + (pageNumber === currentPage ? ' active' : '');
        button.dataset.page = String(pageNumber);
        button.type = 'button';
        button.textContent = String(pageNumber);
        button.setAttribute(
          'aria-label',
          t('pageAriaTpl').replace('{page}', String(pageNumber))
        );
        if (pageNumber === currentPage) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', function () {
          state.offset = (pageNumber - 1) * state.limit;
          options.trackAnalytics('prototype_dataset_analysis_page_changed', {
            source: 'number',
            to_page: pageNumber,
          });
          render();
        });
        nextButton.insertAdjacentElement('beforebegin', button);
      });
    }

    function render() {
      var filtered = state.loadFailed ? [] : model.getFilteredTasks(tNested);
      var total = filtered.length;
      var totalPages = Math.max(1, Math.ceil(total / state.limit));
      var lastPageOffset = Math.max(0, (totalPages - 1) * state.limit);
      if (total === 0) {
        state.offset = 0;
      } else if (state.offset >= total) {
        state.offset = lastPageOffset;
      }
      var currentPage = Math.floor(state.offset / state.limit) + 1;

      var tableWrap = document.getElementById('tableWrap');
      var paginationBar = document.getElementById('paginationBar');
      var tableBody = document.getElementById('taskTableBody');
      if (!tableWrap || !paginationBar || !tableBody) return;

      while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
      tableWrap.classList.remove('hidden');
      var hasFilter = !!(
        state.keyword.trim()
        || state.outputType
        || state.iaaStatus
      );

      if (state.loadFailed) {
        paginationBar.classList.add('hidden');
        tableBody.appendChild(createErrorRow());
      } else if (total === 0) {
        paginationBar.classList.add('hidden');
        tableBody.appendChild(createEmptyRow(hasFilter));
      } else {
        paginationBar.classList.remove('hidden');
        filtered
          .slice(state.offset, state.offset + state.limit)
          .forEach(function (task) {
            tableBody.appendChild(createTaskRow(task));
          });
      }

      updatePagination(total, currentPage, totalPages);
      var clearFiltersButton = document.getElementById('clearFiltersBtn');
      if (clearFiltersButton) {
        clearFiltersButton.classList.toggle('hide-clear', !hasFilter);
      }
      options.syncUrl();
    }

    function replaceSelectOptions(select, optionItems, selectedValue) {
      if (!select) return;
      while (select.firstChild) select.removeChild(select.firstChild);
      optionItems.forEach(function (optionData) {
        var option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        option.selected = optionData.value === selectedValue;
        select.appendChild(option);
      });
    }

    return {
      render: render,
      replaceSelectOptions: replaceSelectOptions,
      setTextContent: setTextContent,
    };
  }

  global.LabelSuiteDatasetAnalysisView = {
    create: createView,
  };
}(window));

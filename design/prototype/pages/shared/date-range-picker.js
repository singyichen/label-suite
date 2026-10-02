/**
 * Shared DateRangePicker component (issue #1101).
 *
 * Contract: openspec/changes/1101-work-log-date-range-picker/design.md
 * (D1 mount API, D2 markup, D3 interaction rules). Vanilla JS, no build
 * step -- matches design/prototype/pages/shared/sidebar.js conventions.
 *
 * Usage:
 *   var handle = window.DateRangePicker.mount(triggerEl, {
 *     value: { from: '2026-04-19', to: '2026-04-20' } | { from: null, to: null },
 *     lang: 'zh' | 'en',
 *     onChange: function (range) { ... } // { from, to } ISO strings or nulls
 *   });
 *   handle.setLang('en');
 *   handle.setValue({ from: null, to: null });
 *   handle.destroy();
 */
(function () {
  var STRINGS = {
    zh: {
      placeholder: '選擇日期區間',
      clear: '清除',
      dialogLabel: '選擇日期區間',
      prevMonth: '上個月',
      nextMonth: '下個月',
      openEndedFrom: function (from) { return from + ' ～ 不限'; },
      openEndedTo: function (to) { return '不限 ～ ' + to; },
    },
    en: {
      placeholder: 'Select date range',
      clear: 'Clear',
      dialogLabel: 'Select date range',
      prevMonth: 'Previous month',
      nextMonth: 'Next month',
      openEndedFrom: function (from) { return from + ' ～ unbounded'; },
      openEndedTo: function (to) { return 'unbounded ～ ' + to; },
    },
  };

  var SEPARATOR = ' ～ ';

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function isoOf(year, month, day) { return year + '-' + pad2(month) + '-' + pad2(day); }

  function parseIso(iso) {
    var parts = iso.split('-');
    return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) };
  }

  function toDateObj(iso) {
    var p = parseIso(iso);
    return new Date(p.year, p.month - 1, p.day);
  }

  function fromDateObj(d) { return isoOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); }

  function addDays(iso, delta) {
    var d = toDateObj(iso);
    d.setDate(d.getDate() + delta);
    return fromDateObj(d);
  }

  function todayIso() { return fromDateObj(new Date()); }

  function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

  function firstWeekday(year, month) { return new Date(year, month - 1, 1).getDay(); }

  function mount(trigger, options) {
    var opts = options || {};
    var lang = opts.lang === 'en' ? 'en' : 'zh';
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function () {};

    var committedFrom = (opts.value && opts.value.from) || null;
    var committedTo = (opts.value && opts.value.to) || null;
    var tentativeStart = null;

    var anchor = committedFrom || committedTo || todayIso();
    var anchorParts = parseIso(anchor);
    var viewYear = anchorParts.year;
    var viewMonth = anchorParts.month;
    var focusedDate = anchor;

    var triggerText = trigger.querySelector('.date-range-trigger-text');
    var popoverId = trigger.id + 'Popover';

    var popover = document.createElement('div');
    popover.className = 'date-range-popover';
    popover.id = popoverId;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'false');
    popover.setAttribute('aria-label', STRINGS[lang].dialogLabel);
    popover.hidden = true;
    popover.innerHTML =
      '<div class="date-range-popover-header">' +
        '<button type="button" class="date-range-nav-prev"></button>' +
        '<span class="date-range-month-label"></span>' +
        '<button type="button" class="date-range-nav-next"></button>' +
      '</div>' +
      '<table class="date-range-grid" role="grid"><tbody></tbody></table>' +
      '<div class="date-range-popover-footer">' +
        '<button type="button" class="date-range-clear"></button>' +
      '</div>';

    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', popoverId);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.parentNode.insertBefore(popover, trigger.nextSibling);

    var navPrev = popover.querySelector('.date-range-nav-prev');
    var navNext = popover.querySelector('.date-range-nav-next');
    navPrev.textContent = '‹';
    navNext.textContent = '›';
    var monthLabel = popover.querySelector('.date-range-month-label');
    var gridBody = popover.querySelector('tbody');
    var clearBtn = popover.querySelector('.date-range-clear');

    function applyStrings() {
      navPrev.setAttribute('aria-label', STRINGS[lang].prevMonth);
      navNext.setAttribute('aria-label', STRINGS[lang].nextMonth);
      clearBtn.textContent = STRINGS[lang].clear;
      popover.setAttribute('aria-label', STRINGS[lang].dialogLabel);
    }

    function rangeDisplayText() {
      if (committedFrom && committedTo) {
        return committedFrom + SEPARATOR + committedTo;
      }
      if (committedFrom) return STRINGS[lang].openEndedFrom(committedFrom);
      if (committedTo) return STRINGS[lang].openEndedTo(committedTo);
      return STRINGS[lang].placeholder;
    }

    function updateTriggerText() {
      if (triggerText) triggerText.textContent = rangeDisplayText();
    }

    function classifyDate(iso) {
      var classes = [];
      var startBound = tentativeStart || committedFrom;
      var endBound = tentativeStart ? null : committedTo;
      if (startBound && endBound) {
        if (iso === startBound) classes.push('is-range-start');
        if (iso === endBound) classes.push('is-range-end');
        if (iso > startBound && iso < endBound) classes.push('is-in-range');
      } else if (startBound && iso === startBound) {
        classes.push('is-range-start');
      }
      if (iso === todayIso()) classes.push('is-today');
      return classes;
    }

    function renderGrid() {
      monthLabel.textContent = lang === 'zh'
        ? viewYear + '年' + viewMonth + '月'
        : viewYear + '-' + pad2(viewMonth);
      gridBody.innerHTML = '';
      var total = daysInMonth(viewYear, viewMonth);
      var lead = firstWeekday(viewYear, viewMonth);
      var cells = [];
      for (var i = 0; i < lead; i++) cells.push(null);
      for (var day = 1; day <= total; day++) cells.push(day);
      while (cells.length % 7 !== 0) cells.push(null);

      for (var row = 0; row < cells.length / 7; row++) {
        var tr = document.createElement('tr');
        tr.setAttribute('role', 'row');
        for (var col = 0; col < 7; col++) {
          var td = document.createElement('td');
          var dayNum = cells[row * 7 + col];
          if (dayNum !== null) {
            var iso = isoOf(viewYear, viewMonth, dayNum);
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = ['date-range-day'].concat(classifyDate(iso)).join(' ');
            btn.setAttribute('data-date', iso);
            btn.setAttribute('tabindex', iso === focusedDate ? '0' : '-1');
            if (classifyDate(iso).indexOf('is-range-start') !== -1 ||
                classifyDate(iso).indexOf('is-range-end') !== -1) {
              btn.setAttribute('aria-selected', 'true');
            }
            btn.textContent = String(dayNum);
            btn.addEventListener('click', function () { selectDate(this.getAttribute('data-date')); });
            td.appendChild(btn);
          }
          tr.appendChild(td);
        }
        gridBody.appendChild(tr);
      }
    }

    function focusCurrentDay() {
      var el = popover.querySelector('.date-range-day[data-date="' + focusedDate + '"]');
      if (el) el.focus();
    }

    function setFocusedDate(iso) {
      focusedDate = iso;
      var p = parseIso(iso);
      if (p.year !== viewYear || p.month !== viewMonth) {
        viewYear = p.year;
        viewMonth = p.month;
      }
      renderGrid();
      focusCurrentDay();
    }

    function selectDate(iso) {
      if (!tentativeStart) {
        tentativeStart = iso;
        setFocusedDate(iso);
        return;
      }
      var from = iso < tentativeStart ? iso : tentativeStart;
      var to = iso < tentativeStart ? tentativeStart : iso;
      tentativeStart = null;
      committedFrom = from;
      committedTo = to;
      updateTriggerText();
      closeAndReturnFocus();
      onChange({ from: committedFrom, to: committedTo });
    }

    function positionPopover() {
      var margin = 8;
      var rect = trigger.getBoundingClientRect();
      popover.style.position = 'fixed';
      popover.style.top = (rect.bottom + 4) + 'px';
      popover.style.left = rect.left + 'px';
      var popRect = popover.getBoundingClientRect();
      var overflowRight = popRect.left + popRect.width - (window.innerWidth - margin);
      if (overflowRight > 0) {
        popover.style.left = Math.max(margin, rect.left - overflowRight) + 'px';
      }
    }

    function open() {
      tentativeStart = null;
      var anchorNow = committedFrom || committedTo || todayIso();
      var p = parseIso(anchorNow);
      viewYear = p.year;
      viewMonth = p.month;
      focusedDate = anchorNow;
      renderGrid();
      popover.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      positionPopover();
      focusCurrentDay();
      document.addEventListener('mousedown', onDocumentMouseDown, true);
    }

    function close() {
      tentativeStart = null;
      popover.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', onDocumentMouseDown, true);
    }

    function closeAndReturnFocus() {
      close();
      trigger.focus();
    }

    function onDocumentMouseDown(event) {
      if (popover.contains(event.target) || trigger.contains(event.target)) return;
      closeAndReturnFocus();
    }

    trigger.addEventListener('click', function () {
      if (popover.hidden) open(); else closeAndReturnFocus();
    });

    popover.addEventListener('keydown', function (event) {
      var key = event.key;
      if (key === 'Escape') {
        event.preventDefault();
        closeAndReturnFocus();
        return;
      }
      if (key === 'ArrowRight') { event.preventDefault(); setFocusedDate(addDays(focusedDate, 1)); return; }
      if (key === 'ArrowLeft') { event.preventDefault(); setFocusedDate(addDays(focusedDate, -1)); return; }
      if (key === 'ArrowDown') { event.preventDefault(); setFocusedDate(addDays(focusedDate, 7)); return; }
      if (key === 'ArrowUp') { event.preventDefault(); setFocusedDate(addDays(focusedDate, -7)); return; }
      /* Enter/Space are intentionally NOT handled here: a focused native
       * <button> already fires a 'click' event for both keys (Enter on
       * keydown, Space on keyup), which the day button's own click
       * listener below picks up via selectDate(). Handling them here too
       * would double-invoke selectDate() for the same keypress. */
    });

    navPrev.addEventListener('click', function () {
      viewMonth -= 1;
      if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
      renderGrid();
    });
    navNext.addEventListener('click', function () {
      viewMonth += 1;
      if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
      renderGrid();
    });
    clearBtn.addEventListener('click', function () {
      committedFrom = null;
      committedTo = null;
      tentativeStart = null;
      updateTriggerText();
      closeAndReturnFocus();
      onChange({ from: null, to: null });
    });

    applyStrings();
    updateTriggerText();
    renderGrid();

    return {
      setLang: function (newLang) {
        lang = newLang === 'en' ? 'en' : 'zh';
        applyStrings();
        updateTriggerText();
        renderGrid();
      },
      setValue: function (value) {
        committedFrom = (value && value.from) || null;
        committedTo = (value && value.to) || null;
        updateTriggerText();
      },
      destroy: function () {
        document.removeEventListener('mousedown', onDocumentMouseDown, true);
        if (popover.parentNode) popover.parentNode.removeChild(popover);
      },
    };
  }

  window.DateRangePicker = { mount: mount };
})();

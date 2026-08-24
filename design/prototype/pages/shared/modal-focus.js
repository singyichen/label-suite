/* Shared modal focus-management helper (issue #195 / F-11, WCAG 2.1 AA 2.4.3).
 * Every `role="dialog"` modal across the prototype toggles `display`/`class`
 * without any keyboard focus management -- this module is the single shared
 * implementation pages wire into their own open/close functions, following
 * the same window.LabelSuite* shared-component pattern as sidebar.js.
 *
 * Usage (page-level open/close functions call these explicitly; this module
 * never toggles visibility itself, since that's already page-owned logic):
 *   LabelSuiteModalFocus.open(modalEl, { trigger: el, onClose: closeFn });
 *   LabelSuiteModalFocus.close(modalEl);
 */
(function () {
  var FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusableElements(modal) {
    var nodes = modal.querySelectorAll(FOCUSABLE_SELECTOR);
    return Array.prototype.filter.call(nodes, function (el) {
      return el.offsetParent !== null;
    });
  }

  /* Moves focus into `modal` (first focusable element), traps Tab/Shift+Tab
   * inside it, and closes on Escape via `onClose`. `trigger` is the element
   * focus returns to on close(); defaults to whatever had focus when open()
   * was called, and callers can pass an explicit fallback (e.g. a main
   * content landmark) for modals opened without a user-triggering click. */
  function open(modal, options) {
    if (!modal) return;
    options = options || {};
    modal._modalFocusReturnEl = options.trigger || document.activeElement;

    var focusable = getFocusableElements(modal);
    if (focusable.length) {
      focusable[0].focus();
    } else if (typeof modal.focus === 'function') {
      modal.focus();
    }

    function handleKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (typeof options.onClose === 'function') options.onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      var current = getFocusableElements(modal);
      if (!current.length) {
        e.preventDefault();
        return;
      }
      var first = current[0];
      var last = current[current.length - 1];
      var active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !modal.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !modal.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    modal._modalFocusKeydownHandler = handleKeydown;
    modal.addEventListener('keydown', handleKeydown);
  }

  /* Removes the Tab/Escape trap and returns focus to the trigger element
   * (or does nothing if it's gone). Safe to call even if open() was never
   * called for this modal. */
  function close(modal) {
    if (!modal) return;
    if (modal._modalFocusKeydownHandler) {
      modal.removeEventListener('keydown', modal._modalFocusKeydownHandler);
      modal._modalFocusKeydownHandler = null;
    }
    var returnEl = modal._modalFocusReturnEl;
    modal._modalFocusReturnEl = null;
    if (returnEl && document.contains(returnEl) && typeof returnEl.focus === 'function') {
      returnEl.focus();
    }
  }

  window.LabelSuiteModalFocus = { open: open, close: close };
})();

/* global window, document */
(function bootstrapLabelSuiteTheme(windowObj, documentObj) {
  const STORAGE_KEY = 'label-suite-theme';
  const VALID_CHOICES = ['system', 'light', 'dark'];
  const DEFAULT_CHOICE = 'system';
  const listeners = new Set();

  function getStoredChoice() {
    try {
      const value = windowObj.localStorage.getItem(STORAGE_KEY);
      return VALID_CHOICES.indexOf(value) >= 0 ? value : DEFAULT_CHOICE;
    } catch (_err) {
      return DEFAULT_CHOICE;
    }
  }

  function resolveChoice(choice) {
    return choice === 'dark' ? 'dark' : 'light';
  }

  function applyResolved(resolved) {
    documentObj.documentElement.setAttribute('data-theme', resolved);
  }

  function setChoice(choice) {
    if (VALID_CHOICES.indexOf(choice) < 0) return;
    try {
      windowObj.localStorage.setItem(STORAGE_KEY, choice);
    } catch (_err) {
      // localStorage unavailable (private mode etc) — apply for this session only
    }
    const resolved = resolveChoice(choice);
    applyResolved(resolved);
    listeners.forEach((cb) => {
      try { cb({ choice: choice, resolved: resolved }); } catch (_err) { /* ignore */ }
    });
  }

  function onChange(callback) {
    if (typeof callback === 'function') {
      listeners.add(callback);
      return function unsubscribe() { listeners.delete(callback); };
    }
    return function noop() {};
  }

  // Apply on script load (the inline <head> snippet has already set
  // data-theme to prevent FOUC; this is a no-op if values already match).
  applyResolved(resolveChoice(getStoredChoice()));

  windowObj.LabelSuiteTheme = {
    STORAGE_KEY: STORAGE_KEY,
    VALID_CHOICES: VALID_CHOICES.slice(),
    getStoredChoice: getStoredChoice,
    getResolved: function () { return resolveChoice(getStoredChoice()); },
    setChoice: setChoice,
    onChange: onChange,
  };
})(window, document);

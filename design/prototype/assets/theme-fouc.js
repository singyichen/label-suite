// FOUC prevention — resolve theme synchronously before paint.
(function () {
  try {
    var choice = localStorage.getItem('label-suite-theme') || 'system';
    var resolved = (choice === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

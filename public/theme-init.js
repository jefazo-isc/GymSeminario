// Apply the saved preference before styles paint. Keep in sync with ThemeService.
(function () {
  var preference = 'system';
  try {
    var saved = window.localStorage.getItem('grom.theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') preference = saved;
  } catch (_) { /* The theme still works when storage is unavailable. */ }
  var dark = preference === 'dark' || (preference === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-theme-preference', preference);
  root.style.colorScheme = dark ? 'dark' : 'light';
})();

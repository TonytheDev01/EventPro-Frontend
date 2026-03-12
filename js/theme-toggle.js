// ================================================
//  EventPro — Theme Toggle Component
//  js/theme-toggle.js
//
//  Adds/removes "dark-mode" class on document.body
//  Persists choice in localStorage under
//  "eventpro_theme" key — consistent with project
//  storage key convention.
//
//  HOW TO USE ON ANY PAGE:
//  1. Add theme-toggle markup to the page HTML
//  2. Import theme-toggle.css in <head>
//  3. Import theme-toggle.js before </body>
//  4. Add dark-mode overrides to that page's CSS
// ================================================

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  // ── Apply saved theme immediately on load ──────
  const savedTheme = localStorage.getItem('eventpro_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    toggle.checked = true;
  }

  // ── Listen for toggle change ───────────────────
  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('eventpro_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('eventpro_theme', 'light');
    }
  });
});
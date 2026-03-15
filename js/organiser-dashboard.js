// ================================================
// EventPro — Organiser Dashboard
// js/organiser-dashboard.js
// Depends on: js/services/auth-service.js
//             js/utils/load-components.js
// ================================================

document.addEventListener('DOMContentLoaded', async () => {

  // 1. Auth guard first
 requireAuth();

  // 2. Load shared sidebar + topbar
  // 'dashboard' = the tab that lights up active on the sidebar
  await loadDashboardComponents('dashboard');

  // 3. Your page logic below

  // ── See All button ─────────────────────────────
  const seeAllBtn = document.querySelector('.btn-see-all');
  if (seeAllBtn) {
    seeAllBtn.addEventListener('click', () => {
      window.location.href = 'events.html';
    });
  }

  // ── Event Analytics button ─────────────────────
  const analyticsBtn = document.querySelector('.btn-analytics');
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
      window.location.href = 'event-analytics.html';
    });
  }

  // ── Organizer chevron clicks ───────────────────
  const chevrons = document.querySelectorAll('.chevron');
  chevrons.forEach((chevron) => {
    chevron.addEventListener('click', () => {
      window.location.href = 'organizer-profile.html';
    });
  });

});
// ================================================
//  EventPro — You're All Set Screen
//  js/youre-all-set.js
//  Depends on: js/services/auth-service.js
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Guard — redirect if not logged in ─────────
  requireAuth();

  // ── Elements ───────────────────────────────────
  const emailEl      = document.getElementById('mail');
  const viewEventBtn = document.getElementById('view-event');

  // ── Display user email ─────────────────────────
  const storedUser = getStoredUser();
  if (storedUser && storedUser.email && emailEl) {
    emailEl.textContent = storedUser.email;
  }

  // ── Get eventId from URL or confirmed registration ──
  // First try URL param — set by gen-ad.js on register click
  // Fall back to registration confirmed data
  const urlParams   = new URLSearchParams(window.location.search);
  const eventId     = urlParams.get('eventId');
  const confirmedRaw = localStorage.getItem('eventpro_registration_confirmed');
  const confirmed    = confirmedRaw ? JSON.parse(confirmedRaw) : null;

  // ── View My Event button ───────────────────────
  viewEventBtn.addEventListener('click', () => {
    // If we have an eventId redirect to that specific event
    // Once event detail screen is built update this href
    if (eventId) {
      window.location.href = `../pages/dashboard.html?eventId=${eventId}`;
      return;
    }

    if (confirmed && (confirmed._id || confirmed.id)) {
      const id = confirmed._id || confirmed.id;
      window.location.href = `../pages/dashboard.html?eventId=${id}`;
      return;
    }

    // Default fallback — go to dashboard
    window.location.href = '../pages/dashboard.html';
  });

});
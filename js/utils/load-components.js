// ================================================
//  EventPro — Dashboard Component Loader
//  js/utils/load-components.js
//  Loads sidebar + topbar into every dashboard page.
//
//  ── HOW TO USE ON YOUR PAGE ──────────────────
//  1. Add these two slots in your HTML body,
//     BEFORE .dashboard-main:
//
//     <div id="sidebarSlot"></div>
//     <div class="sidebar-overlay" id="sidebarOverlay"></div>
//
//  2. Link scripts in this order at bottom of body:
//     <script src="../js/services/auth-service.js"></script>
//     <script src="../js/utils/load-components.js"></script>
//     <script src="../js/your-page.js"></script>
//
//  3. At the top of your page JS, call:
//     await loadDashboardComponents('dashboard');
//
//  ── ACTIVE PAGE KEYS ─────────────────────────
//  Match the data-page on sidebar links:
//  'dashboard' | 'events'  | 'checkin' |
//  'organizers'| 'attendees'| 'reports' | 'settings'
//
// ================================================

async function loadDashboardComponents(activePage) {
  await Promise.all([
    _loadSidebar(activePage),
    _loadTopbar(),
  ]);
}

// ── Sidebar ───────────────────────────────────────
async function _loadSidebar(activePage) {
  const slot = document.getElementById('sidebarSlot');
  if (!slot) return;

  try {
    const res  = await fetch('../components/dashboard-sidebar.html');
    const html = await res.text();
    slot.innerHTML = html;

    // Highlight the active nav link
    if (activePage) {
      const link = slot.querySelector(`[data-page="${activePage}"]`);
      if (link) link.classList.add('active');
    }

    // Show admin-only links for admin role
    const user = getStoredUser();
    if (user?.role === 'admin') {
      document.body.classList.add('role-admin');
    }

    // Point Reports link to correct page per role
    _setReportsLink(slot, user);

    // Wire mobile sidebar open/close
    _wireSidebarToggle();

  } catch {
    // Fail silently — page still functional without sidebar
  }
}

// ── Topbar ────────────────────────────────────────
async function _loadTopbar() {
  const slot = document.getElementById('topbarSlot');
  if (!slot) return;

  try {
    const res  = await fetch('../components/dashboard-topbar.html');
    const html = await res.text();
    slot.innerHTML = html;

    // Fill in the user's first name
    const user = getStoredUser();
    const el   = document.getElementById('topbarUsername');
    if (el && user) {
      el.textContent = user.firstName || user.email || 'User';
    }

    // Wire hamburger now that topbar HTML is in DOM
    _wireSidebarToggle();

  } catch {
    // Fail silently
  }
}

// ── Point Reports link to correct page by role ────
function _setReportsLink(slot, user) {
  const reportsLink = slot.querySelector('[data-page="reports"]');
  if (!reportsLink) return;

  if (user?.role === 'organizer') {
    reportsLink.href = '../pages/organizer-reports.html';
  } else {
    reportsLink.href = '../pages/admin-reports.html';
  }
}

// ── Mobile sidebar toggle ─────────────────────────
function _wireSidebarToggle() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const closeBtn  = document.getElementById('sidebarClose');

  if (!sidebar) return;

  // Guard against wiring twice (called from both
  // _loadSidebar and _loadTopbar)
  if (sidebar._toggleWired) return;
  sidebar._toggleWired = true;

  const open = () => {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  hamburger?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
}
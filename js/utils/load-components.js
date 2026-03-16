// ================================================
//  EventPro — Dashboard Component Loader
//  js/utils/load-components.js
//
//  Sidebar + topbar HTML are embedded directly
//  as JS strings — no fetch, no file, no cache.
//
//  HOW TO USE:
//  1. HTML slots needed:
//       <div id="sidebarSlot"></div>
//       <div class="sidebar-overlay" id="sidebarOverlay"></div>
//       <div id="topbarSlot"></div>  ← inside .dashboard-main
//
//  2. Script load order (bottom of body):
//       <script src="../js/services/auth-service.js"></script>
//       <script src="../js/utils/load-components.js"></script>
//       <script src="../js/your-page.js"></script>
//
//  3. First line of your page JS:
//       await loadDashboardComponents('KEY');
//
//  PAGE KEYS:
//  'dashboard' | 'events' | 'checkin' |
//  'organizers' | 'attendees' | 'reports' | 'settings'
// ================================================

// ── Sidebar HTML ──────────────────────────────────
const _SIDEBAR_HTML = `
<aside class="sidebar" id="sidebar">

  <div class="sidebar-logo">
    <img src="../assets/images/logo.png" alt="EventPro"
      class="sidebar-logo-icon" onerror="this.style.display='none'" />
    <span class="sidebar-logo-text">EventPro</span>
  </div>

  <nav class="sidebar-nav" aria-label="Dashboard navigation">

    <a href="../pages/admin-dashboard.html" class="sidebar-link" data-page="dashboard">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3"  y="3"  width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="14" y="3"  width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="3"  y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span>Dashboard</span>
    </a>

    <a href="../pages/attendees.html?tab=events" class="sidebar-link" data-page="events">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Events</span>
    </a>

    <a href="../pages/ticket-details.html" class="sidebar-link" data-page="checkin">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Check-In</span>
    </a>

    <a href="../pages/organizer-management.html" class="sidebar-link sidebar-admin-only" data-page="organizers">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="19" cy="11" r="2" stroke="currentColor" stroke-width="2"/>
        <path d="M23 21v-1a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Organizers</span>
    </a>

    <a href="../pages/attendees.html" class="sidebar-link" data-page="attendees">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M21 21v-1a4 4 0 00-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Attendees</span>
    </a>

    <a href="../pages/admin-report.html" class="sidebar-link" data-page="reports">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 17V13M12 17V9M16 17V11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Reports</span>
    </a>

    <a href="#" class="sidebar-link" data-page="settings">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span>Settings</span>
    </a>

  </nav>

  <button type="button" class="sidebar-logout" id="sidebarLogout" onclick="logoutUser()">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <polyline points="16 17 21 12 16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>Logout</span>
  </button>

  <button type="button" class="sidebar-close" id="sidebarClose" aria-label="Close menu">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>

</aside>`;

// ── Topbar HTML ───────────────────────────────────
const _TOPBAR_HTML = `
<header class="topbar" id="topbar">
  <button type="button" class="topbar-hamburger" id="hamburgerBtn" aria-label="Open menu">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <line x1="3"  y1="6"  x2="21" y2="6"  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="3"  y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="3"  y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>
  <p class="topbar-welcome">
    Welcome, <span class="topbar-username" id="topbarUsername">...</span>
  </p>
  <div class="topbar-controls">
    <button type="button" class="topbar-icon-btn" aria-label="Search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    <button type="button" class="topbar-icon-btn topbar-bell" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span class="topbar-bell-dot" aria-hidden="true"></span>
    </button>
    <button type="button" class="topbar-avatar" id="topbarAvatar" aria-label="Account menu"></button>
  </div>
</header>`;

// ════════════════════════════════════════════════
//  PUBLIC — call this from every dashboard page
// ════════════════════════════════════════════════
async function loadDashboardComponents(activePage) {
  _loadSidebar(activePage);
  _loadTopbar();
}

// ── Sidebar ───────────────────────────────────────
function _loadSidebar(activePage) {
  const slot = document.getElementById('sidebarSlot');
  if (!slot) return;

  slot.innerHTML = _SIDEBAR_HTML;

  // Highlight active nav link
  if (activePage) {
    const link = slot.querySelector(`[data-page="${activePage}"]`);
    if (link) link.classList.add('active');
  }

  // Show admin-only links
  const user = getStoredUser();
  if (user?.role === 'admin') {
    document.body.classList.add('role-admin');
  }

  // Point Reports link to correct page per role
  _setReportsLink(slot, user);

  // Wire mobile toggle
  _wireSidebarToggle();
}

// ── Topbar ────────────────────────────────────────
function _loadTopbar() {
  const slot = document.getElementById('topbarSlot');
  if (!slot) return;

  slot.innerHTML = _TOPBAR_HTML;

  const user = getStoredUser();

  // Username
  const nameEl = document.getElementById('topbarUsername');
  if (nameEl && user) {
    nameEl.textContent = user.firstName || user.email || 'User';
  }

  // Avatar initials
  const avatarEl = document.getElementById('topbarAvatar');
  if (avatarEl && user) {
    const initials = [user.firstName, user.lastName]
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase() || '?';
    avatarEl.textContent = initials;
  }

  // Wire hamburger now that topbar is in DOM
  _wireSidebarToggle();
}

// ── Reports link per role ─────────────────────────
function _setReportsLink(slot, user) {
  const link = slot.querySelector('[data-page="reports"]');
  if (!link) return;
  link.href = user?.role === 'organizer'
    ? '../pages/organizer-reports.html'
    : '../pages/admin-report.html';
}

// ── Mobile sidebar toggle ─────────────────────────
function _wireSidebarToggle() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const closeBtn  = document.getElementById('sidebarClose');

  if (!sidebar || sidebar._toggleWired) return;
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
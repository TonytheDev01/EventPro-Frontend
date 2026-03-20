// ================================================
//  EventPro — Dashboard Component Loader
//  js/utils/load-components.js
//
//  Role-aware sidebar:
//  admin     → full sidebar including Organizers tab
//  organizer → Events → organizer-events.html, no Organizers tab
//  user      → minimal sidebar — Events, My Tickets, Settings only
// ================================================

// ── Shared nav items ──────────────────────────────────────
var _NAV_EVENTS_ADMIN = '<a href="../pages/admin-events.html" class="sidebar-link" data-page="events">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>Events</span></a>';

var _NAV_EVENTS_ORGANIZER = '<a href="../pages/organizer-events.html" class="sidebar-link" data-page="events">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>Events</span></a>';

var _NAV_EVENTS_ATTENDEE = '<a href="../pages/attendees.html?tab=events" class="sidebar-link" data-page="events">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>Events</span></a>';

var _NAV_CHECKIN = '<a href="../pages/real-time-attendance.html" class="sidebar-link" data-page="checkin">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>Check-In</span></a>';

var _NAV_ORGANIZERS = '<a href="../pages/organizer-management.html" class="sidebar-link" data-page="organizers">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="11" r="2" stroke="currentColor" stroke-width="2"/><path d="M23 21v-1a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>Organizers</span></a>';

var _NAV_ATTENDEES = '<a href="../pages/attendees.html" class="sidebar-link" data-page="attendees">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 21v-1a4 4 0 00-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>Attendees</span></a>';

var _NAV_MY_TICKETS = '<a href="../pages/attendees.html" class="sidebar-link" data-page="attendees">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>My Tickets</span></a>';

var _NAV_REPORTS = '<a href="#" class="sidebar-link" data-page="reports" id="sidebarReportsLink">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 17V13M12 17V9M16 17V11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<span>Reports</span></a>';

var _NAV_SETTINGS = '<a href="../pages/settings.html" class="sidebar-link" data-page="settings">'
  + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2"/></svg>'
  + '<span>Settings</span></a>';

var _SIDEBAR_CLOSE = '<button type="button" class="sidebar-close" id="sidebarClose" aria-label="Close menu">'
  + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '</button>';

// ── Build sidebar HTML based on role ──────────────────────
function _buildSidebarHTML(role) {
  var logo = '<div class="sidebar-logo">'
    + '<img src="../assets/images/logo.png" alt="EventPro" class="sidebar-logo-icon" onerror="this.style.display=\'none\'" />'
    + '<span class="sidebar-logo-text">EventPro</span>'
    + '</div>';

  var nav = '';

  if (role === 'admin') {
    nav = '<a href="../pages/admin-dashboard.html" class="sidebar-link" data-page="dashboard">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/></svg>'
      + '<span>Dashboard</span></a>'
      + _NAV_EVENTS_ADMIN
      + _NAV_CHECKIN
      + _NAV_ORGANIZERS
      + _NAV_ATTENDEES
      + _NAV_REPORTS
      + _NAV_SETTINGS;

  } else if (role === 'organizer') {
    nav = '<a href="../pages/organizer-dashboard.html" class="sidebar-link" data-page="dashboard">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/></svg>'
      + '<span>Dashboard</span></a>'
      + _NAV_EVENTS_ORGANIZER
      + _NAV_CHECKIN
      + _NAV_ATTENDEES
      + _NAV_REPORTS
      + _NAV_SETTINGS;

  } else {
    // user / attendee — minimal sidebar
    nav = _NAV_EVENTS_ATTENDEE
      + _NAV_MY_TICKETS
      + _NAV_SETTINGS;
  }

  return '<aside class="sidebar" id="sidebar">'
    + logo
    + '<nav class="sidebar-nav" aria-label="Dashboard navigation">' + nav + '</nav>'
    + _SIDEBAR_CLOSE
    + '</aside>';
}

// ── Topbar HTML ───────────────────────────────────────────
var _TOPBAR_HTML = '<header class="topbar" id="topbar">'
  + '<button type="button" class="topbar-hamburger" id="hamburgerBtn" aria-label="Open menu" aria-expanded="false">'
  +   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none">'
  +     '<line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  +     '<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  +     '<line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  +   '</svg>'
  + '</button>'
  + '<p class="topbar-welcome">Welcome, <span class="topbar-username" id="topbarUsername">...</span></p>'
  + '<div class="topbar-controls">'
  +   '<button type="button" class="topbar-icon-btn" id="topbarSearchBtn" aria-label="Open search">'
  +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  +   '</button>'
  +   '<div class="topbar-search-overlay" id="topbarSearchOverlay" style="display:none;">'
  +     '<input type="search" class="topbar-search-input" id="topbarSearchInput" placeholder="Search events, tickets…" autocomplete="off" aria-label="Search" />'
  +     '<button type="button" class="topbar-search-close" id="topbarSearchClose" aria-label="Close search">&#x2715;</button>'
  +   '</div>'
  +   '<button type="button" class="topbar-icon-btn topbar-bell" id="topbarBellBtn" aria-label="Notifications">'
  +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  +     '<span class="topbar-bell-dot" aria-hidden="true"></span>'
  +   '</button>'
  +   '<div class="topbar-avatar-wrap" id="topbarAvatarWrap">'
  +     '<button type="button" class="topbar-avatar" id="topbarAvatar" aria-label="Account menu" aria-haspopup="true" aria-expanded="false"></button>'
  +     '<div class="topbar-dropdown" id="topbarDropdown" style="display:none;" role="menu">'
  +       '<div class="topbar-dropdown__header">'
  +         '<p class="topbar-dropdown__name"  id="dropdownName">—</p>'
  +         '<p class="topbar-dropdown__email" id="dropdownEmail">—</p>'
  +         '<span class="topbar-dropdown__role" id="dropdownRole">—</span>'
  +       '</div>'
  +       '<hr class="topbar-dropdown__divider" />'
  +       '<a href="../pages/settings.html" class="topbar-dropdown__item" role="menuitem">'
  +         '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2"/></svg>'
  +         'Settings'
  +       '</a>'
  +       '<a href="#" class="topbar-dropdown__item" role="menuitem" id="dropdownDashboard">'
  +         '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/></svg>'
  +         'Dashboard'
  +       '</a>'
  +       '<button type="button" class="topbar-dropdown__item topbar-dropdown__item--danger" id="dropdownLogout" role="menuitem">'
  +         '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  +         'Logout'
  +       '</button>'
  +     '</div>'
  +   '</div>'
  + '</div>'
  + '</header>';

// ════════════════════════════════════════════════
//  PUBLIC — call from every dashboard page
// ════════════════════════════════════════════════
function loadDashboardComponents(activePage) {
  _loadSidebar(activePage);
  _loadTopbar();
  _wireSidebarToggle();
  _wireLogout();
  _wireSearch();
  _wireProfileDropdown();
  _wireBell();
}

// ── Inject Sidebar ────────────────────────────────
function _loadSidebar(activePage) {
  var slot = document.getElementById('sidebarSlot');
  if (!slot) return;

  var user = getStoredUser();
  var role = user && user.role;

  slot.innerHTML = _buildSidebarHTML(role);

  if (activePage) {
    var link = slot.querySelector('[data-page="' + activePage + '"]');
    if (link) link.classList.add('active');
  }

  // Reports link — admin vs everyone else
  var reportsLink = document.getElementById('sidebarReportsLink');
  if (reportsLink && user) {
    reportsLink.href = role === 'admin'
      ? '../pages/admin-report.html'
      : '../pages/organizer-reports.html';
  }
}

// ── Inject Topbar ─────────────────────────────────
function _loadTopbar() {
  var slot = document.getElementById('topbarSlot');
  if (!slot) return;
  slot.innerHTML = _TOPBAR_HTML;

  var user = getStoredUser();
  if (!user) return;

  var nameEl = document.getElementById('topbarUsername');
  if (nameEl) nameEl.textContent = user.firstName || user.email || 'User';

  var avatarEl = document.getElementById('topbarAvatar');
  if (avatarEl) {
    var initials = [user.firstName, user.lastName]
      .filter(Boolean)
      .map(function (n) { return n[0]; })
      .join('')
      .toUpperCase() || '?';
    avatarEl.textContent = initials;
  }

  var dropName  = document.getElementById('dropdownName');
  var dropEmail = document.getElementById('dropdownEmail');
  var dropRole  = document.getElementById('dropdownRole');
  if (dropName)  dropName.textContent  = ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || '—';
  if (dropEmail) dropEmail.textContent = user.email || '—';
  if (dropRole)  dropRole.textContent  = user.role  || 'user';

  // Dashboard link — role based
  var dropDashboard = document.getElementById('dropdownDashboard');
  if (dropDashboard) {
    if (user.role === 'admin') {
      dropDashboard.href        = '../pages/admin-dashboard.html';
      dropDashboard.style.display = '';
    } else if (user.role === 'organizer') {
      dropDashboard.href        = '../pages/organizer-dashboard.html';
      dropDashboard.style.display = '';
    } else {
      // Attendee — no dashboard, hide the link
      dropDashboard.style.display = 'none';
    }
  }
}

// ── Mobile Sidebar Toggle ─────────────────────────
function _wireSidebarToggle() {
  var sidebar   = document.getElementById('sidebar');
  var overlay   = document.getElementById('sidebarOverlay');
  var hamburger = document.getElementById('hamburgerBtn');
  var closeBtn  = document.getElementById('sidebarClose');

  if (!sidebar || !hamburger) return;

  function _openSidebar() {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function _closeSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', _openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', _closeSidebar);
  if (overlay)  overlay.addEventListener('click', _closeSidebar);

  var navLinks = sidebar.querySelectorAll('.sidebar-link');
  navLinks.forEach(function (link) {
    link.addEventListener('click', _closeSidebar);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closeSidebar();
  });
}

// ── Logout ────────────────────────────────────────
function _wireLogout() {
  var dropdownLogout = document.getElementById('dropdownLogout');
  if (dropdownLogout) dropdownLogout.addEventListener('click', logoutUser);
}

// ── Search ────────────────────────────────────────
function _wireSearch() {
  var searchBtn     = document.getElementById('topbarSearchBtn');
  var searchOverlay = document.getElementById('topbarSearchOverlay');
  var searchInput   = document.getElementById('topbarSearchInput');
  var searchClose   = document.getElementById('topbarSearchClose');

  if (!searchBtn || !searchOverlay) return;

  function _openSearch() {
    searchOverlay.style.display = 'flex';
    searchBtn.style.display     = 'none';
    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
  }

  function _closeSearch() {
    searchOverlay.style.display = 'none';
    searchBtn.style.display     = '';
    if (searchInput) searchInput.value = '';
  }

  searchBtn.addEventListener('click', _openSearch);
  if (searchClose) {
    searchClose.addEventListener('click', function (e) {
      e.stopPropagation();
      _closeSearch();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { _closeSearch(); return; }
      if (e.key !== 'Enter') return;

      var q    = searchInput.value.trim().toLowerCase();
      var user = getStoredUser();
      var role = user && user.role;

      if (!q) { _closeSearch(); return; }

      var adminRoutes = {
        'event':      '../pages/admin-events.html',
        'attendee':   '../pages/attendees.html',
        'report':     '../pages/admin-report.html',
        'checkin':    '../pages/real-time-attendance.html',
        'check-in':   '../pages/real-time-attendance.html',
        'organizer':  '../pages/organizer-management.html',
        'setting':    '../pages/settings.html',
        'dashboard':  '../pages/admin-dashboard.html',
        'create':     '../pages/create-event.html',
      };

      var orgRoutes = {
        'event':      '../pages/organizer-events.html',
        'attendee':   '../pages/attendees.html',
        'report':     '../pages/organizer-reports.html',
        'checkin':    '../pages/real-time-attendance.html',
        'check-in':   '../pages/real-time-attendance.html',
        'setting':    '../pages/settings.html',
        'dashboard':  '../pages/organizer-dashboard.html',
        'create':     '../pages/create-event.html',
      };

      var attendeeRoutes = {
        'event':    '../pages/attendees.html?tab=events',
        'ticket':   '../pages/attendees.html',
        'setting':  '../pages/settings.html',
      };

      var routes = role === 'admin'
        ? adminRoutes
        : role === 'organizer'
          ? orgRoutes
          : attendeeRoutes;

      var matched = Object.keys(routes).find(function (k) {
        return q.indexOf(k) !== -1;
      });

      if (matched) {
        window.location.href = routes[matched];
      } else {
        _closeSearch();
      }
    });
  }
}

// ── Bell notification ──────────────────────────────
function _wireBell() {
  var bellBtn = document.getElementById('topbarBellBtn');
  if (!bellBtn) return;
  bellBtn.addEventListener('click', function () {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = 'No new notifications';
    toast.className   = 'toast show';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.className = 'toast'; }, 3000);
  });
}

// ── Profile Dropdown ──────────────────────────────
function _wireProfileDropdown() {
  var avatarBtn = document.getElementById('topbarAvatar');
  var dropdown  = document.getElementById('topbarDropdown');
  var wrap      = document.getElementById('topbarAvatarWrap');

  if (!avatarBtn || !dropdown) return;

  function _openDropdown() {
    dropdown.style.display = 'block';
    avatarBtn.setAttribute('aria-expanded', 'true');
  }

  function _closeDropdown() {
    dropdown.style.display = 'none';
    avatarBtn.setAttribute('aria-expanded', 'false');
  }

  function _toggleDropdown() {
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
      _openDropdown();
    } else {
      _closeDropdown();
    }
  }

  avatarBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    _toggleDropdown();
  });

  document.addEventListener('click', function (e) {
    if (wrap && !wrap.contains(e.target)) _closeDropdown();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closeDropdown();
  });
}
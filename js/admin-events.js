// ================================================
//  EventPro — Admin Events
//  js/admin-events.js
//  Depends on: auth-service.js, load-components.js
//
//  Endpoints (Swagger confirmed):
//  GET  /events?page&limit&search&status&category
//  GET  /events/{id}
//
//  Row click → opens detail drawer (right slide-in)
//  View Attendees → attendees.html?eventId=...
//  Deactivate → stubs to POST /events/{id}/deactivate
//    (TODO: confirm endpoint in Swagger)
// ================================================

var _API       = 'https://eventpro-fxfv.onrender.com/api';
var _PAGE_LIMIT = 10;
var _page       = 1;
var _totalPages = 1;
var _searchTimer = null;

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard — admin only ───────────────────
  requireAuth();
  var user = getStoredUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '../pages/sign-in.html';
    return;
  }

  // ── Load sidebar + topbar ─────────────────────
  loadDashboardComponents('events');

  // ── Load first page ───────────────────────────
  _loadEvents();

  // ── Wire search ───────────────────────────────
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function () {
        _page = 1;
        _loadEvents();
      }, 400);
    });
  }

  // ── Wire filters ──────────────────────────────
  var filterStatus   = document.getElementById('filterStatus');
  var filterCategory = document.getElementById('filterCategory');

  if (filterStatus) {
    filterStatus.addEventListener('change', function () {
      _page = 1;
      _loadEvents();
    });
  }

  if (filterCategory) {
    filterCategory.addEventListener('change', function () {
      _page = 1;
      _loadEvents();
    });
  }

  // ── Wire drawer close ─────────────────────────
  var drawerClose   = document.getElementById('drawerClose');
  var drawerOverlay = document.getElementById('drawerOverlay');

  if (drawerClose)   drawerClose.addEventListener('click', _closeDrawer);
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', function (e) {
      if (e.target === drawerOverlay) _closeDrawer();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closeDrawer();
  });

});

// ── Load Events ───────────────────────────────────────────
function _loadEvents() {
  var tbody = document.getElementById('eventsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="spinner" role="status" aria-label="Loading events"></div></td></tr>';
  }

  var search   = (document.getElementById('searchInput')   || {}).value || '';
  var status   = (document.getElementById('filterStatus')  || {}).value || '';
  var category = (document.getElementById('filterCategory') || {}).value || '';

  var params = new URLSearchParams({ page: _page, limit: _PAGE_LIMIT });
  if (search.trim())   params.set('search',   search.trim());
  if (status)          params.set('status',   status);
  if (category)        params.set('category', category);

  fetch(_API + '/events?' + params.toString(), {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var events     = data.events || data.data || (Array.isArray(data) ? data : []);
      var pagination = data.pagination || {};
      _totalPages    = pagination.pages || Math.ceil((pagination.total || events.length) / _PAGE_LIMIT) || 1;

      _renderSummary(events, data);
      _renderTable(events);
      _renderPagination();
    })
    .catch(function () {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="ae-empty">Unable to load events. Please try again.</td></tr>';
      }
    });
}

// ── Render Summary Strip ──────────────────────────────────
function _renderSummary(events, data) {
  var total     = (data.pagination && data.pagination.total) || events.length;
  var active    = events.filter(function (e) { return (e.status || '').toLowerCase() === 'active'; }).length;
  var upcoming  = events.filter(function (e) { return (e.status || '').toLowerCase() === 'upcoming'; }).length;
  var completed = events.filter(function (e) { return (e.status || '').toLowerCase() === 'completed'; }).length;

  _setText('sumTotal',     total);
  _setText('sumActive',    active);
  _setText('sumUpcoming',  upcoming);
  _setText('sumCompleted', completed);
}

// ── Render Table ──────────────────────────────────────────
function _renderTable(events) {
  var tbody = document.getElementById('eventsTableBody');
  if (!tbody) return;

  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="ae-empty">No events found.</td></tr>';
    _setText('aeFooterCount', 'Showing 0 events');
    return;
  }

  tbody.innerHTML = events.map(function (ev) {
    var id         = _esc(ev.id || ev._id || '');
    var title      = _esc(ev.title || ev.name || 'Unnamed Event');
    var initials   = title.slice(0, 2).toUpperCase();
    var organizer  = _esc(_getOrganizerName(ev));
    var date       = ev.startDate ? _fmtDate(ev.startDate) : '—';
    var location   = _esc(ev.location || ev.city || '—');
    var attendees  = (ev.attendeeCount || ev.registeredCount || 0).toLocaleString();
    var category   = _esc(_capitalise(ev.category || '—'));
    var status     = (ev.status || 'draft').toLowerCase();
    var banner     = ev.bannerUrl || ev.banner || '';

    var thumbHtml = banner
      ? '<img src="' + _esc(banner) + '" alt="" class="ae-event-thumb" onerror="this.style.display=\'none\'" />'
      : '<div class="ae-event-thumb">' + initials + '</div>';

    return '<tr data-id="' + id + '" tabindex="0" role="button" aria-label="View ' + title + '">'
      + '<td>'
      +   '<div class="ae-event-cell">'
      +     thumbHtml
      +     '<span class="ae-event-name">' + title + '</span>'
      +   '</div>'
      + '</td>'
      + '<td>' + organizer + '</td>'
      + '<td>' + date + '</td>'
      + '<td>' + location + '</td>'
      + '<td>' + attendees + '</td>'
      + '<td>' + category + '</td>'
      + '<td><span class="ae-badge ae-badge--' + status + '">' + _capitalise(status) + '</span></td>'
      + '<td>'
      +   '<div class="ae-action-wrap">'
      +     '<button type="button" class="ae-action-btn ae-btn-view" data-id="' + id + '" title="View event" aria-label="View ' + title + '">'
      +       '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>'
      +     '</button>'
      +     '<button type="button" class="ae-action-btn ae-action-btn--danger ae-btn-deact" data-id="' + id + '" title="Deactivate event" aria-label="Deactivate ' + title + '">'
      +       '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      +     '</button>'
      +   '</div>'
      + '</td>'
      + '</tr>';
  }).join('');

  // Footer count
  var start = (_page - 1) * _PAGE_LIMIT + 1;
  var end   = Math.min(_page * _PAGE_LIMIT, (_page - 1) * _PAGE_LIMIT + events.length);
  _setText('aeFooterCount', 'Showing ' + start + '–' + end + ' events');

  // Wire row clicks
  tbody.querySelectorAll('tr[data-id]').forEach(function (row) {
    var id = row.dataset.id;

    row.addEventListener('click', function (e) {
      // Don't open drawer if action button was clicked
      if (e.target.closest('.ae-action-wrap')) return;
      _openDrawer(id);
    });

    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') _openDrawer(id);
    });
  });

  // Wire view buttons
  tbody.querySelectorAll('.ae-btn-view').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _openDrawer(btn.dataset.id);
    });
  });

  // Wire deactivate buttons
  tbody.querySelectorAll('.ae-btn-deact').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _deactivateEvent(btn.dataset.id);
    });
  });
}

// ── Render Pagination ─────────────────────────────────────
function _renderPagination() {
  var nav = document.getElementById('aePagination');
  if (!nav) return;

  var html = '<button class="ae-page-btn" data-page="' + (_page - 1) + '" '
    + (_page === 1 ? 'disabled' : '') + ' aria-label="Previous">&lt;</button>';

  _pageRange(_page, _totalPages).forEach(function (p) {
    html += '<button class="ae-page-btn' + (p === _page ? ' active' : '') + '" '
      + 'data-page="' + p + '" aria-label="Page ' + p + '" '
      + (p === _page ? 'aria-current="page"' : '') + '>' + p + '</button>';
  });

  html += '<button class="ae-page-btn" data-page="' + (_page + 1) + '" '
    + (_page === _totalPages ? 'disabled' : '') + ' aria-label="Next">&gt;</button>';

  nav.innerHTML = html;

  nav.querySelectorAll('.ae-page-btn:not([disabled])').forEach(function (btn) {
    btn.addEventListener('click', function () {
      _page = Number(btn.dataset.page);
      _loadEvents();
    });
  });
}

function _pageRange(current, total) {
  var delta = 1;
  var left  = Math.max(1, current - delta);
  var right = Math.min(total, current + delta);
  var range = [];
  for (var i = left; i <= right; i++) range.push(i);
  if (range[0] > 1) range.unshift(1);
  if (range[range.length - 1] < total) range.push(total);
  // Deduplicate and sort
  var seen = {};
  return range.filter(function (v) {
    if (seen[v]) return false;
    seen[v] = true;
    return true;
  }).sort(function (a, b) { return a - b; });
}

// ── Detail Drawer ─────────────────────────────────────────
function _openDrawer(eventId) {
  var overlay = document.getElementById('drawerOverlay');
  var body    = document.getElementById('drawerBody');

  if (!overlay || !body) return;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  body.innerHTML = '<div class="spinner" role="status" aria-label="Loading event"></div>';

  fetch(_API + '/events/' + eventId, {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var ev = data.event || data;
      _renderDrawer(ev);
    })
    .catch(function () {
      body.innerHTML = '<p class="ae-empty">Unable to load event details.</p>';
    });
}

function _renderDrawer(ev) {
  var body      = document.getElementById('drawerBody');
  var titleEl   = document.getElementById('drawerTitle');
  var attendees = document.getElementById('drawerViewAttendees');
  var deactBtn  = document.getElementById('drawerDeactivate');

  var id     = ev.id || ev._id || '';
  var title  = ev.title || ev.name || 'Unnamed Event';
  var status = (ev.status || 'draft').toLowerCase();

  if (titleEl) titleEl.textContent = title;

  if (attendees) {
    attendees.href = '../pages/attendees.html?eventId=' + encodeURIComponent(id);
  }

  if (deactBtn) {
    deactBtn.onclick = function () { _deactivateEvent(id); };
    deactBtn.textContent = status === 'cancelled' ? 'Reactivate Event' : 'Deactivate Event';
  }

  var banner = ev.bannerUrl || ev.banner || '';
  var bannerHtml = banner
    ? '<img src="' + _esc(banner) + '" alt="' + _esc(title) + '" class="ae-drawer-banner" />'
    : '<div class="ae-drawer-banner-placeholder">'
    +   '<svg width="40" height="40" viewBox="0 0 24 24" fill="none">'
    +     '<rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>'
    +     '<path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    +   '</svg>'
    + '</div>';

  if (!body) return;

  body.innerHTML = bannerHtml
    + '<div class="ae-detail-section">'
    +   '<p class="ae-detail-section__title">Event Info</p>'
    +   _detailRow('Title',      title)
    +   _detailRow('Status',     '<span class="ae-badge ae-badge--' + status + '">' + _capitalise(status) + '</span>')
    +   _detailRow('Category',   _capitalise(ev.category || '—'))
    +   _detailRow('Date',       ev.startDate ? _fmtDate(ev.startDate) : '—')
    +   _detailRow('Location',   _esc(ev.location || '—'))
    +   _detailRow('City',       _esc(ev.city || '—'))
    +   _detailRow('Country',    _esc(ev.country || '—'))
    + '</div>'
    + '<div class="ae-detail-section">'
    +   '<p class="ae-detail-section__title">Organizer</p>'
    +   _detailRow('Name',  _esc(_getOrganizerName(ev)))
    +   _detailRow('Email', _esc((ev.organizer && ev.organizer.email) || '—'))
    + '</div>'
    + '<div class="ae-detail-section">'
    +   '<p class="ae-detail-section__title">Attendance</p>'
    +   _detailRow('Registered', (ev.attendeeCount || ev.registeredCount || 0).toLocaleString())
    +   _detailRow('Capacity',   (ev.capacity || '—').toLocaleString ? (ev.capacity || '—').toLocaleString() : '—')
    + '</div>'
    + (ev.description
      ? '<div class="ae-detail-section">'
      +   '<p class="ae-detail-section__title">Description</p>'
      +   '<p class="ae-detail-value">' + _esc(ev.description) + '</p>'
      + '</div>'
      : '');
}

function _detailRow(label, value) {
  return '<div class="ae-detail-row">'
    + '<span class="ae-detail-label">' + label + '</span>'
    + '<span class="ae-detail-value">' + value + '</span>'
    + '</div>';
}

function _closeDrawer() {
  var overlay = document.getElementById('drawerOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

// ── Deactivate Event ──────────────────────────────────────
function _deactivateEvent(eventId) {
  // TODO: confirm exact endpoint in Swagger with Ezekiel
  // Expected: POST /events/{id}/deactivate or DELETE /events/{id}
  fetch(_API + '/events/' + eventId + '/deactivate', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _closeDrawer();
      _showToast('Event deactivated successfully.');
      _loadEvents();
    })
    .catch(function () {
      _showToast('Unable to deactivate event. Please try again.');
    });
}

// ── Utilities ─────────────────────────────────────────────
function _getOrganizerName(ev) {
  if (!ev.organizer) return '—';
  var org = ev.organizer;
  if (typeof org === 'string') return org;
  return ((org.firstName || '') + ' ' + (org.lastName || '')).trim()
    || org.name || org.email || '—';
}

function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val != null ? val : '—';
}

function _capitalise(str) {
  if (!str || str === '—') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch (e) { return iso; }
}

function _showToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = 'toast show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = 'toast'; }, 3500);
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
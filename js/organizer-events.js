// ================================================
//  EventPro — Organizer Events
//  js/organizer-events.js
//  Depends on: auth-service.js, load-components.js
//
//  Endpoint (Swagger confirmed):
//  GET /events/organizer/my-events
//    → Lists events for the current organizer only
//
//  Row click → attendees.html?eventId=...
//  Create Event → create-event.html
// ================================================

var _API        = 'https://eventpro-fxfv.onrender.com/api';
var _PAGE_LIMIT = 10;
var _page       = 1;
var _totalPages = 1;
var _searchTimer = null;
var _allEvents  = [];   // full list for client-side filter

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard — organizer only ───────────────
  requireAuth();
  var user = getStoredUser();
  if (!user) {
    window.location.href = '../pages/sign-in.html';
    return;
  }
  // Admin should use admin-events.html
  if (user.role === 'admin') {
    window.location.href = '../pages/admin-events.html';
    return;
  }

  // ── Load sidebar + topbar ─────────────────────
  loadDashboardComponents('events');

  // ── Load events ───────────────────────────────
  _loadEvents();

  // ── Wire search ───────────────────────────────
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function () {
        _page = 1;
        _renderFiltered();
      }, 300);
    });
  }

  // ── Wire filters ──────────────────────────────
  var filterStatus   = document.getElementById('filterStatus');
  var filterCategory = document.getElementById('filterCategory');

  if (filterStatus) {
    filterStatus.addEventListener('change', function () {
      _page = 1;
      _renderFiltered();
    });
  }

  if (filterCategory) {
    filterCategory.addEventListener('change', function () {
      _page = 1;
      _renderFiltered();
    });
  }

});

// ── Load Organizer's Events ───────────────────────────────
function _loadEvents() {
  var tbody = document.getElementById('eventsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="spinner" role="status" aria-label="Loading events"></div></td></tr>';
  }

  fetch(_API + '/events/organizer/my-events', {
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
      _allEvents = data.events || data.data || (Array.isArray(data) ? data : []);
      _renderSummary();
      _renderFiltered();
    })
    .catch(function () {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="oe-empty">Unable to load events. Please try again.</td></tr>';
      }
    });
}

// ── Render Summary Strip ──────────────────────────────────
function _renderSummary() {
  var total     = _allEvents.length;
  var active    = _allEvents.filter(function (e) { return _status(e) === 'active'; }).length;
  var upcoming  = _allEvents.filter(function (e) { return _status(e) === 'upcoming'; }).length;
  var completed = _allEvents.filter(function (e) { return _status(e) === 'completed'; }).length;

  _setText('sumTotal',     total);
  _setText('sumActive',    active);
  _setText('sumUpcoming',  upcoming);
  _setText('sumCompleted', completed);
}

// ── Filter + Render ───────────────────────────────────────
function _renderFiltered() {
  var searchVal  = ((document.getElementById('searchInput')    || {}).value || '').toLowerCase();
  var statusVal  = (document.getElementById('filterStatus')    || {}).value || '';
  var catVal     = (document.getElementById('filterCategory')  || {}).value || '';

  var filtered = _allEvents.filter(function (ev) {
    var title    = (ev.title || ev.name || '').toLowerCase();
    var matchSearch   = !searchVal || title.indexOf(searchVal) !== -1;
    var matchStatus   = !statusVal || _status(ev) === statusVal;
    var matchCategory = !catVal    || (ev.category || '').toLowerCase() === catVal;
    return matchSearch && matchStatus && matchCategory;
  });

  _totalPages = Math.ceil(filtered.length / _PAGE_LIMIT) || 1;
  if (_page > _totalPages) _page = 1;

  var start   = (_page - 1) * _PAGE_LIMIT;
  var visible = filtered.slice(start, start + _PAGE_LIMIT);

  _renderTable(visible, filtered.length, start);
  _renderPagination();
}

// ── Render Table ──────────────────────────────────────────
function _renderTable(events, total, start) {
  var tbody = document.getElementById('eventsTableBody');
  if (!tbody) return;

  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="oe-empty">No events found.</td></tr>';
    _setText('oeFooterCount', 'Showing 0 events');
    return;
  }

  tbody.innerHTML = events.map(function (ev) {
    var id       = _esc(ev.id || ev._id || '');
    var title    = _esc(ev.title || ev.name || 'Unnamed Event');
    var initials = title.slice(0, 2).toUpperCase();
    var date     = ev.startDate ? _fmtDate(ev.startDate) : '—';
    var location = _esc(ev.location || ev.city || '—');
    var registered = (ev.attendeeCount || ev.registeredCount || 0).toLocaleString();
    var category = _esc(_cap(ev.category || '—'));
    var status   = _status(ev);
    var banner   = ev.bannerUrl || ev.banner || '';

    var thumbHtml = banner
      ? '<img src="' + _esc(banner) + '" alt="" class="oe-event-thumb" onerror="this.style.display=\'none\'" />'
      : '<div class="oe-event-thumb">' + initials + '</div>';

    return '<tr data-id="' + id + '" tabindex="0" role="button" aria-label="View ' + title + '">'
      + '<td>'
      +   '<div class="oe-event-cell">'
      +     thumbHtml
      +     '<span class="oe-event-name">' + title + '</span>'
      +   '</div>'
      + '</td>'
      + '<td>' + date + '</td>'
      + '<td>' + location + '</td>'
      + '<td>' + registered + '</td>'
      + '<td>' + category + '</td>'
      + '<td><span class="oe-badge oe-badge--' + status + '">' + _cap(status) + '</span></td>'
      + '<td>'
      +   '<div class="oe-action-wrap">'
      +     '<button type="button" class="oe-action-btn oe-btn-attendees" data-id="' + id + '" title="View attendees" aria-label="View attendees for ' + title + '">'
      +       '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      +     '</button>'
      +   '</div>'
      + '</td>'
      + '</tr>';
  }).join('');

  // Footer count
  var from = start + 1;
  var to   = Math.min(start + _PAGE_LIMIT, total);
  _setText('oeFooterCount', 'Showing ' + from + '–' + to + ' of ' + total + ' events');

  // Wire row clicks → attendees
  tbody.querySelectorAll('tr[data-id]').forEach(function (row) {
    var id = row.dataset.id;

    row.addEventListener('click', function (e) {
      if (e.target.closest('.oe-action-wrap')) return;
      _goToAttendees(id);
    });

    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') _goToAttendees(id);
    });
  });

  // Wire attendees buttons
  tbody.querySelectorAll('.oe-btn-attendees').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _goToAttendees(btn.dataset.id);
    });
  });
}

// ── Render Pagination ─────────────────────────────────────
function _renderPagination() {
  var nav = document.getElementById('oePagination');
  if (!nav) return;

  var html = '<button class="oe-page-btn" data-page="' + (_page - 1) + '" '
    + (_page === 1 ? 'disabled' : '') + ' aria-label="Previous">&lt;</button>';

  _pageRange(_page, _totalPages).forEach(function (p) {
    html += '<button class="oe-page-btn' + (p === _page ? ' active' : '') + '" '
      + 'data-page="' + p + '" aria-label="Page ' + p + '">' + p + '</button>';
  });

  html += '<button class="oe-page-btn" data-page="' + (_page + 1) + '" '
    + (_page === _totalPages ? 'disabled' : '') + ' aria-label="Next">&gt;</button>';

  nav.innerHTML = html;

  nav.querySelectorAll('.oe-page-btn:not([disabled])').forEach(function (btn) {
    btn.addEventListener('click', function () {
      _page = Number(btn.dataset.page);
      _renderFiltered();
    });
  });
}

function _pageRange(current, total) {
  var delta = 1;
  var left  = Math.max(1, current - delta);
  var right = Math.min(total, current + delta);
  var range = [];
  for (var i = left; i <= right; i++) range.push(i);
  if (range[0] > 1)                        range.unshift(1);
  if (range[range.length - 1] < total)     range.push(total);
  var seen = {};
  return range.filter(function (v) {
    if (seen[v]) return false;
    seen[v] = true;
    return true;
  }).sort(function (a, b) { return a - b; });
}

// ── Navigation ────────────────────────────────────────────
function _goToAttendees(eventId) {
  window.location.href = '../pages/attendees.html?eventId=' + encodeURIComponent(eventId);
}

// ── Utilities ─────────────────────────────────────────────
function _status(ev) {
  return (ev.status || 'draft').toLowerCase();
}

function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val != null ? val : '—';
}

function _cap(str) {
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

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
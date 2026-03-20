// ================================================
//  EventPro — Attendees
//  js/attendees.js
//  Depends on:
//    js/services/auth-service.js
//    js/utils/load-components.js
//
//  Endpoints used:
//  GET /events                              ← event name
//  GET /events/{eventId}/attendees          ← attendees list
//
//  URL params accepted:
//  ?eventId=  — pre-select event
//
//  Role behaviour:
//  admin/organizer → full controls (Add Attendees, Export CSV)
//  user/attendee   → read-only view, controls hidden
// ================================================

var _ATT_API        = 'https://eventpro-fxfv.onrender.com/api';
var _ATT_PAGE_LIMIT = 24;

var _attState = {
  eventId:      null,
  eventName:    '—',
  allAttendees: [],
  filtered:     [],
  page:         1,
  totalPages:   1,
  filterType:   '',
  filterStatus: '',
};

document.addEventListener('DOMContentLoaded', function () {

  requireAuth();

  loadDashboardComponents('attendees');

  // Read eventId from URL
  var params = new URLSearchParams(window.location.search);
  _attState.eventId = params.get('eventId') || null;

  // ── Role-based controls ───────────────────────
  var user    = getStoredUser();
  var role    = user && user.role;
  var isAdmin = role === 'admin' || role === 'organizer';

  var addBtn    = document.getElementById('addAttendeeBtn');
  var exportBtn = document.getElementById('exportCsvBtn');

  if (addBtn) {
    if (isAdmin) {
      addBtn.hidden = false;
      addBtn.addEventListener('click', function () {
        var dest = '../pages/upload.html';
        if (_attState.eventId) {
          dest += '?eventId=' + encodeURIComponent(_attState.eventId);
        }
        window.location.href = dest;
      });
    } else {
      // Hide for attendees
      addBtn.hidden = true;
    }
  }

  if (exportBtn) {
    if (isAdmin) {
      exportBtn.hidden = false;
      exportBtn.addEventListener('click', _attExportCSV);
    } else {
      exportBtn.hidden = true;
    }
  }

  // ── Wire filters ──────────────────────────────
  var filterTicketType = document.getElementById('filterTicketType');
  var filterStatus     = document.getElementById('filterStatus');
  if (filterTicketType) filterTicketType.addEventListener('change', _attOnFilterChange);
  if (filterStatus)     filterStatus.addEventListener('change',     _attOnFilterChange);

  // ── Load data ─────────────────────────────────
  if (_attState.eventId) {
    _attLoadEventName(_attState.eventId);
    _attLoadAttendees(_attState.eventId);
  } else {
    _attLoadLatestEvent();
  }

});

// ════════════════════════════════════════════════
//  DATA LOADING
// ════════════════════════════════════════════════

function _attLoadLatestEvent() {
  _attApiFetch(_ATT_API + '/events?limit=1&sort=recent')
    .then(function (res) {
      var events = (res && (res.events || res.data || res)) || [];
      if (!Array.isArray(events)) events = [];
      if (events.length) {
        _attState.eventId = events[0]._id || events[0].id;
        _attLoadEventName(_attState.eventId);
        _attLoadAttendees(_attState.eventId);
      } else {
        _attRenderEmpty('No events found. Create an event first.');
      }
    })
    .catch(function () {
      _attRenderEmpty('Unable to load events. Please try again.');
    });
}

function _attLoadEventName(eventId) {
  _attApiFetch(_ATT_API + '/events/' + eventId)
    .then(function (res) {
      _attState.eventName = (res && (res.name || res.title)) || '—';
      _attSetText('eventNameDisplay', _attState.eventName);
    })
    .catch(function () {
      _attSetText('eventNameDisplay', '—');
    });
}

function _attLoadAttendees(eventId) {
  var tbody = document.getElementById('attendeeTableBody');
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="7"><div class="spinner" role="status" aria-label="Loading attendees"></div></td></tr>';
  }

  _attApiFetch(_ATT_API + '/events/' + eventId + '/attendees?limit=1000')
    .then(function (res) {
      var attendees = (res && (res.attendees || res.data || res)) || [];
      _attState.allAttendees = Array.isArray(attendees) ? attendees : [];
      _attApplyFilters();
    })
    .catch(function () {
      _attRenderEmpty('Unable to load attendees. Please try again.');
    });
}

// ════════════════════════════════════════════════
//  FILTER
// ════════════════════════════════════════════════

function _attOnFilterChange() {
  var filterTicketType = document.getElementById('filterTicketType');
  var filterStatus     = document.getElementById('filterStatus');
  _attState.filterType   = filterTicketType ? filterTicketType.value : '';
  _attState.filterStatus = filterStatus     ? filterStatus.value     : '';
  _attState.page = 1;
  _attApplyFilters();
}

function _attApplyFilters() {
  var list = _attState.allAttendees.slice();

  if (_attState.filterType) {
    list = list.filter(function (a) {
      return (a.ticketType || a.type || '').toLowerCase() === _attState.filterType.toLowerCase();
    });
  }

  if (_attState.filterStatus) {
    list = list.filter(function (a) {
      var s = (a.status || '').toLowerCase();
      return _attState.filterStatus === 'checked-in'
        ? s === 'checked-in' || s === 'checkedin' || a.checkedIn === true
        : s === 'pending' || (!a.checkedIn && s !== 'checked-in');
    });
  }

  _attState.filtered   = list;
  _attState.totalPages = Math.max(1, Math.ceil(list.length / _ATT_PAGE_LIMIT));
  if (_attState.page > _attState.totalPages) _attState.page = 1;

  _attRenderStats();
  _attRenderTable();
  _attRenderPagination();
}

// ════════════════════════════════════════════════
//  RENDER — STATS
// ════════════════════════════════════════════════

function _attRenderStats() {
  var total     = _attState.allAttendees.length;
  var checkedIn = _attState.allAttendees.filter(function (a) {
    return a.checkedIn === true || (a.status || '').toLowerCase() === 'checked-in';
  }).length;
  var pending   = total - checkedIn;

  _attSetText('statTotal',     total.toLocaleString());
  _attSetText('statCheckedIn', checkedIn.toLocaleString());
  _attSetText('statPending',   pending.toLocaleString());
}

// ════════════════════════════════════════════════
//  RENDER — TABLE
// ════════════════════════════════════════════════

function _attRenderTable() {
  var tbody = document.getElementById('attendeeTableBody');
  if (!tbody) return;

  var start = (_attState.page - 1) * _ATT_PAGE_LIMIT;
  var slice = _attState.filtered.slice(start, start + _ATT_PAGE_LIMIT);

  if (!slice.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="att-empty">No attendees found.</td></tr>';
    _attSetText('footerCount', 'Showing 0 attendees');
    return;
  }

  tbody.innerHTML = slice.map(function (a) {
    var checkedIn  = _attIsCheckedIn(a);
    var statusHtml = checkedIn
      ? '<span class="att-badge att-badge--checked">'
      +   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
      +     '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
      +   '</svg>'
      +   ' Checked-In</span>'
      : '<span class="att-badge att-badge--pending">Pending</span>';

    var actionHtml = checkedIn
      ? '<button type="button" class="att-action-btn" title="View ticket">'
      +   '<svg class="icon-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
      +     '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      +   '</svg></button>'
      : '<button type="button" class="att-action-btn" title="View ticket">'
      +   '<svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      +     '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
      +     '<circle cx="12" cy="12" r="3"/>'
      +   '</svg></button>';

    return '<tr data-id="' + _attEscHtml(a._id || a.id || '') + '" tabindex="0" role="button">'
      + '<td>' + _attEscHtml(a.name          || a.attendeeName  || '—') + '</td>'
      + '<td>' + _attEscHtml(a.email         || a.attendeeEmail || '—') + '</td>'
      + '<td>' + _attEscHtml(a.phone         || a.phoneNumber   || '—') + '</td>'
      + '<td>' + _attEscHtml(_attCap(a.ticketType || a.type || 'Standard')) + '</td>'
      + '<td>' + _attEscHtml(a.ticketId      || a.id            || '—') + '</td>'
      + '<td>' + statusHtml + '</td>'
      + '<td>' + actionHtml + '</td>'
      + '</tr>';
  }).join('');

  // Wire row clicks → ticket-details
  tbody.querySelectorAll('tr[data-id]').forEach(function (row) {
    function _handler() { _attOpenTicket(row.dataset.id); }
    row.addEventListener('click', _handler);
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') _handler();
    });
    var actionBtn = row.querySelector('.att-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        _attOpenTicket(row.dataset.id);
      });
    }
  });

  var total = _attState.filtered.length;
  var from  = start + 1;
  var to    = Math.min(start + _ATT_PAGE_LIMIT, total);
  _attSetText('footerCount', 'Showing ' + from + '–' + to + ' of ' + total + ' attendees');
}

function _attOpenTicket(attendeeId) {
  var attendee = _attState.allAttendees.find(function (a) {
    return (a._id || a.id) === attendeeId;
  });
  if (!attendee) return;

  var payload = Object.assign({}, attendee, {
    eventName: _attState.eventName,
    eventId:   _attState.eventId,
  });

  localStorage.setItem('eventpro_selected_attendee', JSON.stringify(payload));
  window.location.href = '../pages/ticket-details.html';
}

// ════════════════════════════════════════════════
//  RENDER — PAGINATION
// ════════════════════════════════════════════════

function _attRenderPagination() {
  var nav = document.getElementById('pagination');
  if (!nav) return;

  var page       = _attState.page;
  var totalPages = _attState.totalPages;
  var html       = '';

  html += '<button class="att-page-btn" ' + (page === 1 ? 'disabled' : '') + ' data-page="' + (page - 1) + '" aria-label="Previous page">&lt;</button>';

  _attPageRange(page, totalPages).forEach(function (p) {
    html += '<button class="att-page-btn ' + (p === page ? 'active' : '') + '" data-page="' + p + '" aria-label="Page ' + p + '" ' + (p === page ? 'aria-current="page"' : '') + '>' + p + '</button>';
  });

  html += '<button class="att-page-btn" ' + (page === totalPages ? 'disabled' : '') + ' data-page="' + (page + 1) + '" aria-label="Next page">&gt;</button>';

  nav.innerHTML = html;

  nav.querySelectorAll('.att-page-btn:not([disabled])').forEach(function (btn) {
    btn.addEventListener('click', function () {
      _attState.page = Number(btn.dataset.page);
      _attRenderTable();
      _attRenderPagination();
      var table = document.getElementById('attendeeTable');
      if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function _attPageRange(current, total) {
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

// ════════════════════════════════════════════════
//  EXPORT CSV — admin/organizer only
// ════════════════════════════════════════════════

function _attExportCSV() {
  var rows = _attState.filtered;
  if (!rows.length) {
    _attShowToast('No data to export.', 'error');
    return;
  }

  var headers = ['Name', 'Email', 'Phone', 'Ticket Type', 'Ticket ID', 'Status'];
  var lines   = [headers.join(',')];

  rows.forEach(function (a) {
    lines.push([
      _attCsvEscape(a.name          || a.attendeeName  || ''),
      _attCsvEscape(a.email         || a.attendeeEmail || ''),
      _attCsvEscape(a.phone         || a.phoneNumber   || ''),
      _attCsvEscape(a.ticketType    || a.type          || 'Standard'),
      _attCsvEscape(a.ticketId      || a.id            || ''),
      _attCsvEscape(_attIsCheckedIn(a) ? 'Checked-In' : 'Pending'),
    ].join(','));
  });

  var blob     = new Blob([lines.join('\n')], { type: 'text/csv' });
  var url      = URL.createObjectURL(blob);
  var link     = document.createElement('a');
  link.href     = url;
  link.download = 'attendees-' + (_attState.eventId || 'export') + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  _attShowToast('CSV exported successfully.', 'success');
}

// ════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════

function _attRenderEmpty(msg) {
  var tbody = document.getElementById('attendeeTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="att-empty">' + _attEscHtml(msg) + '</td></tr>';
  }
  _attSetText('footerCount',    'Showing 0 attendees');
  _attSetText('statTotal',      '0');
  _attSetText('statCheckedIn',  '0');
  _attSetText('statPending',    '0');
}

function _attSetText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val != null ? val : '—';
}

function _attIsCheckedIn(a) {
  return a.checkedIn === true
    || (a.status || '').toLowerCase() === 'checked-in'
    || (a.status || '').toLowerCase() === 'checkedin';
}

function _attShowToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = ('toast show ' + (type || '')).trim();
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = 'toast'; }, 3500);
}

// ════════════════════════════════════════════════
//  API HELPER
// ════════════════════════════════════════════════

function _attApiFetch(url) {
  return fetch(url, {
    method:  'GET',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
}

// ════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════

function _attCap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _attEscHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _attCsvEscape(str) {
  var s = String(str || '');
  return s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}
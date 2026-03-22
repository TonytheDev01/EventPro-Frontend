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

  // Detect tab for correct sidebar active state
  var _tabParam = new URLSearchParams(window.location.search).get('tab');
  var _activeTab = _tabParam === 'events' ? 'att-events' : _tabParam === 'tickets' ? 'att-tickets' : 'attendees';
  loadDashboardComponents(_activeTab);

  // Update breadcrumb dashboard link based on role
  var _bUser = getStoredUser();
  var _bLink = document.getElementById('breadcrumbDashLink');
  if (_bLink && _bUser) {
    if (_bUser.role === 'admin') {
      _bLink.href = '../pages/admin-dashboard.html';
    } else if (_bUser.role === 'organizer') {
      _bLink.href = '../pages/organizer-dashboard.html';
    } else {
      _bLink.href = '../pages/attendees.html';
    }
  }

  // Read URL params
  var params = new URLSearchParams(window.location.search);
  _attState.eventId = params.get('eventId') || null;

  // Tab=events — show events discovery list for attendees
  if (params.get('tab') === 'events') {
    _attShowEventsTab();
    return;
  }

  // Tab=tickets — show user's registered tickets
  if (params.get('tab') === 'tickets') {
    _attShowMyTickets();
    return;
  }

  // ── Role-based controls ───────────────────────
  var user    = getStoredUser();
  var role    = user && user.role;
  // FIX: Add Attendees is organizer only — admin oversees, does not operate
  var isOrganizer = role === 'organizer';
  // Export CSV available to both admin and organizer
  var canExport = role === 'admin' || role === 'organizer';

  var addBtn    = document.getElementById('addAttendeeBtn');
  var exportBtn = document.getElementById('exportCsvBtn');

  if (addBtn) {
    if (isOrganizer) {
      addBtn.hidden = false;
      addBtn.addEventListener('click', function () {
        var dest = '../pages/upload.html';
        if (_attState.eventId) {
          dest += '?eventId=' + encodeURIComponent(_attState.eventId);
        }
        window.location.href = dest;
      });
    } else {
      addBtn.hidden = true;
    }
  }

  if (exportBtn) {
    if (canExport) {
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

  _attApiFetch(_ATT_API + '/events/' + eventId + '/attendees?limit=500')
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

// ════════════════════════════════════════════════
//  EVENTS TAB — show browsable events list
//  Triggered when URL has ?tab=events
//  Replaces attendees table with events grid
// ════════════════════════════════════════════════

function _attShowEventsTab() {
  // Hide attendees-specific UI
  var attTable   = document.getElementById('attendeeTable');
  var attFilters = document.querySelector('.att-controls');
  var attStats   = document.querySelector('.att-stats');
  var addBtn     = document.getElementById('addAttendeeBtn');
  var exportBtn  = document.getElementById('exportCsvBtn');

  if (attTable)   attTable.style.display   = 'none';
  if (attFilters) attFilters.style.display = 'none';
  if (attStats)   attStats.style.display   = 'none';
  if (addBtn)     addBtn.hidden            = true;
  if (exportBtn)  exportBtn.hidden         = true;

  // Update page heading
  var heading = document.getElementById('eventNameDisplay');
  if (heading) heading.textContent = 'All Events';

  // Inject events container
  var main = document.querySelector('.dashboard-content');
  if (!main) return;

  var eventsSection = document.createElement('div');
  eventsSection.id = 'eventsDiscovery';
  eventsSection.innerHTML =
    '<div class="att-events-grid" id="eventsGrid">'
    + '<div class="spinner" role="status" aria-label="Loading events"></div>'
    + '</div>';
  main.appendChild(eventsSection);

  // Add styles inline for events grid
  var style = document.createElement('style');
  style.textContent =
    '.att-events-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-top: 1rem; }'
    + '@media(min-width:40rem){ .att-events-grid{ grid-template-columns: repeat(2,1fr); } }'
    + '@media(min-width:64rem){ .att-events-grid{ grid-template-columns: repeat(3,1fr); } }'
    + '.att-event-card { background: var(--color-card-bg); border: 1px solid var(--color-border-light); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; box-shadow: var(--shadow-card); }'
    + '.att-event-card__title { font-size: 0.9375rem; font-weight: 700; color: var(--color-text-dark); }'
    + '.att-event-card__meta { font-size: 0.8125rem; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 0.25rem; }'
    + '.att-event-card__badge { display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.6875rem; font-weight: 600; background: #DCFCE7; color: #166534; align-self: flex-start; }'
    + '.att-event-card__btn { margin-top: auto; padding: 0.625rem; background: var(--color-primary); color: var(--color-white); border: none; border-radius: 8px; font-family: Poppins,sans-serif; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-align: center; transition: background 0.18s; }'
    + '.att-event-card__btn:hover { background: var(--color-primary-hover); }'
    + '.att-event-card__btn:disabled { background: #C4B5FD; cursor: not-allowed; }'
    + '.att-events-empty { text-align: center; padding: 3rem 1rem; color: var(--color-text-muted); font-size: 0.875rem; grid-column: 1/-1; }';
  document.head.appendChild(style);

  // Fetch all events
  fetch(_ATT_API + '/events?limit=50&sort=recent', {
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
      var events = (data.events || data.data || (Array.isArray(data) ? data : []));
      _attRenderEventsGrid(events);
    })
    .catch(function () {
      var grid = document.getElementById('eventsGrid');
      if (grid) grid.innerHTML = '<p class="att-events-empty">Unable to load events. Please try again.</p>';
    });
}

function _attRenderEventsGrid(events) {
  var grid = document.getElementById('eventsGrid');
  if (!grid) return;

  if (!events.length) {
    grid.innerHTML = '<p class="att-events-empty">No events found.</p>';
    return;
  }

  grid.innerHTML = events.map(function (ev) {
    var id       = _attEscHtml(ev.id || ev._id || '');
    var title    = _attEscHtml(ev.title || ev.name || 'Unnamed Event');
    var date     = ev.startDate ? new Date(ev.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    var location = _attEscHtml(ev.location || ev.city || '—');
    var status   = (ev.status || 'active').toLowerCase();
    var capacity = ev.capacity ? ev.capacity.toLocaleString() : '—';

    return '<div class="att-event-card">'
      + '<span class="att-event-card__badge">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span>'
      + '<p class="att-event-card__title">' + title + '</p>'
      + '<div class="att-event-card__meta">'
      +   '<span>📅 ' + date + '</span>'
      +   '<span>📍 ' + location + '</span>'
      +   '<span>👥 Capacity: ' + capacity + '</span>'
      + '</div>'
      + '<button type="button" class="att-event-card__btn" data-id="' + id + '">Register</button>'
      + '</div>';
  }).join('');

  // Wire Register buttons
  grid.querySelectorAll('.att-event-card__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var eventId   = btn.dataset.id;
      var regUser   = getStoredUser();
      var regPhone  = regUser && regUser.phone;

      if (!regPhone) {
        _attShowToast('Please add your phone number in Settings before registering for an event.', 'error');
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Registering…';

      fetch(_ATT_API + '/events/' + eventId + '/register', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + getStoredToken(),
        },
        // Ezekiel's register endpoint uses Bearer token to identify user — no body needed
        body: JSON.stringify({}),
      })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (result.ok) {
            btn.textContent = '✓ Registered';
            btn.style.background = '#22C55E';
            // Store ticket with attendee details from response + stored user fallback
            var regUser     = getStoredUser();
            var regAttendee = result.data.attendee || {};
            var ticketData  = Object.assign({}, result.data, {
              // Flatten attendee fields for ticket-details.js to read
              firstName:  regAttendee.firstName  || (regUser && regUser.firstName)  || '',
              lastName:   regAttendee.lastName   || (regUser && regUser.lastName)   || '',
              name:       (regAttendee.firstName || regAttendee.lastName)
                            ? ((regAttendee.firstName || '') + ' ' + (regAttendee.lastName || '')).trim()
                            : (regUser && ((regUser.firstName || '') + ' ' + (regUser.lastName || '')).trim()) || '',
              email:      regAttendee.email  || (regUser && regUser.email)  || '',
              phone:      regAttendee.phone  || (regUser && regUser.phone)  || '',
              eventId:    eventId,
              status:     'confirmed',
              ticketId:   result.data.ticketId || result.data._id || result.data.id || '',
            });
            localStorage.setItem('eventpro_selected_attendee', JSON.stringify(ticketData));
          } else {
            btn.disabled    = false;
            btn.textContent = result.data.message || result.data.error || 'Failed. Try again.';
            setTimeout(function () { btn.textContent = 'Register'; }, 3000);
          }
        })
        .catch(function () {
          btn.disabled    = false;
          btn.textContent = 'Network error. Try again.';
          setTimeout(function () { btn.textContent = 'Register'; }, 3000);
        });
    });
  });
}

// ════════════════════════════════════════════════
//  MY TICKETS TAB
//  Triggered when URL has ?tab=tickets
//  Endpoint: GET /auth/profile/registrations
//  (To be built by Ezekiel — see spec below)
// ════════════════════════════════════════════════

function _attShowMyTickets() {
  // Hide attendees-specific UI
  var attTable   = document.getElementById('attendeeTable');
  var attFilters = document.querySelector('.att-controls');
  var attStats   = document.querySelector('.att-stats');
  var addBtn     = document.getElementById('addAttendeeBtn');
  var exportBtn  = document.getElementById('exportCsvBtn');

  if (attTable)   attTable.style.display   = 'none';
  if (attFilters) attFilters.style.display = 'none';
  if (attStats)   attStats.style.display   = 'none';
  if (addBtn)     addBtn.hidden            = true;
  if (exportBtn)  exportBtn.hidden         = true;

  // Update heading
  var heading = document.getElementById('eventNameDisplay');
  if (heading) heading.textContent = 'My Tickets';

  // Inject tickets container
  var main = document.querySelector('.dashboard-content');
  if (!main) return;

  var section = document.createElement('div');
  section.id  = 'myTicketsSection';
  section.innerHTML =
    '<div class="att-tickets-grid" id="ticketsGrid">'
    + '<div class="spinner" role="status" aria-label="Loading tickets"></div>'
    + '</div>';
  main.appendChild(section);

  // Inject styles
  var style = document.createElement('style');
  style.textContent =
    '.att-tickets-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-top: 1rem; }'
    + '@media(min-width:40rem){ .att-tickets-grid{ grid-template-columns: repeat(2,1fr); } }'
    + '@media(min-width:64rem){ .att-tickets-grid{ grid-template-columns: repeat(3,1fr); } }'
    + '.att-ticket-card { background: var(--color-card-bg); border: 1px solid var(--color-border-light); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; box-shadow: var(--shadow-card); position: relative; overflow: hidden; }'
    + '.att-ticket-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--color-primary); }'
    + '.att-ticket-card__title { font-size: 0.9375rem; font-weight: 700; color: var(--color-text-dark); }'
    + '.att-ticket-card__id { font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace; background: var(--color-bg-muted, #F5F6FA); padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block; }'
    + '.att-ticket-card__meta { font-size: 0.8125rem; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 0.25rem; }'
    + '.att-ticket-card__status { display: inline-flex; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.6875rem; font-weight: 600; align-self: flex-start; }'
    + '.att-ticket-card__status--confirmed { background: #DCFCE7; color: #166534; }'
    + '.att-ticket-card__status--pending   { background: #FEF9C3; color: #854D0E; }'
    + '.att-ticket-card__status--cancelled { background: #FEE2E2; color: #991B1B; }'
    + '.att-ticket-card__btn { margin-top: auto; padding: 0.625rem; background: transparent; color: var(--color-primary); border: 1.5px solid var(--color-primary); border-radius: 8px; font-family: Poppins,sans-serif; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.18s; }'
    + '.att-ticket-card__btn:hover { background: var(--color-primary); color: #fff; }'
    + '.att-tickets-empty { text-align: center; padding: 3rem 1rem; color: var(--color-text-muted); font-size: 0.875rem; grid-column: 1/-1; }'
    + '.att-tickets-empty svg { width: 3rem; height: 3rem; margin: 0 auto 1rem; display: block; color: #D1D5DB; }'
    + '.att-tickets-empty p { margin: 0; }'
    + '.att-tickets-empty a { color: var(--color-primary); font-weight: 600; text-decoration: none; }';
  document.head.appendChild(style);

  // Fetch user's registered tickets
  // Endpoint: GET /auth/profile/registrations
  fetch(_ATT_API + '/auth/profile/registrations', {
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
      var tickets = data.registrations || data.tickets || data.data || (Array.isArray(data) ? data : []);
      _attRenderTicketsGrid(tickets);
    })
    .catch(function () {
      var grid = document.getElementById('ticketsGrid');
      if (grid) {
        grid.innerHTML =
          '<div class="att-tickets-empty">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>'
          + '<p>Unable to load your tickets. Please try again later.</p>'
          + '</div>';
      }
    });
}

function _attRenderTicketsGrid(tickets) {
  var grid = document.getElementById('ticketsGrid');
  if (!grid) return;

  if (!tickets || !tickets.length) {
    grid.innerHTML =
      '<div class="att-tickets-empty">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>'
      + '<p>You have not registered for any events yet.<br>'
      + '<a href="../pages/attendees.html?tab=events">Browse Events</a> to get started.</p>'
      + '</div>';
    return;
  }

  grid.innerHTML = tickets.map(function (t) {
    var eventName  = _attEscHtml(t.eventName  || t.event && t.event.title || t.event && t.event.name || 'Event');
    var ticketId   = _attEscHtml(t.ticketId   || t.id  || t._id  || '—');
    var date       = t.eventDate || (t.event && (t.event.startDate || t.event.date));
    var dateStr    = date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    var location   = _attEscHtml(t.eventLocation || (t.event && t.event.location) || '—');
    var status     = (t.status || 'confirmed').toLowerCase();
    var statusClass = status === 'confirmed' ? 'confirmed' : status === 'cancelled' ? 'cancelled' : 'pending';
    var statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

    return '<div class="att-ticket-card">'
      + '<span class="att-ticket-card__status att-ticket-card__status--' + statusClass + '">' + statusLabel + '</span>'
      + '<p class="att-ticket-card__title">' + eventName + '</p>'
      + '<span class="att-ticket-card__id">🎟 ' + ticketId + '</span>'
      + '<div class="att-ticket-card__meta">'
      +   '<span>📅 ' + dateStr  + '</span>'
      +   '<span>📍 ' + location + '</span>'
      + '</div>'
      + '<button type="button" class="att-ticket-card__btn" data-id="' + _attEscHtml(t.eventId || (t.event && (t.event.id || t.event._id)) || '') + '" data-ticket="' + _attEscHtml(JSON.stringify(t)) + '">View Ticket</button>'
      + '</div>';
  }).join('');

  // Wire View Ticket buttons
  grid.querySelectorAll('.att-ticket-card__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      try {
        var ticketData = JSON.parse(btn.dataset.ticket);
        localStorage.setItem('eventpro_selected_attendee', JSON.stringify(ticketData));
        window.location.href = '../pages/ticket-details.html';
      } catch (e) {
        _attShowToast('Unable to open ticket. Please try again.', 'error');
      }
    });
  });
}
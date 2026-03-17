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
//  POST /events/{eventId}/checkin/generate  ← check-in
//
//  URL params accepted:
//  ?eventId=  — pre-select event
//  ?tab=events — future tab support
// ================================================

const API        = 'https://eventpro-fxfv.onrender.com/api';
const PAGE_LIMIT = 24;

// ── State ─────────────────────────────────────────
let _state = {
  eventId:     null,
  eventName:   '—',
  allAttendees: [],   // full list for client-side filter
  filtered:    [],    // filtered view
  page:        1,
  totalPages:  1,
  filterType:  '',
  filterStatus:'',
};

// ════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {

  requireAuth();

  // Load sidebar + topbar — attendees tab active
  await loadDashboardComponents('attendees');

  // Read eventId from URL
  const params = new URLSearchParams(window.location.search);
  _state.eventId = params.get('eventId') ?? null;

  // Wire filters
  document.getElementById('filterTicketType')
    ?.addEventListener('change', _onFilterChange);
  document.getElementById('filterStatus')
    ?.addEventListener('change', _onFilterChange);

  // Wire export
  document.getElementById('exportCsvBtn')
    ?.addEventListener('click', _exportCSV);

  // Wire add attendee
  document.getElementById('addAttendeeBtn')
    ?.addEventListener('click', () => {
      _showToast('Add Attendee — coming soon.', '');
    });

  // Load data
  if (_state.eventId) {
    await _loadEventName(_state.eventId);
    await _loadAttendees(_state.eventId);
  } else {
    await _loadLatestEvent();
  }

});

// ════════════════════════════════════════════════
//  DATA LOADING
// ════════════════════════════════════════════════

async function _loadLatestEvent() {
  try {
    const res = await _apiFetch(
      `${API}/events?limit=1&sort=recent`
    );
    const events = res?.events ?? res?.data ?? res ?? [];
    if (events.length) {
      _state.eventId = events[0]._id ?? events[0].id;
      await _loadEventName(_state.eventId);
      await _loadAttendees(_state.eventId);
    } else {
      _renderEmpty('No events found. Create an event first.');
    }
  } catch {
    _renderEmpty('Unable to load events. Please try again.');
  }
}

async function _loadEventName(eventId) {
  try {
    const res = await _apiFetch(`${API}/events/${eventId}`);
    _state.eventName = res?.name ?? res?.title ?? '—';
    _setText('eventNameDisplay', _state.eventName);
  } catch {
    _setText('eventNameDisplay', '—');
  }
}

async function _loadAttendees(eventId) {
  const tbody = document.getElementById('attendeeTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="spinner" role="status" aria-label="Loading attendees"></div>
        </td>
      </tr>`;
  }

  try {
    const res = await _apiFetch(
      `${API}/events/${eventId}/attendees?limit=1000`
    );

    const attendees = res?.attendees ?? res?.data ?? res ?? [];

    _state.allAttendees = Array.isArray(attendees) ? attendees : [];
    _applyFilters();

  } catch {
    _renderEmpty('Unable to load attendees. Please try again.');
  }
}

// ════════════════════════════════════════════════
//  FILTER
// ════════════════════════════════════════════════

function _onFilterChange() {
  _state.filterType   = document.getElementById('filterTicketType')?.value ?? '';
  _state.filterStatus = document.getElementById('filterStatus')?.value ?? '';
  _state.page = 1;
  _applyFilters();
}

function _applyFilters() {
  let list = [..._state.allAttendees];

  if (_state.filterType) {
    list = list.filter(a =>
      (a.ticketType ?? a.type ?? '').toLowerCase() ===
      _state.filterType.toLowerCase()
    );
  }

  if (_state.filterStatus) {
    list = list.filter(a => {
      const s = (a.status ?? '').toLowerCase();
      return _state.filterStatus === 'checked-in'
        ? s === 'checked-in' || s === 'checkedin' || a.checkedIn === true
        : s === 'pending' || (!a.checkedIn && s !== 'checked-in');
    });
  }

  _state.filtered   = list;
  _state.totalPages = Math.max(1, Math.ceil(list.length / PAGE_LIMIT));
  if (_state.page > _state.totalPages) _state.page = 1;

  _renderStats();
  _renderTable();
  _renderPagination();
}

// ════════════════════════════════════════════════
//  RENDER — STATS
// ════════════════════════════════════════════════

function _renderStats() {
  const total     = _state.allAttendees.length;
  const checkedIn = _state.allAttendees.filter(a =>
    a.checkedIn === true ||
    (a.status ?? '').toLowerCase() === 'checked-in'
  ).length;
  const pending   = total - checkedIn;

  _setText('statTotal',     total.toLocaleString());
  _setText('statCheckedIn', checkedIn.toLocaleString());
  _setText('statPending',   pending.toLocaleString());
}

// ════════════════════════════════════════════════
//  RENDER — TABLE
// ════════════════════════════════════════════════

function _renderTable() {
  const tbody = document.getElementById('attendeeTableBody');
  if (!tbody) return;

  const start = (_state.page - 1) * PAGE_LIMIT;
  const slice = _state.filtered.slice(start, start + PAGE_LIMIT);

  if (!slice.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="att-empty">No attendees found.</td>
      </tr>`;
    _setText('footerCount', 'Showing 0 attendees');
    return;
  }

  tbody.innerHTML = slice.map(a => {
    const checkedIn  = _isCheckedIn(a);
    const statusHtml = checkedIn
      ? `<span class="att-badge att-badge--checked">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
             <polyline points="20 6 9 17 4 12"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
           Checked-In
         </span>`
      : `<span class="att-badge att-badge--pending">Pending</span>`;

    const actionHtml = checkedIn
      ? `<button type="button" class="att-action-btn"
           title="View ticket" aria-label="View ticket for ${_escHtml(a.name ?? '')}">
           <svg class="icon-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
             <polyline points="20 6 9 17 4 12"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
         </button>`
      : `<button type="button" class="att-action-btn"
           title="View ticket" aria-label="View ticket for ${_escHtml(a.name ?? '')}">
           <svg class="icon-eye" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>
         </button>`;

    return `
      <tr
        data-id="${_escHtml(a._id ?? a.id ?? '')}"
        tabindex="0"
        role="button"
        aria-label="View ticket for ${_escHtml(a.name ?? 'attendee')}">
        <td>${_escHtml(a.name          ?? a.attendeeName  ?? '—')}</td>
        <td>${_escHtml(a.email         ?? a.attendeeEmail ?? '—')}</td>
        <td>${_escHtml(a.phone         ?? a.phoneNumber   ?? '—')}</td>
        <td>${_escHtml(_cap(a.ticketType ?? a.type ?? 'Standard'))}</td>
        <td>${_escHtml(a.ticketId      ?? a.id            ?? '—')}</td>
        <td>${statusHtml}</td>
        <td>${actionHtml}</td>
      </tr>`;
  }).join('');

  // Wire row clicks → ticket-details
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    const handler = () => _openTicket(row.dataset.id);
    row.addEventListener('click', handler);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter') handler();
    });

    // Action button stops row propagation
    row.querySelector('.att-action-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      _openTicket(row.dataset.id);
    });
  });

  // Footer count
  const total = _state.filtered.length;
  const from  = start + 1;
  const to    = Math.min(start + PAGE_LIMIT, total);
  _setText('footerCount', `Showing ${from}–${to} of ${total} attendees`);
}

// ── Navigate to ticket-details ────────────────────
function _openTicket(attendeeId) {
  const attendee = _state.allAttendees.find(
    a => (a._id ?? a.id) === attendeeId
  );
  if (!attendee) return;

  // Enrich with event name for ticket-details page
  const payload = {
    ...attendee,
    eventName: _state.eventName,
    eventId:   _state.eventId,
  };

  localStorage.setItem('eventpro_selected_attendee', JSON.stringify(payload));
  window.location.href = '../pages/ticket-details.html';
}

// ════════════════════════════════════════════════
//  RENDER — PAGINATION
// ════════════════════════════════════════════════

function _renderPagination() {
  const nav = document.getElementById('pagination');
  if (!nav) return;

  const { page, totalPages } = _state;
  let html = '';

  // Prev
  html += `<button class="att-page-btn" ${page === 1 ? 'disabled' : ''}
    data-page="${page - 1}" aria-label="Previous page">&lt;</button>`;

  // Page numbers — show max 4 around current
  const range = _pageRange(page, totalPages);
  range.forEach(p => {
    html += `<button class="att-page-btn ${p === page ? 'active' : ''}"
      data-page="${p}" aria-label="Page ${p}"
      ${p === page ? 'aria-current="page"' : ''}>${p}</button>`;
  });

  // Next
  html += `<button class="att-page-btn" ${page === totalPages ? 'disabled' : ''}
    data-page="${page + 1}" aria-label="Next page">&gt;</button>`;

  nav.innerHTML = html;

  nav.querySelectorAll('.att-page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.page = Number(btn.dataset.page);
      _renderTable();
      _renderPagination();
      // Scroll table into view
      document.getElementById('attendeeTable')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function _pageRange(current, total) {
  const delta = 1;
  const range = [];
  const left  = Math.max(1, current - delta);
  const right = Math.min(total, current + delta);
  for (let i = left; i <= right; i++) range.push(i);
  // Always show first and last
  if (range[0] > 1)      range.unshift(1);
  if (range[range.length - 1] < total) range.push(total);
  return [...new Set(range)].sort((a, b) => a - b);
}

// ════════════════════════════════════════════════
//  EXPORT CSV
// ════════════════════════════════════════════════

function _exportCSV() {
  const rows = _state.filtered;
  if (!rows.length) {
    _showToast('No data to export.', 'error');
    return;
  }

  const headers = ['Name', 'Email', 'Phone', 'Ticket Type', 'Ticket ID', 'Status'];
  const lines   = [headers.join(',')];

  rows.forEach(a => {
    lines.push([
      _csvEscape(a.name          ?? a.attendeeName  ?? ''),
      _csvEscape(a.email         ?? a.attendeeEmail ?? ''),
      _csvEscape(a.phone         ?? a.phoneNumber   ?? ''),
      _csvEscape(a.ticketType    ?? a.type          ?? 'Standard'),
      _csvEscape(a.ticketId      ?? a.id            ?? ''),
      _csvEscape(_isCheckedIn(a) ? 'Checked-In' : 'Pending'),
    ].join(','));
  });

  const blob  = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url   = URL.createObjectURL(blob);
  const link  = document.createElement('a');
  link.href   = url;
  link.download = `attendees-${_state.eventId ?? 'export'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  _showToast('CSV exported successfully.', 'success');
}

// ════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════

function _renderEmpty(msg) {
  const tbody = document.getElementById('attendeeTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="att-empty">${_escHtml(msg)}</td>
      </tr>`;
  }
  _setText('footerCount', 'Showing 0 attendees');
  _setText('statTotal',     '0');
  _setText('statCheckedIn', '0');
  _setText('statPending',   '0');
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function _isCheckedIn(a) {
  return a.checkedIn === true
    || (a.status ?? '').toLowerCase() === 'checked-in'
    || (a.status ?? '').toLowerCase() === 'checkedin';
}

function _showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = `toast show ${type}`.trim();
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ════════════════════════════════════════════════
//  API HELPER
// ════════════════════════════════════════════════

async function _apiFetch(url) {
  const res = await fetch(url, {
    method:  'GET',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${getStoredToken()}`,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════

function _cap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _csvEscape(str) {
  const s = String(str ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}
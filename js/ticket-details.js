// ================================================
//  EventPro — Attendees Ticket Details
//  js/ticket-details.js
//  Depends on:
//    js/services/auth-service.js
//    js/utils/load-components.js
//
//  DATA FLOW:
//  1. Reads eventpro_selected_attendee from
//     localStorage (set by attendees.js on row click)
//  2. Falls back to ?attendeeId= URL param
//
//  ENDPOINTS:
//  POST /events/{eventId}/checkin/generate  ← check-in
//  GET  /events/{eventId}/checkin/template  ← SMS template
//  POST /events/{eventId}/checkin/send      ← send SMS
//
//  ⚠️  Individual attendee PATCH check-in
//      pending Ezekiel confirmation.
// ================================================

const API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Load shared sidebar + topbar ──────────────
  // Active tab: 'attendees' — this page is under Attendees
  await loadDashboardComponents('attendees');

  // ── Back button ───────────────────────────────
  document.getElementById('backBtn')
    ?.addEventListener('click', () => {
      window.location.href = '../pages/attendees.html';
    });

  // ── Load ticket data ──────────────────────────
  const ticket = _loadTicketData();

  if (!ticket) {
    _showError('No ticket data found. Please go back and select an attendee.');
    return;
  }

  _renderPage(ticket);
});

// ════════════════════════════════════════════════
//  DATA LOADING
// ════════════════════════════════════════════════

function _loadTicketData() {
  // Priority 1 — from attendees list row click
  const stored = localStorage.getItem('eventpro_selected_attendee');
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fall through */ }
  }

  // Priority 2 — direct URL deep-link
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('attendeeId') ?? params.get('ticketId');
  if (id) return { ticketId: id, _partial: true };

  return null;
}

// ════════════════════════════════════════════════
//  PAGE RENDER
// ════════════════════════════════════════════════

function _renderPage(ticket) {
  _hideLoading();
  _showGrid();

  const eventName = ticket.eventName ?? ticket.event ?? ticket.title ?? '—';

  // Header context
  _setText('eventContext', eventName);

  // Attendee information
  _setText('infoName',  ticket.name             ?? ticket.attendeeName  ?? '—');
  _setText('infoPhone', ticket.phone            ?? ticket.phoneNumber   ?? '—');
  _setText('infoEmail', ticket.email            ?? ticket.attendeeEmail ?? '—');

  // Ticket information
  _setText('ticketEvent',        eventName);
  _setText('ticketType',         _cap(ticket.ticketType ?? ticket.type ?? 'Standard'));
  _setText('ticketId',           ticket.ticketId ?? ticket.id ?? '—');
  _setText('ticketPurchaseDate', _fmtDate(ticket.purchaseDate ?? ticket.createdAt));

  // Status pill
  const checkedIn = _isCheckedIn(ticket);
  _renderStatusPill(checkedIn, ticket.status);

  // QR code
  const qrRef = ticket.qrRef
    ?? ticket.qrCode
    ?? ticket.checkInCode
    ?? ticket.ticketId
    ?? ticket.id
    ?? 'NO-REF';

  _renderQR(qrRef);
  _setText('qrRefValue', qrRef);

  // Check-in button initial state
  if (checkedIn) {
    const btn   = document.getElementById('checkinBtn');
    const label = document.getElementById('checkinBtnLabel');
    if (btn)   { btn.classList.add('is-checked'); btn.disabled = true; }
    if (label) label.textContent = 'Already Checked In ✓';
  }

  // Wire all buttons
  _wireButtons(ticket, qrRef);
}

// ── Status pill ───────────────────────────────────
function _renderStatusPill(checkedIn, rawStatus) {
  const el = document.getElementById('ticketStatus');
  if (!el) return;

  if (checkedIn) {
    el.innerHTML = `
      <span class="td-status-pill is-checked">
        <span class="td-status-check-icon" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12"
              stroke="#fff" stroke-width="3"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        Checked In
      </span>`;
  } else {
    el.innerHTML = `
      <span class="td-status-pill not-checked">
        <span class="td-status-dot" aria-hidden="true"></span>
        ${_escHtml(_cap(rawStatus ?? 'Not Checked In'))}
      </span>`;
  }
}

// ── QR code via QRCode.js ─────────────────────────
function _renderQR(value) {
  const container = document.getElementById('qrCanvas');
  if (!container) return;

  const attempt = (retries = 10) => {
    if (typeof QRCode !== 'undefined') {
      container.innerHTML = '';
      new QRCode(container, {
        text:         value,
        width:        150,
        height:       150,
        colorDark:    '#1A1A1A',
        colorLight:   '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H,
      });
    } else if (retries > 0) {
      setTimeout(() => attempt(retries - 1), 150);
    }
  };

  attempt();
}

// ════════════════════════════════════════════════
//  BUTTON WIRING
// ════════════════════════════════════════════════

function _wireButtons(ticket, qrRef) {
  document.getElementById('downloadBtn')
    ?.addEventListener('click', () => _downloadTicket(ticket, qrRef));

  document.getElementById('smsBtn')
    ?.addEventListener('click', () => _sendSMS(ticket));

  document.getElementById('editBtn')
    ?.addEventListener('click', () => {
      localStorage.setItem('eventpro_edit_attendee', JSON.stringify(ticket));
      window.location.href = '../pages/attendees.html?action=edit';
    });

  document.getElementById('checkinBtn')
    ?.addEventListener('click', () => _handleCheckin(ticket));
}

// ════════════════════════════════════════════════
//  DOWNLOAD TICKET AS PNG
// ════════════════════════════════════════════════

function _downloadTicket(ticket, qrRef) {
  const canvas = document.querySelector('#qrCanvas canvas');
  if (!canvas) {
    _showToast('QR code not ready yet. Please wait.', 'error');
    return;
  }

  const pc  = document.createElement('canvas');
  pc.width  = 420;
  pc.height = 260;
  const ctx = pc.getContext('2d');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 420, 260);

  // Purple header bar
  ctx.fillStyle = '#6F00FF';
  ctx.fillRect(0, 0, 420, 56);

  // EventPro title
  ctx.fillStyle = '#FFFFFF';
  ctx.font      = 'bold 18px sans-serif';
  ctx.fillText('EventPro', 20, 36);

  // Event name
  ctx.fillStyle = '#1A1A1A';
  ctx.font      = 'bold 14px sans-serif';
  ctx.fillText(
    (ticket.eventName ?? ticket.event ?? 'Event').slice(0, 40), 20, 82
  );

  // Attendee
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Attendee', 20, 104);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText(ticket.name ?? ticket.attendeeName ?? '—', 20, 122);

  // Ticket ID
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Ticket ID', 20, 148);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText(ticket.ticketId ?? ticket.id ?? '—', 20, 166);

  // Type
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Type', 20, 192);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText(_cap(ticket.ticketType ?? 'Standard'), 20, 210);

  // QR code
  ctx.drawImage(canvas, 260, 70, 140, 140);

  // Ref below QR
  ctx.fillStyle   = '#6B7280';
  ctx.font        = '11px sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillText(qrRef, 330, 228);

  const link    = document.createElement('a');
  link.download = `ticket-${ticket.ticketId ?? 'eventpro'}.png`;
  link.href     = pc.toDataURL('image/png');
  link.click();

  _showToast('Ticket downloaded.', 'success');
}

// ════════════════════════════════════════════════
//  SEND SMS
// ════════════════════════════════════════════════

async function _sendSMS(ticket) {
  const phone   = ticket.phone   ?? ticket.phoneNumber;
  const eventId = ticket.eventId ?? ticket.event_id;

  if (!phone) {
    _showToast('No phone number on record for this attendee.', 'error');
    return;
  }
  if (!eventId) {
    _showToast('Event ID missing — cannot send SMS.', 'error');
    return;
  }

  _showToast('Sending SMS…', '');

  try {
    // Fetch SMS template
    const tmplRes  = await fetch(
      `${API}/events/${eventId}/checkin/template`,
      {
        headers: { 'Authorization': `Bearer ${getStoredToken()}` },
        signal:  AbortSignal.timeout(15000),
      }
    );
    const tmplData = tmplRes.ok ? await tmplRes.json() : {};
    const template = tmplData.template
      ?? 'Your check-in code is: {{checkInCode}}';

    // Send SMS
    const res = await fetch(
      `${API}/events/${eventId}/checkin/send`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${getStoredToken()}`,
        },
        body:   JSON.stringify({ template, checkInNumber: phone }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.ok) {
      _showToast('SMS sent successfully.', 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      _showToast(err.message || 'Failed to send SMS.', 'error');
    }
  } catch (err) {
    _showToast(
      err.name === 'TimeoutError'
        ? 'Request timed out. Please try again.'
        : 'Network error. Check your connection.',
      'error'
    );
  }
}

// ════════════════════════════════════════════════
//  MARK AS CHECKED-IN
// ⚠️  Using POST /events/{eventId}/checkin/generate
//     as placeholder until individual PATCH endpoint
//     is confirmed by Ezekiel.
// ════════════════════════════════════════════════

async function _handleCheckin(ticket) {
  const btn   = document.getElementById('checkinBtn');
  const label = document.getElementById('checkinBtnLabel');
  if (btn?.disabled) return;

  const eventId = ticket.eventId ?? ticket.event_id;
  if (!eventId) {
    _showToast('Event ID missing — cannot check in.', 'error');
    return;
  }

  // Optimistic UI
  if (btn)   btn.disabled = true;
  if (label) label.textContent = 'Checking in…';

  try {
    const res = await fetch(
      `${API}/events/${eventId}/checkin/generate`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${getStoredToken()}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.ok) {
      // Update localStorage
      localStorage.setItem(
        'eventpro_selected_attendee',
        JSON.stringify({ ...ticket, status: 'checked-in', checkedIn: true })
      );

      if (btn)   btn.classList.add('is-checked');
      if (label) label.textContent = 'Already Checked In ✓';

      _renderStatusPill(true, 'checked-in');
      _showToast('Attendee checked in successfully!', 'success');

    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Server error ${res.status}`);
    }

  } catch (err) {
    // Revert optimistic UI
    if (btn)   btn.disabled = false;
    if (label) label.textContent = 'Mark as Checked-In';
    _showToast(
      err.name === 'TimeoutError'
        ? 'Request timed out. Please try again.'
        : err.message || 'Check-in failed. Please try again.',
      'error'
    );
  }
}

// ════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════

function _showError(msg) {
  document.getElementById('pageLoading').style.display = 'none';
  const el = document.getElementById('pageError');
  if (el) {
    document.getElementById('pageErrorMsg').textContent = msg;
    el.removeAttribute('hidden');
  }
}

function _hideLoading() {
  const el = document.getElementById('pageLoading');
  if (el) el.style.display = 'none';
}

function _showGrid() {
  document.getElementById('detailGrid')?.removeAttribute('hidden');
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function _isCheckedIn(ticket) {
  return ticket.checkedIn === true
    || ticket.status === 'checked-in'
    || ticket.status === 'checkedIn';
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
//  UTILITIES
// ════════════════════════════════════════════════

function _fmtDate(raw) {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return String(raw); }
}

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
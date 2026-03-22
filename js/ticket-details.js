// ================================================
//  EventPro — Attendees Ticket Details
//  js/ticket-details.js
//  Depends on:
//    js/services/auth-service.js
//    js/utils/load-components.js
//
//  DATA FLOW:
//  1. Reads eventpro_selected_attendee from
//     localStorage (set by attendees.js on row click
//     or after event registration)
//  2. Falls back to ?attendeeId= URL param
//
//  ENDPOINTS:
//  POST /events/{eventId}/checkin/generate  ← check-in
//  POST /events/{eventId}/checkin/send      ← send SMS
// ================================================

var _TD_API = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', function () {

  requireAuth();
  loadDashboardComponents('attendees');

  // ── Back button ───────────────────────────────
  var backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.location.href = '../pages/attendees.html';
    });
  }

  // ── Load ticket data ──────────────────────────
  var ticket = _loadTicketData();

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
  var stored = localStorage.getItem('eventpro_selected_attendee');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* fall through */ }
  }

  var params = new URLSearchParams(window.location.search);
  var id     = params.get('attendeeId') || params.get('ticketId');
  if (id) return { ticketId: id, _partial: true };

  return null;
}

// ════════════════════════════════════════════════
//  PAGE RENDER
// ════════════════════════════════════════════════

function _renderPage(ticket) {
  _hideLoading();
  _showGrid();

  var eventName = ticket.eventName || ticket.event || ticket.title || 'EventPro';

  // Header context
  _setText('eventContext', eventName);

  // ── Attendee information ──────────────────────
  // Check all possible name field combinations from
  // both the registration response and attendees table click
  var firstName = ticket.firstName || (ticket.attendee && ticket.attendee.firstName) || '';
  var lastName  = ticket.lastName  || (ticket.attendee && ticket.attendee.lastName)  || '';
  var fullName  = ticket.name || ticket.attendeeName || '';

  if (!fullName && (firstName || lastName)) {
    fullName = (firstName + ' ' + lastName).trim();
  }

  var email = ticket.email
    || ticket.attendeeEmail
    || (ticket.attendee && ticket.attendee.email)
    || '—';

  var phone = ticket.phone
    || ticket.phoneNumber
    || (ticket.attendee && ticket.attendee.phone)
    || '—';

  _setText('infoName',  fullName || '—');
  _setText('infoPhone', phone);
  _setText('infoEmail', email);

  // ── Ticket information ────────────────────────
  _setText('ticketEvent',        eventName);
  _setText('ticketType',         _cap(ticket.ticketType || ticket.type || 'Standard'));
  _setText('ticketId',           ticket.ticketId || ticket._id || ticket.id || '—');
  _setText('ticketPurchaseDate', _fmtDate(ticket.purchaseDate || ticket.createdAt));

  // Status pill
  var checkedIn = _isCheckedIn(ticket);
  _renderStatusPill(checkedIn, ticket.status);

  // QR code
  var qrRef = ticket.qrRef
    || ticket.qrCode
    || ticket.checkInCode
    || ticket.ticketId
    || ticket._id
    || ticket.id
    || 'NO-REF';

  _renderQR(qrRef);
  _setText('qrRefValue', qrRef);

  // Check-in button initial state
  if (checkedIn) {
    var btn   = document.getElementById('checkinBtn');
    var label = document.getElementById('checkinBtnLabel');
    if (btn)   { btn.classList.add('is-checked'); btn.disabled = true; }
    if (label) label.textContent = 'Already Checked In ✓';
  }

  _wireButtons(ticket, qrRef);
}

// ── Status pill ───────────────────────────────────
function _renderStatusPill(checkedIn, rawStatus) {
  var el = document.getElementById('ticketStatus');
  if (!el) return;

  if (checkedIn) {
    el.innerHTML =
      '<span class="td-status-pill is-checked">'
      + '<span class="td-status-check-icon" aria-hidden="true">'
      + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none">'
      + '<polyline points="20 6 9 17 4 12" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg></span>Checked In</span>';
  } else {
    el.innerHTML =
      '<span class="td-status-pill not-checked">'
      + '<span class="td-status-dot" aria-hidden="true"></span>'
      + _escHtml(_cap(rawStatus || 'Confirmed'))
      + '</span>';
  }
}

// ── QR code ───────────────────────────────────────
function _renderQR(value) {
  var container = document.getElementById('qrCanvas');
  if (!container) return;

  function attempt(retries) {
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
      setTimeout(function () { attempt(retries - 1); }, 150);
    }
  }

  attempt(10);
}

// ════════════════════════════════════════════════
//  BUTTON WIRING
// ════════════════════════════════════════════════

function _wireButtons(ticket, qrRef) {
  var downloadBtn = document.getElementById('downloadBtn');
  var smsBtn      = document.getElementById('smsBtn');
  var editBtn     = document.getElementById('editBtn');
  var checkinBtn  = document.getElementById('checkinBtn');

  if (downloadBtn) downloadBtn.addEventListener('click', function () { _downloadTicket(ticket, qrRef); });
  if (smsBtn)      smsBtn.addEventListener('click',      function () { _sendSMS(ticket); });
  if (editBtn)     editBtn.addEventListener('click',     function () {
    localStorage.setItem('eventpro_edit_attendee', JSON.stringify(ticket));
    window.location.href = '../pages/attendees.html?action=edit';
  });
  if (checkinBtn)  checkinBtn.addEventListener('click',  function () { _handleCheckin(ticket); });
}

// ════════════════════════════════════════════════
//  DOWNLOAD TICKET AS PNG
// ════════════════════════════════════════════════

function _downloadTicket(ticket, qrRef) {
  var canvas = document.querySelector('#qrCanvas canvas');
  if (!canvas) {
    _showToast('QR code not ready yet. Please wait.', 'error');
    return;
  }

  var pc    = document.createElement('canvas');
  pc.width  = 420;
  pc.height = 260;
  var ctx   = pc.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 420, 260);

  ctx.fillStyle = '#6F00FF';
  ctx.fillRect(0, 0, 420, 56);

  ctx.fillStyle = '#FFFFFF';
  ctx.font      = 'bold 18px sans-serif';
  ctx.fillText('EventPro', 20, 36);

  ctx.fillStyle = '#1A1A1A';
  ctx.font      = 'bold 14px sans-serif';
  ctx.fillText((ticket.eventName || ticket.event || 'Event').slice(0, 40), 20, 82);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Attendee', 20, 104);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText(ticket.name || ticket.attendeeName || '—', 20, 122);

  ctx.fillStyle = '#6B7280';
  ctx.fillText('Ticket ID', 20, 148);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText(ticket.ticketId || ticket.id || '—', 20, 166);

  ctx.fillStyle = '#6B7280';
  ctx.fillText('Type', 20, 192);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillText(_cap(ticket.ticketType || 'Standard'), 20, 210);

  ctx.drawImage(canvas, 260, 70, 140, 140);

  ctx.fillStyle = '#6B7280';
  ctx.font      = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(qrRef, 330, 228);

  var link    = document.createElement('a');
  link.download = 'ticket-' + (ticket.ticketId || 'eventpro') + '.png';
  link.href     = pc.toDataURL('image/png');
  link.click();

  _showToast('Ticket downloaded.', 'success');
}

// ════════════════════════════════════════════════
//  SEND SMS
// ════════════════════════════════════════════════

function _sendSMS(ticket) {
  var phone   = ticket.phone   || ticket.phoneNumber;
  var eventId = ticket.eventId || ticket.event_id;

  if (!phone) {
    _showToast('No phone number on record for this attendee.', 'error');
    return;
  }
  if (!eventId) {
    _showToast('Event ID missing — cannot send SMS.', 'error');
    return;
  }

  _showToast('Sending SMS…', '');

  fetch(_TD_API + '/events/' + eventId + '/checkin/template', {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      return res.ok ? res.json() : {};
    })
    .then(function (tmplData) {
      var template = (tmplData && tmplData.template) || 'Your check-in code is: {{checkInCode}}';

      return fetch(_TD_API + '/events/' + eventId + '/checkin/send', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + getStoredToken(),
        },
        body: JSON.stringify({ template: template, checkInNumber: phone }),
      });
    })
    .then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    })
    .then(function (result) {
      if (result.ok) {
        _showToast('SMS sent successfully.', 'success');
      } else {
        _showToast((result.data && result.data.message) || 'Failed to send SMS.', 'error');
      }
    })
    .catch(function () {
      _showToast('Network error. Check your connection.', 'error');
    });
}

// ════════════════════════════════════════════════
//  MARK AS CHECKED-IN
// ════════════════════════════════════════════════

function _handleCheckin(ticket) {
  var btn   = document.getElementById('checkinBtn');
  var label = document.getElementById('checkinBtnLabel');

  if (btn && btn.disabled) return;

  var eventId = ticket.eventId || ticket.event_id;
  if (!eventId) {
    _showToast('Event ID missing — cannot check in.', 'error');
    return;
  }

  if (btn)   btn.disabled = true;
  if (label) label.textContent = 'Checking in…';

  fetch(_TD_API + '/events/' + eventId + '/checkin/generate', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    })
    .then(function (result) {
      if (result.ok) {
        var updated = Object.assign({}, ticket, { status: 'checked-in', checkedIn: true });
        localStorage.setItem('eventpro_selected_attendee', JSON.stringify(updated));
        if (btn)   btn.classList.add('is-checked');
        if (label) label.textContent = 'Already Checked In ✓';
        _renderStatusPill(true, 'checked-in');
        _showToast('Attendee checked in successfully!', 'success');
      } else {
        throw new Error((result.data && result.data.message) || 'Server error ' + result.data.status);
      }
    })
    .catch(function (err) {
      if (btn)   btn.disabled = false;
      if (label) label.textContent = 'Mark as Checked-In';
      _showToast(err.message || 'Check-in failed. Please try again.', 'error');
    });
}

// ════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════

function _showError(msg) {
  var loading = document.getElementById('pageLoading');
  var errEl   = document.getElementById('pageError');
  var errMsg  = document.getElementById('pageErrorMsg');
  if (loading) loading.style.display = 'none';
  if (errMsg)  errMsg.textContent = msg;
  if (errEl)   errEl.removeAttribute('hidden');
}

function _hideLoading() {
  var el = document.getElementById('pageLoading');
  if (el) el.style.display = 'none';
}

function _showGrid() {
  var el = document.getElementById('detailGrid');
  if (el) el.removeAttribute('hidden');
}

function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

function _isCheckedIn(ticket) {
  return ticket.checkedIn === true
    || ticket.status === 'checked-in'
    || ticket.status === 'checkedIn';
}

function _showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = ('toast show ' + (type || '')).trim();
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = 'toast'; }, 3500);
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
  } catch (e) { return String(raw); }
}

function _cap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
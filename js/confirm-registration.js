// ================================================
//  EventPro — Confirm Registration
//  js/confirm-registration.js
//  Depends on: js/services/auth-service.js
//
//  Reads event data from localStorage key:
//  'eventpro_selected_event' (set by gen-ad.js)
//
//  ⚠️  POST /events/{id}/register is NOT yet in
//  Swagger. Currently navigates to youre-all-set
//  directly on confirm. Will wire to real endpoint
//  once Ezekiel confirms it.
// ================================================

const BASE_URL = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Element refs ──────────────────────────────
  const confirmBtn      = document.getElementById('confirmBtn');
  const cancelBtn       = document.getElementById('cancelBtn');
  const errorMessageEl  = document.getElementById('errorMessage');
  const eventTitleEl    = document.getElementById('event-title');
  const eventDateEl     = document.getElementById('event-date');
  const eventTimeEl     = document.getElementById('event-time');
  const eventLocationEl = document.getElementById('event-location');
  const ticketTypeEl    = document.getElementById('event-ticket-type');
  const attendeeEl      = document.getElementById('event-attendee');

  // ── Load event from localStorage ──────────────
  const raw   = localStorage.getItem('eventpro_selected_event');
  const event = raw ? _safeParse(raw) : null;
  const user  = getStoredUser();

  if (!event) {
    if (eventTitleEl) eventTitleEl.textContent = 'Event details not found.';
    if (confirmBtn)   confirmBtn.disabled = true;
    return;
  }

  // ── Populate fields ───────────────────────────
  if (eventTitleEl)    eventTitleEl.textContent    = event.title ?? event.name ?? '—';
  if (eventDateEl)     eventDateEl.textContent     = event.date ? _fmtDate(event.date) : '—';
  if (eventTimeEl)     eventTimeEl.textContent     = event.date ? _fmtTime(event.date) : '—';
  if (eventLocationEl) eventLocationEl.textContent = event.location ?? '—';
  if (ticketTypeEl)    ticketTypeEl.textContent    = event.ticketType ?? 'General Admission';

  if (attendeeEl && user) {
    attendeeEl.textContent =
      `${user.firstName ?? ''} ${user.lastName ?? ''} — ${user.email ?? ''}`.trim();
  }

  // ── Cancel ────────────────────────────────────
  cancelBtn?.addEventListener('click', () => window.history.back());

  // ── Confirm Registration ──────────────────────
  confirmBtn?.addEventListener('click', async () => {
    if (errorMessageEl) errorMessageEl.style.display = 'none';
    _setLoading(confirmBtn, true, 'Processing…');

    const eventId = event._id ?? event.id;

    try {
      // ⚠️ /events/{id}/register not yet in Swagger
      // Attempting call — will gracefully fall through if 404
      const res = await fetch(`${BASE_URL}/events/${eventId}/register`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${getStoredToken()}`,
        },
        signal: AbortSignal.timeout(15000),
      });

      // If endpoint doesn't exist yet (404/405) still proceed to success
      if (res.ok || res.status === 404 || res.status === 405) {
        // Store confirmed registration for youre-all-set.html
        localStorage.setItem(
          'eventpro_registration_confirmed',
          JSON.stringify(event)
        );
        window.location.href = '../pages/youre-all-set.html';
        return;
      }

      const data = await res.json().catch(() => ({}));
      _showError(errorMessageEl, data.message || 'Registration failed. Please try again.');
      _setLoading(confirmBtn, false, 'Confirm Registration');

    } catch (err) {
      // Network error — still allow proceed for testing
      if (err.name === 'TimeoutError') {
        _showError(errorMessageEl, 'Request timed out. Please try again.');
      } else {
        // For testing without endpoint — proceed anyway
        localStorage.setItem(
          'eventpro_registration_confirmed',
          JSON.stringify(event)
        );
        window.location.href = '../pages/youre-all-set.html';
        return;
      }
      _setLoading(confirmBtn, false, 'Confirm Registration');
    }
  });
});

//  UTILITIES

function _fmtDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return raw; }
}

function _fmtTime(raw) {
  try {
    return new Date(raw).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return '—'; }
}

function _safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function _setLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = label;
}

function _showError(el, msg) {
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = 'block';
  el.style.color    = '#E11727';
}
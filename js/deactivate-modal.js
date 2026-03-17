// ================================================
//  EventPro — Deactivate Event Modal
//  js/deactivate-modal.js
//  Depends on: js/services/auth-service.js
//
//  Endpoint used:
//  DELETE /events/{id}  ← Swagger confirmed
//
//  Usage: deactivate-modal.html?eventId=abc123
//  Opened from organizer-management.html or
//  organizer-dashboard.html via link with eventId.
//
//  Close/Cancel → window.history.back()
//  Deactivate success → organizer-dashboard.html
// ================================================

const BASE_URL = 'https://eventpro-fxfv.onrender.com/api';

const closeBtn      = document.getElementById('close-btn');
const cancelBtn     = document.getElementById('cancel-btn');
const deactivateBtn = document.getElementById('deactivate-btn');
const subtitleEl    = document.querySelector('.modal__subtitle');

//  Auth guard 
requireAuth();

// Read eventId from URL 
const eventId = new URLSearchParams(window.location.search).get('eventId');

// ── Guard — no eventId → broken navigation 
if (!eventId) {
  window.location.href = '../pages/organizer-dashboard.html';
}

//  Close / Cancel 
function _closeModal() {
  window.history.back();
}

closeBtn?.addEventListener('click', _closeModal);
cancelBtn?.addEventListener('click', _closeModal);

// ── Deactivate — DELETE /events/{id} 
deactivateBtn?.addEventListener('click', async () => {
  const token = getStoredToken();

  if (!token) {
    window.location.href = '../pages/sign-in.html';
    return;
  }

  // Loading state — prevent double clicks
  deactivateBtn.textContent = 'Deactivating…';
  deactivateBtn.disabled    = true;
  closeBtn.disabled         = true;
  cancelBtn.disabled        = true;

  try {
    const res = await fetch(`${BASE_URL}/events/${eventId}`, {
      method:  'DELETE',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      // Success — redirect by role
      const user = getStoredUser();
      window.location.href = user?.role === 'admin'
        ? '../pages/admin-dashboard.html'
        : '../pages/organizer-dashboard.html';

    } else {
      const data = await res.json().catch(() => ({}));
      _showError(data.message || 'Could not deactivate event. Please try again.');
      _restoreButtons();
    }

  } catch (err) {
    _showError(
      err.name === 'TimeoutError'
        ? 'Request timed out. Please try again.'
        : 'Network error. Please check your connection.'
    );
    _restoreButtons();
  }
});

//  HELPERS

function _showError(msg) {
  if (!subtitleEl) return;
  subtitleEl.textContent = msg;
  subtitleEl.style.color = '#E11727';
}

function _restoreButtons() {
  deactivateBtn.textContent = 'Deactivate';
  deactivateBtn.disabled    = false;
  closeBtn.disabled         = false;
  cancelBtn.disabled        = false;
}
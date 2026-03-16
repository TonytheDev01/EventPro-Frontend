// ================================================
//  EventPro — General Admission Ticket Card
//  js/gen-ad.js
//  Depends on: js/services/auth-service.js
//
//  URL param required: ?eventId=abc123
//
//  Register Now:
//  ⚠️  POST /events/{id}/register not yet in Swagger.
//  Stores event in localStorage and navigates to
//  confirm-registration.html for user to confirm.
//  Will call register endpoint directly once
//  Ezekiel confirms it.
//
//  Save / Unsave:
//  ⚠️  Save endpoint not yet in Swagger.
//  Toggle is UI-only for now — fails silently.
//
//  Share: uses Web Share API with clipboard fallback.
// ================================================

const BASE_URL = 'https://eventpro-fxfv.onrender.com/api';

document.addEventListener('DOMContentLoaded', async () => {

  const registerBtn = document.getElementById('register-btn');
  const shareBtn    = document.getElementById('share-btn');
  const saveBtn     = document.getElementById('save-btn');
  const saveLabel   = document.getElementById('save-label');

  const token   = getStoredToken();
  const eventId = new URLSearchParams(window.location.search).get('eventId');

  // ── Load event data from API or localStorage ──
  let event = null;

  if (eventId) {
    try {
      const res = await fetch(`${BASE_URL}/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal:  AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        event = data.event ?? data;
        // Update price/title if elements exist
        const titleEl = document.querySelector('.ticket-title');
        const salesEl = document.querySelector('.ticket-sales');
        const priceEl = document.querySelector('.ticket-price');
        if (titleEl && event.title) titleEl.textContent = event.title;
        if (priceEl && event.price) priceEl.textContent = `₦${Number(event.price).toLocaleString()}`;
        if (salesEl && event.date)  salesEl.innerHTML   = `<em>Sales end on ${_fmtDate(event.date)}</em>`;
      }
    } catch {
      // Fail silently — static content still displays
    }
  }

  // Register Now 
  registerBtn?.addEventListener('click', () => {
    if (!token) {
      window.location.href = '../pages/sign-in.html';
      return;
    }

    if (!eventId) {
      registerBtn.textContent = 'Event not found';
      return;
    }

    // Store event data for confirm-registration page
    // Use fetched event or minimal object with eventId
    const eventData = event ?? { _id: eventId, title: 'Event' };
    localStorage.setItem('eventpro_selected_event', JSON.stringify(eventData));

    // Navigate to confirmation screen first
    window.location.href = `../pages/confirm-registration.html?eventId=${eventId}`;
  });

  //  Share 
  shareBtn?.addEventListener('click', async () => {
    const shareData = {
      title: 'EventPro',
      text:  'Check out this event!',
      url:   window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled — do nothing
      }
    } else {
      // Fallback — copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        const shareSpan = shareBtn.querySelector('span');
        if (shareSpan) {
          shareSpan.textContent = 'Copied!';
          setTimeout(() => { shareSpan.textContent = 'Share'; }, 2000);
        }
      } catch {
        // Clipboard not available — do nothing
      }
    }
  });

  // ── Save / Unsave (UI only — endpoint pending) ─
  let isSaved = false;

  saveBtn?.addEventListener('click', async () => {
    if (!token) {
      window.location.href = '../pages/sign-in.html';
      return;
    }

    isSaved = !isSaved;
    if (saveLabel) saveLabel.textContent = isSaved ? 'Saved' : 'Save';
    saveBtn.classList.toggle('saved', isSaved);

    // ⚠️ Endpoint not confirmed — fails silently
    try {
      await fetch(`${BASE_URL}/events/${eventId}/save`, {
        method:  isSaved ? 'POST' : 'DELETE',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Fail silently — UI already toggled
    }
  });

});

//  Utilities 
function _fmtDate(raw) {
  try {
    return new Date(raw).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return raw; }
}
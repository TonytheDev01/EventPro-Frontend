// ================================================
//  EventPro — You're All Set
//  js/youre-all-set.js
//  Depends on: js/services/auth-service.js
//
//  Shown after:
//  A) Attendee registers for an event (from gen-ad.js)
//  B) Organizer creates an event (from create-event.js)
//
//  Reads from localStorage:
//  'eventpro_registration_confirmed' ← set by confirm-registration.js
//  'eventpro_created_event'          ← set by create-event.js
//
//  "View My Event" → attendees.html
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard 
  requireAuth();

  // ── Elements 
  const emailEl      = document.getElementById('mail');
  const viewEventBtn = document.getElementById('view-event');

  // ── Display user email 
  const user = getStoredUser();
  if (emailEl && user?.email) {
    emailEl.textContent = user.email;
  }

  // ── Resolve which event to link to 
  // Priority 1 — came from registration flow
  const confirmed = _safeParse(
    localStorage.getItem('eventpro_registration_confirmed')
  );

  // Priority 2 — came from create-event flow
  const created = _safeParse(
    localStorage.getItem('eventpro_created_event')
  );

  // Priority 3 — URL param
  const params  = new URLSearchParams(window.location.search);
  const eventId = params.get('eventId')
    ?? confirmed?._id ?? confirmed?.id
    ?? created?.event?._id ?? created?._id;

  //  View My Event button 
  viewEventBtn?.addEventListener('click', () => {
    // Clean up localStorage
    localStorage.removeItem('eventpro_registration_confirmed');

    if (eventId) {
      // Navigate to attendees filtered by this event
      window.location.href = `../pages/attendees.html?eventId=${eventId}`;
      return;
    }

    // Fallback — redirect by role to correct dashboard
    const role = user?.role ?? 'user';
    if (role === 'admin') {
      window.location.href = '../pages/admin-dashboard.html';
    } else if (role === 'organizer') {
      window.location.href = '../pages/organizer-dashboard.html';
    } else {
      window.location.href = '../pages/attendees.html';
    }
  });

});

//  Safe JSON parse 
function _safeParse(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}
// ================================================
//  EventPro — Create Event
//  js/create-event.js
//  Depends on: js/services/auth-service.js
//
//  POST /events — create a new event
//
//  NOTE: firstName, lastName, emailAddress are
//  pre-filled read-only from getStoredUser().
//  They are NOT sent to the backend — user is
//  already authenticated via JWT.
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Pre-fill user fields ──────────────────────
  const user = getStoredUser();

  if (user) {
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl  = document.getElementById('lastName');
    const emailEl     = document.getElementById('emailAddress');
    const navAvatar   = document.getElementById('navAvatar');

    if (firstNameEl) { firstNameEl.value = user.firstName || ''; }
    if (lastNameEl)  { lastNameEl.value  = user.lastName  || ''; }
    if (emailEl)     { emailEl.value     = user.email     || ''; }

    if (navAvatar) {
      const initials = [
        user.firstName?.charAt(0) || '',
        user.lastName?.charAt(0)  || '',
      ].join('').toUpperCase() || '?';
      navAvatar.textContent = initials;
    }
  }

  // ── Element refs ──────────────────────────────
  const backBtn      = document.getElementById('backBtn');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navDrawer    = document.getElementById('navDrawer');
  const uploadWrap   = document.getElementById('uploadWrap');
  const bannerInput  = document.getElementById('bannerInput');
  const uploadLabel  = document.getElementById('uploadLabel');
  const submitBtn    = document.getElementById('submitBtn');
  const formError    = document.getElementById('formError');

  // ── Back button ───────────────────────────────
  backBtn?.addEventListener('click', () => window.history.back());

  // ── Hamburger toggle ──────────────────────────
  hamburgerBtn?.addEventListener('click', () => {
    const isOpen = navDrawer.classList.toggle('open');
    navDrawer.setAttribute('aria-hidden', String(!isOpen));
  });

  // ── Banner upload ─────────────────────────────
  uploadWrap?.addEventListener('click', () => bannerInput?.click());

  uploadWrap?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      bannerInput?.click();
    }
  });

  bannerInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file && uploadLabel) uploadLabel.textContent = file.name;
  });

  // ── Error helpers ─────────────────────────────
  function _showFieldError(errorId, message) {
    const el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    const input = el.closest('.input-block')
      ?.querySelector('input, select, textarea');
    if (input) input.style.borderColor = 'var(--color-error)';
  }

  function _clearFieldError(errorId) {
    const el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
    const input = el.closest('.input-block')
      ?.querySelector('input, select, textarea');
    if (input) input.style.borderColor = '';
  }

  function _clearAllErrors() {
    [
      'firstNameError', 'lastNameError', 'emailAddressError',
      'eventNameError', 'eventDateError', 'eventTimeError',
      'eventLocationError', 'streetAddressError', 'cityError',
      'countryStateError', 'eventRegionError', 'eventCategoryError',
      'bannerError', 'eventDescriptionError',
    ].forEach(_clearFieldError);

    if (formError) {
      formError.textContent = '';
      formError.classList.remove('show');
    }
  }

  function _showGlobalError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.classList.add('show');
    formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function _setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled    = loading;
    submitBtn.textContent = loading ? 'Creating Event...' : 'Create Event';
  }

  // ── Validation ────────────────────────────────
  function _validate() {
    let valid = true;
    _clearAllErrors();

    const required = [
      { id: 'eventName',     errId: 'eventNameError',     msg: 'Event name is required.'          },
      { id: 'eventDate',     errId: 'eventDateError',     msg: 'Event date is required.'          },
      { id: 'eventTime',     errId: 'eventTimeError',     msg: 'Event time is required.'          },
      { id: 'eventLocation', errId: 'eventLocationError', msg: 'Event location is required.'      },
      { id: 'streetAddress', errId: 'streetAddressError', msg: 'Street address is required.'      },
      { id: 'city',          errId: 'cityError',          msg: 'City is required.'                },
      { id: 'countryState',  errId: 'countryStateError',  msg: 'Country / State is required.'     },
      { id: 'eventRegion',   errId: 'eventRegionError',   msg: 'Please select an event region.'   },
      { id: 'eventCategory', errId: 'eventCategoryError', msg: 'Please select an event category.' },
    ];

    required.forEach(({ id, errId, msg }) => {
      const val = document.getElementById(id)?.value?.trim();
      if (!val) {
        _showFieldError(errId, msg);
        valid = false;
      }
    });

    if (!valid) {
      _showGlobalError('Please fill in all required fields.');
    }

    return valid;
  }

  // ── Submit ────────────────────────────────────
  submitBtn?.addEventListener('click', async () => {
    if (!_validate()) return;

    // Build payload — only send event fields, NOT user info
    const payload = {
      title:         document.getElementById('eventName')?.value.trim(),
      description:   document.getElementById('eventDescription')?.value.trim(),
      date:          document.getElementById('eventDate')?.value,
      time:          document.getElementById('eventTime')?.value,
      location:      document.getElementById('eventLocation')?.value.trim(),
      streetAddress: document.getElementById('streetAddress')?.value.trim(),
      city:          document.getElementById('city')?.value.trim(),
      countryState:  document.getElementById('countryState')?.value.trim(),
      region:        document.getElementById('eventRegion')?.value,
      category:      document.getElementById('eventCategory')?.value,
      status:        'draft',
    };

    _setLoading(true);

    try {
      const response = await fetch(
        'https://eventpro-fxfv.onrender.com/api/events',
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${getStoredToken()}`,
          },
          body:   JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Store created event for reference on next screen
        localStorage.setItem('eventpro_created_event', JSON.stringify(data));

        // Redirect by role
        const currentUser = getStoredUser();
        window.location.href = currentUser?.role === 'admin'
          ? '../pages/admin-dashboard.html'
          : '../pages/attendees.html';

      } else {
        _showGlobalError(
          data.message || 'Failed to create event. Please try again.'
        );
        _setLoading(false);
      }

    } catch (err) {
      _showGlobalError(
        err.name === 'TimeoutError'
          ? 'Request timed out. The server may be starting up — please try again.'
          : 'Network error. Please check your connection and try again.'
      );
      _setLoading(false);
    }
  });

});
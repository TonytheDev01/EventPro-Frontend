// ================================================
//  EventPro — Create Event
//  js/create-event.js
//  Depends on: js/services/auth-service.js
//
//  POST /events — create a new event
//
//  NOTE: firstName, lastName, emailAddress fields
//  are present in the form but are NOT sent to the
//  backend — the user is already authenticated.
//  They are pre-filled from getStoredUser() and
//  remain read-only display fields only.
//
//  ⚠️  Banner upload via FormData pending Ezekiel
//  confirmation. Currently sending JSON only.
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Pre-fill name + email from stored user ────
  const user = getStoredUser();

  if (user) {
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl  = document.getElementById('lastName');
    const emailEl     = document.getElementById('emailAddress');

    if (firstNameEl) {
      firstNameEl.value    = user.firstName || '';
      firstNameEl.readOnly = true;
    }
    if (lastNameEl) {
      lastNameEl.value    = user.lastName || '';
      lastNameEl.readOnly = true;
    }
    if (emailEl) {
      emailEl.value    = user.email || '';
      emailEl.readOnly = true;
    }

    // ── Avatar initials ──────────────────────
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) {
      const initials =
        `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
      navAvatar.textContent = initials;
    }
  }

  // ── Elements ──────────────────────────────────
  const backBtn      = document.getElementById('backBtn');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navDrawer    = document.getElementById('navDrawer');
  const uploadWrap   = document.getElementById('uploadWrap');
  const bannerInput  = document.getElementById('bannerInput');
  const uploadLabel  = document.getElementById('uploadLabel');
  const submitBtn    = document.getElementById('submitBtn');
  const formError    = document.getElementById('formError');

  // ── Back button ───────────────────────────────
  backBtn.addEventListener('click', () => window.history.back());

  // ── Hamburger (mobile only) ───────────────────
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = navDrawer.classList.toggle('open');
    navDrawer.setAttribute('aria-hidden', String(!isOpen));
  });

  // ── Banner file upload ────────────────────────
  uploadWrap.addEventListener('click', () => bannerInput.click());

  uploadWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      bannerInput.click();
    }
  });

  bannerInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) uploadLabel.textContent = file.name;
  });

  // ── Error helpers ─────────────────────────────
  function showFieldError(errorId, message) {
    const el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    const sibling = el.parentElement.querySelector('input, select, textarea');
    if (sibling) sibling.style.borderColor = 'var(--color-error)';
  }

  function clearFieldError(errorId) {
    const el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
    const sibling = el.parentElement.querySelector('input, select, textarea');
    if (sibling) sibling.style.borderColor = '';
  }

  function clearAllErrors() {
    [
      'firstNameError', 'lastNameError', 'emailAddressError',
      'eventNameError', 'eventDateError', 'eventTimeError',
      'eventLocationError', 'streetAddressError', 'cityError',
      'countryStateError', 'eventRegionError', 'eventCategoryError',
      'bannerError', 'eventDescriptionError',
    ].forEach(clearFieldError);

    formError.textContent = '';
    formError.classList.remove('show');
  }

  function showGlobalError(message) {
    formError.textContent = `*Error: ${message}`;
    formError.classList.add('show');
  }

  function setLoading(loading) {
    submitBtn.disabled    = loading;
    submitBtn.textContent = loading ? 'Creating Event...' : 'Create Event';
  }

  // ── Validation ────────────────────────────────
  function validate() {
    let valid = true;
    clearAllErrors();

    const required = [
      { id: 'eventName',     errId: 'eventNameError',     msg: 'Event name is required.'           },
      { id: 'eventDate',     errId: 'eventDateError',     msg: 'Event date is required.'           },
      { id: 'eventTime',     errId: 'eventTimeError',     msg: 'Event time is required.'           },
      { id: 'eventLocation', errId: 'eventLocationError', msg: 'Event location is required.'       },
      { id: 'streetAddress', errId: 'streetAddressError', msg: 'Street address is required.'       },
      { id: 'city',          errId: 'cityError',          msg: 'City is required.'                 },
      { id: 'countryState',  errId: 'countryStateError',  msg: 'Country / State is required.'      },
      { id: 'eventRegion',   errId: 'eventRegionError',   msg: 'Please select an event region.'    },
      { id: 'eventCategory', errId: 'eventCategoryError', msg: 'Please select an event category.'  },
    ];

    required.forEach(({ id, errId, msg }) => {
      const value = document.getElementById(id)?.value?.trim();
      if (!value) {
        showFieldError(errId, msg);
        valid = false;
      }
    });

    if (!valid) {
      showGlobalError('Please fill all columns');
    }

    return valid;
  }

  // ── Submit ────────────────────────────────────
  submitBtn.addEventListener('click', async () => {
    if (!validate()) return;

    const payload = {
      name:        document.getElementById('eventName').value.trim(),
      date:        document.getElementById('eventDate').value,
      time:        document.getElementById('eventTime').value,
      location:    document.getElementById('eventLocation').value.trim(),
      address:     document.getElementById('streetAddress').value.trim(),
      city:        document.getElementById('city').value.trim(),
      state:       document.getElementById('countryState').value.trim(),
      region:      document.getElementById('eventRegion').value,
      category:    document.getElementById('eventCategory').value,
      description: document.getElementById('eventDescription').value.trim(),
    };

    // ⚠️ Banner upload via FormData is pending
    // Ezekiel's confirmation on multipart handling.
    // Currently sending JSON payload only.

    setLoading(true);

    let result;

    try {
      const response = await fetch(
        'https://eventpro-fxfv.onrender.com/api/events',
        {
          method: 'POST',
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
        result = { success: true, data };
      } else {
        result = {
          success: false,
          message: data.message || 'Failed to create event. Please try again.',
        };
      }
    } catch (err) {
      result = {
        success: false,
        message:
          err.name === 'TimeoutError'
            ? 'Request timed out. The server may be starting up — please try again.'
            : 'Network error. Please check your connection and try again.',
      };
    }

    setLoading(false);

    if (result.success) {
      localStorage.setItem(
        'eventpro_created_event',
        JSON.stringify(result.data)
      );
      window.location.href = '../pages/organizer-dashboard.html';
    } else {
      showGlobalError(result.message);
    }
  });

});
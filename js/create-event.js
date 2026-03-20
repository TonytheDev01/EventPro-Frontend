/* ============================================================
   create-event.js
   Standalone page — uses own navbar, NOT dashboard shell.
   Requires: auth-service.js

   Fixes applied March 20 2026:
   1. firstName/lastName fields are pre-filled but editable
      (readonly attribute removed after pre-fill)
   2. After successful event creation, redirect is role-based
      so users are never sent to the wrong dashboard
   3. Payload now includes status: 'published' so events
      are not saved as drafts
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  requireAuth();

  var user = getStoredUser();

  /* ── Avatar initials ──────────────────────────────────────── */
  var avatarEl = document.getElementById('navAvatar');
  if (avatarEl && user) {
    var initials = [user.firstName, user.lastName]
      .filter(Boolean)
      .map(function (n) { return n[0]; })
      .join('')
      .toUpperCase() || '?';
    avatarEl.textContent = initials;
    avatarEl.style.cursor = 'pointer';
    avatarEl.addEventListener('click', function () {
      _goToDashboard(user.role);
    });
  }

  /* ── "My Events" link — role-based ───────────────────────── */
  var myEventsLink       = document.getElementById('myEventsLink');
  var myEventsLinkMobile = document.getElementById('myEventsLinkMobile');
  var dashHref = _dashboardHref(user && user.role);
  if (myEventsLink)       myEventsLink.href       = dashHref;
  if (myEventsLinkMobile) myEventsLinkMobile.href  = dashHref;

  /* ── Back button ─────────────────────────────────────────── */
  var backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (document.referrer) {
        history.back();
      } else {
        _goToDashboard(user && user.role);
      }
    });
  }

  /* ── Mobile hamburger toggle ─────────────────────────────── */
  var hamburger = document.getElementById('hamburgerBtn');
  var drawer    = document.getElementById('navDrawer');
  var overlay   = document.getElementById('navOverlay');

  function _openDrawer() {
    if (!drawer || !overlay) return;
    drawer.removeAttribute('aria-hidden');
    overlay.removeAttribute('aria-hidden');
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
  }

  function _closeDrawer() {
    if (!drawer || !overlay) return;
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  }

  if (hamburger) hamburger.addEventListener('click', _openDrawer);
  if (overlay)   overlay.addEventListener('click', _closeDrawer);

  // Wire drawer close button
  var drawerCloseBtn = document.getElementById('drawerCloseBtn');
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', _closeDrawer);

  if (drawer) {
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', _closeDrawer);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closeDrawer();
  });

  /* ── Drawer logout ───────────────────────────────────────── */
  var drawerLogout = document.getElementById('drawerLogout');
  if (drawerLogout) drawerLogout.addEventListener('click', logoutUser);

  /* ── Create Event form ───────────────────────────────────── */
  _initForm(user);

});

/* ── Pre-fill user fields ─────────────────────────────────── */
function _initForm(user) {

  var firstNameEl = document.getElementById('firstName');
  var lastNameEl  = document.getElementById('lastName');
  var emailEl     = document.getElementById('emailAddress');

  // FIX 1: Pre-fill from stored user BUT ensure fields are editable
  // Remove readonly in case HTML has it set
  if (firstNameEl) {
    firstNameEl.value = (user && user.firstName) || '';
    firstNameEl.removeAttribute('readonly');
    firstNameEl.removeAttribute('disabled');
  }
  if (lastNameEl) {
    lastNameEl.value = (user && user.lastName) || '';
    lastNameEl.removeAttribute('readonly');
    lastNameEl.removeAttribute('disabled');
  }
  if (emailEl) {
    emailEl.value = (user && user.email) || '';
    emailEl.removeAttribute('readonly');
    emailEl.removeAttribute('disabled');
  }

  /* ── Upload banner preview ───────────────────────────────── */
  var uploadWrap  = document.getElementById('uploadWrap');
  var bannerInput = document.getElementById('bannerInput');
  var uploadLabel = document.getElementById('uploadLabel');

  if (uploadWrap && bannerInput) {
    uploadWrap.addEventListener('click', function () { bannerInput.click(); });
    uploadWrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') bannerInput.click();
    });
    bannerInput.addEventListener('change', function () {
      var file = bannerInput.files[0];
      if (file && uploadLabel) uploadLabel.textContent = file.name;
    });
  }

  /* ── Submit ──────────────────────────────────────────────── */
  var submitBtn   = document.getElementById('submitBtn');
  var errorBanner = document.getElementById('formError');
  var okBanner    = document.getElementById('formSuccess');

  if (!submitBtn) return;

  submitBtn.addEventListener('click', function () {
    _hideBanners(errorBanner, okBanner);

    var eventName    = document.getElementById('eventName');
    var eventDate    = document.getElementById('eventDate');
    var eventTime    = document.getElementById('eventTime');
    var eventLoc     = document.getElementById('eventLocation');
    var streetAddr   = document.getElementById('streetAddress');
    var city         = document.getElementById('city');
    var countryState = document.getElementById('countryState');
    var region       = document.getElementById('eventRegion');
    var category     = document.getElementById('eventCategory');
    var description  = document.getElementById('eventDescription');

    var valid    = true;
    var required = [
      { el: eventName,    errId: 'eventNameError',     msg: 'Event name is required.' },
      { el: eventDate,    errId: 'eventDateError',     msg: 'Event date is required.' },
      { el: eventTime,    errId: 'eventTimeError',     msg: 'Event time is required.' },
      { el: eventLoc,     errId: 'eventLocationError', msg: 'Location is required.' },
      { el: streetAddr,   errId: 'streetAddressError', msg: 'Street address is required.' },
      { el: city,         errId: 'cityError',          msg: 'City is required.' },
      { el: countryState, errId: 'countryStateError',  msg: 'Country/State is required.' },
    ];

    required.forEach(function (item) {
      if (!item.el) return;
      var errEl = document.getElementById(item.errId);
      if (!item.el.value.trim()) {
        item.el.classList.add('input-error');
        if (errEl) errEl.textContent = item.msg;
        valid = false;
      } else {
        item.el.classList.remove('input-error');
        if (errEl) errEl.textContent = '';
      }
    });

    if (region && !region.value) {
      var regionErr = document.getElementById('eventRegionError');
      if (regionErr) regionErr.textContent = 'Please select a region.';
      valid = false;
    }
    if (category && !category.value) {
      var catErr = document.getElementById('eventCategoryError');
      if (catErr) catErr.textContent = 'Please select a category.';
      valid = false;
    }

    if (!valid) return;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Creating…';

    var startDate = new Date(
      (eventDate ? eventDate.value : '') + 'T' + (eventTime ? eventTime.value : '00:00')
    ).toISOString();

    // FIX 3: Add status: 'published' so event is not saved as draft
   var payload = {
     title:       eventName.value.trim(),
     startDate:   startDate,
      date:        startDate, 
      location:    eventLoc.value.trim(),
      address:     streetAddr ? streetAddr.value.trim() : '',
      city:        city ? city.value.trim() : '',
      country:     countryState ? countryState.value.trim() : '',
      region:      region ? region.value : '',
      category:    category ? category.value : '',
      description: description ? description.value.trim() : '',
      status:      'published',   // FIX: was missing, backend defaulted to 'draft'
    };

    // Include organizer name from form fields (user may have edited them)
    var firstName = document.getElementById('firstName');
    var lastName  = document.getElementById('lastName');
    if (firstName && firstName.value.trim()) payload.firstName = firstName.value.trim();
    if (lastName  && lastName.value.trim())  payload.lastName  = lastName.value.trim();

    fetch('https://eventpro-fxfv.onrender.com/api/events', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + getStoredToken(),
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {

        // ── Duplicate detected — 409 Conflict ──────────────
        if (result.status === 409 || (result.data && result.data.duplicate)) {
          sessionStorage.setItem(
            'eventpro_duplicate_data',
            JSON.stringify(result.data.duplicate || result.data)
          );
          sessionStorage.setItem(
            'eventpro_pending_event',
            JSON.stringify(payload)
          );
          window.location.href = '../pages/duplicate-detection.html';
          return;
        }

        if (!result.ok) {
          _showBanner(errorBanner, result.data.message || 'Failed to create event. Please try again.');
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Create Event';
          return;
        }

        // FIX 2: Redirect based on actual role — never hardcode organizer-dashboard
        var user = getStoredUser();
        _showBanner(okBanner, 'Event created successfully! Redirecting…');
        setTimeout(function () {
          _goToDashboard(user && user.role);
        }, 1500);
      })
      .catch(function () {
        _showBanner(errorBanner, 'Network error. Please check your connection and try again.');
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Create Event';
      });
  });
}

/* ── Helpers ──────────────────────────────────────────────── */
function _dashboardHref(role) {
  if (role === 'admin')     return '../pages/admin-dashboard.html';
  if (role === 'organizer') return '../pages/organizer-dashboard.html';
  return '../pages/organizer-dashboard.html'; // default — create-event is an organizer feature
}

function _goToDashboard(role) {
  window.location.href = _dashboardHref(role);
}

function _showBanner(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden      = false;
}

function _hideBanners() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i]) arguments[i].hidden = true;
  }
}
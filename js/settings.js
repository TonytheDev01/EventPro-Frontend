// ================================================
//  EventPro — Settings Page
//  js/settings.js
//  Depends on: auth-service.js, load-components.js
//
//  Endpoints used:
//  GET /auth/profile              ← load current user
//  PUT /auth/profile              ← save profile changes
//  POST /auth/reset-password      ← change password (authenticated)
// ================================================

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard ────────────────────────────────
  requireAuth();

  // ── Load sidebar + topbar ─────────────────────
  loadDashboardComponents('settings');

  // ── DOM refs ───────────────────────────────────
  var firstNameInput    = document.getElementById('firstName');
  var lastNameInput     = document.getElementById('lastName');
  var emailInput        = document.getElementById('email');
  var phoneInput        = document.getElementById('phone');
  var orgInput          = document.getElementById('organisation');
  var roleInput         = document.getElementById('role');
  var avatarPreview     = document.getElementById('avatarPreview');
  var avatarInput       = document.getElementById('avatarInput');
  var btnUploadPhoto    = document.getElementById('btnUploadPhoto');
  var btnDeletePhoto    = document.getElementById('btnDeletePhoto');
  var btnSave           = document.getElementById('btnSave');
  var btnCancel         = document.getElementById('btnCancel');
  var currentPassInput  = document.getElementById('currentPassword');
  var newPassInput      = document.getElementById('newPassword');
  var errorBanner       = document.getElementById('stError');
  var successBanner     = document.getElementById('stSuccess');

  var _originalData = {};
  var _photoFile    = null;
  var _photoDeleted = false;

  // ── Load profile ───────────────────────────────
  _loadProfile();

  // ── Password visibility toggles ───────────────
  document.querySelectorAll('.st-eye').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.setAttribute('aria-label',
        input.type === 'password' ? 'Show password' : 'Hide password'
      );
    });
  });

  // ── Upload photo ───────────────────────────────
  if (btnUploadPhoto) {
    btnUploadPhoto.addEventListener('click', function () {
      avatarInput.click();
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', function () {
      var file = avatarInput.files[0];
      if (!file) return;
      _photoFile    = file;
      _photoDeleted = false;
      var reader    = new FileReader();
      reader.onload = function (e) {
        avatarPreview.innerHTML = '<img src="' + e.target.result + '" alt="Profile photo" />';
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Delete photo ───────────────────────────────
  if (btnDeletePhoto) {
    btnDeletePhoto.addEventListener('click', function () {
      _photoFile    = null;
      _photoDeleted = true;
      var user      = getStoredUser();
      var initials  = _getInitials(user);
      avatarPreview.innerHTML = initials;
      avatarPreview.style.backgroundImage = '';
    });
  }

  // ── Save changes ───────────────────────────────
  if (btnSave) {
    btnSave.addEventListener('click', _handleSave);
  }

  // ── Cancel ────────────────────────────────────
  if (btnCancel) {
    btnCancel.addEventListener('click', function () {
      _populateForm(_originalData);
      _photoFile    = null;
      _photoDeleted = false;
      _clearBanners();
      _clearFieldErrors();
    });
  }

  // ── Clear errors on input ──────────────────────
  [firstNameInput, lastNameInput, emailInput, phoneInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener('input', function () {
      input.classList.remove('is-error');
      var errId = input.id + 'Err';
      var errEl = document.getElementById(errId);
      if (errEl) errEl.textContent = '';
      _clearBanners();
    });
  });

  // ── Load profile from API ──────────────────────
  function _loadProfile() {
    // Pre-fill from localStorage immediately
    var cached = getStoredUser();
    if (cached) _populateForm(cached);

    // Then fetch fresh from API
    getUserProfile()
      .then(function (result) {
        if (result.success) {
          var profile = result.data.user || result.data;
          _populateForm(profile);
          _originalData = Object.assign({}, profile);
          storeUser(profile);
        }
      })
      .catch(function () {
        // Silently use cached data
      });
  }

  // ── Populate form fields ───────────────────────
  function _populateForm(user) {
    if (!user) return;

    if (firstNameInput) firstNameInput.value = user.firstName || '';
    if (lastNameInput)  lastNameInput.value  = user.lastName  || '';
    if (emailInput)     emailInput.value     = user.email     || '';
    if (phoneInput)     phoneInput.value     = user.phone     || '';
    if (orgInput)       orgInput.value       = user.organisation || user.organization || '';
    if (roleInput)      roleInput.value      = _capitalise(user.role || 'user');

    // Avatar
    if (avatarPreview) {
      if (user.photo || user.avatar) {
        avatarPreview.innerHTML = '<img src="' + (user.photo || user.avatar) + '" alt="Profile photo" />';
      } else {
        avatarPreview.innerHTML = _getInitials(user);
      }
    }
  }

  // ── Handle save ───────────────────────────────
  function _handleSave() {
    _clearBanners();
    _clearFieldErrors();

    if (!_validateForm()) return;

    btnSave.disabled    = true;
    btnSave.textContent = 'Saving…';

    var payload = {
      firstName:    firstNameInput.value.trim(),
      lastName:     lastNameInput.value.trim(),
      phone:        phoneInput.value.trim(),
      organisation: orgInput.value.trim(),
    };

    // Handle password change if filled
    var currentPass = currentPassInput ? currentPassInput.value : '';
    var newPass     = newPassInput     ? newPassInput.value     : '';

    var profilePromise = updateUserProfile(payload);

    var passwordPromise = (currentPass && newPass)
      ? resetPasswordAuthenticated(currentPass, newPass)
      : Promise.resolve({ success: true });

    Promise.all([profilePromise, passwordPromise])
      .then(function (results) {
        btnSave.disabled    = false;
        btnSave.textContent = 'Save Changes';

        var profileResult  = results[0];
        var passwordResult = results[1];

        if (!profileResult.success) {
          _showError(profileResult.message || 'Failed to save profile. Please try again.');
          return;
        }

        if (!passwordResult.success) {
          _showError(passwordResult.message || 'Failed to update password. Please check your current password.');
          return;
        }

        // Clear password fields on success
        if (currentPassInput) currentPassInput.value = '';
        if (newPassInput)     newPassInput.value     = '';

        _originalData = Object.assign({}, payload, { role: _originalData.role });
        _showSuccess('Your settings have been saved successfully.');
      })
      .catch(function () {
        btnSave.disabled    = false;
        btnSave.textContent = 'Save Changes';
        _showError('Network error. Please check your connection and try again.');
      });
  }

  // ── Validate form ──────────────────────────────
  function _validateForm() {
    var valid = true;

    if (!firstNameInput.value.trim()) {
      _fieldError(firstNameInput, 'firstNameErr', 'First name is required.');
      valid = false;
    }

    if (!lastNameInput.value.trim()) {
      _fieldError(lastNameInput, 'lastNameErr', 'Last name is required.');
      valid = false;
    }

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim() || !emailRe.test(emailInput.value.trim())) {
      _fieldError(emailInput, 'emailErr', 'A valid email address is required.');
      valid = false;
    }

    // Password validation — only if one field is filled
    var currentPass = currentPassInput ? currentPassInput.value : '';
    var newPass     = newPassInput     ? newPassInput.value     : '';

    if (currentPass && !newPass) {
      _showError('Please enter a new password.');
      valid = false;
    }

    if (newPass && !currentPass) {
      _showError('Please enter your current password to change it.');
      valid = false;
    }

    if (newPass && newPass.length < 8) {
      _showError('New password must be at least 8 characters.');
      valid = false;
    }

    return valid;
  }

  // ── Helpers ────────────────────────────────────
  function _fieldError(input, errId, msg) {
    input.classList.add('is-error');
    var el = document.getElementById(errId);
    if (el) el.textContent = msg;
  }

  function _clearFieldErrors() {
    [firstNameInput, lastNameInput, emailInput, phoneInput].forEach(function (input) {
      if (!input) return;
      input.classList.remove('is-error');
    });
    ['firstNameErr', 'lastNameErr', 'emailErr', 'phoneErr'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  function _showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.hidden      = false;
    successBanner.hidden    = true;
    errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function _showSuccess(msg) {
    successBanner.textContent = msg;
    successBanner.hidden      = false;
    errorBanner.hidden        = true;
  }

  function _clearBanners() {
    if (errorBanner)   errorBanner.hidden   = true;
    if (successBanner) successBanner.hidden = true;
  }

  function _getInitials(user) {
    if (!user) return '?';
    return ((user.firstName || '').charAt(0) + (user.lastName || '').charAt(0))
      .toUpperCase() || '?';
  }

  function _capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

});
// ================================================
//  EventPro — Role Selection
//  js/role-selection.js
//  Requires: auth-service.js
//
//  HTML uses radio inputs with name="role"
//  and a single button id="continueBtn"
//
//  Flow:
//  1. requireAuth()
//  2. User picks radio — attendee / organiser / vendor
//  3. Click Continue → PUT /auth/profile { role }
//  4. Redirect based on role
// ================================================

document.addEventListener('DOMContentLoaded', function () {

  requireAuth();

  var continueBtn = document.getElementById('continueBtn');
  var errorBanner = document.getElementById('rpError');

  if (!continueBtn) return;

  continueBtn.addEventListener('click', function () {
    var selected = document.querySelector('input[name="role"]:checked');

    if (!selected) {
      _showError('Please select a role to continue.');
      return;
    }

    var role = selected.value;

    // Vendor disabled — safety net
    if (role === 'vendor') {
      _showToast('Vendor accounts are coming soon.');
      return;
    }

    _setLoading(true);

    updateUserProfile({ role: role })
      .then(function (result) {
        _setLoading(false);

        if (result.success) {
          var existingUser = getStoredUser();
          var updatedUser  = (result.data && result.data.user)
            ? result.data.user
            : Object.assign({}, existingUser, { role: role });

          storeUser(updatedUser);
          _routeByRole(role);
          return;
        }

        _showError(result.message || 'Failed to save role. Please try again.');
      })
      .catch(function () {
        _setLoading(false);
        _showError('Network error. Please check your connection and try again.');
      });
  });

  function _routeByRole(role) {
    if (role === 'admin') {
      window.location.href = '../pages/admin-dashboard.html';
    } else if (role === 'organizer') {
      window.location.href = '../pages/organizer-dashboard.html';
    } else {
      window.location.href = '../pages/attendees.html';
    }
  }

  function _setLoading(on) {
    continueBtn.disabled    = on;
    continueBtn.textContent = on ? 'Saving…' : 'Continue';
  }

  function _showError(msg) {
    if (!errorBanner) return;
    errorBanner.textContent = msg;
    errorBanner.hidden      = false;
  }

  function _showToast(msg) {
    var toast = document.getElementById('rpToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3000);
  }

});
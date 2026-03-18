// ============================================================
//  role-selection.js
//  Page: Role Preference (standalone screen)
//  Requires: auth-service.js
//
//  Flow:
//  1. requireAuth() — redirect to sign-in if not logged in
//  2. User selects role and clicks Continue
//  3. PUT /auth/profile { role } via updateUserProfile()
//  4. Update stored user, redirect to correct dashboard
//
//  This screen is ALWAYS shown after signup.
//  After login, sign-in.js only sends users here
//  if they have no role assigned yet.
//
//  Role → redirect map (matches sign-in.js + signup.js):
//    user      → ../pages/attendees.html
//    organizer → ../pages/organizer-dashboard.html
//    admin     → ../pages/admin-dashboard.html
//    vendor    → disabled (coming soon)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard ─────────────────────────────────────────
  requireAuth();

  // ── DOM refs ───────────────────────────────────────────
  var continueBtn = document.getElementById('continueBtn');
  var errorBanner = document.getElementById('rpError');

  // ── Continue button ────────────────────────────────────
  continueBtn.addEventListener('click', function () {
    var selected = document.querySelector('input[name="role"]:checked');

    if (!selected) {
      _showError('Please select a role to continue.');
      return;
    }

    var role = selected.value;

    // Vendor is disabled — safety net
    if (role === 'vendor') {
      _showToast('Vendor accounts are coming soon.');
      return;
    }

    _setLoading(true);

    // Update role on backend via PUT /auth/profile
    updateUserProfile({ role: role })
      .then(function (result) {
        _setLoading(false);

        if (result.success) {
          // Merge updated role into stored user
          var existingUser = getStoredUser();
          var updatedUser  = (result.data && result.data.user)
            ? result.data.user
            : Object.assign({}, existingUser, { role: role });

          storeUser(updatedUser);
          _redirectByRole(role);
          return;
        }

        _showError(
          result.message || 'Failed to save role. Please try again.'
        );
      })
      .catch(function () {
        _setLoading(false);
        _showError('Network error. Please check your connection and try again.');
      });
  });

  // ── Helpers ────────────────────────────────────────────
  function _redirectByRole(role) {
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
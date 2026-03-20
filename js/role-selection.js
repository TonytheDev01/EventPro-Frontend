// ================================================
//  EventPro — Role Selection
//  js/role-selection.js
//  Requires: auth-service.js
//
//  HTML uses radio inputs with name="role"
//  and a single button id="continueBtn"
// ================================================

document.addEventListener('DOMContentLoaded', function () {

  requireAuth();

  var continueBtn = document.getElementById('continueBtn');
  var errorBanner = document.getElementById('rpError');

  if (!continueBtn) return;

  continueBtn.addEventListener('click', function () {
    var selected = document.querySelector('input[name="role"]:checked');

    if (!selected) {
      if (errorBanner) {
        errorBanner.textContent = 'Please select a role to continue.';
        errorBanner.hidden = false;
      }
      return;
    }

    var role = selected.value;

    if (role === 'vendor') {
      var toast = document.getElementById('rpToast');
      if (toast) {
        toast.textContent = 'Vendor accounts are coming soon.';
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 3000);
      }
      return;
    }

    continueBtn.disabled    = true;
    continueBtn.textContent = 'Saving…';

    // Save role locally immediately
    var existingUser = getStoredUser();
    var updatedUser  = Object.assign({}, existingUser, { role: role });
    storeUser(updatedUser);

    // Try backend — route regardless of result
    updateUserProfile({ role: role })
      .then(function (result) {
        if (result.success && result.data && result.data.user) {
          storeUser(result.data.user);
        }
        _routeByRole(role);
      })
      .catch(function () {
        _routeByRole(role);
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

});
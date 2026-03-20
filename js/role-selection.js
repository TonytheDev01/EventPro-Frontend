// ================================================
//  EventPro — Role Selection
//  js/role-selection.js
//  Depends on: auth-service.js
//
//  After login, non-admin users land here to
//  select their active role for the session.
//
//  Routing after selection:
//  admin     → admin-dashboard.html   (shouldn't reach here)
//  organizer → organizer-dashboard.html
//  user      → attendees.html
// ================================================

document.addEventListener('DOMContentLoaded', function () {

  requireAuth();

  var user = getStoredUser();

  // Admin should never reach role selection
  if (user && user.role === 'admin') {
    window.location.href = '../pages/admin-dashboard.html';
    return;
  }

  // Wire role cards
  var cards = document.querySelectorAll('[data-role]');
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var role = card.dataset.role;
      _selectRole(role);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _selectRole(card.dataset.role);
      }
    });
  });

  // Wire continue button if present
  var continueBtn = document.getElementById('continueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', function () {
      var selected = document.querySelector('[data-role].selected');
      if (selected) _selectRole(selected.dataset.role);
    });
  }

});

function _selectRole(role) {
  // Update profile role on backend
  updateUserProfile({ role: role })
    .then(function (result) {
      if (!result.success) {
        // Even if update fails, route based on selected role
        _routeByRole(role);
        return;
      }
      _routeByRole(role);
    })
    .catch(function () {
      _routeByRole(role);
    });
}

function _routeByRole(role) {
  if (role === 'admin') {
    window.location.href = '../pages/admin-dashboard.html';
  } else if (role === 'organizer') {
    window.location.href = '../pages/organizer-dashboard.html';
  } else {
    // user / attendee
    window.location.href = '../pages/attendees.html';
  }
}
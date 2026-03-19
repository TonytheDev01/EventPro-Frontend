// ================================================
//  EventPro — Organizer Accounts
//  js/organizer-accounts.js
//  Depends on: auth-service.js, load-components.js
//
//  Flow:
//  1. Arrived from organizer-management.html
//     via row click → ?organizerId=...
//  2. If organizerId in URL → fetch that organizer
//     GET /admin/organizers/{id}
//  3. If no organizerId → load all organizers
//     GET /admin/organizers
//  4. Back button → organizer-management.html
//
//  Endpoints (Swagger confirmed):
//  GET /admin/organizers          → list all
//  GET /admin/organizers/{id}     → single organizer
// ================================================

var API          = 'https://eventpro-fxfv.onrender.com/api';
var ROWS_PER_PAGE = 5;

var _currentPage = 1;
var _editingId   = null;
var _allUsers    = [];

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard — admin only ───────────────────
  requireAuth();
  var user = getStoredUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '../pages/sign-in.html';
    return;
  }

  // ── Load dashboard shell ──────────────────────
  loadDashboardComponents('organizers');

  // ── Back button → organizer-management ───────
  var backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.location.href = '../pages/organizer-management.html';
    });
  }

  // ── Read organizerId from URL ─────────────────
  var params      = new URLSearchParams(window.location.search);
  var organizerId = params.get('organizerId');

  if (organizerId) {
    _fetchSingleOrganizer(organizerId);
  } else {
    _fetchAllOrganizers();
  }

  // ── Wire search + filter ──────────────────────
  var searchInput = document.getElementById('searchInput');
  var roleFilter  = document.getElementById('roleFilter');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      _currentPage = 1;
      _renderTable();
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener('change', function () {
      _currentPage = 1;
      _renderTable();
    });
  }

  // ── Add Organizer button ──────────────────────
  var addBtn = document.getElementById('addOrganizerBtn');
  if (addBtn) addBtn.addEventListener('click', function () {
    _openModal('Add Organizer', null);
  });

  // ── Modal buttons ─────────────────────────────
  var cancelBtn = document.getElementById('modalCancelBtn');
  var saveBtn   = document.getElementById('modalSaveBtn');
  var overlay   = document.getElementById('modalOverlay');

  if (cancelBtn) cancelBtn.addEventListener('click', _closeModal);
  if (saveBtn)   saveBtn.addEventListener('click', _handleSave);

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _closeModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _closeModal();
  });

});

// ── Fetch single organizer ────────────────────────────────
function _fetchSingleOrganizer(id) {
  _setTableLoading();

  fetch(API + '/admin/organizers/' + id, {
    method:  'GET',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    })
    .then(function (result) {
      if (!result.ok) {
        _setTableError('Unable to load organizer. Please try again.');
        return;
      }
      var organizer = result.data.organizer || result.data;
      _allUsers = organizer ? [organizer] : [];
      _renderTable();
    })
    .catch(function () {
      _setTableError('Network error. Please check your connection.');
    });
}

// ── Fetch all organizers ──────────────────────────────────
function _fetchAllOrganizers() {
  _setTableLoading();

  fetch(API + '/admin/organizers', {
    method:  'GET',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    })
    .then(function (result) {
      if (!result.ok) {
        _setTableError('Unable to load organizers. Please try again.');
        return;
      }
      _allUsers = result.data.organizers || result.data || [];
      _renderTable();
    })
    .catch(function () {
      _setTableError('Network error. Please check your connection.');
    });
}

// ── Render table ──────────────────────────────────────────
function _renderTable() {
  var tbody      = document.getElementById('tableBody');
  var searchVal  = (document.getElementById('searchInput') || {}).value || '';
  var roleVal    = (document.getElementById('roleFilter')  || {}).value || 'all';

  searchVal = searchVal.toLowerCase();

  var filtered = _allUsers.filter(function (u) {
    var fullName    = ((u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase();
    var matchSearch = fullName.indexOf(searchVal) !== -1 ||
                      (u.email || '').toLowerCase().indexOf(searchVal) !== -1;
    var matchRole   = roleVal === 'all' || u.role === roleVal;
    return matchSearch && matchRole;
  });

  var totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE) || 1;
  if (_currentPage > totalPages) _currentPage = totalPages;

  var start   = (_currentPage - 1) * ROWS_PER_PAGE;
  var visible = filtered.slice(start, start + ROWS_PER_PAGE);

  if (!tbody) return;

  if (!visible.length) {
    tbody.innerHTML = '<tr class="oa-loading-row"><td colspan="6">No organizers found.</td></tr>';
    _renderPagination(totalPages);
    return;
  }

  tbody.innerHTML = visible.map(function (u) {
    var first    = u.firstName || '';
    var last     = u.lastName  || '';
    var initials = ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
    var name     = _esc((first + ' ' + last).trim() || '—');
    var email    = _esc(u.email || '—');
    var role     = _esc(u.role  || '—');
    var status   = (u.status || 'pending').toLowerCase();
    var id       = _esc(u.id || u._id || '');

    return '<tr data-id="' + id + '">'
      + '<td><div class="oa-avatar">' + initials + '</div></td>'
      + '<td>' + name + '</td>'
      + '<td>' + email + '</td>'
      + '<td>' + role + '</td>'
      + '<td><span class="oa-status oa-status--' + status + '">'
      +   status.charAt(0).toUpperCase() + status.slice(1)
      + '</span></td>'
      + '<td><div class="oa-action-buttons">'
      +   '<button type="button" class="oa-btn-edit"   data-id="' + id + '">Edit</button>'
      +   '<button type="button" class="oa-btn-delete" data-id="' + id + '">Delete</button>'
      + '</div></td>'
      + '</tr>';
  }).join('');

  // Wire edit + delete
  tbody.querySelectorAll('.oa-btn-edit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id   = btn.dataset.id;
      var user = _allUsers.find(function (u) { return (u.id || u._id) === id; });
      if (user) _openModal('Edit Organizer', user);
    });
  });

  tbody.querySelectorAll('.oa-btn-delete').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id  = btn.dataset.id;
      var row = btn.closest('tr');
      if (!row) return;
      row.style.opacity    = '0.4';
      row.style.transition = 'opacity 0.2s ease-out';
      setTimeout(function () {
        _allUsers = _allUsers.filter(function (u) {
          return (u.id || u._id) !== id;
        });
        _renderTable();
      }, 200);
    });
  });

  _renderPagination(totalPages);
}

// ── Render pagination ─────────────────────────────────────
function _renderPagination(totalPages) {
  var nav = document.getElementById('pagination');
  if (!nav) return;
  nav.innerHTML = '';

  for (var i = 1; i <= totalPages; i++) {
    var btn       = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'oa-page-btn' + (i === _currentPage ? ' active' : '');
    btn.textContent = i;
    (function (page) {
      btn.addEventListener('click', function () {
        _currentPage = page;
        _renderTable();
      });
    })(i);
    nav.appendChild(btn);
  }

  if (totalPages > 1) {
    var nextBtn       = document.createElement('button');
    nextBtn.type      = 'button';
    nextBtn.className = 'oa-next-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', function () {
      if (_currentPage < totalPages) {
        _currentPage++;
        _renderTable();
      }
    });
    nav.appendChild(nextBtn);
  }
}

// ── Modal ─────────────────────────────────────────────────
function _openModal(title, user) {
  var overlay   = document.getElementById('modalOverlay');
  var titleEl   = document.getElementById('modalTitle');
  var nameInput = document.getElementById('modalName');
  var emailInput = document.getElementById('modalEmail');
  var roleInput = document.getElementById('modalRole');
  var errorEl   = document.getElementById('modalError');

  if (!overlay) return;

  if (titleEl)   titleEl.textContent  = title;
  if (nameInput) nameInput.value      = user ? ((user.firstName || '') + ' ' + (user.lastName || '')).trim() : '';
  if (emailInput) emailInput.value    = user ? (user.email || '') : '';
  if (roleInput) roleInput.value      = user ? (user.role || 'organizer') : 'organizer';
  if (errorEl)   errorEl.className    = 'oa-modal__error';

  _editingId = user ? (user.id || user._id || null) : null;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (nameInput) nameInput.focus();
}

function _closeModal() {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  _editingId = null;
}

// ── Save ──────────────────────────────────────────────────
function _handleSave() {
  var nameInput  = document.getElementById('modalName');
  var emailInput = document.getElementById('modalEmail');
  var roleInput  = document.getElementById('modalRole');
  var errorEl    = document.getElementById('modalError');

  var fullName = nameInput  ? nameInput.value.trim()  : '';
  var email    = emailInput ? emailInput.value.trim()  : '';
  var role     = roleInput  ? roleInput.value          : 'organizer';

  if (!fullName || !email) {
    if (errorEl) {
      errorEl.textContent = 'Please fill in all fields.';
      errorEl.className   = 'oa-modal__error show';
    }
    return;
  }

  var parts     = fullName.split(' ');
  var firstName = parts[0];
  var lastName  = parts.slice(1).join(' ') || '';

  if (_editingId) {
    var idx = _allUsers.findIndex(function (u) {
      return (u.id || u._id) === _editingId;
    });
    if (idx !== -1) {
      _allUsers[idx] = Object.assign({}, _allUsers[idx], {
        firstName: firstName, lastName: lastName, email: email, role: role
      });
    }
  } else {
    _allUsers.push({
      id:        Date.now().toString(),
      firstName: firstName,
      lastName:  lastName,
      email:     email,
      role:      role,
      status:    'pending',
    });
  }

  _closeModal();
  _renderTable();
}

// ── Utilities ─────────────────────────────────────────────
function _setTableLoading() {
  var tbody = document.getElementById('tableBody');
  if (tbody) {
    tbody.innerHTML = '<tr class="oa-loading-row"><td colspan="6">'
      + '<div class="spinner" role="status" aria-label="Loading"></div>'
      + '</td></tr>';
  }
}

function _setTableError(msg) {
  var tbody = document.getElementById('tableBody');
  if (tbody) {
    tbody.innerHTML = '<tr class="oa-loading-row"><td colspan="6">' + _esc(msg) + '</td></tr>';
  }
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
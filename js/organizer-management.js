// ================================================
//  EventPro — Organizer Management
//  js/organizer-management.js
//  Depends on:
//    js/services/auth-service.js
//    js/utils/load-components.js
//
//  Endpoints used (Swagger confirmed):
//  GET  /admin/organizers?page&limit&search&status
//    ← paginated organizer list
//  POST /auth/signup/organizer
//    ← create organizer account (confirmed Ezekiel March 2026)
//
//  Row click → organizer-accounts.html?organizerId=...
// ================================================

var _OM_API        = 'https://eventpro-fxfv.onrender.com/api';
var _OM_PAGE_LIMIT = 10;

var _omPage        = 1;
var _omTotalPages  = 1;
var _omSearchTimer = null;

document.addEventListener('DOMContentLoaded', function () {

  // ── Auth guard — admin only ───────────────────
  requireAuth();
  var user = getStoredUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '../pages/sign-in.html';
    return;
  }

  // ── Load sidebar + topbar ─────────────────────
  loadDashboardComponents('organizers');

  // ── Load first page ───────────────────────────
  _omLoadOrganizers();

  // ── Wire search ───────────────────────────────
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(_omSearchTimer);
      _omSearchTimer = setTimeout(function () {
        _omPage = 1;
        _omLoadOrganizers();
      }, 400);
    });
  }

  // ── Wire status filter ────────────────────────
  var filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', function () {
      _omPage = 1;
      _omLoadOrganizers();
    });
  }

  // ── Wire Add Organizer button ─────────────────
  var btnAdd = document.getElementById('btnAddOrganizer');
  if (btnAdd) btnAdd.addEventListener('click', _omOpenModal);

  // ── Wire modal close buttons ──────────────────
  var btnClose  = document.getElementById('btnClose');
  var btnCancel = document.getElementById('btnCancel');
  if (btnClose)  btnClose.addEventListener('click', _omCloseModal);
  if (btnCancel) btnCancel.addEventListener('click', _omCloseModal);

  // ── Close on overlay click ────────────────────
  var modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) _omCloseModal();
    });
  }

  // ── Close on Escape ───────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') _omCloseModal();
  });

  // ── Wire form submit ──────────────────────────
  var form = document.getElementById('addOrganizerForm');
  if (form) form.addEventListener('submit', _omHandleSubmit);

  // ── Wire inline field clearing ────────────────
  ['firstName', 'lastName', 'orgEmail', 'orgPhone'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { _omClearFieldError(id); });
  });

});

// ════════════════════════════════════════════════
//  LOAD ORGANIZERS
//  GET /admin/organizers
// ════════════════════════════════════════════════

function _omLoadOrganizers() {
  var tbody = document.getElementById('organizerTableBody');
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="spinner" role="status" aria-label="Loading organizers"></div></td></tr>';
  }

  var searchInput  = document.getElementById('searchInput');
  var filterStatus = document.getElementById('filterStatus');
  var search = searchInput  ? searchInput.value.trim()  : '';
  var status = filterStatus ? filterStatus.value        : '';

  var params = new URLSearchParams({ page: _omPage, limit: _OM_PAGE_LIMIT });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  fetch(_OM_API + '/admin/organizers?' + params.toString(), {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var organizers = data.organizers || [];
      var pagination = data.pagination || {};
      var summary    = data.summary    || {};

      _omTotalPages = pagination.pages || 1;

      _omRenderSummary(summary, pagination.total || organizers.length);
      _omRenderTable(organizers);
      _omRenderPagination();
    })
    .catch(function (err) {
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="om-empty">'
          + (err.name === 'AbortError'
            ? 'Request timed out. Please refresh.'
            : 'Unable to load organizers. Please try again.')
          + '</td></tr>';
      }
    });
}

// ════════════════════════════════════════════════
//  RENDER — SUMMARY
// ════════════════════════════════════════════════

function _omRenderSummary(summary, total) {
  var el = document.getElementById('omSummary');
  if (el) el.hidden = false;
  _omSetText('sumTotal',    total != null ? total : '—');
  _omSetText('sumVerified', summary.verifiedOrganizers   != null ? summary.verifiedOrganizers   : '—');
  _omSetText('sumSms',      summary.smsEnabledOrganizers != null ? summary.smsEnabledOrganizers : '—');
}

// ════════════════════════════════════════════════
//  RENDER — TABLE
// ════════════════════════════════════════════════

function _omRenderTable(organizers) {
  var tbody = document.getElementById('organizerTableBody');
  if (!tbody) return;

  if (!organizers.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="om-empty">No organizers found.</td></tr>';
    _omSetText('omFooterCount', 'Showing 0 organizers');
    return;
  }

  tbody.innerHTML = organizers.map(function (org) {
    var name  = _omEscHtml(
      ((org.firstName || '') + ' ' + (org.lastName || '')).trim() || '—'
    );
    var email = _omEscHtml(org.email || '—');
    var phone = _omEscHtml(org.phone || '—');
    var sms   = org.smsEnabled ? 'Yes' : 'No';
    var badge = org.isVerified
      ? '<span class="om-badge om-badge--verified">Verified</span>'
      : '<span class="om-badge om-badge--pending">Pending</span>';
    var orgId = _omEscHtml(org.id || org._id || '');

    return '<tr data-id="' + orgId + '" tabindex="0" role="button" aria-label="View ' + name + '">'
      + '<td>' + name  + '</td>'
      + '<td>' + email + '</td>'
      + '<td>' + phone + '</td>'
      + '<td>' + sms   + '</td>'
      + '<td>' + badge + '</td>'
      + '<td>'
      +   '<button type="button" class="om-action-btn" data-id="' + orgId + '" title="View organizer profile" aria-label="View ' + name + '">'
      +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
      +       '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      +       '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>'
      +     '</svg>'
      +   '</button>'
      + '</td>'
      + '</tr>';
  }).join('');

  // Wire row + action button clicks
  tbody.querySelectorAll('tr[data-id]').forEach(function (row) {
    var id = row.dataset.id;
    function _go() {
      window.location.href = '../pages/organizer-accounts.html?organizerId=' + encodeURIComponent(id);
    }
    row.addEventListener('click', _go);
    row.addEventListener('keydown', function (e) { if (e.key === 'Enter') _go(); });

    var actionBtn = row.querySelector('.om-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        _go();
      });
    }
  });

  // Footer count
  var start = (_omPage - 1) * _OM_PAGE_LIMIT + 1;
  var end   = Math.min(_omPage * _OM_PAGE_LIMIT, (_omPage - 1) * _OM_PAGE_LIMIT + organizers.length);
  _omSetText('omFooterCount', 'Showing ' + start + '–' + end + ' organizers');
}

// ════════════════════════════════════════════════
//  RENDER — PAGINATION
// ════════════════════════════════════════════════

function _omRenderPagination() {
  var nav = document.getElementById('omPagination');
  if (!nav) return;

  var html = '<button class="om-page-btn" data-page="' + (_omPage - 1) + '" '
    + (_omPage === 1 ? 'disabled' : '') + ' aria-label="Previous page">&lt;</button>';

  _omPageRange(_omPage, _omTotalPages).forEach(function (p) {
    html += '<button class="om-page-btn ' + (p === _omPage ? 'active' : '') + '" '
      + 'data-page="' + p + '" aria-label="Page ' + p + '" '
      + (p === _omPage ? 'aria-current="page"' : '') + '>' + p + '</button>';
  });

  html += '<button class="om-page-btn" data-page="' + (_omPage + 1) + '" '
    + (_omPage === _omTotalPages ? 'disabled' : '') + ' aria-label="Next page">&gt;</button>';

  nav.innerHTML = html;

  nav.querySelectorAll('.om-page-btn:not([disabled])').forEach(function (btn) {
    btn.addEventListener('click', function () {
      _omPage = Number(btn.dataset.page);
      _omLoadOrganizers();
    });
  });
}

function _omPageRange(current, total) {
  var delta = 1;
  var left  = Math.max(1, current - delta);
  var right = Math.min(total, current + delta);
  var range = [];
  for (var i = left; i <= right; i++) range.push(i);
  if (range[0] > 1) range.unshift(1);
  if (range[range.length - 1] < total) range.push(total);
  var seen = {};
  return range.filter(function (v) {
    if (seen[v]) return false;
    seen[v] = true;
    return true;
  }).sort(function (a, b) { return a - b; });
}

// ════════════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════════════

function _omOpenModal() {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(function () {
    var first = document.getElementById('firstName');
    if (first) first.focus();
  }, 50);
}

function _omCloseModal() {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
  _omResetForm();
}

// ════════════════════════════════════════════════
//  ADD ORGANIZER
//  POST /auth/signup/organizer (confirmed Ezekiel March 2026)
// ════════════════════════════════════════════════

function _omHandleSubmit(e) {
  e.preventDefault();
  if (!_omValidateForm()) return;

  _omSetSubmitLoading(true);

  var phone = document.getElementById('orgPhone');
  var phoneVal = phone ? phone.value.trim() : '';

  var payload = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName:  document.getElementById('lastName').value.trim(),
    email:     document.getElementById('orgEmail').value.trim(),
    // Temp password — organizer resets via forgot-password flow
    password:  'EventPro@' + Math.random().toString(36).slice(2, 10),
  };
  if (phoneVal) payload.phone = '+234' + phoneVal;

  fetch(_OM_API + '/auth/signup/organizer', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + getStoredToken(),
    },
    body: JSON.stringify(payload),
  })
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    })
    .then(function (result) {
      _omSetSubmitLoading(false);

      if (result.ok) {
        _omShowToast(payload.firstName + ' ' + payload.lastName + ' added successfully!', 'success');
        _omCloseModal();
        _omPage = 1;
        _omLoadOrganizers();
      } else {
        _omShowToast(result.data.message || 'Failed to add organizer. Please try again.', 'error');
      }
    })
    .catch(function (err) {
      _omSetSubmitLoading(false);
      _omShowToast(
        err.name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : 'Network error. Please check your connection.',
        'error'
      );
    });
}

// ════════════════════════════════════════════════
//  FORM VALIDATION
// ════════════════════════════════════════════════

function _omValidateForm() {
  var valid = true;

  var firstName = document.getElementById('firstName');
  var lastName  = document.getElementById('lastName');
  var email     = document.getElementById('orgEmail');
  var phone     = document.getElementById('orgPhone');

  _omClearFieldError('firstName');
  _omClearFieldError('lastName');
  _omClearFieldError('orgEmail');
  _omClearFieldError('orgPhone');

  if (!firstName || !firstName.value.trim()) {
    _omShowFieldError('firstName', 'firstNameError', 'First name is required.');
    valid = false;
  }
  if (!lastName || !lastName.value.trim()) {
    _omShowFieldError('lastName', 'lastNameError', 'Last name is required.');
    valid = false;
  }
  if (!email || !email.value.trim()) {
    _omShowFieldError('orgEmail', 'orgEmailError', 'Email address is required.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    _omShowFieldError('orgEmail', 'orgEmailError', 'Enter a valid email address.');
    valid = false;
  }
  if (phone && phone.value.trim() && !/^[\d\s\-]{7,15}$/.test(phone.value.trim())) {
    _omShowFieldError('orgPhone', 'orgPhoneError', 'Enter a valid phone number.');
    var wrap = document.getElementById('orgPhoneWrap');
    if (wrap) wrap.classList.add('error');
    valid = false;
  }

  return valid;
}

function _omShowFieldError(inputId, errorId, msg) {
  var input = document.getElementById(inputId);
  var el    = document.getElementById(errorId);
  if (input) input.classList.add('error');
  if (el)   { el.textContent = msg; el.classList.add('show'); }
}

function _omClearFieldError(inputId) {
  var errorId = inputId + 'Error';
  var input   = document.getElementById(inputId);
  var el      = document.getElementById(errorId);
  if (input) input.classList.remove('error');
  if (el)    el.classList.remove('show');
  if (inputId === 'orgPhone') {
    var wrap = document.getElementById('orgPhoneWrap');
    if (wrap) wrap.classList.remove('error');
  }
}

function _omResetForm() {
  var form = document.getElementById('addOrganizerForm');
  if (form) form.reset();
  ['firstName', 'lastName', 'orgEmail', 'orgPhone'].forEach(_omClearFieldError);
  _omSetSubmitLoading(false);
}

function _omSetSubmitLoading(loading) {
  var btn     = document.getElementById('btnSubmit');
  var spinner = document.getElementById('submitSpinner');
  var label   = document.getElementById('submitLabel');
  if (btn)     btn.disabled      = loading;
  if (spinner) spinner.classList.toggle('show', loading);
  if (label)   label.textContent = loading ? 'Adding…' : 'Add Organizer';
}

// ════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════

function _omSetText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val != null ? val : '—';
}

function _omShowToast(msg, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = ('toast show ' + (type || '')).trim();
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = 'toast'; }, 4000);
}

function _omEscHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
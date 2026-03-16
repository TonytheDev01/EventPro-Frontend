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
//  POST /auth/signup { firstName,lastName,email,password }
//    ← create organizer account (no dedicated endpoint in Swagger)
//    ⚠️  Will be swapped for a dedicated admin endpoint
//        once Ezekiel adds POST /admin/organizers
//
//  Row click → organizer-accounts.html?organizerId=...
// ================================================

const API        = 'https://eventpro-fxfv.onrender.com/api';
const PAGE_LIMIT = 10;

// ── State ─────────────────────────────────────────
let _page        = 1;
let _totalPages  = 1;
let _searchTimer = null;

document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth guard — admin only ───────────────────
  requireAuth();
  const user = getStoredUser();
  if (user?.role !== 'admin') {
    window.location.href = '../pages/sign-in.html';
    return;
  }

  // ── Load sidebar + topbar ─────────────────────
  await loadDashboardComponents('organizers');

  // ── Load first page ───────────────────────────
  await _loadOrganizers();

  // ── Wire search ───────────────────────────────
  document.getElementById('searchInput')
    ?.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        _page = 1;
        _loadOrganizers();
      }, 400);
    });

  // ── Wire status filter ────────────────────────
  document.getElementById('filterStatus')
    ?.addEventListener('change', () => {
      _page = 1;
      _loadOrganizers();
    });

  // ── Wire Add Organizer button ─────────────────
  document.getElementById('btnAddOrganizer')
    ?.addEventListener('click', _openModal);

  // ── Wire modal close buttons ──────────────────
  document.getElementById('btnClose')
    ?.addEventListener('click', _closeModal);
  document.getElementById('btnCancel')
    ?.addEventListener('click', _closeModal);

  // ── Close on overlay click ────────────────────
  document.getElementById('modalOverlay')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('modalOverlay')) {
        _closeModal();
      }
    });

  // ── Close on Escape ───────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') _closeModal();
  });

  // ── Wire form submit ──────────────────────────
  document.getElementById('addOrganizerForm')
    ?.addEventListener('submit', _handleSubmit);

  // ── Wire inline field clearing ────────────────
  ['firstName', 'lastName', 'orgEmail', 'orgPhone'].forEach(id => {
    document.getElementById(id)
      ?.addEventListener('input', () => _clearFieldError(id));
  });

});

// ════════════════════════════════════════════════
//  LOAD ORGANIZERS
//  GET /admin/organizers
// ════════════════════════════════════════════════

async function _loadOrganizers() {
  const tbody = document.getElementById('organizerTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="spinner" role="status"
            aria-label="Loading organizers"></div>
        </td>
      </tr>`;
  }

  const search = document.getElementById('searchInput')?.value.trim() ?? '';
  const status = document.getElementById('filterStatus')?.value ?? '';

  const params = new URLSearchParams({
    page:  _page,
    limit: PAGE_LIMIT,
    ...(search && { search }),
    ...(status && { status }),
  });

  try {
    const res = await fetch(`${API}/admin/organizers?${params}`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getStoredToken()}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const organizers = data.organizers ?? [];
    const pagination = data.pagination ?? {};
    const summary    = data.summary    ?? {};

    _totalPages = pagination.pages ?? 1;

    _renderSummary(summary, pagination.total ?? organizers.length);
    _renderTable(organizers);
    _renderPagination();

  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="om-empty">
            ${err.name === 'TimeoutError'
              ? 'Request timed out. Please refresh.'
              : 'Unable to load organizers. Please try again.'}
          </td>
        </tr>`;
    }
  }
}

// ════════════════════════════════════════════════
//  RENDER — SUMMARY
// ════════════════════════════════════════════════

function _renderSummary(summary, total) {
  const el = document.getElementById('omSummary');
  if (el) el.hidden = false;
  _setText('sumTotal',   total ?? '—');
  _setText('sumVerified', summary.verifiedOrganizers  ?? '—');
  _setText('sumSms',      summary.smsEnabledOrganizers ?? '—');
}

// ════════════════════════════════════════════════
//  RENDER — TABLE
// ════════════════════════════════════════════════

function _renderTable(organizers) {
  const tbody = document.getElementById('organizerTableBody');
  if (!tbody) return;

  if (!organizers.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="om-empty">No organizers found.</td>
      </tr>`;
    _setText('omFooterCount', 'Showing 0 organizers');
    return;
  }

  tbody.innerHTML = organizers.map(org => {
    const name   = _escHtml(
      `${org.firstName ?? ''} ${org.lastName ?? ''}`.trim() || '—'
    );
    const email  = _escHtml(org.email  ?? '—');
    const phone  = _escHtml(org.phone  ?? '—');
    const sms    = org.smsEnabled ? 'Yes' : 'No';
    const badge  = org.isVerified
      ? `<span class="om-badge om-badge--verified">Verified</span>`
      : `<span class="om-badge om-badge--pending">Pending</span>`;
    const orgId  = _escHtml(org.id ?? org._id ?? '');

    return `
      <tr
        data-id="${orgId}"
        tabindex="0"
        role="button"
        aria-label="View ${name}">
        <td>${name}</td>
        <td>${email}</td>
        <td>${phone}</td>
        <td>${sms}</td>
        <td>${badge}</td>
        <td>
          <button type="button" class="om-action-btn"
            data-id="${orgId}"
            title="View organizer profile"
            aria-label="View ${name}">
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill="none" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3"
                stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </td>
      </tr>`;
  }).join('');

  // Wire row + action button clicks
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    const id = row.dataset.id;
    const go = () => {
      window.location.href =
        `../pages/organizer-accounts.html?organizerId=${id}`;
    };
    row.addEventListener('click', go);
    row.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });

    row.querySelector('.om-action-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      go();
    });
  });

  // Footer count
  const start = (_page - 1) * PAGE_LIMIT + 1;
  const end   = Math.min(_page * PAGE_LIMIT, organizers.length + (_page - 1) * PAGE_LIMIT);
  _setText('omFooterCount', `Showing ${start}–${end} organizers`);
}

// ════════════════════════════════════════════════
//  RENDER — PAGINATION
// ════════════════════════════════════════════════

function _renderPagination() {
  const nav = document.getElementById('omPagination');
  if (!nav) return;

  let html = `
    <button class="om-page-btn" data-page="${_page - 1}"
      ${_page === 1 ? 'disabled' : ''}
      aria-label="Previous page">&lt;</button>`;

  _pageRange(_page, _totalPages).forEach(p => {
    html += `
      <button class="om-page-btn ${p === _page ? 'active' : ''}"
        data-page="${p}" aria-label="Page ${p}"
        ${p === _page ? 'aria-current="page"' : ''}>${p}</button>`;
  });

  html += `
    <button class="om-page-btn" data-page="${_page + 1}"
      ${_page === _totalPages ? 'disabled' : ''}
      aria-label="Next page">&gt;</button>`;

  nav.innerHTML = html;

  nav.querySelectorAll('.om-page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      _page = Number(btn.dataset.page);
      _loadOrganizers();
    });
  });
}

function _pageRange(current, total) {
  const delta = 1;
  const left  = Math.max(1, current - delta);
  const right = Math.min(total, current + delta);
  const range = [];
  for (let i = left; i <= right; i++) range.push(i);
  if (range[0] > 1) range.unshift(1);
  if (range[range.length - 1] < total) range.push(total);
  return [...new Set(range)].sort((a, b) => a - b);
}

// ════════════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════════════

function _openModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('firstName')?.focus(), 50);
}

function _closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
  _resetForm();
}

// ════════════════════════════════════════════════
//  ADD ORGANIZER
//  ⚠️  Uses POST /auth/signup (no dedicated admin
//      create-organizer endpoint in Swagger).
//      A temp password is generated — organizer
//      must use forgot-password to set their own.
//      Will swap for POST /admin/organizers once
//      Ezekiel adds it.
// ════════════════════════════════════════════════

async function _handleSubmit(e) {
  e.preventDefault();
  if (!_validateForm()) return;

  _setSubmitLoading(true);

  const phone = document.getElementById('orgPhone')?.value.trim();

  const payload = {
    firstName: document.getElementById('firstName')?.value.trim(),
    lastName:  document.getElementById('lastName')?.value.trim(),
    email:     document.getElementById('orgEmail')?.value.trim(),
    // Temp password — organizer resets via forgot-password flow
    password:  'EventPro@' + Math.random().toString(36).slice(2, 10),
    ...(phone && { phone: `+234${phone}` }),
  };

  try {
    const res = await fetch(`${API}/auth/signup`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getStoredToken()}`,
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();

    if (res.ok) {
      _showToast(
        `${payload.firstName} ${payload.lastName} added successfully!`,
        'success'
      );
      _closeModal();
      // Refresh list to include new organizer
      _page = 1;
      await _loadOrganizers();

    } else {
      _showToast(
        data.message || 'Failed to add organizer. Please try again.',
        'error'
      );
    }

  } catch (err) {
    _showToast(
      err.name === 'TimeoutError'
        ? 'Request timed out. Please try again.'
        : 'Network error. Please check your connection.',
      'error'
    );
  } finally {
    _setSubmitLoading(false);
  }
}

// ════════════════════════════════════════════════
//  FORM VALIDATION
// ════════════════════════════════════════════════

function _validateForm() {
  let valid = true;

  const firstName = document.getElementById('firstName')?.value.trim();
  const lastName  = document.getElementById('lastName')?.value.trim();
  const email     = document.getElementById('orgEmail')?.value.trim();
  const phone     = document.getElementById('orgPhone')?.value.trim();

  _clearFieldError('firstName');
  _clearFieldError('lastName');
  _clearFieldError('orgEmail');
  _clearFieldError('orgPhone');

  if (!firstName) {
    _showFieldError('firstName', 'firstNameError', 'First name is required.');
    valid = false;
  }
  if (!lastName) {
    _showFieldError('lastName', 'lastNameError', 'Last name is required.');
    valid = false;
  }
  if (!email) {
    _showFieldError('orgEmail', 'orgEmailError', 'Email address is required.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    _showFieldError('orgEmail', 'orgEmailError', 'Enter a valid email address.');
    valid = false;
  }
  if (phone && !/^[\d\s\-]{7,15}$/.test(phone)) {
    _showFieldError('orgPhone', 'orgPhoneError', 'Enter a valid phone number.');
    document.getElementById('orgPhoneWrap')?.classList.add('error');
    valid = false;
  }

  return valid;
}

function _showFieldError(inputId, errorId, msg) {
  document.getElementById(inputId)?.classList.add('error');
  const el = document.getElementById(errorId);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function _clearFieldError(inputId) {
  const errorId = inputId + 'Error';
  document.getElementById(inputId)?.classList.remove('error');
  document.getElementById(errorId)?.classList.remove('show');
  if (inputId === 'orgPhone') {
    document.getElementById('orgPhoneWrap')?.classList.remove('error');
  }
}

function _resetForm() {
  document.getElementById('addOrganizerForm')?.reset();
  ['firstName', 'lastName', 'orgEmail', 'orgPhone'].forEach(_clearFieldError);
  _setSubmitLoading(false);
}

function _setSubmitLoading(loading) {
  const btn     = document.getElementById('btnSubmit');
  const spinner = document.getElementById('submitSpinner');
  const label   = document.getElementById('submitLabel');
  if (btn)     btn.disabled    = loading;
  if (spinner) spinner.classList.toggle('show', loading);
  if (label)   label.textContent = loading ? 'Adding…' : 'Add Organizer';
}

// ════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function _showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 4000);
}

function _escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
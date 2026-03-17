// ================================================
// EventPro — Organizer Accounts Page Logic
// js/organizer-accounts.js
// Depends on: js/services/auth-service.js
//
// Endpoints used:
// GET /auth/profile — get current user profile
// ⚠️ No user listing endpoint confirmed yet
// from backend. Table renders from mock data
// until Ezekiel confirms GET /admin/users or
// equivalent endpoint.
// ================================================

document.addEventListener('DOMContentLoaded', () => {

// Guard — admin only
requireAuth();
const currentUser = getStoredUser();
if (currentUser && currentUser.role !== 'admin') {
window.location.href = '../pages/dashboard.html';
return;
}

// Elements
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const addBtn = document.getElementById('addOrganizerBtn');
const backBtn = document.getElementById('backBtn');
const paginationEl = document.getElementById('pagination');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalName = document.getElementById('modalName');
const modalEmail = document.getElementById('modalEmail');
const modalRole = document.getElementById('modalRole');
const modalError = document.getElementById('modalError');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

// Pagination state
const rowsPerPage = 5;
let currentPage = 1;
let editingRow = null;

// Mock data — replace with GET /admin/users
// ⚠️ Update once Ezekiel confirms user listing endpoint
let users = [
{ id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'admin', status: 'active' },
{ id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'organizer', status: 'pending' },
{ id: '3', firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com', role: 'user', status: 'inactive' },
{ id: '4', firstName: 'Bob', lastName: 'Miller', email: 'bob@example.com', role: 'organizer', status: 'active' },
];

// Back button
backBtn.addEventListener('click', () => {
window.history.back();
});

// Generate initials avatar
function getInitials(firstName, lastName) {
return (firstName?.charAt(0).toUpperCase, lastName?.charAt(0).toUpperCase);
}

// Get status class
function getStatusClass(status) {
const map = {
active: 'status--active',
pending: 'status--pending',
inactive: 'status--inactive'
};
return map[status] || 'status--inactive';
}

// Render table
function renderTable() {
const searchVal = searchInput.value.toLowerCase();
const roleVal = roleFilter.value;

const filtered = users.filter(user => {
  const fullName    = `${user.firstName} ${user.lastName}`.toLowerCase();
  const matchSearch = fullName.includes(searchVal) ||
                      user.email.toLowerCase().includes(searchVal);
  const matchRole   = roleVal === 'all' || user.role === roleVal;
  return matchSearch && matchRole;
});

const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
if (currentPage > totalPages) currentPage = totalPages;

const start   = (currentPage - 1) * rowsPerPage;
const end     = start + rowsPerPage;
const visible = filtered.slice(start, end);

// Render rows 
if (visible.length === 0) {
  tableBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="6">No organizers found.</td>
    </tr>`;
} else {
  tableBody.innerHTML = visible.map(user => `
    <tr data-id="${user.id}">
      <td>
        <div class="avatar">${getInitials(user.firstName, user.lastName)}</div>
      </td>
      <td class="col-name">${user.firstName} ${user.lastName}</td>
      <td class="col-email">${user.email}</td>
      <td class="col-role">${user.role}</td>
      <td>
        <span class="status ${getStatusClass(user.status)}">
          ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button type="button" class="btn-edit" data-id="${user.id}">Edit</button>
          <button type="button" class="btn-delete" data-id="${user.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

renderPagination(totalPages);
}

// Render pagination
function renderPagination(totalPages) {
paginationEl.innerHTML = '';

for (let i = 1; i <= totalPages; i++) {
  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = `page-btn${i === currentPage ? ' active' : ''}`;
  btn.textContent = i;
  btn.addEventListener('click', () => {
    currentPage = i;
    renderTable();
  });
  paginationEl.appendChild(btn);
}

if (totalPages > 1) {
  const nextBtn = document.createElement('button');
  nextBtn.type        = 'button';
  nextBtn.className   = 'next-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
  paginationEl.appendChild(nextBtn);
}
}

// Open modal
function openModal(title, user = null) {
modalTitle.textContent = title;
modalName.value = user ? (user.firstName, user.lastName): ' ';
modalEmail.value = user ? user.email : '';
modalRole.value = user ? user.role : 'organizer';
modalError.style.display = 'none';
modalError.textContent = '';
editingRow = user ? user.id : null;
modalOverlay.classList.add('show');
modalName.focus();
}

function closeModal() {
modalOverlay.classList.remove('show');
editingRow = null;
}

// Add organizer button
addBtn.addEventListener('click', () => {
openModal('Add Organizer');
});

// Modal cancel
modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
if (e.target === modalOverlay) closeModal();
});

// Modal save
modalSaveBtn.addEventListener('click', () => {
const fullName = modalName.value.trim();
const email = modalEmail.value.trim();
const role = modalRole.value;

if (!fullName || !email) {
  modalError.textContent   = 'Please fill in all fields.';
  modalError.style.display = 'block';
  return;
}

const nameParts = fullName.split(' ');
const firstName = nameParts[0];
const lastName  = nameParts.slice(1).join(' ') || '';

if (editingRow) {
  // Update existing user
  const index = users.findIndex(u => u.id === editingRow);
  if (index !== -1) {
    users[index] = { ...users[index], firstName, lastName, email, role };
  }
} else {
  // Add new user
  const newUser = {
    id:        Date.now().toString(),
    firstName,
    lastName,
    email,
    role,
    status:    'pending'
  };
  users.push(newUser);
}

closeModal();
renderTable();
});

// Edit and Delete — event delegation
tableBody.addEventListener('click', (e) => {

// Edit
if (e.target.classList.contains('btn-edit')) {
  const id   = e.target.dataset.id;
  const user = users.find(u => u.id === id);
  if (user) openModal('Edit Organizer', user);
}

// Delete
if (e.target.classList.contains('btn-delete')) {
  const id  = e.target.dataset.id;
  const row = e.target.closest('tr');

  // Fade out then remove
  row.style.opacity    = '0.4';
  row.style.transition = 'opacity 0.2s ease-out';

  setTimeout(() => {
    users = users.filter(u => u.id !== id);
    renderTable();
  }, 200);
}
});

// Search and filter
searchInput.addEventListener('input', () => {
currentPage = 1;
renderTable();
});

roleFilter.addEventListener('change', () => {
currentPage = 1;
renderTable();
});

// Initial render
renderTable();

});
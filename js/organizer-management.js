   document.addEventListener('DOMContentLoaded', async () => { 
    // 1. Redirect if not logged in 
    requireAuth(); 
    // 2. Load sidebar + topbar — ALWAYS before anything else 
    await loadDashboardComponents('organizers');
    
    const form = document.getElementById('add-organizer-form');

    if (form) {
      form.addEventListener('submit', handleSubmit);
    }
    
    //  CONFIG
    const API_BASE = window.APP_CONFIG?.apiBase ?? '/api';

    //  MODAL CONTROL
    function openModal() {
      document.getElementById('modal-overlay').style.display = 'flex';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => document.getElementById('first-name').focus());
    }

    function closeModal() {
      document.getElementById('modal-overlay').style.display = 'none';
      document.body.style.overflow = '';
      resetForm();
      window.dispatchEvent(new CustomEvent('modal:close'));
    }

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    //  SUBMIT 
    async function handleSubmit(e) {
      e.preventDefault();
      if (!validateForm()) return;

      setLoading(true);

      const payload = {
        firstName:        document.getElementById('first-name').value.trim(),
        lastName:         document.getElementById('last-name').value.trim(),
        email:            document.getElementById('org-email').value.trim(),
        phone:            '+234' + document.getElementById('org-phone').value.trim(),
        registrationDate: new Date().toISOString().split('T')[0],
        status:           'pending',
      };

      try {
        const res = await fetch(`${API_BASE}/organizers`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Server error: ${res.status}`);
        }

        const saved = await res.json();
        // `saved` is the organizer object returned by the API (includes id, etc.)

        // Notify the review page (or any listener) with the real saved data
        window.dispatchEvent(new CustomEvent('organizer:added', { detail: saved }));

        showToast(`${saved.firstName} ${saved.lastName} added successfully!`, 'success');
        closeModal();

      } catch (err) {
        showToast(err.message || 'Failed to add organizer. Try again.', 'error');
        console.error('[AddOrganizer]', err);
      } finally {
        setLoading(false);
      }
    }

    //  VALIDATION
    function validateForm() {
    let valid = true;

    const firstNameInput = document.getElementById('first-name');
    const lastNameInput  = document.getElementById('last-name');
    const emailInput     = document.getElementById('org-email');
    const phoneInput     = document.getElementById('org-phone');

    const firstName = firstNameInput.value.trim();
    const lastName  = lastNameInput.value.trim();
    const email     = emailInput.value.trim();
    const phone     = phoneInput.value.trim();

    // Clear previous errors
    ['first-name','last-name','org-email','org-phone'].forEach(clearErr);

    // First name
    if (!firstName) {
    showErr('first-name','First name required');
    valid = false;
    }

    // Last name
    if (!lastName) {
    showErr('last-name','Last name required');
    valid = false;
    }

    // Email
    if (!email) {
    showErr('org-email','Email address required');
    valid = false;
    } 
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr('org-email','Enter a valid email address');
    valid = false;
    }

    // Phone (optional, but must be valid if filled)
    if (phone && !/^[\d\s\-]{7,15}$/.test(phone)) {
    showErr('org-phone','Enter a valid phone number');
    valid = false;
    }

    return valid;
    }

    ['first-name','last-name','org-email','org-phone'].forEach(id => {
        const field = document.getElementById(id);
        field.addEventListener('input', () => clearErr(id));
    });

    //  HELPERS
    function showErr(fieldId, msg) {
      if (fieldId === 'org-phone') {
        document.getElementById('phone-wrapper').classList.add('error');
      } else {
        document.getElementById(fieldId).classList.add('error');
      }
      const errEl = document.getElementById(`${fieldId}-error`);
      errEl.childNodes[2].textContent = ' ' + msg;
      errEl.classList.add('visible');
    }

    function clearErr(fieldId) {
      if (fieldId === 'org-phone') {
        document.getElementById('phone-wrapper').classList.remove('error');
      } else {
        document.getElementById(fieldId).classList.remove('error');
      }
      document.getElementById(`${fieldId}-error`).classList.remove('visible');
    }

    function setLoading(loading) {
      document.getElementById('btn-submit').disabled           = loading;
      document.getElementById('submit-spinner').style.display  = loading ? 'block' : 'none';
      document.getElementById('submit-label').textContent      = loading ? 'Adding…' : 'Add Organizer';
    }

    function resetForm() {
      document.getElementById('add-organizer-form').reset();
      ['first-name', 'last-name', 'org-email', 'org-phone'].forEach(id => {
        document.getElementById(id)?.classList.remove('error');
        document.getElementById(`${id}-error`)?.classList.remove('visible');
      });
      document.getElementById('phone-wrapper').classList.remove('error');
    }

    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className   = `show ${type}`;
      clearTimeout(t._timer);
      t._timer = setTimeout(() => { t.className = ''; }, 4000);
    }
    
    // Admin dashboard path
    const ADMIN_DASHBOARD = '../pages/admin-dashboard.html'; 

    // Cancel button
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
    window.location.href = ADMIN_DASHBOARD;
    });

    // Close 
    document.getElementById('btn-close')?.addEventListener('click', () => {
    window.location.href = ADMIN_DASHBOARD;
    });
    
}); 
  
    
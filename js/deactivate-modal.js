// ================================================
//  EventPro — Deactivate Event Modal
//  js/deactivate-modal.js
//  Depends on: js/services/auth-service.js
//
//  Endpoint used:
//  DELETE /events/{id}
//  Authorization: Bearer token required
//
//  ⚠️  Awaiting confirmation from backend on whether
//  DELETE /events/{id} is a soft delete (deactivate)
//  or a hard delete (permanent). Update the success
//  redirect and UI messaging once confirmed.
// ================================================

const closeBtn = document.getElementById('close-btn');
const cancelBtn = document.getElementById('cancel-btn');
const deactivateBtn = document.getElementById('deactivate-btn');

// Get eventId from URL query string
// e.g. deactivate-modal.html?eventId=abc123
const eventId = new URLSearchParams(window.location.search).get('eventId');

// ── Guard — redirect if not logged in ─────────
requireAuth();

// ── Guard — no eventId means broken navigation ─
if (!eventId) {
    window.location.href = '../pages/organizer-dashboard.html';
}

// ── Close and Cancel — both dismiss the modal ──
function closeModal() {
    // Go back to wherever the user came from
    window.history.back();
}

closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// ── Deactivate — calls DELETE /events/{id} ─────
deactivateBtn.addEventListener('click', async function() {
    const token = getStoredToken();
    
    // Defensive check — should never hit this
    // because requireAuth() runs at page load
    if (!token) {
        window.location.href = '../pages/sign-in.html';
        return;
    }
    
    // Loading state — prevent double clicks
    deactivateBtn.textContent = 'Deactivating...';
    deactivateBtn.disabled = true;
    closeBtn.disabled = true;
    cancelBtn.disabled = true;
    
    try {
        const response = await fetch(
            `https://eventpro-fxfv.onrender.com/api/events/${eventId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        const data = await response.json();
        
        if (response.ok) {
            // Success — go back to organizer dashboard
            window.location.href = '../pages/organizer-dashboard.html';
        } else {
            // Server returned an error — restore button states
            deactivateBtn.textContent = 'Deactivate';
            deactivateBtn.disabled = false;
            closeBtn.disabled = false;
            cancelBtn.disabled = false;
            
            // Show error under the modal subtitle if possible
            const subtitle = document.querySelector('.modal__subtitle');
            if (subtitle) {
                subtitle.textContent = data.message || 'Could not deactivate event. Please try again.';
                subtitle.style.color = '#D33029';
            }
        }
    } catch (err) {
        // Network error — restore button states
        deactivateBtn.textContent = 'Deactivate';
        deactivateBtn.disabled = false;
        closeBtn.disabled = false;
        cancelBtn.disabled = false;
        
        const subtitle = document.querySelector('.modal__subtitle');
        if (subtitle) {
            subtitle.textContent = 'Network error. Please check your connection and try again.';
            subtitle.style.color = '#D33029';
        }
    }
});
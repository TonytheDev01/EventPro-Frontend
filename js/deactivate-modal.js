const closeBtn = document.getElementById('close-btn');
const cancelBtn = document.getElementById('cancel-btn');
const deactivateBtn = document.getElementById('deactivate-btn');

function closeModal() {
    window.history.back();
}

closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

deactivateBtn.addEventListener('click', async function () {
    const token = getStoredToken(); // From auth-service.js
    const eventId = new URLSearchParams(window.location.search).get('eventid');

    if (!token || !eventId) return;

    deactivateBtn.textContent = 'Deactivating...';
    deactivateBtn.disabled = true;

    try {
        const response = await fetch(`https://eventpro-api.onrender.com/api/events/${eventId}/deactivate`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            window.location.href = '../pages/organizer-dashboard.html';
        } else {
            const data = await response.json();
            deactivateBtn.textContent = 'Deactivate';
            deactivateBtn.disabled = false;
            alert(data.message || 'Could not deactivate event.');
        }
    } catch (err) {
        deactivateBtn.textContent = 'Deactivate';
        deactivateBtn.disabled = false;
        alert('Network error. Please check your connection.');
    }
});
// EventPro — You're All Set Screen
// youre-all-set.js
// Depends on: js/services/auth-service.js

const emailEl = document.getElementById("mail");
const viewEventBtn = document.getElementById("view-event");

// Use shared utility — do NOT read localStorage directly
const storedUser = getStoredUser();

if (storedUser && storedUser.email) {
emailEl.textContent = storedUser.email;
}

viewEventBtn.addEventListener("click", function () {
window.location.href = "../pages/my-event.html";
});


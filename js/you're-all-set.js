// Get elements
const emailElement = document.getElementById("mail");
const viewEventBtn = document.getElementById("view-event");

// Example: get email from localStorage
const userEmail = localStorage.getItem("eventEmail");

// If an email exists, display it
if (userEmail) {
    emailElement.textContent = userEmail;
}

// When user clicks "View My Event"
viewEventBtn.addEventListener("click", function () {
    // Redirect to event page
    window.location.href = "../pages/my-event.html";
});
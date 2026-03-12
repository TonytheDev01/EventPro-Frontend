// EventPro — Confirm Registration Page Logic

const BASE_URL = process.env.API_URL || "http://localhost:5000/api";
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const errorMessage = document.getElementById("errorMessage");

// Elements to populate

const eventTitle = document.getElementById("event-title");
const eventDate = document.getElementById("event-date");
const eventTime = document.getElementById("event-time");
const eventLocation = document.getElementById("event-location");
const eventTicketType = document.getElementById("event-ticket-type");
const eventAttendee = document.getElementById("event-attendee");

// Format date: "2026-03-28T09:00:00.000Z" → "March 28, 2026" 

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
});
}

//  Format time: "2026-03-28T09:00:00.000Z" → "9:00 AM" 

function formatTime(dateString) {
    const date = new Date(dateString);  
    return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
});
}

// Populate event details from localStorage 

function populateEventDetails() {
    const eventData = localStorage.getItem("selectedEvent");
    const user = getStoredUser();

    if (!eventData) {
        eventTitle.textContent = "Event details not found";
    return;
}

const event = JSON.parse(eventData);

eventTitle.textContent = event.title || "—";
eventDate.textContent = event.date ? formatDate(event.date) : "—";
eventTime.textContent = event.date ? formatTime(event.date) : "—";
eventLocation.textContent = event.location || "—";
eventTicketType.textContent = event.ticketType || "General Admission";

// Populate attendee from logged in user
if (user) {
    eventAttendee.textContent = `${user.firstName} ${user.lastName} — ${user.email}`;
}
}

// Show error message 
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

// Confirm Registration — calls backend API 
confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";
    errorMessage.style.display = "none";

    const token = getStoredToken();
    const eventData = localStorage.getItem("selectedEvent");

    if (!token) {
        window.location.href = "../pages/login.html";
    return;
}

if (!eventData) {
    showError("Event details not found. Please go back and try again.");
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm Registration";
    return;
}

const event = JSON.parse(eventData);

try {
    const response = await fetch(`${BASE_URL}/event/${event_id}/register`, {
    method: "POST",
    
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${token}"
}
});

const data = await response.json();

if (!response.ok) {
  showError(data.message || "Registration failed. Please try again.");
  confirmBtn.disabled    = false;
  confirmBtn.textContent = "Confirm Registration";
  return;
}

// Save confirmation data for the success screen
localStorage.setItem('eventpro_selected_event', JSON.stringify(eventData));

// Navigate to success screen

window.location.href = "../pages/registration-success.html";

} catch (error) {
    showError("Network error — please check your connection and try again.");
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm Registration";
}
});

// Cancel — go back to previous page 

cancelBtn.addEventListener("click", () => {
    window.history.back();
});

// Run on page load 

document.addEventListener("DOMContentLoaded", () => {
// Redirect to login if not logged in

    const token = getStoredToken();
        if (!token) {
            window.location.href = "../pages/login.html";
            return;
}

populateEventDetails();
});
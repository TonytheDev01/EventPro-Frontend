document.addEventListener("DOMContentLoaded", () => {
  // ── Guard — redirect if not logged in ─────────
  requireAuth();

  // ── Populate avatar with user initials ─────────
  const user = getStoredUser();
  const avatarEl = document.getElementById("userAvatar");
  if (user && avatarEl) {
    const initials = `${user.firstName?.charAt(0) || ""}${
      user.lastName?.charAt(0) || ""
    }`; // Fix: wrapped in backticks to make it a valid template literal
    avatarEl.textContent = initials.toUpperCase();
  }

  // ── Hamburger menu ─────────────────────────────
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }

  // ── Back button ────────────────────────────────
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  // ── Form elements ──────────────────────────────
  const form = document.getElementById("eventForm");
  const submitBtn = document.getElementById("submitBtn");
  const errorMessage = document.getElementById("errorMessage");

  // ── Show / hide error ──────────────────────────
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }

  function hideError() {
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
  }

  // ── Form submit ────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const token = getStoredToken();

    // Collect field values
    const eventName = document.getElementById("eventName").value.trim();
    const eventDate = document.getElementById("eventDate").value;
    const eventTime = document.getElementById("eventTime").value;
    const eventLocation = document.getElementById("eventLocation").value.trim();
    const streetAddress = document.getElementById("streetAddress").value.trim();
    const city = document.getElementById("city").value.trim();
    const countryState = document.getElementById("countryState").value.trim();
    const eventRegion = document.getElementById("eventRegion").value;
    const eventCategory = document.getElementById("eventCategory").value;
    const description = document
      .getElementById("eventDescription")
      .value.trim();

    // Basic validation
    if (
      !eventName ||
      !eventDate ||
      !eventTime ||
      !eventLocation ||
      !city ||
      !countryState ||
      !eventRegion ||
      !eventCategory
    ) {
      showError("*Error: Please fill all required fields*");
      return;
    }

    // Combine date and time into ISO string
    const combinedDateTime = new Date(
      `${eventDate}T${eventTime}`
    ).toISOString();

    // Build payload
    const payload = {
      title: eventName,
      date: combinedDateTime,
      location: `${eventLocation}, ${streetAddress}, ${city}, ${countryState}`,
      region: eventRegion,
      category: eventCategory,
      description,
    };

    // Loading state
    submitBtn.textContent = "Creating event...";
    submitBtn.disabled = true;

    try {
      const response = await fetch(
        "https://eventpro-fxfv.onrender.com/api/events",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showError(
          data.message || "*Error: Could not create event. Please try again.*"
        );
        submitBtn.textContent = "Create Event";
        submitBtn.disabled = false;
        return;
      }

      // Store created event for next screen
      localStorage.setItem("eventpro_created_event", JSON.stringify(data));

      // Redirect to organizer dashboard
      window.location.href = "../pages/organizer-dashboard.html";
    } catch (err) {
      showError(
        "*Network error — please check your connection and try again.*"
      );
      submitBtn.textContent = "Create Event";
      submitBtn.disabled = false;
    }
  });
});

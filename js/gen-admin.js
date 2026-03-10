const registerBtn = document.getElementById("registerBtn");
const shareBtn = document.getElementById("shareBtn");
const saveBtn = document.getElementById("saveBtn");

const token = getStoredToken();
const eventId = new URLSearchParams(window.location.search).get("eventId");

// ── Register ──────────────────────────────────
if (registerBtn) {
  registerBtn.addEventListener("click", async function () {
    if (!token) {
      window.location.href = "../pages/login.html";
      return;
    }

    registerBtn.textContent = "Registering...";
    registerBtn.disabled = true;

    try {
      const response = await fetch(
        `https://eventpro-api.onrender.com/api/events/${eventId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        window.location.href = `../pages/youre-all-set.html?eventId=${eventId}`;
      } else {
        registerBtn.textContent = "Register Now";
        registerBtn.disabled = false;
        console.error("Registration failed:", data.message);
      }
    } catch (err) {
      registerBtn.textContent = "Register Now";
      registerBtn.disabled = false;
      console.error("Network error:", err);
    }
  });
}

// ── Share ─────────────────────────────────────
if (shareBtn) {
  shareBtn.addEventListener("click", async function () {
    const shareData = {
      title: "General Admission — EventPro",
      text: "Check out this event on EventPro!",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share cancelled:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        shareBtn.textContent = "Link copied!";
        setTimeout(() => {
          shareBtn.textContent = "Share";
        }, 2000);
      });
    }
  });
}

// ── Save / Unsave ─────────────────────────────
let isSaved = false;

if (saveBtn) {
  saveBtn.addEventListener("click", async function () {
    if (!token) {
      window.location.href = "../pages/login.html";
      return;
    }

    isSaved = !isSaved;

    saveBtn.textContent = isSaved ? "Saved" : "Save";
    saveBtn.classList.toggle("saved");

    try {
      await fetch(
        `https://eventpro-api.onrender.com/api/events/${eventId}/save`,
        {
          method: isSaved ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.error("Save action failed:", err);
    }
  });
}

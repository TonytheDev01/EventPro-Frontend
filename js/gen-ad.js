document.addEventListener("DOMContentLoaded", () => {
  const registerBtn = document.getElementById("register-btn");
  const shareBtn = document.getElementById("share-btn");
  const saveBtn = document.getElementById("save-btn");
  const saveLabel = document.getElementById("save-label");

  const token = typeof getStoredToken === "function" ? getStoredToken() : null;

  const eventId = new URLSearchParams(window.location.search).get("eventId");

  /* ---------- SVG STRINGS (VALID JS) ---------- */

  const iconUnsaved = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 21C12 21 4 13 4 8A5 5 0 0112 5a5 5 0 018 3c0 5-8 13-8 13z"
  stroke="black" stroke-width="2"/>
  </svg>`;

  const iconSaved = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 21C12 21 4 13 4 8A5 5 0 0112 5a5 5 0 018 3c0 5-8 13-8 13z"
  stroke="#F97316" stroke-width="2"/>
  </svg>`;

  /* ---------- REGISTER ---------- */

  registerBtn?.addEventListener("click", async () => {
    if (!token) {
      window.location.href = "../pages/login.html";
      return;
    }

    registerBtn.textContent = "Registering...";
    registerBtn.disabled = true;

    try {
      const res = await fetch(
        `https://eventpro-api.onrender.com/api/events/${eventId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        window.location.href = `../pages/youre-all-set.html?eventId=${eventId}`;
      } else {
        throw new Error();
      }
    } catch {
      registerBtn.textContent = "Register Now";
      registerBtn.disabled = false;
    }
  });

  /* ---------- SHARE ---------- */

  shareBtn?.addEventListener("click", async () => {
    const data = {
      title: "EventPro",
      text: "Check out this event!",
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(data.url);
      shareBtn.textContent = "Copied!";
      setTimeout(() => (shareBtn.textContent = "Share"), 2000);
    }
  });

  /* ---------- SAVE ---------- */

  let isSaved = false;

  saveBtn?.addEventListener("click", async () => {
    if (!token) {
      window.location.href = "../pages/login.html";
      return;
    }

    isSaved = !isSaved;

    saveBtn.querySelector("svg").outerHTML = isSaved ? iconSaved : iconUnsaved;

    saveLabel.textContent = isSaved ? "Saved" : "Save";
    saveBtn.classList.toggle("saved", isSaved);

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
    } catch {}
  });
});

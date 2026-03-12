document.addEventListener("DOMContentLoaded", () => {
  /* ===============================
     HAMBURGER MENU
  =============================== */
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }

  /* ===============================
     BACK BUTTON
  =============================== */
  const backBtn = document.getElementById("backBtn");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  /* ===============================
     FORM VALIDATION
  =============================== */
  const form = document.getElementById("event-form");
  const error = document.getElementById("error");

  if (form && error) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const inputs = form.querySelectorAll("input[required]");
      let valid = true;

      inputs.forEach((input) => {
        if (!input.value.trim()) {
          valid = false;
        }
      });

      if (!valid) {
        error.textContent = "*Error: Please fill all columns*";
        return;
      }

      error.textContent = "";
      alert("Event Created Successfully ✅");
      form.reset();
    });
  }
});

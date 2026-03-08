/* || EVENTPRO THEME TOGGLE || */

document.addEventListener("DOMContentLoaded", () => {

  const toggle = document.getElementById("theme-toggle");

  if (!toggle) return;

  const savedTheme = localStorage.getItem("eventpro-theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    toggle.checked = true;
  }

  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("eventpro-theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("eventpro-theme", "light");
    }
  });

});







const registerBtn = document.getElementById("registerBtn");
registerBtn.addEventListener("click", () => {
  alert("Registration started!");
});

const shareBtn = document.getElementById("shareBtn");
shareBtn.addEventListener("click", () => {
  alert("Share this event with your friends");
});

const saveBtn = document.getElementById("saveBtn");
saveBtn.addEventListener("click", () => {
  saveBtn.classList.toggle("saved");

  if (saveBtn.classList.contains("saved")) {
    saveBtn.innerHTML = `<i class="fa-solid fa-heart></i> Saved`;
  } else {
    saveBtn.innerHTML = `<i class="fa-regular fa-heart></i> Save`;
  }
});

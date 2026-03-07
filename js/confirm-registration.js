document.addEventListener("DOMContentLoaded", function(){

const confirmButton = document.getElementById("confirmBtn");

confirmButton.addEventListener("click", function(){

    confirmButton.disabled = true;
    confirmButton.textContent = "Processing...";

    window.location.href = "confirmation.html";

});

const cancelButton = document.getElementById ("cancelBtn");

cancelButton.addEventListener("click", function(){
    const form = document.querySelector(".event-box");
    form.reset();

    window.history.back();
})

});
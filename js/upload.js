const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const uploadList = document.getElementById("uploadList");
const dropZone = document.getElementById("dropZone");

uploadBtn.addEventListener("click", () => fileInput.click());

dragLink.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", handleFiles);

dropZone.addEventListener("dragover", (e) =>{
e.preventDefault();
dropZone.style.borderColor = "#7c3aed";
});

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragleave", ()=>{
dropZone.style.borderColor = "#ccc";
});

function handleFiles(event){

const files = event.target.files;

[...files].forEach(file => {

createUploadItem(file);

});

}


function createUploadItem(file){

const item = document.createElement("div");
item.className = "upload-item";

item.innerHTML = `
<div class="file-info">
<span>${file.name}</span>
<span class="status">Uploading...</span>
</div>

<div class="progress-bar">
<div class="progress"></div>
</div>
`;

uploadList.appendChild(item);

const progress = item.querySelector(".progress");
const status = item.querySelector(".status");

let percent = 0;

const interval = setInterval(()=>{

percent += Math.random()*15;

if(percent >= 100){

percent = 100;
clearInterval(interval);

item.classList.add("completed");
status.textContent = "Completed";

}

progress.style.width = percent + "%";

},400);

}
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const uploadList = document.getElementById("uploadList");
const dropZone = document.getElementById("dropZone");

uploadBtn.addEventListener("click", () => fileInput.click());

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


function formatSize(bytes){

  const mb = bytes / (1024 * 1024);

  if(mb < 1){
  return (bytes / 1024).toFixed(1) + " KB";
}

return mb.toFixed(2) + " MB";

}

function createUploadItem(file){

const item = document.createElement("div");
item.className = "upload-item";

item.innerHTML = `
<div class="upload-top">

<div class="file-left">
<i class="fa-solid fa-file file-icon"></i>

<div class="file-text">
<strong>${file.name}</strong>
<small class="file-size">0 MB / ${formatSize(file.size)}</small>
</div>

</div>

<div class="file-action">
<i class="fa-solid fa-xmark cancel"></i>
</div>

</div>

<div class="progress-bar">
<div class="progress"></div>
</div>

<div class="upload-status">
<span class="status">Uploading...</span>
<span class="percent">0%</span>
</div>
`;

uploadList.appendChild(item);

const progress = item.querySelector(".progress");
const percentText = item.querySelector(".percent");
const sizeText = item.querySelector(".file-size");
const status = item.querySelector(".status");
const cancelBtn = item.querySelector(".cancel");
const action = item.querySelector(".file-action");

let percent = 0;

const interval = setInterval(()=>{

percent += Math.random()*12;

if(percent >= 100){

percent = 100;
clearInterval(interval);

item.classList.add("completed");

status.textContent = "Completed";

item.querySelector(".progress-bar").style.display = "none";

percentText.style.display = "none";

action.innerHTML = `<i class="fa-solid fa-trash delete"></i>`;

const deleteBtn = action.querySelector(".delete");

deleteBtn.addEventListener("click",()=>{
item.remove();
});

}

progress.style.width = percent + "%";

percentText.textContent = Math.floor(percent) + "%";

const uploaded = (file.size * percent) / 100;

sizeText.textContent = `${formatSize(uploaded)} / ${formatSize(file.size)}`;

},400);

cancelBtn.addEventListener("click",()=>{

clearInterval(interval);

item.remove();

});

}
const tableBody = document.querySelector("#usersTable tbody");
const searchInput = document.getElementById("searchInput");
const roleFilter = document.getElementById("roleFilter");
const addBtn = document.getElementById("addOrganizerBtn");
const nextBtn = document.querySelector(".next-btn");

let rows = Array.from(tableBody.querySelectorAll("tr"));



/* -------------------
ADD ORGANIZER
------------------- */

addBtn.addEventListener("click", () => {

const name = prompt("Enter organizer name");
const email = prompt("Enter email");
const role = prompt("Enter role (Admin / Organizer / Viewer)");

if(!name || !email || !role) return;

const newRow = document.createElement("tr");

newRow.innerHTML = `
<td><img src="images/user1.jpg" class="avatar"></td>
<td class="name">${name}</td>
<td class="email">${email}</td>
<td class="role">${role}</td>
<td><span class="status active">Active</span></td>
<td>
<button class="edit">Edit</button>
<button class="delete">Delete</button>
</td>
`;

tableBody.appendChild(newRow);

rows = Array.from(tableBody.querySelectorAll("tr"));

});



/* -------------------
DELETE USER
------------------- */

document.addEventListener("click", function(e){

if(e.target.classList.contains("delete")){

if(confirm("Delete this user?")){

const row = e.target.closest("tr");
row.remove();

rows = Array.from(tableBody.querySelectorAll("tr"));

}

}

});



/* -------------------
EDIT USER
------------------- */

document.addEventListener("click", function(e){

if(e.target.classList.contains("edit")){

const row = e.target.closest("tr");

const nameCell = row.querySelector(".name");
const emailCell = row.querySelector(".email");
const roleCell = row.querySelector(".role");

const name = nameCell.textContent;
const email = emailCell.textContent;
const role = roleCell.textContent;

nameCell.innerHTML = `<input type="text" value="${name}">`;
emailCell.innerHTML = `<input type="text" value="${email}">`;

roleCell.innerHTML = `
<select>
<option ${role==="Admin"?"selected":""}>Admin</option>
<option ${role==="Organizer"?"selected":""}>Organizer</option>
<option ${role==="Viewer"?"selected":""}>Viewer</option>
</select>
`;

e.target.textContent = "Save";
e.target.classList.remove("edit");
e.target.classList.add("save");

}

});



/* -------------------
SAVE EDIT
------------------- */

document.addEventListener("click", function(e){

if(e.target.classList.contains("save")){

const row = e.target.closest("tr");

const nameInput = row.querySelector(".name input");
const emailInput = row.querySelector(".email input");
const roleInput = row.querySelector(".role select");

row.querySelector(".name").textContent = nameInput.value;
row.querySelector(".email").textContent = emailInput.value;
row.querySelector(".role").textContent = roleInput.value;

e.target.textContent = "Edit";
e.target.classList.remove("save");
e.target.classList.add("edit");

}

});



/* -------------------
SEARCH USERS
------------------- */

searchInput.addEventListener("keyup", filterTable);
roleFilter.addEventListener("change", filterTable);

function filterTable(){

const searchValue = searchInput.value.toLowerCase();
const roleValue = roleFilter.value;

rows.forEach(row=>{

const name = row.querySelector(".name").textContent.toLowerCase();
const email = row.querySelector(".email").textContent.toLowerCase();
const role = row.querySelector(".role").textContent;

const matchSearch =
name.includes(searchValue) || email.includes(searchValue);

const matchRole =
roleValue === "all" || role === roleValue;

row.style.display = matchSearch && matchRole ? "" : "none";

});

}



/* -------------------
PAGINATION
------------------- */

const rowsPerPage = 3;
let currentPage = 1;

function showPage(page){

rows = Array.from(tableBody.querySelectorAll("tr"));

const start = (page-1) * rowsPerPage;
const end = start + rowsPerPage;

rows.forEach((row,index)=>{

row.style.display =
(index >= start && index < end) ? "" : "none";

});

}

showPage(currentPage);

nextBtn.addEventListener("click", ()=>{

const totalPages = Math.ceil(rows.length / rowsPerPage);

if(currentPage < totalPages){

currentPage++;
showPage(currentPage);

}

});

// =============================================
//  IMAGE UPLOAD
// =============================================

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    document.getElementById('uploadLabel').textContent = file.name;
  }
}

// =============================================
//  FORM SUBMIT
// =============================================

function handleSubmit(event) {
  event.preventDefault();

  const firstName     = document.getElementById('firstName').value.trim();
  const lastName      = document.getElementById('lastName').value.trim();
  const email         = document.getElementById('email').value.trim();
  const eventName     = document.getElementById('eventName').value.trim();
  const eventDate     = document.getElementById('eventDate').value;
  const eventTime     = document.getElementById('eventTime').value;
  const eventLocation = document.getElementById('eventLocation').value.trim();
  const streetAddress = document.getElementById('streetAddress').value.trim();
  const city          = document.getElementById('city').value.trim();
  const countryState  = document.getElementById('countryState').value.trim();
  const eventRegion   = document.getElementById('eventRegion').value;
  const eventCategory = document.getElementById('eventCategory').value;

  if (!firstName || !lastName || !email || !eventName) {
    alert('Please fill in your personal details.');
    return;
  }

  if (!email.includes('@')) {
    alert('Please enter a valid email address.');
    return;
  }

  if (!eventDate || !eventTime) {
    alert('Please provide the event date and time.');
    return;
  }

  if (!eventLocation || !streetAddress || !city || !countryState) {
    alert('Please fill in all location fields.');
    return;
  }

  if (!eventRegion || !eventCategory) {
    alert('Please select event region and category.');
    return;
  }

  alert('Your event has been created successfully! 🎉');
}
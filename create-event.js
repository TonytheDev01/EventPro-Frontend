// =============================================
//  STEP MANAGEMENT
// =============================================

let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
  // Hide all steps
  for (let i = 1; i <= totalSteps; i++) {
    document.getElementById('step' + i).classList.add('hidden');
  }

  // Show current step
  document.getElementById('step' + step).classList.remove('hidden');

  // Show back arrow only from step 2 onwards
  const backArrow = document.getElementById('backArrow');
  if (step > 1) {
    backArrow.classList.add('visible');
  } else {
    backArrow.classList.remove('visible');
  }
}

function nextStep() {
  if (!validateStep(currentStep)) return;

  if (currentStep < totalSteps) {
    currentStep++;
    showStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
}

// =============================================
//  VALIDATION
// =============================================

function validateStep(step) {
  if (step === 1) {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName  = document.getElementById('lastName').value.trim();
    const email     = document.getElementById('email').value.trim();
    const eventName = document.getElementById('eventName').value.trim();

    if (!firstName || !lastName || !email || !eventName) {
      alert('Please fill in all fields before proceeding.');
      return false;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email address.');
      return false;
    }
  }

  if (step === 2) {
    const eventDate     = document.getElementById('eventDate').value.trim();
    const eventTime     = document.getElementById('eventTime').value.trim();
    const eventLocation = document.getElementById('eventLocation').value.trim();
    const streetAddress = document.getElementById('streetAddress').value.trim();

    if (!eventDate || !eventTime || !eventLocation || !streetAddress) {
      alert('Please fill in all fields before proceeding.');
      return false;
    }
  }

  if (step === 3) {
    const city          = document.getElementById('city').value.trim();
    const countryState  = document.getElementById('countryState').value.trim();
    const eventRegion   = document.getElementById('eventRegion').value;
    const eventCategory = document.getElementById('eventCategory').value;

    if (!city || !countryState || !eventRegion || !eventCategory) {
      alert('Please fill in all fields before proceeding.');
      return false;
    }
  }

  return true;
}

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

function handleSubmit() {
  const others = document.getElementById('others').value.trim();

  if (!others) {
    alert('Please include additional event details before submitting.');
    return;
  }

  alert('Your event has been created successfully! 🎉');
}
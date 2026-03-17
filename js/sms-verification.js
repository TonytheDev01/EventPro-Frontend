document.addEventListener('DOMContentLoaded', () => {
  const inputs = document.querySelectorAll('.otp-input');
  const form = document.getElementById('verificationForm');
  const errorMessage = document.getElementById('errorMessage');
  const resendBtn = document.getElementById('resendBtn');
  const countdownEl = document.getElementById('countdown');

  let countdown = 30;
  let timer;

    // Example: get phone from previous page / backend / storage
    const userPhone = sessionStorage.getItem('userPhone'); 
    // fallback for testing
    // const userPhone = "+15661237665";

    //Mask function
    function maskPhone(phone) {
    if (!phone) return '';

    const visibleStart = phone.slice(0, 4);
    const visibleEnd = phone.slice(-2);
    const maskedSection = '*'.repeat(phone.length - 6);

    return `${visibleStart}${maskedSection}${visibleEnd}`;
    }

    // Inject masked phone into UI
    const maskedPhoneEl = document.getElementById('maskedPhone');

    if (userPhone) {
    maskedPhoneEl.textContent = maskPhone(userPhone);
    } else {
    maskedPhoneEl.textContent = 'Phone not available';
    }

  // Auto move between inputs
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value;

      if (!/^\d$/.test(value)) {
        e.target.value = '';
        return;
      }

      if (index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });
  });

  // Get full OTP
  function getOTP() {
    return Array.from(inputs).map(input => input.value).join('');
  }

  // Timer logic
  function startTimer() {
    clearInterval(timer); 

    timer = setInterval(() => {
      countdown--;

      const seconds = countdown.toString().padStart(2, '0');
      countdownEl.textContent = `00:${seconds}`;

      if (countdown <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        countdownEl.textContent = '00:00';
      }
    }, 1000);
  }

  startTimer();

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = '';

    const otp = getOTP();

    if (otp.length !== 6) {
      errorMessage.textContent = 'Please enter complete code.';
      return;
    }

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      //  success
      alert('Verification successful!');
      // window.location.href = '/dashboard';

    } catch (error) {
      errorMessage.textContent = error.message;
    }
  });

  // Resend OTP
  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    countdown = 30;
    startTimer();

    try {
      await fetch('/api/resend-otp', {
        method: 'POST'
      });

    } catch (error) {
      errorMessage.textContent = 'Failed to resend code.';
    }
  });
});
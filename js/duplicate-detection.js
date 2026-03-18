// ================================================
// EventPro — Duplicate Detection Modal
// ================================================

document.addEventListener("DOMContentLoaded", () => {
  // ── Matched fields data ─────────────────────
  // In production, this would come from the API response.
  const matchedFields = ["Event Name", "Event Date", "Location"];

  // ── Render matched fields list ──────────────
  const fieldsList = document.getElementById("matchedFieldsList");

  if (fieldsList) {
    fieldsList.innerHTML = matchedFields
      .map(
        (field) => `
          <li class="matched-fields__item">
            <span class="matched-fields__icon" aria-hidden="true">
              <svg viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path opacity="0.3" fill-rule="evenodd" clip-rule="evenodd" d="M11.9093 2.36256C12.3076 1.96485 12.8404 1.73082 13.4027 1.70667C13.965 1.68251 14.516 1.86997 14.9468 2.23206L15.0908 2.36369L17.2283 4.50006H20.2501C20.8175 4.50017 21.364 4.71468 21.78 5.10063C22.196 5.48658 22.4508 6.01546 22.4933 6.58131L22.5001 6.75006V9.77181L24.6376 11.9093C25.0356 12.3076 25.2698 12.8407 25.294 13.4032C25.3182 13.9658 25.1305 14.517 24.7681 14.9479L24.6365 15.0908L22.499 17.2283V20.2501C22.4991 20.8177 22.2848 21.3645 21.8988 21.7807C21.5128 22.1969 20.9838 22.4519 20.4177 22.4944L20.2501 22.5001H17.2295L15.092 24.6376C14.6937 25.0356 14.1606 25.2698 13.598 25.294C13.0355 25.3181 12.4843 25.1305 12.0533 24.7681L11.9105 24.6376L9.77296 22.5001H6.75009C6.18244 22.5002 5.6357 22.2859 5.21947 21.8999C4.80324 21.5139 4.54829 20.9849 4.50571 20.4188L4.50009 20.2501V17.2283L2.36259 15.0908C1.96456 14.6925 1.73034 14.1595 1.70618 13.5969C1.68201 13.0343 1.86967 12.4831 2.23209 12.0522L2.36259 11.9093L4.50009 9.77181V6.75006C4.50019 6.18261 4.71471 5.63615 5.10066 5.22016C5.4866 4.80417 6.01548 4.54937 6.58134 4.50681L6.75009 4.50006H9.77184L11.9093 2.36256Z" fill="#4CF603"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M16.9639 10.1058L12.1894 14.8803L10.2004 12.8913C9.98929 12.6804 9.70304 12.5619 9.40462 12.5621C9.10619 12.5622 8.82002 12.6808 8.60908 12.8919C8.39813 13.103 8.27968 13.3892 8.27979 13.6877C8.27989 13.9861 8.39854 14.2723 8.60964 14.4832L11.3141 17.1877C11.4291 17.3027 11.5655 17.3939 11.7157 17.4561C11.8659 17.5183 12.0268 17.5504 12.1894 17.5504C12.3519 17.5504 12.5129 17.5183 12.6631 17.4561C12.8133 17.3939 12.9497 17.3027 13.0646 17.1877L18.5546 11.6966C18.7596 11.4844 18.873 11.2002 18.8704 10.9053C18.8678 10.6103 18.7495 10.3281 18.5409 10.1195C18.3323 9.91096 18.0502 9.79264 17.7552 9.79008C17.4602 9.78752 17.1761 9.90091 16.9639 10.1058Z" fill="black"/>
              </svg>
            </span>
            <span>${field}</span>
          </li>
        `
      )
      .join("");
  }

  // ── "Different event" checkbox ──────────────
  const chkDifferent = document.getElementById("chkDifferent");
  const btnContinue = document.getElementById("btnContinue");

  // When checked, enable the Continue button clearly;
  if (chkDifferent && btnContinue) {
    chkDifferent.addEventListener("change", () => {
      if (chkDifferent.checked) {
        btnContinue.style.opacity = "1";
      } else {
        btnContinue.style.opacity = "";
      }
    });
  }

  // ── Button: Continue Creating Event ────────
  if (btnContinue) {
    btnContinue.addEventListener("click", () => {
      console.log("User chose to continue creating the event.");
    });
  }

  // ── Button: View Existing Event ────────────
  const btnViewExisting = document.getElementById("btnViewExisting");
  if (btnViewExisting) {
    btnViewExisting.addEventListener("click", () => {
      console.log("User chose to view the existing event.");
    });
  }

  // ── Button: Cancel ──────────────────────────
  const btnCancel = document.getElementById("btnCancel");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      window.history.back();
    });
  }
});

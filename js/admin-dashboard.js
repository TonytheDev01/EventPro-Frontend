document.addEventListener("DOMContentLoaded", async () => {
  // 1. Auth guard first
  requireAuth();
  // 2. Load shared sidebar + topbar
  // 'dashboard' = the tab that lights up active on the sidebar
  await loadDashboardComponents("dashboard");
  // 3. Your page logic below
  // ...
  (function () {
    "use strict";

    // --- Elements ---
    const btnPdf = document.getElementById("btn-pdf");
    const btnCsv = document.getElementById("btn-csv");

    // --- Helpers ---

    /**
     * Collects all stat rows into an array of objects.
     * Useful for generating CSV data from the live DOM.
    /** */
    function getReportData() {
      const rows = document.querySelectorAll(".stat-item");
      return Array.from(rows).map(function (row) {
        return {
          label: row.querySelector(".stat-item__label").textContent.trim(),
          value: row.querySelector(".stat-item__value").textContent.trim(),
        };
      });
    }

    /**
     * Converts an array of objects to a CSV string.
     * @param {Array<{label: string, value: string}>} data
     * @returns {string}
     */
    function toCSV(data) {
      const header = "Category,Count";
      const rows = data.map(function (item) {
        return item.label + "," + item.value;
      });
      return [header].concat(rows).join("\n");
    }

    /**
     * Triggers a file download in the browser.
     * @param {string} filename
     * @param {string} content
     * @param {string} mimeType
     */
    function downloadFile(filename, content, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // --- Button: Export CSV ---
    if (btnCsv) {
      btnCsv.addEventListener("click", function () {
        const data = getReportData();
        const csvData = toCSV(data);
        downloadFile("summary-report.csv", csvData, "text/csv");
      });
    }

    // --- Button: Download PDF ---
    // Wire this up to the PDF generation library (e.g. jsPDF).
    // For now it alerts so you know the click is working.
    if (btnPdf) {
      btnPdf.addEventListener("click", function () {
        alert("PDF download: connect your PDF library here (e.g. jsPDF).");
      });
    }
  })();
});

document.addEventListener('DOMContentLoaded', async () => { 
// 1. Redirect if not logged in 
requireAuth(); 
// 2. Load sidebar + topbar — ALWAYS before anything else 
await loadDashboardComponents('YOUR_PAGE_KEY'); 
// 3. Your page logic below... 
});
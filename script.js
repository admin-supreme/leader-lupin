const form = document.getElementById("adminForm");
const errorMsg = document.getElementById("errorMsg");
const BASE_URL = "https://worker-admin-logger.neonasmin.workers.dev";


form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const realName = document.getElementById("realName").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  errorMsg.textContent = "Logging in...";

  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, real_name: realName, password })
  });

  if (!res.ok) {
    errorMsg.textContent = "Invalid credentials.";
    return;
  }

  window.location.href = "panelpage/panel.html";
});
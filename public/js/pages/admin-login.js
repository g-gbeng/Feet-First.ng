/* =========================================
   ADMIN LOGIN
========================================= */

const form = document.getElementById("adminLoginForm");
const errorMsg = document.getElementById("errorMsg");
const button = document.getElementById("loginBtn");

wirePasswordToggles();

// already logged in
api("/api/admin/me").then(() => location.replace("admin.html")).catch(() => {});

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    errorMsg.hidden = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        errorMsg.textContent = "Enter your email and password.";
        errorMsg.hidden = false;
        return;
    }

    setBusy(button, true, "Logging in...");

    try {

        await api("/api/admin/login", { method: "POST", body: { email, password } });

        location.href = "admin.html";

    } catch (err) {

        setBusy(button, false);

        errorMsg.textContent = err.message;
        errorMsg.hidden = false;

    }

});

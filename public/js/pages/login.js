/* =========================================
   LOGIN
========================================= */

const form = document.getElementById("loginForm");
const button = document.getElementById("loginBtn");
const notice = document.getElementById("formNotice");

// where to go after logging in (e.g. back to the page that sent them here)
const next = safeNext(new URLSearchParams(location.search).get("next"));

document.getElementById("signupLink").href = `Create-an-account.html?next=${encodeURIComponent(next)}`;

wirePasswordToggles();

// already logged in: straight to the shop
api("/api/users/me").then(() => location.replace(next)).catch(() => {});

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    notice.hidden = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const errors = {};
    if (!email) errors.email = "Please enter your email.";
    if (!password) errors.password = "Please enter your password.";

    showFieldErrors(form, errors);

    if (Object.keys(errors).length) return;

    setBusy(button, true, "Logging in...");

    try {

        await api("/api/users/login", { method: "POST", body: { email, password } });

        location.href = next;

    } catch (err) {

        setBusy(button, false);

        notice.textContent = err.message;
        notice.hidden = false;

        document.getElementById("password").select();

    }

});

/* =========================================
   SIGN-UP
   A new account is logged in straight away.
========================================= */

const form = document.getElementById("signupForm");
const button = document.getElementById("signupBtn");
const notice = document.getElementById("formNotice");

const next = safeNext(new URLSearchParams(location.search).get("next"));

document.getElementById("loginLink").href = `login.html?next=${encodeURIComponent(next)}`;

const PASSWORD_RULE = /^(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/;

wirePasswordToggles();

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    notice.hidden = true;

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const errors = {};
    if (!name) errors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Please enter a valid email address.";
    if (!PASSWORD_RULE.test(password)) errors.password = "Password must be at least 8 characters and include a number and a special character.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";

    showFieldErrors(form, errors);

    if (Object.keys(errors).length) return;

    setBusy(button, true, "Creating your account...");

    try {

        await api("/api/users/register", { method: "POST", body: { name, email, password } });

        location.href = next;

    } catch (err) {

        setBusy(button, false);

        if (err.data && err.data.errors) {
            showFieldErrors(form, err.data.errors);
        } else {
            notice.textContent = err.message;
            notice.hidden = false;
        }

    }

});

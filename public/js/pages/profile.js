/* =========================================
   PROFILE
========================================= */

const profileForm = document.getElementById("profileForm");
const passwordForm = document.getElementById("passwordForm");

function showUser(user) {
    document.getElementById("displayName").textContent = user.name;
    document.getElementById("displayEmail").textContent = user.email;
    document.getElementById("profileAvatar").textContent = initials(user.name);
    document.getElementById("fullName").value = user.name;
    document.getElementById("email").value = user.email;
}

profileForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const notice = document.getElementById("profileNotice");
    const button = document.getElementById("saveProfileBtn");
    const name = document.getElementById("fullName").value.trim();

    notice.hidden = true;

    if (!name) {
        showFieldErrors(profileForm, { fullName: "Please enter your name." });
        return;
    }

    showFieldErrors(profileForm, {});

    setBusy(button, true, "Saving...");

    try {

        const data = await api("/api/users/profile", { method: "PUT", body: { name } });

        Shop.user = data.user;

        showUser(data.user);

        // the side menu shows the name too
        document.querySelector(".sideMenu .head strong").textContent = data.user.name;
        document.querySelector(".sideMenu .head .avatar").textContent = initials(data.user.name);

        notice.textContent = "Your name has been updated.";
        notice.hidden = false;

    } catch (err) {

        showFieldErrors(profileForm, { fullName: err.message });

    } finally {

        setBusy(button, false);

    }

});

passwordForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const notice = document.getElementById("passwordNotice");
    const button = document.getElementById("savePasswordBtn");
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;

    notice.hidden = true;
    notice.classList.remove("ok");

    const errors = {};
    if (!currentPassword) errors.currentPassword = "Enter your current password.";
    if (!/^(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/.test(newPassword)) errors.newPassword = "At least 8 characters, with a number and a symbol.";

    showFieldErrors(passwordForm, errors);

    if (Object.keys(errors).length) return;

    setBusy(button, true, "Saving...");

    try {

        await api("/api/users/password", { method: "PUT", body: { currentPassword, newPassword } });

        passwordForm.reset();

        notice.textContent = "Password changed.";
        notice.classList.add("ok");
        notice.hidden = false;

    } catch (err) {

        if (err.data && err.data.errors) showFieldErrors(passwordForm, err.data.errors);
        else {
            notice.textContent = err.message;
            notice.hidden = false;
        }

    } finally {

        setBusy(button, false);

    }

});

document.getElementById("profileLogout").addEventListener("click", () => Shop.logout());

wirePasswordToggles();

Shop.start().then(showUser);

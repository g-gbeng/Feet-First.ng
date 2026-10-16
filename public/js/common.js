/* =========================================
   FEET-FIRST.NG
   SHARED HELPERS (loaded on every page)
========================================= */

/*
  Calls the API and returns its JSON.
  Throws an Error with the server's message when the request fails,
  with .status and .data attached (e.g. for field errors).
*/
async function api(path, { method = "GET", body } = {}) {

    let response;

    try {
        response = await fetch(path, {
            method,
            credentials: "same-origin",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });
    } catch {
        throw Object.assign(new Error("Can't reach the server. Check your connection and try again."), { status: 0 });
    }

    let data = null;

    try {
        data = await response.json();
    } catch {
        /* not JSON */
    }

    if (!response.ok || (data && data.success === false)) {
        const err = new Error((data && data.message) || "Something went wrong. Please try again.");
        err.status = response.status;
        err.data = data;
        throw err;
    }

    return data;

}

/* Makes text safe to put inside HTML (names, addresses, notes...) */
function esc(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

/* Image paths from the database contain spaces ("/images/AF1-Mid QS.png") */
function imgSrc(path) {
    return esc(encodeURI(path || "/images/IMG_9581.JPG"));
}

function money(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
}

function formatDate(date, withTime = false) {

    if (!date) return "";

    const options = { day: "numeric", month: "short", year: "numeric" };

    if (withTime) Object.assign(options, { hour: "numeric", minute: "2-digit" });

    return new Date(date).toLocaleString("en-NG", options);

}

function initials(name) {
    return String(name || "U").trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "U";
}

/* Line icons (drawn inline so no icon font has to download) */
const ICONS = {
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'
};

function icon(name, label) {
    const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
    return `<svg class="icon" viewBox="0 0 24 24" ${a11y}>${ICONS[name] || ""}</svg>`;
}

/* Short message at the bottom. type: "success" | "error". link: { href, text } */
function toast(message, type = "success", link) {

    let box = document.getElementById("ffToast");

    if (!box) {
        box = document.createElement("div");
        box.id = "ffToast";
        box.className = "ff-toast";
        box.setAttribute("role", "status");
        box.setAttribute("aria-live", "polite");
        document.body.appendChild(box);
    }

    box.innerHTML = `<span>${esc(message)}</span>${link ? `<a href="${esc(link.href)}">${esc(link.text)}</a>` : ""}`;
    box.dataset.type = type;
    box.classList.add("show");

    clearTimeout(box._timer);

    box._timer = setTimeout(() => box.classList.remove("show"), type === "error" ? 5000 : 2800);

}

/* Shows a button as busy while an action runs */
function setBusy(button, busy, busyText) {

    if (!button) return;

    if (busy) {
        button.dataset.label = button.dataset.label || button.innerHTML;
        button.textContent = busyText || "Please wait...";
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
    } else {
        if (button.dataset.label) button.innerHTML = button.dataset.label;
        delete button.dataset.label;
        button.disabled = false;
        button.removeAttribute("aria-busy");
    }

}

/*
  Field errors under inputs: each input with id X has <small class="fieldError" id="XError">.
  errors: { fieldId: "message" }
*/
function showFieldErrors(form, errors = {}) {

    form.querySelectorAll(".fieldError").forEach((el) => { el.textContent = ""; });

    form.querySelectorAll(".hasError").forEach((el) => el.classList.remove("hasError"));

    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));

    let first = null;

    Object.entries(errors).forEach(([id, message]) => {

        const input = form.querySelector(`#${CSS.escape(id)}`);

        const slot = form.querySelector(`#${CSS.escape(id)}Error`);

        if (slot) slot.textContent = message;

        if (input) {
            input.setAttribute("aria-invalid", "true");
            (input.closest(".field") || input).classList.add("hasError");
            first = first || input;
        }

    });

    if (first) first.focus();

}

/* Typing in a field clears its error message */
document.addEventListener("input", (e) => {

    const wrap = e.target.closest && e.target.closest(".hasError");

    if (!wrap) return;

    wrap.classList.remove("hasError");

    e.target.removeAttribute("aria-invalid");

    const slot = document.getElementById(`${e.target.id}Error`);

    if (slot) slot.textContent = "";

});

/* Password show/hide buttons: <button class="togglePassword" data-for="inputId"> */
function wirePasswordToggles(root = document) {

    root.querySelectorAll(".togglePassword").forEach((button) => {

        const input = document.getElementById(button.dataset.for);

        const sync = () => {
            const shown = input.type === "text";
            button.innerHTML = icon(shown ? "eyeOff" : "eye");
            button.setAttribute("aria-label", shown ? "Hide password" : "Show password");
            button.setAttribute("aria-pressed", String(shown));
        };

        button.addEventListener("click", () => {
            input.type = input.type === "password" ? "text" : "password";
            sync();
            input.focus();
        });

        sync();

    });

}

/* Only allow redirects to pages on this site (e.g. login.html?next=cart.html) */
function safeNext(value, fallback = "dashboard.html") {
    return /^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9=&%_.-]*)?$/.test(value || "") ? value : fallback;
}

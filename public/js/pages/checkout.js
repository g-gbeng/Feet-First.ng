/* =========================================
   CHECKOUT
   The server works out the total from the cart
   and the shop's prices, then sends the customer
   to Paystack to pay.
========================================= */

const form = document.getElementById("checkoutForm");
const summary = document.getElementById("orderSummary");
const totalEl = document.getElementById("orderTotal");
const payBtn = document.getElementById("payBtn");
const notice = document.getElementById("formNotice");

const DETAILS_KEY = "ff_delivery";

const field = (id) => document.getElementById(id);

let cart = null;

function renderSummary() {

    if (!cart.items.length) {

        summary.innerHTML = `<div class="emptyState py-4"><p>Your cart is empty.</p><a href="dashboard.html" class="btn btn-gold btn-sm">Start shopping</a></div>`;

        totalEl.textContent = money(0);

        payBtn.disabled = true;

        return;

    }

    summary.innerHTML = cart.items.map((item) => `
        <div class="summaryItem">
            <img src="${imgSrc(item.image)}" alt="" width="56" height="46" loading="lazy">
            <div>${esc(item.name)}<small>Size ${esc(item.size)} × ${item.quantity}${item.available ? "" : " · no longer available"}</small></div>
            <strong>${item.available ? money(item.price * item.quantity) : "—"}</strong>
        </div>
    `).join("");

    totalEl.textContent = money(cart.subtotal);

    const blocked = cart.items.some((i) => !i.available);

    payBtn.disabled = blocked;

    payBtn.textContent = `Pay ${money(cart.subtotal)}`;

    if (blocked) {
        notice.textContent = "Some items in your cart are no longer available. Remove them from your cart to continue.";
        notice.hidden = false;
    }

}

/* remember delivery details on this device for next time (not the email: that's on the account) */
function rememberDetails(details) {
    try {
        localStorage.setItem(DETAILS_KEY, JSON.stringify({ name: details.name, phone: details.phone, address: details.address }));
    } catch {
        /* storage unavailable */
    }
}

function fillDetails(user) {

    let saved = {};

    try {
        saved = JSON.parse(localStorage.getItem(DETAILS_KEY) || "{}");
    } catch {
        /* nothing saved */
    }

    field("name").value = saved.name || user.name || "";
    field("phone").value = saved.phone || "";
    field("address").value = saved.address || "";
    field("email").value = user.email || "";

}

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    notice.hidden = true;

    const details = {
        name: field("name").value.trim(),
        phone: field("phone").value.trim(),
        email: field("email").value.trim(),
        address: field("address").value.trim(),
        note: field("note").value.trim()
    };

    // quick checks here; the server checks everything again
    const errors = {};
    if (!details.name) errors.name = "Enter your full name.";
    if (details.phone.replace(/\D/g, "").length < 11) errors.phone = "Enter an 11-digit phone number, e.g. 08012345678.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email)) errors.email = "Enter a valid email address for your receipt.";
    if (details.address.length < 5) errors.address = "Enter your delivery address.";

    showFieldErrors(form, errors);

    if (Object.keys(errors).length) return;

    setBusy(payBtn, true, "Taking you to Paystack...");

    try {

        const data = await api("/api/orders/checkout", { method: "POST", body: details });

        rememberDetails(details);

        location.href = data.authorizationUrl;

    } catch (err) {

        setBusy(payBtn, false);

        if (err.data && err.data.errors) showFieldErrors(form, err.data.errors);

        notice.textContent = err.message;
        notice.hidden = false;

        notice.scrollIntoView({ behavior: "smooth", block: "center" });

    }

});

Shop.start().then(async (user) => {

    fillDetails(user);

    try {
        cart = await api("/api/cart");
        renderSummary();
    } catch (err) {
        summary.innerHTML = `<p class="text-danger">${esc(err.message)}</p>`;
    }

});

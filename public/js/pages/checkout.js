/* =========================================
   CHECKOUT
   The server works out the total from the cart,
   the shop's prices and the delivery fee for the
   chosen area, then sends the customer to
   Paystack to pay.
========================================= */

const form = document.getElementById("checkoutForm");
const summary = document.getElementById("orderSummary");
const totalEl = document.getElementById("orderTotal");
const payBtn = document.getElementById("payBtn");
const notice = document.getElementById("formNotice");

const DETAILS_KEY = "ff_delivery";

const field = (id) => document.getElementById(id);

const areaSelect = field("deliveryArea");

let cart = null;

let zones = [];
let otherArea = "Other";

/* the zone and fee for the area currently chosen, or null */
function chosenDelivery() {

    const [zoneId, area] = areaSelect.value.split("|");

    const zone = zones.find((z) => z.id === zoneId);

    return zone ? { zone, area } : null;

}

function renderAreas(savedValue) {

    areaSelect.innerHTML = `<option value="">Choose your area</option>` + zones.map((zone) => `
        <optgroup label="${esc(zone.label)} · ${money(zone.fee)}">
            ${zone.areas.map((area) => `<option value="${esc(zone.id)}|${esc(area)}">${esc(area)}</option>`).join("")}
            <option value="${esc(zone.id)}|${esc(otherArea)}">Another area (${esc(zone.label)})</option>
        </optgroup>`).join("");

    if (savedValue && [...areaSelect.options].some((o) => o.value === savedValue)) areaSelect.value = savedValue;

}

function updateTotals() {

    if (!cart) return;

    const choice = chosenDelivery();

    const fee = choice ? choice.zone.fee : 0;

    const deliveryEl = field("orderDelivery");

    field("orderSubtotal").textContent = money(cart.subtotal);

    deliveryEl.textContent = choice ? (fee ? money(fee) : "Free") : "Choose your area";
    deliveryEl.classList.toggle("pending", !choice);

    field("deliveryLabel").textContent = choice ? `Delivery to ${choice.area === otherArea ? choice.zone.label : choice.area}` : "Delivery";

    field("deliveryFeeHint").textContent = choice
        ? `${choice.zone.label}: ${fee ? `${money(fee)} delivery` : "free delivery"}.`
        : "Choose the area in Lagos we're delivering to. The delivery fee depends on the area.";

    totalEl.textContent = money(cart.subtotal + fee);

    if (!payBtn.disabled && cart.items.length) {
        payBtn.textContent = choice ? `Pay ${money(cart.subtotal + fee)}` : "Choose your delivery area";
    }

}

areaSelect.addEventListener("change", updateTotals);

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

    const blocked = cart.items.some((i) => !i.available);

    payBtn.disabled = blocked;

    updateTotals();

    if (blocked) {
        notice.textContent = "Some items in your cart are no longer available. Remove them from your cart to continue.";
        notice.hidden = false;
    }

}

/* remember delivery details on this device for next time (not the email: that's on the account) */
function rememberDetails(details) {
    try {
        localStorage.setItem(DETAILS_KEY, JSON.stringify({ name: details.name, phone: details.phone, address: details.address, area: areaSelect.value }));
    } catch {
        /* storage unavailable */
    }
}

function savedDetails() {

    let saved = {};

    try {
        saved = JSON.parse(localStorage.getItem(DETAILS_KEY) || "{}");
    } catch {
        /* nothing saved */
    }

    return saved;

}

function fillDetails(user) {

    const saved = savedDetails();

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

    const choice = chosenDelivery();

    if (choice) {
        details.deliveryZone = choice.zone.id;
        details.deliveryArea = choice.area;
    }

    // quick checks here; the server checks everything again
    const errors = {};
    if (!details.name) errors.name = "Enter your full name.";
    if (details.phone.replace(/\D/g, "").length < 11) errors.phone = "Enter an 11-digit phone number, e.g. 08012345678.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email)) errors.email = "Enter a valid email address for your receipt.";
    if (!choice) errors.deliveryArea = "Choose your delivery area.";
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

        const [cartData, deliveryData] = await Promise.all([api("/api/cart"), api("/api/orders/delivery-options")]);

        zones = deliveryData.zones;
        otherArea = deliveryData.other;

        renderAreas(savedDetails().area);

        cart = cartData;

        renderSummary();

    } catch (err) {
        summary.innerHTML = `<p class="text-danger">${esc(err.message)}</p>`;
    }

});

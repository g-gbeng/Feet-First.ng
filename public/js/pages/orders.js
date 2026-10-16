/* =========================================
   MY ORDERS
========================================= */

const listEl = document.getElementById("ordersList");

let orders = [];

const STATUS_LABEL = { pending: "Processing", shipped: "On its way", completed: "Delivered", cancelled: "Cancelled" };

function progress(order) {

    const paid = order.paymentStatus === "paid";

    const steps = [
        ["Paid", paid],
        ["Shipped", order.status === "shipped" || order.status === "completed"],
        ["Delivered", order.status === "completed"]
    ];

    return `<ol class="progressSteps" aria-label="Order progress">
        ${steps.map(([label, done]) => `<li class="${done ? "done" : ""}">${label}${done ? '<span class="srOnly"> (done)</span>' : ""}</li>`).join("")}
    </ol>`;

}

function orderCard(order) {

    const paid = order.paymentStatus === "paid";
    const cancelled = order.status === "cancelled";
    const canPay = !paid && !cancelled;

    const payBadge = paid
        ? `<span class="pill paid">${order.paidOffline ? "Paid" : "✓ Paid"}</span>`
        : cancelled ? "" : `<span class="pill unpaid">Not paid</span>`;

    const rider = order.rider && (order.rider.name || order.rider.phone)
        ? `<div class="riderBox">${icon("truck")} Your rider: <strong>${esc(order.rider.name || "—")}</strong>${order.rider.phone ? ` · <a href="tel:${esc(order.rider.phone)}">${esc(order.rider.phone)}</a>` : ""}</div>`
        : "";

    return `
        <article class="orderCard ${canPay ? "needsPayment" : ""}">
            <div class="orderTop">
                <div>
                    <h2>${esc(order.orderId)}</h2>
                    <div class="when">Placed ${formatDate(order.createdAt, true)}</div>
                </div>
                <div class="badges">
                    ${payBadge}
                    <span class="pill ${esc(order.status)}">${esc(STATUS_LABEL[order.status] || order.status)}</span>
                </div>
            </div>

            ${cancelled ? "" : progress(order)}

            ${order.status === "shipped" ? rider : ""}

            <ul class="orderItems">
                ${order.items.map((item) => `
                    <li>
                        <img src="${imgSrc(item.image)}" alt="" width="52" height="42" loading="lazy">
                        <div>${esc(item.name)}<small>Size ${esc(item.size)} × ${esc(item.qty)}</small></div>
                        <span>${money(item.price * item.qty)}</span>
                    </li>`).join("")}
            </ul>

            <div class="orderBottom">
                <div class="total">Total <strong>${money(order.total)}</strong></div>
                ${canPay ? `<button type="button" class="btn btn-gold" data-pay="${esc(order._id)}">Pay ${money(order.total)} now</button>` : ""}
                ${order.address ? `<div class="address">Delivering to: ${esc(order.address)}</div>` : ""}
            </div>

            ${canPay ? `<p class="payHint">We'll start on this order as soon as it's paid.</p>` : ""}
        </article>`;

}

function render() {

    if (!orders.length) {

        listEl.innerHTML = `
            <div class="emptyState">
                ${icon("box")}
                <h2>No orders yet</h2>
                <p>When you place an order, you'll be able to follow it here.</p>
                <a href="dashboard.html" class="btn btn-gold">Start shopping</a>
            </div>`;

        return;

    }

    listEl.innerHTML = orders.map(orderCard).join("");

}

listEl.addEventListener("click", async (e) => {

    const button = e.target.closest("[data-pay]");

    if (!button) return;

    setBusy(button, true, "Taking you to Paystack...");

    try {

        const data = await api(`/api/orders/${encodeURIComponent(button.dataset.pay)}/pay`, { method: "POST" });

        location.href = data.authorizationUrl;

    } catch (err) {

        setBusy(button, false);

        toast(err.message, "error");

    }

});

Shop.start().then(async () => {

    try {
        orders = (await api("/api/orders/mine")).orders;
        render();
    } catch (err) {
        listEl.innerHTML = `<div class="emptyState"><h2>Couldn't load your orders</h2><p>${esc(err.message)}</p></div>`;
    }

});

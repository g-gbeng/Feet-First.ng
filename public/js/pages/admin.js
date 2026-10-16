/* =========================================
   ADMIN DASHBOARD
   Everything shown here is escaped with esc(),
   so customer names, addresses and notes are
   displayed as text, never run as code.
========================================= */

const ordersList = document.getElementById("ordersList");
const orderSearch = document.getElementById("orderSearch");
const groupHint = document.getElementById("groupHint");
const lastUpdated = document.getElementById("lastUpdated");
const usersTable = document.getElementById("usersTable");
const userSearch = document.getElementById("userSearch");

const shipDialog = document.getElementById("shipDialog");
const shipForm = document.getElementById("shipForm");

const GROUPS = {
    toFulfil: { hint: "Paid orders to pack and send. Mark them shipped with the rider's details, then delivered.", empty: "No paid orders waiting. 🎉" },
    unpaid: { hint: "Orders the customer hasn't paid for yet. They can pay from My Orders. Don't send these until they're paid.", empty: "No orders awaiting payment." },
    completed: { hint: "Delivered orders.", empty: "No delivered orders yet." },
    cancelled: { hint: "Cancelled orders. If a cancelled order was paid through Paystack, refund it from your Paystack dashboard.", empty: "No cancelled orders." }
};

const STATUS_LABEL = { pending: "Pending", shipped: "Shipped", completed: "Delivered", cancelled: "Cancelled" };

let data = { users: [], orders: [], stats: {} };
let group = "toFulfil";
let knownPaid = null;
const newIds = new Set();
let shipping = null;

/* ---------- loading ---------- */

async function load() {

    try {

        data = await api("/api/admin/dashboard");

        // highlight paid orders that arrived since the last refresh
        const paidIds = new Set(data.orders.filter((o) => o.paymentStatus === "paid").map((o) => o._id));

        if (knownPaid) paidIds.forEach((id) => { if (!knownPaid.has(id)) newIds.add(id); });

        knownPaid = paidIds;

        renderStats();
        renderOrders();
        renderUsers();
        renderEmailOptions();

        lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}`;

    } catch (err) {

        if (err.status === 401) {
            location.replace("admin-login.html");
            return;
        }

        lastUpdated.textContent = `Couldn't refresh: ${err.message}`;

    }

}

function renderStats() {

    const s = data.stats;

    document.getElementById("statUsers").textContent = s.users;
    document.getElementById("statToFulfil").textContent = s.toFulfil;
    document.getElementById("statUnpaid").textContent = s.unpaid;
    document.getElementById("statCompleted").textContent = s.completed;
    document.getElementById("statRevenue").textContent = money(s.revenue);

}

/* ---------- orders ---------- */

function groupOf(order) {

    if (order.status === "cancelled") return "cancelled";

    if (order.paymentStatus !== "paid") return "unpaid";

    return order.status === "completed" ? "completed" : "toFulfil";

}

const canDelete = (o) => o.paymentStatus !== "paid" || o.paidOffline;

function matches(order) {

    const q = orderSearch.value.trim().toLowerCase();

    if (!q) return true;

    return [order.orderId, order.name, order.email, order.phone, order.account?.name, order.account?.email]
        .some((v) => String(v || "").toLowerCase().includes(q));

}

function actions(o) {

    const b = [];

    const paid = o.paymentStatus === "paid";

    if (paid && o.status === "pending") b.push(`<button type="button" class="btn btn-gold" data-action="ship">${icon("truck")} Mark shipped</button>`);

    if (o.status === "shipped") {
        b.push(`<button type="button" class="btn btn-gold" data-action="deliver">${icon("check")} Mark delivered</button>`);
        b.push(`<button type="button" class="btn btn-outline-secondary" data-action="ship">Edit rider</button>`);
    }

    if (o.status === "cancelled" && paid) b.push(`<button type="button" class="btn btn-outline-secondary" data-action="reopen">Reopen</button>`);

    if (o.status !== "cancelled" && o.status !== "completed") b.push(`<button type="button" class="btn btn-outline-danger" data-action="cancel">Cancel</button>`);

    if (canDelete(o)) b.push(`<button type="button" class="btn btn-outline-danger" data-action="delete" aria-label="Delete order ${esc(o.orderId)}">${icon("trash")}</button>`);

    return b.join("");

}

function orderCard(o) {

    const paid = o.paymentStatus === "paid";

    const payBadge = o.paidOffline
        ? `<span class="pill paid" title="Placed through WhatsApp, before Paystack">Paid before Paystack</span>`
        : paid ? `<span class="pill paid">✓ Paid</span>` : `<span class="pill unpaid">Not paid</span>`;

    const rider = o.rider && (o.rider.name || o.rider.phone) && (o.status === "shipped" || o.status === "completed")
        ? `<div class="riderLine">${icon("truck")} Rider: <strong>${esc(o.rider.name || "—")}</strong>${o.rider.phone ? ` · <a href="tel:${esc(o.rider.phone)}">${esc(o.rider.phone)}</a>` : ""}</div>`
        : "";

    const dates = [
        `Placed ${formatDate(o.createdAt, true)}`,
        paid && o.paidAt ? `Paid ${formatDate(o.paidAt, true)}` : "",
        o.shippedAt ? `Shipped ${formatDate(o.shippedAt)}` : "",
        o.completedAt ? `Delivered ${formatDate(o.completedAt)}` : "",
        o.paidReference ? `Paystack ref ${esc(o.paidReference)}` : ""
    ].filter(Boolean).join(" · ");

    return `
        <article class="orderCard ${newIds.has(o._id) ? "isNew" : ""}" data-id="${esc(o._id)}">

            <div class="orderTop">
                <div class="orderId">${esc(o.orderId)}</div>
                <div class="badges">
                    ${payBadge}
                    ${o.testPayment ? `<span class="pill test">Test payment</span>` : ""}
                    <span class="pill ${esc(o.status)}">${esc(STATUS_LABEL[o.status] || o.status)}</span>
                </div>
            </div>

            <div class="orderMeta">${dates}</div>

            <div class="customer">
                <div><strong>Customer</strong>${esc(o.name)}</div>
                <div><strong>Phone</strong>${o.phone ? `<a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>` : "—"}</div>
                <div class="wide"><strong>Email</strong>${o.email ? `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : "—"}</div>
                <div class="wide"><strong>Address</strong>${esc(o.address || "—")}</div>
                ${o.note ? `<div class="wide"><strong>Note</strong>${esc(o.note)}</div>` : ""}
            </div>

            ${rider}

            <ul class="orderItems">
                ${o.items.map((i) => `<li><span>${esc(i.name)} · size ${esc(i.size)} × ${esc(i.qty)}</span><span>${money(i.price * i.qty)}</span></li>`).join("")}
            </ul>

            <div class="orderBottom">
                <div class="orderTotal">${money(o.total)}</div>
                <div class="orderActions">${actions(o)}</div>
            </div>

        </article>`;

}

function renderOrders() {

    const groups = { toFulfil: [], unpaid: [], completed: [], cancelled: [] };

    data.orders.filter(matches).forEach((o) => groups[groupOf(o)].push(o));

    Object.keys(groups).forEach((key) => {
        document.getElementById(`count-${key}`).textContent = groups[key].length;
    });

    document.querySelectorAll(".tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.group === group)));

    groupHint.textContent = GROUPS[group].hint;

    const list = groups[group];

    // oldest first for orders to fulfil (first come, first served); newest first otherwise
    if (group === "toFulfil") list.reverse();

    ordersList.innerHTML = list.length
        ? `<div class="orderGrid">${list.map(orderCard).join("")}</div>`
        : `<div class="emptyState">${orderSearch.value.trim() ? "No orders match your search." : GROUPS[group].empty}</div>`;

}

async function setStatus(order, status, extra = {}) {

    const result = await api(`/api/admin/orders/${encodeURIComponent(order._id)}/status`, {
        method: "PATCH",
        body: { status, ...extra }
    });

    Object.assign(order, result.order);

    newIds.delete(order._id);

    toast(`${order.orderId} is now ${STATUS_LABEL[status].toLowerCase()}.`);

    await load();

}

ordersList.addEventListener("click", async (e) => {

    const button = e.target.closest("[data-action]");

    if (!button) return;

    const order = data.orders.find((o) => o._id === button.closest(".orderCard").dataset.id);

    if (!order) return;

    const action = button.dataset.action;

    try {

        if (action === "ship") {
            openShipDialog(order);
            return;
        }

        if (action === "deliver") {
            if (!confirm(`Mark ${order.orderId} as delivered? The customer will get a delivery email.`)) return;
            button.disabled = true;
            await setStatus(order, "completed");
        }

        if (action === "cancel") {
            const paidOnline = order.paymentStatus === "paid" && !order.paidOffline;
            const message = paidOnline
                ? `Cancel ${order.orderId}? The customer has paid ${money(order.total)}, so refund them from your Paystack dashboard.`
                : `Cancel ${order.orderId}?`;
            if (!confirm(message)) return;
            button.disabled = true;
            await setStatus(order, "cancelled");
        }

        if (action === "reopen") {
            button.disabled = true;
            await setStatus(order, "pending");
        }

        if (action === "delete") {
            if (!confirm(`Delete ${order.orderId} permanently? This can't be undone.`)) return;
            button.disabled = true;
            await api(`/api/admin/orders/${encodeURIComponent(order._id)}`, { method: "DELETE" });
            toast(`${order.orderId} deleted.`);
            await load();
        }

    } catch (err) {

        button.disabled = false;

        toast(err.message, "error");

    }

});

document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        group = tab.dataset.group;
        renderOrders();
    });
});

orderSearch.addEventListener("input", renderOrders);

/* ---------- ship dialog ---------- */

shipDialog.querySelectorAll("[data-close]").forEach((b) => {
    if (b.classList.contains("iconBtn")) b.innerHTML = icon("close");
    b.addEventListener("click", () => shipDialog.close());
});

function openShipDialog(order) {

    shipping = order;

    const editing = order.status === "shipped";

    document.getElementById("shipTitle").textContent = editing ? "Edit rider details" : "Ship order";
    document.getElementById("shipOrderInfo").textContent = `${order.orderId} · ${order.name} · ${order.address}`;
    document.getElementById("riderName").value = order.rider?.name || "";
    document.getElementById("riderPhone").value = order.rider?.phone || "";
    document.getElementById("shipConfirmBtn").textContent = editing ? "Save and email customer" : "Mark as shipped";
    document.getElementById("shipEmailHint").textContent = order.email
        ? `${order.email} gets an email with these details.`
        : "This order has no email address, so no email will be sent.";

    showFieldErrors(shipForm, {});

    shipDialog.showModal();

    document.getElementById("riderName").focus();

}

shipForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const button = document.getElementById("shipConfirmBtn");

    const riderName = document.getElementById("riderName").value.trim();
    const riderPhone = document.getElementById("riderPhone").value.trim();

    if (riderPhone && riderPhone.replace(/\D/g, "").length < 11) {
        showFieldErrors(shipForm, { riderPhone: "Phone number must be 11 digits." });
        return;
    }

    setBusy(button, true, "Saving...");

    try {

        await setStatus(shipping, "shipped", { riderName, riderPhone, resend: shipping.status === "shipped" });

        shipDialog.close();

    } catch (err) {

        showFieldErrors(shipForm, { riderPhone: err.message });

    } finally {

        setBusy(button, false);

    }

});

/* ---------- customers ---------- */

function renderUsers() {

    const q = userSearch.value.trim().toLowerCase();

    const list = data.users.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

    usersTable.innerHTML = list.length
        ? list.map((u, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${esc(u.name)}${u.isAdmin ? '<span class="adminTag">admin</span>' : ""}</td>
                <td><a href="mailto:${esc(u.email)}">${esc(u.email)}</a></td>
                <td>${formatDate(u.createdAt)}</td>
                <td class="text-center"><span class="orderCount">${u.orders}</span></td>
            </tr>`).join("")
        : `<tr><td colspan="5" class="text-center text-muted py-4">${q ? "No customers match your search." : "No customers yet."}</td></tr>`;

}

userSearch.addEventListener("input", renderUsers);

/* ---------- email ---------- */

function renderEmailOptions() {

    document.getElementById("emailNotSetUp").hidden = data.emailReady;

    document.getElementById("emailSuggestions").innerHTML =
        `<option value="ALL USERS"></option>` +
        data.users.filter((u) => !u.isAdmin).map((u) => `<option value="${esc(u.email)}">${esc(u.name)}</option>`).join("");

}

document.getElementById("emailForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const button = document.getElementById("sendEmailBtn");
    const result = document.getElementById("emailResult");

    const to = document.getElementById("emailTo").value.trim();
    const subject = document.getElementById("emailSubject").value.trim();
    const message = document.getElementById("emailMessage").value.trim();

    result.hidden = true;
    result.classList.remove("ok");

    if (!to || !subject || !message) {
        result.textContent = "Please fill in the recipient, subject and message.";
        result.hidden = false;
        return;
    }

    if (to.toUpperCase() === "ALL USERS") {
        const count = data.users.filter((u) => !u.isAdmin).length;
        if (!confirm(`Send this email to all ${count} customers?`)) return;
    }

    setBusy(button, true, "Sending...");

    try {

        const response = await api("/api/admin/send-email", { method: "POST", body: { to, subject, message } });

        result.textContent = response.message;
        result.classList.toggle("ok", !response.failed);
        result.hidden = false;

        if (!response.failed) e.target.reset();

    } catch (err) {

        result.textContent = err.message;
        result.hidden = false;

    } finally {

        setBusy(button, false);

    }

});

/* ---------- header ---------- */

const refreshBtn = document.getElementById("refreshBtn");

refreshBtn.addEventListener("click", async () => {

    setBusy(refreshBtn, true, "Refreshing...");

    await load();

    setBusy(refreshBtn, false);

});

document.getElementById("logoutBtn").addEventListener("click", async () => {

    try {
        await api("/api/admin/logout", { method: "POST" });
    } finally {
        location.href = "admin-login.html";
    }

});

/* ---------- start ---------- */

load().then(() => {

    // pick up new orders while the page is open (not while a dialog is open)
    setInterval(() => {
        if (document.visibilityState === "visible" && !shipDialog.open) load();
    }, 60000);

});

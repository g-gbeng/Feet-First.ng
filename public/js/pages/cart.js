/* =========================================
   CART
   Everything is kept on the server; prices are
   always the current ones from the shop.
========================================= */

const list = document.getElementById("cartItems");
const summaryBox = document.getElementById("summaryBox");
const totalEl = document.getElementById("cartTotal");
const summaryText = document.getElementById("cartSummary");
const clearBtn = document.getElementById("clearCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const unavailableNotice = document.getElementById("unavailableNotice");

const MAX_QTY = 10;

let cart = { items: [], count: 0, subtotal: 0 };

function line(item) {

    const key = `${esc(item.productId)}|${esc(item.size)}`;

    return `
        <article class="cartLine ${item.available ? "" : "unavailable"}" data-key="${key}">
            <img src="${imgSrc(item.image)}" alt="" width="96" height="76" loading="lazy" decoding="async">
            <div>
                <h2>${esc(item.name)}</h2>
                <div class="meta">Size ${esc(item.size)} · ${money(item.price)} each</div>
                ${item.available
                    ? `<div class="price">${money(item.price * item.quantity)}</div>`
                    : `<div class="warn">No longer available in this size</div>`}
            </div>
            <div class="lineControls">
                ${item.available ? `
                <div class="stepper" role="group" aria-label="Quantity of ${esc(item.name)}">
                    <button type="button" data-step="-1" aria-label="One less">−</button>
                    <output aria-live="polite">${item.quantity}</output>
                    <button type="button" data-step="1" aria-label="One more" ${item.quantity >= MAX_QTY ? "disabled" : ""}>+</button>
                </div>` : ""}
                <button type="button" class="removeBtn" data-remove aria-label="Remove ${esc(item.name)}">${icon("trash")}</button>
            </div>
        </article>`;

}

function render() {

    Shop.setCart(cart, false);

    if (!cart.items.length) {

        list.innerHTML = `
            <div class="emptyState">
                ${icon("cart")}
                <h2>Your cart is empty</h2>
                <p>Find a pair you love and add it here.</p>
                <a href="dashboard.html" class="btn btn-gold">Start shopping</a>
            </div>`;

        summaryBox.hidden = true;
        clearBtn.hidden = true;
        summaryText.textContent = "";
        return;

    }

    list.innerHTML = cart.items.map(line).join("");

    const unavailable = cart.items.some((i) => !i.available);

    totalEl.textContent = money(cart.subtotal);
    summaryText.textContent = `${cart.count} item${cart.count === 1 ? "" : "s"}`;
    unavailableNotice.hidden = !unavailable;
    checkoutBtn.classList.toggle("disabled", unavailable);
    checkoutBtn.setAttribute("aria-disabled", String(unavailable));
    summaryBox.hidden = false;
    clearBtn.hidden = false;

}

async function change(request) {

    list.classList.add("busy");

    try {
        cart = await request();
        render();
    } catch (err) {
        toast(err.message, "error");
    } finally {
        list.classList.remove("busy");
    }

}

list.addEventListener("click", (e) => {

    const row = e.target.closest(".cartLine");

    if (!row) return;

    const [productId, size] = row.dataset.key.split("|");

    const item = cart.items.find((i) => String(i.productId) === productId && String(i.size) === size);

    if (!item) return;

    const step = e.target.closest("[data-step]");

    if (step) {
        const quantity = item.quantity + Number(step.dataset.step);
        change(() => api("/api/cart/items", { method: "PATCH", body: { productId, size: Number(size), quantity: Math.max(0, quantity) } }));
        return;
    }

    if (e.target.closest("[data-remove]")) {
        change(() => api("/api/cart/items", { method: "PATCH", body: { productId, size: Number(size), quantity: 0 } }));
    }

});

clearBtn.addEventListener("click", () => {

    if (!confirm("Remove everything from your cart?")) return;

    change(() => api("/api/cart", { method: "DELETE" }));

});

checkoutBtn.addEventListener("click", (e) => {

    if (checkoutBtn.classList.contains("disabled")) {
        e.preventDefault();
        toast("Remove the unavailable items first.", "error");
    }

});

Shop.start().then(() => change(() => api("/api/cart")));

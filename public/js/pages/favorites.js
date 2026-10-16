/* =========================================
   SAVED ITEMS
========================================= */

const listEl = document.getElementById("favoritesList");
const summaryEl = document.getElementById("savedSummary");
const clearBtn = document.getElementById("clearFavoritesBtn");

const dialog = document.getElementById("sizeDialog");
const sizeForm = document.getElementById("sizeForm");
const sizeSelect = document.getElementById("selectedSize");
const keepSaved = document.getElementById("keepSaved");
const confirmBtn = document.getElementById("confirmMoveBtn");

let items = [];
let chosen = null;

dialog.querySelectorAll("[data-close]").forEach((b) => {
    if (b.classList.contains("iconBtn")) b.innerHTML = icon("close");
    b.addEventListener("click", () => dialog.close());
});

function render() {

    if (!items.length) {

        listEl.innerHTML = `
            <div class="emptyState">
                ${icon("heart")}
                <h2>No saved items yet</h2>
                <p>Tap the heart on any shoe to save it for later.</p>
                <a href="dashboard.html" class="btn btn-gold">Browse shoes</a>
            </div>`;

        clearBtn.hidden = true;
        summaryEl.textContent = "";
        return;

    }

    listEl.innerHTML = items.map((p) => `
        <article class="savedItem" data-id="${esc(p._id)}">
            <img src="${imgSrc(p.image)}" alt="" width="110" height="86" loading="lazy" decoding="async">
            <div>
                <h2>${esc(p.name)}</h2>
                <div class="brandName">${esc(p.brand)}</div>
                ${p.inStock ? `<div class="price">${money(p.price)}</div>` : `<div class="soldOut">Out of stock</div>`}
            </div>
            <div class="actions">
                <button type="button" class="btn btn-sm btn-gold" data-move ${p.inStock ? "" : "disabled"}>Add to cart</button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-remove>Remove</button>
            </div>
        </article>
    `).join("");

    clearBtn.hidden = false;
    summaryEl.textContent = `${items.length} saved item${items.length === 1 ? "" : "s"}`;

}

function apply(favorites) {
    items = favorites.items;
    Shop.setFavorites(favorites);
    render();
}

async function load() {

    try {
        apply(await api("/api/favorites"));
    } catch (err) {
        listEl.innerHTML = `<div class="emptyState"><h2>Couldn't load your saved items</h2><p>${esc(err.message)}</p></div>`;
    }

}

listEl.addEventListener("click", async (e) => {

    const row = e.target.closest(".savedItem");

    if (!row) return;

    const product = items.find((p) => p._id === row.dataset.id);

    if (e.target.closest("[data-move]")) {

        chosen = product;

        document.getElementById("selectedProductName").textContent = `${product.name} · ${money(product.price)}`;

        sizeSelect.innerHTML = `<option value="">Choose size</option>` +
            product.sizes.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

        keepSaved.checked = false;

        showFieldErrors(sizeForm, {});

        dialog.showModal();

        sizeSelect.focus();

        return;

    }

    if (e.target.closest("[data-remove]")) {

        try {
            apply(await api(`/api/favorites/${encodeURIComponent(product._id)}`, { method: "DELETE" }));
            toast("Removed from saved items");
        } catch (err) {
            toast(err.message, "error");
        }

    }

});

sizeForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    if (!sizeSelect.value) {
        showFieldErrors(sizeForm, { selectedSize: "Please choose a size." });
        return;
    }

    setBusy(confirmBtn, true, "Adding...");

    try {

        await Shop.addToCart(chosen._id, Number(sizeSelect.value));

        if (!keepSaved.checked) {
            apply(await api(`/api/favorites/${encodeURIComponent(chosen._id)}`, { method: "DELETE" }));
        }

        dialog.close();

        toast("Added to cart", "success", { href: "cart.html", text: "View cart" });

    } catch (err) {

        showFieldErrors(sizeForm, { selectedSize: err.message });

    } finally {

        setBusy(confirmBtn, false);

    }

});

clearBtn.addEventListener("click", async () => {

    if (!confirm("Remove all your saved items?")) return;

    try {
        apply(await api("/api/favorites", { method: "DELETE" }));
    } catch (err) {
        toast(err.message, "error");
    }

});

Shop.start().then(load);

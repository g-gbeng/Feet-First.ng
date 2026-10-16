/* =========================================
   BRAND COLLECTION PAGES
   The brand comes from <body data-brand="...">.
========================================= */

const brand = document.body.dataset.brand;

const grid = document.getElementById("products");
const countText = document.getElementById("productCount");

let products = [];

function card(p) {

    const saved = Shop.favoriteIds.has(p._id);

    const saveBtn = `
        <button type="button" class="saveBtn" data-save="${esc(p._id)}" aria-pressed="${saved}" aria-label="${saved ? "Remove from" : "Save to"} saved items: ${esc(p.name)}">
            ${icon("heart")}
        </button>`;

    const buy = p.inStock
        ? `<form class="buy" data-product="${esc(p._id)}" novalidate>
                <label class="srOnly" for="size-${esc(p._id)}">Size for ${esc(p.name)}</label>
                <select class="form-select" id="size-${esc(p._id)}" required>
                    <option value="">Size</option>
                    ${p.sizes.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
                </select>
                <button type="submit" class="btn btn-gold">Add to cart</button>
           </form>`
        : `<div class="soldOutLabel">Out of stock</div>`;

    return `
        <article class="productCard ${p.inStock ? "" : "soldOut"}">
            <div class="photo">
                <img src="${imgSrc(p.image)}" alt="${esc(p.name)}" width="400" height="300" loading="lazy" decoding="async">
            </div>
            ${saveBtn}
            <h2>${esc(p.name)}</h2>
            <div class="price">${money(p.price)}</div>
            ${buy}
        </article>`;

}

function render() {

    if (!products.length) {
        grid.innerHTML = `<div class="emptyState" style="grid-column:1/-1">${icon("box")}<h2>No shoes here yet</h2><p>New pairs are on the way. Check back soon.</p></div>`;
        countText.textContent = "";
        return;
    }

    grid.innerHTML = products.map(card).join("");

    const inStock = products.filter((p) => p.inStock).length;

    countText.textContent = `${inStock} style${inStock === 1 ? "" : "s"} in stock`;

}

async function load() {

    grid.innerHTML = Array.from({ length: 6 }, () => `<div class="productCard skeleton" aria-hidden="true"></div>`).join("");

    try {

        products = await api(`/api/products?brand=${encodeURIComponent(brand)}`);

        render();

    } catch (err) {

        grid.innerHTML = `<div class="emptyState" style="grid-column:1/-1"><h2>Couldn't load the shoes</h2><p>${esc(err.message)}</p><button type="button" class="btn btn-gold" id="retry">Try again</button></div>`;

        document.getElementById("retry").addEventListener("click", load);

    }

}

/* add to cart */
grid.addEventListener("submit", async (e) => {

    const form = e.target.closest("form.buy");

    if (!form) return;

    e.preventDefault();

    const select = form.querySelector("select");
    const button = form.querySelector("button");

    if (!select.value) {
        select.classList.add("hasError");
        select.focus();
        toast("Please choose a size first.", "error");
        return;
    }

    select.classList.remove("hasError");

    setBusy(button, true, "Adding...");

    try {

        await Shop.addToCart(form.dataset.product, Number(select.value));

        toast("Added to cart", "success", { href: "cart.html", text: "View cart" });

    } catch (err) {

        toast(err.message, "error");

    } finally {

        setBusy(button, false);

    }

});

grid.addEventListener("change", (e) => {
    if (e.target.matches("select")) e.target.classList.remove("hasError");
});

/* save / unsave */
grid.addEventListener("click", async (e) => {

    const button = e.target.closest("[data-save]");

    if (!button) return;

    button.disabled = true;

    try {

        const saved = await Shop.toggleFavorite(button.dataset.save);

        const name = products.find((p) => p._id === button.dataset.save)?.name || "";

        button.setAttribute("aria-pressed", String(saved));

        button.setAttribute("aria-label", `${saved ? "Remove from" : "Save to"} saved items: ${name}`);

        toast(saved ? "Saved" : "Removed from saved items", "success", saved ? { href: "favorites.html", text: "View saved" } : null);

    } catch (err) {

        toast(err.message, "error");

    } finally {

        button.disabled = false;

    }

});

Shop.start().then(load);

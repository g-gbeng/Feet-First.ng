/* =========================================
   FEET-FIRST.NG
   CUSTOMER PAGES: sign-in check, top bar,
   side menu, cart and saved-item actions.
   Needs common.js first.
========================================= */

/*
  Brand tiles and menu links. All dashboard photos face right: Nike, Puma and
  Jordan product shots point left, so those are mirrored on the dashboard (flip).
*/
const BRANDS = [
    { brand: "Nike", label: "Nike Air Force", page: "nikeairforce-section.html", image: "/images/AF1-Low-Retro.png", flip: true, sizes: "41–45" },
    { brand: "Adidas", label: "Adidas", page: "adidas-section.html", image: "/images/ADIDAS SUPERSTAR.avif", sizes: "41–45" },
    { brand: "Puma", label: "Puma", page: "puma-section.html", image: "/images/Suede-XL-Hairy.avif", flip: true, sizes: "41–45" },
    { brand: "New Balance", label: "New Balance", page: "newbalance-section.html", image: "/images/NB 550.webp", sizes: "41–45" },
    { brand: "Dunk", label: "Nike Dunks", page: "dunk-section.html", image: "/images/DUNK LOW RETRO.png", flip: true, sizes: "41–45" },
    { brand: "Vans", label: "Vans", page: "vans-section.html", image: "/images/OLD-SKOOL.webp", sizes: "41–45" },
    { brand: "AirMax", label: "Nike Air Max", page: "airmax-section.html", image: "/images/Air-Max 90.png", flip: true, sizes: "43–45" },
    { brand: "Jordans", label: "Air Jordans", page: "jordan-section.html", image: "/images/J1 Retro High.png", flip: true, sizes: "43–45" }
];

const Shop = {

    user: null,

    favoriteIds: new Set(),

    counts: { cart: 0, favorites: 0 },

    /*
      Every customer page calls this first. Sends visitors who aren't signed in
      to the login page (and back here afterwards), then draws the top bar and menu.
      options: { overlay: true } for the see-through top bar on the dashboard
    */
    async start(options = {}) {

        try {

            const data = await api("/api/users/me");

            this.user = data.user;

        } catch (err) {

            if (err.status === 401) {
                const here = location.pathname.split("/").pop() + location.search;
                location.replace(`login.html?next=${encodeURIComponent(here)}`);
                return new Promise(() => {}); // the page is leaving
            }

            throw err;

        }

        this.renderShell(options);

        await this.moveBrowserData();

        await this.refreshCounts();

        return this.user;

    },

    renderShell({ overlay = false } = {}) {

        const slot = document.getElementById("shell");

        if (!slot) return;

        const page = location.pathname.split("/").pop() || "dashboard.html";

        const link = (href, iconName, label) =>
            `<a href="${href}" ${page === href ? 'aria-current="page"' : ""}>${icon(iconName)}${label}</a>`;

        slot.innerHTML = `
            <header class="topBar ${overlay ? "overlay" : ""}">
                <div class="inner">
                    <button type="button" class="iconBtn" id="menuOpen" aria-label="Open menu" aria-controls="sideMenu" aria-expanded="false">${icon("menu")}</button>
                    <a href="dashboard.html" class="brand">Feet-First<span>.ng</span></a>
                    <div class="actions">
                        <a href="favorites.html" class="iconBtn" aria-label="Saved items">${icon("heart")}<span class="countBadge" id="favCount" hidden>0</span></a>
                        <a href="cart.html" class="iconBtn" aria-label="Cart">${icon("cart")}<span class="countBadge" id="cartCount" hidden>0</span></a>
                    </div>
                </div>
            </header>

            <div class="menuOverlay" id="menuOverlay"></div>

            <nav class="sideMenu" id="sideMenu" aria-label="Main menu">
                <div class="head">
                    <span class="avatar">${esc(initials(this.user.name))}</span>
                    <strong>${esc(this.user.name)}</strong>
                    <button type="button" class="iconBtn" id="menuClose" aria-label="Close menu">${icon("close")}</button>
                </div>
                ${link("dashboard.html", "home", "Shop")}
                ${link("orders.html", "box", "My Orders")}
                ${link("cart.html", "cart", "Cart")}
                ${link("favorites.html", "heart", "Saved Items")}
                ${link("checkout.html", "card", "Checkout")}
                ${link("profile.html", "user", "Profile")}
                <div class="group">Brands</div>
                <div class="brands">
                    ${BRANDS.map((b) => `<a href="${b.page}" ${page === b.page ? 'aria-current="page"' : ""}>${esc(b.label)}</a>`).join("")}
                </div>
                <div class="foot">
                    <button type="button" class="linkBtn" id="logoutBtn">${icon("logout")}Log out</button>
                </div>
            </nav>
        `;

        const menu = document.getElementById("sideMenu");
        const overlayEl = document.getElementById("menuOverlay");
        const openBtn = document.getElementById("menuOpen");

        const setOpen = (open) => {
            menu.classList.toggle("open", open);
            overlayEl.classList.toggle("open", open);
            openBtn.setAttribute("aria-expanded", String(open));
            if (open) document.getElementById("menuClose").focus();
            else openBtn.focus();
        };

        openBtn.addEventListener("click", () => setOpen(true));
        document.getElementById("menuClose").addEventListener("click", () => setOpen(false));
        overlayEl.addEventListener("click", () => setOpen(false));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && menu.classList.contains("open")) setOpen(false);
        });

        document.getElementById("logoutBtn").addEventListener("click", () => this.logout());

    },

    async refreshCounts() {

        try {

            const [cart, favorites] = await Promise.all([api("/api/cart"), api("/api/favorites")]);

            this.setCart(cart, false);

            this.setFavorites(favorites);

        } catch {
            /* counts are a nice-to-have */
        }

    },

    showCount(id, value, bump) {

        const badge = document.getElementById(id);

        if (!badge) return;

        badge.textContent = value > 99 ? "99+" : value;

        badge.hidden = value === 0;

        if (bump) {
            badge.classList.remove("bump");
            void badge.offsetWidth; // restart the animation
            badge.classList.add("bump");
        }

    },

    /* cart: the response of any /api/cart call */
    setCart(cart, bump = true) {

        this.counts.cart = cart.count;

        this.showCount("cartCount", cart.count, bump);

    },

    setFavorites(favorites) {

        this.favoriteIds = new Set(favorites.ids);

        this.counts.favorites = favorites.ids.length;

        this.showCount("favCount", favorites.ids.length, false);

    },

    async addToCart(productId, size, quantity = 1) {

        const cart = await api("/api/cart/items", { method: "POST", body: { productId, size, quantity } });

        this.setCart(cart);

        return cart;

    },

    /* Returns true if the product is now saved */
    async toggleFavorite(productId) {

        const saved = this.favoriteIds.has(productId);

        const favorites = await api(`/api/favorites/${encodeURIComponent(productId)}`, { method: saved ? "DELETE" : "POST" });

        this.setFavorites(favorites);

        return !saved;

    },

    async logout() {

        try {
            await api("/api/users/logout", { method: "POST" });
        } finally {
            location.href = "login.html";
        }

    },

    /*
      The earlier version of the site kept the cart and saved items in this browser only
      (localStorage "cart_<user id>" and "fav_<user id>"). Move them into the account once.
    */
    async moveBrowserData() {

        let cart = [];
        let favs = [];

        try {
            cart = JSON.parse(localStorage.getItem(`cart_${this.user.id}`) || "[]");
            favs = JSON.parse(localStorage.getItem(`fav_${this.user.id}`) || "[]");
        } catch {
            /* unreadable: nothing to move */
        }

        try {

            if (Array.isArray(cart) && cart.length) {
                await api("/api/cart/merge", {
                    method: "POST",
                    body: { items: cart.map((i) => ({ productId: i._id, size: i.size, quantity: i.qty })) }
                });
            }

            if (Array.isArray(favs) && favs.length) {
                await api("/api/favorites/merge", { method: "POST", body: { ids: favs.map((f) => f._id) } });
            }

            ["token", "user", `cart_${this.user.id}`, `fav_${this.user.id}`].forEach((key) => localStorage.removeItem(key));

        } catch {
            /* try again on the next page */
        }

    }

};

/* =========================================
   DASHBOARD (shop home)
========================================= */

const TILE_COLOURS = ["red", "light", "gold", "grey", "dark", "light", "red", "gold"];

function renderBrands() {

    document.getElementById("brandGrid").innerHTML = BRANDS.map((b, i) => `
        <a href="${b.page}" class="brandTile ${TILE_COLOURS[i % TILE_COLOURS.length]}" style="animation-delay:${i * 60}ms">
            <h2>${esc(b.label)}</h2>
            <span class="photo${b.flip ? " flip" : ""}"><img src="${imgSrc(b.image)}" alt="" width="200" height="200" loading="lazy" decoding="async"></span>
            <p>Sizes ${esc(b.sizes)}<br>Multiple styles</p>
        </a>
    `).join("");

}

renderBrands();

Shop.start({ overlay: true }).then((user) => {

    document.getElementById("welcomeText").textContent = `Welcome, ${user.name.split(" ")[0]}`;

});

/* =========================================
   LANDING PAGE
   Logged-in visitors get a "Go to the shop" button.
========================================= */

document.getElementById("year").textContent = new Date().getFullYear();

api("/api/users/me").then(({ user }) => {

    document.getElementById("cta").innerHTML = `
        <a href="dashboard.html" class="btn btn-gold btn-lg">Go to the shop</a>
        <span class="align-self-center">Welcome back, ${esc(user.name.split(" ")[0])}</span>`;

}).catch(() => { /* not logged in: keep the sign-up and login buttons */ });

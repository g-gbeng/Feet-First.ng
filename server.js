require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");

const express = require("express");
const cookieParser = require("cookie-parser");

const { env, checkEnv } = require("./config/env");

checkEnv();

const connectDB = require("./config/db");

const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const favoriteRoutes = require("./routes/favorites");
const orderRoutes = require("./routes/orders");
const payments = require("./routes/payments");

const auth = require("./middleware/auth");

const paystack = require("./services/paystack");
const { startPaymentChecks, migrateLegacyOrders } = require("./services/orders");

const app = express();

// Behind a host's proxy (Render, Railway, ...), use the visitor's real IP and HTTPS
if (env.isProduction) app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.set("X-Frame-Options", "SAMEORIGIN");
    next();
});

/* -------------------- PAYSTACK WEBHOOK --------------------
   Paystack signs the exact bytes it sends, so this must read the raw body
   (registered before express.json). */
app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }), payments.webhook);

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json({ limit: "100kb" }));

app.use(cookieParser());

/*
  The API only accepts JSON for changes. Browsers can't send JSON to another
  site without its permission, so a page on another site can't make a
  signed-in visitor's browser change their cart, orders or the admin area.
*/
function sameSite(origin, req) {
    try {
        return origin === env.publicUrl || new URL(origin).host === req.get("host");
    } catch {
        return false;
    }
}

app.use("/api", (req, res, next) => {

    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();

    // forms always send another content type; the site's own pages send JSON (or nothing)
    if (req.get("content-type") && !req.is("application/json")) {
        return res.status(415).json({ success: false, message: "Requests must be sent as JSON." });
    }

    const origin = req.get("origin");

    if (origin && !sameSite(origin, req)) {
        return res.status(403).json({ success: false, message: "Request blocked." });
    }

    next();

});

/* -------------------- STATIC FILES --------------------
   Large photos: browsers that support WebP get the smaller .webp copy of a
   .jpg/.png when one exists next to it. */
const publicDir = path.join(__dirname, "public");

app.get(/^\/images\/[^/]+\.(jpe?g|png)$/i, (req, res, next) => {

    if (!/image\/webp/.test(req.get("accept") || "")) return next();

    let webpPath;

    try {
        webpPath = path.join(publicDir, decodeURIComponent(req.path).replace(/\.(jpe?g|png)$/i, ".webp"));
    } catch {
        return next();
    }

    if (!webpPath.startsWith(publicDir + path.sep) || !fs.existsSync(webpPath)) return next();

    res.vary("Accept");

    res.sendFile(webpPath, { maxAge: "7d" });

});

app.use(express.static(publicDir, {

    setHeaders(res, filePath) {

        // pages always fresh; images cached for a week
        if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
        } else if (/\.(jpe?g|png|webp|avif|svg)$/i.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=604800");
        }

    }

}));

/* -------------------- ROUTES -------------------- */
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/orders", orderRoutes);

app.post("/api/payments/verify", auth, payments.verify);

/* -------------------- HEALTH -------------------- */
app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});

// Unknown API address
app.use("/api", (req, res) => {
    res.status(404).json({ success: false, message: "Not found." });
});

// Errors: a clear message for expected problems, a generic one for the rest
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Invalid request." });
    }

    if (err.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "That request is too large." });
    }

    const status = err.status || err.statusCode || 500;

    const known = status < 500 || err.expose;

    if (!known) console.error(err);

    res.status(status).json({
        success: false,
        message: known ? err.message : "Something went wrong on our side. Please try again.",
        ...(known && err.extra ? err.extra : {})
    });

});

/* -------------------- SERVER -------------------- */
async function start() {

    await connectDB();

    await migrateLegacyOrders();

    app.listen(env.port, () => {

        console.log(`Server running on http://localhost:${env.port}`);

        if (paystack.isTestMode()) {
            console.log("Paystack test mode: payments are simulated and no money moves. Add PAYSTACK_SECRET_KEY to .env for real checkout.");
        }

    });

    startPaymentChecks();

}

start();

/*
  THE WEBSITE AND THIS BACKEND
  ============================
  The website (pages, CSS, JS, images) lives in its own folder, "Feet-First.ng Frontend",
  which is hosted on Vercel online. Vercel forwards every /api/... request to
  this backend on Render, so the pages and the API share one address and the
  login cookies keep working.

  findFrontend(): where this server finds the pages, if anywhere:
    1. FRONTEND_DIR in .env, if set
    2. the "Feet-First.ng Frontend" folder next to this backend folder (on your computer:
       npm run dev then shows the whole site, exactly as before)
    3. a "public" folder inside this backend (the old layout; delete it once the
       Vercel site is live)
  With none of them (online, once "public" is deleted), anyone opening a page on
  the backend's own address is sent to the same page on PUBLIC_URL, the website.

  fromWebsite(): requests forwarded by Vercel carry PROXY_SECRET. For those, the
  visitor's real IP (used by the sign-in attempt limits) and the website's
  address (used for the Paystack return link) are trusted.
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FOLDER = "Feet-First.ng Frontend";

function findFrontend(backendDir) {

    const candidates = [
        process.env.FRONTEND_DIR && path.resolve(backendDir, process.env.FRONTEND_DIR),
        path.resolve(backendDir, "..", FOLDER),
        path.join(backendDir, "public")
    ].filter(Boolean);

    return candidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) || null;

}

function sameSecret(given, expected) {

    const a = Buffer.from(String(given || ""));
    const b = Buffer.from(String(expected || ""));

    return a.length === b.length && b.length > 0 && crypto.timingSafeEqual(a, b);

}

/* Marks requests forwarded by the website (req.viaWebsite) and uses the visitor's real IP for them */
function fromWebsite(proxySecret) {

    return (req, res, next) => {

        req.viaWebsite = Boolean(proxySecret) && sameSecret(req.get("x-proxy-secret"), proxySecret);

        if (req.viaWebsite) {

            const ip = String(req.get("x-real-ip") || req.get("x-forwarded-for") || "").split(",")[0].trim();

            if (ip) Object.defineProperty(req, "ip", { value: ip, configurable: true });

        }

        next();

    };

}

/* The website's address as the visitor sees it, e.g. https://feetfirst.vercel.app */
function siteAddress(req, publicUrl) {

    if (publicUrl) return publicUrl;

    const forwardedHost = String(req.get("x-forwarded-host") || "").split(",")[0].trim();

    if (req.viaWebsite && forwardedHost) return `https://${forwardedHost}`;

    return `${req.protocol}://${req.get("host")}`;

}

/* No pages on this server: send page visits to the website (PUBLIC_URL) */
function pagesElsewhere(publicUrl) {

    return (req, res, next) => {

        if (!["GET", "HEAD"].includes(req.method) || req.path === "/api" || req.path.startsWith("/api/")) return next();

        let target = null;

        try {
            if (publicUrl && new URL(publicUrl).host !== req.get("host")) target = publicUrl;
        } catch {
            target = null;
        }

        if (target) return res.redirect(302, target + req.originalUrl);

        res.status(404).type("text/plain").send(
            "This is the API. The website's pages are in the separate frontend folder. " +
            "Set PUBLIC_URL to the website's address to send visitors there."
        );

    };

}

module.exports = { FOLDER, findFrontend, fromWebsite, siteAddress, pagesElsewhere };

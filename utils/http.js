/*
  Small helpers shared by the routes.
*/

const jwt = require("jsonwebtoken");

const { env } = require("../config/env");

/* An error with an HTTP status; the error handler in server.js sends its message */
class HttpError extends Error {

    constructor(status, message, extra) {
        super(message);
        this.status = status;
        this.expose = true; // our own message: safe to show
        if (extra) this.extra = extra;
    }

}

/*
  Sign-in cookies. The JWT inside is signed with JWT_SECRET, and the cookie is
  hidden from page scripts (httpOnly), so a script injected into a page can't
  steal it the way it could read localStorage. HTTPS-only once online.
*/
const COOKIES = {
    user: { name: "ff_session", days: 7 },
    admin: { name: "ff_admin", days: 1 }
};

function cookieBase() {
    return { httpOnly: true, sameSite: "lax", secure: env.isProduction, path: "/" };
}

function signIn(res, kind, payload) {

    const { name, days } = COOKIES[kind];

    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: `${days}d` });

    res.cookie(name, token, { ...cookieBase(), maxAge: days * 24 * 60 * 60 * 1000 });

}

function signOut(res, kind) {
    res.clearCookie(COOKIES[kind].name, cookieBase());
}

/* The decoded token from a sign-in cookie, or null */
function readSession(req, kind) {

    const token = req.cookies?.[COOKIES[kind].name];

    if (!token) return null;

    try {
        return jwt.verify(token, env.jwtSecret);
    } catch {
        return null;
    }

}

/* Trimmed text, cut to a maximum length; "" if missing */
function text(value, max = 500) {
    return String(value ?? "").trim().slice(0, max);
}

const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ""));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Nigerian phone numbers: 08012345678, +234 801 234 5678 and 2348012345678 all become 08012345678 */
function normalisePhone(value) {

    let digits = String(value || "").replace(/\D/g, "");

    if (digits.startsWith("234") && digits.length === 13) digits = "0" + digits.slice(3);

    return /^0\d{10}$/.test(digits) ? digits : "";

}

/* The address customers use to reach the site (for the Paystack return link) */
function publicBase(req) {
    return env.publicUrl || `${req.protocol}://${req.get("host")}`;
}

module.exports = {
    HttpError,
    signIn,
    signOut,
    readSession,
    text,
    isObjectId,
    EMAIL,
    normalisePhone,
    publicBase
};

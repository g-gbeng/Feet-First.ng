/*
  All settings read from .env in one place.
  See .env.example for what each one does.
*/

const isProduction = process.env.NODE_ENV === "production";

const env = {

    isProduction,

    port: Number(process.env.PORT) || 3000,

    mongoUri: process.env.MONGO_URI || "",

    // Signs the login cookies. Any long random text.
    jwtSecret: process.env.JWT_SECRET || "",

    // The site's public address, used for the Paystack return link.
    // Leave empty locally; it's worked out from each request.
    publicUrl: (process.env.PUBLIC_URL || "").replace(/\/$/, ""),

    // Emails through Brevo's email API (https://www.brevo.com), over HTTPS, so it also
    // works on hosts that block email ports (e.g. Render's free plan).
    // Without a key, emails are skipped. EMAIL_FROM must be a sender verified in Brevo.
    email: {
        brevoKey: process.env.BREVO_API_KEY || "",
        brevoBase: (process.env.BREVO_API_BASE || "https://api.brevo.com").replace(/\/$/, ""),
        from: process.env.EMAIL_FROM || "FeetFirst <no-reply@feetfirst.ng>"
    },

    // Paystack (https://dashboard.paystack.com > Settings > API Keys & Webhooks).
    // Leave PAYSTACK_SECRET_KEY empty while developing to use simulated test payments.
    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY || "",
        baseUrl: (process.env.PAYSTACK_BASE_URL || "https://api.paystack.co").replace(/\/$/, "")
    },

    // Online without a Paystack key yet: SIMULATE_PAYMENTS=true allows fake payments
    // (no money moves; anyone can "pay"). For trying the site only. Ignored once a key is set.
    simulatePayments: process.env.SIMULATE_PAYMENTS === "true"

};

function checkEnv() {

    const missing = [];

    if (!env.mongoUri) missing.push("MONGO_URI");

    if (!env.jwtSecret) missing.push("JWT_SECRET");

    if (missing.length) {
        throw new Error(`Missing settings in .env: ${missing.join(", ")}`);
    }

    if (env.isProduction && !env.paystack.secretKey) {

        if (!env.simulatePayments) {
            throw new Error("PAYSTACK_SECRET_KEY must be set in production (or SIMULATE_PAYMENTS=true while trying the site out).");
        }

        console.warn("Warning: SIMULATE_PAYMENTS is on. Payments are fake and no money moves. Add PAYSTACK_SECRET_KEY before real customers use the site.");

    }

    if (!env.email.brevoKey) {
        console.warn("Note: BREVO_API_KEY is not set, so emails (welcome, order updates, admin messages) are skipped.");
    }

}

module.exports = { env, checkEnv };

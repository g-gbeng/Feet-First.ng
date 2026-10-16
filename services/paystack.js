/*
  Paystack payments (https://paystack.com/docs/api/transaction/).

  - initialize(): POST /transaction/initialize -> returns the checkout link
  - verify():     GET  /transaction/verify/:reference -> did the customer pay?
  - signatureIsValid(): checks webhook calls really come from Paystack
    (HMAC SHA512 of the raw body with the secret key, header x-paystack-signature)

  Test mode: with no PAYSTACK_SECRET_KEY outside production (or online with
  SIMULATE_PAYMENTS=true), payments are simulated so the whole flow can be
  tried without a Paystack account. No money moves.
*/

const crypto = require("crypto");

const { env } = require("../config/env");

const isTestMode = () =>
    !env.paystack.secretKey && (!env.isProduction || env.simulatePayments);

async function call(method, path, body) {

    if (!env.paystack.secretKey) {
        throw new Error("PAYSTACK_SECRET_KEY is not set");
    }

    const res = await fetch(env.paystack.baseUrl + path, {
        method,
        headers: {
            Authorization: `Bearer ${env.paystack.secretKey}`,
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

    let data = null;

    try {
        data = await res.json();
    } catch {
        /* not JSON */
    }

    if (!res.ok || !data || data.status !== true) {
        const err = new Error((data && data.message) || `Paystack request failed (${res.status})`);
        err.statusCode = 502;
        throw err;
    }

    return data.data;

}

/* Returns { authorizationUrl, reference, test? } */
async function initialize({ email, amountKobo, reference, callbackUrl, metadata }) {

    if (isTestMode()) {
        return {
            authorizationUrl: `${callbackUrl}?reference=${encodeURIComponent(reference)}&test=1`,
            reference,
            test: true
        };
    }

    const data = await call("POST", "/transaction/initialize", {
        email,
        amount: String(amountKobo),
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: JSON.stringify(metadata || {})
    });

    return { authorizationUrl: data.authorization_url, reference: data.reference };

}

/* Returns { paid, amountKobo, currency, status, test? } */
async function verify(reference, expectedKobo) {

    if (isTestMode()) {
        return { paid: true, amountKobo: expectedKobo, currency: "NGN", status: "success", test: true };
    }

    const data = await call("GET", `/transaction/verify/${encodeURIComponent(reference)}`);

    return {
        paid: data.status === "success",
        amountKobo: Number(data.amount),
        currency: data.currency,
        status: data.status
    };

}

function signatureIsValid(rawBody, signature) {

    if (!env.paystack.secretKey || !signature || !rawBody) return false;

    const expected = crypto
        .createHmac("sha512", env.paystack.secretKey)
        .update(rawBody)
        .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));

    return a.length === b.length && crypto.timingSafeEqual(a, b);

}

function newReference(orderId) {
    return `${orderId}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

module.exports = { initialize, verify, signatureIsValid, isTestMode, newReference };

/*
  Checks the email setup and sends one test email through Brevo.

    npm run email:test -- you@example.com

  Prints what Brevo answers, the senders verified on your Brevo account,
  and what to change if something's wrong.
*/

require("dotenv").config({ quiet: true });

const { env } = require("./config/env");

const to = process.argv[2] || process.env.ADMIN_EMAIL || "";

const base = env.email.brevoBase;
const key = env.email.brevoKey;

function senderEmail() {
    const match = /<([^>]+)>/.exec(env.email.from);
    return (match ? match[1] : env.email.from).trim().toLowerCase();
}

async function brevo(method, path, body) {

    const res = await fetch(base + path, {
        method,
        headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
        body: body ? JSON.stringify(body) : undefined
    });

    let data = null;

    try {
        data = await res.json();
    } catch {
        /* no body */
    }

    return { status: res.status, data };

}

function explain(status, message = "") {

    const m = message.toLowerCase();

    if (status === 401 && m.includes("ip")) {
        return "Brevo blocks requests from unknown IP addresses on your account. In Brevo: Settings (top right) > Security > Authorised IPs, then either add this computer's / your host's IP, or turn off \"Block unknown IP addresses\". Hosts like Render change IPs, so turning it off is usually needed.";
    }

    if (status === 401) {
        return "Brevo doesn't accept the API key. Create a new one in Brevo: SMTP & API > API Keys (it starts with xkeysib-; an SMTP key starting with xsmtpsib- won't work here) and put it in BREVO_API_KEY.";
    }

    if (m.includes("sender") || m.includes("from")) {
        return `The sender ${senderEmail()} isn't verified in Brevo. Set EMAIL_FROM to one of the verified senders listed above, e.g. EMAIL_FROM=FeetFirst <you@gmail.com>, or add and verify it in Brevo: Senders, Domains & Dedicated IPs > Senders.`;
    }

    if (status === 403 || m.includes("not activated") || m.includes("permission")) {
        return "Your Brevo account can't send transactional emails yet. New accounts sometimes need activating: check your Brevo dashboard and inbox for a message from Brevo, or contact Brevo support to activate transactional emails.";
    }

    if (m.includes("credit") || m.includes("limit")) {
        return "You've used your Brevo sending allowance (300 a day on the free plan). Wait until tomorrow or upgrade the plan.";
    }

    return "";

}

(async () => {

    console.log("\nEmail settings");
    console.log(`  BREVO_API_KEY: ${key ? `set (${key.slice(0, 8)}...)` : "MISSING"}`);
    console.log(`  EMAIL_FROM:    ${process.env.EMAIL_FROM ? env.email.from : `NOT SET (using the placeholder ${env.email.from}, which Brevo will reject)`}`);

    if (!key) {
        console.log("\nAdd BREVO_API_KEY to .env (Brevo: SMTP & API > API Keys), then run this again.\n");
        process.exit(1);
    }

    if (!to) {
        console.log("\nSay where to send the test, e.g.  npm run email:test -- you@example.com\n");
        process.exit(1);
    }

    // 1. Is the key accepted?
    const account = await brevo("GET", "/v3/account");

    if (account.status !== 200) {
        console.log(`\nBrevo refused the key (${account.status}): ${account.data?.message || ""}`);
        console.log(explain(account.status, account.data?.message) + "\n");
        process.exit(1);
    }

    console.log(`\nBrevo account: ${account.data.email}`);

    // 2. Which senders are verified?
    const senders = await brevo("GET", "/v3/senders");

    const list = senders.data?.senders || [];

    console.log("Verified senders on this account:");

    if (!list.length) console.log("  (none)");

    for (const s of list) console.log(`  ${s.active ? "✓" : "✗ (not active)"} ${s.name} <${s.email}>`);

    if (list.length && !list.some((s) => s.active && s.email.toLowerCase() === senderEmail())) {
        console.log(`\n⚠ EMAIL_FROM (${senderEmail()}) isn't one of the active senders above, so Brevo will reject it.`);
    }

    // 3. Send the test
    const sent = await brevo("POST", "/v3/smtp/email", {
        sender: { name: (/^\s*(.*?)\s*</.exec(env.email.from) || [])[1] || "FeetFirst", email: senderEmail() },
        to: [{ email: to }],
        subject: "FeetFirst.ng test email",
        htmlContent: "<p>This is a test email from your FeetFirst.ng shop. If you can read this, emails are working.</p>"
    });

    if (sent.status >= 200 && sent.status < 300) {
        console.log(`\n✓ Brevo accepted the email to ${to} (message ${sent.data?.messageId || ""}).`);
        console.log("  If it doesn't arrive within a few minutes, check the spam folder, and Brevo: Transactional > Logs.\n");
        return;
    }

    console.log(`\n✗ Brevo rejected the email (${sent.status}): ${sent.data?.message || ""}`);
    console.log(explain(sent.status, sent.data?.message || "") + "\n");
    process.exit(1);

})().catch((err) => {
    console.error(`\nCouldn't reach Brevo: ${err.message}\nCheck your internet connection.\n`);
    process.exit(1);
});

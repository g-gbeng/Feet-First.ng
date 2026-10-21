/*
  Emails through Brevo's email API (https://www.brevo.com), the same way as TechRider:
  one HTTPS request per email, so it also works on hosts that block email ports
  (e.g. Render's free plan). Every piece of text is escaped before it goes into
  the HTML, so a name or message can't change the email's layout or add links.

  Without BREVO_API_KEY, emails are skipped (and logged), so the shop still works.
*/

const { env } = require("../config/env");

const EmailLog = require("../models/emailLog");

const isConfigured = () => !!env.email.brevoKey;

/* "FeetFirst <orders@feetfirst.ng>" -> { name, email } */
function sender() {
    const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(env.email.from);
    return match ? { name: match[1] || "FeetFirst", email: match[2] } : { name: "FeetFirst", email: env.email.from.trim() };
}

async function brevoSend({ to, subject, html }) {

    const res = await fetch(`${env.email.brevoBase}/v3/smtp/email`, {
        method: "POST",
        headers: { "api-key": env.email.brevoKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: sender(), to: [{ email: to }], subject, htmlContent: html })
    });

    if (!res.ok) {
        let detail = "";
        try {
            detail = (await res.json()).message || "";
        } catch {
            /* not JSON */
        }
        throw new Error(`Brevo could not send the email (${res.status}${detail ? ": " + detail : ""})`);
    }

}

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const money = (amount) => "₦" + Number(amount || 0).toLocaleString("en-NG");

/* Plain text paragraphs -> safe HTML (blank lines start a new paragraph) */
function paragraphs(textBody) {
    return String(textBody || "")
        .split(/\n{2,}/)
        .map((p) => `<p style="margin:0 0 16px">${esc(p).replace(/\n/g, "<br>")}</p>`)
        .join("");
}

function layout(innerHtml) {

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f4f4f4;font-family:Segoe UI,Arial,sans-serif;">
<table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#d4af37;padding:26px;text-align:center;color:#ffffff;font-size:26px;font-weight:bold;">FeetFirst.ng</td></tr>
<tr><td style="padding:32px 28px;font-size:16px;line-height:1.7;color:#333333;">${innerHtml}</td></tr>
<tr><td style="padding:20px;background:#fafafa;text-align:center;font-size:13px;color:#888888;">
Thank you for choosing <strong>FeetFirst.ng</strong><br><br>© ${new Date().getFullYear()} FeetFirst.ng
</td></tr>
</table>
</body>
</html>`;

}

function itemsTable(order) {

    const rows = (order.items || []).map((item) => `
<tr>
<td style="padding:8px 0;border-bottom:1px solid #eeeeee;">${esc(item.name)}<br><span style="color:#888888;font-size:13px;">Size ${esc(item.size)} × ${esc(item.qty)}</span></td>
<td style="padding:8px 0;border-bottom:1px solid #eeeeee;text-align:right;white-space:nowrap;">${money(item.price * item.qty)}</td>
</tr>`).join("");

    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;font-size:15px;">${rows}
${order.delivery?.zone ? `<tr><td style="padding:10px 0 0;color:#555555;">Subtotal</td><td style="padding:10px 0 0;text-align:right;color:#555555;">${money(order.subtotal)}</td></tr>
<tr><td style="padding:4px 0 0;color:#555555;">Delivery (${esc(order.delivery.area)})</td><td style="padding:4px 0 0;text-align:right;color:#555555;">${money(order.delivery.fee)}</td></tr>` : ""}
<tr><td style="padding:12px 0 0;font-weight:bold;">Total</td><td style="padding:12px 0 0;text-align:right;font-weight:bold;">${money(order.total)}</td></tr>
</table>`;

}

/* Writes the email history entry; a history problem never stops an email */
async function record(log, result, messages) {

    try {

        const status = result.skipped ? "skipped"
            : result.failed === 0 ? "sent"
            : result.sent === 0 ? "failed"
            : "partial";

        await EmailLog.create({
            kind: log.kind,
            toLabel: log.toLabel || (messages.length === 1 ? messages[0].to : `${messages.length} recipients`),
            recipients: messages.slice(0, 500).map((m) => m.to),
            recipientCount: messages.length,
            subject: log.subject || messages[0]?.subject || "",
            message: log.message || "",
            template: log.template ? { name: log.template } : undefined,
            orderId: log.orderId,
            status,
            sent: result.sent,
            failed: result.failed,
            failedRecipients: result.failedRecipients.slice(0, 100),
            reasons: result.skipped ? ["BREVO_API_KEY is not set, so the email wasn't sent."] : result.reasons.slice(0, 5),
            sentBy: log.sentBy
        });

    } catch (err) {
        console.error("Couldn't save email history:", err.message);
    }

}

/*
  Sends one email per recipient (so nobody sees anyone else's address),
  a few at a time, and records it in the email history.
  messages: [{ to, subject, html }]
  log: { kind, toLabel?, subject?, message?, template?, orderId?, sentBy? }
  Returns { sent, failed, skipped, failedRecipients, reasons }.
*/
async function sendMany(messages, log) {

    // e.g. orders from before checkout asked for an email
    messages = messages.filter((m) => m.to);

    const result = { sent: 0, failed: 0, skipped: false, failedRecipients: [], reasons: [] };

    if (!messages.length) return result;

    if (!isConfigured()) {

        console.log(`Email skipped (no BREVO_API_KEY): "${messages[0].subject}" to ${messages.length} recipient(s)`);

        result.skipped = true;

    } else {

        for (let i = 0; i < messages.length; i += 5) {

            const batch = messages.slice(i, i + 5);

            const outcomes = await Promise.allSettled(batch.map(brevoSend));

            outcomes.forEach((outcome, j) => {

                if (outcome.status === "fulfilled") {
                    result.sent++;
                    return;
                }

                result.failed++;
                result.failedRecipients.push(batch[j].to);

                if (!result.reasons.includes(outcome.reason.message)) result.reasons.push(outcome.reason.message);

                console.error("Email failed:", outcome.reason.message);

            });

        }

    }

    if (log) await record(log, result, messages);

    return result;

}

async function sendOne(to, subject, innerHtml, log) {
    return sendMany([{ to, subject, html: layout(innerHtml) }], log);
}

/* Never let an email problem break the request that triggered it */
function quietly(promise) {
    promise.catch((err) => console.error("Email failed:", err.message));
}

/* {{name}}, {{firstName}} and {{email}} in a template, filled in per recipient */
function fillPlaceholders(textBody, person) {

    const name = String(person.name || "").trim();

    const values = {
        name: name || "Customer",
        firstname: name.split(/\s+/)[0] || "Customer",
        email: person.email || ""
    };

    return String(textBody || "").replace(/\{\{\s*(name|firstName|email)\s*\}\}/gi, (_, key) => values[key.toLowerCase()]);

}

/* ---------------- the shop's emails ---------------- */

function welcome(user) {
    quietly(sendOne(user.email, "Welcome to FeetFirst.ng", `
<p style="margin:0 0 16px">Hello ${esc(user.name)},</p>
<p style="margin:0 0 16px">Welcome to the FeetFirst.ng family! Your account has been created successfully.</p>
<p style="margin:0">Have fun shopping!</p>`, { kind: "welcome", message: `Welcome email for ${user.name}'s new account.` }));
}

function orderConfirmed(order) {
    quietly(sendOne(order.email, `Order ${order.orderId} confirmed`, `
<p style="margin:0 0 16px">Hello ${esc(order.name)},</p>
<p style="margin:0 0 16px">We've received your payment. Your order <strong>${esc(order.orderId)}</strong> has been created, and we'll let you know when it's on its way.</p>
${itemsTable(order)}
<p style="margin:0">Delivering to: ${esc(order.address)}</p>`, { kind: "order-confirmed", orderId: order.orderId, message: `Payment received for order ${order.orderId} (${money(order.total)}).` }));
}

function orderShipped(order) {

    const rider = order.rider && (order.rider.name || order.rider.phone)
        ? `<p style="margin:0 0 16px">Your rider's details:<br>
Rider name: <strong>${esc(order.rider.name || "—")}</strong><br>
Rider number: <strong>${esc(order.rider.phone || "—")}</strong></p>`
        : "";

    quietly(sendOne(order.email, `Order ${order.orderId} is on its way`, `
<p style="margin:0 0 16px">Hello ${esc(order.name)},</p>
<p style="margin:0 0 16px">Good news! Your order <strong>${esc(order.orderId)}</strong> has been shipped.</p>
${rider}
<p style="margin:0">Thank you for shopping with FeetFirst.ng.</p>`, {
        kind: "order-shipped",
        orderId: order.orderId,
        message: `Order ${order.orderId} shipped.${order.rider && (order.rider.name || order.rider.phone) ? ` Rider: ${order.rider.name || "—"}, ${order.rider.phone || "—"}.` : ""}`
    }));

}

function orderDelivered(order) {
    quietly(sendOne(order.email, `Order ${order.orderId} delivered`, `
<p style="margin:0 0 16px">Hello ${esc(order.name)},</p>
<p style="margin:0 0 16px">Your order <strong>${esc(order.orderId)}</strong> has been delivered. We at FeetFirst.ng hope you enjoy your package.</p>
<p style="margin:0">Thank you for shopping with FeetFirst.ng.</p>`, { kind: "order-delivered", orderId: order.orderId, message: `Order ${order.orderId} delivered.` }));
}

/*
  The admin's own message (plain text, escaped), personalised per recipient.
  people: [{ email, name? }]
  log: { toLabel, template?, sentBy }
*/
function custom(people, subject, message, log = {}) {

    const messages = people.map((person) => ({
        to: person.email,
        subject: fillPlaceholders(subject, person),
        html: layout(paragraphs(fillPlaceholders(message, person)))
    }));

    return sendMany(messages, { kind: "admin", subject, message, ...log });

}

module.exports = { isConfigured, welcome, orderConfirmed, orderShipped, orderDelivered, custom };

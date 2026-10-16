/* =========================================
   PAYMENT RESULT
   Paystack sends the customer back here with
   ?reference=... ; the server checks with
   Paystack before showing "paid".
========================================= */

const params = new URLSearchParams(window.location.search);

// Paystack adds both "reference" and "trxref"
const reference = params.get("reference") || params.get("trxref") || "";

const statusIcon = document.getElementById("statusIcon");
const statusTitle = document.getElementById("statusTitle");
const statusText = document.getElementById("statusText");
const orderFacts = document.getElementById("orderFacts");
const testNote = document.getElementById("testNote");
const actions = document.getElementById("actions");
const retryBtn = document.getElementById("retryBtn");
const ordersLink = document.getElementById("ordersLink");
const shopLink = document.getElementById("shopLink");

let attempts = 0;

function show(state, title, text) {

    statusIcon.className = `statusIcon ${state}`;

    statusIcon.innerHTML = {
        checking: `<span class="spinner"></span>`,
        success: "✓",
        pending: "…",
        failed: "!"
    }[state];

    statusTitle.textContent = title;

    statusText.textContent = text;

    actions.hidden = state === "checking";

    retryBtn.hidden = state !== "pending";

    document.title = `${title} | Feet-First.ng`;

}

async function check() {

    if (!reference) {
        show("failed", "No payment to confirm", "We couldn't find a payment reference. If you paid, your order will appear in My Orders shortly.");
        return;
    }

    attempts++;

    show("checking", "Confirming your payment", "Please wait while we confirm your payment with Paystack. Don't close this page.");

    try {

        const data = await api("/api/payments/verify", { method: "POST", body: { reference } });

        if (data.orderId) {
            document.getElementById("factOrder").textContent = data.orderId;
            document.getElementById("factAmount").textContent = money(data.total);
            orderFacts.hidden = false;
        }

        testNote.hidden = !data.test;

        if (data.paid) {

            show("success", "Payment successful", "Thank you! Your order is confirmed. We'll email you when it ships, and you can follow it in My Orders.");

            shopLink.textContent = "Continue shopping";

            Shop.refreshCounts();

            return;

        }

        // Paystack can take a moment to settle a payment: check again a few times
        if (attempts < 4 && ["pending", "ongoing", "processing", "queued"].includes(data.status)) {
            setTimeout(check, 3000);
            show("checking", "Still confirming", "Paystack is still processing your payment. This usually takes a few seconds...");
            return;
        }

        if (["failed", "abandoned", "reversed"].includes(data.status)) {

            show("failed", "Payment not completed", "Your payment didn't go through and you haven't been charged. You can try again from My Orders.");

            ordersLink.textContent = "Try again from My Orders";

            return;

        }

        show("pending", "Payment not confirmed yet", "We haven't received confirmation from Paystack yet. If you completed the payment, check again in a minute.");

    } catch (err) {


        show("pending", "We couldn't confirm your payment", `${err.message} If money left your account, your order will be updated automatically.`);

    }

}

retryBtn.addEventListener("click", () => {
    attempts = 0;
    check();
});

// Shop.start() sends visitors who aren't logged in to the login page and back here
Shop.start().then(check);

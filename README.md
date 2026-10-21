# Feet-First.ng

Online sneaker store. Node.js, Express and MongoDB, with Paystack for payments and Brevo for emails.

## Run it locally

1. Install Node.js 20.19 or newer.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env` and fill in `MONGO_URI` and `JWT_SECRET` (the file explains each setting).
4. Admin account: put `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, run `npm run seed:admin`, then remove `ADMIN_PASSWORD` from `.env`.
   If the email already has an account, that account becomes an admin. Run it again any time to change the admin password.
5. `npm run dev`, then open http://localhost:3000.

The admin area is at `/admin-login.html`.

## How ordering and payment work

1. Customers create an account and log in. The login is kept in a secure cookie that page scripts can't read.
2. The cart and saved items are stored on the account, so they follow the customer to any device.
   (Carts and saved items from the old version of the site, which lived only in the browser, are moved into the account automatically the next time the customer logs in.)
3. At checkout the customer enters their delivery details. The server builds the order from the cart using the **prices in the database** (whatever the browser sends is ignored), then starts a Paystack payment for that exact total.
4. The customer pays on Paystack's page and comes back to `payment-callback.html`, which asks the server to confirm.
5. The server checks with Paystack that the full amount arrived before marking the order **paid**. Only then do the items leave the cart, and the customer gets a confirmation email.

Paystack also calls the webhook when a payment succeeds, so an order is still marked paid if the customer closes the page before coming back. Every 15 minutes the server also asks Paystack about payments that are still unconfirmed. Confirming the same payment twice is harmless.

Customers see their orders in **My Orders** (`orders.html`), with a **Pay now** button for unpaid ones. If a customer starts a new checkout without paying the previous one, the old unpaid order is set aside (it comes back automatically if it's paid after all).

## Delivery fees

At checkout the customer chooses their delivery area, grouped by zone, and that zone's fee is added to the total before they pay:

| Zone | Default fee | Areas (examples) |
| --- | --- | --- |
| Lagos Mainland | ₦3,000 | Ikeja, Yaba, Surulere, Gbagada, Festac... |
| Lagos Island | ₦5,000 | Victoria Island, Ikoyi, Lekki, Ajah... |
| Lagos outskirts | ₦6,000 | Badagry, Epe, Ikorodu, Ibeju-Lekki... |

Each zone also has an "Another area" choice for places that aren't listed.

- Change the fees in the admin dashboard under **Delivery fees**. New fees apply to new checkouts; orders already placed keep the fee they were placed with. A fee of ₦0 means free delivery.
- To add, remove or move areas, edit the lists in `services/delivery.js`.
- The server works out the fee from the area, so changing the price in the browser has no effect. Orders store the items subtotal, the delivery area and fee, and the total charged.

## The admin dashboard

- **To fulfil** lists paid orders. Mark one *shipped* with the rider's name and number (the customer gets an email with them), then *delivered* (the customer gets a thank-you email).
- **Awaiting payment** lists unpaid orders. They can only stay pending or be cancelled; don't send them until they're paid.
- Orders paid through Paystack can't be deleted, so there's always a record of the payment. Cancel them instead, and refund from the Paystack dashboard.
- **Send email** to one customer, or to ALL USERS. ALL USERS sends a separate email to each customer, so nobody sees anyone else's address. Messages are sent as plain text. Pick a template to fill in the subject and message, then change anything before sending.
- **Email templates**: create, edit and delete reusable emails. `{{firstName}}`, `{{name}}` and `{{email}}` are filled in with each customer's details when sending (anyone who isn't a customer gets "Customer"). Text in square brackets, like `[order number]`, is for you to fill in; the page warns you if you try to send one unfilled. The first time the page opens it adds three starter templates from the original drafts (welcome, shipped, delivered); delete any you don't want.
- **Email history** lists every email the shop sends: yours and the automatic ones (welcome, order confirmed, shipped, delivered). Each entry shows who it went to, whether it was sent, and Brevo's reason if it failed. Filter to "Failed or not sent" to spot problems.

## Paystack setup

**Test mode.** With `PAYSTACK_SECRET_KEY` empty, payments are simulated: paying goes straight to the success page, marked *Test mode*. No money moves.

**Real checkout:**

1. In the Paystack dashboard, go to *Settings > API Keys & Webhooks* and copy your **test** secret key (`sk_test_...`).
2. Put it in `.env` as `PAYSTACK_SECRET_KEY` and restart the server.
3. Pay with one of Paystack's test cards to try it.
4. Online, set the **Webhook URL** on the same Paystack page to `https://YOUR-SITE/api/payments/webhook`.
5. When you're ready for real customers, switch to your **live** secret key (`sk_live_...`).

**Orders from before Paystack.** Orders placed through the old WhatsApp checkout have no payment record. The first time the server starts, it marks them "Paid before Paystack" (except cancelled ones), so they keep showing as normal orders and count towards revenue. If one of them was never actually paid, cancel it.

## Emails

Emails go through Brevo's email API: welcome, order confirmed, order shipped (with the rider's details), order delivered, and the admin's own messages. Without `BREVO_API_KEY` they're skipped and the shop works as normal.

To set it up:

1. In Brevo, go to *SMTP & API > API Keys* and create an API key. Put it in `BREVO_API_KEY`.
2. In *Senders, Domains & Dedicated IPs*, add and verify the address emails come from, and put it in `EMAIL_FROM`, e.g. `FeetFirst <orders@feetfirst.ng>`. Verifying your whole domain (not just one address) keeps emails out of spam.

Brevo's free plan sends up to 300 emails a day. An ALL USERS email counts one per customer.

The emails go over HTTPS rather than the usual email ports, so they work on hosts that block those ports (e.g. Render's free plan).

## Going live

On your host (Render, Railway, ...), set these environment variables:

- `NODE_ENV` = `production`
- `MONGO_URI`, `JWT_SECRET`
- `PAYSTACK_SECRET_KEY`
- `PUBLIC_URL` = your site's address, e.g. `https://feetfirst.ng`
- `BREVO_API_KEY` and `EMAIL_FROM` for emails

The server refuses to start in production without a Paystack key, unless `SIMULATE_PAYMENTS=true` is set. That setting fakes payments for trying the site out, so remove it before real customers use the site.

**Never commit `.env`.** It's listed in `.gitignore`.

## Project layout

```
server.js              starts the app
config/                settings (.env) and database connection
models/                User, Product, Cart, Order
routes/                the API: users, products, cart, favorites, orders, payments, admin
services/paystack.js   talks to Paystack
services/orders.js     starting and confirming payments
services/email.js      the emails (Brevo)
middleware/            login checks and the login rate limit
public/                the website: one .html, .css and .js file per page
  css/common.css       styles shared by every page
  js/common.js         helpers shared by every page
  js/shop.js           customer pages: login check, top bar, menu, cart and saved items
  *-section.html       the 8 brand pages share css/pages/collection.css and js/pages/collection.js
```

The background photos have smaller `.webp` copies next to them in `public/images`. Browsers that support WebP get those automatically.

## Products

- `npm run seed:products` adds the products in `seedProducts.js`, or updates them if they're already in the shop. Existing products keep their IDs, so carts, saved items and orders keep working. Products removed from the list are left alone (set `inStock: false` to hide one).
- `npm run seed:products:fresh` deletes every product and loads the list from scratch. Past orders keep their own copy of each item's name, price and photo, so they're unaffected. Customers' carts and saved items are emptied.

Both work on the database in `MONGO_URI`, so check which one that is before running them.

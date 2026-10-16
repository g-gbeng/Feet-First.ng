# Feet-First.ng

Online sneaker store. Node.js, Express and MongoDB, with Paystack for payments and Resend for emails.

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

## The admin dashboard

- **To fulfil** lists paid orders. Mark one *shipped* with the rider's name and number (the customer gets an email with them), then *delivered* (the customer gets a thank-you email).
- **Awaiting payment** lists unpaid orders. They can only stay pending or be cancelled; don't send them until they're paid.
- Orders paid through Paystack can't be deleted, so there's always a record of the payment. Cancel them instead, and refund from the Paystack dashboard.
- **Send email** to one customer, or to ALL USERS. ALL USERS sends a separate email to each customer, so nobody sees anyone else's address. Messages are sent as plain text.

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

Emails go through Resend: welcome, order confirmed, order shipped (with the rider's details), order delivered, and the admin's own messages. Without `RESEND_API_KEY` they're skipped and the shop works as normal.

`onboarding@resend.dev` (the default sender) only delivers to the email address of your own Resend account. To email customers, verify your domain in Resend and set `EMAIL_FROM`, e.g. `FeetFirst <orders@feetfirst.ng>`.

## Going live

On your host (Render, Railway, ...), set these environment variables:

- `NODE_ENV` = `production`
- `MONGO_URI`, `JWT_SECRET`
- `PAYSTACK_SECRET_KEY`
- `PUBLIC_URL` = your site's address, e.g. `https://feetfirst.ng`
- `RESEND_API_KEY` and `EMAIL_FROM` for emails

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
services/email.js      the emails (Resend)
middleware/            login checks and the login rate limit
public/                the website: one .html, .css and .js file per page
  css/common.css       styles shared by every page
  js/common.js         helpers shared by every page
  js/shop.js           customer pages: login check, top bar, menu, cart and saved items
  *-section.html       the 8 brand pages share css/pages/collection.css and js/pages/collection.js
```

The background photos have smaller `.webp` copies next to them in `public/images`. Browsers that support WebP get those automatically.

`npm run seed:products` adds the products in `seedProducts.js`, or updates them if they're already in the shop. Existing products keep their IDs, so carts, saved items and orders keep working.

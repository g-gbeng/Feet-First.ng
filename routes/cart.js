/*
  The customer's cart, kept on the server.
  Prices are never stored here: they're read from the products every time,
  so the cart always shows (and checkout always charges) the current price.
*/

const express = require("express");

const router = express.Router();

const Cart = require("../models/cart");
const Product = require("../models/product");

const auth = require("../middleware/auth");

const { HttpError, isObjectId } = require("../utils/http");

const MAX_QTY = 10;

router.use(auth);

/*
  Changes to one customer's cart run one at a time (e.g. two quick taps on
  "Add to cart"), so neither change is lost and the cart is only created once.
*/
const queues = new Map();

function oneAtATime(req, res, next) {

    const key = String(req.user._id);

    const previous = queues.get(key) || Promise.resolve();

    const current = previous.then(() => new Promise((resolve) => {
        res.on("finish", resolve);
        res.on("close", resolve);
        next();
    }));

    queues.set(key, current);

    current.then(() => {
        if (queues.get(key) === current) queues.delete(key);
    });

}

router.use((req, res, next) => (req.method === "GET" ? next() : oneAtATime(req, res, next)));

async function getCart(userId) {
    return (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
}

/* The cart as the pages show it */
async function cartView(cart) {

    const ids = cart.items.map((item) => item.productId);

    const products = await Product.find({ _id: { $in: ids } }).select("name brand price sizes image inStock").lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));

    const items = [];

    let subtotal = 0;
    let count = 0;

    for (const item of cart.items) {

        const product = byId.get(String(item.productId));

        if (!product) continue; // product removed from the shop

        const available = product.inStock && product.sizes.includes(item.size);

        items.push({
            productId: product._id,
            name: product.name,
            brand: product.brand,
            image: product.image,
            price: product.price,
            size: item.size,
            quantity: item.quantity,
            available
        });

        count += item.quantity;

        if (available) subtotal += product.price * item.quantity;

    }

    return { success: true, items, count, subtotal };

}

/* Checks the product and size; returns the product */
async function checkProduct(productId, size) {

    if (!isObjectId(productId)) throw new HttpError(400, "Unknown product.");

    const product = await Product.findById(productId).select("name sizes inStock").lean();

    if (!product) throw new HttpError(404, "That product is no longer available.");

    if (!product.inStock) throw new HttpError(400, `${product.name} is out of stock.`);

    if (!product.sizes.includes(size)) throw new HttpError(400, "Please choose one of the available sizes.");

    return product;

}

const toSize = (value) => Number(value);

const toQty = (value, fallback = 1) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
};

/* GET /api/cart */
router.get("/", async (req, res) => {

    res.json(await cartView(await getCart(req.user._id)));

});

/* POST /api/cart/items  { productId, size, quantity? }  — adds to what's already there */
router.post("/items", async (req, res) => {

    const size = toSize(req.body.size);
    const quantity = Math.max(1, toQty(req.body.quantity));

    await checkProduct(req.body.productId, size);

    const cart = await getCart(req.user._id);

    const line = cart.items.find((item) => String(item.productId) === String(req.body.productId) && item.size === size);

    if (line) {
        line.quantity = Math.min(MAX_QTY, line.quantity + quantity);
    } else {
        cart.items.push({ productId: req.body.productId, size, quantity: Math.min(MAX_QTY, quantity) });
    }

    await cart.save();

    res.json(await cartView(cart));

});

/* PATCH /api/cart/items  { productId, size, quantity }  — 0 removes the item */
router.patch("/items", async (req, res) => {

    const size = toSize(req.body.size);
    const quantity = toQty(req.body.quantity, -1);

    if (quantity < 0 || quantity > MAX_QTY) throw new HttpError(400, `Quantity must be between 0 and ${MAX_QTY}.`);

    const cart = await getCart(req.user._id);

    const index = cart.items.findIndex((item) => String(item.productId) === String(req.body.productId) && item.size === size);

    if (index === -1) throw new HttpError(404, "That item isn't in your cart.");

    if (quantity === 0) cart.items.splice(index, 1);
    else cart.items[index].quantity = quantity;

    await cart.save();

    res.json(await cartView(cart));

});

/* DELETE /api/cart  — empties the cart */
router.delete("/", async (req, res) => {

    const cart = await getCart(req.user._id);

    cart.items = [];

    if (!cart.isNew) await cart.save();

    res.json(await cartView(cart));

});

/*
  POST /api/cart/merge  { items: [{ productId, size, quantity }] }
  Moves a cart saved in the browser by the old version of the site into the account.
  Items that no longer exist, are out of stock or have an unknown size are skipped.
*/
router.post("/merge", async (req, res) => {

    const incoming = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];

    const cart = await getCart(req.user._id);

    const ids = incoming.map((i) => i && i.productId).filter(isObjectId);

    const products = await Product.find({ _id: { $in: ids } }).select("sizes inStock").lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));

    for (const item of incoming) {

        const product = item && byId.get(String(item.productId));

        const size = toSize(item && item.size);

        const quantity = Math.min(MAX_QTY, Math.max(1, toQty(item && item.quantity)));

        if (!product || !product.inStock || !product.sizes.includes(size)) continue;

        const line = cart.items.find((l) => String(l.productId) === String(product._id) && l.size === size);

        if (line) line.quantity = Math.max(line.quantity, quantity);
        else cart.items.push({ productId: product._id, size, quantity });

    }

    if (cart.items.length || !cart.isNew) await cart.save();

    res.json(await cartView(cart));

});

module.exports = router;
module.exports.cartView = cartView;

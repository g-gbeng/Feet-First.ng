/*
  Saved items, kept on the customer's account so they follow them to any device.
*/

const express = require("express");

const router = express.Router();

const User = require("../models/user");
const Product = require("../models/product");

const auth = require("../middleware/auth");

const { HttpError, isObjectId } = require("../utils/http");

const MAX_FAVORITES = 200;

router.use(auth);

async function favoritesView(userId) {

    const user = await User.findById(userId).select("favorites").lean();

    const ids = user?.favorites || [];

    const products = await Product.find({ _id: { $in: ids } }).select("name brand price sizes image inStock").lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));

    // newest saved first; products removed from the shop drop out
    const items = ids.map((id) => byId.get(String(id))).filter(Boolean).reverse();

    return { success: true, items, ids: items.map((p) => String(p._id)) };

}

/* GET /api/favorites */
router.get("/", async (req, res) => {

    res.json(await favoritesView(req.user._id));

});

/* POST /api/favorites/merge  { ids: [...] }  — saved items from the old version of the site */
router.post("/merge", async (req, res) => {

    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter(isObjectId).slice(0, 100);

    const existing = await Product.find({ _id: { $in: ids } }).select("_id").lean();

    if (existing.length) {
        await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: { $each: existing.map((p) => p._id) } } });
    }

    res.json(await favoritesView(req.user._id));

});

/* POST /api/favorites/:productId */
router.post("/:productId", async (req, res) => {

    const id = req.params.productId;

    if (!isObjectId(id) || !(await Product.exists({ _id: id }))) throw new HttpError(404, "Product not found.");

    if ((req.user.favorites || []).length >= MAX_FAVORITES) throw new HttpError(400, "You've saved the maximum number of items.");

    await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: id } });

    res.json(await favoritesView(req.user._id));

});

/* DELETE /api/favorites/:productId */
router.delete("/:productId", async (req, res) => {

    if (!isObjectId(req.params.productId)) throw new HttpError(404, "Product not found.");

    await User.updateOne({ _id: req.user._id }, { $pull: { favorites: req.params.productId } });

    res.json(await favoritesView(req.user._id));

});

/* DELETE /api/favorites  — clears all saved items */
router.delete("/", async (req, res) => {

    await User.updateOne({ _id: req.user._id }, { $set: { favorites: [] } });

    res.json(await favoritesView(req.user._id));

});

module.exports = router;

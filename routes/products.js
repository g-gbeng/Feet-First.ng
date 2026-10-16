const express = require("express");

const router = express.Router();

const Product = require("../models/product");

const { HttpError, isObjectId } = require("../utils/http");

const FIELDS = "name variant brand price sizes image inStock";

/* GET /api/products?brand=Adidas */
router.get("/", async (req, res) => {

    const brand = typeof req.query.brand === "string" ? req.query.brand.slice(0, 60) : "";

    const products = await Product.find(brand ? { brand } : {})
        .select(FIELDS)
        .sort({ inStock: -1, price: 1 })
        .lean();

    res.set("Cache-Control", "public, max-age=60");

    res.json(products);

});

/* GET /api/products/:id */
router.get("/:id", async (req, res) => {

    const product = isObjectId(req.params.id) && await Product.findById(req.params.id).select(FIELDS).lean();

    if (!product) throw new HttpError(404, "Product not found.");

    res.json(product);

});

module.exports = router;

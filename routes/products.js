const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

/* =========================
   GET ALL PRODUCTS
========================= */
router.get("/", async (req, res) => {
  try {
    console.log("DB NAME:", Product.db.name);
    console.log("COLLECTION:", Product.collection.name);

    const { brand } = req.query;
    const filter = brand ? { brand } : {};

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});


module.exports = router;

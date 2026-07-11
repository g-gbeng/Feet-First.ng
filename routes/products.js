const express = require("express");
const router = express.Router();
const Product = require("../models/product");

/* =====================================
   GET ALL PRODUCTS
===================================== */
router.get("/", async (req, res) => {
  try {

    const { brand } = req.query;

    const filter = brand
      ? { brand }
      : {};

    const products = await Product.find(filter);

    res.json(products);

  } catch (err) {

    console.error("GET PRODUCTS ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch products"
    });

  }
});


/* =====================================
   GET SINGLE PRODUCT
===================================== */
router.get("/:id", async (req, res) => {

  try {

    const product = await Product.findById(req.params.id);

    if (!product) {

      return res.status(404).json({
        message: "Product not found"
      });

    }

    res.json(product);

  } catch (err) {

    console.error("GET PRODUCT ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch product"
    });

  }

});


module.exports = router;
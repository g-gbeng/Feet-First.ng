const express = require("express");
const path = require("path");
require("dotenv").config();
const connectDB = require("./config/db");

const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const adminAuth = require("./middleware/adminAuth");
const productRoutes = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- DATABASE -------------------- */
connectDB();

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================================
   🔒 PROTECT ADMIN PAGE FIRST
================================ */
app.get("/admin-dashboard.html", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin-dashboard.html"));
});

/* ================================
   STATIC FILES (AFTER PROTECTION)
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- ROUTES -------------------- */
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

/* -------------------- SERVER -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
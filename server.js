const express = require("express");
const path = require("path");
require("dotenv").config();
const connectDB = require("./config/db");

const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- DATABASE -------------------- */
connectDB();

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- ROUTES -------------------- */
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

const productRoutes = require("./routes/products");

app.use("/api/products", productRoutes);


/* -------------------- SERVER -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

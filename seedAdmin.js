/*
  Creates the admin account, or makes an existing account an admin and sets its password.

  Put ADMIN_EMAIL and ADMIN_PASSWORD in .env, run `npm run seed:admin`,
  then remove ADMIN_PASSWORD from .env. Run it again any time to change the password.
*/

require("dotenv").config({ quiet: true });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/user");

async function run() {

    const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = String(process.env.ADMIN_PASSWORD || "");
    const name = String(process.env.ADMIN_NAME || "FeetFirst Admin").trim();

    if (!email || !password) {
        throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.");
    }

    if (!/^(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/.test(password)) {
        throw new Error("ADMIN_PASSWORD must be at least 8 characters and include a number and a special character.");
    }

    await connectDB();

    const hashed = await bcrypt.hash(password, 10);

    const existing = await User.findOne({ email });

    if (existing) {
        existing.isAdmin = true;
        existing.password = hashed;
        await existing.save();
        console.log(`${email} is now an admin, with the new password.`);
    } else {
        await User.create({ name, email, password: hashed, isAdmin: true });
        console.log(`Admin account created for ${email}.`);
    }

    console.log("You can now remove ADMIN_PASSWORD from .env.");

}

run()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());

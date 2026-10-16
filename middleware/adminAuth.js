/*
  Signed-in admin. The admin cookie is checked, and the account must still be an admin
  in the database (so removing isAdmin takes effect straight away).
*/

const User = require("../models/user");

const { readSession, signOut } = require("../utils/http");

async function adminAuth(req, res, next) {

    const session = readSession(req, "admin");

    const admin = session && session.isAdmin
        ? await User.findOne({ _id: session.id, isAdmin: true }).select("name email isAdmin")
        : null;

    if (!admin) {

        if (session) signOut(res, "admin");

        return res.status(401).json({ success: false, message: "Please log in as an admin." });

    }

    req.admin = admin;

    next();

}

module.exports = adminAuth;

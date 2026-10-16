/*
  Signed-in customer. Reads the sign-in cookie, loads the user and puts it on req.user.
*/

const User = require("../models/user");

const { readSession, signOut } = require("../utils/http");

async function auth(req, res, next) {

    const session = readSession(req, "user");

    const user = session && await User.findById(session.id).select("-password");

    if (!user) {

        if (session) signOut(res, "user");

        return res.status(401).json({ success: false, message: "Please log in to continue." });

    }

    req.user = user;

    next();

}

module.exports = auth;

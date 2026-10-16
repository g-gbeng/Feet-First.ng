/*
  Customer accounts: sign up, log in, log out, profile and password.
  Signing in sets an httpOnly cookie (see utils/http.js); pages never see the token.
*/

const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

const User = require("../models/user");

const auth = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");

const email = require("../services/email");

const { HttpError, signIn, signOut, text, EMAIL } = require("../utils/http");

// at least 8 characters, with a number and a symbol
const PASSWORD_RULE = /^(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/;
const PASSWORD_MESSAGE = "Password must be at least 8 characters and include a number and a special character.";

const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many attempts. Please wait 15 minutes and try again."
});

const signupLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many sign-ups from this connection. Please try again later."
});

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, profileImage: user.profileImage || "" });

/* POST /api/users/register  { name, email, password } — also signs the new customer in */
router.post("/register", signupLimit, async (req, res) => {

    const name = text(req.body.name, 80);
    const userEmail = text(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || "");

    const errors = {};

    if (!name) errors.name = "Please enter your name.";
    if (!EMAIL.test(userEmail)) errors.email = "Please enter a valid email address.";
    if (!PASSWORD_RULE.test(password)) errors.password = PASSWORD_MESSAGE;

    if (Object.keys(errors).length) {
        throw new HttpError(400, Object.values(errors)[0], { errors });
    }

    if (await User.exists({ email: userEmail })) {
        throw new HttpError(400, "That email already has an account. Please log in instead.", { errors: { email: "That email already has an account." } });
    }

    let user;

    try {
        user = await User.create({ name, email: userEmail, password: await bcrypt.hash(password, 10) });
    } catch (err) {
        if (err.code === 11000) throw new HttpError(400, "That email already has an account. Please log in instead.");
        throw err;
    }

    signIn(res, "user", { id: user._id });

    email.welcome(user);

    res.status(201).json({ success: true, message: "Account created.", user: publicUser(user) });

});

/* POST /api/users/login  { email, password } */
router.post("/login", loginLimit, async (req, res) => {

    const userEmail = text(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || "");

    if (!userEmail || !password) throw new HttpError(400, "Email and password are required.");

    const user = await User.findOne({ email: userEmail });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new HttpError(400, "Incorrect email or password.");
    }

    signIn(res, "user", { id: user._id });

    res.json({ success: true, message: "Login successful", user: publicUser(user) });

});

/* POST /api/users/logout */
router.post("/logout", (req, res) => {

    signOut(res, "user");

    res.json({ success: true });

});

/* GET /api/users/me */
router.get("/me", auth, (req, res) => {

    res.json({ success: true, user: publicUser(req.user) });

});

/* PUT /api/users/profile  { name } */
router.put("/profile", auth, async (req, res) => {

    const name = text(req.body.name, 80);

    if (!name) throw new HttpError(400, "Name is required.");

    req.user.name = name;

    await req.user.save();

    res.json({ success: true, user: publicUser(req.user) });

});

/* PUT /api/users/password  { currentPassword, newPassword } */
router.put("/password", auth, loginLimit, async (req, res) => {

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    const user = await User.findById(req.user._id);

    if (!(await bcrypt.compare(currentPassword, user.password))) {
        throw new HttpError(400, "Your current password is incorrect.", { errors: { currentPassword: "Incorrect password." } });
    }

    if (!PASSWORD_RULE.test(newPassword)) {
        throw new HttpError(400, PASSWORD_MESSAGE, { errors: { newPassword: PASSWORD_MESSAGE } });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    res.json({ success: true, message: "Password changed." });

});

module.exports = router;

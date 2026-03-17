const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).send("Access denied");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).send("Not authorized");
    }

    req.admin = decoded;
    next();

  } catch (err) {
    res.status(401).send("Invalid token");
  }
};
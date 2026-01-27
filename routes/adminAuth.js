if (!user.isAdmin) {
  return res.status(403).json({ message: "Not an admin" });
}

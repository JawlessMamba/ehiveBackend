// middleware/authenticate.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "1dikjsaciwndvc";

exports.authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer TOKEN"
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // This must match the payload from signIn
    req.user = {
      id: decoded.userId,  // <-- use userId from token payload
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

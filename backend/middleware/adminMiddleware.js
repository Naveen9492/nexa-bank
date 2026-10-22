const jwt = require("jsonwebtoken");

const adminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing or invalid",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!["admin", "manager"].includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins/managers only.",
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
module.exports = adminMiddleware;

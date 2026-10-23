const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  addAdminOrManager,
  login,
  resetPassword,
} = require("../controllers/authController");

router.post("/add-admin-manager", adminMiddleware, addAdminOrManager);
router.post("/login", login);
router.patch("/reset-password", resetPassword);

module.exports = router;

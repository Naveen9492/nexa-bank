const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");

const { addAdminOrManager, login } = require("../controllers/authController");

router.post("/add-admin-manager", adminMiddleware, addAdminOrManager);
router.post("/login", login);

module.exports = router;

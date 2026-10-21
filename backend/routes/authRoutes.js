const express = require("express");
const router = express.Router();

const { addAdminOrManager, login } = require("../controllers/authController");

router.post("/add-admin-manager", addAdminOrManager);
router.post("/login", login);

module.exports = router;

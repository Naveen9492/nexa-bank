const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");
const customerMiddleware = require("../middleware/customerMiddleware");

const { submitKYC } = require("../controllers/kycController");

router.patch("/kyc/submit", customerMiddleware, submitKYC);

module.exports = router;

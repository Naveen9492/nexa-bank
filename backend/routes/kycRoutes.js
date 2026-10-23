const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");
const customerMiddleware = require("../middleware/customerMiddleware");

const {
  submitKYC,
  getKYCStatus,
  getAllKycUnderReview,
  reviewKyc,
} = require("../controllers/kycController");

router.patch("/kyc/submit", customerMiddleware, submitKYC);
router.get("/kyc/status", customerMiddleware, getKYCStatus);
router.get("/kyc/under-review", adminMiddleware, getAllKycUnderReview);
router.patch("/kyc/:applicationId/review", adminMiddleware, reviewKyc);

module.exports = router;

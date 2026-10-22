const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  submitApplication,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  resubmitApplication,
} = require("../controllers/applicationController");

router.post("/submit-application", submitApplication);
router.get("/applications", adminMiddleware, getAllApplications);
router.get("/applications/:applicationId", getApplicationById);
router.patch(
  "/applications/:applicationId/approve",
  adminMiddleware,
  approveApplication,
);
router.patch(
  "/applications/:applicationId/reject",
  adminMiddleware,
  rejectApplication,
);

router.patch("/applications/:applicationId/resubmit", resubmitApplication);

module.exports = router;

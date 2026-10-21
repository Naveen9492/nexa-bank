const express = require("express");
const router = express.Router();

const {
  submitApplication,
  getAllApplications,
  getApplicationById,
  approveApplication,
} = require("../controllers/applicationController");

router.post("/submit-application", submitApplication);
router.get("/all-applications", getAllApplications);
router.get("/all-applications/:applicationId", getApplicationById);
router.patch("/all-applications/:applicationId/approve", approveApplication);

module.exports = router;

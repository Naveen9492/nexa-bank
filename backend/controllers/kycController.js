const User = require("../model/userModel");
const Applications = require("../model/applicationModel");

const submitKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("application");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.application) {
      return res.status(404).json({
        success: false,
        message: "No application linked to this user",
      });
    }

    const application = await Applications.findById(user.application);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (
      !["Under Review", "Correction Requested", "Approved"].includes(
        application.kyc.status,
      )
    ) {
      return res.status(409).json({
        success: false,
        message: `KYC cannot be submitted in its ${application.kyc.status} status`,
      });
    }

    application.kyc.status = "Under Review";
    application.kyc.kycComment = null;
    application.kyc.requestedDocuments = [];
    await application.save();

    return res.status(200).json({
      success: true,
      message: "KYC submitted successfully",
      data: {
        applicationId: application.applicationId,
        kycStatus: application.kyc.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { submitKYC };

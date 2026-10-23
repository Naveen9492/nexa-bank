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

    if (["Under Review", "Approved"].includes(application.kyc.status)) {
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

const getKYCStatus = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: "KYC status retrieved successfully",
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

const getAllKycUnderReview = async (req, res) => {
  try {
    const applications = await Applications.find({
      "kyc.status": "Under Review",
    }).sort({ updatedAt: -1 });

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No KYCs with status Under Review",
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC applications under review retrieved successfully",
      count: applications.length,
      applications: applications.map((each) => ({
        _id: each._id,
        name: each.firstName + " " + each.lastName,
        email: each.email,
        applicationId: each.applicationId,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const reviewKyc = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, comment, requestedDocuments = [] } = req.body;

    const allowedActions = ["Approved", "Rejected", "Correction Requested"];

    if (!applicationId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Action must be one of: ${allowedActions.join(", ")}`,
      });
    }

    if (
      typeof comment !== "string" ||
      !comment.trim() ||
      comment.trim().length > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "A comment is required and must not exceed 500 characters",
      });
    }

    if (
      action === "Correction Requested" &&
      (!Array.isArray(requestedDocuments) ||
        requestedDocuments.length === 0 ||
        requestedDocuments.some(
          (doc) => typeof doc !== "string" || !doc.trim(),
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid requested documents are required",
      });
    }

    const application = await Applications.findOne({
      applicationId: applicationId.trim(),
    }).select("applicationId kyc");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.kyc.status === "Approved") {
      return res.status(409).json({
        success: false,
        message: "Approved KYC cannot be changed",
      });
    }

    if (application.kyc.status !== "Under Review") {
      return res.status(409).json({
        success: false,
        message: "Only KYC under review can be reviewed",
      });
    }

    const updatedApplication = await Applications.findOneAndUpdate(
      {
        _id: application._id,
        "kyc.status": "Under Review",
      },
      {
        $set: {
          "kyc.status": action,
          "kyc.kycReviewedBy": req.user._id,
          "kyc.kycReviewedAt": new Date(),
          "kyc.kycComment": comment.trim(),
          "kyc.requestedDocuments":
            action === "Correction Requested"
              ? requestedDocuments.map((doc) => doc.trim())
              : [],
          ...(action === "Approved"
            ? {
                "kyc.panVerified": true,
                "kyc.aadhaarVerified": true,
              }
            : {}),
        },
      },
      { returnDocument: "after", runValidators: true },
    ).select("applicationId kyc");

    if (!updatedApplication) {
      return res.status(409).json({
        success: false,
        message: "KYC status has changed. Please refresh and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `KYC ${action.toLowerCase()} successfully`,
      data: {
        applicationId: updatedApplication.applicationId,
        kycStatus: updatedApplication.kyc.status,
        panVerified: updatedApplication.kyc.panVerified,
        aadhaarVerified: updatedApplication.kyc.aadhaarVerified,
        kycReviewedBy: updatedApplication.kyc.kycReviewedBy,
        kycReviewedAt: updatedApplication.kyc.kycReviewedAt,
        kycComment: updatedApplication.kyc.kycComment,
        requestedDocuments: updatedApplication.kyc.requestedDocuments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { submitKYC, getKYCStatus, getAllKycUnderReview, reviewKyc };

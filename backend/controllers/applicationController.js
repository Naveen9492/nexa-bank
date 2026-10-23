const Applications = require("../model/applicationModel");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const BankAccount = require("../model/bankAccountModel");

const submitApplication = async (req, res) => {
  try {
    const rules = [
      body("firstName").trim().notEmpty().withMessage("Firstname is required"),
      body("lastName").trim().notEmpty().withMessage("Lastname is required"),
      body("gender")
        .trim()
        .notEmpty()
        .withMessage("Gender is required")
        .bail()
        .toLowerCase()
        .isIn(["male", "female", "other"])
        .withMessage("Please select a valid gender"),
      body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),
      body("phone")
        .trim()
        .notEmpty()
        .withMessage("Mobile number is required")
        .bail()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Please enter a valid 10-digit Indian mobile number"),
      body("dob")
        .notEmpty()
        .withMessage("Date of birth is required")
        .bail()
        .isISO8601({ strict: true })
        .withMessage("Please enter a valid date of birth")
        .bail()
        .custom((value) => {
          const dob = new Date(value);
          const today = new Date();
          const minAgeDate = new Date(
            today.getFullYear() - 18,
            today.getMonth(),
            today.getDate(),
          );
          if (dob > today) {
            throw new Error("Date of birth cannot be in the future");
          }
          if (dob > minAgeDate) {
            throw new Error("You must be at least 18 years old");
          }
          return true;
        }),
      body("maritalStatus")
        .trim()
        .notEmpty()
        .withMessage("Marital status is required")
        .bail()
        .isIn(["Single", "Married", "Divorced", "Widowed", "Separated"])
        .withMessage("Please select a valid marital status"),
      body("address").isObject().withMessage("Address must be an object"),
      body("address.street")
        .trim()
        .notEmpty()
        .withMessage("Street address is required"),

      body("address.city").trim().notEmpty().withMessage("City is required"),

      body("address.state").trim().notEmpty().withMessage("State is required"),

      body("address.country")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Country cannot be empty"),

      body("address.pincode")
        .trim()
        .notEmpty()
        .withMessage("PIN code is required")
        .bail()
        .matches(/^\d{6}$/)
        .withMessage("Please enter a valid 6-digit Indian PIN code"),
      body("panCard")
        .trim()
        .toUpperCase()
        .notEmpty()
        .withMessage("PAN number is required")
        .bail()
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
        .withMessage("Please enter a valid PAN number (e.g., ABCDE1234F)"),
      body("aadhaarCard")
        .trim()
        .notEmpty()
        .withMessage("Aadhaar number is required")
        .bail()
        .matches(/^[2-9]\d{11}$/)
        .withMessage("Please enter a valid 12-digit Aadhaar number"),
      body("occupation")
        .trim()
        .notEmpty()
        .withMessage("Occupation is required")
        .bail()
        .isIn([
          "Student",
          "Salaried",
          "Self-employed",
          "Business",
          "Unemployed",
          "Retired",
          "Homemaker",
          "Other",
        ])
        .withMessage("Please select a valid occupation"),
      body("accountType")
        .trim()
        .notEmpty()
        .withMessage("Account type is required")
        .bail()
        .isIn(["Savings", "Current"])
        .withMessage("Account type must be Savings or Current"),

      body("debitCardRequired")
        .exists()
        .withMessage("Please specify whether a debit card is required")
        .bail()
        .isBoolean()
        .withMessage("Debit card required must be true or false"),

      body("internetBanking")
        .exists()
        .withMessage("Please specify whether internet banking is required")
        .bail()
        .isBoolean()
        .withMessage("Internet banking must be true or false"),

      body("acceptTnC")
        .exists()
        .isBoolean()
        .withMessage("Please accept terms and conditions")
        .custom((value) => value === true)
        .withMessage("Please accept terms and conditions"),
      body("nominee.name")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Nominee name must be 2 to 100 characters"),

      body("nominee.relationship")
        .optional({ nullable: true, checkFalsy: true })
        .isIn(["Father", "Mother", "Spouse"])
        .withMessage("Please select a valid nominee relationship"),

      body("nominee.dob")
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601({ strict: true })
        .withMessage("Please enter a valid nominee date of birth")
        .bail()
        .custom((value) => {
          if (new Date(value) > new Date()) {
            throw new Error("Nominee date of birth cannot be in the future");
          }
          return true;
        }),
    ];
    for (const rule of rules) {
      await rule.run(req);

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }
    }
    const {
      firstName,
      lastName,
      gender,
      email,
      phone,
      dob,
      maritalStatus,
      address,
      panCard,
      aadhaarCard,
      occupation,
      accountType,
      debitCardRequired,
      internetBanking,
      acceptTnC,
      nominee,
    } = req.body;
    const application = await Applications.create({
      firstName,
      lastName,
      gender,
      email,
      phone,
      dob,
      maritalStatus,
      address,
      panCard,
      aadhaarCard,
      occupation,
      accountType,
      debitCardRequired,
      internetBanking,
      acceptTnC,
      nominee,
    });
    return res.status(201).json({
      success: true,
      message: "Application created successfully",
      applicationId: application.applicationId,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message: `${field || "Value"} already exists`,
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${error.path}`,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllApplications = async (req, res) => {
  try {
    const applications = await Applications.find();
    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No applications found",
      });
    }
    res.status(200).json({
      success: true,
      totalApplications: applications.length,
      applications: applications.map((each) => ({
        applicationId: each.applicationId,
        applicationStatus: each.applicationStatus,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!applicationId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "ApplicationId is required",
      });
    }
    const application = await Applications.findOne({ applicationId });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const approveApplication = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { applicationId } = req.params;

    if (!applicationId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "ApplicationId is required",
      });
    }

    let result;

    await session.withTransaction(async () => {
      const application = await Applications.findOne({
        applicationId,
      }).session(session);

      if (!application) {
        const error = new Error("Application not found");
        error.statusCode = 404;
        throw error;
      }

      if (application.applicationStatus === "Approved") {
        const error = new Error("Application is already approved");
        error.statusCode = 409;
        throw error;
      }

      if (application.applicationStatus !== "Pending") {
        const error = new Error("Only pending applications can be approved");
        error.statusCode = 400;
        throw error;
      }

      const existingCustomer = await User.findOne({
        application: application._id,
      }).session(session);

      if (existingCustomer) {
        const error = new Error(
          "A customer is already linked to this application",
        );
        error.statusCode = 409;
        throw error;
      }

      const existingBankAccount = await BankAccount.findOne({
        application: application._id,
      }).session(session);

      if (existingBankAccount) {
        const error = new Error(
          "A bank account already exists for this application",
        );
        error.statusCode = 409;
        throw error;
      }

      const temporarySecret = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(temporarySecret, 12);

      const customer = new User({
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        phone: application.phone,
        password: hashedPassword,
        role: "customer",
        status: "invited",
        application: application._id,
        createdBy: req.user?._id ?? null,
      });
      await customer.save({ session });

      const bankAccount = new BankAccount({
        customer: customer._id,
        application: application._id,
        accountType: application.accountType,
        status: "Pending",
        currency: "INR",
        availableBalancePaise: 0,
        heldBalancePaise: 0,
        createdBy: req.user?._id ?? null,
      });
      await bankAccount.save({ session });

      application.applicationStatus = "Approved";
      application.applicationReviewedBy = req.user?._id ?? null;
      application.applicationReviewedAt = new Date();
      await application.save({ session });

      result = {
        applicationId: application.applicationId,
        applicationStatus: application.applicationStatus,
        customer: {
          _id: customer._id,
          userId: customer.userId,
          email: customer.email,
          status: customer.status,
        },
        bankAccount: {
          _id: bankAccount._id,
          accountNumber: bankAccount.accountNumber,
          accountType: bankAccount.accountType,
          status: bankAccount.status,
          currency: bankAccount.currency,
        },
        action: "Reset your password to login and activate Bank Account",
      };
    });
    return res.status(200).json({
      success: true,
      message: "Application approved and customer account created successfully",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A customer or bank account with these unique details already exists",
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    await session.endSession();
  }
};

const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { comment } = req.body;

    if (!applicationId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "ApplicationId is required",
      });
    }

    if (typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid comment is required",
      });
    }

    if (comment.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 500 characters",
      });
    }

    const application = await Applications.findOneAndUpdate(
      {
        applicationId,
        applicationStatus: { $in: ["Pending", "Under Review"] },
      },
      {
        $set: {
          applicationStatus: "Rejected",
          reviewComment: comment.trim(),
          applicationReviewedBy: req.user?._id ?? null,
          applicationReviewedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!application) {
      const existingApplication = await Applications.findOne({
        applicationId,
      }).select("applicationStatus");

      if (!existingApplication) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      return res.status(409).json({
        success: false,
        message: `Application cannot be rejected because its status is ${existingApplication.applicationStatus}`,
      });
    }
    return res.status(200).json({
      success: true,
      message: "Application rejected successfully",
      data: {
        applicationId: application.applicationId,
        applicationStatus: application.applicationStatus,
        reviewComment: application.reviewComment,
        applicationReviewedBy: application.applicationReviewedBy,
        applicationReviewedAt: application.applicationReviewedAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const resubmitApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { email, phone } = req.body;

    if (!applicationId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "ApplicationId is required",
      });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const application = await Applications.findOne({
      applicationId: applicationId.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      applicationStatus: "Rejected",
    });

    if (!application) {
      return res.status(400).json({
        success: false,
        message:
          "Application details are invalid or the application is not eligible for resubmission",
      });
    }

    application.applicationStatus = "Pending";
    application.reviewComment = null;
    application.applicationReviewedBy = null;
    application.applicationReviewedAt = null;

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application resubmitted successfully",
      data: {
        applicationId: application.applicationId,
        applicationStatus: application.applicationStatus,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  submitApplication,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  resubmitApplication,
};

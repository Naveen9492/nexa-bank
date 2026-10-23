const User = require("../model/userModel");
const Applications = require("../model/applicationModel");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const addAdminOrManager = async (req, res) => {
  try {
    const rules = [
      body("firstName").trim().notEmpty().withMessage("Firstname is required"),
      body("lastName").trim().notEmpty().withMessage("Lastname is required"),
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
      body("password").trim().notEmpty().withMessage("Password id required"),
      body("role")
        .trim()
        .notEmpty()
        .withMessage("Role is required")
        .bail()
        .isIn(["admin", "manager", "customer"])
        .withMessage("Please select a valid role"),
      body("status")
        .trim()
        .notEmpty()
        .withMessage("Status is required")
        .bail()
        .isIn(["invited", "active", "suspended", "deactivated"])
        .withMessage("Please select a valid status"),
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

    const { firstName, lastName, email, phone, password, role, status } =
      req.body;
    const existingUser = await User.findOne({ email }).select("email");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role,
      status: status || "invited",
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: `${role} created successfully`,
      data: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdBy: user.createdBy,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message:
          field === "email"
            ? "A user with this email already exists"
            : field === "phone"
              ? "A user with this phone number already exists"
              : "A user with this information already exists",
      });
    }

    console.error("Add admin or manager error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status === "invited") {
      return res.status(403).json({
        success: false,
        message: "Please reset your password as status is invited",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your account is not active`,
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        userId: user.userId,
        name: user.firstName + " " + user.lastName,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { applicationId, newPassword } = req.body;

    if (!applicationId.trim() || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "ApplicationId and newPassword are required",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const application = await Applications.findOne({
      applicationId: applicationId.trim(),
    }).select("_id applicationStatus");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.applicationStatus !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Password reset is allowed only for approved applications",
      });
    }

    const user = await User.findOne({
      application: application._id,
      role: "customer",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found for this application",
      });
    }

    if (user.status !== "invited") {
      return res.status(400).json({
        success: false,
        message:
          user.status === "active"
            ? "Password has already been set and the account is active"
            : `Password reset is not allowed for a ${user.status} account`,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.status = "active";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Your account is now active.",
      data: {
        userId: user.userId,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
module.exports = { addAdminOrManager, login, resetPassword };

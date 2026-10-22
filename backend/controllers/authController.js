const User = require("../model/userModel");
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
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status}`,
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
module.exports = { addAdminOrManager, login };

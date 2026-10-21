const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      immutable: true,
      default: () => {
        const randomText = new mongoose.Types.ObjectId()
          .toString()
          .slice(-8)
          .toUpperCase();

        return `NEXA-USER-${Date.now()}-${randomText}`;
      },
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please enter a valid 10-digit Indian mobile number",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "manager", "customer"],
        message: "Please select a valid user role",
      },
      required: [true, "User role is required"],
      default: "customer",
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["invited", "active", "suspended", "deactivated"],
        message: "Please select a valid user status",
      },
      required: true,
      default: "invited",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Applications",
      default: null,
      index: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
userSchema.pre("validate", function () {
  if (this.role !== "customer" && this.application != null) {
    this.invalidate(
      "application",
      "Only customer users can be linked to an application",
    );
  }
});
module.exports = mongoose.model("User", userSchema);

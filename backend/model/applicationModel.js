const mongoose = require("mongoose");

const applicationsSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      unique: true,
      immutable: true,
      default: () => {
        const timestamp = Date.now();
        const randomText = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        return `NEXA-APP-${timestamp}-${randomText}`;
      },
    },
    applicationStatus: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
      required: true,
      index: false,
    },
    firstName: {
      type: String,
      required: [true, "first name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "last name is required"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      trim: true,
      lowercase: true,
      enum: {
        values: ["male", "female", "other"],
        message: "Please select a valid gender",
      },
    },
    email: {
      unique: true,
      type: String,
      trim: true,
      required: [true, "Email is required"],
      maxlength: [254, "Email cannot exceed 254 characters"],
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    phone: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please enter a valid 10-digit Indian mobile number",
      ],
    },
    dob: {
      type: Date,
      required: [true, "dob is required"],
      validate: [
        {
          validator: (value) => value <= new Date(),
          message: "Date of birth cannot be in the future",
        },
        {
          validator: (value) => {
            const today = new Date();
            const minAgeDate = new Date(
              today.getFullYear() - 18,
              today.getMonth(),
              today.getDate(),
            );

            return value <= minAgeDate;
          },
          message: "You must be at least 18 years old",
        },
      ],
    },
    maritalStatus: {
      type: String,
      required: [true, "Marital status is required"],
      trim: true,
      enum: {
        values: ["Single", "Married", "Divorced", "Widowed", "Separated"],
        message: "Please select a valid marital status",
      },
    },
    address: {
      street: {
        type: String,
        required: [true, "Street address is required"],
        trim: true,
      },

      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },

      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },

      country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        default: "India",
      },

      pincode: {
        type: String,
        required: [true, "PIN code is required"],
        trim: true,
        match: [/^\d{6}$/, "Please enter a valid 6-digit Indian PIN code"],
      },
    },
    panCard: {
      type: String,
      required: [true, "PAN Number is required"],
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z]{5}[0-9]{4}[A-Z]$/,
        "Please enter a valid PAN number (e.g., ABCDE1234F)",
      ],
    },
    aadhaarCard: {
      type: String,
      required: [true, "ADHAAR Number is required"],
      trim: true,
      match: [/^[2-9]\d{11}$/, "Please enter a valid 12-digit Aadhaar number"],
    },
    occupation: {
      type: String,
      required: [true, "Occupation is required"],
      trim: true,
      enum: {
        values: [
          "Student",
          "Salaried",
          "Self-employed",
          "Business",
          "Unemployed",
          "Retired",
          "Homemaker",
          "Other",
        ],
        message: "Please select a valid occupation",
      },
    },
    accountType: {
      type: String,
      required: [true, "Account type is required"],
      trim: true,
      enum: {
        values: ["Savings", "Current"],
        message: "Account type must be Savings or Current",
      },
    },
    debitCardRequired: {
      type: Boolean,
      required: [true, "Please specify whether a debit card is required"],
      default: false,
    },
    internetBanking: {
      type: Boolean,
      required: [true, "Please specify whether internet banking is required"],
      default: false,
    },
    acceptTnC: {
      type: Boolean,
      required: [true, "Please accept terms and conditions"],
    },
    nominee: {
      name: {
        type: String,
        trim: true,
        minlength: [2, "Nominee name must be at least 2 characters long"],
        maxlength: [100, "Nominee name cannot exceed 100 characters"],
      },

      relationship: {
        type: String,
        trim: true,
        enum: {
          values: ["Father", "Mother", "Spouse"],
          message: "Please select a valid nominee relationship",
        },
      },

      dob: {
        type: Date,
        validate: {
          validator: (value) => !value || value <= new Date(),
          message: "Nominee date of birth cannot be in the future",
        },
      },
    },
    kyc: {
      status: {
        type: String,
        enum: [
          "Pending",
          "Under Review",
          "Correction Requested",
          "Approved",
          "Rejected",
        ],
        default: "Pending",
        required: true,
      },

      panVerified: {
        type: Boolean,
        default: false,
      },

      aadhaarVerified: {
        type: Boolean,
        default: false,
      },

      kycReviewedBy: {
        type: require("mongoose").Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      kycReviewedAt: {
        type: Date,
        default: null,
      },

      kycComment: {
        type: String,
        trim: true,
        maxlength: [500, "Comment cannot exceed 500 characters"],
        default: null,
      },
      requestedDocuments: {
        type: [String],
        default: [],
      },
    },
    applicationReviewedBy: {
      type: require("mongoose").Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    applicationReviewedAt: {
      type: Date,
      default: null,
    },
    reviewComment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

applicationsSchema.index({
  applicationStatus: 1,
  createdAt: -1,
});
applicationsSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Application", applicationsSchema);

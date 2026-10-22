const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      unique: true,
      immutable: true,
      default: () => {
        const now = new Date();

        const date = now.toISOString().slice(0, 10).replace(/-/g, "");
        const time = now.toISOString().slice(11, 19).replace(/:/g, "");

        const randomText = Math.floor(1000 + Math.random() * 9000).toString();

        return `099${date}${time}${randomText}`;
      },
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Customer is required"],
      immutable: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Applications",
      required: [true, "Application reference is required"],
      immutable: true,
    },
    accountType: {
      type: String,
      enum: {
        values: ["Savings", "Current"],
        message: "Account type must be Savings or Current",
      },
      required: [true, "Account type is required"],
      immutable: true,
    },
    status: {
      type: String,
      enum: {
        values: ["Pending", "Active", "Frozen", "Dormant", "Closed"],
        message: "Please select a valid account status",
      },
      default: "Pending",
      required: true,
      index: true,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      immutable: true,
      required: true,
    },
    availableBalancePaise: {
      type: Number,
      default: 0,
      min: [0, "Available balance cannot be negative"],
      validate: {
        validator: Number.isSafeInteger,
        message: "Available balance must be an integer in paise",
      },
    },
    heldBalancePaise: {
      type: Number,
      default: 0,
      min: [0, "Held balance cannot be negative"],
      validate: {
        validator: Number.isSafeInteger,
        message: "Held balance must be an integer in paise",
      },
    },
    openedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);
bankAccountSchema.index({ customer: 1, status: 1 });
bankAccountSchema.index({ customer: 1, createdAt: -1 });
bankAccountSchema.index({ application: 1 }, { unique: true });
bankAccountSchema.pre("validate", function () {
  if (this.status === "Active" && !this.openedAt) {
    this.openedAt = new Date();
  }

  if (this.status === "Closed" && !this.closedAt) {
    this.closedAt = new Date();
  }

  if (this.status !== "Closed" && this.closedAt) {
    this.invalidate(
      "closedAt",
      "Only closed accounts can have a closing timestamp",
    );
  }
});
module.exports = mongoose.model("BankAccounts", bankAccountSchema);

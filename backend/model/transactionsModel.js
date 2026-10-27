const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      immutable: true,
      default: () => {
        const timestamp = Date.now();
        const randomText = new mongoose.Types.ObjectId()
          .toString()
          .slice(-8)
          .toUpperCase();

        return `NEXA-TXN-${timestamp}-${randomText}`;
      },
    },

    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccounts",
      default: null,
      index: true,
      immutable: true,
    },

    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccounts",
      default: null,
      index: true,
      immutable: true,
    },

    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Transaction initiator is required"],
      immutable: true,
      index: true,
    },

    transactionType: {
      type: String,
      enum: {
        values: [
          "Deposit",
          "Withdrawal",
          "Transfer",
          "Interest",
          "Fee",
          "Refund",
          "Reversal",
        ],
        message: "Please select a valid transaction type",
      },
      required: [true, "Transaction type is required"],
      immutable: true,
    },

    amountPaise: {
      type: Number,
      required: [true, "Transaction amount is required"],
      min: [1, "Transaction amount must be greater than zero"],
      validate: {
        validator: Number.isSafeInteger,
        message: "Transaction amount must be a safe integer in paise",
      },
      immutable: true,
    },

    feePaise: {
      type: Number,
      default: 0,
      min: [0, "Transaction fee cannot be negative"],
      validate: {
        validator: Number.isSafeInteger,
        message: "Transaction fee must be a safe integer in paise",
      },
      immutable: true,
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      immutable: true,
      required: true,
    },

    status: {
      type: String,
      enum: {
        values: ["Pending", "Processing", "Completed", "Failed", "Reversed"],
        message: "Please select a valid transaction status",
      },
      default: "Pending",
      required: true,
      index: true,
    },

    fromBalanceBeforePaise: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "Source balance must be a safe integer in paise",
      },
      immutable: true,
    },

    toBalanceBeforePaise: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "Destination balance must be a safe integer in paise",
      },
      immutable: true,
    },

    fromBalanceAfterPaise: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "Source balance must be a safe integer in paise",
      },
      immutable: true,
    },

    toBalanceAfterPaise: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isSafeInteger(value),
        message: "Destination balance must be a safe integer in paise",
      },
      immutable: true,
    },

    reference: {
      type: String,
      trim: true,
      default: null,
      immutable: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: null,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      immutable: true,
      maxlength: 100,
      default: undefined,
    },

    failureReason: {
      type: String,
      trim: true,
      maxlength: [500, "Failure reason cannot exceed 500 characters"],
      default: null,
    },

    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transactions",
      default: null,
      immutable: true,
      index: true,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });

transactionSchema.index({ initiatedBy: 1, createdAt: -1 });

transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ transactionType: 1, createdAt: -1 });
transactionSchema.index(
  { initiatedBy: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  },
);

module.exports = mongoose.model("Transactions", transactionSchema);

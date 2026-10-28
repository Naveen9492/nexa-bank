const mongoose = require("mongoose");
const User = require("../model/userModel");
const Transactions = require("../model/transactionsModel");
const BankAccount = require("../model/bankAccountModel");

const depositMoney = async (req, res) => {
  const { amountPaise, description } = req.body;
  const idempotencyKey = req.get("Idempotency-Key");

  if (
    typeof idempotencyKey !== "string" ||
    !idempotencyKey.trim() ||
    idempotencyKey.length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid Idempotency-Key header is required",
    });
  }

  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a positive integer in paise",
    });
  }

  if (!req.user?._id || req.user.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Only authenticated customers can deposit",
    });
  }

  if (
    description !== undefined &&
    (typeof description !== "string" || description.length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string of at most 500 characters",
    });
  }

  const session = await mongoose.startSession();

  try {
    let result;
    let isDuplicate = false;

    await session.withTransaction(async () => {
      const existingTransaction = await Transactions.findOne({
        initiatedBy: req.user._id,
        idempotencyKey: idempotencyKey.trim(),
      }).session(session);

      if (existingTransaction) {
        if (
          existingTransaction.transactionType !== "Deposit" ||
          existingTransaction.amountPaise !== amountPaise
        ) {
          const error = new Error(
            "Idempotency key was already used for a different request",
          );
          error.statusCode = 409;
          throw error;
        }

        result = {
          transactionId: existingTransaction.transactionId,
          transactionType: existingTransaction.transactionType,
          amountPaise: existingTransaction.amountPaise,
          status: existingTransaction.status,
          createdAt: existingTransaction.createdAt,
          duplicate: true,
        };
        isDuplicate = true;
        return;
      }
      const account = await BankAccount.findOne({
        customer: req.user._id,
        status: "Active",
      }).session(session);

      if (!account) {
        const error = new Error(
          "No active bank account found for this customer",
        );
        error.statusCode = 404;
        throw error;
      }

      const balanceBefore = account.availableBalancePaise;

      if (!Number.isSafeInteger(balanceBefore) || balanceBefore < 0) {
        const error = new Error("Invalid account balance");
        error.statusCode = 500;
        throw error;
      }

      const balanceAfter = balanceBefore + amountPaise;

      if (!Number.isSafeInteger(balanceAfter)) {
        const error = new Error("Account balance limit exceeded");
        error.statusCode = 400;
        throw error;
      }
      account.availableBalancePaise = balanceAfter;
      await account.save({ session });

      const transaction = new Transactions({
        toAccount: account._id,
        initiatedBy: req.user._id,
        idempotencyKey: idempotencyKey.trim(),
        transactionType: "Deposit",
        amountPaise,
        feePaise: 0,
        currency: account.currency,
        status: "Completed",
        toBalanceBeforePaise: balanceBefore,
        toBalanceAfterPaise: balanceAfter,
        description: description?.trim() || "Account deposit",
        processedAt: new Date(),
      });
      await transaction.save({ session });
      result = {
        transactionId: transaction.transactionId,
        transactionType: transaction.transactionType,
        user: {
          _id: req.user._id,
          userId: req.user.userId,
          name: req.user.name,
        },
        bankAccount: {
          _id: account._id,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          currency: account.currency,
        },
        amountPaise: transaction.amountPaise,
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      };
    });

    return res.status(isDuplicate ? 200 : 201).json({
      success: true,
      message: isDuplicate
        ? "Deposit already processed"
        : "Deposit completed successfully",
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
        message: "Duplicate transaction reference",
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }

    console.error("Deposit error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    await session.endSession();
  }
};

const withdrawMoney = async (req, res) => {
  const { amountPaise, description } = req.body;
  const idempotencyKey = req.get("Idempotency-Key")?.trim();

  if (
    typeof idempotencyKey !== "string" ||
    !idempotencyKey ||
    idempotencyKey.length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid Idempotency-Key header is required",
    });
  }

  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a positive integer in paise",
    });
  }

  if (!req.user?._id || req.user.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Only authenticated customers can withdraw",
    });
  }

  if (
    description !== undefined &&
    (typeof description !== "string" || description.length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string of at most 500 characters",
    });
  }

  const session = await mongoose.startSession();

  try {
    let result;
    let isDuplicate = false;

    await session.withTransaction(async () => {
      const existingTransaction = await Transactions.findOne({
        initiatedBy: req.user._id,
        idempotencyKey,
      }).session(session);

      if (existingTransaction) {
        if (
          existingTransaction.transactionType !== "Withdrawal" ||
          existingTransaction.amountPaise !== amountPaise
        ) {
          const error = new Error(
            "Idempotency key was already used for a different request",
          );
          error.statusCode = 409;
          throw error;
        }
        result = {
          transactionId: existingTransaction.transactionId,
          transactionType: existingTransaction.transactionType,
          amountPaise: existingTransaction.amountPaise,
          currency: existingTransaction.currency,
          status: existingTransaction.status,
          description: existingTransaction.description,
          createdAt: existingTransaction.createdAt,
          duplicate: true,
        };

        isDuplicate = true;
        return;
      }

      const account = await BankAccount.findOne({
        customer: req.user._id,
        status: "Active",
      }).session(session);

      if (!account) {
        const error = new Error(
          "No active bank account found for this customer",
        );
        error.statusCode = 404;
        throw error;
      }

      const balanceBefore = account.availableBalancePaise;

      if (!Number.isSafeInteger(balanceBefore) || balanceBefore < 0) {
        const error = new Error("Invalid account balance");
        error.statusCode = 500;
        throw error;
      }

      if (balanceBefore < amountPaise) {
        const error = new Error("Insufficient account balance");
        error.statusCode = 400;
        throw error;
      }

      const balanceAfter = balanceBefore - amountPaise;
      account.availableBalancePaise = balanceAfter;
      await account.save({ session });

      const transaction = new Transactions({
        fromAccount: account._id,
        initiatedBy: req.user._id,
        idempotencyKey,
        transactionType: "Withdrawal",
        amountPaise,
        feePaise: 0,
        currency: account.currency,
        status: "Completed",
        fromBalanceBeforePaise: balanceBefore,
        fromBalanceAfterPaise: balanceAfter,
        description: description?.trim() || "Account withdrawal",
        processedAt: new Date(),
      });
      await transaction.save({ session });

      result = {
        transactionId: transaction.transactionId,
        transactionType: transaction.transactionType,
        user: {
          _id: req.user._id,
          userId: req.user.userId,
          name: req.user.name,
        },
        bankAccount: {
          _id: account._id,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          currency: account.currency,
        },
        amountPaise: transaction.amountPaise,
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
        duplicate: false,
      };
    });
    return res.status(isDuplicate ? 200 : 201).json({
      success: true,
      message: isDuplicate
        ? "Withdrawal already processed"
        : "Withdrawal completed successfully",
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
          "Duplicate transaction detected. Retry with the same idempotency key.",
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError?.message || "Transaction validation failed",
      });
    }

    console.error("Withdrawal error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    await session.endSession();
  }
};

const transferMoney = async (req, res) => {
  const { toAccountNumber, amountPaise, description } = req.body;
  const idempotencyKey = req.get("Idempotency-Key")?.trim();

  if (
    typeof idempotencyKey !== "string" ||
    !idempotencyKey ||
    idempotencyKey.length > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid Idempotency-Key header is required",
    });
  }

  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a positive integer in paise",
    });
  }

  if (typeof toAccountNumber !== "string" || !toAccountNumber.trim()) {
    return res.status(400).json({
      success: false,
      message: "Recipient account number is required",
    });
  }

  if (!req.user?._id || req.user.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Only authenticated customers can transfer money",
    });
  }

  if (
    description !== undefined &&
    (typeof description !== "string" || description.length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string of at most 500 characters",
    });
  }

  const normalizedDescription = description?.trim() || "Account transfer";
  const recipientAccountNumber = toAccountNumber.trim();

  const session = await mongoose.startSession();

  try {
    let result;
    let isDuplicate = false;

    await session.withTransaction(async () => {
      const sender = await BankAccount.findOne({
        customer: req.user._id,
        status: "Active",
      }).session(session);

      if (!sender) {
        const error = new Error("No active bank account found for sender");
        error.statusCode = 404;
        throw error;
      }

      const recipient = await BankAccount.findOne({
        accountNumber: recipientAccountNumber,
        status: "Active",
      }).session(session);

      if (!recipient) {
        const error = new Error("Recipient bank account not found or inactive");
        error.statusCode = 404;
        throw error;
      }

      if (sender._id.equals(recipient._id)) {
        const error = new Error("Cannot transfer money to the same account");
        error.statusCode = 400;
        throw error;
      }

      const recipientUser = await User.findById(recipient.customer)
        .select("firstName lastName userId")
        .session(session);

      if (!recipientUser) {
        const error = new Error("Recipient user not found");
        error.statusCode = 404;
        throw error;
      }

      const existingTransaction = await Transactions.findOne({
        initiatedBy: req.user._id,
        idempotencyKey,
      }).session(session);

      if (existingTransaction) {
        const sameRequest =
          existingTransaction.transactionType === "Transfer" &&
          existingTransaction.amountPaise === amountPaise &&
          existingTransaction.fromAccount?.equals(sender._id) &&
          existingTransaction.toAccount?.equals(recipient._id) &&
          existingTransaction.description === normalizedDescription;

        if (!sameRequest) {
          const error = new Error(
            "Idempotency key was already used for a different request",
          );
          error.statusCode = 409;
          throw error;
        }
        result = {
          transactionId: existingTransaction.transactionId,
          transactionType: existingTransaction.transactionType,
          amountPaise: existingTransaction.amountPaise,
          currency: existingTransaction.currency,
          status: existingTransaction.status,
          description: existingTransaction.description,
          createdAt: existingTransaction.createdAt,
          duplicate: true,
        };

        isDuplicate = true;
        return;
      }

      const senderBalanceBefore = sender.availableBalancePaise;
      const recipientBalanceBefore = recipient.availableBalancePaise;

      if (
        !Number.isSafeInteger(senderBalanceBefore) ||
        senderBalanceBefore < 0 ||
        !Number.isSafeInteger(recipientBalanceBefore) ||
        recipientBalanceBefore < 0
      ) {
        const error = new Error("Invalid account balance");
        error.statusCode = 500;
        throw error;
      }

      if (sender.currency !== recipient.currency) {
        const error = new Error(
          "Transfers between different currencies are not supported",
        );
        error.statusCode = 400;
        throw error;
      }

      if (senderBalanceBefore < amountPaise) {
        const error = new Error("Insufficient account balance");
        error.statusCode = 400;
        throw error;
      }

      const senderBalanceAfter = senderBalanceBefore - amountPaise;
      const recipientBalanceAfter = recipientBalanceBefore + amountPaise;

      if (!Number.isSafeInteger(recipientBalanceAfter)) {
        const error = new Error("Recipient account balance limit exceeded");
        error.statusCode = 400;
        throw error;
      }

      const debitedSender = await BankAccount.findOneAndUpdate(
        {
          _id: sender._id,
          status: "Active",
          availableBalancePaise: { $gte: amountPaise },
        },
        {
          $inc: {
            availableBalancePaise: -amountPaise,
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        },
      );
      if (!debitedSender) {
        const error = new Error(
          "Insufficient balance or sender account is no longer active",
        );
        error.statusCode = 400;
        throw error;
      }

      const creditedRecipient = await BankAccount.findOneAndUpdate(
        {
          _id: recipient._id,
          status: "Active",
          availableBalancePaise: recipientBalanceBefore,
        },
        {
          $inc: {
            availableBalancePaise: amountPaise,
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        },
      );
      if (!creditedRecipient) {
        const error = new Error(
          "Recipient account changed during transfer; please retry",
        );
        error.statusCode = 409;
        throw error;
      }

      const transaction = await Transactions({
        fromAccount: sender._id,
        toAccount: recipient._id,
        initiatedBy: req.user._id,
        idempotencyKey,
        transactionType: "Transfer",
        amountPaise,
        feePaise: 0,
        currency: sender.currency,
        status: "Completed",
        fromBalanceBeforePaise: senderBalanceBefore,
        fromBalanceAfterPaise: senderBalanceAfter,
        toBalanceBeforePaise: recipientBalanceBefore,
        toBalanceAfterPaise: recipientBalanceAfter,
        description: normalizedDescription,
        processedAt: new Date(),
      });
      await transaction.save({ session });

      result = {
        transactionId: transaction.transactionId,
        transactionType: transaction.transactionType,
        sender: {
          userId: req.user.userId,
          name: req.user.name,
          accountId: sender._id,
          accountNumber: sender.accountNumber,
          balanceBeforePaise: senderBalanceBefore,
          balanceAfterPaise: senderBalanceAfter,
        },
        recipient: {
          userId: recipientUser.userId,
          name: recipientUser.firstName + " " + recipientUser.lastName,
          accountId: recipient._id,
          accountNumber: recipient.accountNumber,
          balanceBeforePaise: recipientBalanceBefore,
          balanceAfterPaise: recipientBalanceAfter,
        },
        amountPaise: transaction.amountPaise,
        currency: transaction.currency,
        feePaise: transaction.feePaise,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
        duplicate: false,
      };
    });
    return res.status(isDuplicate ? 200 : 201).json({
      success: true,
      message: isDuplicate
        ? "Transfer already processed"
        : "Transfer completed successfully",
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
          "Duplicate transaction detected. Retry with the same idempotency key.",
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError?.message || "Transaction validation failed",
      });
    }

    console.error("Transfer error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    await session.endSession();
  }
};

const getTransactions = async (req, res) => {
  try {
    if (!req.user?._id || req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only authenticated customers can view transactions",
      });
    }

    const {
      transactionType,
      status,
      last30Days,
      last3Months,
      fromDate,
      toDate,
    } = req.query;

    const allowedTypes = [
      "Deposit",
      "Withdrawal",
      "Transfer",
      "Interest",
      "Fee",
      "Refund",
      "Reversal",
    ];

    const allowedStatuses = [
      "Pending",
      "Processing",
      "Completed",
      "Failed",
      "Reversed",
    ];

    if (
      transactionType !== undefined &&
      !allowedTypes.includes(transactionType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction status",
      });
    }

    const hasLast30Days = last30Days === "true";
    const hasLast3Months = last3Months === "true";
    const hasCustomRange = fromDate !== undefined || toDate !== undefined;

    const activeDateFilters = [
      hasLast30Days,
      hasLast3Months,
      hasCustomRange,
    ].filter(Boolean).length;

    if (activeDateFilters > 1) {
      return res.status(400).json({
        success: false,
        message:
          "Use only one date filter: last30Days, last3Months, or fromDate/toDate",
      });
    }

    const account = await BankAccount.findOne({
      customer: req.user._id,
      status: "Active",
    })
      .select("_id")
      .lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "No active bank account found for this customer",
      });
    }

    const filter = {
      $or: [{ fromAccount: account._id }, { toAccount: account._id }],
    };

    if (transactionType) {
      filter.transactionType = transactionType;
    }

    if (status) {
      filter.status = status;
    }
    const now = new Date();
    let startDate;
    let endDate;

    if (hasLast30Days) {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      endDate = now;
    } else if (hasLast3Months) {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      endDate = now;
    } else if (hasCustomRange) {
      const isValidDateFormat = (date) =>
        typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);

      if (!isValidDateFormat(fromDate) || !isValidDateFormat(toDate)) {
        return res.status(400).json({
          success: false,
          message: "Both fromDate and toDate are required in YYYY-MM-DD format",
        });
      }

      startDate = new Date(`${fromDate}T00:00:00.000Z`);
      endDate = new Date(`${toDate}T00:00:00.000Z`);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        startDate.toISOString().slice(0, 10) !== fromDate ||
        endDate.toISOString().slice(0, 10) !== toDate
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "fromDate must be before or equal to toDate",
        });
      }

      endDate.setUTCDate(endDate.getUTCDate() + 1);
    }
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: startDate,
        $lt: endDate,
      };
    }
    const transactions = await Transactions.find(filter)
      .select(
        "transactionId fromAccount toAccount initiatedBy transactionType amountPaise feePaise currency status description reference fromBalanceBeforePaise fromBalanceAfterPaise toBalanceBeforePaise toBalanceAfterPaise relatedTransaction createdAt processedAt failureReason",
      )
      .populate({
        path: "fromAccount",
        select: "accountNumber accountType customer",
        populate: {
          path: "customer",
          select: "userId firstName lastName",
        },
      })
      .populate({
        path: "toAccount",
        select: "accountNumber accountType customer",
        populate: {
          path: "customer",
          select: "userId firstName lastName",
        },
      })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      data: {
        count: transactions.length,
        transactions,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await BankAccount.findOne({
      customer: req.user._id,
      status: "Active",
    })
      .select("_id")
      .lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "No active bank account found for this customer",
      });
    }

    const transaction = await Transactions.findOne({
      transactionId: id,
      $or: [{ fromAccount: account._id }, { toAccount: account._id }],
    })
      .select(
        "transactionId fromAccount toAccount initiatedBy transactionType amountPaise feePaise currency status description reference fromBalanceBeforePaise fromBalanceAfterPaise toBalanceBeforePaise toBalanceAfterPaise relatedTransaction createdAt processedAt failureReason",
      )
      .populate({
        path: "fromAccount",
        select: "accountNumber accountType customer",
        populate: {
          path: "customer",
          select: "userId firstName lastName",
        },
      })
      .populate({
        path: "toAccount",
        select: "accountNumber accountType customer",
        populate: {
          path: "customer",
          select: "userId firstName lastName",
        },
      })
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction fetched successfully",
      data: {
        transaction,
      },
    });
  } catch (error) {
    console.error("Get transaction by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  depositMoney,
  withdrawMoney,
  transferMoney,
  getTransactions,
  getTransactionById,
};

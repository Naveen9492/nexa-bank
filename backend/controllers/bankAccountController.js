const BankAccount = require("../model/bankAccountModel");
const { findOne } = require("../model/userModel");

const activateBankAccount = async (req, res) => {
  try {
    const customerId = req.user?._id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Please login",
      });
    }

    const bankAccount = await BankAccount.findOne({
      customer: customerId,
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "No bank account found for this customer",
      });
    }

    if (bankAccount.status === "Active") {
      return res.status(409).json({
        success: false,
        message: "Bank account is already active",
      });
    }

    if (bankAccount.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot activate an account with status ${bankAccount.status}`,
      });
    }

    bankAccount.status = "Active";
    await bankAccount.save();

    return res.status(200).json({
      success: true,
      message: "Bank account activated successfully",
      data: {
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        status: bankAccount.status,
        currency: bankAccount.currency,
        openedAt: bankAccount.openedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMyBankAccount = async (req, res) => {
  try {
    const customerId = req.user?._id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Please login",
      });
    }

    const bankAccount = await BankAccount.findOne({
      customer: customerId,
    }).select(
      "accountNumber accountType status currency availableBalancePaise heldBalancePaise openedAt closedAt createdAt",
    );

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "No bank account found for this customer",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bank account fetched successfully",
      data: {
        _id: bankAccount._id,
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        status: bankAccount.status,
        currency: bankAccount.currency,
        availableBalancePaise: bankAccount.availableBalancePaise,
        heldBalancePaise: bankAccount.heldBalancePaise,
        availableBalanceRupees: bankAccount.availableBalancePaise / 100,
        heldBalanceRupees: bankAccount.heldBalancePaise / 100,
        openedAt: bankAccount.openedAt,
        closedAt: bankAccount.closedAt,
        createdAt: bankAccount.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMyAccountBalance = async (req, res) => {
  try {
    const customerId = req.user?._id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Please login",
      });
    }

    const bankAccount = await BankAccount.findOne({
      customer: customerId,
    }).select(
      "accountNumber accountType status currency availableBalancePaise heldBalancePaise",
    );

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "No bank account found for this customer",
      });
    }

    if (bankAccount.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot view balance of a closed bank account",
      });
    }

    const availableBalancePaise = bankAccount.availableBalancePaise ?? 0;

    const heldBalancePaise = bankAccount.heldBalancePaise ?? 0;

    return res.status(200).json({
      success: true,
      message: "Account balance fetched successfully",
      data: {
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        status: bankAccount.status,
        currency: bankAccount.currency,
        availableBalancePaise,
        heldBalancePaise,
        availableBalanceRupees: availableBalancePaise / 100,
        heldBalanceRupees: heldBalancePaise / 100,
        totalBalancePaise: availableBalancePaise + heldBalancePaise,
        totalBalanceRupees: (availableBalancePaise + heldBalancePaise) / 100,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllBankAccounts = async (req, res) => {
  try {
    const page = Number.parseInt(req.params.page, 10);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    const limit = 20;
    const skip = (page - 1) * limit;

    const [accounts, totalAccounts] = await Promise.all([
      BankAccount.find()
        .populate("customer", "userId firstName lastName email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      BankAccount.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Bank accounts fetched successfully",
      accounts: accounts.map((each) => ({
        accountNumber: each.accountNumber,
        accountType: each.accountType,
        status: each.status,
        customer: each.customer
          ? {
              customerId: each.customer._id,
              name: `${each.customer.firstName} ${each.customer.lastName}`,
              email: each.customer.email,
              phone: each.customer.phone,
            }
          : null,
      })),
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalAccounts,
        totalPages: Math.ceil(totalAccounts / limit),
        hasNextPage: page * limit < totalAccounts,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const freezeBankAccount = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const bankAccount = await BankAccount.findOne({ accountNumber });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    if (bankAccount.status === "Frozen") {
      return res.status(409).json({
        success: false,
        message: "Bank account is already frozen",
      });
    }

    if (bankAccount.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: `Cannot freeze an account with status ${bankAccount.status}`,
      });
    }

    bankAccount.status = "Frozen";
    await bankAccount.save();

    return res.status(200).json({
      success: true,
      message: "Bank account frozen successfully",
      data: {
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        status: bankAccount.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const unfreezeBankAccount = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const bankAccount = await BankAccount.findOne({ accountNumber });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    if (bankAccount.status === "Active") {
      return res.status(409).json({
        success: false,
        message: "Bank account is already active",
      });
    }

    if (bankAccount.status !== "Frozen") {
      return res.status(400).json({
        success: false,
        message: `Cannot unfreeze an account with status ${bankAccount.status}`,
      });
    }

    bankAccount.status = "Active";
    await bankAccount.save();

    return res.status(200).json({
      success: true,
      message: "Bank account unfrozen successfully",
      data: {
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        status: bankAccount.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const markAccountDormant = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const bankAccount = await BankAccount.findOne({ accountNumber });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    if (bankAccount.status === "Dormant") {
      return res.status(409).json({
        success: false,
        message: "Bank account is already dormant",
      });
    }

    if (bankAccount.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: `Cannot mark an account with status ${bankAccount.status} as dormant`,
      });
    }

    bankAccount.status = "Dormant";
    await bankAccount.save();

    return res.status(200).json({
      success: true,
      message: "Bank account marked as dormant successfully",
      data: {
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        status: bankAccount.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const closeBankAccount = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    const bankAccount = await BankAccount.findOne({ accountNumber });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    if (bankAccount.status === "Closed") {
      return res.status(409).json({
        success: false,
        message: "Bank account is already closed",
      });
    }

    if (
      bankAccount.availableBalancePaise > 0 ||
      bankAccount.heldBalancePaise > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot close an account with remaining available or held balance",
      });
    }

    bankAccount.status = "Closed";

    await bankAccount.save();

    return res.status(200).json({
      success: true,
      message: "Bank account closed successfully",
      data: {
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        status: bankAccount.status,
        closedAt: bankAccount.closedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  activateBankAccount,
  getMyBankAccount,
  getMyAccountBalance,
  getAllBankAccounts,
  freezeBankAccount,
  unfreezeBankAccount,
  markAccountDormant,
  closeBankAccount,
};

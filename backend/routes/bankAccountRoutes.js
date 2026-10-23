const express = require("express");
const router = express.Router();
const customerMiddleware = require("../middleware/customerMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  activateBankAccount,
  getMyBankAccount,
  getMyAccountBalance,
  getAllBankAccounts,
  freezeBankAccount,
  unfreezeBankAccount,
  markAccountDormant,
  closeBankAccount,
} = require("../controllers/bankAccountController");

router.patch("/account/activate", customerMiddleware, activateBankAccount);
router.get("/my-account", customerMiddleware, getMyBankAccount);
router.get("/my-balance", customerMiddleware, getMyAccountBalance);
router.get("/all-accounts/:page", adminMiddleware, getAllBankAccounts);
router.patch(
  "/account/:accountNumber/freeze",
  adminMiddleware,
  freezeBankAccount,
);
router.patch(
  "/account/:accountNumber/unfreeze",
  adminMiddleware,
  unfreezeBankAccount,
);
router.patch(
  "/account/:accountNumber/dormant",
  adminMiddleware,
  markAccountDormant,
);
router.patch(
  "/account/:accountNumber/close",
  adminMiddleware,
  closeBankAccount,
);

module.exports = router;

const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");
const customerMiddleware = require("../middleware/customerMiddleware");

const {
  depositMoney,
  withdrawMoney,
  transferMoney,
  getTransactions,
} = require("../controllers/transactionController");

router.post("/account/deposit", customerMiddleware, depositMoney);
router.post("/account/withdraw", customerMiddleware, withdrawMoney);
router.post("/account/transfer", customerMiddleware, transferMoney);
router.get("/account/transactions", customerMiddleware, getTransactions);

module.exports = router;

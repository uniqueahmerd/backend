import express from "express";
import {
  approveWithdrawalRequest,
  rejectedWithdrawals,
  approvedRecharge,
  rejectedRecharge,
  requestWithdrawal,
  getPendingWithdrawals,
  approveDepositRequest,
  depositRequest,
  getUserTransactions,
  getWithdrawalHistory,
  getRechargeHistory,
  getPendingRequests,
} from "../controllers/transactionController.js";
import userAuth from "../middlewares/userAuth.js";
import adminAuth from "../middlewares/adminAuth.js";

const transactionRouter = express.Router();

// User routes
transactionRouter.post("/withdraw/request", userAuth, requestWithdrawal); // Changed to POST
transactionRouter.get("/withdrawal-history", userAuth, getWithdrawalHistory);
transactionRouter.get("/recharge-history", userAuth, getRechargeHistory);
transactionRouter.post("/deposit", userAuth, depositRequest); // Added route for deposit requests
transactionRouter.get(
  "/user/:userId/transactions",
  userAuth,
  getUserTransactions
);
transactionRouter.get("/pending-requests", userAuth, getPendingRequests);
// Admin routes
transactionRouter.get("/withdraw/pending", adminAuth, getPendingWithdrawals); // Restricted to admins
transactionRouter.get(
  "/withdraw/approved",
  adminAuth,
  approveWithdrawalRequest
); // Restricted to admins
transactionRouter.get("/withdraw/rejected", adminAuth, rejectedWithdrawals); // Restricted to admins
transactionRouter.get("/recharge/approved", adminAuth, approvedRecharge); // Restricted to admins
transactionRouter.get("/recharge/rejected", adminAuth, rejectedRecharge); // Restricted to admins
transactionRouter.post(
  "/deposit/approve/:id",
  adminAuth,
  approveDepositRequest
); // Added route for approving deposits

export default transactionRouter;

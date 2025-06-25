import express from "express";
import {
  fetchPendingWithdrawals,
  handleWithdrawalRequest,
  adminLogin,
  handleDepositRequest,
  fetchPendingDeposits,
  getAdminStats,
  getAllUsers,
  creditUserWallet,
  getAllTransactions,
} from "../controllers/adminController.js";
import adminAuth from "../middlewares/adminAuth.js";

const adminRouter = express.Router();

// Route for admin login
adminRouter.post("/login", adminLogin);

// Route to fetch pending withdrawals
adminRouter.get("/withdrawals/pending", adminAuth, fetchPendingWithdrawals);

// Route to fetch pending deposit requests
adminRouter.get("/deposits/pending", adminAuth, fetchPendingDeposits);

adminRouter.post("/deposit/:action/:id", adminAuth, handleDepositRequest);

// Route to approve or reject withdrawal requests
adminRouter.post(
  "/withdrawals/:action/:id",
  adminAuth,
  handleWithdrawalRequest
);

// Route to approve or reject deposit requests
adminRouter.post("/deposits/:action/:id", adminAuth, handleDepositRequest);

// Route to get statistics
adminRouter.get("/stats", adminAuth, getAdminStats);

// Route to get all users
adminRouter.get("/users", adminAuth, getAllUsers);

// Route to credit user wallet
adminRouter.post("/users/:userId/credit", adminAuth, creditUserWallet);

// Route for getting all the transaction
adminRouter.get("/transactions", adminAuth, getAllTransactions);
export default adminRouter;

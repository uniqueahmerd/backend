import express from "express";
import {
  rechargeWallet,
  verifyTransaction,
  withdrawFromWallet,
  approveWithdrawal,
  rejectWithdrawal,
} from "../controllers/walletController.js";

const walletRouter = express.Router();

walletRouter.post("/recharge", rechargeWallet);
walletRouter.post("/verify", verifyTransaction);
walletRouter.post("/withdraw", withdrawFromWallet);
walletRouter.put("/withdraw/:id/approve", approveWithdrawal);
walletRouter.put("/withdraw/:id/reject", rejectWithdrawal);

export default walletRouter;

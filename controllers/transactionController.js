import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";
import { io } from "../server.js"; // Import Socket.IO instance

//approved Withdrawals
const approvedWithdrawals = async (req, res) => {
  try {
    await transactionModel
      .find({ type: "withdrawal", status: "approved" })
      .populate("userId");
    res.status(200).json(approvedWithdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//rejected Withdrawals
const rejectedWithdrawals = async (req, res) => {
  try {
    await transactionModel
      .find({ type: "withdrawal", status: "rejected" })
      .populate("userId");
    res.status(200).json(rejectedWithdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//approved recharge
const approvedRecharge = async (req, res) => {
  try {
    await transactionModel
      .find({ type: "recharge", status: "approved" })
      .populate("userId");
    res.status(200).json(approvedRecharge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//rejected recharge
const rejectedRecharge = async (req, res) => {
  try {
    await transactionModel
      .find({ type: "recharge", status: "rejected" })
      .populate("userId");
    res.status(200).json(rejectedRecharge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserTransactions = async (req, res) => {
  const { userId } = req.params; // Get the user ID from the request parameters

  try {
    // Find all transactions for the user, sorted by the most recent
    const transactions = await transactionModel
      .find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const requestWithdrawal = async (req, res) => {
  const { amount, accountNumber, bankName, accountName } = req.body;

  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!amount || isNaN(amount) || amount <= 0 || amount > user.wallet) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid withdrawal amount" });
    }

    // Add the withdrawal request
    user.withdrawalRequests.push({
      amount,
      accountNumber,
      bankName,
      accountName,
      status: "pending",
    });
    await user.save();

    try {
      io.emit("newWithdrawalRequest", {
        userName: user.userName,
        amount: withdrawalAmount,
        accountName,
        accountNumber,
        bankName,
      });
    } catch (error) {
      console.error("Error emitting withdrawal request:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting withdrawal request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const approveWithdrawalRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await userModel.findOne({ "withdrawalRequests._id": id });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal request not found" });
    }

    const request = user.withdrawalRequests.id(id);

    if (!request || request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid or already processed request",
      });
    }

    // Check wallet balance before approving
    if (user.wallet < request.amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance for this withdrawal request",
      });
    }

    request.status = "approved";
    user.wallet -= request.amount;

    await user.save();

    try {
      io.emit("balanceUpdated", {
        userId: user._id,
        newBalance: user.wallet,
      });
    } catch (error) {
      console.error("Error emitting balance update:", error);
    }

    return res
      .status(200)
      .json({ success: true, message: "Withdrawal approved successfully" });
  } catch (error) {
    console.error("Error approving withdrawal request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const depositRequest = async (req, res) => {
  const { amount, transactionDetails, accountName } = req.body;

  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid deposit amount" });
    }

    // Add the deposit request
    user.depositRequests.push({
      amount,
      transactionDetails,
      accountName,
      status: "pending",
    });

    await user.save();

    try {
      io.emit("newDepositRequest", {
        userName: user.userName,
        amount,
        transactionDetails,
        accountName,
      });
    } catch (error) {
      console.error("Error emitting deposit request:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Deposit request submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting deposit request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const approveDepositRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await userModel.findOne({ "depositRequests._id": id });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const request = user.depositRequests.id(id);

    if (!request || request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid or already processed request",
      });
    }

    // Approve the request
    request.status = "approved";
    user.wallet += request.amount; // Update user balance
    user.rechargeHistory.push({
      amount: request.amount,
      description: "Recharge",
      status: "Approved",
      date: new Date(),
    });

    await user.save();

    // Emit event to notify user of updated balance
    io.emit("balanceUpdated", {
      userId: user._id,
      newBalance: user.wallet,
    });

    return res
      .status(200)
      .json({ success: true, message: "Deposit approved successfully" });
  } catch (error) {
    console.error("Error approving deposit request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getWithdrawalHistory = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.id)
      .select("withdrawalRequests");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res
      .status(200)
      .json({ success: true, withdrawalHistory: user.withdrawalRequests });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const getRechargeHistory = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.id)
      .select("depositRequests");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res
      .status(200)
      .json({ success: true, rechargeHistory: user.depositRequests });
  } catch (error) {
    console.error("Error fetching recharge history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await userModel
      .find({ "withdrawalRequests.status": "pending" })
      .select("userName withdrawalRequests");

    const pendingWithdrawals = withdrawals.flatMap((user) =>
      user.withdrawalRequests
        .filter((request) => request.status === "pending")
        .map((request) => ({
          userName: user.userName,
          userId: user._id,
          ...request.toObject(),
        }))
    );

    return res.status(200).json({ success: true, pendingWithdrawals });
  } catch (error) {
    console.error("Error fetching pending withdrawals:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.id)
      .select("depositRequests withdrawalRequests");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const pendingDeposits = user.depositRequests.filter(
      (request) => request.status === "pending"
    );

    const pendingWithdrawals = user.withdrawalRequests.filter(
      (request) => request.status === "pending"
    );

    return res.status(200).json({
      success: true,
      pendingDeposits,
      pendingWithdrawals,
    });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getUserTransactions,
  approveDepositRequest,
  depositRequest,
  getPendingWithdrawals,
  approveWithdrawalRequest,
  rejectedWithdrawals,
  approvedWithdrawals,
  approvedRecharge,
  rejectedRecharge,
  requestWithdrawal,
  getWithdrawalHistory,
  getRechargeHistory,
  getPendingRequests,
};

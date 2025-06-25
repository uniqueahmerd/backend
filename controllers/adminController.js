import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import product from "../models/productModel.js";
import jwt from "jsonwebtoken";
import { io } from "../server.js"; // Import the io instance for real-time notifications

//route for admin login

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and Password are required" });
    }

    // Check if the email and password match the admin credentials
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Generate a token with admin role
      const token = jwt.sign(
        { email, role: "admin" },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1d" }
      );

      return res.status(200).json({ success: true, token });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Credentials" });
    }
  } catch (error) {
    console.error("Error in adminLogin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Fetch pending withdrawals
const fetchPendingWithdrawals = async (req, res) => {
  try {
    const users = await userModel
      .find({ "withdrawalRequests.status": "pending" })
      .select("userName withdrawalRequests");

    const pendingWithdrawals = users.flatMap((user) =>
      user.withdrawalRequests
        .filter((request) => request.status === "pending")
        .map((request) => ({
          userName: user.userName,
          userId: user._id,
          ...request.toObject(),
        }))
    );

    console.log("Pending withdrawals:", pendingWithdrawals); // Debugging log

    return res
      .status(200)
      .json({ success: true, withdrawals: pendingWithdrawals });
  } catch (error) {
    console.error("Error fetching pending withdrawals:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Handle withdrawal request (approve/reject)
const handleWithdrawalRequest = async (req, res) => {
  try {
    const { id, action } = req.params;

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

    if (action === "approve") {
      request.status = "approved";
      user.wallet -= request.amount; // Deduct the amount from the user's wallet
      user.withdrawalHistory.push({
        amount: request.amount,
        accountDetails: request.accountDetails,
        status: "approved",
        date: new Date(),
      });
    } else if (action === "reject") {
      request.status = "rejected";
      user.withdrawalHistory.push({
        amount: request.amount,
        accountDetails: request.accountDetails,
        status: "rejected",
        date: new Date(),
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    await user.save();

    // Notify the user (e.g., via email or real-time notification)
    console.log(
      `User ${user.userName} notified about ${action} of withdrawal request`
    );

    return res
      .status(200)
      .json({ success: true, message: `Request ${action} successfully` });
  } catch (error) {
    console.error("Error handling withdrawal request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const handleDepositRequest = async (req, res) => {
  const { id, action } = req.params; // `action` can be "approve" or "reject"
  if (!id) {
    return res.status(400).json({ success: false, message: "ID is required" });
  }
  try {
    const user = await userModel.findOne({ "depositRequests._id": id });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Deposit request not found" });
    }

    const request = user.depositRequests.id(id);

    if (!request || request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid or already processed request",
      });
    }

    if (action === "approve") {
      request.status = "approved";
      user.wallet += request.amount; // Credit the user's wallet
      user.rechargeHistory.push({
        amount: request.amount,
        transactionDetails: request.transactionDetails,
        accountName: request.accountName,
        status: "approved",
        date: new Date(),
      });
    } else if (action === "reject") {
      request.status = "rejected";
      user.rechargeHistory.push({
        amount: request.amount,
        transactionDetails: request.transactionDetails,
        accountName: request.accountName,
        status: "rejected",
        date: new Date(),
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: `Request ${action} successfully` });
  } catch (error) {
    console.error("Error handling deposit request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const fetchPendingDeposits = async (req, res) => {
  try {
    const users = await userModel
      .find({ "depositRequests.status": "pending" })
      .select("userName depositRequests");

    const depositRequests = users.flatMap((user) =>
      user.depositRequests
        .filter((request) => request.status === "pending")
        .map((request) => ({
          _id: request._id, // Ensure _id is included
          userName: user.userName,
          amount: request.amount,
          transactionDetails: request.transactionDetails,
          accountName: request.accountName,
        }))
    );

    return res.status(200).json({ success: true, depositRequests });
  } catch (error) {
    console.error("Error fetching pending deposits:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAdminStats = async (req, res) => {
  try {
    // Fetch total users
    const totalUsers = await userModel.countDocuments();

    // Fetch total products
    const totalProducts = await productModel.countDocuments();

    // Fetch total product price
    const totalPrice = await product.aggregate([
      { $group: { _id: null, totalPrice: { $sum: "$price" } } },
    ]);

    // Aggregate withdrawals
    const users = await userModel.find(
      {},
      "withdrawalRequests depositRequests"
    );

    let pendingWithdrawalCount = 0;
    let pendingWithdrawalAmount = 0;
    let approvedWithdrawalAmount = 0;
    let approvedWithdrawalCount = 0;
    let approvedDepositCount = 0;

    let pendingDepositCount = 0;
    let pendingDepositAmount = 0;
    let approvedDepositAmount = 0;

    users.forEach((user) => {
      // Withdrawals
      user.withdrawalRequests.forEach((req) => {
        if (req.status === "pending") {
          pendingWithdrawalCount += 1;
          pendingWithdrawalAmount += req.amount;
        } else if (req.status === "approved") {
          approvedWithdrawalCount += 1;
          approvedWithdrawalAmount += req.amount;
        }
      });
      // Deposits
      user.depositRequests.forEach((req) => {
        if (req.status === "pending") {
          pendingDepositCount += 1;
          pendingDepositAmount += req.amount;
        } else if (req.status === "approved") {
          approvedDepositCount += 1;
          approvedDepositAmount += req.amount;
        }
      });
    });

    // Prepare the stats object
    const stats = {
      totalUsers,
      totalProducts,
      totalPrice: totalPrice[0]?.totalPrice || 0,
      pendingWithdrawalCount,
      pendingWithdrawalAmount,
      pendingDepositCount,
      pendingDepositAmount,
      approvedDepositAmount,
      approvedWithdrawalCount,
      approvedWithdrawalAmount,
      approvedDepositCount,
    };
    // Emit real-time update to all connected admins
    io.emit("adminStatsUpdated", stats);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all users with username, phoneNumber, and wallet
const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({}, "userName phoneNumber wallet");
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Manually credit a user's wallet
const creditUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.wallet += Number(amount);
    user.rechargeHistory.push({
      amount: Number(amount),
      date: new Date(),
      description: "Manual credit by admin",
    });
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Wallet credited", wallet: user.wallet });
  } catch (error) {
    console.error("Error crediting wallet:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// const getAllTransactions = async (req, res) => {
//   try {
//     const users = await userModel
//       .find()
//       .select(
//         "userName wallet rechargeHistory withdrawalHistory dailyIncomeHistory checkInHistory referralBonusHistory depositRequests withdrawalRequests"
//       );

//     let transactions = [];

//     users.forEach((user) => {
//       // Recharge (Deposit) History
//       user.rechargeHistory.forEach((tx) =>
//         transactions.push({
//           type: "Deposit",
//           status: "Completed",
//           amount: tx.amount,
//           date: tx.date,
//           userName: user.userName,
//           wallet: user.wallet,
//         })
//       );

//       // Withdrawal History
//       user.withdrawalHistory.forEach((tx) =>
//         transactions.push({
//           type: "Withdraw",
//           status: "Completed",
//           amount: tx.amount,
//           date: tx.date,
//           userName: user.userName,
//           wallet: user.wallet,
//         })
//       );

//       // Manual Credits (if you use rechargeHistory for this, add a description check)
//       user.rechargeHistory
//         .filter(
//           (tx) =>
//             tx.description && tx.description.toLowerCase().includes("manual")
//         )
//         .forEach((tx) =>
//           transactions.push({
//             type: "Manual Credit",
//             status: "Completed",
//             amount: tx.amount,
//             date: tx.date,
//             userName: user.userName,
//             wallet: user.wallet,
//           })
//         );

//       // Deposit Requests (pending/approved/rejected)
//       user.depositRequests.forEach((tx) =>
//         transactions.push({
//           type: "Deposit",
//           status: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
//           amount: tx.amount,
//           date: tx.createdAt,
//           userName: user.userName,
//           wallet: user.wallet,
//         })
//       );

//       // Withdrawal Requests (pending/approved/rejected)
//       user.withdrawalRequests.forEach((tx) =>
//         transactions.push({
//           type: "Withdraw",
//           status: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
//           amount: tx.amount,
//           date: tx.createdAt,
//           userName: user.userName,
//           wallet: user.wallet,
//         })
//       );
//     });

//     // Sort by date descending
//     transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

//     res.json({ success: true, transactions });
//   } catch (error) {
//     console.error("Error fetching transactions:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
const getAllTransactions = async (req, res) => {
  try {
    const users = await userModel
      .find()
      .select(
        "userName wallet rechargeHistory withdrawalHistory depositRequests withdrawalRequests"
      );

    let transactions = [];

    users.forEach((user) => {
      // Recharge (Deposit) History and Manual Credit
      user.rechargeHistory.forEach((tx) => {
        if (tx.description && tx.description.toLowerCase().includes("manual")) {
          transactions.push({
            type: "Manual Credit",
            status: "Completed",
            amount: tx.amount,
            date: tx.date,
            userName: user.userName,
            wallet: user.wallet,
          });
        } else {
          transactions.push({
            type: "Deposit",
            status: "Completed",
            amount: tx.amount,
            date: tx.date,
            userName: user.userName,
            wallet: user.wallet,
          });
        }
      });

      // Withdrawal History
      user.withdrawalHistory.forEach((tx) =>
        transactions.push({
          type: "Withdraw",
          status: "Completed",
          amount: tx.amount,
          date: tx.date,
          userName: user.userName,
          wallet: user.wallet,
        })
      );

      // Deposit Requests (pending/approved/rejected)
      user.depositRequests.forEach((tx) =>
        transactions.push({
          type: "Deposit",
          status: tx.status
            ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1)
            : "Pending",
          amount: tx.amount,
          date: tx.createdAt,
          userName: user.userName,
          wallet: user.wallet,
        })
      );

      // Withdrawal Requests (pending/approved/rejected)
      user.withdrawalRequests.forEach((tx) =>
        transactions.push({
          type: "Withdraw",
          status: tx.status
            ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1)
            : "Pending",
          amount: tx.amount,
          date: tx.createdAt,
          userName: user.userName,
          wallet: user.wallet,
        })
      );
    });

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getAllTransactions,
  adminLogin,
  handleWithdrawalRequest,
  fetchPendingWithdrawals,
  fetchPendingDeposits,
  handleDepositRequest,
  getAdminStats,
  getAllUsers,
  creditUserWallet,
};

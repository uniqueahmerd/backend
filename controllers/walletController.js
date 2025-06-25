import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";
import axios from "axios";

const rechargeWallet = async (req, res) => {
  const { userId, amount } = req.body;
  try {
    // Find the user by ID
    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const reference = `wallet_${Date.now()}`; // Generate a unique reference

    // Initialize payment with Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        amount: amount * 100, // Convert to kobo
        email: user.email,
        reference,
        callback_url: "http://localhost:5000/api/paystack/callback", // Replace with your callback URL
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, // Use your Paystack secret key
          "Content-Type": "application/json",
        },
      }
    );

    // Return the payment authorization URL to the frontend
    res.json({
      success: true,
      message: "Payment initialized successfully",
      authorization_url: response.data.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const withdrawFromWallet = async (req, res) => {
  const { userId, amount, bankDetails } = req.body; // Include bank details for withdrawal
  try {
    // Find the user by ID
    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if the user has sufficient balance
    if (user.wallet < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // Create a pending withdrawal transaction
    const transaction = new transactionModel({
      userId: user._id,
      type: "withdrawal",
      amount,
      status: "pending",
      bankDetails, // Save bank details for admin to process
    });

    // Save the transaction
    await transaction.save();

    res.json({
      success: true,
      message: "Withdrawal request submitted for approval",
      transaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve Withdrawal (Admin Action)
const approveWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params.id;

    // Find the transaction by ID
    const transaction = await transactionModel.findById(transactionId);
    if (!transaction || transaction.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or already processed",
      });
    }

    // Deduct the amount from the user's wallet
    await userModel.findByIdAndUpdate(transaction.userId, {
      $inc: { wallet: -transaction.amount },
    });

    // Update the transaction status to approved
    transaction.status = "approved";
    await transaction.save();

    res.json({ success: true, message: "Transaction approved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject Withdrawal (Admin Action)
const rejectWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params.id;

    // Find the transaction by ID
    const transaction = await transactionModel.findById(transactionId);
    if (!transaction || transaction.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or already processed",
      });
    }

    // Update the transaction status to rejected
    transaction.status = "rejected";
    await transaction.save();

    res.json({ success: true, message: "Transaction rejected successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//verify paystack transaction
const verifyTransaction = async () => {
  const { reference } = req.query;

  try {
    const response = await axios.get(
      "paystack.co/transaction/verify/reference",
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, // Use your Paystack secret key
        },
      }
    );

    const { status, amount } = response.data.data;

    if (status === "success") {
      const transaction = await transaction.findOne({ reference });
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      //update the user balance
      await user.findByIdAndUpdate(transaction.userId, {
        $inc: { wallet: amount / 100 },
      });

      //update transaction status
      transaction.status = "approved";
      await transaction.save();

      res.status(200).json({ message: "wallet recharged successfull" });
    } else {
      res.status(400).json({ message: "transaction failed" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  rechargeWallet,
  verifyTransaction,
  withdrawFromWallet,
  approveWithdrawal,
  rejectWithdrawal,
};

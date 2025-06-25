import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    wallet: {
      type: Number,
      default: 0,
    },

    lastDailyCheckIn: { type: Date, default: null },
    lastDailyIncomeUpdate: { type: Date },
    referralCode: { type: String, unique: true }, // Each user gets a unique code
    referredBy: { type: String }, // Stores the referral code of the referrer
    referralBonusHistory: [
      {
        amount: Number,
        date: { type: Date, default: Date.now },
        description: String,
      },
    ],
    referralBonus: { type: Number, default: 0 }, // Total earned from referrals

    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product", // Reference to the productModel
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
        totalEarned: {
          type: Number,
          default: 0, // Tracks the total income earned for this product
        },
      },
    ],
    rechargeHistory: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        description: { type: String, default: "Recharge" },
      },
    ],
    withdrawalHistory: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        description: { type: String, default: "Withdrawal" },
      },
    ],
    // In userModel.js
    dailyIncomeHistory: [
      {
        amount: Number,
        date: Date,
        description: String,
      },
    ],
    checkInHistory: [
      {
        amount: Number,
        date: Date,
        description: String,
      },
    ],
    referralBonusHistory: [
      {
        amount: Number,
        date: Date,
        description: String,
      },
    ],
    withdrawalRequests: [
      {
        amount: { type: Number, required: true },
        bankName: { type: String, required: true },
        accountNumber: { type: String, required: true },
        accountName: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    depositRequests: [
      {
        amount: { type: Number, required: true },
        accountName: { type: String, required: true }, // Added accountName field
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;

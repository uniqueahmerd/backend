import mongoose from "mongoose";
import user from "./userModel.js";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: user,
    },
    type: {
      type: String,
      enum: ["recharge", "withdrawal"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    bankDetails: {
      accountNumber: { type: String },
      bankName: { type: String },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const transactionModel =
  mongoose.models.transaction ||
  mongoose.model("transaction", transactionSchema);
export default transactionModel;

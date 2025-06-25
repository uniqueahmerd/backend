import userModel from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// const createToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET_KEY);
// };

//route for user login
const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    // Validate input
    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and Password are required",
      });
    }

    // Find the user by username
    const user = await userModel.findOne({ userName });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // Generate a token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in loginUser:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const logOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.status(200).json({ success: true, message: "Logged Out" });
  } catch (error) {
    console.error("Error in logOut:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//route for user registration
const registerUser = async (req, res) => {
  try {
    const { userName, phoneNumber, password, referredBy } = req.body;

    // Validate input
    if (!userName || !phoneNumber || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (!validator.isMobilePhone(phoneNumber, "any")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid phone number format" });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ phoneNumber });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    const generateReferralCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const referralCode = generateReferralCode();
    const newUser = await userModel.create({
      userName,
      phoneNumber,
      password: hashedPassword,
      referralCode,
      referredBy: referredBy || null,
    });

    // --- Referral logic ---
    if (referredBy) {
      const referrer = await userModel.findOne({ referralCode: referredBy });
      if (referrer) {
        const bonusAmount = 100; // or your desired referral bonus
        referrer.wallet += bonusAmount;
        referrer.referralBonus += bonusAmount;
        referrer.referralBonusHistory.push({
          amount: bonusAmount,
          date: new Date(), // <-- add this line
          description: `Referral bonus for inviting ${newUser.userName}`,
        });
        // Record in rechargeHistory
        referrer.rechargeHistory.push({
          amount: bonusAmount,
          date: new Date(),
          description: "Referral Bonus",
        });
        await referrer.save();
      }
    }
    // --- End referral logic ---

    // Generate a token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(201).json({ success: true, newUser });
  } catch (error) {
    console.error("Error in registerUser:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//route for getting all users

const getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel
      .findById(userId)
      .select(
        "phoneNumber products wallet lastDailyCheckIn referralCode referralBonus"
      )
      .populate("products.productId", "name price image total_income"); // <-- add total_income here

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// ...existing code...

//route for resetting password
const resetPassword = async (req, res) => {
  const { phoneNumber, newPassword } = req.body;

  if (!phoneNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Phone Number is Required" });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  try {
    const user = await userModel.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateDailyIncome = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel
      .findById(userId)
      .populate("products.productId", "total_income");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const now = new Date();
    if (
      user.lastDailyIncomeUpdate &&
      now - new Date(user.lastDailyIncomeUpdate) < 24 * 60 * 60 * 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Daily income already added today",
      });
    }

    let totalAddedIncome = 0;
    let fullyPaidProductIndexes = [];

    user.products.forEach((product, idx) => {
      const { total_income } = product.productId;
      const totalProductIncome = product.quantity * total_income;
      const dailyEarning = totalProductIncome / 7;

      if (product.totalEarned < totalProductIncome) {
        let toAdd = dailyEarning;
        if (product.totalEarned + toAdd > totalProductIncome) {
          toAdd = totalProductIncome - product.totalEarned;
        }
        product.totalEarned += toAdd;
        totalAddedIncome += toAdd;

        // Add to daily income history
        user.dailyIncomeHistory.push({
          amount: toAdd,
          date: now,
          description: `Daily income from ${product.productId.name}`,
        });

        // If fully paid, mark for removal
        if (product.totalEarned >= totalProductIncome) {
          fullyPaidProductIndexes.push(idx);
        }
      }
    });

    // Remove fully paid products (from last to first to avoid index shift)
    fullyPaidProductIndexes.reverse().forEach((idx) => {
      user.products.splice(idx, 1);
    });

    user.wallet += totalAddedIncome;

    if (totalAddedIncome > 0) {
      user.rechargeHistory.push({
        amount: totalAddedIncome,
        date: now,
        description: "Daily income added",
      });
    }

    user.lastDailyIncomeUpdate = now;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Daily income added successfully",
      updatedWallet: user.wallet,
      rechargeHistory: user.rechargeHistory,
      dailyIncomeHistory: user.dailyIncomeHistory,
    });
  } catch (error) {
    console.error("Error updating daily income:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserHistory = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming `req.user` is populated by authentication middleware
    const user = await userModel.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Combine recharge history, daily income, and referral bonus history
    const rechargeHistory = user.rechargeHistory || [];
    const dailyIncomeHistory = user.dailyIncomeHistory || []; // Add this field in your schema if not present
    const referralBonusHistory = user.referralBonusHistory || []; // Add this field in your schema if not present

    const combinedHistory = [
      ...rechargeHistory.map((item) => ({ ...item, type: "Recharge" })),
      ...dailyIncomeHistory.map((item) => ({ ...item, type: "Daily Income" })),
      ...referralBonusHistory.map((item) => ({
        ...item,
        type: "Referral Bonus",
      })),
    ];

    return res.status(200).json({
      success: true,
      history: combinedHistory,
    });
  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const dailyCheckIn = async (req, res) => {
  const userId = req.user.id;
  const user = await userModel.findById(userId);

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const now = new Date();
  const lastCheck = user.lastDailyCheckIn
    ? new Date(user.lastDailyCheckIn)
    : null;

  if (lastCheck && now - lastCheck < 24 * 60 * 60 * 1000) {
    return res
      .status(400)
      .json({ success: false, message: "Already checked in today" });
  }

  const bonusAmount = 50;
  user.wallet += bonusAmount;
  user.lastDailyCheckIn = now;

  user.rechargeHistory.push({
    amount: bonusAmount,
    date: now,
    description: "Check-In Bonus",
  });

  // Add to check-in history
  user.checkInHistory.push({
    amount: bonusAmount,
    date: now,
    description: "Daily check-in bonus",
  });

  await user.save();

  return res.json({
    success: true,
    wallet: user.wallet,
    lastDailyCheckIn: now,
    checkInHistory: user.checkInHistory,
  });
};

const getInvitedCount = async (req, res) => {
  try {
    // Get the current user's referral code
    const user = await userModel.findById(req.user.id).select("referralCode");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // Count users who were referred by this code
    const count = await userModel.countDocuments({
      referredBy: user.referralCode,
    });
    return res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export {
  dailyCheckIn,
  loginUser,
  registerUser,
  resetPassword,
  logOut,
  getUserDetails,
  getUserHistory,
  updateDailyIncome,
  getInvitedCount,
};

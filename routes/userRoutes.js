import express from "express";
import {
  loginUser,
  logOut,
  registerUser,
  resetPassword,
  getUserDetails,
  updateDailyIncome,
  getUserHistory,
  dailyCheckIn,
  getInvitedCount,
} from "../controllers/userController.js";

import userAuth from "../middlewares/userAuth.js";

const userRouter = express.Router();

// Route for user login
userRouter.post("/login", loginUser);
// Route for updating daily income
userRouter.post("/update-daily-income", userAuth, updateDailyIncome);
// Route for user logout
userRouter.post("/logout", logOut);
// Route for reset password
userRouter.post("/reset-password", resetPassword);
// Route for user registration
userRouter.post("/register", registerUser);

// Route for getting user details
userRouter.get("/details", userAuth, getUserDetails);

// Route to fetch user history
userRouter.get("/history", userAuth, getUserHistory);

// Route for daily check-in
userRouter.post("/daily-checkin", userAuth, dailyCheckIn);

userRouter.get("/invited-count", userAuth, getInvitedCount);

export default userRouter;

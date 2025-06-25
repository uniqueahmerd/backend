import cron from "node-cron";
import userModel from "../models/userModel.js";

const scheduleDailyIncomeUpdate = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily income update...");

    try {
      const users = await userModel
        .find()
        .populate("products.productId", "daily_income total_income");

      for (const user of users) {
        let totalAddedIncome = 0;

        user.products.forEach((product) => {
          const { total_income } = product.productId;
          const totalProductIncome = product.quantity * total_income;
          const dailyEarning = totalProductIncome / 7;

          // Only add if not yet reached total income
          if (product.totalEarned < totalProductIncome) {
            let toAdd = dailyEarning;
            // Don't exceed the cap
            if (product.totalEarned + toAdd > totalProductIncome) {
              toAdd = totalProductIncome - product.totalEarned;
            }
            product.totalEarned += toAdd;
            totalAddedIncome += toAdd;
          }
        });

        user.wallet += totalAddedIncome;
        if (totalAddedIncome > 0) {
          user.rechargeHistory.push({
            amount: totalAddedIncome,
            date: new Date(),
            description: "Daily income added (auto, 1 week spread)",
          });
        }
        await user.save();
      }
      console.log("Daily income update completed.");
    } catch (error) {
      console.error("Error running daily income update:", error);
    }
  });
};

export default scheduleDailyIncomeUpdate;

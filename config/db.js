import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connnected");
  } catch (error) {
    console.error("Mongo connection faild :", error.message);
    process.exit(1);
  }
};

export default connectDB;

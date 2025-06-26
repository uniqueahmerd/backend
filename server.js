import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import connectCloudinary from "./config/cloudinary.js";
import http from "http";
import { Server } from "socket.io";
import scheduleDailyIncomeUpdate from "./utils/updateDailyIncome.js";

//Routes
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import productRouter from "./routes/productRoutes.js";
import walletRouter from "./routes/walletRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js";
import purchasedRouter from "./routes/purchasedProductRoute.js";

//connecting to mongodatabase
connectDB();
scheduleDailyIncomeUpdate();
//connecting to cloudinary
connectCloudinary();

//Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

//Middleware to parse JSON bodies
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://frontend-v115.vercel.app",
      "https://admin-5iajxk1ll-unique-ahmerdys-projects.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

app.use(cookieParser());

//API Endpoints
app.use("/api/admin", adminRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/purchasedProduct", purchasedRouter);

app.use((req, res) => {
  const allowedOrigins = [
    "https://frontend-v115.vercel.app",
    "https://admin-ten-wheat-77.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.status(404).json({ success: false, message: "Not Found" });
});

// Socket.IO configuration
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://frontend-v115.vercel.app",
      "https://admin-ten-wheat-77.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Export io for use in other files
export { io };

//Starting server
server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

import express from "express";
import {
  listProduct,
  addProduct,
  removeProduct,
  singleProduct,
} from "../controllers/productsController.js";
import upload from "../middlewares/multer.js";
import adminAuth from "../middlewares/adminAuth.js";

const productRouter = express.Router();

productRouter.post(
  "/add",
  adminAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  addProduct
);
productRouter.post("/remove", adminAuth, removeProduct);
productRouter.get("/list", listProduct);
productRouter.post("/single", singleProduct);

export default productRouter;

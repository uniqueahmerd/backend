import express from "express";
import userAuth from "../middlewares/userAuth.js";

import {
  addPurchasedProduct,
  getPurchasedProducts,
} from "../controllers/puchasedProductsController.js";

const purchasedRouter = express.Router();

purchasedRouter.get("/getPurchasedProduct", userAuth, getPurchasedProducts);
purchasedRouter.post("/addPurchasedProduct", userAuth, addPurchasedProduct);

export default purchasedRouter;

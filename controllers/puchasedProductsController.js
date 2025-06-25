import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

//add purchased products
// const addPurchasedProducts = async (req, res) => {
//   try {
//     const { userId, itemId } = req.body;
//     const userData = await userModel.findById(userId);

//     let purchasedProductsData = await userData.products;

//     if (purchasedProductsData[itemId]) {
//       purchasedProductsData[itemId] += 1;
//     } else {
//       purchasedProductsData[itemId] = 1;
//     }

//     await userModel.findByIdAndUpdate(userId, { purchasedProductsData });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

const addPurchasedProduct = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    console.log("Product ID received:", productId); // Debugging log
    console.log("Quantity received:", quantity); // Debugging log
    console.log("User ID received:", userId); // Debugging log

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const product = await productModel.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const totalPrice = product.price * quantity;

    if (user.wallet < totalPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    // Deduct the product price from the user's wallet
    user.wallet -= totalPrice;

    const existingProduct = user.products.find(
      (p) => p.productId.toString() === productId
    );

    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      user.products.push({ productId, quantity });
    }

    await user.save();

    // Populate the productId field to include name, price, and image
    const updatedUser = await userModel
      .findById(userId)
      .populate("products.productId", "name price image");

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
      updatedProducts: updatedUser.products,
      updatedWallet: updatedUser.wallet, // Include updated wallet in the response
    });
  } catch (error) {
    console.error("Error adding purchased product:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//get purchased products
const getPurchasedProducts = async (req, res) => {
  try {
    const { userId } = req.body;
    const userData = await userModel.findById(userId);
    let purchasedProductsData = await userData.products;

    res.json({ success: true, purchasedProductsData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { addPurchasedProduct, getPurchasedProducts };

import { v2 as cloudinary } from "cloudinary";
import productModel from "../models/productModel.js";

//add product function
const addProduct = async (req, res) => {
  try {
    const { name, price, daily_income, total_income } = req.body;
    const image = req.files.image && req.files.image[0];

    let imageUrl = "";
    if (image !== undefined) {
      imageUrl = image;
    }

    //Uploading image to cloudinary
    const result = await cloudinary.uploader.upload(imageUrl.path, {
      resource_type: "image",
      folder: "products",
    });
    const imageLink = result.secure_url;

    // Saving in product to database
    const productData = {
      name,
      price: Number(price),
      daily_income: Number(daily_income),
      total_income: Number(total_income),
      image: imageLink,
      Date: Date.now(),
    };

    const product = new productModel(productData);
    await product.save();

    res.json({
      success: true,
      message: "Product added successfully",
    });
  } catch (error) {
    console.log(error);

    res.json({
      success: false,
      message: "Error in adding product",
    });
  }
};

//list product function
const listProduct = async (req, res) => {
  try {
    const products = await productModel.find({});
    res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//remove product function
const removeProduct = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.body.id);
    res.json({
      success: true,
      message: "Product removed successfully",
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

//single product function
const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel.findById(productId);
    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export { listProduct, addProduct, removeProduct, singleProduct };

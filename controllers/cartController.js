import User from "../models/User.js";
import Product from "../models/Product.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

export const getCart = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("cart.productId");
  
  const cartItems = user.cart.map(item => {
    if (!item.productId) return null;
    return {
      id: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      image: item.productId.image,
      quantity: item.quantity,
      stock: item.productId.stock
    };
  }).filter(Boolean);

  res.status(200).json({
    status: "success",
    cart: cartItems
  });
});

export const syncCart = catchAsync(async (req, res, next) => {
  const { cartItems } = req.body; // Array of { id, quantity }

  if (!Array.isArray(cartItems)) {
    return next(new AppError("Invalid cart items format", 400));
  }

  const updatedCart = cartItems.map(item => ({
    productId: item.id,
    quantity: item.quantity
  }));

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { cart: updatedCart },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: "Cart synced successfully"
  });
});

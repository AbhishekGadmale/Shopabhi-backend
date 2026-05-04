import Product from "../models/Product.js";
import Review from "../models/Review.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const createProduct = catchAsync(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({
    status: "success",
    product,
  });
});

export const updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }
  res.status(200).json({
    status: "success",
    product,
  });
});

export const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Delete all associated reviews
  await Review.deleteMany({ product: req.params.id });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Category from "../models/Category.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import redisClient, { clearCacheByPattern } from "../utils/redisClient.js";

export const createProduct = catchAsync(async (req, res) => {
  const product = await Product.create(req.body);
  
  // Invalidate list cache
  await clearCacheByPattern("products:all:*");

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

  // Invalidate caches
  await redisClient.del(`product:${req.params.id}`);
  await clearCacheByPattern("products:all:*");

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

  // Invalidate caches
  await redisClient.del(`product:${req.params.id}`);
  await clearCacheByPattern("products:all:*");

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getAllCategories = catchAsync(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.status(200).json({
    status: "success",
    categories,
  });
});

export const createCategory = catchAsync(async (req, res) => {
  const category = await Category.create(req.body);

  // Invalidate category cache
  await redisClient.del("products:categories");

  res.status(201).json({
    status: "success",
    category,
  });
});

export const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Invalidate category cache and potentially product lists
  await redisClient.del("products:categories");
  await clearCacheByPattern("products:all:*");

  res.status(204).json({
    status: "success",
    data: null,
  });
});

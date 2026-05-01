import Product from "../models/Product.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllProducts = catchAsync(async (req, res) => {
  // 1) Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 20;
  const skip = (page - 1) * limit;

  // 2) Simple Search/Filter
  const queryObj = {};
  if (req.query.category) queryObj.category = req.query.category;
  if (req.query.search) {
    queryObj.$text = { $search: req.query.search };
  }

  const products = await Product.find(queryObj)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(queryObj);

  res.status(200).json({
    status: "success",
    results: products.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    products,
  });
});

export const getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }
  res.status(200).json({
    status: "success",
    product,
  });
});

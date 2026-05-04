import Product from "../models/Product.js";
import Review from "../models/Review.js";
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

  const ratingDistribution = await Review.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: "$rating", count: { $sum: 1 } } }
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistribution.forEach(item => {
    distribution[item._id] = item.count;
  });

  res.status(200).json({
    status: "success",
    product: { ...product.toObject(), ratingDistribution: distribution },
  });
});

export const getProductReviews = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 5;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ product: req.params.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments({ product: req.params.id });

  res.status(200).json({
    status: "success",
    results: reviews.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    reviews,
  });
});

export const createProductReview = catchAsync(async (req, res, next) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  const alreadyReviewed = await Review.findOne({
    product: req.params.id,
    user: req.user.id,
  });

  if (alreadyReviewed) {
    return next(new AppError("Product already reviewed", 400));
  }

  const review = await Review.create({
    name: req.user.name || "Anonymous",
    rating: Number(rating),
    comment,
    user: req.user.id,
    product: req.params.id,
  });

  res.status(201).json({ status: "success", message: "Review added", review });
});

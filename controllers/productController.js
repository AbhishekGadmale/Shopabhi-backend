import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Review from "../models/Review.js";
import Category from "../models/Category.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import redisClient, { clearCacheByPattern } from "../utils/redisClient.js";

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

  // Redis Cache Key
  const cacheKey = `products:all:${JSON.stringify(req.query)}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
  } catch (err) {
    console.error("Redis Get Error:", err);
  }

  const products = await Product.find(queryObj)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(queryObj);

  const responseData = {
    status: "success",
    results: products.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    products,
  };

  try {
    // Cache for 1 hour (3600 seconds)
    await redisClient.set(cacheKey, JSON.stringify(responseData), {
      EX: 3600,
    });
  } catch (err) {
    console.error("Redis Set Error:", err);
  }

  res.status(200).json(responseData);
});

export const getCategories = catchAsync(async (req, res) => {
  const cacheKey = "products:categories";

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
  } catch (err) {
    console.error("Redis Get Error:", err);
  }

  const categories = await Category.find().sort({ name: 1 });
  
  const responseData = {
    status: "success",
    categories,
  };

  try {
    await redisClient.set(cacheKey, JSON.stringify(responseData), {
      EX: 3600,
    });
  } catch (err) {
    console.error("Redis Set Error:", err);
  }

  res.status(200).json(responseData);
});

export const getProduct = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
  } catch (err) {
    console.error("Redis Get Error:", err);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // Fetch variants
  const variants = await Variant.find({ product: product._id });

  const ratingDistribution = await Review.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: "$rating", count: { $sum: 1 } } }
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistribution.forEach(item => {
    distribution[item._id] = item.count;
  });

  const responseData = {
    status: "success",
    product: { 
      ...product.toObject(), 
      variants,
      ratingDistribution: distribution 
    },
  };

  try {
    await redisClient.set(cacheKey, JSON.stringify(responseData), {
      EX: 3600,
    });
  } catch (err) {
    console.error("Redis Set Error:", err);
  }

  res.status(200).json(responseData);
});

export const getProductReviews = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 5;
  const skip = (page - 1) * limit;

  const cacheKey = `reviews:${productId}:${JSON.stringify(req.query)}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
  } catch (err) {
    console.error("Redis Get Error:", err);
  }

  const reviews = await Review.find({ product: productId, status: "approved" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments({ product: productId, status: "approved" });

  const responseData = {
    status: "success",
    results: reviews.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    reviews,
  };

  try {
    await redisClient.set(cacheKey, JSON.stringify(responseData), {
      EX: 3600,
    });
  } catch (err) {
    console.error("Redis Set Error:", err);
  }

  res.status(200).json(responseData);
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

  // Invalidate reviews cache for this product
  await clearCacheByPattern(`reviews:${req.params.id}:*`);

  res.status(201).json({ status: "success", message: "Review added", review });
});

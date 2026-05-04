import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllOrders = catchAsync(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 20;
  const skip = (page - 1) * limit;

  const orders = await Order.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments();

  res.status(200).json({
    status: "success",
    results: orders.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    orders,
  });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: status }, 
    { new: true }
  );
  
  if (!order) {
    return next(new AppError("Order not found", 404));
  }
  
  res.status(200).json({
    status: "success",
    order,
  });
});

export const getDashboardStats = catchAsync(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1) Total Revenue
  const totalRevenue = await Order.aggregate([
    { $match: { paymentStatus: "Paid" } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);

  // 2) Daily Revenue (Last 30 Days)
  const dailyRevenue = await Order.aggregate([
    {
      $match: {
        paymentStatus: "Paid",
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$total" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 3) Order Status Distribution
  const statusDistribution = await Order.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  // 4) Top Selling Products
  const topProducts = await Order.aggregate([
    { $match: { paymentStatus: "Paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        name: { $first: "$items.name" },
        totalSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 }
  ]);

  const totalOrders = await Order.countDocuments();
  const totalProducts = await Product.countDocuments(); 
  const totalUsers = await User.countDocuments(); 

  res.status(200).json({
    status: "success",
    stats: {
      revenue: totalRevenue[0]?.total || 0,
      orders: totalOrders,
      products: totalProducts,
      users: totalUsers,
      dailyRevenue,
      statusDistribution,
      topProducts
    }
  });
});

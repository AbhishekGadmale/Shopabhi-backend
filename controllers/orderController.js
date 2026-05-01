import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";
import { orderSchema } from "../utils/validation.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { config } from "../config/config.js";

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

export const getOrders = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments({ userId: req.user.id });

  res.json({
    status: "success",
    results: orders.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    orders,
  });
});

export const createOrder = catchAsync(async (req, res, next) => {
  const validation = orderSchema.safeParse(req.body);
  if (!validation.success) {
    return next(new AppError("Validation failed", 400));
  }

  const { items, total, details } = validation.data;

  const order = new Order({
    userId: req.user.id,
    items,
    total,
    details,
    paymentStatus: details.paymentMethod === "cod" ? "Pending" : "Pending",
  });

  await order.save();

  res.status(201).json({
    status: "success",
    message: "Order Placed Successfully",
    order,
  });
});

export const createRazorpayOrder = catchAsync(async (req, res, next) => {
  const { amount, currency = "INR" } = req.body;

  if (!amount) {
    return next(new AppError("Amount is required", 400));
  }

  const options = {
    amount: Math.round(amount * 100), // amount in the smallest currency unit
    currency,
    receipt: `receipt_${Date.now()}`,
  };

  const razorpayOrder = await razorpay.orders.create(options);

  res.status(200).json({
    status: "success",
    order: razorpayOrder,
  });
});

export const verifyPayment = catchAsync(async (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderData,
  } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature !== expectedSign) {
    return next(new AppError("Invalid payment signature", 400));
  }

  // Create order in database after successful payment
  const validation = orderSchema.safeParse(orderData);
  if (!validation.success) {
    return next(new AppError("Validation failed", 400));
  }

  const { items, total, details } = validation.data;

  const order = new Order({
    userId: req.user.id,
    items,
    total,
    details,
    paymentStatus: "Paid",
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Payment verified and order placed successfully",
    order,
  });
});

import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import { orderSchema } from "../utils/validation.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { config } from "../config/config.js";
import emailQueue from "../queues/emailQueue.js";

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

// Structured Logger
const logEvent = (req, event, details) => {
  console.log(JSON.stringify({ 
    timestamp: new Date().toISOString(), 
    correlationId: req?.correlationId || "system",
    event, 
    details 
  }));
};

const validateCartItems = async (items) => {
  let total = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.id || item._id);
    if (!product) {
      throw new AppError(`Product not found: ${item.name || item.id}`, 404);
    }
    
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    total += product.price * item.quantity;
    validatedItems.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.image,
    });
  }

  return { total, validatedItems };
};

// Stock Deduction with Transaction support
const deductStockWithSession = async (items, session) => {
  for (const item of items) {
    const result = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true, session }
    );
    if (!result) {
      throw new Error(`Insufficient stock for ${item.name} during transaction`);
    }
  }
};

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

export const validateCoupon = catchAsync(async (req, res, next) => {
  const { code, cartTotal } = req.body;
  if (!code) return next(new AppError("Coupon code is required", 400));

  const coupon = await Coupon.findOne({ 
    code: code.toUpperCase(), 
    isActive: true,
    expiryDate: { $gt: new Date() }
  });

  if (!coupon) {
    return next(new AppError("Invalid or expired coupon code", 400));
  }

  if (cartTotal < coupon.minPurchase) {
    return next(new AppError(`Minimum purchase of ₹${coupon.minPurchase} required for this coupon`, 400));
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return next(new AppError("Coupon usage limit reached", 400));
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  res.status(200).json({
    status: "success",
    discount,
    code: coupon.code
  });
});

export const previewOrder = catchAsync(async (req, res, next) => {
  const { items, couponCode } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError("Items are required", 400));
  }

  const { total, validatedItems } = await validateCartItems(items);
  let discount = 0;
  let finalTotal = total;

  if (couponCode) {
    const coupon = await Coupon.findOne({ 
      code: couponCode.toUpperCase(), 
      isActive: true,
      expiryDate: { $gt: new Date() }
    });

    if (coupon && total >= coupon.minPurchase) {
      if (coupon.discountType === "percentage") {
        discount = (total * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
      } else {
        discount = coupon.discountValue;
      }
      finalTotal = total - discount;
    }
  }

  res.status(200).json({
    status: "success",
    subtotal: total,
    discount,
    total: finalTotal,
    items: validatedItems,
  });
});

export const createOrder = catchAsync(async (req, res, next) => {
  const { items, details, idempotencyKey, couponCode } = req.body;

  if (!items || !details || !idempotencyKey) {
    return next(new AppError("Items, details, and idempotencyKey are required", 400));
  }

  const existingOrder = await Order.findOne({ userId: req.user.id, idempotencyKey });
  if (existingOrder) {
    logEvent(req, "order_idempotency_hit", { userId: req.user.id, idempotencyKey });
    return res.status(200).json({
      status: "success",
      message: "Order already placed",
      order: existingOrder,
    });
  }

  const { total, validatedItems } = await validateCartItems(items);
  let discount = 0;
  let finalTotal = total;
  let appliedCoupon = null;

  if (couponCode) {
    appliedCoupon = await Coupon.findOne({ 
      code: couponCode.toUpperCase(), 
      isActive: true,
      expiryDate: { $gt: new Date() }
    });

    if (appliedCoupon && total >= appliedCoupon.minPurchase) {
      if (appliedCoupon.discountType === "percentage") {
        discount = (total * appliedCoupon.discountValue) / 100;
        if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) discount = appliedCoupon.maxDiscount;
      } else {
        discount = appliedCoupon.discountValue;
      }
      finalTotal = total - discount;
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await deductStockWithSession(validatedItems, session);

    if (appliedCoupon) {
      await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } }, { session });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry for COD/Pending

    const order = new Order({
      userId: req.user.id,
      items: validatedItems.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: finalTotal,
      discount,
      couponCode: appliedCoupon?.code,
      details,
      paymentStatus: details.paymentMethod === "cod" ? "Pending" : "Pending",
      idempotencyKey,
      expiresAt
    });

    await order.save({ session });

    // Non-critical cart update
    const purchasedIds = validatedItems.map(item => item.productId.toString());
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { cart: { productId: { $in: purchasedIds } } } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    logEvent(req, "order_created", { orderId: order._id, userId: req.user.id, total: finalTotal, method: details.paymentMethod });

    res.status(201).json({
      status: "success",
      message: "Order Placed Successfully",
      order,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logEvent(req, "order_creation_failed", { userId: req.user.id, reason: err.message });
    throw new AppError(err.message, 400);
  }
});

export const createRazorpayOrder = catchAsync(async (req, res, next) => {
  const { items, details, idempotencyKey } = req.body;

  if (!items || !details || !idempotencyKey) {
    return next(new AppError("Items, details, and idempotencyKey are required", 400));
  }

  let order = await Order.findOne({ userId: req.user.id, idempotencyKey });
  if (order && order.paymentStatus === "Paid") {
    return next(new AppError("Order already paid", 400));
  }

  const { total, validatedItems } = await validateCartItems(items);

  if (!order) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await deductStockWithSession(validatedItems, session);
      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry for payment

      order = new Order({
        userId: req.user.id,
        items: validatedItems.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total,
        details,
        paymentStatus: "Pending",
        idempotencyKey,
        expiresAt
      });
      await order.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      logEvent(req, "razorpay_order_pending_created", { orderId: order._id, userId: req.user.id, total });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      logEvent(req, "razorpay_order_creation_failed", { userId: req.user.id, reason: err.message });
      throw new AppError(err.message, 400);
    }
  }

  const options = {
    amount: Math.round(total * 100),
    currency: "INR",
    receipt: order._id.toString(),
  };

  const razorpayOrder = await razorpay.orders.create(options);

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(200).json({
    status: "success",
    order: razorpayOrder,
    localOrderId: order._id
  });
});

export const verifyPayment = catchAsync(async (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    localOrderId
  } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature !== expectedSign) {
    logEvent(req, "payment_verification_failed", { localOrderId, reason: "Invalid signature" });
    return next(new AppError("Invalid payment signature", 400));
  }

  // ATOMIC TRANSITION
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Re-verify amount from Razorpay API
    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);

    const order = await Order.findOneAndUpdate(
      { _id: localOrderId, paymentStatus: "Pending" },
      { 
        $set: { 
          paymentStatus: "Paid",
          status: "Processing",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        },
        $unset: { expiresAt: "" }
      },
      { session, new: true }
    );

    if (!order) {
      // Check if already paid (maybe by webhook)
      const existing = await Order.findById(localOrderId);
      if (existing && existing.paymentStatus === "Paid") {
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({ status: "success", message: "Already paid", order: existing });
      }
      throw new Error("Order transition failed - order might be expired or already processed");
    }

    if (rzpOrder.amount !== Math.round(order.total * 100)) {
      throw new Error("Amount mismatch detected during verification");
    }

    // Cart cleanup
    const purchasedIds = order.items.map(item => item.productId.toString());
    await User.findByIdAndUpdate(
      order.userId,
      { $pull: { cart: { productId: { $in: purchasedIds } } } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    logEvent(req, "payment_verified_successfully", { orderId: order._id, razorpayPaymentId: razorpay_payment_id });

    // Enqueue Confirmation Email
    try {
      const user = await User.findById(order.userId);
      if (user) {
        await emailQueue.add("orderConfirmation", {
          email: user.email,
          subject: `Order Confirmed - ${order._id}`,
          message: `Hi ${user.name},\n\nYour order #${order._id} for ₹${order.total} has been successfully placed and is now being processed.\n\nThank you for shopping with ShopAbhi!`
        });
      }
    } catch (emailErr) {
      console.error("Failed to enqueue email job:", emailErr);
    }

    res.status(200).json({
      status: "success",
      message: "Payment verified and order finalized",
      order,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logEvent(req, "payment_verification_error", { localOrderId, reason: err.message });
    return next(new AppError(err.message, 400));
  }
});

export const handleWebhook = catchAsync(async (req, res, next) => {
  const secret = config.RAZORPAY_WEBHOOK_SECRET || "YOUR_WEBHOOK_SECRET";
  const signature = req.headers["x-razorpay-signature"];

  // Webhook validation
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== signature) {
    logEvent(null, "webhook_signature_mismatch", { expected: digest, received: signature });
    return res.status(400).send("Invalid signature");
  }

  const event = req.body.event;
  if (event === "payment.captured") {
    const payment = req.body.payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;

    logEvent(null, "webhook_payment_captured", { razorpayOrderId, razorpayPaymentId });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ATOMIC TRANSITION from Pending to Paid
      const order = await Order.findOneAndUpdate(
        { razorpayOrderId, paymentStatus: "Pending" },
        { 
          $set: { 
            paymentStatus: "Paid",
            status: "Processing",
            razorpayPaymentId: razorpayPaymentId
          },
          $unset: { expiresAt: "" }
        },
        { session, new: true }
      );

      if (order) {
        if (payment.amount !== Math.round(order.total * 100)) {
           throw new Error("Amount mismatch in webhook");
        }

        const purchasedIds = order.items.map(item => item.productId.toString());
        await User.findByIdAndUpdate(
          order.userId,
          { $pull: { cart: { productId: { $in: purchasedIds } } } },
          { session }
        );

        logEvent(null, "webhook_order_finalized", { orderId: order._id });
      } else {
        logEvent(null, "webhook_order_already_processed_or_not_found", { razorpayOrderId });
      }

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      logEvent(null, "webhook_processing_error", { razorpayOrderId, reason: err.message });
      return res.status(500).send("Internal Server Error");
    }
  }

  res.status(200).json({ status: "ok" });
});

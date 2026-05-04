import Coupon from "../models/Coupon.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllCoupons = catchAsync(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.status(200).json({
    status: "success",
    coupons,
  });
});

export const createCoupon = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) {
    return next(new AppError("Coupon code already exists", 400));
  }

  const coupon = await Coupon.create(req.body);
  res.status(201).json({
    status: "success",
    coupon,
  });
});

export const updateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    status: "success",
    coupon,
  });
});

export const deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

import User from "../models/User.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.status(200).json({
    status: "success",
    users,
  });
});

export const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  if (!["user", "admin", "superadmin", "support"].includes(role)) {
    return next(new AppError("Invalid role", 400));
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    user,
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

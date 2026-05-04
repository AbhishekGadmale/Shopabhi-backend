import User from "../models/User.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("wishlist");
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    user,
  });
});

export const updateProfile = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name },
    { new: true, runValidators: true }
  );
  res.status(200).json({
    status: "success",
    user,
  });
});

export const addAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  const newAddress = {
    street: req.body.street,
    city: req.body.city,
    state: req.body.state,
    zipCode: req.body.zipCode,
    country: req.body.country,
    isDefault: req.body.isDefault || false,
  };

  if (newAddress.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  } else if (user.addresses.length === 0) {
    newAddress.isDefault = true;
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    status: "success",
    addresses: user.addresses,
  });
});

export const deleteAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const addressId = req.params.addressId;

  const addressIndex = user.addresses.findIndex((addr) => addr._id.toString() === addressId);
  if (addressIndex === -1) {
    return next(new AppError("Address not found", 404));
  }

  const wasDefault = user.addresses[addressIndex].isDefault;
  user.addresses.splice(addressIndex, 1);

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();

  res.status(200).json({
    status: "success",
    addresses: user.addresses,
  });
});

export const setDefaultAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const addressId = req.params.addressId;

  user.addresses.forEach((addr) => {
    addr.isDefault = addr._id.toString() === addressId;
  });

  await user.save();

  res.status(200).json({
    status: "success",
    addresses: user.addresses,
  });
});

export const toggleWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.body;
  const user = await User.findById(req.user.id);

  const index = user.wishlist.indexOf(productId);
  if (index === -1) {
    user.wishlist.push(productId);
  } else {
    user.wishlist.splice(index, 1);
  }

  await user.save();

  res.status(200).json({
    status: "success",
    wishlist: user.wishlist,
  });
});

export const getWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("wishlist");
  res.status(200).json({
    status: "success",
    wishlist: user.wishlist,
  });
});

import Review from "../models/Review.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find()
    .populate("user", "name email")
    .populate("product", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: reviews.length,
    reviews,
  });
});

export const updateReviewStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // Statistics are updated automatically via Review model hooks if status was 'approved' or became 'approved'
  // But wait, the hook only triggers on save. We should ensure it recalculates if status changes.
  // Actually, let's just trigger recalculation manually for safety since findByIdAndUpdate doesn't trigger 'save' hooks but triggers 'findOneAnd' hooks.
  // My Review model has: reviewSchema.post(/^findOneAnd/, ...) which handles it!

  res.status(200).json({
    status: "success",
    review,
  });
});

export const deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

import AppError from "../utils/appError.js";

export const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    next(new AppError("Access denied. Admin privileges required.", 403));
  }
};

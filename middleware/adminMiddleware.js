import AppError from "../utils/appError.js";

export const adminMiddleware = (req, res, next) => {
  if (req.user && ["admin", "superadmin"].includes(req.user.role)) {
    next();
  } else {
    next(new AppError("Access denied. Admin privileges required.", 403));
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
};

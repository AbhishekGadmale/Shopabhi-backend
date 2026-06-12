import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyExpireToken,
} from "../utils/tokens.js";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validation.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import emailQueue from "../queues/emailQueue.js";

export const signup = catchAsync(async (req, res, next) => {
  const validation = signupSchema.safeParse(req.body);
  if (!validation.success) {
    return next(new AppError("Validation failed", 400));
  }

  const { name, email, password } = validation.data;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError("Email already registered", 409));
  }

  const hash = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hash });

  res.status(201).json({
    status: "success",
    message: "User created successfully",
  });
});

export const login = catchAsync(async (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return next(new AppError("Validation failed", 400));
  }

  const { email, password } = validation.data;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 400));
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return next(new AppError("Invalid credentials", 401));
  }

  const payload = { id: user._id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.json({
    status: "success",
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

export const refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return next(new AppError("No refresh token", 401));
  }

  try {
    const decoded = verifyExpireToken(refreshToken);
    const accessToken = signAccessToken({ id: decoded.id, email: decoded.email });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      status: "success",
    });
  } catch (err) {
    return next(new AppError("Invalid or expired refresh token", 401));
  }
});

export const logout = (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  
  res.json({
    status: "success",
    message: "Logged out",
  });
};

export const getProfile = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.json({ status: "success", user: null });
  }

  try {
    const decoded = verifyExpireToken(token); // Use verifyExpireToken to be safe
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.json({ status: "success", user: null });
    }
    res.json({
      status: "success",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.json({ status: "success", user: null });
  }
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const validation = forgotPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return next(new AppError("Please provide a valid email", 400));
  }

  const user = await User.findOne({ email: validation.data.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  // 1) Generate the random reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2) Hash it and set to resetToken field
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3) Set expiration (10 minutes)
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  // 4) Send it via email
  const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    if (process.env.EMAIL_HOST) {
      await emailQueue.add("passwordReset", {
        email: user.email,
        subject: "Your password reset token (valid for 10 min)",
        message,
      });

      res.status(200).json({
        status: "success",
        message: "Reset instructions enqueued!",
      });
    } else {
       // Fallback for demo/dev without email config
       console.log("-----------------------------------------");
       console.log("PASSWORD RESET REQUEST (CONSOLE FALLBACK)");
       console.log("User:", user.email);
       console.log("Reset URL:", resetURL);
       console.log("-----------------------------------------");
       res.status(200).json({
         status: "success",
         message: "Token generated! (Email not configured, check server console)",
       });
    }
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later", 500)
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const validation = resetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return next(new AppError("Password must be at least 6 characters", 400));
  }

  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = await bcrypt.hash(validation.data.password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password reset successful! You can now log in with your new password.",
  });
});

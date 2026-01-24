import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyExpireToken
} from "../utils/tokens.js";

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const payload = { id: user._id, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Set refresh token in httpOnly secure cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,        // set true if using HTTPS
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    });

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

    const decoded = verifyExpireToken(refreshToken);
    const accessToken = signAccessToken({ id: decoded.id, email: decoded.email });

    res.json({ accessToken });
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
  res.json({ message: "Logged out" });
});

export default router;
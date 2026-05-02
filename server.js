import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { config } from "./config/config.js";

import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import orderRoutes from "./routes/orders.js";
import cartRoutes from "./routes/cart.js";
import productRoutes from "./routes/products.js";
import adminRoutes from "./routes/admin.js";
import testRoutes from "./routes/test.js";

import globalErrorHandler from "./middleware/errorMiddleware.js";
import AppError from "./utils/appError.js";
import { startOrderExpiryJob } from "./jobs/orderExpiryJob.js";
import { correlationIdMiddleware } from "./middleware/correlationIdMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Traceability
app.use(correlationIdMiddleware);

// Security Middleware
app.use(helmet());

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: "Too many login attempts, please try again after 15 minutes." },
});

app.use(generalLimiter);
app.use("/api/auth", authLimiter);

// Webhook needs raw body for signature verification
import { handleWebhook } from "./controllers/orderController.js";
app.post("/api/orders/webhook", express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = new Set(
  process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",") 
    : ["http://localhost:3000"]
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Allow localhost/127.0.0.1 for development
      try {
        const { hostname } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          return callback(null, true);
        }
      } catch (err) {}

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", testRoutes);

app.get("/", (req, res) => {
  res.send("Backend is Running");
});

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

// Database Connection with Retry Logic
const connectWithRetry = async () => {
  const MAX_RETRIES = 5;
  const RETRY_INTERVAL = 5000;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(config.MONGO_URI);
      console.log("✅ MongoDB connected successfully");
      return;
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries} failed:`, err.message);

      if (retries >= MAX_RETRIES) {
        console.error("💥 Max database connection retries reached. Exiting...");
        process.exit(1);
      }

      console.log(`🔄 Retrying in ${RETRY_INTERVAL / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
    }
  }
};

// Monitor connection events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB error event:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected event. Mongoose will attempt to reconnect automatically.");
});

async function startServer() {
  await connectWithRetry();
  startOrderExpiryJob(); // Start the background job
  app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT} in ${process.env.NODE_ENV} mode`));
}

startServer();
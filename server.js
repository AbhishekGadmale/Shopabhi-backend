import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import orderRoutes from "./routes/orders.js";
import testRoutes from "./routes/test.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
const allowedOrigins = new Set([
  "https://shopabhi.onrender.com",
  "http://localhost:3000",
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);

      // Allow known deployed frontend(s)
      if (allowedOrigins.has(origin)) return callback(null, true);

      // Allow any localhost port for dev (CRA, Vite, etc.)
      try {
        const { hostname } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          return callback(null, true);
        }
      } catch {
        // fall through
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use("/api", testRoutes);

async function startServer() {
  if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI. Server cannot start.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB error:", err);
    process.exit(1);
  }

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/orders", orderRoutes);

  app.get("/", (req, res) => {
    res.send("Backend is Running");
  });

  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

startServer();
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
app.use(cors({
  origin: ["https://shopabhi.onrender.com", "http://localhost:3000"],
  credentials:true,
}));
app.use(cookieParser());
app.use("/api", testRoutes);

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Backend is Running");
});



app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
console.log("authRoutes is a", typeof authRoutes); // should be 'function'
console.log("orderRoutes is a", typeof orderRoutes); // should be 'function'
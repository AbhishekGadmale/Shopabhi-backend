import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import * as adminProductController from "../controllers/adminProductController.js";
import * as adminOrderController from "../controllers/adminOrderController.js";

const router = express.Router();

// Protect all admin routes
router.use(authMiddleware, adminMiddleware);

// Dashboard
router.get("/stats", adminOrderController.getDashboardStats);

// Products
router.post("/products", adminProductController.createProduct);
router.patch("/products/:id", adminProductController.updateProduct);
router.delete("/products/:id", adminProductController.deleteProduct);

// Orders
router.get("/orders", adminOrderController.getAllOrders);
router.patch("/orders/:id/status", adminOrderController.updateOrderStatus);

export default router;

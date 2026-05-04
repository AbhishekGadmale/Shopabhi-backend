import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import * as adminProductController from "../controllers/adminProductController.js";
import * as adminOrderController from "../controllers/adminOrderController.js";
import * as adminReviewController from "../controllers/adminReviewController.js";

const router = express.Router();

// Protect all admin routes
router.use(authMiddleware, adminMiddleware);

// Dashboard
router.get("/stats", adminOrderController.getDashboardStats);

// Products
router.post("/products", adminProductController.createProduct);
router.patch("/products/:id", adminProductController.updateProduct);
router.delete("/products/:id", adminProductController.deleteProduct);

// Categories
router.get("/categories", adminProductController.getAllCategories);
router.post("/categories", adminProductController.createCategory);
router.delete("/categories/:id", adminProductController.deleteCategory);

// Reviews
router.get("/reviews", adminReviewController.getAllReviews);
router.patch("/reviews/:id", adminReviewController.updateReviewStatus);
router.delete("/reviews/:id", adminReviewController.deleteReview);

// Orders
router.get("/orders", adminOrderController.getAllOrders);
router.patch("/orders/:id/status", adminOrderController.updateOrderStatus);

export default router;

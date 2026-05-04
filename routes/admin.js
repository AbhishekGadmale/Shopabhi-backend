import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import * as adminProductController from "../controllers/adminProductController.js";
import * as adminOrderController from "../controllers/adminOrderController.js";
import * as adminReviewController from "../controllers/adminReviewController.js";
import * as adminCouponController from "../controllers/adminCouponController.js";
import * as adminUserController from "../controllers/adminUserController.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// Stats
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

// Coupons
router.get("/coupons", adminCouponController.getAllCoupons);
router.post("/coupons", adminCouponController.createCoupon);
router.patch("/coupons/:id", adminCouponController.updateCoupon);
router.delete("/coupons/:id", adminCouponController.deleteCoupon);

// Users
router.get("/users", adminUserController.getAllUsers);
router.patch("/users/:id/role", adminUserController.updateUserRole);
router.delete("/users/:id", adminUserController.deleteUser);

export default router;
